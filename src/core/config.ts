import { world } from "@minecraft/server";

/**
 * Player-facing settings, stored as world dynamic properties so they persist per world and work
 * identically on iOS, Xbox and Realms. Every key is validated on read so a hand-edited or corrupt
 * value can never crash the director.
 */
export type EffectsLevel = "performance" | "balanced" | "cinematic";

export interface DreadConfig {
  /** Master switch. When false the add-on does nothing at all. */
  enabled: boolean;
  /** 0-100. Scales volume of scripted horror audio (not vanilla sounds). */
  soundIntensity: number;
  /** 0-100. How busy the Horror Director is (event frequency). Below ~35 also enables gentle Lurker behaviour. */
  intensity: number;
  /** 0-100. 0 disables jumpscares entirely; scripted stingers scale with this. */
  jumpscareIntensity: number;
  effects: EffectsLevel;
  /** Shows [DREAD] diagnostics on the action bar. */
  debug: boolean;
}

export const DEFAULTS: Readonly<DreadConfig> = {
  enabled: true,
  soundIntensity: 70,
  intensity: 60,
  jumpscareIntensity: 40,
  effects: "balanced",
  debug: true, // Phase-1 test builds are verbose on purpose; flip to false for release.
};

const KEY = (name: keyof DreadConfig) => `dread:${name}`;

function clampPercent(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : fallback;
}

export function readConfig(): DreadConfig {
  const enabled = world.getDynamicProperty(KEY("enabled"));
  const effects = world.getDynamicProperty(KEY("effects"));
  const debug = world.getDynamicProperty(KEY("debug"));
  return {
    enabled: typeof enabled === "boolean" ? enabled : DEFAULTS.enabled,
    soundIntensity: clampPercent(world.getDynamicProperty(KEY("soundIntensity")), DEFAULTS.soundIntensity),
    intensity: clampPercent(world.getDynamicProperty(KEY("intensity")), DEFAULTS.intensity),
    jumpscareIntensity: clampPercent(world.getDynamicProperty(KEY("jumpscareIntensity")), DEFAULTS.jumpscareIntensity),
    effects: effects === "performance" || effects === "balanced" || effects === "cinematic" ? effects : DEFAULTS.effects,
    debug: typeof debug === "boolean" ? debug : DEFAULTS.debug,
  };
}

export type SetResult = { ok: true; value: string } | { ok: false; error: string };

/** Parses and stores one setting from user text (used by /scriptevent until the settings UI lands). */
export function setConfigValue(name: string, raw: string): SetResult {
  switch (name) {
    case "enabled":
    case "debug": {
      if (raw !== "true" && raw !== "false") return { ok: false, error: `${name} must be true or false` };
      world.setDynamicProperty(KEY(name), raw === "true");
      return { ok: true, value: raw };
    }
    case "soundIntensity":
    case "intensity":
    case "jumpscareIntensity": {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, error: `${name} must be a number from 0 to 100` };
      world.setDynamicProperty(KEY(name), Math.round(n));
      return { ok: true, value: String(Math.round(n)) };
    }
    case "effects": {
      if (raw !== "performance" && raw !== "balanced" && raw !== "cinematic") {
        return { ok: false, error: "effects must be performance, balanced or cinematic" };
      }
      world.setDynamicProperty(KEY(name), raw);
      return { ok: true, value: raw };
    }
    default:
      return { ok: false, error: `unknown setting "${name}"` };
  }
}

export function resetConfig(): void {
  for (const name of Object.keys(DEFAULTS) as (keyof DreadConfig)[]) {
    world.setDynamicProperty(KEY(name), undefined);
  }
}
