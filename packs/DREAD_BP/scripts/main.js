// src/main.ts
import { system as system7, world as world8 } from "@minecraft/server";

// src/core/commands.ts
import { Player as Player7, system as system6, world as world7 } from "@minecraft/server";

// src/core/constants.ts
var ADDON_VERSION = "0.2.1";
var BUILD_STAGE = "phase-2-3-lurker-director";

// src/core/config.ts
import { world } from "@minecraft/server";
var DEFAULTS = {
  enabled: true,
  soundIntensity: 70,
  intensity: 60,
  jumpscareIntensity: 40,
  effects: "balanced",
  debug: true
  // Phase-1 test builds are verbose on purpose; flip to false for release.
};
var KEY = (name) => `dread:${name}`;
function clampPercent(v, fallback) {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : fallback;
}
function readConfig() {
  const enabled = world.getDynamicProperty(KEY("enabled"));
  const effects = world.getDynamicProperty(KEY("effects"));
  const debug2 = world.getDynamicProperty(KEY("debug"));
  return {
    enabled: typeof enabled === "boolean" ? enabled : DEFAULTS.enabled,
    soundIntensity: clampPercent(world.getDynamicProperty(KEY("soundIntensity")), DEFAULTS.soundIntensity),
    intensity: clampPercent(world.getDynamicProperty(KEY("intensity")), DEFAULTS.intensity),
    jumpscareIntensity: clampPercent(world.getDynamicProperty(KEY("jumpscareIntensity")), DEFAULTS.jumpscareIntensity),
    effects: effects === "performance" || effects === "balanced" || effects === "cinematic" ? effects : DEFAULTS.effects,
    debug: typeof debug2 === "boolean" ? debug2 : DEFAULTS.debug
  };
}
function setConfigValue(name, raw) {
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
function resetConfig() {
  for (const name of Object.keys(DEFAULTS)) {
    world.setDynamicProperty(KEY(name), void 0);
  }
}

// src/core/log.ts
import { world as world2 } from "@minecraft/server";
var PREFIX = "\xA78[\xA74DREAD\xA78]\xA7r ";
function logConsole(message) {
  console.warn(`[DREAD] ${message}`);
}
function tell(message, target) {
  const text = PREFIX + message;
  if (target) target.sendMessage(text);
  else world2.sendMessage(text);
}
function debug(message) {
  logConsole(message);
  if (readConfig().debug) world2.sendMessage(PREFIX + "\xA77" + message);
}

// src/core/soundtest.ts
import { system } from "@minecraft/server";
var LURKER_EVENTS = [
  "breath_idle",
  "breath_alert",
  "step",
  "step_stalk",
  "joint_creak",
  "head_turn",
  "notice",
  "vanish",
  "scrape",
  "hurt",
  "death",
  "attack_swipe",
  "attack_hit",
  "chase_vocal"
];
var AMBIENT_EVENTS = [
  "branch_snap",
  "leaves_rustle",
  "door_creak",
  "structure_groan",
  "drag",
  "murmur",
  "distant_cry",
  "heartbeat",
  "pressure_drop",
  "footsteps_far"
];
var GAUNT_EVENTS = ["step", "breath", "sniff", "vocal", "attack", "hurt", "death", "burrow", "claw_scrape"];
function ringPosition(player, step) {
  const view = player.getViewDirection();
  const base = Math.atan2(-view.z, -view.x);
  const angle = base + step * (Math.PI / 3);
  const dist = 6;
  return { x: player.location.x + Math.cos(angle) * dist, y: player.location.y + 1, z: player.location.z + Math.sin(angle) * dist };
}
function playSoundTest(player, arg) {
  if (!player) return;
  const ids = arg === "all" || arg === "" ? LURKER_EVENTS.map((n) => `dread.lurker.${n}`) : arg === "ambient" ? AMBIENT_EVENTS.map((n) => `dread.ambient.${n}`) : arg === "gaunt" ? GAUNT_EVENTS.map((n) => `dread.gaunt.${n}`) : arg.split(/\s+/).flatMap((n) => LURKER_EVENTS.includes(n) ? [`dread.lurker.${n}`] : AMBIENT_EVENTS.includes(n) ? [`dread.ambient.${n}`] : []);
  if (ids.length === 0) {
    tell(`Usage: dread:sound all | ambient | gaunt | <${[...LURKER_EVENTS, ...AMBIENT_EVENTS].join("|")}>`, player);
    return;
  }
  tell(`Playing ${ids.length} sound(s), 3 s apart, circling you from behind.`, player);
  ids.forEach((id, i) => {
    system.runTimeout(() => {
      if (!player.isValid) return;
      const location = ringPosition(player, i);
      player.playSound(id, { location, volume: 1, pitch: 1 });
      tell(`\xA77${id.replace("dread.", "")}`, player);
    }, i * 60);
  });
}

// src/game/director.ts
import { Player as Player6, system as system5, world as world6 } from "@minecraft/server";

// src/util/rng.ts
function makeRng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  };
}
var mathRng = { next: () => Math.random() };
function range(rng3, lo, hi) {
  return lo + (hi - lo) * rng3.next();
}
function chance(rng3, p) {
  return rng3.next() < p;
}
function pickWeighted(rng3, items, weight) {
  let total = 0;
  const weights = items.map((i) => {
    const w = Math.max(0, weight(i));
    total += w;
    return w;
  });
  if (total <= 0) return void 0;
  let roll = rng3.next() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// src/director/events.ts
var night = (s) => s.timeOfDay >= 13e3 && s.timeOfDay < 23e3;
var alone = (s) => s.companions === 0;
var outdoors = (s) => s.skyVisible;
var pickBearing = (rng3, list) => list[Math.floor(rng3.next() * list.length)];
var amb = (kind, bearing, distance, volume) => ({ type: "ambient", kind, bearing, distance, volume });
var UNEASE_PLUS = ["unease", "observation", "escalation"];
var NEAR_STATES = ["observation", "escalation"];
var EVENTS = [
  {
    id: "snap_behind",
    states: UNEASE_PLUS,
    cooldown: 70,
    weight: (s) => (outdoors(s) ? 3 : 1) * (night(s) ? 1.4 : 0.8),
    build: (rng3) => [amb("branch_snap", "behind", range(rng3, 12, 24), 0.9)]
  },
  {
    id: "rustle_side",
    states: UNEASE_PLUS,
    cooldown: 60,
    weight: (s) => outdoors(s) ? 2.6 : 0,
    build: (rng3) => [amb("leaves_rustle", pickBearing(rng3, ["left", "right"]), range(rng3, 7, 15), 0.8)]
  },
  {
    id: "door_far",
    states: UNEASE_PLUS,
    cooldown: 110,
    weight: (s) => alone(s) ? 1.6 : 0.5,
    build: (rng3) => [amb("door_creak", pickBearing(rng3, ["around", "front_far", "behind"]), range(rng3, 16, 30), 0.8)]
  },
  {
    id: "groan",
    states: UNEASE_PLUS,
    cooldown: 120,
    weight: (s) => outdoors(s) ? 0.5 : 3.2,
    build: (rng3) => [amb("structure_groan", "around", range(rng3, 14, 28), 0.8)]
  },
  {
    id: "drag",
    states: UNEASE_PLUS,
    cooldown: 150,
    weight: (s, st) => st >= 25 ? 1.6 : 0.4,
    build: (rng3) => [amb("drag", pickBearing(rng3, ["behind", "left", "right"]), range(rng3, 14, 26), 0.8)]
  },
  {
    id: "murmur",
    states: UNEASE_PLUS,
    cooldown: 160,
    weight: (s, st) => st >= 35 ? alone(s) ? 2.4 : 1 : 0,
    build: (rng3) => [amb("murmur", pickBearing(rng3, ["behind", "around"]), range(rng3, 10, 22), 0.55)]
  },
  {
    id: "cry_far",
    states: UNEASE_PLUS,
    cooldown: 200,
    weight: (s, st) => st >= 20 && outdoors(s) && night(s) ? 1.6 : 0,
    build: (rng3) => [amb("distant_cry", "front_far", range(rng3, 36, 60), 0.5)]
  },
  {
    id: "steps_far",
    states: UNEASE_PLUS,
    cooldown: 90,
    weight: (s, st) => st >= 15 && alone(s) ? 2.2 : 0.5,
    build: (rng3) => [amb("footsteps_far", pickBearing(rng3, ["behind", "around"]), range(rng3, 18, 32), 0.7)]
  },
  {
    id: "heartbeat",
    states: ["escalation", "observation"],
    cooldown: 120,
    weight: (_s, st) => st >= 55 ? 2 : 0,
    build: () => [amb("heartbeat", "around", 1, 0.75), { type: "stress", amount: 1.5 }]
  },
  {
    id: "lurker_breath",
    states: NEAR_STATES,
    cooldown: 80,
    weight: (_s, st, act) => st >= 40 && act !== "gaunt" ? 2 : 0,
    build: (rng3) => [amb("lurker_breath", "behind", range(rng3, 4, 8), 0.8)]
  },
  {
    id: "lurker_creak",
    states: NEAR_STATES,
    cooldown: 90,
    weight: (_s, st, act) => st >= 35 && act !== "gaunt" ? 1.6 : 0,
    build: (rng3) => [amb("lurker_creak", pickBearing(rng3, ["left", "right", "behind"]), range(rng3, 6, 12), 0.8)]
  },
  {
    id: "lurker_scrape",
    states: NEAR_STATES,
    cooldown: 130,
    weight: (s, _st, act) => act === "gaunt" ? 0 : outdoors(s) ? 1.8 : 1,
    build: (rng3) => [amb("lurker_scrape", pickBearing(rng3, ["left", "right", "front_far"]), range(rng3, 9, 16), 0.8)]
  },
  {
    id: "lurker_steps",
    states: ["escalation"],
    cooldown: 75,
    weight: (_s, st, act) => st >= 45 && act !== "gaunt" ? 2.2 : 0,
    build: (rng3) => [amb("lurker_step", "behind", range(rng3, 6, 12), 0.7), chance(rng3, 0.5) ? amb("lurker_step", "behind", range(rng3, 5, 9), 0.7) : { type: "note", text: "single step" }]
  },
  {
    id: "gaunt_scrape",
    states: ["escalation"],
    cooldown: 70,
    weight: (s, _st, act) => act === "gaunt" ? s.skyVisible ? 1.6 : 2.6 : 0,
    build: (rng3) => [amb("gaunt_scrape", pickBearing(rng3, ["behind", "left", "right"]), range(rng3, 10, 20), 0.8)]
  },
  {
    id: "gaunt_sniff",
    states: ["escalation"],
    cooldown: 60,
    weight: (_s, st, act) => act === "gaunt" && st >= 35 ? 2.4 : 0,
    build: (rng3) => [amb("gaunt_sniff", "behind", range(rng3, 8, 16), 0.9)]
  }
];
function repetitionFactor(id, history, worldSec2) {
  let recent = 0;
  for (let i = history.length - 1, seen = 0; i >= 0 && seen < 8; i--, seen++) {
    const h = history[i];
    if (h.id === id && worldSec2 - h.worldSec < 1800) recent++;
  }
  return 1 / (1 + 2.5 * recent);
}

// src/director/stress.ts
function stressTarget(s) {
  if (s.gameMode === "creative" || s.gameMode === "spectator") return 0;
  let target = 8;
  const night3 = s.timeOfDay >= 13e3 && s.timeOfDay < 23e3;
  if (!s.skyVisible) target += 22;
  else if (night3) target += 18;
  else target -= 8;
  if (s.companions === 0) target += 12;
  else if (s.companions >= 2) target -= 10;
  else target -= 4;
  const hp = s.maxHealth > 0 ? s.health / s.maxHealth : 1;
  if (hp < 0.3) target += 18;
  else if (hp < 0.5) target += 10;
  if (s.sinceHurt < 25) target += 15 * (1 - s.sinceHurt / 25);
  if (s.lit) target *= 0.6;
  if (s.nearHome) target -= 25;
  if (s.sleeping) target = Math.min(target, 5);
  return clamp(target, 0, 100);
}
function updateStress(prev, s, dt, pulse = 0) {
  const target = stressTarget(s);
  const calm = s.lit || s.nearHome || s.sleeping;
  const rate = target > prev ? 0.03 : calm ? 0.12 : 0.06;
  const next = prev + (target - prev) * (1 - Math.exp(-rate * dt)) + pulse;
  return clamp(next, 0, 100);
}

// src/director/brain.ts
var TUNING = {
  // seconds
  huntCooldown: 1500,
  // min gap between hunts for one player
  deathGrace: 1200,
  // no hunts/escalation after a death
  respawnGrace: 180,
  // no hostile encounters right after respawning
  maxHuntSeconds: 90,
  huntMinHealth: 10,
  // half-hearts (5 hearts)
  huntAbortHealth: 6,
  historyCap: 40,
  globalLurkerCap: 3
};
function freshMemory(worldSec2) {
  return {
    v: 1,
    state: "dormant",
    stateSince: worldSec2,
    history: [],
    hunts: 0,
    noticedCount: 0,
    survivedHunts: 0,
    lastHuntEnd: -1e9,
    lastDeath: -1e9,
    stress: 10,
    dread: 0
  };
}
var night2 = (s) => s.timeOfDay >= 13e3 && s.timeOfDay < 23e3;
var pace = (s) => {
  const i = clamp(s.settings.intensity, 0, 100) / 100;
  const fx = s.settings.effects === "performance" ? 0.75 : s.settings.effects === "cinematic" ? 1.1 : 1;
  return (0.35 + 1.05 * i) * fx;
};
function blockedReason(s, m, forHunt) {
  if (!s.settings.enabled) return "disabled";
  if (s.gameMode !== "survival" && s.gameMode !== "adventure") return "gamemode";
  if (s.dimension !== "overworld") return "dimension";
  if (s.peaceful) return "peaceful";
  if (s.sleeping) return "sleeping";
  if (s.sinceRespawn < TUNING.respawnGrace) return "respawn-grace";
  if (forHunt) {
    if (s.worldSec - m.lastDeath < TUNING.deathGrace) return "death-grace";
    if (s.worldSec - m.lastHuntEnd < TUNING.huntCooldown) return "hunt-cooldown";
    if (s.health < TUNING.huntMinHealth) return "low-health";
    if (s.lit || s.nearHome) return "safe-place";
    if (s.inWater) return "water";
    if (s.companions >= 2) return "group";
  }
  return void 0;
}
var DirectorBrain = class {
  memory;
  rng;
  tm;
  constructor(memory, rng3, nowT = 0) {
    this.memory = memory;
    this.rng = rng3;
    if (memory.state === "observation" || memory.state === "escalation" || memory.state === "hunt") memory.state = "recovery";
    this.tm = {
      stateEndsAt: nowT + this.durationFor(memory.state, nowT),
      nextCheckAt: nowT + 5,
      nextEventAt: nowT + 20,
      lastEvent: /* @__PURE__ */ new Map(),
      huntStartedAt: 0,
      observationSpawns: 0,
      noticedThisPhase: 0,
      respawnLurkerAt: 0,
      pendingHuntRetreat: false,
      lastTickT: nowT
    };
  }
  // -- adapter feedback ---------------------------------------------------------------------
  onLurkerNoticed(worldSec2) {
    this.memory.noticedCount++;
    this.tm.noticedThisPhase++;
    this.log("noticed", worldSec2);
    this.memory.stress = clamp(this.memory.stress + 6, 0, 100);
    this.memory.dread = clamp(this.memory.dread + 10, 0, 100);
  }
  onLurkerGone(worldSec2, reason) {
    this.log(`lurker_gone:${reason}`, worldSec2);
    if (this.memory.state === "observation" && reason === "noticed" && this.tm.observationSpawns < 3) {
      this.tm.respawnLurkerAt = this.tm.lastTickT + range(this.rng, 25, 75);
    }
  }
  onPlayerDied(worldSec2) {
    this.memory.lastDeath = worldSec2;
    this.memory.stress = 30;
    this.memory.dread = 0;
    this.enter("recovery", worldSec2, this.tm.lastTickT, range(this.rng, 900, 1500));
  }
  onHuntEnded(worldSec2, survived) {
    this.memory.lastHuntEnd = worldSec2;
    if (survived) this.memory.survivedHunts++;
    this.memory.dread *= 0.2;
    this.log(survived ? "hunt_survived" : "hunt_failed", worldSec2);
    if (this.memory.state === "hunt") this.enter("recovery", worldSec2, this.tm.lastTickT, range(this.rng, 480, 900));
  }
  /** Developer override (commands/tests): jump straight to a state. Hostile states still obey step() safety gates. */
  forceState(state, worldSec2, t) {
    this.enter(state, worldSec2, t);
    if (state === "hunt") this.tm.huntStartedAt = t;
  }
  // -- main step ----------------------------------------------------------------------------
  step(s) {
    const out = [];
    if (s.ownCreatures === 0 && this.memory.state !== "observation" && this.memory.state !== "escalation" && this.memory.state !== "hunt") this.tm.active = void 0;
    const dt = clamp(s.t - this.tm.lastTickT, 0, 30);
    this.tm.lastTickT = s.t;
    this.memory.stress = updateStress(this.memory.stress, s, dt);
    const calm = this.memory.state === "recovery" || s.lit || s.nearHome;
    this.memory.dread *= Math.exp(-dt / (calm ? 90 : 260));
    if (this.memory.state === "escalation" && s.ownCreatures > 0) this.memory.dread = Math.min(100, this.memory.dread + 0.6 * dt);
    const block = blockedReason(s, this.memory, false);
    if (block) {
      if (this.memory.state !== "dormant" && this.memory.state !== "recovery") {
        if (block !== "sleeping") out.push({ type: "retreatLurkers", reason: block });
        this.enter("recovery", s.worldSec, s.t, range(this.rng, 120, 240));
      }
      return out;
    }
    this.dispatch(s, out);
    for (const a of out) if (a.type === "spawnCreature") this.tm.active = a.creature;
    return out;
  }
  dispatch(s, out) {
    switch (this.memory.state) {
      case "dormant":
        this.stepDormant(s, out);
        break;
      case "unease":
        this.stepUnease(s, out);
        break;
      case "observation":
        this.stepObservation(s, out);
        break;
      case "escalation":
        this.stepEscalation(s, out);
        break;
      case "hunt":
        this.stepHunt(s, out);
        break;
      case "recovery":
        this.stepRecovery(s, out);
        break;
    }
  }
  // -- states -------------------------------------------------------------------------------
  stepDormant(s, out) {
    if (s.t < this.tm.stateEndsAt || s.t < this.tm.nextCheckAt) return;
    this.tm.nextCheckAt = s.t + 10;
    if (s.nearHome && s.lit) {
      this.tm.stateEndsAt = s.t + 30;
      return;
    }
    const p = (0.12 + this.memory.stress * 6e-3) * pace(s);
    if (chance(this.rng, p)) this.enter("unease", s.worldSec, s.t);
    void out;
  }
  stepUnease(s, out) {
    this.ambientTick(s, out);
    if (s.t < this.tm.nextCheckAt) return;
    this.tm.nextCheckAt = s.t + 10;
    const age = s.t - (this.tm.stateEndsAt - this.durationFor("unease", s.t));
    const dark = night2(s) || !s.skyVisible;
    const eligible = dark && this.memory.stress >= 25 && s.companions <= 1 && !blockedReason(s, this.memory, false) && s.globalActiveCreatures < TUNING.globalLurkerCap;
    if (age > 120 && eligible && chance(this.rng, 0.17 * pace(s))) {
      if (chance(this.rng, 0.4)) out.push({ type: "ambient", kind: "pressure_drop", bearing: "around", distance: 1, volume: 0.8 });
      this.enter("observation", s.worldSec, s.t);
      this.tm.respawnLurkerAt = s.t + range(this.rng, 4, 14);
      return;
    }
    if (s.t >= this.tm.stateEndsAt) this.enter(this.memory.stress < 30 ? "dormant" : "recovery", s.worldSec, s.t);
  }
  stepObservation(s, out) {
    this.ambientTick(s, out);
    if (this.tm.respawnLurkerAt > 0 && s.t >= this.tm.respawnLurkerAt && s.ownCreatures === 0) {
      this.tm.respawnLurkerAt = 0;
      if (s.globalActiveCreatures < TUNING.globalLurkerCap) {
        this.tm.observationSpawns++;
        out.push({ type: "spawnCreature", creature: "lurker", tactic: "observe", minDist: 26, maxDist: 42 });
        this.log("observe_spawn", s.worldSec);
      }
    }
    if (s.t < this.tm.nextCheckAt) return;
    this.tm.nextCheckAt = s.t + 6;
    const wantsMore = this.tm.noticedThisPhase >= 1 && this.memory.stress >= 38;
    const fatigue = this.tm.noticedThisPhase >= 2 || this.memory.noticedCount >= 4 && this.memory.stress >= 45;
    if ((wantsMore || fatigue) && chance(this.rng, 0.35)) {
      this.enter("escalation", s.worldSec, s.t);
      if (s.ownCreatures > 0) out.push({ type: "setTactic", tactic: "stalk" });
      else out.push({ type: "spawnCreature", creature: this.pickHunter(s), tactic: "stalk", minDist: 24, maxDist: 34 });
      return;
    }
    if (s.t >= this.tm.stateEndsAt) {
      if (chance(this.rng, 0.45) && this.memory.stress >= 35 && !blockedReason(s, this.memory, false)) {
        this.enter("escalation", s.worldSec, s.t);
        if (s.ownCreatures > 0) out.push({ type: "setTactic", tactic: "stalk" });
        else out.push({ type: "spawnCreature", creature: this.pickHunter(s), tactic: "stalk", minDist: 24, maxDist: 34 });
      } else {
        out.push({ type: "retreatLurkers", reason: "lost-interest" });
        this.enter("recovery", s.worldSec, s.t);
      }
    }
  }
  stepEscalation(s, out) {
    this.ambientTick(s, out);
    if (s.t < this.tm.nextCheckAt) return;
    this.tm.nextCheckAt = s.t + 8;
    if (s.lit || s.nearHome) {
      out.push({ type: "retreatLurkers", reason: "light" });
      this.enter("recovery", s.worldSec, s.t);
      return;
    }
    const huntBlock = blockedReason(s, this.memory, true);
    if (!huntBlock && this.memory.dread >= 45 && this.memory.stress >= 35 && (night2(s) || !s.skyVisible)) {
      const p = (0.05 + (this.memory.dread - 45) * 6e-3) * pace(s);
      if (chance(this.rng, p)) {
        this.enter("hunt", s.worldSec, s.t);
        this.tm.huntStartedAt = s.t;
        this.memory.hunts++;
        out.push({ type: "setTactic", tactic: "hunt" });
        out.push({ type: "ambient", kind: "pressure_drop", bearing: "around", distance: 1, volume: 0.9 });
        out.push({ type: "stress", amount: 8 });
        return;
      }
    }
    if (s.t >= this.tm.stateEndsAt) {
      out.push({ type: "retreatLurkers", reason: "escalation-timeout" });
      this.enter("recovery", s.worldSec, s.t);
    }
  }
  stepHunt(s, out) {
    const age = s.t - this.tm.huntStartedAt;
    const abort = s.health <= TUNING.huntAbortHealth ? "health" : s.lit || s.nearHome ? "safe-place" : age > TUNING.maxHuntSeconds ? "timeout" : s.companions >= 2 ? "group" : void 0;
    if (abort) {
      out.push({ type: "retreatLurkers", reason: `hunt-${abort}` });
      this.onHuntEnded(s.worldSec, true);
      return;
    }
    if (s.ownCreatures === 0 && age > 8) this.onHuntEnded(s.worldSec, true);
  }
  stepRecovery(s, out) {
    if (s.t >= this.tm.nextEventAt) {
      this.tm.nextEventAt = s.t + range(this.rng, 70, 170) / pace(s);
      if (this.memory.stress > 18 && chance(this.rng, 0.35)) this.fireEvent(s, out, ["snap_behind", "rustle_side", "door_far", "groan"]);
    }
    if (s.t >= this.tm.stateEndsAt) this.enter("dormant", s.worldSec, s.t);
  }
  /**
   * Which creature escalates. The Lurker is always met first (it is the one that watches); once the player has
   * spotted it a couple of times the Gaunt can take over, more often underground, so the player cannot learn one
   * routine and rely on it.
   */
  pickHunter(s) {
    if (this.memory.noticedCount < 2) return "lurker";
    return chance(this.rng, s.skyVisible ? 0.3 : 0.55) ? "gaunt" : "lurker";
  }
  // -- shared machinery ---------------------------------------------------------------------
  ambientTick(s, out) {
    if (s.t < this.tm.nextEventAt) return;
    const base = this.memory.state === "escalation" ? [10, 36] : this.memory.state === "observation" ? [14, 48] : [18, 70];
    const stressFactor = 1.5 - this.memory.stress / 100;
    this.tm.nextEventAt = s.t + range(this.rng, base[0], base[1]) * stressFactor / pace(s);
    this.fireEvent(s, out);
  }
  fireEvent(s, out, onlyIds) {
    const stress = this.memory.stress;
    const candidates = EVENTS.filter((e) => e.states.includes(this.memory.state) && (!onlyIds || onlyIds.includes(e.id)) && s.t - (this.tm.lastEvent.get(e.id) ?? -1e9) >= e.cooldown && e.weight(s, stress, this.tm.active) > 0);
    const ev = pickWeighted(this.rng, candidates, (e) => e.weight(s, stress, this.tm.active) * repetitionFactor(e.id, this.memory.history, s.worldSec));
    if (!ev) return;
    this.tm.lastEvent.set(ev.id, s.t);
    this.log(ev.id, s.worldSec);
    for (const a of ev.build(this.rng, s)) out.push(a);
    const close = ev.id.startsWith("lurker_") || ev.id.startsWith("gaunt_");
    this.memory.stress = clamp(this.memory.stress + (close ? 2.2 : 1), 0, 100);
    this.memory.dread = clamp(this.memory.dread + (close ? 7 : 3), 0, 100);
  }
  enter(state, worldSec2, t, duration) {
    this.memory.state = state;
    this.memory.stateSince = worldSec2;
    this.tm.stateEndsAt = t + (duration ?? this.durationFor(state, t));
    this.tm.nextCheckAt = t + 5;
    this.tm.nextEventAt = t + range(this.rng, 8, 30);
    this.tm.observationSpawns = 0;
    this.tm.noticedThisPhase = 0;
    this.tm.respawnLurkerAt = 0;
    this.log(`state:${state}`, worldSec2);
  }
  durationFor(state, _t) {
    const r = this.rng;
    switch (state) {
      // long-tailed: usually a few minutes, occasionally much longer, so quiet never has a predictable length
      case "dormant":
        return range(r, 150, 420) * (0.55 + r.next() * r.next() * 1.6) * (1.25 - this.memory.stress / 160);
      case "unease":
        return range(r, 150, 420);
      case "observation":
        return range(r, 90, 300);
      case "escalation":
        return range(r, 120, 330);
      case "hunt":
        return TUNING.maxHuntSeconds;
      case "recovery":
        return range(r, 240, 600);
    }
  }
  log(id, worldSec2) {
    const h = this.memory.history;
    h.push({ id, worldSec: worldSec2 });
    if (h.length > TUNING.historyCap) h.splice(0, h.length - TUNING.historyCap);
  }
};

// src/director/persistence.ts
var STATES = ["dormant", "unease", "observation", "escalation", "hunt", "recovery"];
function serializeMemory(m) {
  return JSON.stringify(m);
}
var num = (v, fallback) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
function parseMemory(raw, worldSec2) {
  if (typeof raw !== "string") return freshMemory(worldSec2);
  let j;
  try {
    j = JSON.parse(raw);
  } catch {
    return freshMemory(worldSec2);
  }
  if (typeof j !== "object" || j === null) return freshMemory(worldSec2);
  const o = j;
  if (o.v !== 1) return freshMemory(worldSec2);
  const history = [];
  if (Array.isArray(o.history)) {
    for (const h of o.history.slice(-40)) {
      if (typeof h === "object" && h !== null && typeof h.id === "string" && Number.isFinite(h.worldSec)) {
        history.push({ id: String(h.id).slice(0, 48), worldSec: h.worldSec });
      }
    }
  }
  const state = STATES.includes(o.state) ? o.state : "dormant";
  return {
    v: 1,
    state,
    stateSince: num(o.stateSince, worldSec2),
    history,
    hunts: Math.max(0, Math.floor(num(o.hunts, 0))),
    noticedCount: Math.max(0, Math.floor(num(o.noticedCount, 0))),
    survivedHunts: Math.max(0, Math.floor(num(o.survivedHunts, 0))),
    lastHuntEnd: num(o.lastHuntEnd, -1e9),
    lastDeath: num(o.lastDeath, -1e9),
    stress: clamp(num(o.stress, 10), 0, 100),
    dread: clamp(num(o.dread, 0), 0, 100)
  };
}

// src/game/ambient.ts
import { system as system2 } from "@minecraft/server";

// src/util/vec.ts
var sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
var scale = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
var dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
var len = (a) => Math.hypot(a.x, a.y, a.z);
function normalize(a) {
  const l = len(a);
  return l < 1e-9 ? { x: 0, y: 0, z: 0 } : scale(a, 1 / l);
}
function viewAlignment(viewerPos, viewDir, target) {
  return dot(normalize(viewDir), normalize(sub(target, viewerPos)));
}
function rotateY(v, radians) {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: v.x * c - v.z * s, y: v.y, z: v.x * s + v.z * c };
}

// src/game/helpers.ts
import { EntityComponentTypes, GameMode, world as world3 } from "@minecraft/server";
function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
function isPlayerSurvivalish(p) {
  const m = safe(() => p.getGameMode(), GameMode.Survival);
  return m === GameMode.Survival || m === GameMode.Adventure;
}
function health(e) {
  return safe(() => {
    const h = e.getComponent(EntityComponentTypes.Health);
    return h ? { cur: h.currentValue, max: h.effectiveMax } : { cur: 20, max: 20 };
  }, { cur: 20, max: 20 });
}
function dimensionKind(d) {
  const id = d.id;
  if (id === "minecraft:overworld") return "overworld";
  if (id === "minecraft:nether") return "nether";
  if (id === "minecraft:the_end") return "end";
  return "other";
}
function canSee(viewer, target, minCos = 0.5) {
  return safe(() => {
    const eye = viewer.getHeadLocation();
    const aim = target.location;
    const chest = { x: aim.x, y: aim.y + 1.6, z: aim.z };
    if (viewAlignment(eye, viewer.getViewDirection(), chest) < minCos) return false;
    const to = sub(chest, eye);
    const dist = len(to);
    if (dist < 0.5) return true;
    const hit = viewer.dimension.getBlockFromRay(eye, normalize(to), { maxDistance: dist - 0.5, includeLiquidBlocks: false, includePassableBlocks: false });
    return hit === void 0;
  }, false);
}
var SOFT = /(short_grass|tall_grass|^minecraft:fern|large_fern|flower|sapling|vine|snow_layer|dead_bush|mushroom|carpet|torch|_rail$|^minecraft:rail|sugar_cane|petals|sweet_berry|seagrass|kelp|web|^minecraft:fire|button|pressure_plate|_sign$|lever|tripwire|candle|lichen|hanging_roots|^minecraft:roots|pointed_dripstone|^minecraft:light_block|^minecraft:structure_void)/;
var isPassable = (b) => b !== void 0 && !b.isLiquid && (b.isAir || SOFT.test(b.typeId));
var isFloor = (b) => b !== void 0 && !b.isAir && !b.isLiquid && !SOFT.test(b.typeId);
function findStandingSpot(d, x, z, nearY, underground) {
  return safe(() => {
    if (!underground) {
      const top = d.getTopmostBlock({ x, z });
      if (!top) return void 0;
      let y = top.location.y + 1;
      if (SOFT.test(top.typeId)) y -= 1;
      if (!isFloor(d.getBlock({ x, y: y - 1, z }))) return void 0;
      if (![0, 1, 2].every((dy) => isPassable(d.getBlock({ x, y: y + dy, z })))) return void 0;
      return { x: x + 0.5, y, z: z + 0.5 };
    }
    for (let dy = 0; dy <= 5; dy++) {
      for (const sgn of dy === 0 ? [1] : [1, -1]) {
        const y = Math.floor(nearY) + dy * sgn;
        if (!isFloor(d.getBlock({ x, y: y - 1, z }))) continue;
        if ([0, 1, 2].every((k) => isPassable(d.getBlock({ x, y: y + k, z })))) return { x: x + 0.5, y, z: z + 0.5 };
      }
    }
    return void 0;
  }, void 0);
}
var COVER = /(_log|_leaves|_wood|stem|fence|wall|stone_brick|cobblestone|dripstone)/;
function findVantage(player, minDist, maxDist, underground, rng3) {
  const d = player.dimension;
  const origin = player.location;
  let best;
  for (let i = 0; i < 14; i++) {
    const angle = rng3.next() * Math.PI * 2;
    const dist = range(rng3, minDist, maxDist);
    const x = Math.floor(origin.x + Math.cos(angle) * dist);
    const z = Math.floor(origin.z + Math.sin(angle) * dist);
    const pos = findStandingSpot(d, x, z, origin.y, underground);
    if (!pos) continue;
    let score = rng3.next() * 0.5;
    safe(() => {
      const eye = player.getHeadLocation();
      const head = { x: pos.x, y: pos.y + 2.2, z: pos.z };
      const to = sub(head, eye);
      const l = len(to);
      const hit = d.getBlockFromRay(eye, normalize(to), { maxDistance: l - 1, includeLiquidBlocks: false, includePassableBlocks: false });
      score += hit === void 0 ? 2 : 0;
      let cover = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const b = d.getBlock({ x: Math.floor(pos.x) + dx, y: Math.floor(pos.y) + 1, z: Math.floor(pos.z) + dz });
        if (b && COVER.test(b.typeId)) cover++;
      }
      score += Math.min(cover, 3) * 0.6;
    }, void 0);
    if (!best || score > best.score) best = { pos, score };
  }
  return best?.pos;
}
function allPlayersNear(p, radius) {
  return safe(() => world3.getAllPlayers().filter((o) => o.id !== p.id && o.dimension.id === p.dimension.id && isPlayerSurvivalish(o) && len(sub(o.location, p.location)) <= radius).length, 0);
}

// src/game/ambient.ts
var SOUND = {
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
  gaunt_scrape: "dread.gaunt.claw_scrape",
  gaunt_sniff: "dread.gaunt.sniff"
};
var LOUD = /* @__PURE__ */ new Set(["pressure_drop", "lurker_breath", "distant_cry", "notice", "chase_vocal", "vocal"]);
function soundVolume(base, kind, cfg) {
  const master = cfg.soundIntensity / 100;
  const shock = LOUD.has(kind) ? 0.25 + 0.75 * (cfg.jumpscareIntensity / 100) : 1;
  return Math.max(0, Math.min(2, base * master * shock));
}
function horizontalView(p) {
  const v = safe(() => p.getViewDirection(), { x: 0, y: 0, z: 1 });
  const n = normalize({ x: v.x, y: 0, z: v.z });
  return n.x === 0 && n.z === 0 ? { x: 0, y: 0, z: 1 } : n;
}
function bearingToPosition(p, bearing, distance, rng3) {
  const view = horizontalView(p);
  let dir;
  switch (bearing) {
    case "behind":
      dir = rotateY(view, Math.PI + range(rng3, -0.5, 0.5));
      break;
    case "left":
      dir = rotateY(view, Math.PI / 2 + range(rng3, -0.3, 0.3));
      break;
    case "right":
      dir = rotateY(view, -Math.PI / 2 + range(rng3, -0.3, 0.3));
      break;
    case "front_far":
      dir = rotateY(view, range(rng3, -0.6, 0.6));
      break;
    default:
      dir = rotateY(view, rng3.next() * Math.PI * 2);
  }
  const l = p.location;
  return { x: l.x + dir.x * distance, y: l.y + 1, z: l.z + dir.z * distance };
}
function playAmbient(p, a, cfg, rng3, stress) {
  if (cfg.soundIntensity <= 0) return;
  if (a.kind === "heartbeat") {
    const beats = 3 + Math.floor(stress / 30);
    const gap = Math.max(18, Math.round(1200 / (62 + stress * 0.45)));
    for (let i = 0; i < beats; i++) {
      system2.runTimeout(() => {
        if (!p.isValid) return;
        safe(() => p.playSound("dread.ambient.heartbeat", { volume: soundVolume(a.volume * (1 - i * 0.08), "heartbeat", cfg), pitch: 1 }), void 0);
      }, i * gap);
    }
    return;
  }
  const id = SOUND[a.kind];
  const loc = a.kind === "pressure_drop" ? void 0 : bearingToPosition(p, a.bearing, a.distance, rng3);
  safe(() => p.playSound(id, { volume: soundVolume(a.volume, a.kind, cfg), pitch: 1, ...loc ? { location: loc } : {} }), void 0);
}
function playCreatureSound(p, creature, name, at, baseVolume, cfg) {
  if (cfg.soundIntensity <= 0) return;
  safe(() => p.playSound(`dread.${creature}.${name}`, { volume: soundVolume(baseVolume, name, cfg), pitch: 1, location: at }), void 0);
}

// src/game/atmosphere.ts
var FOG_USER_ID = "dread_atmos";
var FOG_FOR = {
  unease: "dread:fog_unease",
  observation: "dread:fog_observation",
  escalation: "dread:fog_escalation",
  hunt: "dread:fog_hunt"
};
var current = /* @__PURE__ */ new Map();
function run(p, cmd) {
  safe(() => p.runCommand(cmd), void 0);
}
function setAtmosphere(p, state, cfg, daylight) {
  const want = cfg.enabled && cfg.effects !== "performance" && !daylight ? FOG_FOR[state] : void 0;
  if (current.get(p.id) === want) return;
  run(p, `fog @s remove ${FOG_USER_ID}`);
  if (want) run(p, `fog @s push ${want} ${FOG_USER_ID}`);
  current.set(p.id, want);
}
function clearAtmosphere(p) {
  current.delete(p.id);
}
function shake(p, cfg, strength, seconds) {
  if (cfg.jumpscareIntensity <= 0 || cfg.effects === "performance") return;
  const k = cfg.jumpscareIntensity / 100 * strength * (cfg.effects === "cinematic" ? 1.25 : 1);
  run(p, `camerashake add @s ${Math.min(0.5, k).toFixed(3)} ${seconds.toFixed(1)} rotational`);
}

// src/journal/journal.ts
import { EntityComponentTypes as EntityComponentTypes2, ItemStack, system as system3, world as world4 } from "@minecraft/server";
import { ActionFormData, FormCancelationReason, ModalFormData } from "@minecraft/server-ui";

// src/journal/pages.ts
var PAGES = [
  {
    id: "first",
    title: "I. The commission",
    text: 'Eleven days out from Port Marlowe. The harbour master paid in advance and would not meet my eye.\n\n"Map the high ground. Come back before the lamps are lit." I asked why the last surveyor never filed his sheets. He said the man was careless with his lantern.\n\nI found this book in the mud by his tripod. I am keeping my notes in the back of it. It seems a waste of good paper otherwise.'
  },
  {
    id: "sound",
    title: "II. The wrong sounds",
    text: "A branch broke behind me today. Not the crack of a deer, which is followed by running. This was followed by nothing at all.\n\nI have started to notice which sounds have an animal attached to them and which do not. Doors in places with no houses. Something heavy being dragged and then, very suddenly, not dragged.\n\nThe woods are quieter when I am alone in them. That should not be possible.",
    lesson: "The worst sounds come when you are alone, in the dark, or underground."
  },
  {
    id: "noticed",
    title: "III. The tall one",
    text: "At the treeline, maybe forty paces off, there was a man standing very still. Too tall. Too thin. The head craned forward like a heron's.\n\nI looked at it properly, the way you look at something you intend to draw, and it looked back. Its face did something I cannot describe, and then it simply was not there. No running. Smoke, maybe.\n\nI have decided it does not like to be studied.",
    lesson: "Look straight at the tall one and hold your gaze. It will not stay where it is seen."
  },
  {
    id: "spooked",
    title: "IV. Approach",
    text: "I walked toward it this time. I thought, if it is a man, it will speak. If it is not, I will know.\n\nI did not get within twenty paces. It went the same way as before. I have the feeling I was allowed to come exactly that close and no closer, and that the distance was decided by it, not by me.",
    lesson: "It keeps its own distance. Walking toward it ends the watching. It does not end the interest."
  },
  {
    id: "close",
    title: "V. Breath",
    text: "I was writing by the fire with my back to the trees. Someone breathed behind me. Slow, with a rattle at the end, like a man with water in his chest.\n\nI did not turn around. I could not. When I finally did there was nothing, only the long marks in the bark of the nearest pine, about the height of a man's head.\n\nNote to self: sit with your back to a wall.",
    lesson: "When it gets close it wants you not to turn around. Turn around."
  },
  {
    id: "light",
    title: "VI. Lamp oil",
    text: "It came for me tonight. Properly, running on those long legs, and I could hear it laughing, or breathing, or both.\n\nI had the lantern. I don't know what made me hold it up, but it stopped. It stayed at the edge of the light, swaying, and then it went back into the dark.\n\nThe harbour master was right. The other man was careless with his lantern.",
    lesson: "Light is the only thing it respects. Hold a torch or lantern, or stand by one, and keep it lit."
  },
  {
    id: "hunt",
    title: "VII. The chase",
    text: "Survived it. Four cuts on my back and a ruined coat. It does not try to finish you. It tries to frighten you, then it hurts you, then it leaves, as if it has learned what it came to learn.\n\nI struck it with the hatchet once and it flinched like anything else would. It is not a ghost. It can be hurt. That is a comfort I did not expect to need.",
    lesson: "A chase does not last forever. Hurt it badly and it runs. Shelter, a bed or a campfire, ends the night's interest."
  },
  {
    id: "home",
    title: "VIII. Shelter",
    text: "Built a proper camp: walls, a bed, a fire that I keep fed. Three nights now and nothing has come inside the ring of light. I heard it once, far off, scraping at something.\n\nI am starting to think it is not that it cannot come in. It is that it does not want to be seen doing it.",
    lesson: "A lit home with a bed or campfire is the safest place in the world. It almost never comes there."
  },
  {
    id: "death",
    title: "IX. (in a different hand)",
    text: "Found him by the tripod. I am the third. The book was dry, which is strange because it had rained for two days.\n\nHe was right about the light. I would add: it is patient. After it takes someone it goes quiet for a long time. Long enough that you start to think you imagined it.\n\nYou did not imagine it."
  },
  {
    id: "many",
    title: "X. Company",
    text: "Two men from the port came up to help with the chain. While they were here I heard nothing. Not a twig. The night they left it was back at the treeline before the fire had settled.\n\nIt does not like witnesses. I have stopped telling the port about it. I do not think they would come again.",
    lesson: "Travelling together keeps it at a distance. It prefers people who are alone."
  },
  {
    id: "gaunt",
    title: "XI. The low one",
    text: "There is a second thing, and it is nothing like the first. Low to the ground, on arms like a man's legs, and no eyes at all, only that long white skull swinging back and forth over my footprints.\n\nIt was not looking for me. It was looking for where I had been. It followed the exact line I had walked that morning, stopping where I had stopped, tasting the air where I had stood to light my pipe.",
    lesson: "The low one follows the path you walked, not where you are. It is hunting your trail."
  },
  {
    id: "scent",
    title: "XII. Losing it",
    text: "Crossed the river at the ford and waited on the far bank with my heart in my teeth. It came down to the water, put its face in the shallows, and stood there a long while. Then it went back into the ground the way a mole does.\n\nWater takes the scent. So does woodsmoke, I think. And when I crept, bent double, it lost me twice in the same hour.",
    lesson: "Water and campfire smoke wash your trail away. Sneaking leaves almost none. Doors stop it."
  }
];
var PAGE_IDS = PAGES.map((p) => p.id);

// src/journal/journal.ts
var JOURNAL_ITEM = "dread:journal";
var PAGES_KEY = "dread:pages";
var GIVEN_KEY = "dread:journal_given";
var OWNER_KEY = "dread:settings_owner";
var OPEN_KEY = "dread:settings_open";
function unlockedPages(p) {
  const raw = safe(() => p.getDynamicProperty(PAGES_KEY), void 0);
  return new Set(typeof raw === "string" && raw.length ? raw.split(",").filter((id) => PAGES.some((pg) => pg.id === id)) : []);
}
function unlockPage(p, id) {
  if (!PAGES.some((pg) => pg.id === id)) return false;
  const have = unlockedPages(p);
  if (have.has(id)) return false;
  have.add(id);
  safe(() => p.setDynamicProperty(PAGES_KEY, [...have].join(",")), void 0);
  const page = PAGES.find((pg) => pg.id === id);
  system3.runTimeout(() => {
    if (!p.isValid) return;
    safe(() => p.onScreenDisplay.setActionBar(`\xA77\xA7oA new page in your journal: ${page?.title ?? ""}`), void 0);
    safe(() => p.playSound("item.book.page_turn", { volume: 0.8 }), void 0);
  }, 60);
  return true;
}
function giveJournal(p) {
  safe(() => {
    const inv = p.getComponent(EntityComponentTypes2.Inventory)?.container;
    if (!inv) return;
    const left = inv.addItem(new ItemStack(JOURNAL_ITEM, 1));
    if (left) p.dimension.spawnItem(left, p.location);
    p.setDynamicProperty(GIVEN_KEY, true);
  }, void 0);
}
function initJournal() {
  world4.afterEvents.playerSpawn.subscribe((e) => {
    if (!e.initialSpawn) return;
    const p = e.player;
    system3.runTimeout(() => {
      if (!p.isValid) return;
      if (safe(() => p.getDynamicProperty(GIVEN_KEY), void 0) !== true) {
        giveJournal(p);
        unlockPage(p, "first");
      }
    }, 120);
  });
  world4.afterEvents.itemUse.subscribe((e) => {
    if (e.itemStack.typeId === JOURNAL_ITEM) void openJournal(e.source);
  });
}
async function openJournal(p) {
  const have = unlockedPages(p);
  const pages = PAGES.filter((pg) => have.has(pg.id));
  const form = new ActionFormData().title("Field Journal").body(`\xA77Pages recovered: ${pages.length} of ${PAGES.length}
\xA78Water-stained. Several hands.`);
  const actions = [];
  form.button("\xA7lRead the pages");
  actions.push(() => openPageList(p, pages));
  form.button("\xA7lWhat I know");
  actions.push(() => openLessons(p, pages));
  form.button("\xA7lSettings");
  actions.push(() => openSettings(p));
  form.button("About DREAD");
  actions.push(() => openAbout(p));
  const res = await form.show(p);
  if (res.cancelationReason === FormCancelationReason.UserBusy) {
    system3.runTimeout(() => void openJournal(p), 20);
    return;
  }
  if (res.canceled || res.selection === void 0) return;
  await actions[res.selection]?.();
}
async function openPageList(p, pages) {
  if (pages.length === 0) return;
  const form = new ActionFormData().title("Pages");
  for (const pg2 of pages) form.button(pg2.title);
  const res = await form.show(p);
  if (res.canceled || res.selection === void 0) return openJournal(p);
  const pg = pages[res.selection];
  if (!pg) return;
  const view = await new ActionFormData().title(pg.title).body(pg.text).button("Back").show(p);
  if (!view.canceled) return openPageList(p, pages);
}
async function openLessons(p, pages) {
  const lessons = pages.filter((pg) => pg.lesson).map((pg) => `\xA7f- ${pg.lesson}`);
  const body = lessons.length ? lessons.join("\n\n") : "\xA77Nothing yet. Keep your eyes open, and your lantern lit.";
  const res = await new ActionFormData().title("What I know").body(body).button("Back").show(p);
  if (!res.canceled) return openJournal(p);
}
async function openAbout(p) {
  const res = await new ActionFormData().title("DREAD").body(
    `\xA7fDREAD \u2014 Something Is Watching\xA7r
\xA77v${ADDON_VERSION}

A psychological horror add-on. The world stays ordinary until it doesn't. Encounters respond to darkness, isolation and what you have already lived through, and every danger has a counter written somewhere in this journal.

If anything feels unfair or too intense, turn Intensity or Jumpscare intensity down in Settings.`
  ).button("Back").show(p);
  if (!res.canceled) return openJournal(p);
}
function canEditSettings(p) {
  if (world4.getAllPlayers().length <= 1) return true;
  if (world4.getDynamicProperty(OPEN_KEY) === true) return true;
  const owner = world4.getDynamicProperty(OWNER_KEY);
  return owner === void 0 || owner === p.id;
}
var EFFECTS = ["performance", "balanced", "cinematic"];
var EFFECT_LABELS = ["Performance (no fog or camera shake)", "Balanced", "Cinematic (stronger effects)"];
async function openSettings(p) {
  const c = readConfig();
  if (!canEditSettings(p)) {
    const ro = await new ActionFormData().title("Settings").body(`\xA77Settings are managed by the world's DREAD owner.

\xA7fIntensity ${c.intensity}
Sound ${c.soundIntensity}
Jumpscares ${c.jumpscareIntensity}
Effects ${c.effects}`).button("Back").show(p);
    if (!ro.canceled) return openJournal(p);
    return;
  }
  const form = new ModalFormData().title("DREAD Settings").toggle("Horror enabled", { defaultValue: c.enabled, tooltip: "Turn the whole add-on off without removing it." }).slider("Intensity (how often things happen)", 0, 100, { defaultValue: c.intensity, valueStep: 5, tooltip: "Below 35 the Lurker is gentler: shorter chases, fewer hits." }).slider("Sound volume (DREAD sounds only)", 0, 100, { defaultValue: c.soundIntensity, valueStep: 5 }).slider("Jumpscare intensity", 0, 100, { defaultValue: c.jumpscareIntensity, valueStep: 5, tooltip: "Scales sudden/close sounds and camera shake. 0 removes camera shake." }).dropdown("Visual effects", EFFECT_LABELS, { defaultValueIndex: Math.max(0, EFFECTS.indexOf(c.effects)) }).toggle("Let every player change settings", { defaultValue: world4.getDynamicProperty(OPEN_KEY) === true }).toggle("Debug messages", { defaultValue: c.debug }).submitButton("Save");
  const res = await form.show(p);
  if (res.canceled || !res.formValues) return openJournal(p);
  const [enabled, intensity, sound, jump, effectIdx, open, dbg] = res.formValues;
  setConfigValue("enabled", String(enabled === true));
  setConfigValue("intensity", String(Number(intensity)));
  setConfigValue("soundIntensity", String(Number(sound)));
  setConfigValue("jumpscareIntensity", String(Number(jump)));
  setConfigValue("effects", EFFECTS[Number(effectIdx)] ?? "balanced");
  setConfigValue("debug", String(dbg === true));
  world4.setDynamicProperty(OPEN_KEY, open === true);
  if (world4.getDynamicProperty(OWNER_KEY) === void 0) world4.setDynamicProperty(OWNER_KEY, p.id);
  safe(() => p.onScreenDisplay.setActionBar("\xA77DREAD settings saved."), void 0);
}

// src/game/environment.ts
import { EntityComponentTypes as EntityComponentTypes3, EquipmentSlot } from "@minecraft/server";
var LIGHT_BLOCK = /^minecraft:(torch|soul_torch|lantern|soul_lantern|campfire|soul_campfire|glowstone|sea_lantern|shroomlight|lit_pumpkin|lit_redstone_lamp|end_rod|beacon|ochre_froglight|verdant_froglight|pearlescent_froglight|lava|fire|soul_fire|underwater_torch|copper_torch)$/;
var HELD_LIGHT = /^minecraft:(torch|soul_torch|lantern|soul_lantern|glow_stick|lit_pumpkin|end_rod|copper_torch)$/;
var HOME_BLOCK = /(_bed$|^minecraft:bed$|^minecraft:campfire$|^minecraft:soul_campfire$|^minecraft:respawn_anchor$)/;
function scanSurroundings(p) {
  return safe(() => {
    const d = p.dimension;
    const loc = p.location;
    const cx = Math.floor(loc.x), cy = Math.floor(loc.y), cz = Math.floor(loc.z);
    let lit = heldLight(p);
    let home = false;
    for (let dx = -4; dx <= 4 && !(lit && home); dx++) {
      for (let dz = -4; dz <= 4 && !(lit && home); dz++) {
        for (let dy = -1; dy <= 2; dy++) {
          const b = d.getBlock({ x: cx + dx, y: cy + dy, z: cz + dz });
          if (!b || b.isAir) continue;
          const id = b.typeId;
          if (!lit && LIGHT_BLOCK.test(id)) lit = true;
          if (!home && HOME_BLOCK.test(id)) home = true;
        }
      }
    }
    const top = d.getTopmostBlock({ x: cx, z: cz });
    const skyVisible = top ? top.location.y <= cy + 1 : true;
    return { lit, nearHome: home, skyVisible };
  }, { lit: false, nearHome: false, skyVisible: true });
}
function heldLight(p) {
  return safe(() => {
    const inv = p.getComponent(EntityComponentTypes3.Inventory);
    const main = inv?.container?.getItem(p.selectedSlotIndex)?.typeId;
    if (main && HELD_LIGHT.test(main)) return true;
    const eq = p.getComponent(EntityComponentTypes3.Equippable);
    const off = eq?.getEquipment(EquipmentSlot.Offhand)?.typeId;
    return !!off && HELD_LIGHT.test(off);
  }, false);
}

// src/game/creatures.ts
import { system as system4, world as world5 } from "@minecraft/server";

// src/gaunt/tactics.ts
var GTUNING = {
  maxLifetime: 480,
  pursueMax: 60,
  hitsToSatisfy: 2,
  lostSightSearch: 6,
  fleeHealth: 0.5,
  playerHealthAbort: 6,
  burrowTime: 1.6
};
var GauntTactics = class {
  constructor(rng3, initial = "stalk") {
    this.rng = rng3;
    this.nextSniff = range(rng3, 3, 6);
    if (initial === "hunt") this.to("search", this.pending);
    else this.pending.push({ type: "group", event: "dread:set_pause" });
  }
  rng;
  state = "track";
  stateAge = 0;
  moving = false;
  phaseLeft = 0;
  searchFor = 0;
  unseenFor = 0;
  lastMarkerDist = Infinity;
  stallFor = 0;
  stalls = 0;
  roarLeft = 0;
  sizeupLeft = 0;
  burrowLeft = 0;
  outcome = "retreat";
  forced;
  announced = false;
  nextSniff;
  pending = [];
  forceRetreat(reason) {
    if (this.state !== "gone" && this.state !== "burrow") this.forced = reason;
  }
  to(next, out) {
    this.state = next;
    this.stateAge = 0;
    switch (next) {
      case "track":
        this.moving = false;
        this.phaseLeft = 0;
        break;
      case "search":
        this.searchFor = range(this.rng, 8, 16);
        out.push({ type: "group", event: "dread:set_search" });
        break;
      case "pursue":
        this.unseenFor = 0;
        out.push({ type: "group", event: "dread:set_pursue" });
        break;
      case "roar":
        this.roarLeft = 1.8;
        out.push({ type: "group", event: "dread:set_pause" }, { type: "action", action: "roar" }, { type: "stress", amount: 6 });
        break;
      case "sizeup":
        this.sizeupLeft = range(this.rng, 2, 3.5);
        out.push({ type: "group", event: "dread:set_pause" }, { type: "sound", id: "breath", volume: 0.9, near: true }, { type: "stress", amount: 4 });
        break;
      case "burrow":
        this.burrowLeft = GTUNING.burrowTime;
        out.push({ type: "group", event: "dread:set_retreat" }, { type: "action", action: "burrow" });
        break;
      default:
        break;
    }
  }
  leave(outcome, out) {
    this.outcome = outcome;
    this.to("burrow", out);
  }
  seen(c, out) {
    if (!c.sees) return false;
    if (!this.announced) {
      this.announced = true;
      out.push({ type: "encounter", kind: "gaunt_seen" });
    }
    this.to(c.requested === "hunt" ? "roar" : "sizeup", out);
    return true;
  }
  step(c) {
    const out = this.pending.splice(0);
    if (this.state === "gone") return out;
    this.stateAge += c.dt;
    if (this.forced && this.state !== "burrow") {
      const r = this.forced;
      this.forced = void 0;
      this.leave(r, out);
      return out;
    }
    if (c.age > GTUNING.maxLifetime && this.state !== "burrow") {
      this.leave("lifetime", out);
      return out;
    }
    switch (this.state) {
      case "track":
        this.stepTrack(c, out);
        break;
      case "sizeup":
        this.sizeupLeft -= c.dt;
        if (c.requested === "hunt") this.to("roar", out);
        else if (this.sizeupLeft <= 0) this.leave("sized-up", out);
        break;
      case "roar":
        this.roarLeft -= c.dt;
        if (this.roarLeft <= 0) this.to("pursue", out);
        break;
      case "search":
        this.stepSearch(c, out);
        break;
      case "pursue":
        this.stepPursue(c, out);
        break;
      case "burrow":
        this.burrowLeft -= c.dt;
        if (this.burrowLeft <= 0) {
          this.state = "gone";
          out.push({ type: "vanish", outcome: this.outcome });
        }
        break;
    }
    return out;
  }
  stepTrack(c, out) {
    if (this.seen(c, out)) return;
    if (c.trailBroken && c.trailLeft === 0) return this.to("search", out);
    this.phaseLeft -= c.dt;
    if (this.phaseLeft <= 0) {
      this.moving = !this.moving;
      this.phaseLeft = this.moving ? range(this.rng, 2, 5) : range(this.rng, 1, 3);
      out.push({ type: "group", event: this.moving ? "dread:set_track" : "dread:set_pause" });
      if (!this.moving && chance(this.rng, 0.6)) out.push({ type: "sound", id: "sniff", volume: 0.9, near: false });
    }
    if (this.moving) {
      if (c.markerDist < 2.2) {
        if (c.trailLeft > 0) out.push({ type: "marker", op: "next" });
        else return this.to("search", out);
        this.stallFor = 0;
        this.lastMarkerDist = Infinity;
      } else if (c.markerDist < this.lastMarkerDist - 0.4) {
        this.lastMarkerDist = c.markerDist;
        this.stallFor = 0;
      } else {
        this.stallFor += c.dt;
        if (this.stallFor > 6) {
          this.stalls++;
          this.stallFor = 0;
          if (this.stalls >= 3) return this.leave("stuck", out);
          if (c.trailLeft > 0) out.push({ type: "marker", op: "next" });
        }
      }
    }
  }
  stepSearch(c, out) {
    if (this.seen(c, out)) return;
    this.nextSniff -= c.dt;
    if (this.nextSniff <= 0) {
      this.nextSniff = range(this.rng, 3, 6);
      out.push({ type: "sound", id: "sniff", volume: 1, near: false });
    }
    if (this.stateAge >= this.searchFor) {
      if (c.trailLeft > 0 && !c.trailBroken) this.to("track", out);
      else this.leave("lost-scent", out);
    }
  }
  stepPursue(c, out) {
    const cap = c.gentle ? GTUNING.pursueMax * 0.6 : GTUNING.pursueMax;
    if (c.playerHealth <= GTUNING.playerHealthAbort) return this.leave("player-hurt", out);
    if (c.hits >= (c.gentle ? 1 : GTUNING.hitsToSatisfy)) return this.leave("satisfied", out);
    if (c.hpFrac < GTUNING.fleeHealth) return this.leave("injured", out);
    if (this.stateAge > cap) return this.leave("timeout", out);
    if (c.dist > 64) return this.leave("lost", out);
    if (c.playerInWater) {
      out.push({ type: "marker", op: "lastSeen" });
      return this.to("search", out);
    }
    this.unseenFor = c.sees ? 0 : this.unseenFor + c.dt;
    if (this.unseenFor >= GTUNING.lostSightSearch) {
      out.push({ type: "marker", op: "lastSeen" });
      this.to("search", out);
    }
  }
};

// src/lurker/tactics.ts
var LTUNING = {
  maxLifetime: 420,
  // hard safety cap, any state
  huntMax: 70,
  huntHitsToSatisfy: 3,
  huntHealthAbort: 6,
  huntLightHold: 5,
  observeSpookDist: 13,
  stalkCloseDist: 7,
  maxRepositions: 3
};
var LurkerTactics = class {
  constructor(rng3, initial = "observe") {
    this.rng = rng3;
    this.noticeNeeded = range(rng3, 0.8, 1.8);
    this.observeLimit = range(rng3, 50, 120);
    this.nextVocalIn = range(rng3, 8, 16);
    this.switchTo(initial === "observe" ? "observe" : initial === "stalk" ? "stalk" : "hunt", this.pending);
  }
  rng;
  state = "observe";
  stateAge = 0;
  seenFor = 0;
  lightHold = 0;
  repositions = 0;
  noticeNeeded;
  observeLimit;
  noticeTimer = 0;
  retreatReason = "retreat";
  retreatTimer = 0;
  closeMomentDone = false;
  unseenFor = 0;
  nextVocalIn;
  huntAge = 0;
  afterNotice = "vanish";
  /** Events produced before the first step (initial component group), flushed by step(). */
  pending = [];
  switchTo(next, out) {
    this.state = next;
    this.stateAge = 0;
    this.unseenFor = 0;
    if (next === "observe") out.push({ type: "group", event: "dread:set_observe" });
    if (next === "stalk") out.push({ type: "group", event: "dread:set_stalk" });
    if (next === "hunt") {
      this.huntAge = 0;
      this.nextVocalIn = range(this.rng, 1, 3);
      out.push({ type: "group", event: "dread:set_hunt" });
    }
    if (next === "retreat") {
      this.retreatTimer = range(this.rng, 6, 10);
      out.push({ type: "group", event: "dread:set_retreat" });
    }
  }
  /** Director/safety override: abandon whatever is happening and leave. Emits events on the next step. */
  forceRetreat(reason) {
    if (this.state === "gone" || this.state === "retreat") return;
    this.forced = reason;
  }
  forced;
  retreat(reason, out) {
    this.retreatReason = reason;
    this.switchTo("retreat", out);
  }
  vanish(outcome, out) {
    this.state = "gone";
    out.push({ type: "vanish", outcome });
  }
  step(c) {
    const out = this.pending.splice(0);
    if (this.state === "gone") return out;
    this.stateAge += c.dt;
    this.lightHold = c.playerLit ? this.lightHold + c.dt : Math.max(0, this.lightHold - c.dt * 0.5);
    this.seenFor = c.seen ? this.seenFor + c.dt : Math.max(0, this.seenFor - c.dt * 0.5);
    this.unseenFor = c.seen ? 0 : this.unseenFor + c.dt;
    if (this.forced) {
      const reason = this.forced;
      this.forced = void 0;
      this.retreat(reason, out);
      return out;
    }
    if (c.age > LTUNING.maxLifetime) {
      this.vanish("lifetime", out);
      return out;
    }
    switch (this.state) {
      case "observe":
        this.stepObserve(c, out);
        break;
      case "notice":
        this.stepNotice(c, out);
        break;
      case "stalk":
        this.stepStalk(c, out);
        break;
      case "hunt":
        this.stepHunt(c, out);
        break;
      case "retreat":
        this.stepRetreat(c, out);
        break;
    }
    return out;
  }
  maybeFollowDirector(c, out) {
    if (c.requested === "stalk" && this.state === "observe") {
      this.switchTo("stalk", out);
      return true;
    }
    if (c.requested === "hunt" && (this.state === "observe" || this.state === "stalk")) {
      this.switchTo("hunt", out);
      return true;
    }
    return false;
  }
  stepObserve(c, out) {
    if (this.maybeFollowDirector(c, out)) return;
    if (this.lightHold >= 1.5) return this.retreat("light", out);
    if (this.seenFor >= this.noticeNeeded) return this.beginNotice("noticed", out);
    if (c.dist < LTUNING.observeSpookDist) return this.beginNotice("spooked", out);
    if (this.stateAge > this.observeLimit && !c.seen) {
      if (this.repositions < LTUNING.maxRepositions && chance(this.rng, 0.6)) {
        this.repositions++;
        this.stateAge = 0;
        this.observeLimit = range(this.rng, 50, 120);
        out.push({ type: "reposition" });
      } else this.vanish("timeout", out);
    }
  }
  beginNotice(why, out) {
    this.state = "notice";
    this.stateAge = 0;
    this.noticeTimer = range(this.rng, 1, 1.6);
    this.retreatReason = why;
    out.push({ type: "group", event: "dread:set_observe" });
    out.push({ type: "action", action: "notice" });
    out.push({ type: "stress", amount: 4 });
    this.afterNotice = this.afterNoticeFrom();
  }
  afterNoticeFrom() {
    return "vanish";
  }
  stepNotice(c, out) {
    this.noticeTimer -= c.dt;
    if (this.noticeTimer > 0) return;
    out.push({ type: "noticed" });
    if (this.afterNotice === "vanish") this.vanish(this.retreatReason, out);
    else this.retreat(this.retreatReason, out);
  }
  stepStalk(c, out) {
    if (this.maybeFollowDirector(c, out)) return;
    if (this.lightHold >= 1.5) return this.retreat("light", out);
    if (this.seenFor >= 0.7 + (c.gentle ? 0.5 : 0)) {
      this.state = "notice";
      this.stateAge = 0;
      this.noticeTimer = 0.9;
      this.retreatReason = "noticed";
      this.afterNotice = "retreat";
      out.push({ type: "group", event: "dread:set_observe" });
      out.push({ type: "action", action: "notice" });
      out.push({ type: "stress", amount: 3 });
      return;
    }
    if (!this.closeMomentDone && !c.gentle && c.dist < LTUNING.stalkCloseDist && this.unseenFor > 4) {
      this.closeMomentDone = true;
      out.push({ type: "sound", id: "breath_alert", volume: 0.9, near: true });
      out.push({ type: "stress", amount: 6 });
      this.retreat("close-moment", out);
      return;
    }
    if (this.stateAge > 240) this.retreat("timeout", out);
  }
  stepHunt(c, out) {
    this.huntAge += c.dt;
    const cap = c.gentle ? LTUNING.huntMax * 0.6 : LTUNING.huntMax;
    if (c.playerHealth <= LTUNING.huntHealthAbort) return this.retreat("player-hurt", out);
    if (c.hitsLanded >= (c.gentle ? 2 : LTUNING.huntHitsToSatisfy)) return this.retreat("satisfied", out);
    if (c.lurkerHealthFrac < 0.4) return this.retreat("injured", out);
    if (this.lightHold >= LTUNING.huntLightHold) return this.retreat("light", out);
    if (this.huntAge > cap) return this.retreat("timeout", out);
    if (c.dist > 60) return this.vanish("lost", out);
    this.nextVocalIn -= c.dt;
    if (this.nextVocalIn <= 0) {
      this.nextVocalIn = range(this.rng, 12, 22);
      out.push({ type: "sound", id: "chase_vocal", volume: 1, near: true });
    }
  }
  stepRetreat(c, out) {
    this.retreatTimer -= c.dt;
    if (this.retreatTimer <= 0 || c.dist > 30) this.vanish(this.retreatReason, out);
  }
};
var lurkerGentle = (intensity) => clamp(intensity, 0, 100) < 35;

// src/game/trail.ts
var CAP = 160;
var SAMPLE_TICKS = 30;
var trails = /* @__PURE__ */ new Map();
function sampleTrail(p, now, nearFire) {
  if (now % SAMPLE_TICKS !== 0) return;
  let tr = trails.get(p.id);
  if (!tr) {
    tr = { points: [], seq: 0, sneakSkip: 0 };
    trails.set(p.id, tr);
  }
  const loc = p.location;
  const last = tr.points[tr.points.length - 1];
  const inWater = safe(() => p.isInWater, false);
  if (inWater || nearFire) {
    if (last) last.brokenAfter = true;
    return;
  }
  if (last && Math.hypot(loc.x - last.x, loc.z - last.z) < 1.5 && Math.abs(loc.y - last.y) < 1.5) return;
  if (safe(() => p.isSneaking, false) && tr.sneakSkip++ % 4 !== 0) return;
  tr.points.push({ x: loc.x, y: loc.y, z: loc.z, seq: ++tr.seq, t: now / 20, brokenAfter: false });
  if (tr.points.length > CAP) tr.points.splice(0, tr.points.length - CAP);
}
function trailOf(playerId) {
  return trails.get(playerId)?.points ?? [];
}
function pointBySeq(playerId, seq) {
  return trailOf(playerId).find((p) => p.seq === seq);
}
function newestSeq(playerId) {
  const pts = trailOf(playerId);
  return pts.length ? pts[pts.length - 1].seq : 0;
}
function aheadOf(playerId, seq) {
  let left = 0;
  let next;
  for (const p of trailOf(playerId)) {
    if (p.seq < seq) continue;
    if (p.seq === seq) {
      if (p.brokenAfter) return { left: 0, broken: true };
      continue;
    }
    left++;
    next ??= p;
    if (p.brokenAfter) return { left, broken: true, next };
  }
  return { left, broken: false, next };
}
function forgetTrail(playerId) {
  trails.delete(playerId);
}

// src/game/creatures.ts
var CREATURE_TYPE = { lurker: "dread:lurker", gaunt: "dread:gaunt" };
var SCENT_TYPE = "dread:scent";
var MANAGED_TAG = "dread_managed";
var TICK_INTERVAL = 5;
var DT = TICK_INTERVAL / 20;
var registry = /* @__PURE__ */ new Map();
var hooks;
var rng = mathRng;
var creatureCount = () => registry.size;
function creaturesOf(playerId) {
  let n = 0;
  for (const r of registry.values()) if (r.playerId === playerId) n++;
  return n;
}
function initCreatures(h, r = mathRng) {
  hooks = h;
  rng = r;
  system4.runInterval(tick, TICK_INTERVAL);
  system4.runInterval(adoptAndSweep, 200);
  world5.afterEvents.entityHurt.subscribe((e) => {
    const attacker = e.damageSource.damagingEntity;
    if (!attacker) return;
    const rec = registry.get(attacker.id);
    if (rec && e.hurtEntity.id === rec.playerId) rec.hits++;
  });
}
function spawnCreature(player, creature, tactic, minDist, maxDist, underground) {
  if (!hooks) return false;
  return creature === "gaunt" ? spawnGaunt(player, tactic) || spawnFallbackGaunt(player, tactic, underground) : spawnLurker(player, tactic, minDist, maxDist, underground);
}
function spawnLurker(player, tactic, minDist, maxDist, underground) {
  const pos = findVantage(player, minDist, maxDist, underground, rng);
  if (!pos) {
    debug(`no vantage found for ${tactic} Lurker`);
    return false;
  }
  return safe(() => {
    const e = player.dimension.spawnEntity(CREATURE_TYPE.lurker, pos);
    e.addTag(MANAGED_TAG);
    registry.set(e.id, { kind: "lurker", entity: e, playerId: player.id, tactics: new LurkerTactics(rng, tactic), spawnedTick: system4.currentTick, hits: 0, actionSince: 0, wasHunting: tactic === "hunt" });
    face(e, player.location);
    return true;
  }, false);
}
function spawnGaunt(player, tactic) {
  const pts = trailOf(player.id);
  const now = system4.currentTick / 20;
  const candidates = pts.filter((p) => now - p.t >= 40 && now - p.t <= 90 && len(sub(p, player.location)) >= 18);
  for (const p of [...candidates].sort(() => rng.next() - 0.5).slice(0, 8)) {
    const spot = findStandingSpot(player.dimension, Math.floor(p.x), Math.floor(p.z), p.y, true);
    if (!spot) continue;
    const visible = safe(() => {
      const eye = player.getHeadLocation();
      const to = sub({ x: spot.x, y: spot.y + 1, z: spot.z }, eye);
      return player.dimension.getBlockFromRay(eye, { x: to.x / len(to), y: to.y / len(to), z: to.z / len(to) }, { maxDistance: len(to) - 1, includePassableBlocks: false, includeLiquidBlocks: false }) === void 0;
    }, true);
    if (visible) continue;
    return placeGaunt(player, spot, p.seq + 1, tactic);
  }
  return false;
}
function spawnFallbackGaunt(player, tactic, underground) {
  const pos = findVantage(player, 26, 36, underground, rng);
  return pos ? placeGaunt(player, pos, newestSeq(player.id), tactic) : false;
}
function placeGaunt(player, pos, markerSeq, tactic) {
  return safe(() => {
    const e = player.dimension.spawnEntity(CREATURE_TYPE.gaunt, pos);
    e.addTag(MANAGED_TAG);
    const rec = {
      kind: "gaunt",
      entity: e,
      playerId: player.id,
      tactics: new GauntTactics(rng, tactic),
      spawnedTick: system4.currentTick,
      hits: 0,
      actionSince: 0,
      wasHunting: false,
      markerSeq
    };
    registry.set(e.id, rec);
    moveMarker(rec, player);
    safe(() => e.dimension.spawnParticle("dread:gaunt_burrow", pos), void 0);
    return true;
  }, false);
}
function moveMarker(rec, player, to) {
  const target = to ?? pointBySeq(rec.playerId, rec.markerSeq) ?? player.location;
  safe(() => {
    if (!rec.marker || !rec.marker.isValid) {
      rec.marker = rec.entity.dimension.spawnEntity(SCENT_TYPE, target);
      rec.marker.addTag(MANAGED_TAG);
    } else rec.marker.teleport(target);
  }, void 0);
}
function face(e, at) {
  safe(() => e.teleport(e.location, { facingLocation: at }), void 0);
}
function retreatAll(playerId, reason) {
  for (const rec of registry.values()) if (rec.playerId === playerId) rec.tactics.forceRetreat(reason);
}
function removeAll(playerId) {
  let n = 0;
  for (const [id, rec] of [...registry]) {
    if (playerId && rec.playerId !== playerId) continue;
    dispose(rec);
    registry.delete(id);
    n++;
  }
  return n;
}
function dispose(rec) {
  safe(() => rec.entity.remove(), void 0);
  if (rec.kind === "gaunt") safe(() => rec.marker?.remove(), void 0);
}
function vanishEffect(dim, at, kind) {
  safe(() => dim.spawnParticle(kind === "lurker" ? "dread:lurker_vanish" : "dread:gaunt_burrow", at), void 0);
}
function tick() {
  const h = hooks;
  if (!h || registry.size === 0) return;
  const now = system4.currentTick;
  const cfg = readConfig();
  const gentle = lurkerGentle(cfg.intensity);
  for (const [id, rec] of [...registry]) {
    const e = rec.entity;
    if (!e.isValid) {
      registry.delete(id);
      if (rec.kind === "gaunt") safe(() => rec.marker?.remove(), void 0);
      h.onGone(rec.playerId, rec.kind, "unloaded");
      continue;
    }
    const player = h.playerFor(rec.playerId);
    if (!player || !player.isValid || player.dimension.id !== e.dimension.id) {
      dispose(rec);
      registry.delete(id);
      if (player) h.onGone(rec.playerId, rec.kind, "dimension");
      continue;
    }
    clearStaleAction(rec, now);
    const dist = len(sub(e.location, player.location));
    const hp = health(player);
    const ehp = health(e);
    const hpFrac = ehp.max > 0 ? ehp.cur / ehp.max : 1;
    if (rec.kind === "lurker") {
      const ev = rec.tactics.step({
        dt: DT,
        age: (now - rec.spawnedTick) / 20,
        dist,
        seen: dist < 80 && canSee(player, e, 0.45),
        playerLit: h.isLit(rec.playerId),
        playerHealth: hp.cur,
        lurkerHealthFrac: hpFrac,
        hitsLanded: rec.hits,
        requested: h.requested(rec.playerId),
        gentle
      });
      trackHunt(rec, rec.tactics.state === "hunt");
      if (ev.length) applyLurker(rec, player, ev, now);
    } else {
      const sneaking = safe(() => player.isSneaking, false);
      const sees = dist < (sneaking ? 9 : 18) && creatureSees(e, player);
      if (sees) rec.lastSeen = { ...player.location };
      const markerDist = rec.marker?.isValid ? len(sub(e.location, rec.marker.location)) : Infinity;
      const ahead = aheadOf(rec.playerId, rec.markerSeq);
      const ev = rec.tactics.step({
        dt: DT,
        age: (now - rec.spawnedTick) / 20,
        dist,
        sees,
        playerInWater: safe(() => player.isInWater, false),
        playerHealth: hp.cur,
        hpFrac,
        hits: rec.hits,
        requested: h.requested(rec.playerId),
        gentle,
        markerDist,
        trailLeft: ahead.left,
        trailBroken: ahead.broken
      });
      trackHunt(rec, rec.tactics.state === "pursue" || rec.tactics.state === "roar");
      if (ev.length) applyGaunt(rec, player, ev, now);
    }
  }
}
function trackHunt(rec, hunting) {
  if (rec.wasHunting && !hunting) hooks?.onHuntEnded(rec.playerId);
  rec.wasHunting = hunting;
}
function clearStaleAction(rec, now) {
  const act = safe(() => rec.entity.getProperty("dread:action"), "none");
  if (act === "none" || act === "burrow") {
    rec.actionSince = 0;
    return;
  }
  if (rec.actionSince === 0) rec.actionSince = now;
  else if (now - rec.actionSince > 24) {
    safe(() => rec.entity.triggerEvent("dread:clear_action"), void 0);
    rec.actionSince = 0;
  }
}
function creatureSees(e, p) {
  return safe(() => {
    const from = { x: e.location.x, y: e.location.y + 1.3, z: e.location.z };
    const to = sub(p.getHeadLocation(), from);
    const l = len(to);
    if (l < 1) return true;
    return e.dimension.getBlockFromRay(from, { x: to.x / l, y: to.y / l, z: to.z / l }, { maxDistance: l - 0.5, includePassableBlocks: false, includeLiquidBlocks: false }) === void 0;
  }, false);
}
function vanish(rec, player, outcome) {
  const h = hooks;
  const e = rec.entity;
  const at = e.location;
  vanishEffect(e.dimension, at, rec.kind);
  if (player && rec.kind === "lurker") playCreatureSound(player, "lurker", "vanish", at, 0.9, readConfig());
  dispose(rec);
  registry.delete(e.id);
  h.onGone(rec.playerId, rec.kind, outcome);
}
function applyLurker(rec, player, events, now) {
  const h = hooks;
  const e = rec.entity;
  const cfg = readConfig();
  for (const ev of events) {
    switch (ev.type) {
      case "group":
        safe(() => e.triggerEvent(ev.event), void 0);
        break;
      case "sound":
        playCreatureSound(player, "lurker", ev.id, e.location, ev.volume, cfg);
        break;
      case "action":
        safe(() => e.setProperty("dread:action", ev.action), void 0);
        rec.actionSince = now;
        break;
      case "reposition": {
        const pos = findVantage(player, 26, 42, h.isUnderground(rec.playerId), rng);
        if (pos) {
          vanishEffect(e.dimension, e.location, "lurker");
          safe(() => e.teleport(pos, { facingLocation: player.location }), void 0);
        }
        break;
      }
      case "noticed":
        h.onNoticed(rec.playerId);
        break;
      case "stress":
        h.onStress(rec.playerId, ev.amount);
        break;
      case "vanish":
        return vanish(rec, player, ev.outcome);
    }
  }
}
function applyGaunt(rec, player, events, now) {
  const h = hooks;
  const e = rec.entity;
  const cfg = readConfig();
  for (const ev of events) {
    switch (ev.type) {
      case "group":
        safe(() => e.triggerEvent(ev.event), void 0);
        break;
      case "sound":
        playCreatureSound(player, "gaunt", ev.id, e.location, ev.volume, cfg);
        break;
      case "action":
        safe(() => e.setProperty("dread:action", ev.action), void 0);
        rec.actionSince = now;
        if (ev.action === "roar") playCreatureSound(player, "gaunt", "vocal", e.location, 1, cfg);
        if (ev.action === "burrow") vanishEffect(e.dimension, e.location, "gaunt");
        break;
      case "marker":
        if (ev.op === "next") {
          const next = aheadOf(rec.playerId, rec.markerSeq).next;
          if (next) {
            rec.markerSeq = next.seq;
            moveMarker(rec, player);
          }
        } else {
          rec.markerSeq = Math.max(0, newestSeq(rec.playerId) - 2);
          moveMarker(rec, player, rec.lastSeen ?? player.location);
        }
        break;
      case "encounter":
        h.onEncounter(rec.playerId, ev.kind);
        break;
      case "stress":
        h.onStress(rec.playerId, ev.amount);
        break;
      case "vanish":
        return vanish(rec, player, ev.outcome);
    }
  }
}
function adoptAndSweep() {
  const players = world5.getAllPlayers();
  const markers = /* @__PURE__ */ new Set();
  for (const r of registry.values()) if (r.kind === "gaunt" && r.marker) markers.add(r.marker.id);
  for (const dimId of ["overworld", "nether", "the_end"]) {
    const dim = safe(() => world5.getDimension(dimId), void 0);
    if (!dim) continue;
    for (const m of safe(() => dim.getEntities({ type: SCENT_TYPE }), [])) if (!markers.has(m.id)) safe(() => m.remove(), void 0);
    for (const kind of ["lurker", "gaunt"]) {
      for (const e of safe(() => dim.getEntities({ type: CREATURE_TYPE[kind] }), [])) {
        if (registry.has(e.id)) continue;
        let best;
        for (const p of players) {
          if (p.dimension.id !== e.dimension.id) continue;
          const d = len(sub(p.location, e.location));
          if (!best || d < best.d) best = { p, d };
        }
        if (best && best.d < 96) {
          if (kind === "lurker") registry.set(e.id, { kind, entity: e, playerId: best.p.id, tactics: new LurkerTactics(rng, "observe"), spawnedTick: system4.currentTick, hits: 0, actionSince: 0, wasHunting: false });
          else {
            const rec = { kind, entity: e, playerId: best.p.id, tactics: new GauntTactics(rng, "stalk"), spawnedTick: system4.currentTick, hits: 0, actionSince: 0, wasHunting: false, markerSeq: newestSeq(best.p.id) };
            registry.set(e.id, rec);
            moveMarker(rec, best.p);
          }
          logConsole(`adopted ${kind} ${e.id}`);
        } else if (e.hasTag(MANAGED_TAG)) {
          safe(() => e.remove(), void 0);
        }
      }
    }
  }
  void range;
}

// src/game/director.ts
import { GameMode as GameMode2, Difficulty } from "@minecraft/server";
var MEM_KEY = (id) => `dread:mem:${id}`;
var STEP_TICKS = 20;
var SCAN_EVERY = 3;
var SAVE_EVERY = 600;
var rt = /* @__PURE__ */ new Map();
var rng2 = mathRng;
var nextOffset = 0;
function initDirector(seed) {
  rng2 = seed === void 0 ? mathRng : makeRng(seed);
  initCreatures({
    playerFor: (id) => world6.getAllPlayers().find((p) => p.id === id),
    isLit: (id) => rt.get(id)?.surroundings.lit ?? false,
    isUnderground: (id) => !(rt.get(id)?.surroundings.skyVisible ?? true),
    requested: (id) => rt.get(id)?.tactic ?? "observe",
    onNoticed: (id) => rt.get(id)?.brain.onLurkerNoticed(worldSec()),
    onEncounter: (id, kind) => {
      const p = playerById(id);
      if (kind === "gaunt_seen" && p) unlockPage(p, "gaunt");
      rt.get(id)?.brain.onLurkerNoticed(worldSec());
    },
    onGone: (id, creature, outcome) => {
      rt.get(id)?.brain.onLurkerGone(worldSec(), creature === "lurker" ? outcome : `gaunt-${outcome}`);
      if (creature === "gaunt") {
        const gp = playerById(id);
        if (gp && outcome === "lost-scent") unlockPage(gp, "scent");
        return;
      }
      const page = { noticed: "noticed", spooked: "spooked", light: "light" }[outcome];
      const p = page ? playerById(id) : void 0;
      if (p && page) unlockPage(p, page);
    },
    onHuntEnded: (id) => {
      rt.get(id)?.brain.onHuntEnded(worldSec(), true);
      const p = playerById(id);
      if (p && p.isValid) unlockPage(p, "hunt");
    },
    onStress: (id, amount) => {
      const r = rt.get(id);
      if (!r) return;
      r.brain.memory.stress = Math.min(100, r.brain.memory.stress + amount);
      const p = world6.getAllPlayers().find((x) => x.id === id);
      if (p && amount >= 5) {
        shake(p, readConfig(), 0.12, 0.8);
        unlockPage(p, "close");
      }
    }
  }, rng2);
  world6.afterEvents.playerSpawn.subscribe((e) => {
    const r = ensure(e.player);
    r.respawnTick = system5.currentTick;
  });
  world6.afterEvents.playerLeave.subscribe((e) => {
    const r = rt.get(e.playerId);
    if (r) save(e.playerId, r);
    removeAll(e.playerId);
    forgetTrail(e.playerId);
    clearAtmosphere({ id: e.playerId });
    rt.delete(e.playerId);
  });
  world6.afterEvents.entityHurt.subscribe((e) => {
    if (e.hurtEntity instanceof Player6) {
      const r = rt.get(e.hurtEntity.id);
      if (r) r.lastHurtTick = system5.currentTick;
    }
  });
  world6.afterEvents.entityDie.subscribe((e) => {
    if (e.deadEntity instanceof Player6) {
      const r = rt.get(e.deadEntity.id);
      if (!r) return;
      removeAll(e.deadEntity.id);
      const hadEncounters = r.brain.memory.noticedCount > 0 || r.brain.memory.hunts > 0;
      r.brain.onPlayerDied(worldSec());
      if (hadEncounters) unlockPage(e.deadEntity, "death");
      r.tactic = "observe";
      logConsole(`player ${e.deadEntity.name} died; director in recovery`);
    }
  });
  system5.runInterval(() => {
    const now = system5.currentTick;
    for (const p of world6.getAllPlayers()) {
      const r = ensure(p);
      sampleTrail(p, now, r.surroundings.nearHome && r.surroundings.lit);
      if ((now + r.stepOffset) % STEP_TICKS !== 0) continue;
      stepPlayer(p, r, now);
    }
  }, 1);
  system5.runInterval(() => {
    for (const p of world6.getAllPlayers()) {
      const r = rt.get(p.id);
      if (r) save(p.id, r);
    }
  }, SAVE_EVERY);
}
var playerById = (id) => world6.getAllPlayers().find((p) => p.id === id);
var worldSec = () => safe(() => world6.getAbsoluteTime() / 20, system5.currentTick / 20);
function ensure(p) {
  let r = rt.get(p.id);
  if (r) return r;
  const mem = parseMemory(safe(() => world6.getDynamicProperty(MEM_KEY(p.id)), void 0), worldSec());
  r = {
    brain: new DirectorBrain(mem, rng2, system5.currentTick / 20),
    surroundings: { lit: false, nearHome: false, skyVisible: true },
    scannedAt: -1e9,
    lastHurtTick: -1e9,
    respawnTick: system5.currentTick,
    idleSince: system5.currentTick,
    lastPos: { ...p.location },
    tactic: "observe",
    stepOffset: (nextOffset += 7) % STEP_TICKS
  };
  rt.set(p.id, r);
  return r;
}
function save(id, r) {
  safe(() => world6.setDynamicProperty(MEM_KEY(id), serializeMemory(r.brain.memory)), void 0);
}
function snapshot(p, r, now) {
  const cfg = readConfig();
  if (now / 20 - r.scannedAt >= SCAN_EVERY) {
    r.surroundings = scanSurroundings(p);
    r.scannedAt = now / 20;
  }
  const hp = health(p);
  const moved = Math.hypot(p.location.x - r.lastPos.x, p.location.z - r.lastPos.z) > 0.5;
  if (moved) r.idleSince = now;
  r.lastPos = { ...p.location };
  const mode = safe(() => p.getGameMode(), GameMode2.Survival);
  return {
    t: now / 20,
    worldSec: worldSec(),
    playerId: p.id,
    dimension: dimensionKind(p.dimension),
    timeOfDay: safe(() => world6.getTimeOfDay(), 6e3),
    gameMode: mode === GameMode2.Creative ? "creative" : mode === GameMode2.Spectator ? "spectator" : mode === GameMode2.Adventure ? "adventure" : "survival",
    peaceful: safe(() => world6.getDifficulty() === Difficulty.Peaceful, false),
    health: hp.cur,
    maxHealth: hp.max,
    sinceHurt: (now - r.lastHurtTick) / 20,
    sinceRespawn: (now - r.respawnTick) / 20,
    skyVisible: r.surroundings.skyVisible,
    lit: r.surroundings.lit,
    nearHome: r.surroundings.nearHome,
    inWater: safe(() => p.isInWater, false),
    sleeping: safe(() => p.isSleeping, false),
    companions: allPlayersNear(p, 48),
    idleFor: (now - r.idleSince) / 20,
    globalActiveCreatures: creatureCount(),
    ownCreatures: creaturesOf(p.id),
    settings: { enabled: cfg.enabled, effects: cfg.effects, intensity: cfg.intensity }
  };
}
function stepPlayer(p, r, now) {
  if (!isPlayerSurvivalish(p) && !readConfig().debug) {
  }
  const snap = snapshot(p, r, now);
  const actions = r.brain.step(snap);
  if (actions.length) apply(p, r, actions, snap);
  const daylight = snap.skyVisible && (snap.timeOfDay < 12500 || snap.timeOfDay > 23500);
  const m = r.brain.memory;
  if (m.noticedCount > 0 && !daylight) {
    if (snap.nearHome && snap.lit) unlockPage(p, "home");
    if (snap.companions >= 2) unlockPage(p, "many");
  }
  setAtmosphere(p, r.brain.memory.state, readConfig(), daylight);
}
function apply(p, r, actions, snap) {
  const cfg = readConfig();
  for (const a of actions) {
    switch (a.type) {
      case "ambient":
        playAmbient(p, a, cfg, rng2, r.brain.memory.stress);
        if (a.kind !== "heartbeat" && a.kind !== "pressure_drop") unlockPage(p, "sound");
        break;
      case "spawnCreature": {
        r.tactic = a.tactic;
        const ok = spawnCreature(p, a.creature, a.tactic, a.minDist, a.maxDist, !snap.skyVisible);
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
function describe(p) {
  const r = ensure(p);
  const m = r.brain.memory;
  const recent = m.history.slice(-6).map((h) => h.id).join(", ") || "-";
  return [
    `state=${m.state} stress=${m.stress.toFixed(0)} dread=${m.dread.toFixed(0)} lit=${r.surroundings.lit} home=${r.surroundings.nearHome} sky=${r.surroundings.skyVisible}`,
    `hunts=${m.hunts} survived=${m.survivedHunts} noticed=${m.noticedCount} creatures(own/global)=${creaturesOf(p.id)}/${creatureCount()}`,
    `recent: ${recent}`
  ];
}
function debugSpawn(p, tactic, creature = "lurker") {
  const r = ensure(p);
  r.tactic = tactic;
  if (tactic === "hunt") shake(p, readConfig(), 0.25, 1.5);
  return spawnCreature(p, creature, tactic, 14, 24, !r.surroundings.skyVisible);
}
function debugSet(p, field, value) {
  const r = ensure(p);
  r.brain.memory[field] = Math.max(0, Math.min(100, value));
}
function debugForce(p, state) {
  ensure(p).brain.forceState(state, worldSec(), system5.currentTick / 20);
}
function debugClear(p) {
  return removeAll(p?.id);
}
function debugResetMemory(p) {
  const r = ensure(p);
  Object.assign(r.brain.memory, freshMemory(worldSec()));
  debug("director memory reset");
}
var EVENT_IDS = EVENTS.map((e) => e.id);

// src/core/commands.ts
var HELP = [
  "\xA77/scriptevent dread:status",
  "\xA77/scriptevent dread:set <setting> <value>",
  "\xA77/scriptevent dread:reset",
  "\xA77/scriptevent dread:sound all  (audio test)",
  "\xA77/scriptevent dread:state  (director status)",
  "\xA77/scriptevent dread:spawn observe|stalk|hunt   dread:spawn gaunt [stalk|hunt]",
  "\xA77/scriptevent dread:force dormant|unease|observation|escalation|hunt|recovery",
  "\xA77/scriptevent dread:stress <0-100>   dread:dread <0-100>   dread:clear   dread:forget",
  "\xA77Settings: " + Object.keys(DEFAULTS).join(", ")
];
function registerCommands() {
  system6.afterEvents.scriptEventReceive.subscribe((event) => {
    if (!event.id.startsWith("dread:")) return;
    const command = event.id.slice("dread:".length);
    const player = event.sourceEntity instanceof Player7 ? event.sourceEntity : void 0;
    const reply = (m) => tell(m, player);
    switch (command) {
      case "status": {
        const c = readConfig();
        reply(`v${ADDON_VERSION} (${BUILD_STAGE}) \u2014 players online: ${world7.getAllPlayers().length}`);
        reply(
          `enabled=${c.enabled} intensity=${c.intensity} sound=${c.soundIntensity} jumpscare=${c.jumpscareIntensity} effects=${c.effects} debug=${c.debug}`
        );
        break;
      }
      case "set": {
        const [name, value] = event.message.trim().split(/\s+/);
        if (!name || value === void 0) {
          reply("Usage: dread:set <setting> <value>");
          break;
        }
        const result = setConfigValue(name, value);
        reply(result.ok ? `${name} = ${result.value}` : `\xA7c${result.error}`);
        break;
      }
      case "reset":
        resetConfig();
        reply("Settings reset to defaults.");
        break;
      case "state":
        if (player) describe(player).forEach(reply);
        break;
      case "spawn": {
        const [a, b] = event.message.trim().split(/\s+/);
        const creature = a === "gaunt" ? "gaunt" : "lurker";
        const tactic = creature === "gaunt" ? b ?? "stalk" : a;
        if (!player || !["observe", "stalk", "hunt"].includes(tactic) || creature === "gaunt" && tactic === "observe") {
          reply("Usage: dread:spawn observe|stalk|hunt  or  dread:spawn gaunt [stalk|hunt]");
          break;
        }
        reply(debugSpawn(player, tactic, creature) ? `Spawned a ${tactic} ${creature}.` : "\xA7cNo valid spot found nearby.");
        break;
      }
      case "force": {
        const st = event.message.trim();
        if (!player || !["dormant", "unease", "observation", "escalation", "hunt", "recovery"].includes(st)) {
          reply("Usage: dread:force <state>");
          break;
        }
        debugForce(player, st);
        if (st === "hunt") debugSpawn(player, "hunt");
        if (st === "observation") debugSpawn(player, "observe");
        if (st === "escalation") debugSpawn(player, "stalk");
        reply(`Director forced to ${st}.`);
        break;
      }
      case "stress":
      case "dread": {
        const n = Number(event.message.trim());
        if (!player || !Number.isFinite(n)) {
          reply(`Usage: dread:${command} <0-100>`);
          break;
        }
        debugSet(player, command, n);
        reply(`${command} = ${Math.max(0, Math.min(100, n))}`);
        break;
      }
      case "clear":
        reply(`Removed ${debugClear(player)} Lurker(s).`);
        break;
      case "forget":
        if (player) debugResetMemory(player);
        reply("Director memory reset for you.");
        break;
      case "sound":
        playSoundTest(player, event.message.trim());
        break;
      case "help":
        HELP.forEach(reply);
        break;
      default:
        reply(`\xA7cUnknown command "${command}".`);
        HELP.forEach(reply);
    }
  });
}

// src/main.ts
logConsole(`script loaded v${ADDON_VERSION} (${BUILD_STAGE})`);
registerCommands();
initDirector();
initJournal();
world8.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  const config = readConfig();
  if (!config.enabled || !config.debug) return;
  system7.runTimeout(() => {
    event.player.onScreenDisplay.setActionBar(`\xA78DREAD \xA77v${ADDON_VERSION} loaded \u2014 use the Field Journal for settings`);
  }, 100);
});
