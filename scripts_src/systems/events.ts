import { BlockPermutation, Dimension, ItemStack, Player, Vector3 } from "@minecraft/server";
import { accent, ambient, worldSound } from "../core/audio";
import { settings } from "../core/config";
import { DP, ITEM, SND } from "../core/ids";
import { add, chance, dist, norm, rand, sub, yawDir, yawOf } from "../core/math";
import { ctx, huntable, isNewcomer, rt } from "../core/players";
import { everyPlayer, later } from "../core/scheduler";
import { readWorld, readWorldArray, writeWorld } from "../core/store";
import { hollowNight, isNight } from "../core/time";
import { block, clearLine, groundNear } from "../core/world";
import { unlock } from "./journal";

// RARE ONE-OFF EVENTS. Each happens at most once per world, never hurts anyone, never during an
// encounter, and can be switched off in World rules ("Rare one-off events").
//  * Every Eye   - every animal around you turns to stare at you for eight seconds.
//  * The Lantern - a lantern burning on a stump deep in the trees, a page beneath it; it goes out
//                  as you reach it.
//  * On the Roof - slow, heavy footsteps cross the roof of the shelter you're in. Nothing comes in.

type EventId = "eye" | "lantern" | "roof";

const ANIMALS = [
  "minecraft:sheep", "minecraft:cow", "minecraft:pig", "minecraft:chicken", "minecraft:horse", "minecraft:donkey",
  "minecraft:rabbit", "minecraft:goat", "minecraft:llama", "minecraft:mooshroom",
];

let done: string[] | undefined;
interface ActiveEvent {
  playerId: string;
  dim: string;
  origin: Vector3;
}

let running: ActiveEvent | undefined;

function beginEvent(p: Player): ActiveEvent {
  const event = { playerId: p.id, dim: p.dimension.id, origin: { ...p.location } };
  running = event;
  return event;
}

/** Queued callbacks must never resume an old event after the player leaves or a new one starts. */
function stillPresent(p: Player, event: ActiveEvent): boolean {
  if (running !== event) return false;
  if (!p.isValid || p.dimension.id !== event.dim || dist(p.location, event.origin) > 32 ||
      (p.getComponent("minecraft:health")?.currentValue ?? 0) <= 0) {
    running = undefined;
    return false;
  }
  return true;
}

export function forgetEventTarget(playerId: string): void {
  if (running?.playerId === playerId) running = undefined;
}

function isDone(id: EventId): boolean {
  done ??= readWorldArray<string>(DP.events);
  return done.includes(id);
}

function markDone(id: EventId): void {
  done ??= readWorldArray<string>(DP.events);
  if (!done.includes(id)) done.push(id);
  writeWorld(DP.events, done);
}

// ------------------------------------------------------------------------------ Every Eye

function animalsAround(p: Player): ReturnType<Dimension["getEntities"]> {
  const out = [];
  for (const type of ANIMALS) {
    try {
      out.push(...p.dimension.getEntities({ type, location: p.location, maxDistance: 24 }));
    } catch {
      /* unloaded */
    }
  }
  return out;
}

function everyEye(p: Player): boolean {
  const herd = animalsAround(p).slice(0, 24);
  if (herd.length < 5) return false;
  const event = beginEvent(p);
  ambient(p, SND.hush, { volume: 0.9, minGap: 0, cueGap: 0 });
  accent(p, SND.stingerDistant, 1, true);
  const steps = 32; // 8 s
  for (let k = 0; k <= steps; k++) {
    later("event.eye", k * 5, () => {
      if (!stillPresent(p, event)) return;
      for (const a of herd) {
        if (!a.isValid || a.dimension.id !== event.dim || dist(a.location, event.origin) > 32) continue;
        try {
          a.setRotation({ x: 0, y: yawOf(norm(sub(p.location, a.location))) });
          a.addEffect("slowness", 10, { amplifier: 255, showParticles: false });
        } catch {
          /* despawned */
        }
      }
      if (k === steps) {
        running = undefined;
        unlock(p, "event_eye");
      }
    });
  }
  return true;
}

// ------------------------------------------------------------------------------ The Lantern

interface LanternAt {
  dim: string;
  at: Vector3;
}

// persisted, so a lit lantern left behind by a restart still goes out (and leaves its page) later
function getLantern(): LanternAt | undefined {
  const l = readWorld<LanternAt | { dim: "" }>(DP.lantern, { dim: "" });
  return l.dim ? (l as LanternAt) : undefined;
}

function setLantern(l: LanternAt | undefined): void {
  writeWorld(DP.lantern, l ?? { dim: "" });
}

function theLantern(p: Player): boolean {
  if (getLantern()) return false; // one burning lantern at a time
  const dim = p.dimension;
  const head = p.getHeadLocation();
  const view = yawOf(p.getViewDirection());
  for (let k = 0; k < 8; k++) {
    const dir = yawDir(view + 180 + rand(-60, 60)); // behind the player: found later, never popping in
    const r = rand(26, 38);
    const g = groundNear(dim, p.location.x + dir.x * r, p.location.y, p.location.z + dir.z * r, 8, 3);
    if (!g) continue;
    const stump = block(dim, g);
    const top = block(dim, add(g, { x: 0, y: 1, z: 0 }));
    if (!stump?.isAir || !top?.isAir) continue;
    if (clearLine(dim, head, add(g, { x: 0, y: 1.5, z: 0 }))) continue;
    try {
      stump.setPermutation(BlockPermutation.resolve("minecraft:spruce_log"));
      top.setPermutation(BlockPermutation.resolve("minecraft:lantern"));
    } catch {
      continue;
    }
    setLantern({ dim: dim.id, at: g });
    return true;
  }
  return false;
}

function watchLantern(p: Player): void {
  const lantern = getLantern();
  if (!lantern || p.dimension.id !== lantern.dim) return;
  if (dist(p.location, lantern.at) > 6) return;
  const dim = p.dimension;
  const top = block(dim, add(lantern.at, { x: 0, y: 1, z: 0 }));
  // A chunk boundary is not a vanished lantern. Keep the saved scene until it can be read.
  if (!top) return;
  // Someone has already altered the scene: never erase a replacement block or pay a phantom reward.
  if (top.typeId !== "minecraft:lantern") {
    setLantern(undefined);
    return;
  }
  try {
    // Spawn first: if the chunk refuses an item, leave the scene pending for the next visit.
    dim.spawnItem(new ItemStack(ITEM.page, 1), add(lantern.at, { x: 0.8, y: 0.2, z: 0.4 }));
  } catch {
    return;
  }
  // Commit the one-time reward before optional visual/audio work.
  setLantern(undefined);
  try {
    top.setPermutation(BlockPermutation.resolve("minecraft:air"));
  } catch {
    /* reward is already committed; do not duplicate it if the block unloads */
  }
  worldSound(dim, SND.windGust, lantern.at, 0.8);
  for (const q of dim.getPlayers({ location: lantern.at, maxDistance: 16 })) unlock(q, "event_lantern");
}

// ------------------------------------------------------------------------------ On the Roof

function onTheRoof(p: Player): boolean {
  const dim = p.dimension;
  let roofY: number | undefined;
  try {
    const hit = dim.getBlockFromRay(p.getHeadLocation(), { x: 0, y: 1, z: 0 }, { maxDistance: 6, includePassableBlocks: false });
    roofY = hit ? hit.block.location.y + 1 : undefined;
  } catch {
    roofY = undefined;
  }
  if (roofY === undefined) return false;
  const along = yawDir(yawOf(p.getViewDirection()) + 90);
  const event = beginEvent(p);
  for (let k = 0; k < 7; k++) {
    later("event.roof", 20 + k * 17, () => {
      if (!stillPresent(p, event)) return;
      const at = { x: event.origin.x + along.x * (k - 3) * 1.2, y: roofY!, z: event.origin.z + along.z * (k - 3) * 1.2 };
      worldSound(dim, "hollow.knocker.step", at, 1.0, 0.85);
    });
  }
  later("event.roof.end", 20 + 7 * 17 + 60, () => {
    if (!stillPresent(p, event)) return;
    running = undefined;
    unlock(p, "event_roof");
  });
  return true;
}

// ------------------------------------------------------------------------------ director

function eligible(p: Player): boolean {
  return settings().rareEvents && huntable(p) && !isNewcomer(p) && !rt(p).encounter && !running;
}

function tick(p: Player): void {
  watchLantern(p);
  if (!eligible(p) || !isNight() || !chance(0.04)) return;
  const c = ctx(p);
  if (!c.overworld || c.underground) return;
  const night = hollowNight();
  if (!c.roofed && night >= 3 && !isDone("eye") && everyEye(p)) markDone("eye");
  else if (!c.roofed && c.biome === "forest" && night >= 4 && !isDone("lantern") && theLantern(p)) markDone("lantern");
  else if (c.roofed && night >= 6 && !isDone("roof") && onTheRoof(p)) markDone("roof");
}

/** Test kit: run one event now, regardless of chance or night. It then counts as done, so it
 * won't also happen naturally later in this world. */
export function forceEvent(p: Player, id: string): string {
  if (running) return "an event is already running";
  if (id === "lantern" && getLantern()) return "a lantern is already burning; walk to it first";
  const ok = id === "eye" ? everyEye(p) : id === "lantern" ? theLantern(p) : id === "roof" ? onTheRoof(p) : false;
  if (ok) markDone(id as EventId);
  if (!ok) {
    return id === "eye" ? "needs 5+ animals within 24 blocks" : id === "lantern" ? "needs open ground nearby" : id === "roof" ? "stand under a roof" : "usage: event eye|lantern|roof";
  }
  return `event ${id} started`;
}

export function startEvents(): void {
  everyPlayer("events", 400, tick);
}
