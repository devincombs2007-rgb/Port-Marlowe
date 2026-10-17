import { chance, range, type Rng } from "../util/rng";
import type { Action, Bearing, DirectorState, EncounterRecord, Snapshot } from "./types";

/**
 * Weighted ambient-anomaly catalogue. Each event states when it is appropriate; the director picks among
 * eligible events by weight, penalises recent repeats, and enforces per-event cooldowns. Nothing here is hostile.
 */
export interface AmbientEvent {
  id: string;
  /** States in which this event may fire. */
  states: readonly DirectorState[];
  cooldown: number; // seconds
  /** Base weight given context, stress and the creature currently assigned (if any); <= 0 means "not now". */
  weight(s: Snapshot, stress: number, active?: "lurker" | "gaunt"): number;
  build(rng: Rng, s: Snapshot): Action[];
}

const night = (s: Snapshot) => s.timeOfDay >= 13000 && s.timeOfDay < 23000;
const alone = (s: Snapshot) => s.companions === 0;
const outdoors = (s: Snapshot) => s.skyVisible;
const pickBearing = (rng: Rng, list: Bearing[]): Bearing => list[Math.floor(rng.next() * list.length)] as Bearing;
const amb = (kind: Extract<Action, { type: "ambient" }>["kind"], bearing: Bearing, distance: number, volume: number): Action =>
  ({ type: "ambient", kind, bearing, distance, volume });

const UNEASE_PLUS: DirectorState[] = ["unease", "observation", "escalation"];
const NEAR_STATES: DirectorState[] = ["observation", "escalation"];

export const EVENTS: readonly AmbientEvent[] = [
  {
    id: "snap_behind", states: UNEASE_PLUS, cooldown: 70,
    weight: (s) => (outdoors(s) ? 3 : 1) * (night(s) ? 1.4 : 0.8),
    build: (rng) => [amb("branch_snap", "behind", range(rng, 12, 24), 0.9)],
  },
  {
    id: "rustle_side", states: UNEASE_PLUS, cooldown: 60,
    weight: (s) => (outdoors(s) ? 2.6 : 0),
    build: (rng) => [amb("leaves_rustle", pickBearing(rng, ["left", "right"]), range(rng, 7, 15), 0.8)],
  },
  {
    id: "door_far", states: UNEASE_PLUS, cooldown: 110,
    weight: (s) => (alone(s) ? 1.6 : 0.5),
    build: (rng) => [amb("door_creak", pickBearing(rng, ["around", "front_far", "behind"]), range(rng, 16, 30), 0.8)],
  },
  {
    id: "groan", states: UNEASE_PLUS, cooldown: 120,
    weight: (s) => (outdoors(s) ? 0.5 : 3.2),
    build: (rng) => [amb("structure_groan", "around", range(rng, 14, 28), 0.8)],
  },
  {
    id: "drag", states: UNEASE_PLUS, cooldown: 150,
    weight: (s, st) => (st >= 25 ? 1.6 : 0.4),
    build: (rng) => [amb("drag", pickBearing(rng, ["behind", "left", "right"]), range(rng, 14, 26), 0.8)],
  },
  {
    id: "murmur", states: UNEASE_PLUS, cooldown: 160,
    weight: (s, st) => (st >= 35 ? (alone(s) ? 2.4 : 1.0) : 0),
    build: (rng) => [amb("murmur", pickBearing(rng, ["behind", "around"]), range(rng, 10, 22), 0.55)],
  },
  {
    id: "cry_far", states: UNEASE_PLUS, cooldown: 200,
    weight: (s, st) => (st >= 20 && outdoors(s) && night(s) ? 1.6 : 0),
    build: (rng) => [amb("distant_cry", "front_far", range(rng, 36, 60), 0.5)],
  },
  {
    id: "steps_far", states: UNEASE_PLUS, cooldown: 90,
    weight: (s, st) => (st >= 15 && alone(s) ? 2.2 : 0.5),
    build: (rng) => [amb("footsteps_far", pickBearing(rng, ["behind", "around"]), range(rng, 18, 32), 0.7)],
  },
  {
    id: "heartbeat", states: ["escalation", "observation"], cooldown: 120,
    weight: (_s, st) => (st >= 55 ? 2.0 : 0),
    build: () => [amb("heartbeat", "around", 1, 0.75), { type: "stress", amount: 1.5 }],
  },
  {
    id: "lurker_breath", states: NEAR_STATES, cooldown: 80,
    weight: (_s, st, act) => (st >= 40 && act !== "gaunt" ? 2.0 : 0),
    build: (rng) => [amb("lurker_breath", "behind", range(rng, 4, 8), 0.8)],
  },
  {
    id: "lurker_creak", states: NEAR_STATES, cooldown: 90,
    weight: (_s, st, act) => (st >= 35 && act !== "gaunt" ? 1.6 : 0),
    build: (rng) => [amb("lurker_creak", pickBearing(rng, ["left", "right", "behind"]), range(rng, 6, 12), 0.8)],
  },
  {
    id: "lurker_scrape", states: NEAR_STATES, cooldown: 130,
    weight: (s, _st, act) => (act === "gaunt" ? 0 : outdoors(s) ? 1.8 : 1.0),
    build: (rng) => [amb("lurker_scrape", pickBearing(rng, ["left", "right", "front_far"]), range(rng, 9, 16), 0.8)],
  },
  {
    id: "lurker_steps", states: ["escalation"], cooldown: 75,
    weight: (_s, st, act) => (st >= 45 && act !== "gaunt" ? 2.2 : 0),
    build: (rng) => [amb("lurker_step", "behind", range(rng, 6, 12), 0.7), chance(rng, 0.5) ? amb("lurker_step", "behind", range(rng, 5, 9), 0.7) : { type: "note", text: "single step" }],
  },
  {
    id: "gaunt_scrape", states: ["escalation"], cooldown: 70,
    weight: (s, _st, act) => (act === "gaunt" ? (s.skyVisible ? 1.6 : 2.6) : 0),
    build: (rng) => [amb("gaunt_scrape", pickBearing(rng, ["behind", "left", "right"]), range(rng, 10, 20), 0.8)],
  },
  {
    id: "gaunt_sniff", states: ["escalation"], cooldown: 60,
    weight: (_s, st, act) => (act === "gaunt" && st >= 35 ? 2.4 : 0),
    build: (rng) => [amb("gaunt_sniff", "behind", range(rng, 8, 16), 0.9)],
  },
];

/** Penalises recently used events so the player does not get the same trick twice running. */
export function repetitionFactor(id: string, history: readonly EncounterRecord[], worldSec: number): number {
  let recent = 0;
  for (let i = history.length - 1, seen = 0; i >= 0 && seen < 8; i--, seen++) {
    const h = history[i] as EncounterRecord;
    if (h.id === id && worldSec - h.worldSec < 1800) recent++;
  }
  return 1 / (1 + 2.5 * recent);
}
