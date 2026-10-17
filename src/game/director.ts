import { Player, system, world } from "@minecraft/server";
import { readConfig } from "../core/config";
import { debug, logConsole } from "../core/log";
import { DirectorBrain, freshMemory } from "../director/brain";
import { parseMemory, serializeMemory } from "../director/persistence";
import { EVENTS } from "../director/events";
import type { Action, DirectorState, Snapshot, Tactic } from "../director/types";
import { makeRng, mathRng, type Rng } from "../util/rng";
import { playAmbient } from "./ambient";
import { clearAtmosphere, setAtmosphere, shake } from "./atmosphere";
import { scanSurroundings, type Surroundings } from "./environment";
import { allPlayersNear, dimensionKind, health, isPlayerSurvivalish, safe } from "./helpers";
import { initLurkers, lurkerCount, lurkersOf, removeAll, retreatAll, spawnLurker } from "./lurkers";
import type { Requested } from "../lurker/tactics";
import { GameMode, Difficulty } from "@minecraft/server";

const MEM_KEY = (id: string) => `dread:mem:${id}`;
const STEP_TICKS = 20; // each player's brain steps about once a second
const SCAN_EVERY = 3; // seconds between environment scans per player
const SAVE_EVERY = 600; // ticks between persistence flushes

interface PlayerRt {
  brain: DirectorBrain;
  surroundings: Surroundings;
  scannedAt: number;
  lastHurtTick: number;
  respawnTick: number;
  idleSince: number;
  lastPos: { x: number; y: number; z: number };
  tactic: Requested;
  stepOffset: number;
}

const rt = new Map<string, PlayerRt>();
let rng: Rng = mathRng;
let nextOffset = 0;

export function initDirector(seed?: number): void {
  rng = seed === undefined ? mathRng : makeRng(seed);

  initLurkers({
    playerFor: (id) => world.getAllPlayers().find((p) => p.id === id),
    isLit: (id) => rt.get(id)?.surroundings.lit ?? false,
    isUnderground: (id) => !(rt.get(id)?.surroundings.skyVisible ?? true),
    requested: (id) => rt.get(id)?.tactic ?? "observe",
    onNoticed: (id) => rt.get(id)?.brain.onLurkerNoticed(worldSec()),
    onGone: (id, outcome) => rt.get(id)?.brain.onLurkerGone(worldSec(), outcome),
    onHuntEnded: (id) => rt.get(id)?.brain.onHuntEnded(worldSec(), true),
    onStress: (id, amount) => {
      const r = rt.get(id);
      if (!r) return;
      r.brain.memory.stress = Math.min(100, r.brain.memory.stress + amount);
      const p = world.getAllPlayers().find((x) => x.id === id);
      if (p && amount >= 5) shake(p, readConfig(), 0.12, 0.8); // the close moment
    },
  }, rng);

  world.afterEvents.playerSpawn.subscribe((e) => {
    const r = ensure(e.player);
    r.respawnTick = system.currentTick;
  });
  world.afterEvents.playerLeave.subscribe((e) => {
    const r = rt.get(e.playerId);
    if (r) save(e.playerId, r);
    removeAll(e.playerId);
    clearAtmosphere({ id: e.playerId });
    rt.delete(e.playerId);
  });
  world.afterEvents.entityHurt.subscribe((e) => {
    if (e.hurtEntity instanceof Player) {
      const r = rt.get(e.hurtEntity.id);
      if (r) r.lastHurtTick = system.currentTick;
    }
  });
  world.afterEvents.entityDie.subscribe((e) => {
    if (e.deadEntity instanceof Player) {
      const r = rt.get(e.deadEntity.id);
      if (!r) return;
      removeAll(e.deadEntity.id);
      r.brain.onPlayerDied(worldSec());
      r.tactic = "observe";
      logConsole(`player ${e.deadEntity.name} died; director in recovery`);
    }
  });

  system.runInterval(() => {
    const now = system.currentTick;
    for (const p of world.getAllPlayers()) {
      const r = ensure(p);
      if ((now + r.stepOffset) % STEP_TICKS !== 0) continue;
      stepPlayer(p, r, now);
    }
  }, 1);

  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      const r = rt.get(p.id);
      if (r) save(p.id, r);
    }
  }, SAVE_EVERY);
}

const worldSec = () => safe(() => world.getAbsoluteTime() / 20, system.currentTick / 20);

function ensure(p: Player): PlayerRt {
  let r = rt.get(p.id);
  if (r) return r;
  const mem = parseMemory(safe(() => world.getDynamicProperty(MEM_KEY(p.id)), undefined), worldSec());
  r = {
    brain: new DirectorBrain(mem, rng, system.currentTick / 20),
    surroundings: { lit: false, nearHome: false, skyVisible: true }, scannedAt: -1e9, lastHurtTick: -1e9,
    respawnTick: system.currentTick, idleSince: system.currentTick, lastPos: { ...p.location }, tactic: "observe",
    stepOffset: (nextOffset += 7) % STEP_TICKS,
  };
  rt.set(p.id, r);
  return r;
}

function save(id: string, r: PlayerRt): void {
  safe(() => world.setDynamicProperty(MEM_KEY(id), serializeMemory(r.brain.memory)), undefined);
}

function snapshot(p: Player, r: PlayerRt, now: number): Snapshot {
  const cfg = readConfig();
  if (now / 20 - r.scannedAt >= SCAN_EVERY) {
    r.surroundings = scanSurroundings(p);
    r.scannedAt = now / 20;
  }
  const hp = health(p);
  const moved = Math.hypot(p.location.x - r.lastPos.x, p.location.z - r.lastPos.z) > 0.5;
  if (moved) r.idleSince = now;
  r.lastPos = { ...p.location };
  const mode = safe(() => p.getGameMode(), GameMode.Survival);
  return {
    t: now / 20, worldSec: worldSec(), playerId: p.id, dimension: dimensionKind(p.dimension),
    timeOfDay: safe(() => world.getTimeOfDay(), 6000),
    gameMode: mode === GameMode.Creative ? "creative" : mode === GameMode.Spectator ? "spectator" : mode === GameMode.Adventure ? "adventure" : "survival",
    peaceful: safe(() => world.getDifficulty() === Difficulty.Peaceful, false),
    health: hp.cur, maxHealth: hp.max,
    sinceHurt: (now - r.lastHurtTick) / 20, sinceRespawn: (now - r.respawnTick) / 20,
    skyVisible: r.surroundings.skyVisible, lit: r.surroundings.lit, nearHome: r.surroundings.nearHome,
    inWater: safe(() => p.isInWater, false), sleeping: safe(() => p.isSleeping, false),
    companions: allPlayersNear(p, 48), idleFor: (now - r.idleSince) / 20,
    globalActiveLurkers: lurkerCount(), ownLurkers: lurkersOf(p.id),
    settings: { enabled: cfg.enabled, effects: cfg.effects, intensity: cfg.intensity },
  };
}

function stepPlayer(p: Player, r: PlayerRt, now: number): void {
  if (!isPlayerSurvivalish(p) && !readConfig().debug) {
    // still step so state can settle; the brain's own gate prevents hostile actions
  }
  const snap = snapshot(p, r, now);
  const actions = r.brain.step(snap);
  if (actions.length) apply(p, r, actions, snap);
  const daylight = snap.skyVisible && (snap.timeOfDay < 12500 || snap.timeOfDay > 23500);
  setAtmosphere(p, r.brain.memory.state, readConfig(), daylight);
}

function apply(p: Player, r: PlayerRt, actions: Action[], snap: Snapshot): void {
  const cfg = readConfig();
  for (const a of actions) {
    switch (a.type) {
      case "ambient":
        playAmbient(p, a, cfg, rng, r.brain.memory.stress);
        break;
      case "spawnLurker": {
        r.tactic = a.tactic;
        const ok = spawnLurker(p, a.tactic, a.minDist, a.maxDist, !snap.skyVisible);
        if (!ok) r.brain.onLurkerGone(worldSec(), "no-spot");
        break;
      }
      case "setTactic":
        r.tactic = a.tactic;
        if (a.tactic === "hunt") shake(p, cfg, 0.25, 1.5);
        break;
      case "retreatLurkers":
        r.tactic = "observe";
        retreatAll(p.id, a.reason);
        break;
      case "stress":
        r.brain.memory.stress = Math.min(100, r.brain.memory.stress + a.amount);
        break;
      case "note":
        break;
    }
  }
}

// -- debug / developer access ------------------------------------------------------------------
export function describe(p: Player): string[] {
  const r = ensure(p);
  const m = r.brain.memory;
  const recent = m.history.slice(-6).map((h) => h.id).join(", ") || "-";
  return [
    `state=${m.state} stress=${m.stress.toFixed(0)} dread=${m.dread.toFixed(0)} lit=${r.surroundings.lit} home=${r.surroundings.nearHome} sky=${r.surroundings.skyVisible}`,
    `hunts=${m.hunts} survived=${m.survivedHunts} noticed=${m.noticedCount} lurkers(own/global)=${lurkersOf(p.id)}/${lurkerCount()}`,
    `recent: ${recent}`,
  ];
}

export function debugSpawn(p: Player, tactic: Tactic): boolean {
  const r = ensure(p);
  r.tactic = tactic;
  if (tactic === "hunt") shake(p, readConfig(), 0.25, 1.5); // same cue as a director-started hunt
  return spawnLurker(p, tactic, 14, 24, !r.surroundings.skyVisible);
}

export function debugSet(p: Player, field: "stress" | "dread", value: number): void {
  const r = ensure(p);
  r.brain.memory[field] = Math.max(0, Math.min(100, value));
}

export function debugForce(p: Player, state: DirectorState): void {
  ensure(p).brain.forceState(state, worldSec(), system.currentTick / 20);
}

export function debugClear(p?: Player): number {
  return removeAll(p?.id);
}

export function debugResetMemory(p: Player): void {
  const r = ensure(p);
  Object.assign(r.brain.memory, freshMemory(worldSec()));
  debug("director memory reset");
}

export const EVENT_IDS = EVENTS.map((e) => e.id);
void [];
