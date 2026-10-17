import { system, type Player } from "@minecraft/server";
import type { Action, AmbientKind, Bearing } from "../director/types";
import { type DreadConfig } from "../core/config";
import { rotateY, normalize, type Vec3 } from "../util/vec";
import { range, type Rng } from "../util/rng";
import { safe } from "./helpers";

type Ambient = Extract<Action, { type: "ambient" }>;

const SOUND: Record<Exclude<AmbientKind, "heartbeat">, string> = {
  branch_snap: "dread.ambient.branch_snap",
  leaves_rustle: "dread.ambient.leaves_rustle",
  door_creak: "dread.ambient.door_creak",
  structure_groan: "dread.ambient.structure_groan",
  drag: "dread.ambient.drag",
  murmur: "dread.ambient.murmur",
  distant_cry: "dread.ambient.distant_cry",
  pressure_drop: "dread.ambient.pressure_drop",
  footsteps_far: "dread.ambient.footsteps_far",
  lurker_breath: "dread.lurker.breath_idle",
  lurker_step: "dread.lurker.step_stalk",
  lurker_creak: "dread.lurker.joint_creak",
  lurker_scrape: "dread.lurker.scrape",
};

/** Sudden or close sounds get an extra scale from the player's jumpscare-intensity setting. */
const LOUD = new Set<string>(["pressure_drop", "lurker_breath", "distant_cry", "notice", "chase_vocal"]);

export function soundVolume(base: number, kind: string, cfg: DreadConfig): number {
  const master = cfg.soundIntensity / 100;
  const shock = LOUD.has(kind) ? 0.25 + 0.75 * (cfg.jumpscareIntensity / 100) : 1;
  return Math.max(0, Math.min(2, base * master * shock));
}

function horizontalView(p: Player): Vec3 {
  const v = safe(() => p.getViewDirection(), { x: 0, y: 0, z: 1 });
  const n = normalize({ x: v.x, y: 0, z: v.z });
  return n.x === 0 && n.z === 0 ? { x: 0, y: 0, z: 1 } : n;
}

export function bearingToPosition(p: Player, bearing: Bearing, distance: number, rng: Rng): Vec3 {
  const view = horizontalView(p);
  let dir: Vec3;
  switch (bearing) {
    case "behind": dir = rotateY(view, Math.PI + range(rng, -0.5, 0.5)); break;
    case "left": dir = rotateY(view, Math.PI / 2 + range(rng, -0.3, 0.3)); break;
    case "right": dir = rotateY(view, -Math.PI / 2 + range(rng, -0.3, 0.3)); break;
    case "front_far": dir = rotateY(view, range(rng, -0.6, 0.6)); break;
    default: dir = rotateY(view, rng.next() * Math.PI * 2);
  }
  const l = p.location;
  return { x: l.x + dir.x * distance, y: l.y + 1, z: l.z + dir.z * distance };
}

export function playAmbient(p: Player, a: Ambient, cfg: DreadConfig, rng: Rng, stress: number): void {
  if (cfg.soundIntensity <= 0) return;
  if (a.kind === "heartbeat") {
    // A short run of beats whose pace follows stress (about 62 to 110 bpm).
    const beats = 3 + Math.floor(stress / 30);
    const gap = Math.max(18, Math.round(1200 / (62 + stress * 0.45))); // ticks per beat; the sample is ~0.9 s long
    for (let i = 0; i < beats; i++) {
      system.runTimeout(() => {
        if (!p.isValid) return;
        safe(() => p.playSound("dread.ambient.heartbeat", { volume: soundVolume(a.volume * (1 - i * 0.08), "heartbeat", cfg), pitch: 1 }), undefined);
      }, i * gap);
    }
    return;
  }
  const id = SOUND[a.kind];
  const loc = a.kind === "pressure_drop" ? undefined : bearingToPosition(p, a.bearing, a.distance, rng);
  safe(() => p.playSound(id, { volume: soundVolume(a.volume, a.kind, cfg), pitch: 1, ...(loc ? { location: loc } : {}) }), undefined);
}

/** Plays a one-off Lurker sound for one player at a world position. */
export function playLurkerSound(p: Player, name: string, at: Vec3, baseVolume: number, cfg: DreadConfig): void {
  if (cfg.soundIntensity <= 0) return;
  safe(() => p.playSound(`dread.lurker.${name}`, { volume: soundVolume(baseVolume, name, cfg), pitch: 1, location: at }), undefined);
}
