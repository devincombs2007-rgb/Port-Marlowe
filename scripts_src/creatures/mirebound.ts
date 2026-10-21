import { dreadChance, frighten } from "../core/fear";
import { Entity, EntityDamageCause, Player, Vector3, world } from "@minecraft/server";
import { accent, worldSound } from "../core/audio";
import { chanceScale, cooldownScale, dayReached, settings } from "../core/config";
import { notice, particle, popFog, pushFog } from "../core/fx";
import { DP, ENT, FOG, PARTICLE, SND } from "../core/ids";
import { add, chance, dist, distXZ, norm, rand, sub, yawDir, yawOf } from "../core/math";
import { cooldownReady, ctx, huntable, onlinePlayers, rt, setCooldown } from "../core/players";
import { every } from "../core/scheduler";
import { hollowDay, isDarkHours, now, seconds } from "../core/time";
import { block, clearLine } from "../core/world";
import { protectedSpot } from "../items/blocks";
import { unlock } from "../systems/journal";
import { TrackKind, pressTrack } from "../systems/tracks";

// THE MIREBOUND
// Lurks in 1-2 deep water in swamps, mangroves, rivers and beaches. Clues: a mossy hump with
// reeds breaking the surface, bubbles and a low gurgle every few seconds when someone is near,
// and dull amber eyes on top of its head at night.
// When a player wades (or stands at the water's edge) within 3.5 blocks, it rears up with a
// 0.6 s windup - the escape window. If the player is still within reach it grabs them (they ride
// its seat, held slightly under the surface). Escape: press Sneak to dismount, hit it, or wait;
// it lets go after 5 s at most. It never follows onto land.

type State = "lurk" | "erupt" | "grab" | "retreat";

interface M {
  id: string;
  target: string;
  born: number;
  state: State;
  stateAt: number;
  victim?: string;
  grabs: number;
  nextCue: number;
  lastPlayer: number;
  dmgAt: number;
  seatTries: number;
}

const ms = new Map<string, M>();
export const mireboundCount = (): number => ms.size;
export const isMireboundTracked = (id: string): boolean => ms.has(id);

function setState(e: Entity, m: M, s: State): void {
  if (m.state === s) return;
  m.state = s;
  m.stateAt = now();
  try {
    e.triggerEvent(`hollow:${s}`);
  } catch {
    /* unloaded */
  }
}

function isWater(id: string | undefined): boolean {
  return id === "minecraft:water" || id === "minecraft:flowing_water";
}

/** Water 1-3 deep with air above and a solid floor: returns the floor-top position. */
function shallowWater(dim: Player["dimension"], x: number, yHint: number, z: number): Vector3 | undefined {
  const fx = Math.floor(x), fz = Math.floor(z);
  for (let y = Math.floor(yHint) + 2; y >= Math.floor(yHint) - 6; y--) {
    const b = block(dim, { x: fx, y, z: fz });
    if (!b || !isWater(b.typeId)) continue;
    const above = block(dim, { x: fx, y: y + 1, z: fz });
    if (!above?.isAir) return undefined;
    let depth = 1;
    let floorY = y - 1;
    while (depth <= 3) {
      const d = block(dim, { x: fx, y: floorY, z: fz });
      if (!d) return undefined;
      if (isWater(d.typeId)) {
        depth++;
        floorY--;
        continue;
      }
      if (d.isAir || d.isLiquid) return undefined;
      return depth >= 1 && depth <= 2 ? { x: fx + 0.5, y: floorY + 1, z: fz + 0.5 } : undefined;
    }
    return undefined;
  }
  return undefined;
}

function nearWater(p: Player): boolean {
  if (p.isInWater) return true;
  const dim = p.dimension;
  const f = { x: Math.floor(p.location.x), y: Math.floor(p.location.y), z: Math.floor(p.location.z) };
  for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
    if (isWater(block(dim, { x: f.x + d[0], y: f.y, z: f.z + d[1] })?.typeId)) return true;
    if (isWater(block(dim, { x: f.x + d[0], y: f.y - 1, z: f.z + d[1] })?.typeId)) return true;
  }
  return false;
}

// --------------------------------------------------------------------------------- spawning

export function tryStartMirebound(p: Player): boolean {
  const s = settings();
  if (!s.mirebound || hollowDay() < s.graceDays || !dayReached(hollowDay(), 2)) return false;
  const c = ctx(p);
  if (!c.overworld || c.underground || (c.biome !== "swamp" && c.biome !== "shore")) return false;
  if (!huntable(p) || rt(p).encounter || !cooldownReady(p, "mirebound")) return false;
  if (ms.size >= Math.min(3, Math.max(1, onlinePlayers().length))) return false;
  const base = isDarkHours() ? 0.12 : 0.03;
  if (!chance(base * chanceScale() * dreadChance(p))) return false;
  if (protectedSpot(p.dimension, p.location)) return false;
  const dim = p.dimension;
  const yaw = yawOf(p.getViewDirection());
  for (let k = 0; k < 10; k++) {
    const d = yawDir(yaw + rand(-55, 55));
    const r = rand(10, 22);
    const at = shallowWater(dim, p.location.x + d.x * r, p.location.y, p.location.z + d.z * r);
    if (!at || distXZ(at, p.location) < 8 || protectedSpot(dim, at)) continue;
    let e: Entity;
    try {
      e = dim.spawnEntity(ENT.mirebound, at, { initialRotation: yawOf(norm(sub(p.location, at))) });
    } catch {
      continue;
    }
    e.setDynamicProperty(DP.owner, p.id);
    ms.set(e.id, { id: e.id, target: p.id, born: now(), state: "lurk", stateAt: now(), grabs: 0, nextCue: now() + 40, lastPlayer: now(), dmgAt: 0, seatTries: 0 });
    rt(p).encounter = "mirebound";
    setCooldown(p, "mirebound", seconds(rand(360, 540) * cooldownScale() / dreadChance(p)));
    return true;
  }
  return false;
}

// --------------------------------------------------------------------------------- lifecycle

function release(m: M): void {
  ms.delete(m.id);
  const p = world.getEntity(m.target) as Player | undefined;
  if (p?.isValid && rt(p).encounter === "mirebound") rt(p).encounter = undefined;
  if (m.victim) {
    const v = world.getEntity(m.victim) as Player | undefined;
    if (v?.isValid) popFog(v, "hollow_mire");
  }
}

function vanish(e: Entity | undefined, m: M): void {
  release(m);
  if (e?.isValid) {
    particle(e.dimension, PARTICLE.bubbles, add(e.location, { x: 0, y: 0.8, z: 0 }));
    try {
      e.remove();
    } catch {
      /* gone */
    }
  }
}

function riding(p: Player, e: Entity): boolean {
  try {
    return p.getComponent("minecraft:riding")?.entityRidingOn?.id === e.id;
  } catch {
    return false;
  }
}

function letGo(e: Entity, m: M, why: "sneak" | "hit" | "timeout" | "death"): void {
  const v = m.victim ? (world.getEntity(m.victim) as Player | undefined) : undefined;
  try {
    e.getComponent("minecraft:rideable")?.ejectRiders();
  } catch {
    /* ignore */
  }
  if (v?.isValid) {
    popFog(v, "hollow_mire");
    unlock(v, "mirebound2");
    if (why !== "death") notice(v, why === "sneak" ? "§7You wrench free." : why === "hit" ? "§7It lets go." : "§7It loses its grip.");
  }
  m.victim = undefined;
  worldSound(e.dimension, SND.mireRelease, e.location);
  setState(e, m, "retreat");
}

function update(): void {
  if (ms.size === 0) return;
  const t = now();
  for (const m of [...ms.values()]) {
    const e = world.getEntity(m.id);
    if (!e?.isValid) {
      release(m);
      continue;
    }
    const dim = e.dimension;
    let players: Player[] = [];
    try {
      players = dim.getPlayers({ location: e.location, maxDistance: 48 });
    } catch {
      /* ignore */
    }
    if (players.length > 0) m.lastPlayer = t;
    const inState = t - m.stateAt;

    if (m.state === "lurk") {
      if (t - m.lastPlayer > seconds(60) || t - m.born > seconds(300)) {
        vanish(e, m);
        continue;
      }
      // clues: bubbles + gurgle while someone is within 24 blocks
      const close = players.filter((p) => dist(p.location, e.location) < 24);
      if (close.length > 0 && t >= m.nextCue) {
        m.nextCue = t + Math.round(rand(110, 200));
        particle(dim, PARTICLE.bubbles, add(e.location, { x: 0, y: 0.9, z: 0 }));
        worldSound(dim, chance(0.6) ? SND.mireBubble : SND.mireGurgle, e.location, 0.7);
        for (const p of close) {
          if (dist(p.location, e.location) < 18 && clearLine(dim, p.getHeadLocation(), add(e.location, { x: 0, y: 1, z: 0 }))) unlock(p, "mirebound1");
        }
      }
      const prey = players.find((p) => huntable(p) && distXZ(p.location, e.location) < 3.5 && Math.abs(p.location.y - e.location.y) < 2.5 && nearWater(p) && !protectedSpot(dim, p.location));
      if (prey) {
        setState(e, m, "erupt");
        m.victim = prey.id;
        worldSound(dim, SND.mireErupt, e.location, 1.0);
        particle(dim, PARTICLE.bubbles, add(e.location, { x: 0, y: 1, z: 0 }));
        accent(prey, SND.stingerLow, 2);
        frighten(prey, 20);
      }
      continue;
    }

    if (m.state === "erupt") {
      if (inState < 12) continue; // the windup: step away now
      const v = m.victim ? (world.getEntity(m.victim) as Player | undefined) : undefined;
      if (!v?.isValid || dist(v.location, e.location) > 3.2 || !huntable(v) || protectedSpot(dim, v.location)) {
        m.victim = undefined;
        if (v?.isValid) notice(v, "§7It snaps at empty water. Get to dry land.");
        setState(e, m, "retreat");
        continue;
      }
      setState(e, m, "grab");
      // the drag: wet marks from where the victim stood toward the water
      for (let k = 0; k <= 2; k++) {
        const f = k / 2;
        const at = { x: v.location.x + (e.location.x - v.location.x) * f, y: v.location.y, z: v.location.z + (e.location.z - v.location.z) * f };
        pressTrack(dim, at, TrackKind.Drag, { x: e.location.x - v.location.x, y: 0, z: e.location.z - v.location.z });
      }
      m.grabs++;
      m.dmgAt = t;
      m.seatTries = 0;
      continue;
    }

    if (m.state === "grab") {
      const v = m.victim ? (world.getEntity(m.victim) as Player | undefined) : undefined;
      if (!v?.isValid || v.getComponent("minecraft:health")?.currentValue === 0) {
        letGo(e, m, "death");
        continue;
      }
      if (m.seatTries < 3 && !riding(v, e)) {
        // the rideable component arrives with the grab group; seat the player on the next updates
        m.seatTries++;
        let held = false;
        try {
          held = !!e.getComponent("minecraft:rideable")?.addRider(v);
        } catch {
          held = false;
        }
        if (m.seatTries >= 3 && !held && !riding(v, e)) {
          // Fallback if this platform refuses forced riding: a bite and a brief stagger instead.
          v.applyDamage(3, { cause: EntityDamageCause.entityAttack, damagingEntity: e });
          v.addEffect("slowness", 50, { amplifier: 2, showParticles: false });
          letGo(e, m, "timeout");
          continue;
        }
        if (held) {
          worldSound(e.dimension, SND.mireGrab, e.location);
          pushFog(v, FOG.mire, "hollow_mire");
        }
        continue;
      }
      if (!riding(v, e)) {
        letGo(e, m, "sneak");
        continue;
      }
      notice(v, "§fPress §lSNEAK§r§f to break free!");
      if (t - m.dmgAt >= 30) {
        m.dmgAt = t;
        v.applyDamage(2, { cause: EntityDamageCause.entityAttack, damagingEntity: e });
      }
      if (inState > 100) letGo(e, m, "timeout");
      continue;
    }

    // retreat: swim off, then either settle again in the water or leave
    if (inState > 120) {
      const floor = block(dim, { x: e.location.x, y: e.location.y + 0.2, z: e.location.z });
      if (m.grabs < 2 && floor && isWater(floor.typeId)) setState(e, m, "lurk");
      else vanish(e, m);
    }
  }
}

export function onMireboundHurt(e: Entity, by?: Entity): void {
  const m = ms.get(e.id);
  if (!m) return;
  if (m.state === "grab" && by instanceof Player) letGo(e, m, "hit");
  else if (m.state === "lurk") setState(e, m, "retreat");
}

export function onMireboundDied(id: string, killer?: Entity): void {
  const m = ms.get(id);
  if (m) release(m);
  if (killer instanceof Player) {
    unlock(killer, "mirebound1");
    unlock(killer, "mirebound2");
  }
}

export function forgetMireboundTarget(playerId: string): void {
  for (const m of [...ms.values()]) {
    const e = world.getEntity(m.id);
    if (m.victim === playerId && e?.isValid) letGo(e, m, "death");
    if (m.target === playerId && m.state === "lurk") vanish(e, m);
  }
}

export function startMirebound(): void {
  every("mirebound.update", 2, update, 11);
}
