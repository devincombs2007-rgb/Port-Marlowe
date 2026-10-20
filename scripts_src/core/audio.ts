import { Dimension, Player, Vector3 } from "@minecraft/server";
import { prefs } from "./config";
import { now } from "./time";

// Audio policy:
//  * Ambience cues: script-played, per player, scaled by the player's ambience preference,
//    at least 9 s apart, never two in the same moment.
//  * Accents (short stingers): opt-in intensity, at least 45 s apart per player.
//  * Creature sounds: positional world sounds; Minecraft's own "Hostile Creatures" slider applies.

interface AudioState {
  lastAmbient: number;
  lastAccent: number;
  lastCue: Map<string, number>;
}
const state = new Map<string, AudioState>();

function st(p: Player): AudioState {
  let s = state.get(p.id);
  if (!s) {
    s = { lastAmbient: -9999, lastAccent: -9999, lastCue: new Map() };
    state.set(p.id, s);
  }
  return s;
}

export function forgetAudio(playerId: string): void {
  state.delete(playerId);
}

/** Ambient cue heard only by this player. Returns false if suppressed by spacing rules. */
export function ambient(p: Player, sound: string, opts: { at?: Vector3; volume?: number; pitch?: number; minGap?: number; cueGap?: number } = {}): boolean {
  const pr = prefs(p);
  if (pr.ambience <= 0) return false;
  const s = st(p);
  const t = now();
  if (t - s.lastAmbient < (opts.minGap ?? 180)) return false;
  const last = s.lastCue.get(sound) ?? -99999;
  if (t - last < (opts.cueGap ?? 600)) return false;
  s.lastAmbient = t;
  s.lastCue.set(sound, t);
  try {
    p.playSound(sound, { location: opts.at, volume: (opts.volume ?? 1) * (pr.ambience / 100), pitch: opts.pitch ?? 1 });
  } catch {
    return false;
  }
  return true;
}

/** Short musical accent for encounters. `strength` 1 = subtle-safe, 2 = full only. */
export function accent(p: Player, sound: string, strength: 1 | 2 = 1, force = false): boolean {
  const pr = prefs(p);
  if (pr.accents < strength) return false;
  const s = st(p);
  const t = now();
  if (!force && t - s.lastAccent < 900) return false;
  s.lastAccent = t;
  try {
    p.playSound(sound, { volume: pr.accents === 1 ? 0.6 : 0.9 });
  } catch {
    return false;
  }
  return true;
}

/** UI-ish sound for one player (journal, lens). Not affected by ambience preference. */
export function ui(p: Player, sound: string, volume = 1, pitch = 1): void {
  try {
    p.playSound(sound, { volume, pitch });
  } catch {
    /* player left */
  }
}

/** Positional world sound everyone nearby hears (creatures, blocks). */
export function worldSound(dim: Dimension, sound: string, at: Vector3, volume = 1, pitch = 1): void {
  try {
    dim.playSound(sound, at, { volume, pitch });
  } catch {
    /* unloaded */
  }
}
