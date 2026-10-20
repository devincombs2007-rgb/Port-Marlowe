import { Dimension, Player, Vector3, world } from "@minecraft/server";
import { safe } from "../core/scheduler";
import { now } from "../core/time";
import { block } from "../core/world";

// GAMEPLAY NOISE for the Hollowed. Only supported, observable game events are used:
//
//   source                                   radius   API
//   sprinting                                16       Player.isSprinting (polled near Hollowed)
//   walking (moving, not sneaking)            6       velocity + Entity.isSneaking
//   jumping / landing                          8       Player.isJumping, isFalling -> isOnGround
//   breaking a block                          12       world.afterEvents.playerBreakBlock
//   placing a block                            8       world.afterEvents.playerPlaceBlock
//   doors, trapdoors, gates, chests, barrels  10       world.afterEvents.playerInteractWithBlock
//   levers, buttons, pressure plates, wire    10       leverAction / buttonPush / pressurePlatePush / tripWireTrip
//   pistons                                   10       pistonActivate
//   fighting (any hurt involving a player)    14       entityHurt
//   explosions                                40       explosion
//   thrown things landing                     12       projectileHitBlock / projectileHitEntity (at impact)
//
//   Silent: sneaking, walking on any wool or carpet, standing still.

export type NoiseKind = "move" | "sprint" | "jump" | "break" | "place" | "use" | "redstone" | "combat" | "explosion" | "impact";

export interface Noise {
  dim: Dimension;
  at: Vector3;
  radius: number;
  kind: NoiseKind;
  source?: Player;
}

type Listener = (n: Noise) => void;
const listeners: Listener[] = [];
let activeCheck: (dim: Dimension, at: Vector3, radius: number) => boolean = () => false;

export function onNoise(fn: Listener): void {
  listeners.push(fn);
}

/** Lets the Hollowed module say whether anything is listening near a point (cheap pre-filter). */
export function setListenerCheck(fn: (dim: Dimension, at: Vector3, radius: number) => boolean): void {
  activeCheck = fn;
}

export function emitNoise(n: Noise): void {
  if (!activeCheck(n.dim, n.at, n.radius)) return;
  for (const l of listeners) safe("noise.listener", () => l(n));
}

const INTERACT_LOUD = ["door", "trapdoor", "fence_gate", "chest", "barrel", "shulker_box", "lever", "button"];

function quietFloor(p: Player): boolean {
  const below = block(p.dimension, { x: p.location.x, y: p.location.y - 0.2, z: p.location.z });
  if (!below) return false;
  const id = below.typeId;
  return id.endsWith("_wool") || id.endsWith("_carpet") || id === "minecraft:moss_carpet";
}

interface MoveState {
  airborne: boolean;
  lastLand: number;
}
const moveState = new Map<string, MoveState>();

/** Current movement noise radius for a player (0 = silent). */
export function movementNoise(p: Player): { radius: number; kind: NoiseKind } {
  if (p.isSneaking) return { radius: 0, kind: "move" };
  const v = p.getVelocity();
  const speed = Math.hypot(v.x, v.z);
  const st = moveState.get(p.id) ?? { airborne: false, lastLand: -999 };
  const wasAir = st.airborne;
  st.airborne = !p.isOnGround;
  let landed = false;
  if (wasAir && p.isOnGround && now() - st.lastLand > 10) {
    landed = true;
    st.lastLand = now();
  }
  moveState.set(p.id, st);
  if (quietFloor(p)) return { radius: 0, kind: "move" };
  if (p.isSprinting && speed > 0.05) return { radius: 16, kind: "sprint" };
  if (landed || p.isJumping) return { radius: 8, kind: "jump" };
  if (speed > 0.04) return { radius: 6, kind: "move" };
  return { radius: 0, kind: "move" };
}

export function noiseDescription(p: Player): string {
  const { radius, kind } = movementNoise(p);
  if (radius === 0) return p.isSneaking ? "silent (sneaking)" : "silent";
  const word = radius >= 16 ? "loud" : radius >= 8 ? "noticeable" : "soft";
  return `${word} (${kind === "sprint" ? "sprinting" : kind === "jump" ? "jumping" : "walking"}, ${radius} blocks)`;
}

export function forgetNoise(playerId: string): void {
  moveState.delete(playerId);
}

export function startNoiseEvents(): void {
  const ev = world.afterEvents;
  ev.playerBreakBlock.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 12, kind: "break", source: e.player }));
  ev.playerPlaceBlock.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 8, kind: "place", source: e.player }));
  ev.playerInteractWithBlock.subscribe((e) => {
    const id = e.block.typeId;
    if (INTERACT_LOUD.some((k) => id.includes(k))) {
      emitNoise({ dim: e.block.dimension, at: e.block.location, radius: 10, kind: "use", source: e.player });
    }
  });
  ev.leverAction.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 10, kind: "redstone", source: e.player }));
  ev.buttonPush.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 10, kind: "redstone" }));
  ev.pressurePlatePush.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 10, kind: "redstone" }));
  ev.tripWireTrip.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 10, kind: "redstone" }));
  ev.pistonActivate.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 10, kind: "redstone" }));
  ev.explosion.subscribe((e) => {
    const src = e.source;
    const at = src?.isValid ? src.location : e.getImpactedBlocks()[0]?.location;
    if (at) emitNoise({ dim: e.dimension, at, radius: 40, kind: "explosion" });
  });
  ev.projectileHitBlock.subscribe((e) => emitNoise({ dim: e.dimension, at: e.location, radius: 12, kind: "impact" }));
  ev.projectileHitEntity.subscribe((e) => emitNoise({ dim: e.dimension, at: e.location, radius: 12, kind: "impact" }));
  ev.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    const by = e.damageSource.damagingEntity;
    const player = hurt instanceof Player ? hurt : by instanceof Player ? by : undefined;
    if (!player || !hurt.isValid) return;
    emitNoise({ dim: hurt.dimension, at: hurt.location, radius: 14, kind: "combat", source: player });
  });
}
