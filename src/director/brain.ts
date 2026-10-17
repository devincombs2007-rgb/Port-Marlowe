import { chance, clamp, pickWeighted, range, type Rng } from "../util/rng";
import { EVENTS, repetitionFactor, type AmbientEvent } from "./events";
import { updateStress } from "./stress";
import type { Action, Brain, Creature, DirectorState, EncounterRecord, Memory, Snapshot } from "./types";

/**
 * The Horror Director's per-player brain: a six-state machine (dormant, unease, observation, escalation,
 * hunt, recovery) driven by contextual stress, weighted events, cooldowns and persistent encounter memory.
 *
 * Pure: no Minecraft API in here. `step()` is called about once a second with a Snapshot and returns Actions.
 * Hard fairness rules (see `blockedReason`) are checked before anything hostile can happen.
 */

export const TUNING = {
  // seconds
  huntCooldown: 1500, // min gap between hunts for one player
  deathGrace: 1200, // no hunts/escalation after a death
  respawnGrace: 180, // no hostile encounters right after respawning
  maxHuntSeconds: 90,
  huntMinHealth: 10, // half-hearts (5 hearts)
  huntAbortHealth: 6,
  historyCap: 40,
  globalLurkerCap: 3,
};

interface Timers {
  stateEndsAt: number; // session t
  nextCheckAt: number;
  nextEventAt: number;
  lastEvent: Map<string, number>; // event id -> session t
  huntStartedAt: number;
  observationSpawns: number;
  noticedThisPhase: number;
  respawnLurkerAt: number; // when to place a replacement observer (0 = none)
  active?: Creature; // which creature the last spawn sent
  pendingHuntRetreat: boolean;
  lastTickT: number;
}

export function freshMemory(worldSec: number): Memory {
  return {
    v: 1, state: "dormant", stateSince: worldSec, history: [], hunts: 0, noticedCount: 0,
    survivedHunts: 0, lastHuntEnd: -1e9, lastDeath: -1e9, stress: 10, dread: 0,
  };
}

const night = (s: Snapshot) => s.timeOfDay >= 13000 && s.timeOfDay < 23000;
/** Sparse, scale-friendly intensity multiplier: 0 -> far quieter, 100 -> far busier. */
const pace = (s: Snapshot) => {
  const i = clamp(s.settings.intensity, 0, 100) / 100;
  const fx = s.settings.effects === "performance" ? 0.75 : s.settings.effects === "cinematic" ? 1.1 : 1;
  return (0.35 + 1.05 * i) * fx; // events per unit time multiplier
};

export function blockedReason(s: Snapshot, m: Memory, forHunt: boolean): string | undefined {
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
  return undefined;
}

export class DirectorBrain implements Brain {
  readonly memory: Memory;
  private readonly rng: Rng;
  private readonly tm: Timers;

  constructor(memory: Memory, rng: Rng, nowT = 0) {
    this.memory = memory;
    this.rng = rng;
    // Never resume mid-encounter after a reload: active states settle to recovery.
    if (memory.state === "observation" || memory.state === "escalation" || memory.state === "hunt") memory.state = "recovery";
    this.tm = {
      stateEndsAt: nowT + this.durationFor(memory.state, nowT),
      nextCheckAt: nowT + 5, nextEventAt: nowT + 20, lastEvent: new Map(),
      huntStartedAt: 0, observationSpawns: 0, noticedThisPhase: 0, respawnLurkerAt: 0, pendingHuntRetreat: false, lastTickT: nowT,
    };
  }

  // -- adapter feedback ---------------------------------------------------------------------
  onLurkerNoticed(worldSec: number): void {
    this.memory.noticedCount++;
    this.tm.noticedThisPhase++;
    this.log("noticed", worldSec);
    this.memory.stress = clamp(this.memory.stress + 6, 0, 100);
    this.memory.dread = clamp(this.memory.dread + 10, 0, 100);
  }

  onLurkerGone(worldSec: number, reason: string): void {
    this.log(`lurker_gone:${reason}`, worldSec);
    // An observer that vanished may reposition and watch again, within limits.
    if (this.memory.state === "observation" && reason === "noticed" && this.tm.observationSpawns < 3) {
      this.tm.respawnLurkerAt = this.tm.lastTickT + range(this.rng, 25, 75);
    }
  }

  onPlayerDied(worldSec: number): void {
    this.memory.lastDeath = worldSec;
    this.memory.stress = 30;
    this.memory.dread = 0;
    this.enter("recovery", worldSec, this.tm.lastTickT, range(this.rng, 900, 1500));
  }

  onHuntEnded(worldSec: number, survived: boolean): void {
    this.memory.lastHuntEnd = worldSec;
    if (survived) this.memory.survivedHunts++;
    this.memory.dread *= 0.2; // the chase spends it
    this.log(survived ? "hunt_survived" : "hunt_failed", worldSec);
    if (this.memory.state === "hunt") this.enter("recovery", worldSec, this.tm.lastTickT, range(this.rng, 480, 900));
  }

  /** Developer override (commands/tests): jump straight to a state. Hostile states still obey step() safety gates. */
  forceState(state: DirectorState, worldSec: number, t: number): void {
    this.enter(state, worldSec, t);
    if (state === "hunt") this.tm.huntStartedAt = t;
  }

  // -- main step ----------------------------------------------------------------------------
  step(s: Snapshot): Action[] {
    const out: Action[] = [];
    if (s.ownCreatures === 0 && this.memory.state !== "observation" && this.memory.state !== "escalation" && this.memory.state !== "hunt") this.tm.active = undefined;
    const dt = clamp(s.t - this.tm.lastTickT, 0, 30);
    this.tm.lastTickT = s.t;
    this.memory.stress = updateStress(this.memory.stress, s, dt);
    // Dread: encounter-driven build-up. Decays with a ~3 minute half-life (3x faster in recovery / safe places).
    const calm = this.memory.state === "recovery" || s.lit || s.nearHome;
    this.memory.dread *= Math.exp(-dt / (calm ? 90 : 260));
    if (this.memory.state === "escalation" && s.ownCreatures > 0) this.memory.dread = Math.min(100, this.memory.dread + 0.6 * dt);

    const block = blockedReason(s, this.memory, false);
    if (block) {
      // While blocked we never create hostile encounters; also stand down any active ones.
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

  private dispatch(s: Snapshot, out: Action[]): void {
    switch (this.memory.state) {
      case "dormant": this.stepDormant(s, out); break;
      case "unease": this.stepUnease(s, out); break;
      case "observation": this.stepObservation(s, out); break;
      case "escalation": this.stepEscalation(s, out); break;
      case "hunt": this.stepHunt(s, out); break;
      case "recovery": this.stepRecovery(s, out); break;
    }
  }

  // -- states -------------------------------------------------------------------------------
  private stepDormant(s: Snapshot, out: Action[]): void {
    if (s.t < this.tm.stateEndsAt || s.t < this.tm.nextCheckAt) return;
    this.tm.nextCheckAt = s.t + 10;
    // Safe places keep the world ordinary; the rest period quietly extends there.
    if (s.nearHome && s.lit) {
      this.tm.stateEndsAt = s.t + 30;
      return;
    }
    const p = (0.12 + this.memory.stress * 0.006) * pace(s);
    if (chance(this.rng, p)) this.enter("unease", s.worldSec, s.t);
    void out;
  }

  private stepUnease(s: Snapshot, out: Action[]): void {
    this.ambientTick(s, out);
    if (s.t < this.tm.nextCheckAt) return;
    this.tm.nextCheckAt = s.t + 10;

    const age = s.t - (this.tm.stateEndsAt - this.durationFor("unease", s.t));
    const dark = night(s) || !s.skyVisible;
    const eligible = dark && this.memory.stress >= 25 && s.companions <= 1 && !blockedReason(s, this.memory, false) && s.globalActiveCreatures < TUNING.globalLurkerCap;
    if (age > 120 && eligible && chance(this.rng, 0.17 * pace(s))) {
      if (chance(this.rng, 0.4)) out.push({ type: "ambient", kind: "pressure_drop", bearing: "around", distance: 1, volume: 0.8 });
      this.enter("observation", s.worldSec, s.t);
      this.tm.respawnLurkerAt = s.t + range(this.rng, 4, 14); // first appearance comes a moment after the stinger
      return;
    }
    if (s.t >= this.tm.stateEndsAt) this.enter(this.memory.stress < 30 ? "dormant" : "recovery", s.worldSec, s.t);
  }

  private stepObservation(s: Snapshot, out: Action[]): void {
    this.ambientTick(s, out);
    if (this.tm.respawnLurkerAt > 0 && s.t >= this.tm.respawnLurkerAt && s.ownCreatures === 0) {
      this.tm.respawnLurkerAt = 0;
      if (s.globalActiveCreatures < TUNING.globalLurkerCap) {
        this.tm.observationSpawns++;
        const watcher = this.pickWatcher(s);
        out.push(watcher === "mimic"
          ? { type: "spawnCreature", creature: "mimic", tactic: "observe", minDist: 20, maxDist: 32 }
          : { type: "spawnCreature", creature: "lurker", tactic: "observe", minDist: 26, maxDist: 42 });
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
      // The player never noticed it: sometimes it grows bolder, otherwise it loses interest.
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

  private stepEscalation(s: Snapshot, out: Action[]): void {
    this.ambientTick(s, out);
    if (s.t < this.tm.nextCheckAt) return;
    this.tm.nextCheckAt = s.t + 8;

    if (s.lit || s.nearHome) {
      // Counterplay: light and shelter push it back. The director respects that.
      out.push({ type: "retreatLurkers", reason: "light" });
      this.enter("recovery", s.worldSec, s.t);
      return;
    }
    const huntBlock = blockedReason(s, this.memory, true);
    if (!huntBlock && this.memory.dread >= 45 && this.memory.stress >= 35 && (night(s) || !s.skyVisible)) {
      const p = (0.05 + (this.memory.dread - 45) * 0.006) * pace(s);
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

  private stepHunt(s: Snapshot, out: Action[]): void {
    const age = s.t - this.tm.huntStartedAt;
    const abort =
      s.health <= TUNING.huntAbortHealth ? "health" :
      s.lit || s.nearHome ? "safe-place" :
      age > TUNING.maxHuntSeconds ? "timeout" :
      s.companions >= 2 ? "group" : undefined;
    if (abort) {
      out.push({ type: "retreatLurkers", reason: `hunt-${abort}` });
      this.onHuntEnded(s.worldSec, true);
      return;
    }
    if (s.ownCreatures === 0 && age > 8) this.onHuntEnded(s.worldSec, true); // lurker gave up or was killed
  }

  private stepRecovery(s: Snapshot, out: Action[]): void {
    // Only gentle, low-stress anomalies, and rarely.
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
  private pickHunter(s: Snapshot): Creature {
    if (this.memory.noticedCount < 2) return "lurker";
    return chance(this.rng, s.skyVisible ? 0.3 : 0.55) ? "gaunt" : "lurker";
  }

  /**
   * Who does the watching. Usually the Lurker; once the player knows the Lurker, a night under open sky may send
   * the Mimic instead, standing in a field like any other animal.
   */
  private pickWatcher(s: Snapshot): Creature {
    if (this.memory.noticedCount < 1 || !s.skyVisible || !night(s)) return "lurker";
    return chance(this.rng, 0.35) ? "mimic" : "lurker";
  }

  private metMimic(): boolean {
    return this.memory.history.some((h) => h.id.startsWith("mimic")) || this.memory.metMimic === true;
  }

  /** Adapter feedback: the player has seen through a Mimic. */
  onMimicMet(worldSec: number): void {
    this.memory.metMimic = true;
    this.log("mimic_met", worldSec);
  }

  // -- shared machinery ---------------------------------------------------------------------
  private ambientTick(s: Snapshot, out: Action[]): void {
    if (s.t < this.tm.nextEventAt) return;
    // Irregular gaps: busier when stressed, quieter when relaxed, never metronomic.
    const base = this.memory.state === "escalation" ? [10, 36] : this.memory.state === "observation" ? [14, 48] : [18, 70];
    const stressFactor = 1.5 - this.memory.stress / 100;
    this.tm.nextEventAt = s.t + (range(this.rng, base[0] as number, base[1] as number) * stressFactor) / pace(s);
    this.fireEvent(s, out);
  }

  private fireEvent(s: Snapshot, out: Action[], onlyIds?: string[]): void {
    const stress = this.memory.stress;
    const candidates: AmbientEvent[] = EVENTS.filter((e) =>
      e.states.includes(this.memory.state) &&
      (!onlyIds || onlyIds.includes(e.id)) &&
      s.t - (this.tm.lastEvent.get(e.id) ?? -1e9) >= e.cooldown &&
      e.weight(s, stress, this.tm.active, this.metMimic()) > 0);
    const ev = pickWeighted(this.rng, candidates, (e) => e.weight(s, stress, this.tm.active, this.metMimic()) * repetitionFactor(e.id, this.memory.history, s.worldSec));
    if (!ev) return;
    this.tm.lastEvent.set(ev.id, s.t);
    this.log(ev.id, s.worldSec);
    for (const a of ev.build(this.rng, s)) out.push(a);
    // Every anomaly leaves a mark: close-range Lurker cues unsettle far more than distant noises.
    const close = ev.id.startsWith("lurker_") || ev.id.startsWith("gaunt_");
    this.memory.stress = clamp(this.memory.stress + (close ? 2.2 : 1.0), 0, 100);
    this.memory.dread = clamp(this.memory.dread + (close ? 7 : 3), 0, 100);
  }

  private enter(state: DirectorState, worldSec: number, t: number, duration?: number): void {
    this.memory.state = state;
    this.memory.stateSince = worldSec;
    this.tm.stateEndsAt = t + (duration ?? this.durationFor(state, t));
    this.tm.nextCheckAt = t + 5;
    this.tm.nextEventAt = t + range(this.rng, 8, 30);
    this.tm.observationSpawns = 0;
    this.tm.noticedThisPhase = 0;
    this.tm.respawnLurkerAt = 0;
    this.log(`state:${state}`, worldSec);
  }

  private durationFor(state: DirectorState, _t: number): number {
    const r = this.rng;
    switch (state) {
      // long-tailed: usually a few minutes, occasionally much longer, so quiet never has a predictable length
      case "dormant": return range(r, 150, 420) * (0.55 + r.next() * r.next() * 1.6) * (1.25 - this.memory.stress / 160);
      case "unease": return range(r, 150, 420);
      case "observation": return range(r, 90, 300);
      case "escalation": return range(r, 120, 330);
      case "hunt": return TUNING.maxHuntSeconds;
      case "recovery": return range(r, 240, 600);
    }
  }

  private log(id: string, worldSec: number): void {
    const h = this.memory.history;
    h.push({ id, worldSec } satisfies EncounterRecord);
    if (h.length > TUNING.historyCap) h.splice(0, h.length - TUNING.historyCap);
  }
}
