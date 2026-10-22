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
  /** Rare, harmless one-off events (once per world each). */
  rareEvents: boolean;
  /** Dread: fear builds in the dark and alone; frightened players draw encounters and may see
   * things that are not there. Off = no fear meter, no hallucinations, normal encounter odds. */
  dread: boolean;
  /** Varrow Island: when Trevor falls and nobody helps him up in time, he is gone for good
   * (on) or limps back to camp at the next dawn (off, the default). */
  trevorPermadeath: boolean;
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
  rareEvents: true,
  dread: true,
  trevorPermadeath: false,
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
  /** THE HOLLOW's own music cues (night, cave, shrine, boss, dawn). */
  music: boolean;
  /** Dread effects: heartbeat, breathing, the closing-in fog and hallucinations. */
  dreadFx: boolean;
}

export const PREF_DEFAULTS: PlayerPrefs = { ambience: 80, accents: 1, visualFx: true, hints: true, music: true, dreadFx: true };

let worldCache: WorldSettings | undefined;
const prefCache = new Map<string, PlayerPrefs>();

// TEST MODE (operators, /scriptevent hollow:test on): removes waiting so every encounter can be
// checked in one session. Runtime-only on purpose: a restart always returns to the real rules.
let testMode = false;
export const isTestMode = (): boolean => testMode;
export function setTestMode(on: boolean): void {
  testMode = on;
}

export function settings(): WorldSettings {
  if (!worldCache) {
    worldCache = sanitizeWorld(readWorld(DP.settings, WORLD_DEFAULTS));
  }
  return testMode ? { ...worldCache, graceDays: 0, knockerNight: 1 } : worldCache;
}

/** The saved rules without test-mode overrides (for the World rules form, so saving never
 * persists test values). */
export function rawSettings(): WorldSettings {
  settings();
  return worldCache!;
}

/** Day-based unlocks ("from day 2 the Borrowed..."); always reached in test mode. */
export function dayReached(hollowDayNow: number, n: number): boolean {
  return testMode || hollowDayNow >= n;
}

export function saveSettings(s: WorldSettings): void {
  worldCache = sanitizeWorld(s);
  writeWorld(DP.settings, worldCache);
}

function sanitizeWorld(s: WorldSettings): WorldSettings {
  const out = { ...WORLD_DEFAULTS };
  out.intensity = numberSetting(s.intensity, out.intensity, 0, 2);
  out.frequency = numberSetting(s.frequency, out.frequency, 25, 200);
  out.graceDays = numberSetting(s.graceDays, out.graceDays, 0, 10);
  out.knockerNight = numberSetting(s.knockerNight, out.knockerNight, 1, 20);
  for (const key of ["watcher", "borrowed", "hollowed", "knocker", "mirebound", "destructive",
    "sleepDisturbance", "sites", "bossScaling", "rareEvents", "dread", "trevorPermadeath"] as const) {
    if (typeof s[key] === "boolean") out[key] = s[key];
  }
  return out;
}

function numberSetting(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback;
}

function sanitizePrefs(p: PlayerPrefs): PlayerPrefs {
  return {
    ambience: numberSetting(p.ambience, PREF_DEFAULTS.ambience, 0, 100),
    accents: numberSetting(p.accents, PREF_DEFAULTS.accents, 0, 2),
    visualFx: typeof p.visualFx === "boolean" ? p.visualFx : PREF_DEFAULTS.visualFx,
    hints: typeof p.hints === "boolean" ? p.hints : PREF_DEFAULTS.hints,
    music: typeof p.music === "boolean" ? p.music : PREF_DEFAULTS.music,
    dreadFx: typeof p.dreadFx === "boolean" ? p.dreadFx : PREF_DEFAULTS.dreadFx,
  };
}

export function prefs(player: Player): PlayerPrefs {
  let p = prefCache.get(player.id);
  if (!p) {
    p = sanitizePrefs(readEntity(player, DP.prefs, PREF_DEFAULTS));
    prefCache.set(player.id, p);
  }
  return p;
}

export function savePrefs(player: Player, p: PlayerPrefs): void {
  const clean = sanitizePrefs(p);
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
  if (testMode) return 25;
  const s = settings();
  const byIntensity = [0.55, 1.0, 1.5][s.intensity];
  return byIntensity * (s.frequency / 100);
}

/** Multiplier for cooldown durations (smaller = more frequent). */
export function cooldownScale(): number {
  if (testMode) return 0.02;
  const s = settings();
  const byIntensity = [1.6, 1.0, 0.7][s.intensity];
  return byIntensity / Math.max(0.25, s.frequency / 100);
}
