import { Player, PlayerPermissionLevel } from "@minecraft/server";
import { DP } from "./ids";
import { readEntity, readWorld, writeEntity, writeWorld } from "./store";

/** World-wide rules. Only operators (the Realm owner / world host) can change these. */
export interface WorldSettings {
  /** 0 = Calm, 1 = Standard, 2 = Nightmare */
  intensity: number;
  /** Encounter frequency in percent (25..200). */
  frequency: number;
  /** Full in-game days before creatures start hunting (they may still be glimpsed). */
  graceDays: number;
  /** First night (counted from when the add-on was enabled) the Knocker may visit. */
  knockerNight: number;
  watcher: boolean;
  borrowed: boolean;
  hollowed: boolean;
  knocker: boolean;
  mirebound: boolean;
  /** Optional destruction: the Knocker may break wooden doors on Hard. Off by default. */
  destructive: boolean;
  /** Rare, warned, harmless bedtime knocking. Never prevents sleep. */
  sleepDisturbance: boolean;
  /** Place the cabin / campsite / shrine sites near exploring players. */
  sites: boolean;
  /** Scale the Heart Below with the number of players in the arena. */
  bossScaling: boolean;
}

export const WORLD_DEFAULTS: WorldSettings = {
  intensity: 1,
  frequency: 100,
  graceDays: 1,
  knockerNight: 4,
  watcher: true,
  borrowed: true,
  hollowed: true,
  knocker: true,
  mirebound: true,
  destructive: false,
  sleepDisturbance: true,
  sites: true,
  bossScaling: true,
};

/** Per-player comfort preferences. Every player can change their own. */
export interface PlayerPrefs {
  /** Script-driven ambience volume in percent (0..100). */
  ambience: number;
  /** 0 = off, 1 = subtle, 2 = full encounter accents (short musical stingers). */
  accents: number;
  /** Fog shifts and brief camera fades during encounters. */
  visualFx: boolean;
  /** Action-bar hints that explain what just happened. */
  hints: boolean;
}

export const PREF_DEFAULTS: PlayerPrefs = { ambience: 80, accents: 1, visualFx: true, hints: true };

let worldCache: WorldSettings | undefined;
const prefCache = new Map<string, PlayerPrefs>();

export function settings(): WorldSettings {
  if (!worldCache) {
    worldCache = sanitizeWorld(readWorld(DP.settings, WORLD_DEFAULTS));
  }
  return worldCache;
}

export function saveSettings(s: WorldSettings): void {
  worldCache = sanitizeWorld(s);
  writeWorld(DP.settings, worldCache);
}

function sanitizeWorld(s: WorldSettings): WorldSettings {
  const out = { ...WORLD_DEFAULTS, ...s };
  out.intensity = Math.max(0, Math.min(2, Math.round(out.intensity)));
  out.frequency = Math.max(25, Math.min(200, Math.round(out.frequency)));
  out.graceDays = Math.max(0, Math.min(10, Math.round(out.graceDays)));
  out.knockerNight = Math.max(1, Math.min(20, Math.round(out.knockerNight)));
  return out;
}

export function prefs(player: Player): PlayerPrefs {
  let p = prefCache.get(player.id);
  if (!p) {
    p = { ...PREF_DEFAULTS, ...readEntity(player, DP.prefs, PREF_DEFAULTS) };
    prefCache.set(player.id, p);
  }
  return p;
}

export function savePrefs(player: Player, p: PlayerPrefs): void {
  const clean: PlayerPrefs = {
    ambience: Math.max(0, Math.min(100, Math.round(p.ambience))),
    accents: Math.max(0, Math.min(2, Math.round(p.accents))),
    visualFx: !!p.visualFx,
    hints: !!p.hints,
  };
  prefCache.set(player.id, clean);
  writeEntity(player, DP.prefs, clean);
}

export function forgetPrefs(playerId: string): void {
  prefCache.delete(playerId);
}

export function isOperator(player: Player): boolean {
  try {
    return player.playerPermissionLevel >= PlayerPermissionLevel.Operator;
  } catch {
    return false;
  }
}

/** Multiplier for encounter chances from intensity + frequency. */
export function chanceScale(): number {
  const s = settings();
  const byIntensity = [0.55, 1.0, 1.5][s.intensity];
  return byIntensity * (s.frequency / 100);
}

/** Multiplier for cooldown durations (smaller = more frequent). */
export function cooldownScale(): number {
  const s = settings();
  const byIntensity = [1.6, 1.0, 0.7][s.intensity];
  return byIntensity / Math.max(0.25, s.frequency / 100);
}
