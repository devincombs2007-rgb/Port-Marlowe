import { Entity, Player, system, world, type Dimension } from "@minecraft/server";
import { readConfig } from "../core/config";
import { debug, logConsole } from "../core/log";
import type { Tactic } from "../director/types";
import { LurkerTactics, lurkerGentle, type LEvent, type Requested } from "../lurker/tactics";
import { mathRng, type Rng } from "../util/rng";
import { len, sub, type Vec3 } from "../util/vec";
import { playLurkerSound } from "./ambient";
import { canSee, findVantage, health, safe } from "./helpers";

export const LURKER_TYPE = "dread:lurker";
const MANAGED_TAG = "dread_managed";
const TICK_INTERVAL = 5; // ticks between tactical updates (4 Hz)
const DT = TICK_INTERVAL / 20;

export interface LurkerHooks {
  /** Player this Lurker belongs to, or undefined to drop the Lurker. */
  playerFor(id: string): Player | undefined;
  isLit(playerId: string): boolean;
  isUnderground(playerId: string): boolean;
  requested(playerId: string): Requested;
  onNoticed(playerId: string): void;
  onGone(playerId: string, outcome: string): void;
  onHuntEnded(playerId: string): void;
  onStress(playerId: string, amount: number): void;
}

interface Rec {
  entity: Entity;
  playerId: string;
  tactics: LurkerTactics;
  spawnedTick: number;
  hits: number;
  actionSince: number;
  wasHunting: boolean;
}

const registry = new Map<string, Rec>();
let hooks: LurkerHooks | undefined;
let rng: Rng = mathRng;

export function lurkerCount(): number {
  return registry.size;
}

export function lurkersOf(playerId: string): number {
  let n = 0;
  for (const r of registry.values()) if (r.playerId === playerId) n++;
  return n;
}

export function initLurkers(h: LurkerHooks, r: Rng = mathRng): void {
  hooks = h;
  rng = r;
  system.runInterval(tick, TICK_INTERVAL);
  system.runInterval(adoptAndSweep, 200);

  world.afterEvents.entityHurt.subscribe((e) => {
    const attacker = e.damageSource.damagingEntity;
    if (!attacker || attacker.typeId !== LURKER_TYPE) return;
    const rec = registry.get(attacker.id);
    if (rec && e.hurtEntity.id === rec.playerId) rec.hits++;
  });
}

/** Spawns a Lurker for `player`. Returns false if no valid spot was found or the cap is reached. */
export function spawnLurker(player: Player, tactic: Tactic, minDist: number, maxDist: number, underground: boolean): boolean {
  if (!hooks) return false;
  const pos = findVantage(player, minDist, maxDist, underground, rng);
  if (!pos) {
    debug(`no vantage found for ${tactic} Lurker`);
    return false;
  }
  return safe(() => {
    const e = player.dimension.spawnEntity(LURKER_TYPE, pos);
    e.addTag(MANAGED_TAG);
    register(e, player.id, tactic);
    face(e, player.location);
    if (tactic !== "observe") e.triggerEvent(tactic === "stalk" ? "dread:set_stalk" : "dread:set_hunt");
    return true;
  }, false);
}

function register(e: Entity, playerId: string, initial: Requested): void {
  registry.set(e.id, {
    entity: e, playerId, tactics: new LurkerTactics(rng, initial), spawnedTick: system.currentTick, hits: 0, actionSince: 0, wasHunting: initial === "hunt",
  });
}

function face(e: Entity, at: Vec3): void {
  safe(() => e.teleport(e.location, { facingLocation: at }), undefined);
}

export function retreatAll(playerId: string, reason: string): void {
  for (const rec of registry.values()) {
    if (rec.playerId !== playerId) continue;
    const l = rec.tactics;
    // Force the tactical brain into its exit path by asking for a vanish via a synthetic retreat.
    forceRetreat(rec, reason);
    void l;
  }
}

function forceRetreat(rec: Rec, reason: string): void {
  safe(() => rec.entity.triggerEvent("dread:set_retreat"), undefined);
  rec.tactics.forceRetreat(reason);
}

export function removeAll(playerId?: string): number {
  let n = 0;
  for (const [id, rec] of [...registry]) {
    if (playerId && rec.playerId !== playerId) continue;
    safe(() => rec.entity.remove(), undefined);
    registry.delete(id);
    n++;
  }
  return n;
}

function vanishEffect(dim: Dimension, at: Vec3): void {
  safe(() => dim.spawnParticle("dread:lurker_vanish", at), undefined);
}

function apply(rec: Rec, player: Player | undefined, events: LEvent[], cfgTick: number): void {
  const h = hooks as LurkerHooks;
  const e = rec.entity;
  const cfg = readConfig();
  for (const ev of events) {
    switch (ev.type) {
      case "group":
        safe(() => e.triggerEvent(ev.event), undefined);
        break;
      case "sound":
        if (player) playLurkerSound(player, ev.id, e.location, ev.volume, cfg);
        break;
      case "action":
        safe(() => e.setProperty("dread:action", ev.action), undefined);
        rec.actionSince = cfgTick;
        break;
      case "reposition": {
        if (!player) break;
        const pos = findVantage(player, 26, 42, h.isUnderground(rec.playerId), rng);
        if (pos) {
          vanishEffect(e.dimension, e.location);
          safe(() => e.teleport(pos, { facingLocation: player.location }), undefined);
        }
        break;
      }
      case "noticed":
        h.onNoticed(rec.playerId);
        break;
      case "stress":
        h.onStress(rec.playerId, ev.amount);
        break;
      case "vanish": {
        const at = e.location;
        vanishEffect(e.dimension, at);
        if (player) playLurkerSound(player, "vanish", at, 0.9, cfg);
        safe(() => e.remove(), undefined);
        registry.delete(e.id);
        h.onGone(rec.playerId, ev.outcome);
        break;
      }
    }
  }
}

function tick(): void {
  const h = hooks;
  if (!h || registry.size === 0) return;
  const now = system.currentTick;
  const cfg = readConfig();
  for (const [id, rec] of [...registry]) {
    const e = rec.entity;
    if (!e.isValid) {
      registry.delete(id);
      h.onGone(rec.playerId, "unloaded");
      continue;
    }
    const player = h.playerFor(rec.playerId);
    if (!player || !player.isValid || player.dimension.id !== e.dimension.id) {
      safe(() => e.remove(), undefined);
      registry.delete(id);
      if (player) h.onGone(rec.playerId, "dimension");
      continue;
    }
    // clear transient animation action flags after ~1s so the next one can fire
    const act = safe(() => e.getProperty("dread:action"), "none");
    if (act !== "none") {
      if (rec.actionSince === 0) rec.actionSince = now;
      else if (now - rec.actionSince > 24) {
        safe(() => e.triggerEvent("dread:clear_action"), undefined);
        rec.actionSince = 0;
      }
    } else rec.actionSince = 0;

    const dist = len(sub(e.location, player.location));
    const hp = health(player);
    const lhp = health(e);
    const events = rec.tactics.step({
      dt: DT, age: (now - rec.spawnedTick) / 20, dist,
      seen: dist < 80 && canSee(player, e, 0.45),
      playerLit: h.isLit(rec.playerId), playerHealth: hp.cur, lurkerHealthFrac: lhp.max > 0 ? lhp.cur / lhp.max : 1,
      hitsLanded: rec.hits, requested: h.requested(rec.playerId), gentle: lurkerGentle(cfg.intensity),
    });
    const hunting = rec.tactics.state === "hunt";
    if (rec.wasHunting && !hunting) h.onHuntEnded(rec.playerId);
    rec.wasHunting = hunting;
    if (events.length) apply(rec, player, events, now);
  }
}

/**
 * Housekeeping every 10 s: Lurkers that survived a reload (or were summoned with an egg/command) are adopted by the
 * nearest player so they obey the same rules and always have an exit; unowned ones far from anyone are removed.
 */
function adoptAndSweep(): void {
  const players = world.getAllPlayers();
  for (const dimId of ["overworld", "nether", "the_end"]) {
    const dim = safe(() => world.getDimension(dimId), undefined);
    if (!dim) continue;
    for (const e of safe(() => dim.getEntities({ type: LURKER_TYPE }), [] as Entity[])) {
      if (registry.has(e.id)) continue;
      let best: { p: Player; d: number } | undefined;
      for (const p of players) {
        if (p.dimension.id !== e.dimension.id) continue;
        const d = len(sub(p.location, e.location));
        if (!best || d < best.d) best = { p, d };
      }
      if (best && best.d < 96) {
        register(e, best.p.id, "observe");
        safe(() => e.triggerEvent("dread:set_observe"), undefined);
        logConsole(`adopted Lurker ${e.id}`);
      } else if (e.hasTag(MANAGED_TAG)) {
        safe(() => e.remove(), undefined); // orphan from a previous session with nobody around
      }
    }
  }
}
