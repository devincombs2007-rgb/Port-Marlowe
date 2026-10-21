import { frighten } from "../core/fear";
import { Difficulty, Entity, ItemStack, Player, Vector3, world } from "@minecraft/server";
import { accent, worldSound } from "../core/audio";
import { chanceScale, isTestMode, settings } from "../core/config";
import { hint, notice } from "../core/fx";
import { DP, ENT, ITEM, SND } from "../core/ids";
import { add, chance, dist, pick, rand, scale } from "../core/math";
import { ctx, huntable, isNewcomer, onlinePlayers } from "../core/players";
import { every, later } from "../core/scheduler";
import { readWorld, writeWorld } from "../core/store";
import { hollowDay, hollowNight, isDay, nightKey, now, seconds, tod } from "../core/time";
import { DOORS, block, clearLine, findBlocks, getCustomState, groundNear } from "../core/world";
import { lanternNear, useWard, wardNear } from "../items/blocks";
import { unlock } from "../systems/journal";
import { TrackKind, standingPrints, trail } from "../systems/tracks";

// THE KNOCKER
// A rare night visitor (never before the configured night, default 4; at most one visit per night
// in the whole world; two nights apart on Standard). It only visits a player who is inside a roofed
// shelter with a door. It walks to the door with normal pathfinding, knocks, scratches and breathes
// for about 45 seconds, then leaves a Doorstep Nail on the step.
//   * It cannot open doors. With "Destructive Knocker" on and the world on Hard, it may try to
//     break a wooden door late in the visit (vanilla door-breaking rules apply).
//   * Opening the door while it is there lets it in (it hunts until hurt badly or 90 s pass).
//   * A charged Rowan Ward within 10 blocks of the door turns it away before it knocks.
//   * Heartwood Lanterns prevent visits entirely.

type Phase = "approach" | "knock" | "hunt" | "leave";

interface Visit {
  id: string;
  target: string;
  dim: string;
  door: Vector3;
  out: Vector3;
  started: number;
  phase: Phase;
  phaseAt: number;
  step: number;
  nailDone: boolean;
  broke: boolean;
  wardChecked: boolean;
}

interface Saved {
  lastNight: number;
  plannedKey: number;
  planned: boolean;
  planTick: number;
}

let visit: Visit | undefined;
const SAVE = DP.knocker;

export const knockerActive = (): boolean => !!visit;
export const isKnockerTracked = (id: string): boolean => visit?.id === id;

let savedCache: Saved | undefined;

function saved(): Saved {
  if (!savedCache) savedCache = readWorld<Saved>(SAVE, { lastNight: -99, plannedKey: -1, planned: false, planTick: 0 });
  return savedCache;
}

function save(s: Saved): void {
  savedCache = s;
  writeWorld(SAVE, s);
}

/** Each night is decided once, at sunset: will the Knocker come tonight, and roughly when? */
function plan(): Saved {
  const s = saved();
  const key = nightKey();
  if (s.plannedKey === key) return s;
  const cfg = settings();
  const gap = [3, 2, 1][cfg.intensity];
  const night = hollowNight();
  const eligible = cfg.knocker && hollowDay() >= cfg.graceDays && night >= cfg.knockerNight && night - s.lastNight >= gap;
  const next: Saved = {
    ...s, plannedKey: key, planned: eligible && chance(Math.min(0.9, 0.45 * chanceScale())),
    planTick: Math.round(rand(13600, 19000)),
  };
  save(next);
  return next;
}

function doorLower(dim: Player["dimension"], loc: Vector3): Vector3 {
  const below = block(dim, { x: loc.x, y: loc.y - 1, z: loc.z });
  return below && DOORS.includes(below.typeId) ? { x: loc.x, y: loc.y - 1, z: loc.z } : loc;
}

function outsideDir(dim: Player["dimension"], door: Vector3): Vector3 | undefined {
  let best: Vector3 | undefined;
  let bestSky = -1;
  for (const d of [{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }]) {
    const at = add(door, d);
    try {
      const sky = dim.getSkyLightLevel(add(at, { x: 0.5, y: 1.5, z: 0.5 }));
      if (sky > bestSky) {
        bestSky = sky;
        best = d;
      }
    } catch {
      /* unloaded */
    }
  }
  return bestSky >= 8 ? best : undefined;
}

function doorOpen(dim: Player["dimension"], door: Vector3): boolean {
  const b = block(dim, door);
  if (!b || !DOORS.includes(b.typeId)) return true; // the door is gone: treat as open
  return getCustomState(b.permutation, "open_bit") === true;
}

function insidePlayers(v: Visit): Player[] {
  try {
    return world.getDimension(v.dim).getPlayers({ location: v.door, maxDistance: 18 });
  } catch {
    return [];
  }
}

// --------------------------------------------------------------------------------- start

function tryVisit(): void {
  if (visit) return;
  const t = tod();
  if (t < 13300 || t > 21500) return;
  const s = plan();
  if (!s.planned || t < s.planTick) return;
  const candidates: { p: Player; doors: Vector3[] }[] = [];
  for (const p of onlinePlayers()) {
    if (!huntable(p) || (isNewcomer(p) && !isTestMode())) continue;
    const c = ctx(p, 0);
    if (!c.overworld || c.underground || !c.roofed) continue;
    if (lanternNear(p.dimension, p.location)) continue;
    const doors = findBlocks(p.dimension, p.location, DOORS, 10, 4, 10, 12);
    if (doors.length > 0) candidates.push({ p, doors });
  }
  if (candidates.length === 0) return;
  const { p, doors } = pick(candidates);
  const dim = p.dimension;
  doors.sort((a, b) => dist(a, p.location) - dist(b, p.location));
  for (const d of doors.slice(0, 3)) {
    const door = doorLower(dim, d);
    const out = outsideDir(dim, door);
    if (!out) continue;
    for (let k = 0; k < 5; k++) {
      const r = rand(18, 26);
      const side = { x: out.z, y: 0, z: -out.x };
      const lateral = rand(-6, 6);
      const target = add(add(door, scale(out, r)), scale(side, lateral));
      const g = groundNear(dim, target.x, door.y, target.z, 8, 3);
      if (!g || lanternNear(dim, g)) continue;
      if (clearLine(dim, p.getHeadLocation(), add(g, { x: 0, y: 2, z: 0 }))) continue;
      let e: Entity;
      try {
        e = dim.spawnEntity(ENT.knocker, g);
      } catch {
        continue;
      }
      e.setDynamicProperty(DP.owner, p.id);
      visit = {
        id: e.id, target: p.id, dim: dim.id, door, out, started: now(), phase: "approach", phaseAt: now(), step: 0,
        nailDone: false, broke: false, wardChecked: false,
      };
      save({ ...saved(), lastNight: hollowNight(), planned: false });
      return;
    }
  }
}

// --------------------------------------------------------------------------------- phases

function setPhase(e: Entity, v: Visit, p: Phase): void {
  if (v.phase === p) return;
  v.phase = p;
  v.phaseAt = now();
  const ev = p === "knock" ? "hollow:at_door" : p === "hunt" ? "hollow:hunt" : p === "leave" ? "hollow:leave" : undefined;
  if (ev) {
    try {
      e.triggerEvent(ev);
    } catch {
      /* unloaded */
    }
  }
}

function end(e: Entity | undefined): void {
  visit = undefined;
  if (e?.isValid) {
    try {
      e.remove();
    } catch {
      /* gone */
    }
  }
}

const SCRIPT: [number, string, number][] = [
  [0, SND.knock, 1.0],
  [160, SND.knock, 1.0],
  [300, SND.scratch, 0.9],
  [420, SND.knockerBreath, 0.8],
  [600, SND.knock, 1.0],
  [760, SND.scratch, 0.9],
];
const KNOCK_END = 900;
let nextTry = 0;

function update(): void {
  const v = visit;
  if (!v) {
    // looking for a door costs a few block queries per player: every 5 s is plenty
    if (now() < nextTry) return;
    nextTry = now() + 100;
    tryVisit();
    return;
  }
  const e = world.getEntity(v.id);
  if (!e?.isValid) {
    visit = undefined;
    return;
  }
  const dim = e.dimension;
  const inState = now() - v.phaseAt;
  const inside = insidePlayers(v);
  const daybreak = isDay();

  if (v.phase === "approach" || v.phase === "leave") trail(e, TrackKind.Knocker, 1.4); // bare feet to the door and away
  if (v.phase === "approach") {
    const d = dist(e.location, add(v.door, { x: 0.5, y: 0, z: 0.5 }));
    if (!v.wardChecked && d < 12) {
      v.wardChecked = true;
      const ward = wardNear(dim, v.door);
      if (ward) {
        useWard(ward, "knocker");
        for (const p of inside) {
          unlock(p, "knocker1");
          hint(p, "§7Something stopped outside. The ward flared, and it went away.");
        }
        setPhase(e, v, "leave");
        return;
      }
    }
    if (d <= 2.4) {
      setPhase(e, v, "knock");
      for (const p of insidePlayers(v)) frighten(p, 16);
      standingPrints(e, TrackKind.Knocker);
    }
    else if (inState > seconds(70) || daybreak) setPhase(e, v, "leave");
    confront(e, v);
    return;
  }

  if (v.phase === "knock") {
    while (v.step < SCRIPT.length && inState >= SCRIPT[v.step][0]) {
      const [, snd, vol] = SCRIPT[v.step];
      worldSound(dim, snd, add(v.door, { x: 0.5, y: 1.2, z: 0.5 }), vol);
      if (v.step === 0) {
        for (const p of inside) {
          unlock(p, "knocker1");
          hint(p, "§8Three knocks at the door.");
        }
      }
      v.step++;
    }
    if (doorOpen(dim, v.door)) {
      answered(e, v);
      return;
    }
    const cfg = settings();
    if (!v.broke && cfg.destructive && world.getDifficulty() === Difficulty.Hard && inState >= 600 && chance(0.05)) {
      v.broke = true;
      try {
        e.triggerEvent("hollow:break_in");
      } catch {
        /* ignore */
      }
      v.phase = "hunt";
      v.phaseAt = now();
      for (const p of inside) notice(p, "§cIt's trying to break the door!");
      return;
    }
    if (inState >= KNOCK_END || daybreak) {
      leaveWithNail(e, v, inside);
      return;
    }
    confront(e, v);
    return;
  }

  if (v.phase === "hunt") {
    const h = e.getComponent("minecraft:health");
    const low = h ? h.currentValue / h.effectiveMax < 0.25 : false;
    if (low || inState > seconds(90) || daybreak) setPhase(e, v, "leave");
    return;
  }

  // leave
  let nearest = 999;
  try {
    for (const p of dim.getPlayers({ location: e.location, maxDistance: 48 })) nearest = Math.min(nearest, dist(p.location, e.location));
  } catch {
    /* ignore */
  }
  if (nearest > 40 || inState > seconds(30)) end(e);
}

/** A player outside walks right up to it. */
function confront(e: Entity, v: Visit): void {
  try {
    for (const p of e.dimension.getPlayers({ location: e.location, maxDistance: 5 })) {
      if (!huntable(p)) continue;
      if (ctx(p).roofed) continue;
      setPhase(e, v, "hunt");
      worldSound(e.dimension, SND.knockerLunge, e.location);
      return;
    }
  } catch {
    /* ignore */
  }
}

function answered(e: Entity, v: Visit): void {
  setPhase(e, v, "hunt");
  worldSound(e.dimension, SND.knockerLunge, add(v.door, { x: 0.5, y: 1, z: 0.5 }));
  for (const p of insidePlayers(v)) {
    unlock(p, "knocker1");
    unlock(p, "knocker3");
    accent(p, SND.stingerLow, 2, true);
    frighten(p, 22);
  }
}

function leaveWithNail(e: Entity, v: Visit, inside: Player[]): void {
  setPhase(e, v, "leave");
  const dim = e.dimension;
  worldSound(dim, SND.knockerLeave, add(v.door, { x: 0.5, y: 1, z: 0.5 }), 0.9);
  if (!v.nailDone && v.step > 0) {
    v.nailDone = true;
    const step = add(add(v.door, { x: 0.5, y: 0.2, z: 0.5 }), scale(v.out, 1.2));
    later("knocker.nail", 60, () => {
      try {
        dim.spawnItem(new ItemStack(ITEM.knockerNail, 1), step);
      } catch {
        /* unloaded */
      }
    });
  }
  for (const p of inside) {
    unlock(p, "knocker2");
    hint(p, "§7Footsteps, dragging away. It's gone. For tonight.");
  }
}

export function onKnockerHurt(e: Entity, by?: Entity): void {
  const v = visit;
  if (!v || v.id !== e.id) return;
  if (v.phase === "knock" || v.phase === "approach") {
    if (by instanceof Player) answered(e, v);
  }
}

export function onKnockerDied(id: string, killer?: Entity): void {
  if (visit?.id === id) visit = undefined;
  if (killer instanceof Player) {
    unlock(killer, "knocker1");
    unlock(killer, "knocker3");
  }
}

export function forgetKnockerTarget(playerId: string): void {
  if (visit?.target === playerId && (visit.phase === "approach" || visit.phase === "knock")) {
    const e = world.getEntity(visit.id);
    if (e) setPhase(e, visit, "leave");
  }
}

/** Test kit: make the Knocker come tonight, as soon as a player is inside with a door. */
export function forceKnockerTonight(): string {
  if (visit) return "a visit is already under way";
  const t = tod();
  save({ ...saved(), plannedKey: nightKey(), planned: true, lastNight: -99, planTick: Math.max(13300, Math.min(21000, t)) });
  nextTry = 0;
  return t < 13300 || t > 21500 ? "planned: it comes after dusk (time 13300-21500) to a player indoors with a door" : "planned: stay indoors near a door";
}

export function startKnocker(): void {
  every("knocker.update", 10, update, 9);
}
