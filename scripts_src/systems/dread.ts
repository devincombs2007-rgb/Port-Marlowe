import { Entity, GameMode, Player, system, Vector3, world } from "@minecraft/server";
import { isTestMode, prefs, settings } from "../core/config";
import { dreadLevel, forgetFright, setDreadReader, takeFright } from "../core/fear";
import { hint, particle, popFog, pushFog } from "../core/fx";
import { DP, ENT, FOG, PARTICLE, PROP, SND } from "../core/ids";
import { add, chance, dist, dot, norm, pick, rand, scale, sub, yawDir, yawOf } from "../core/math";
import { ctx, huntable, isNewcomer, rt } from "../core/players";
import { everyPlayer, later, safe } from "../core/scheduler";
import { getNum, setNum } from "../core/store";
import { hollowDay, hollowNight, isDarkHours, now } from "../core/time";
import { clearLine, groundNear, hasBlockNear, holdingLight, inLitArea, nearbyPlayers } from "../core/world";
import { lanternNear } from "../items/blocks";
import { emitNoise } from "./noise";
import { unlock } from "./journal";

// DREAD
// A per-player fear meter (0..100) that responds to where the player is and what has happened.
//
//   Rises toward a target set by the surroundings: night, darkness, being underground, being
//   alone, low health, deep woods and swamps after dark. Creatures add sudden spikes (core/fear).
//   Falls toward calm with daylight, a light in hand, placed light, a roof, a campfire, company,
//   a Heartwood Lantern, sleep, and Hearth Tea (which also steadies the nerves for two minutes).
//
// Stages: Calm < 25 <= Uneasy < 50 <= Frightened < 75 <= Terrified (with hysteresis).
//   Uneasy      a quiet warning on the action bar; the journal explains Dread.
//   Frightened  heartbeat episodes; the dark closes in (fog, Visual effects permitting);
//               hallucinations become possible.
//   Terrified   a racing heart and ragged breathing; more hallucinations; and the Hollowed can
//               hear your heart from a few blocks away.
// Fear is also a lure: above 40 every natural encounter becomes somewhat likelier (core/fear).
//
// Hallucinations (Frightened+, rare, per-player cooldown) are visible or audible to the one
// frightened player only. Phantoms use a per-player property override, so friends standing next
// to you see nothing. A phantom is never solid, never hurts, and vanishes when looked at straight.

const STAGE_NAMES = ["Calm", "Uneasy", "Frightened", "Terrified"] as const;
const UP = [25, 50, 75];
const HYST = 5;
const PERIOD = 40;

interface DreadState {
  v: number;
  stage: number;
  steadyUntil: number;
  nextHallucination: number;
  episodeUntil: number;
  nextEpisode: number;
  saveIn: number;
  fog: boolean;
  reasons: string[];
  hallucinating: boolean;
}

const states = new Map<string, DreadState>();

function st(p: Player): DreadState {
  let s = states.get(p.id);
  if (!s) {
    const saved = getNum(p, DP.dread, 0);
    s = {
      v: Math.max(0, Math.min(100, Number.isFinite(saved) ? saved : 0)), stage: 0, steadyUntil: -1,
      nextHallucination: now() + 2400, episodeUntil: -1, nextEpisode: -1, saveIn: 5, fog: false, reasons: [],
      hallucinating: false,
    };
    s.stage = stageFor(s.v, 0);
    states.set(p.id, s);
  }
  return s;
}

function stageFor(v: number, current: number): number {
  let stage = current;
  while (stage < 3 && v >= UP[stage]) stage++;
  while (stage > 0 && v < UP[stage - 1] - HYST) stage--;
  return stage;
}

export function dreadOf(p: Player): number {
  return states.get(p.id)?.v ?? 0;
}

export function dreadStageName(p: Player): string {
  return STAGE_NAMES[states.get(p.id)?.stage ?? 0];
}

/** Short human-readable list of what is pushing fear up or down right now (Field Conditions). */
export function dreadReasons(p: Player): string[] {
  return states.get(p.id)?.reasons ?? [];
}

export function forgetDread(playerId: string): void {
  states.delete(playerId);
  forgetFright(playerId);
  for (const [id, ph] of phantoms) if (ph.playerId === playerId) removePhantom(id, false);
}

/** After death: fear does not follow you into the respawn. */
export function resetDread(p: Player): void {
  const s = st(p);
  s.v = 0;
  s.stage = 0;
  s.episodeUntil = -1;
  setFog(p, s, false);
  setNum(p, DP.dread, 0);
}

function enabledFor(p: Player): boolean {
  if (!settings().dread || !huntable(p)) return false;
  if (isNewcomer(p) && !isTestMode()) return false;
  try {
    const gm = p.getGameMode();
    return gm === GameMode.Survival || gm === GameMode.Adventure;
  } catch {
    return false;
  }
}

/** Where fear settles if nothing else happens, plus the reasons (for the Field Conditions page). */
function target(p: Player, reasons: string[]): number {
  const c = ctx(p);
  const dark = isDarkHours();
  let t = 4;
  const lit = holdingLight(p);
  const placed = inLitArea(p, 6);
  if (c.underground) {
    t = 30;
    let block = 15;
    try {
      block = p.dimension.getLightLevel(p.getHeadLocation());
    } catch {
      /* unloaded */
    }
    if (block < 7 && !lit) {
      t += 22;
      reasons.push("+ darkness underground");
    } else reasons.push("+ deep underground");
  } else if (dark && c.overworld) {
    t = 28;
    if (c.biome === "forest" || c.biome === "swamp") {
      t += 14;
      reasons.push(c.biome === "forest" ? "+ the woods at night" : "+ the swamp at night");
    } else reasons.push("+ night");
    if (!lit && !placed) {
      t += 14;
      reasons.push("+ no light");
    }
  }
  if (c.inWater && dark) {
    t += 8;
    reasons.push("+ dark water");
  }
  const company = nearbyPlayers(p.dimension, p.location, 16).filter((o) => o.id !== p.id).length;
  if (company > 0) {
    t -= 16;
    reasons.push("- company");
  } else if (t > 10) {
    t += 8;
    reasons.push("+ alone");
  }
  try {
    const hp = p.getComponent("minecraft:health")?.currentValue ?? 20;
    if (hp <= 6) {
      t += 14;
      reasons.push("+ badly hurt");
    }
  } catch {
    /* ignore */
  }
  if (lit && t > 8) {
    t -= 14;
    reasons.push("- light in hand");
  }
  if (placed && (c.roofed || c.underground) && t > 8) {
    t -= 14;
    reasons.push("- lit shelter");
  } else if (placed && t > 8) {
    t -= 8;
    reasons.push("- placed light");
  }
  if (t > 6 && hasBlockNear(p.dimension, p.location, ["minecraft:campfire", "minecraft:soul_campfire"], 5, 2, 5)) {
    t -= 18;
    reasons.push("- campfire");
  }
  if (lanternNear(p.dimension, p.location)) {
    t = Math.min(t, 6);
    reasons.push("- Heartwood Lantern");
  }
  if (p.isSleeping) {
    t = 0;
    reasons.push("- sleep");
  }
  return Math.max(0, Math.min(100, t));
}

function setFog(p: Player, s: DreadState, on: boolean): void {
  const want = on && prefs(p).dreadFx;
  if (want === s.fog) return;
  s.fog = want;
  if (want) pushFog(p, FOG.dread, "hollow_dread");
  else popFog(p, "hollow_dread");
}

function personal(p: Player, sound: string, volume: number, pitch = 1, at?: Vector3): void {
  const pr = prefs(p);
  if (!pr.dreadFx) return;
  try {
    p.playSound(sound, { location: at, volume: volume * Math.max(0.25, pr.ambience / 100), pitch });
  } catch {
    /* left */
  }
}

/** Heartbeats inside this update window (2 s). Frightened: 10 s episodes every ~30 s;
 * Terrified: continuous and faster. */
function heartbeat(p: Player, s: DreadState): void {
  if (s.stage < 2 || p.isSleeping) return;
  const t = now();
  if (s.stage === 2) {
    if (t >= s.nextEpisode && t >= s.episodeUntil) {
      s.episodeUntil = t + 200;
      s.nextEpisode = t + 200 + Math.round(rand(300, 600));
    }
    if (t >= s.episodeUntil) return;
  }
  const interval = s.stage === 3 ? 13 : 19;
  const vol = s.stage === 3 ? 0.75 : 0.5;
  for (let k = 0; k * interval < PERIOD; k++) {
    later("dread.beat", 1 + k * interval, () => {
      if (!p.isValid || (states.get(p.id)?.stage ?? 0) < 2) return;
      personal(p, SND.heartbeat, vol, s.stage === 3 ? 1.08 : 1);
    });
  }
  if (s.stage === 3 && chance(0.22)) later("dread.breath", 10, () => p.isValid && personal(p, SND.breath, 0.6));
}

function onStageChange(p: Player, s: DreadState, from: number): void {
  if (s.stage > from) {
    if (s.stage >= 1) {
      unlock(p, "dread1");
      unlock(p, "craft_tea", true);
    }
    if (s.stage === 1) hint(p, "§8Something feels wrong.");
    if (s.stage === 2) hint(p, "§8Your heart is pounding. The dark is closing in.");
    if (s.stage === 3) hint(p, "§8You can't stop shaking. Find light. Find people.");
  } else if (s.stage === 0) {
    hint(p, "§8Your breathing slows.");
  }
  setFog(p, s, s.stage >= 2 && prefs(p).visualFx);
}

function update(p: Player): void {
  const s = st(p);
  const spike = takeFright(p.id);
  if (!enabledFor(p)) {
    if (s.v > 0 || s.stage > 0) {
      s.v = Math.max(0, s.v - 6);
      const from = s.stage;
      s.stage = stageFor(s.v, s.stage);
      if (s.stage !== from) onStageChange(p, s, from);
      setNum(p, DP.dread, Math.round(s.v));
    }
    setFog(p, s, false);
    return;
  }
  const reasons: string[] = [];
  const goal = target(p, reasons);
  s.reasons = reasons;
  const steady = now() < s.steadyUntil;
  if (spike) s.v += steady ? spike * 0.5 : spike;
  const rate = goal > s.v ? 0.05 : p.isSleeping ? 0.35 : 0.09;
  s.v += (goal - s.v) * rate;
  if (steady) s.v = Math.min(s.v, 30);
  s.v = Math.max(0, Math.min(100, s.v));
  const from = s.stage;
  s.stage = stageFor(s.v, s.stage);
  if (s.stage !== from) onStageChange(p, s, from);
  else setFog(p, s, s.stage >= 2 && prefs(p).visualFx);
  heartbeat(p, s);
  // A racing heart is audible to the blind hunters: a 4-block noise around the player.
  if (s.stage === 3 && ctx(p).underground) {
    emitNoise({ dim: p.dimension, at: p.location, radius: 4, kind: "move", source: p });
  }
  maybeHallucinate(p, s);
  if (--s.saveIn <= 0) {
    s.saveIn = 5;
    setNum(p, DP.dread, Math.round(s.v));
  }
}

// ------------------------------------------------------------------------- Hearth Tea

export function drinkTea(p: Player): void {
  const s = st(p);
  s.v = Math.max(0, s.v - 45);
  s.steadyUntil = now() + 2400;
  const from = s.stage;
  s.stage = stageFor(s.v, s.stage);
  if (s.stage !== from) onStageChange(p, s, from);
  try {
    p.playSound(SND.teaSip, { volume: 0.8 });
  } catch {
    /* left */
  }
  hint(p, "§7Warmth spreads through your chest. Your hands are steady.");
}

// ------------------------------------------------------------------------- hallucinations

type Hallucination = "phantom" | "steps" | "whisper" | "knock";

interface Phantom {
  playerId: string;
  dim: string;
  born: number;
  form: number;
}

const phantoms = new Map<string, Phantom>();

export function isPhantomTracked(id: string): boolean {
  return phantoms.has(id);
}

export function phantomCount(): number {
  return phantoms.size;
}

function maybeHallucinate(p: Player, s: DreadState): void {
  if (s.stage < 2 || s.hallucinating || !prefs(p).dreadFx) return;
  const t = now();
  if (t < s.nextHallucination) return;
  if (rt(p).encounter || hollowDay() < settings().graceDays) return;
  const c = ctx(p);
  if (!c.overworld) return;
  if (!chance(s.stage === 3 ? 0.16 : 0.08)) return;
  const options: Hallucination[] = ["steps", "whisper"];
  if (c.underground || (isDarkHours() && !c.roofed)) options.push("phantom", "phantom");
  if (c.roofed && isDarkHours() && settings().knocker && hollowNight() >= settings().knockerNight) options.push("knock");
  const kind = pick(options);
  const ok = kind === "phantom" ? spawnPhantom(p, c.underground) : kind === "steps" ? followSteps(p, s) :
    kind === "whisper" ? whisper(p) : falseKnock(p);
  if (ok) s.nextHallucination = t + Math.round(rand(2400, 5400) * (s.stage === 3 ? 0.6 : 1));
}

function behind(p: Player, d: number): Vector3 {
  const v = p.getViewDirection();
  const flat = norm({ x: v.x, y: 0, z: v.z });
  return add(p.location, add(scale(flat, -d), { x: 0, y: 0.2, z: 0 }));
}

/** Footsteps behind you that only move when you do, then stop when you stop. */
function followSteps(p: Player, s: DreadState): boolean {
  const c = ctx(p);
  const sound = c.underground ? SND.stepClaws : c.roofed ? SND.stepHeavy : SND.stepLeaves;
  s.hallucinating = true;
  let last = { ...p.location };
  let played = 0;
  for (let k = 1; k <= 10; k++) {
    later("dread.steps", k * 9, () => {
      if (!p.isValid) return;
      const moved = dist(last, p.location) > 0.6;
      last = { ...p.location };
      if (moved && played < 6) {
        played++;
        personal(p, sound, 0.55, rand(0.85, 0.95), behind(p, rand(5, 7)));
      }
      if (k === 10) {
        s.hallucinating = false;
        if (played >= 2) unlock(p, "dread2");
      }
    });
  }
  return true;
}

function whisper(p: Player): boolean {
  personal(p, SND.whisper, 0.45, rand(0.9, 1.05), behind(p, 1.6));
  later("dread.whisper", 60, () => p.isValid && unlock(p, "dread2"));
  return true;
}

function falseKnock(p: Player): boolean {
  const d = yawDir(rand(0, 360));
  personal(p, SND.bedtimeKnock, 0.7, 0.95, add(p.location, scale(d, 6)));
  return true;
}

const FORM_WATCHER = 0, FORM_HOLLOWED = 1, FORM_KNOCKER = 2;

/** A figure at the edge of your vision. It is gone when you look straight at it. */
function spawnPhantom(p: Player, underground: boolean): boolean {
  if (phantoms.size >= 8) return false;
  const dim = p.dimension;
  const view = p.getViewDirection();
  const yaw = yawOf(norm({ x: view.x, y: 0, z: view.z }));
  const form = underground ? FORM_HOLLOWED : ctx(p).biome === "forest" ? FORM_WATCHER : pick([FORM_WATCHER, FORM_KNOCKER]);
  const head = p.getHeadLocation();
  for (let attempt = 0; attempt < 6; attempt++) {
    const side = chance(0.5) ? 1 : -1;
    const dir = yawDir(yaw + side * rand(38, 58));
    const r = underground ? rand(10, 18) : rand(22, 34);
    const guess = add(p.location, scale(dir, r));
    const g = groundNear(dim, guess.x, p.location.y, guess.z, underground ? 4 : 8, form === FORM_HOLLOWED ? 2 : 3);
    if (!g) continue;
    const eye = add(g, { x: 0, y: form === FORM_HOLLOWED ? 0.6 : 2.2, z: 0 });
    if (!clearLine(dim, head, eye)) continue;
    let e: Entity | undefined;
    try {
      e = dim.spawnEntity(ENT.phantom, g);
    } catch {
      return false;
    }
    if (!e) return false;
    try {
      e.setProperty(PROP.form, form);
      e.setRotation({ x: 0, y: yawOf(norm(sub(p.location, g))) });
      p.setPropertyOverrideForEntity(e, PROP.visible, true);
    } catch {
      try {
        e.remove();
      } catch {
        /* gone */
      }
      return false;
    }
    phantoms.set(e.id, { playerId: p.id, dim: dim.id, born: now(), form });
    return true;
  }
  return false;
}

function removePhantom(id: string, seen: boolean): void {
  const ph = phantoms.get(id);
  phantoms.delete(id);
  const e = world.getEntity(id);
  if (!e || !e.isValid) return;
  if (seen && ph) {
    const p = world.getAllPlayers().find((o) => o.id === ph.playerId);
    if (p) {
      personal(p, SND.vanish, 0.7, 1, e.location);
      particle(e.dimension, PARTICLE.shed, add(e.location, { x: 0, y: ph.form === FORM_HOLLOWED ? 0.5 : 1.6, z: 0 }));
      unlock(p, "dread2");
    }
  }
  try {
    e.remove();
  } catch {
    /* gone */
  }
}

function observedBy(p: Player, e: Entity, form: number): boolean {
  const head = p.getHeadLocation();
  const at = add(e.location, { x: 0, y: form === FORM_HOLLOWED ? 0.5 : 1.8, z: 0 });
  const to = sub(at, head);
  const d = Math.max(0.001, Math.hypot(to.x, to.y, to.z));
  const cos = dot(norm(p.getViewDirection()), scale(to, 1 / d));
  return cos > Math.cos((Math.max(9, Math.atan(1.2 / d) * 180 / Math.PI) * Math.PI) / 180);
}

function tickPhantoms(): void {
  const t = now();
  for (const [id, ph] of phantoms) {
    const e = world.getEntity(id);
    const p = world.getAllPlayers().find((o) => o.id === ph.playerId);
    if (!e || !e.isValid || !p || !p.isValid || p.dimension.id !== ph.dim) {
      removePhantom(id, false);
      continue;
    }
    const d = dist(p.location, e.location);
    if (observedBy(p, e, ph.form) || d < 9) removePhantom(id, true);
    else if (t - ph.born > 240 || d > 64) removePhantom(id, false);
  }
}

// ------------------------------------------------------------------------- startup

export function startDread(): void {
  setDreadReader((p) => (settings().dread ? dreadOf(p) : 0));
  everyPlayer("dread", PERIOD, update);
  system.runInterval(() => safe("dread.phantoms", tickPhantoms), 4);
  // Leftover phantoms from a previous session are removed by cleanup (untracked on load).
}

/** Test kit: set a player's Dread directly (0..100). */
export function setDread(p: Player, v: number): string {
  const s = st(p);
  s.v = Math.max(0, Math.min(100, v));
  const from = s.stage;
  s.stage = stageFor(s.v, s.stage);
  if (s.stage !== from) onStageChange(p, s, from);
  return `dread ${Math.round(s.v)} (${STAGE_NAMES[s.stage]})`;
}

/** Test kit: a phantom at the edge of this player's vision, now. */
export function forcePhantom(p: Player): string {
  return spawnPhantom(p, ctx(p).underground) ? "a phantom stands at the edge of your vision" : "no spot in view for a phantom";
}

/** For tests and the status command. */
export function dreadSummary(): string {
  const parts: string[] = [];
  for (const p of world.getAllPlayers()) parts.push(`${p.name}:${Math.round(dreadLevel(p))}`);
  return parts.join(" ") || "-";
}
