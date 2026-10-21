import { dreadChance, frighten } from "../core/fear";
import { Entity, EntityDamageCause, ItemStack, Player, Vector3, world } from "@minecraft/server";
import { accent, ambient, worldSound } from "../core/audio";
import { chanceScale, cooldownScale, settings } from "../core/config";
import { hint, particle, popFog, pushFog } from "../core/fx";
import { DP, ENT, FOG, ITEM, PARTICLE, SND } from "../core/ids";
import { add, angleTo, chance, dist, norm, rand, sub, yawDir, yawOf } from "../core/math";
import { cooldownReady, ctx, huntable, onlinePlayers, rt, setCooldown } from "../core/players";
import { every, later } from "../core/scheduler";
import { hollowDay, isDarkHours, isDay, now, seconds } from "../core/time";
import { LIGHT_BLOCKS, biomeGroup, clearLine, groundNear, hasBlockNear, holdingLight, inLitArea } from "../core/world";
import { lanternNear, protectedSpot, useWard, wardNear } from "../items/blocks";
import { dailyAdd, dailyCount } from "../systems/daily";
import { unlock } from "../systems/journal";
import { TrackKind, standingPrints, trail } from "../systems/tracks";

// THE WATCHER
// Rules (all discoverable, all documented in the journal):
//  1. Appears only in wooded biomes, from dusk to dawn, 34-50 blocks away, just outside view.
//  2. Hold your gaze on it for ~1.2 s and it withdraws, leaving Weeping Sap (1 per player per night).
//  3. It only moves while nobody is looking at it. Ignore it and it creeps closer.
//  4. It will not approach lit places, wards or Heartwood Lanterns, and it never strikes anyone
//     holding a light. In darkness, unobserved and within 5 blocks, it strikes once and withdraws.
//  5. On the first nights (grace period) it is only ever a distant glimpse.

type State = "lurk" | "stalk" | "withdraw" | "lunge";

interface Enc {
  id: string;
  target: string;
  born: number;
  state: State;
  stateAt: number;
  stare: number;
  unseen: number;
  sawOnce: boolean;
  glimpse: boolean;
  closeCue: boolean;
  resin: boolean;
  litAt: number;
  lit: boolean;
  pattern: "direct" | "patient";
  pauseUntil: number;
  nextPause: number;
}

const encounters = new Map<string, Enc>();
const HEAD = 2.6;

export function watcherCount(): number {
  return encounters.size;
}

export function isWatcherTracked(id: string): boolean {
  return encounters.has(id);
}

function setState(e: Entity, enc: Enc, s: State): void {
  if (enc.state === s) return;
  enc.state = s;
  enc.stateAt = now();
  try {
    e.triggerEvent(s === "stalk" && enc.pattern === "patient" ? "hollow:to_stalk_patient" : `hollow:to_${s}`);
  } catch {
    /* entity unloaded */
  }
}

function headOf(e: Entity): Vector3 {
  return add(e.location, { x: 0, y: HEAD, z: 0 });
}

/** True if this player is looking at the watcher with a clear line of sight. */
function looking(p: Player, e: Entity): boolean {
  const head = p.getHeadLocation();
  const target = headOf(e);
  const d = dist(head, target);
  if (d > 72) return false;
  const tol = Math.max(8, (Math.atan(1.6 / Math.max(d, 0.1)) * 180) / Math.PI);
  if (angleTo(p.getViewDirection(), head, target) > tol) return false;
  const dim = p.dimension;
  return clearLine(dim, head, target) || clearLine(dim, head, add(e.location, { x: 0, y: 1.4, z: 0 }));
}

function observers(e: Entity): Player[] {
  const out: Player[] = [];
  for (const p of e.dimension.getPlayers({ location: e.location, maxDistance: 72 })) {
    if (looking(p, e)) out.push(p);
  }
  return out;
}

function targetSafe(p: Player, enc: Enc): boolean {
  const t = now();
  if (t - enc.litAt > 40) {
    enc.lit = inLitArea(p, 6) || lanternNear(p.dimension, p.location) || ctx(p).roofed;
    enc.litAt = t;
  }
  return enc.lit;
}

function canStrike(p: Player, enc: Enc): boolean {
  return settings().intensity >= 1 && huntable(p) && !holdingLight(p) && !targetSafe(p, enc);
}

// --------------------------------------------------------------------------------- spawning

export function tryStartWatcher(p: Player): boolean {
  const s = settings();
  if (!s.watcher || !isDarkHours()) return false;
  const c = ctx(p);
  if (!c.overworld || !["forest", "open", "shore"].includes(c.biome) || c.underground || c.inWater || c.roofed) return false;
  if (!huntable(p) || rt(p).encounter || !cooldownReady(p, "watcher")) return false;
  if (encounters.size >= Math.min(3, Math.max(1, onlinePlayers().length))) return false;
  if (!chance(0.1 * chanceScale() * dreadChance(p))) return false;
  if (protectedSpot(p.dimension, p.location)) return false;

  const dim = p.dimension;
  const view = p.getViewDirection();
  const baseYaw = yawOf(view);
  const head = p.getHeadLocation();
  for (let k = 0; k < 7; k++) {
    // Just outside the field of view, so it is *there* when they turn - never popping in.
    const side = Math.random() < 0.5 ? -1 : 1;
    const yaw = baseYaw + side * rand(95, 160);
    const r = rand(34, 50);
    const dir = yawDir(yaw);
    const x = p.location.x + dir.x * r;
    const z = p.location.z + dir.z * r;
    const g = groundNear(dim, x, p.location.y, z, 12, 3);
    if (!g || protectedSpot(dim, g)) continue;
    if (biomeGroup(dim, g) !== "forest") continue;
    if (hasBlockNear(dim, g, LIGHT_BLOCKS, 5, 2, 5)) continue;
    if (!clearLine(dim, head, add(g, { x: 0, y: HEAD, z: 0 }))) continue;
    let e: Entity;
    try {
      e = dim.spawnEntity(ENT.watcher, g, { initialRotation: yawOf(norm(sub(p.location, g))) });
    } catch {
      continue;
    }
    e.setDynamicProperty(DP.owner, p.id);
    e.setDynamicProperty(DP.born, now());
    // Alternate successful encounters after the initial random choice; failed spawn attempts
    // never consume a pattern. Keep the same grace, stare and light counterplay in both.
    const previous = rt(p).lastWatcherPattern;
    const pattern = previous ? (previous === "direct" ? "patient" : "direct") : (chance(0.5) ? "patient" : "direct");
    rt(p).lastWatcherPattern = pattern;
    e.setProperty("hollow:patient", pattern === "patient");
    const enc: Enc = {
      id: e.id, target: p.id, born: now(), state: "lurk", stateAt: now(), stare: 0, unseen: 0,
      sawOnce: false, glimpse: hollowDay() < s.graceDays, closeCue: false, resin: false, litAt: -999, lit: false,
      pattern, pauseUntil: 0, nextPause: now() + seconds(rand(8, 12)),
    };
    encounters.set(e.id, enc);
    rt(p).encounter = "watcher";
    setCooldown(p, "watcher", seconds(rand(240, 420) * cooldownScale() / dreadChance(p)));
    // The forest holds its breath: a near-subliminal hush just before it is noticed.
    ambient(p, SND.hush, { volume: 0.7, minGap: 0, cueGap: 1200 });
    pushFog(p, FOG.watched, "hollow_watch");
    return true;
  }
  return false;
}

// --------------------------------------------------------------------------------- endings

function release(enc: Enc): void {
  encounters.delete(enc.id);
  const p = world.getEntity(enc.target) as Player | undefined;
  if (p && p.isValid) {
    if (rt(p).encounter === "watcher") rt(p).encounter = undefined;
    popFog(p, "hollow_watch");
  }
}

function vanish(e: Entity | undefined, enc: Enc): void {
  release(enc);
  if (!e || !e.isValid) return;
  particle(e.dimension, PARTICLE.shed, add(e.location, { x: 0, y: 1.4, z: 0 }));
  try {
    e.remove();
  } catch {
    /* already gone */
  }
}

function withdraw(e: Entity, enc: Enc, reason: "stared" | "hurt" | "struck" | "ward" | "dawn" | "timeout", by?: Player): void {
  if (enc.state === "withdraw") return;
  setState(e, enc, "withdraw");
  if (reason !== "dawn") standingPrints(e, TrackKind.Watcher); // it stood here, watching
  const dim = e.dimension;
  worldSound(dim, SND.watcherSeen, headOf(e), 0.9);
  later("watcher.retreat", 12, () => {
    if (e.isValid) worldSound(dim, SND.watcherRetreat, e.location, 0.8);
  });
  const target = world.getEntity(enc.target) as Player | undefined;
  if (target) popFog(target, "hollow_watch");
  if (reason === "stared" && by) {
    for (const p of dim.getPlayers({ location: e.location, maxDistance: 72 })) unlock(p, "watcher2");
    if (!enc.resin && dailyCount(by, "resin") < (settings().intensity === 2 ? 2 : 1)) {
      enc.resin = true;
      dailyAdd(by, "resin");
      const at = add(e.location, { x: 0, y: 0.3, z: 0 });
      try {
        dim.spawnItem(new ItemStack(ITEM.paleResin, 1), at);
        particle(dim, PARTICLE.resinGlint, at);
        later("watcher.glint", 40, () => particle(dim, PARTICLE.resinGlint, at));
        later("watcher.glint2", 100, () => particle(dim, PARTICLE.resinGlint, at));
      } catch {
        /* unloaded */
      }
      hint(by, "§7It stepped back into the trees. Something glints where it stood.");
    }
  }
}

// --------------------------------------------------------------------------------- update

function update(): void {
  if (encounters.size === 0) return;
  const t = now();
  for (const enc of [...encounters.values()]) {
    const e = world.getEntity(enc.id);
    if (!e || !e.isValid) {
      release(enc);
      continue;
    }
    const p = world.getEntity(enc.target) as Player | undefined;
    if (!p || !p.isValid || p.dimension.id !== e.dimension.id) {
      vanish(e, enc);
      continue;
    }
    const age = t - enc.born;
    const inState = t - enc.stateAt;
    const d = dist(p.location, e.location);

    if (enc.state === "withdraw") {
      const seen = observers(e).length > 0;
      if ((inState > 60 && (!seen || d > 40)) || inState > 240) vanish(e, enc);
      continue;
    }
    if (isDay()) {
      withdraw(e, enc, "dawn");
      continue;
    }
    if (age > seconds(180) || d > 96) {
      withdraw(e, enc, "timeout");
      continue;
    }

    const obs = observers(e);
    if (obs.length > 0) {
      enc.unseen = 0;
      enc.stare += 4;
      if (!enc.sawOnce) {
        enc.sawOnce = true;
        for (const o of obs) {
          unlock(o, "watcher1");
          accent(o, SND.stingerDistant, 1);
          frighten(o, 14);
        }
      }
      if (enc.state === "stalk") setState(e, enc, "lurk");
      if (enc.state === "lunge" && inState < 10) continue; // committed
      if (enc.stare >= 24 && (enc.state === "lurk" || enc.state === "stalk")) withdraw(e, enc, "stared", obs[0]);
      continue;
    }

    enc.unseen += 4;
    enc.stare = Math.max(0, enc.stare - 4);

    // Wards and lanterns hold it at the edge of their light.
    const ward = wardNear(e.dimension, e.location);
    if (ward && (enc.state === "stalk" || enc.state === "lunge")) {
      useWard(ward, "watcher");
      withdraw(e, enc, "ward");
      continue;
    }

    if (enc.state === "lurk") {
      if (enc.glimpse) {
        if (age > seconds(45)) withdraw(e, enc, "timeout");
        continue;
      }
      if (t >= enc.pauseUntil && enc.unseen >= 60 && !targetSafe(p, enc)) setState(e, enc, "stalk");
      continue;
    }

    if (enc.state === "stalk") {
      trail(e, TrackKind.Watcher, 2.8);
      if (targetSafe(p, enc)) {
        setState(e, enc, "lurk");
        continue;
      }
      if (enc.pattern === "patient" && d > 12 && t >= enc.nextPause) {
        enc.pauseUntil = t + seconds(rand(0.8, 1.4));
        enc.nextPause = t + seconds(rand(7, 11));
        setState(e, enc, "lurk");
        continue;
      }
      if (d <= 10 && !enc.closeCue) {
        enc.closeCue = true;
        // A twig snaps right behind you: the readable warning before any strike.
        worldSound(e.dimension, "hollow.watcher.step", e.location, 1.0, 0.8);
        hint(p, "§8...a twig snaps behind you.");
        frighten(p, 12);
        unlock(p, "watcher3", true);
      }
      if (d <= 5) {
        if (canStrike(p, enc)) {
          setState(e, enc, "lunge");
          worldSound(e.dimension, SND.watcherLunge, headOf(e));
        } else setState(e, enc, "lurk");
      }
      continue;
    }

    if (enc.state === "lunge" && inState > 70) withdraw(e, enc, "timeout");
  }
}

// --------------------------------------------------------------------------------- events

export function onWatcherHurt(hurt: Entity, cause: EntityDamageCause, by?: Entity): void {
  const enc = encounters.get(hurt.id);
  if (!enc) return;
  if (cause === EntityDamageCause.fall) return;
  withdraw(hurt, enc, "hurt", by instanceof Player ? by : undefined);
}

/** The watcher's single strike landed (melee on_attack event or the hurt event on a player). */
export function onWatcherStruck(watcher: Entity, victim?: Player): void {
  const enc = encounters.get(watcher.id);
  if (!enc) return;
  if (victim) {
    try {
      victim.addEffect("slowness", 50, { amplifier: 0, showParticles: false });
    } catch {
      /* ignore */
    }
    unlock(victim, "watcher3");
    hint(victim, "§7It struck from the dark. Keep a light in hand after dusk.");
  }
  withdraw(watcher, enc, "struck");
}

export function onWatcherDied(id: string, killer?: Entity): void {
  const enc = encounters.get(id);
  if (enc) release(enc);
  if (killer instanceof Player) {
    unlock(killer, "watcher1");
    unlock(killer, "watcher2");
  }
}

export function forgetWatcherTarget(playerId: string): void {
  for (const enc of [...encounters.values()]) {
    if (enc.target !== playerId) continue;
    vanish(world.getEntity(enc.id), enc);
  }
}

export function startWatcher(): void {
  every("watcher.update", 4, update, 1);
}
