import { Dimension, MolangVariableMap, Player, Vector3 } from "@minecraft/server";
import { prefs } from "./config";

// Visual effects are always optional (player preference "Visual effects"). We never force
// camera shake or flashing; fades are slow and short.

const FOG_TAGS = ["hollow_watch", "hollow_heart", "hollow_mire", "hollow_dread"];

export function pushFog(p: Player, fogId: string, tag: string): void {
  if (!prefs(p).visualFx) return;
  try {
    p.fogSettings.remove(tag);
    p.fogSettings.push(fogId, tag);
  } catch {
    /* unsupported or player left */
  }
}

export function popFog(p: Player, tag: string): void {
  try {
    p.fogSettings.remove(tag);
  } catch {
    /* ignore */
  }
}

/** Fog settings persist with the player across saves; clear ours on every join/respawn. */
export function clearAllFog(p: Player): void {
  for (const t of FOG_TAGS) popFog(p, t);
}

export function softFade(p: Player, seconds = 0.6, color = { red: 0.02, green: 0.02, blue: 0.03 }): void {
  if (!prefs(p).visualFx) return;
  try {
    p.camera.fade({ fadeColor: color, fadeTime: { fadeInTime: seconds * 0.4, holdTime: seconds * 0.2, fadeOutTime: seconds } });
  } catch {
    /* ignore */
  }
}

export function particle(dim: Dimension, id: string, at: Vector3, vars?: Record<string, number>): void {
  try {
    if (vars) {
      const m = new MolangVariableMap();
      for (const k of Object.keys(vars)) m.setFloat(k, vars[k]);
      dim.spawnParticle(id, at, m);
    } else {
      dim.spawnParticle(id, at);
    }
  } catch {
    /* unloaded chunk */
  }
}

export function hint(p: Player, text: string): void {
  if (!prefs(p).hints) return;
  try {
    p.onScreenDisplay.setActionBar(text);
  } catch {
    /* ignore */
  }
}

/** Action bar text that is shown regardless of the hints preference (rare, important). */
export function notice(p: Player, text: string): void {
  try {
    p.onScreenDisplay.setActionBar(text);
  } catch {
    /* ignore */
  }
}
