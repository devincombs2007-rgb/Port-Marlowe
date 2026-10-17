import { Entity, Player, system, world, type Dimension } from "@minecraft/server";
import { readConfig } from "../core/config";
import { debug, logConsole } from "../core/log";
import type { Creature, Tactic } from "../director/types";
import { GauntTactics, type GEvent } from "../gaunt/tactics";
import { LurkerTactics, lurkerGentle, type LEvent, type Requested } from "../lurker/tactics";
import { mathRng, range, type Rng } from "../util/rng";
import { len, sub, type Vec3 } from "../util/vec";
import { playCreatureSound } from "./ambient";
import { canSee, findStandingSpot, findVantage, health, safe } from "./helpers";
import { aheadOf, newestSeq, pointBySeq, trailOf } from "./trail";

export const CREATURE_TYPE: Record<Creature, string> = { lurker: "dread:lurker", gaunt: "dread:gaunt" };
const SCENT_TYPE = "dread:scent";
const MANAGED_TAG = "dread_managed";
const TICK_INTERVAL = 5;
const DT = TICK_INTERVAL / 20;

export interface CreatureHooks {
  playerFor(id: string): Player | undefined;
  isLit(playerId: string): boolean;
  isUnderground(playerId: string): boolean;
  requested(playerId: string): Requested;
  onNoticed(playerId: string): void;
  onEncounter(playerId: string, kind: string): void;
  onGone(playerId: string, creature: Creature, outcome: string): void;
  onHuntEnded(playerId: string): void;
  onStress(playerId: string, amount: number): void;
}

interface Base {
  entity: Entity;
  playerId: string;
  spawnedTick: number;
  hits: number;
  actionSince: number;
  wasHunting: boolean;
}
interface LurkerRec extends Base { kind: "lurker"; tactics: LurkerTactics }
interface GauntRec extends Base { kind: "gaunt"; tactics: GauntTactics; marker?: Entity; markerSeq: number; lastSeen?: Vec3 }
type Rec = LurkerRec | GauntRec;

const registry = new Map<string, Rec>();
let hooks: CreatureHooks | undefined;
let rng: Rng = mathRng;

export const creatureCount = (): number => registry.size;
export function creaturesOf(playerId: string): number {
  let n = 0;
  for (const r of registry.values()) if (r.playerId === playerId) n++;
  return n;
}

export function initCreatures(h: CreatureHooks, r: Rng = mathRng): void {
  hooks = h;
  rng = r;
  system.runInterval(tick, TICK_INTERVAL);
  system.runInterval(adoptAndSweep, 200);
  world.afterEvents.entityHurt.subscribe((e) => {
    const attacker = e.damageSource.damagingEntity;
    if (!attacker) return;
    const rec = registry.get(attacker.id);
    if (rec && e.hurtEntity.id === rec.playerId) rec.hits++;
  });
}

// -- spawning ----------------------------------------------------------------------------------
export function spawnCreature(player: Player, creature: Creature, tactic: Tactic, minDist: number, maxDist: number, underground: boolean): boolean {
  if (!hooks) return false;
  return creature === "gaunt" ? spawnGaunt(player, tactic) || spawnFallbackGaunt(player, tactic, underground) : spawnLurker(player, tactic, minDist, maxDist, underground);
}

function spawnLurker(player: Player, tactic: Tactic, minDist: number, maxDist: number, underground: boolean): boolean {
  const pos = findVantage(player, minDist, maxDist, underground, rng);
  if (!pos) {
    debug(`no vantage found for ${tactic} Lurker`);
    return false;
  }
  return safe(() => {
    const e = player.dimension.spawnEntity(CREATURE_TYPE.lurker, pos);
    e.addTag(MANAGED_TAG);
    registry.set(e.id, { kind: "lurker", entity: e, playerId: player.id, tactics: new LurkerTactics(rng, tactic), spawnedTick: system.currentTick, hits: 0, actionSince: 0, wasHunting: tactic === "hunt" });
    face(e, player.location);
    return true;
  }, false);
}

/** The Gaunt arrives *on your trail*: at a point you walked 40-80 seconds ago, out of your sight. */
function spawnGaunt(player: Player, tactic: Tactic): boolean {
  const pts = trailOf(player.id);
  const now = system.currentTick / 20;
  const candidates = pts.filter((p) => now - p.t >= 40 && now - p.t <= 90 && len(sub(p, player.location)) >= 18);
  for (const p of [...candidates].sort(() => rng.next() - 0.5).slice(0, 8)) {
    const spot = findStandingSpot(player.dimension, Math.floor(p.x), Math.floor(p.z), p.y, true);
    if (!spot) continue;
    const visible = safe(() => {
      const eye = player.getHeadLocation();
      const to = sub({ x: spot.x, y: spot.y + 1, z: spot.z }, eye);
      return player.dimension.getBlockFromRay(eye, { x: to.x / len(to), y: to.y / len(to), z: to.z / len(to) }, { maxDistance: len(to) - 1, includePassableBlocks: false, includeLiquidBlocks: false }) === undefined;
    }, true);
    if (visible) continue;
    return placeGaunt(player, spot, p.seq + 1, tactic);
  }
  return false;
}

/** No usable trail yet (the player has barely moved): emerge somewhere behind them instead. */
function spawnFallbackGaunt(player: Player, tactic: Tactic, underground: boolean): boolean {
  const pos = findVantage(player, 26, 36, underground, rng);
  return pos ? placeGaunt(player, pos, newestSeq(player.id), tactic) : false;
}

function placeGaunt(player: Player, pos: Vec3, markerSeq: number, tactic: Tactic): boolean {
  return safe(() => {
    const e = player.dimension.spawnEntity(CREATURE_TYPE.gaunt, pos);
    e.addTag(MANAGED_TAG);
    const rec: GauntRec = {
      kind: "gaunt", entity: e, playerId: player.id, tactics: new GauntTactics(rng, tactic), spawnedTick: system.currentTick,
      hits: 0, actionSince: 0, wasHunting: false, markerSeq,
    };
    registry.set(e.id, rec);
    moveMarker(rec, player);
    safe(() => e.dimension.spawnParticle("dread:gaunt_burrow", pos), undefined); // it climbs out of the ground
    return true;
  }, false);
}

function moveMarker(rec: GauntRec, player: Player, to?: Vec3): void {
  const target = to ?? pointBySeq(rec.playerId, rec.markerSeq) ?? player.location;
  safe(() => {
    if (!rec.marker || !rec.marker.isValid) {
      rec.marker = rec.entity.dimension.spawnEntity(SCENT_TYPE, target);
      rec.marker.addTag(MANAGED_TAG);
    } else rec.marker.teleport(target);
  }, undefined);
}

function face(e: Entity, at: Vec3): void {
  safe(() => e.teleport(e.location, { facingLocation: at }), undefined);
}

// -- control -----------------------------------------------------------------------------------
export function retreatAll(playerId: string, reason: string): void {
  for (const rec of registry.values()) if (rec.playerId === playerId) rec.tactics.forceRetreat(reason);
}

export function removeAll(playerId?: string): number {
  let n = 0;
  for (const [id, rec] of [...registry]) {
    if (playerId && rec.playerId !== playerId) continue;
    dispose(rec);
    registry.delete(id);
    n++;
  }
  return n;
}

function dispose(rec: Rec): void {
  safe(() => rec.entity.remove(), undefined);
  if (rec.kind === "gaunt") safe(() => rec.marker?.remove(), undefined);
}

function vanishEffect(dim: Dimension, at: Vec3, kind: "lurker" | "gaunt"): void {
  safe(() => dim.spawnParticle(kind === "lurker" ? "dread:lurker_vanish" : "dread:gaunt_burrow", at), undefined);
}

// -- per-tick ------------------------------------------------------------------------------------
function tick(): void {
  const h = hooks;
  if (!h || registry.size === 0) return;
  const now = system.currentTick;
  const cfg = readConfig();
  const gentle = lurkerGentle(cfg.intensity);
  for (const [id, rec] of [...registry]) {
    const e = rec.entity;
    if (!e.isValid) {
      registry.delete(id);
      if (rec.kind === "gaunt") safe(() => rec.marker?.remove(), undefined);
      h.onGone(rec.playerId, rec.kind, "unloaded");
      continue;
    }
    const player = h.playerFor(rec.playerId);
    if (!player || !player.isValid || player.dimension.id !== e.dimension.id) {
      dispose(rec);
      registry.delete(id);
      if (player) h.onGone(rec.playerId, rec.kind, "dimension");
      continue;
    }
    clearStaleAction(rec, now);
    const dist = len(sub(e.location, player.location));
    const hp = health(player);
    const ehp = health(e);
    const hpFrac = ehp.max > 0 ? ehp.cur / ehp.max : 1;

    if (rec.kind === "lurker") {
      const ev = rec.tactics.step({
        dt: DT, age: (now - rec.spawnedTick) / 20, dist, seen: dist < 80 && canSee(player, e, 0.45),
        playerLit: h.isLit(rec.playerId), playerHealth: hp.cur, lurkerHealthFrac: hpFrac, hitsLanded: rec.hits,
        requested: h.requested(rec.playerId), gentle,
      });
      trackHunt(rec, rec.tactics.state === "hunt");
      if (ev.length) applyLurker(rec, player, ev, now);
    } else {
      const sneaking = safe(() => player.isSneaking, false);
      const sees = dist < (sneaking ? 9 : 18) && creatureSees(e, player);
      if (sees) rec.lastSeen = { ...player.location };
      const markerDist = rec.marker?.isValid ? len(sub(e.location, rec.marker.location)) : Infinity;
      const ahead = aheadOf(rec.playerId, rec.markerSeq);
      const ev = rec.tactics.step({
        dt: DT, age: (now - rec.spawnedTick) / 20, dist, sees, playerInWater: safe(() => player.isInWater, false),
        playerHealth: hp.cur, hpFrac, hits: rec.hits, requested: h.requested(rec.playerId), gentle,
        markerDist, trailLeft: ahead.left, trailBroken: ahead.broken,
      });
      trackHunt(rec, rec.tactics.state === "pursue" || rec.tactics.state === "roar");
      if (ev.length) applyGaunt(rec, player, ev, now);
    }
  }
}

function trackHunt(rec: Rec, hunting: boolean): void {
  if (rec.wasHunting && !hunting) hooks?.onHuntEnded(rec.playerId);
  rec.wasHunting = hunting;
}

/** One-shot animation flags (attack/hurt/notice/roar) are cleared after ~1.2 s so they can fire again. */
function clearStaleAction(rec: Rec, now: number): void {
  const act = safe(() => rec.entity.getProperty("dread:action"), "none");
  if (act === "none" || act === "burrow") {
    rec.actionSince = 0;
    return;
  }
  if (rec.actionSince === 0) rec.actionSince = now;
  else if (now - rec.actionSince > 24) {
    safe(() => rec.entity.triggerEvent("dread:clear_action"), undefined);
    rec.actionSince = 0;
  }
}

function creatureSees(e: Entity, p: Player): boolean {
  return safe(() => {
    const from = { x: e.location.x, y: e.location.y + 1.3, z: e.location.z };
    const to = sub(p.getHeadLocation(), from);
    const l = len(to);
    if (l < 1) return true;
    return e.dimension.getBlockFromRay(from, { x: to.x / l, y: to.y / l, z: to.z / l }, { maxDistance: l - 0.5, includePassableBlocks: false, includeLiquidBlocks: false }) === undefined;
  }, false);
}

function vanish(rec: Rec, player: Player | undefined, outcome: string): void {
  const h = hooks as CreatureHooks;
  const e = rec.entity;
  const at = e.location;
  vanishEffect(e.dimension, at, rec.kind);
  if (player && rec.kind === "lurker") playCreatureSound(player, "lurker", "vanish", at, 0.9, readConfig());
  dispose(rec);
  registry.delete(e.id);
  h.onGone(rec.playerId, rec.kind, outcome);
}

function applyLurker(rec: LurkerRec, player: Player, events: LEvent[], now: number): void {
  const h = hooks as CreatureHooks;
  const e = rec.entity;
  const cfg = readConfig();
  for (const ev of events) {
    switch (ev.type) {
      case "group": safe(() => e.triggerEvent(ev.event), undefined); break;
      case "sound": playCreatureSound(player, "lurker", ev.id, e.location, ev.volume, cfg); break;
      case "action":
        safe(() => e.setProperty("dread:action", ev.action), undefined);
        rec.actionSince = now;
        break;
      case "reposition": {
        const pos = findVantage(player, 26, 42, h.isUnderground(rec.playerId), rng);
        if (pos) {
          vanishEffect(e.dimension, e.location, "lurker");
          safe(() => e.teleport(pos, { facingLocation: player.location }), undefined);
        }
        break;
      }
      case "noticed": h.onNoticed(rec.playerId); break;
      case "stress": h.onStress(rec.playerId, ev.amount); break;
      case "vanish": return vanish(rec, player, ev.outcome);
    }
  }
}

function applyGaunt(rec: GauntRec, player: Player, events: GEvent[], now: number): void {
  const h = hooks as CreatureHooks;
  const e = rec.entity;
  const cfg = readConfig();
  for (const ev of events) {
    switch (ev.type) {
      case "group": safe(() => e.triggerEvent(ev.event), undefined); break;
      case "sound": playCreatureSound(player, "gaunt", ev.id, e.location, ev.volume, cfg); break;
      case "action":
        safe(() => e.setProperty("dread:action", ev.action), undefined);
        rec.actionSince = now;
        if (ev.action === "roar") playCreatureSound(player, "gaunt", "vocal", e.location, 1.0, cfg);
        if (ev.action === "burrow") vanishEffect(e.dimension, e.location, "gaunt");
        break;
      case "marker":
        if (ev.op === "next") {
          const next = aheadOf(rec.playerId, rec.markerSeq).next; // never crosses a break in the trail
          if (next) {
            rec.markerSeq = next.seq;
            moveMarker(rec, player);
          }
        } else {
          rec.markerSeq = Math.max(0, newestSeq(rec.playerId) - 2);
          moveMarker(rec, player, rec.lastSeen ?? player.location);
        }
        break;
      case "encounter": h.onEncounter(rec.playerId, ev.kind); break;
      case "stress": h.onStress(rec.playerId, ev.amount); break;
      case "vanish": return vanish(rec, player, ev.outcome);
    }
  }
}

// -- housekeeping --------------------------------------------------------------------------------
/**
 * Every 10 s: creatures that survived a reload (or were summoned with an egg/command) are adopted by the nearest
 * player so they obey the same rules and always have an exit; stray scent markers and unowned orphans are removed.
 */
function adoptAndSweep(): void {
  const players = world.getAllPlayers();
  const markers = new Set<string>();
  for (const r of registry.values()) if (r.kind === "gaunt" && r.marker) markers.add(r.marker.id);
  for (const dimId of ["overworld", "nether", "the_end"]) {
    const dim = safe(() => world.getDimension(dimId), undefined);
    if (!dim) continue;
    for (const m of safe(() => dim.getEntities({ type: SCENT_TYPE }), [] as Entity[])) if (!markers.has(m.id)) safe(() => m.remove(), undefined);
    for (const kind of ["lurker", "gaunt"] as const) {
      for (const e of safe(() => dim.getEntities({ type: CREATURE_TYPE[kind] }), [] as Entity[])) {
        if (registry.has(e.id)) continue;
        let best: { p: Player; d: number } | undefined;
        for (const p of players) {
          if (p.dimension.id !== e.dimension.id) continue;
          const d = len(sub(p.location, e.location));
          if (!best || d < best.d) best = { p, d };
        }
        if (best && best.d < 96) {
          if (kind === "lurker") registry.set(e.id, { kind, entity: e, playerId: best.p.id, tactics: new LurkerTactics(rng, "observe"), spawnedTick: system.currentTick, hits: 0, actionSince: 0, wasHunting: false });
          else {
            const rec: GauntRec = { kind, entity: e, playerId: best.p.id, tactics: new GauntTactics(rng, "stalk"), spawnedTick: system.currentTick, hits: 0, actionSince: 0, wasHunting: false, markerSeq: newestSeq(best.p.id) };
            registry.set(e.id, rec);
            moveMarker(rec, best.p);
          }
          logConsole(`adopted ${kind} ${e.id}`);
        } else if (e.hasTag(MANAGED_TAG)) {
          safe(() => e.remove(), undefined);
        }
      }
    }
  }
  void range;
}
