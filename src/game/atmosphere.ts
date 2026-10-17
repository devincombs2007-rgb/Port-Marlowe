import { Player } from "@minecraft/server";
import type { DreadConfig } from "../core/config";
import type { DirectorState } from "../director/types";
import { safe } from "./helpers";

/**
 * Atmosphere via stable commands only: `/fog` (resource-pack fog definitions) and `/camerashake`.
 * Bedrock has no custom post-process shader support, so this is the supported way to darken and close in the world.
 * Daytime play never receives fog from DREAD: it is applied only for the director's tense states.
 */
const FOG_USER_ID = "dread_atmos";
const FOG_FOR: Partial<Record<DirectorState, string>> = {
  unease: "dread:fog_unease",
  observation: "dread:fog_observation",
  escalation: "dread:fog_escalation",
  hunt: "dread:fog_hunt",
};

const current = new Map<string, string | undefined>();

function run(p: Player, cmd: string): void {
  safe(() => p.runCommand(cmd), undefined);
}

export function setAtmosphere(p: Player, state: DirectorState, cfg: DreadConfig, daylight: boolean): void {
  const want = cfg.enabled && cfg.effects !== "performance" && !daylight ? FOG_FOR[state] : undefined;
  if (current.get(p.id) === want) return;
  run(p, `fog @s remove ${FOG_USER_ID}`);
  if (want) run(p, `fog @s push ${want} ${FOG_USER_ID}`);
  current.set(p.id, want);
}

export function clearAtmosphere(p: { id: string }): void {
  current.delete(p.id); // the player has left; the client discards its own fog state
}

/** Short camera kick for moments of fright. Scaled by the jumpscare setting; off at 0 or in Performance mode. */
export function shake(p: Player, cfg: DreadConfig, strength: number, seconds: number): void {
  if (cfg.jumpscareIntensity <= 0 || cfg.effects === "performance") return;
  const k = (cfg.jumpscareIntensity / 100) * strength * (cfg.effects === "cinematic" ? 1.25 : 1);
  run(p, `camerashake add @s ${Math.min(0.5, k).toFixed(3)} ${seconds.toFixed(1)} rotational`);
}
