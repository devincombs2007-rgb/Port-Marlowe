import { Dimension, Entity, Player, Vector3, world } from "@minecraft/server";
import { worldSound } from "../core/audio";
import { chanceScale, cooldownScale, settings } from "../core/config";
import { DP, ENT, SND } from "../core/ids";
import { add, chance, dist, distSq, rand, yawDir } from "../core/math";
import { cooldownReady, ctx, huntable, setCooldown } from "../core/players";
import { every, everyPlayer } from "../core/scheduler";
import { hollowDay, now, seconds } from "../core/time";
import { LIGHT_BLOCKS, clearLine, groundNear, hasBlockNear } from "../core/world";
import { unlock } from "../systems/journal";
import { Noise, emitNoise, movementNoise, onNoise, setListenerCheck } from "../systems/noise";

// THE HOLLOWED
// Blind; hunts by gameplay noise (see systems/noise.ts for the exact table). Hearing a noise sends
// it to investigate the spot (an invisible lure marker it targets with its normal pathfinding).
// Within 3 blocks it finds anyone regardless. Sneaking, wool and carpet are silent.
// Spawns only deep underground in darkness, out of the player's line of sight.

interface H {
  id: string;
  dim: string;
  born: number;
  state: "calm" | "investigate";
  stateAt: number;
  alertAt: number;
  pos: Vector3;
  lastSeenPlayer: number;
  juvenile: boolean;
}

interface Lure {
  id: string;
  dim: string;
  at: Vector3;
  born: number;
}

const hs = new Map<string, H>();
const lures = new Map<string, Lure>();

export const hollowedCount = (): number => hs.size;
export const isHollowedTracked = (id: string): boolean => hs.has(id);
export const isLureTracked = (id: string): boolean => lures.has(id);

function track(e: Entity, juvenile: boolean): void {
  hs.set(e.id, {
    id: e.id, dim: e.dimension.id, born: now(), state: juvenile ? "investigate" : "calm", stateAt: now(), alertAt: -999,
    pos: e.location, lastSeenPlayer: now(), juvenile,
  });
}

// --------------------------------------------------------------------------------- spawning

export function tryStartHollowed(p: Player): boolean {
  const s = settings();
  if (!s.hollowed || hollowDay() < s.graceDays) return false;
  const c = ctx(p);
  if (!c.overworld || !c.underground || !huntable(p) || !cooldownReady(p, "hollowed")) return false;
  const maxY = hollowDay() < 3 ? 0 : 40; // deeper is dangerous first; shallower caves later
  if (p.location.y > maxY) return false;
  let nearCount = 0;
  for (const h of hs.values()) if (h.dim === p.dimension.id && distSq(h.pos, p.location) < 48 * 48) nearCount++;
  if (nearCount >= (s.intensity === 2 ? 3 : 2) || hs.size >= 6) return false;
  if (!chance(0.15 * chanceScale())) return false;

  const dim = p.dimension;
  const head = p.getHeadLocation();
  for (let k = 0; k < 6; k++) {
    const d = yawDir(rand(0, 360));
    const r = rand(18, 30);
    const g = groundNear(dim, p.location.x + d.x * r, p.location.y + rand(-4, 4), p.location.z + d.z * r, 6, 2);
    if (!g) continue;
    try {
      if (dim.getLightLevel(add(g, { x: 0, y: 0.5, z: 0 })) > 3) continue;
    } catch {
      continue;
    }
    if (hasBlockNear(dim, g, LIGHT_BLOCKS, 6, 3, 6)) continue;
    if (clearLine(dim, head, add(g, { x: 0, y: 0.6, z: 0 }))) continue; // it comes out of the dark, never in view
    let e: Entity;
    try {
      e = dim.spawnEntity(ENT.hollowed, g);
    } catch {
      continue;
    }
    e.setDynamicProperty(DP.owner, p.id);
    track(e, false);
    setCooldown(p, "hollowed", seconds(rand(150, 240) * cooldownScale()));
    return true;
  }
  return false;
}

/** Boss minions: young hollowed that start out investigating. */
export function spawnJuvenile(dim: Dimension, at: Vector3): Entity | undefined {
  try {
    const e = dim.spawnEntity(ENT.hollowed, at);
    e.triggerEvent("hollow:make_juvenile");
    track(e, true);
    return e;
  } catch {
    return undefined;
  }
}

// --------------------------------------------------------------------------------- hearing

function placeLure(dim: Dimension, at: Vector3): void {
  for (const l of lures.values()) {
    if (l.dim === dim.id && distSq(l.at, at) < 16) {
      const e = world.getEntity(l.id);
      if (e?.isValid) {
        try {
          e.teleport(at); // the marker is an invisible point, not a creature
          l.at = at;
          l.born = now();
          return;
        } catch {
          /* fall through and respawn */
        }
      }
      lures.delete(l.id);
      break;
    }
  }
  if (lures.size >= 8) {
    const oldest = [...lures.values()].sort((a, b) => a.born - b.born)[0];
    removeLure(oldest);
  }
  try {
    const e = dim.spawnEntity(ENT.lure, { x: at.x, y: at.y + 0.5, z: at.z });
    lures.set(e.id, { id: e.id, dim: dim.id, at, born: now() });
  } catch {
    /* unloaded */
  }
}

function removeLure(l: Lure): void {
  lures.delete(l.id);
  const e = world.getEntity(l.id);
  if (e?.isValid) {
    try {
      e.remove();
    } catch {
      /* gone */
    }
  }
}

function hear(n: Noise): void {
  let heard = false;
  for (const h of hs.values()) {
    if (h.dim !== n.dim.id) continue;
    const d = dist(h.pos, n.at);
    if (d > n.radius) continue;
    const e = world.getEntity(h.id);
    if (!e?.isValid) continue;
    heard = true;
    if (now() - h.alertAt > 80) {
      h.alertAt = now();
      worldSound(e.dimension, SND.hollowedAlert, e.location, 1.0, 0.95 + Math.random() * 0.1);
    }
    if (h.state !== "investigate") {
      try {
        e.triggerEvent("hollow:investigate");
      } catch {
        continue;
      }
      h.state = "investigate";
    }
    h.stateAt = now();
    if (n.source && dist(n.source.location, h.pos) < 24) unlock(n.source, "hollowed2");
  }
  if (heard) placeLure(n.dim, n.at);
}

function listenersNear(dim: Dimension, at: Vector3, radius: number): boolean {
  const r2 = (radius + 2) * (radius + 2);
  for (const h of hs.values()) if (h.dim === dim.id && distSq(h.pos, at) <= r2) return true;
  return false;
}

/** Footsteps: only polled for underground players with a Hollowed within 20 blocks. */
function pollMovement(p: Player): void {
  if (hs.size === 0 || !ctx(p).underground) return;
  if (!listenersNear(p.dimension, p.location, 18)) return;
  const { radius, kind } = movementNoise(p);
  if (radius > 0) emitNoise({ dim: p.dimension, at: p.location, radius, kind, source: p });
}

// --------------------------------------------------------------------------------- update

function update(): void {
  const t = now();
  for (const l of [...lures.values()]) if (t - l.born > 200) removeLure(l);
  for (const h of [...hs.values()]) {
    const e = world.getEntity(h.id);
    if (!e?.isValid) {
      hs.delete(h.id);
      continue;
    }
    h.pos = e.location;
    let players: Player[] = [];
    try {
      players = e.dimension.getPlayers({ location: e.location, maxDistance: 64 });
    } catch {
      /* unloaded */
    }
    if (players.length > 0) h.lastSeenPlayer = t;
    else if (t - h.lastSeenPlayer > 600) {
      hs.delete(h.id);
      try {
        e.remove();
      } catch {
        /* gone */
      }
      continue;
    }
    for (const p of players) if (dist(p.location, e.location) < 20) unlock(p, "hollowed1");
    if (h.state === "investigate" && !h.juvenile) {
      const lureNear = [...lures.values()].some((l) => l.dim === h.dim && distSq(l.at, h.pos) < 36 * 36);
      if (!lureNear || t - h.stateAt > 240) {
        worldSound(e.dimension, SND.hollowedSniff, e.location, 0.8);
        try {
          e.triggerEvent("hollow:calm");
        } catch {
          /* ignore */
        }
        h.state = "calm";
        h.stateAt = t;
      }
    }
  }
}

export function onHollowedDied(id: string, killer?: Entity): void {
  hs.delete(id);
  if (killer instanceof Player) unlock(killer, "hollowed3");
}

export function startHollowed(): void {
  setListenerCheck(listenersNear);
  onNoise(hear);
  every("hollowed.update", 20, update, 5);
  everyPlayer("hollowed.steps", 10, pollMovement);
}
