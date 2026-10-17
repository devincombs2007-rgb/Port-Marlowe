import type { Vec3 } from "../util/vec";

export type DirectorState = "dormant" | "unease" | "observation" | "escalation" | "hunt" | "recovery";

/** Everything the director is allowed to know about one player at one instant. Pure data so the brain is testable. */
export interface Snapshot {
  /** Monotonic seconds since the world started ticking this session (not persisted). */
  t: number;
  /** World absolute time in seconds (persisted-time axis for history). */
  worldSec: number;
  playerId: string;
  dimension: "overworld" | "nether" | "end" | "other";
  /** 0..24000 ticks. 13000-23000 is night. */
  timeOfDay: number;
  gameMode: "survival" | "adventure" | "creative" | "spectator";
  peaceful: boolean;
  health: number;
  maxHealth: number;
  /** Seconds since the player last took damage (Infinity if none this session). */
  sinceHurt: number;
  /** Seconds since the player last respawned (Infinity if none this session). */
  sinceRespawn: number;
  skyVisible: boolean;
  /** Player is standing near or holding a real light source (counterplay and recovery). */
  lit: boolean;
  /** Within a few blocks of a bed / campfire: a "safe place". */
  nearHome: boolean;
  inWater: boolean;
  sleeping: boolean;
  /** Other (non-spectator) players within 48 blocks. */
  companions: number;
  /** Seconds the player has been continuously moving vs standing (activity cue), 0..N. */
  idleFor: number;
  /** Creatures (any player) currently alive, for global caps. */
  globalActiveCreatures: number;
  /** Creatures currently assigned to this player. */
  ownCreatures: number;
  /** Player's settings. */
  settings: { enabled: boolean; effects: "performance" | "balanced" | "cinematic"; intensity: number };
}

export type AmbientKind =
  | "branch_snap" | "leaves_rustle" | "door_creak" | "structure_groan" | "drag" | "murmur"
  | "distant_cry" | "heartbeat" | "pressure_drop" | "footsteps_far" | "lurker_breath" | "lurker_step"
  | "lurker_creak" | "lurker_scrape" | "gaunt_scrape" | "gaunt_sniff";

export type Bearing = "behind" | "left" | "right" | "front_far" | "around";

export type Tactic = "observe" | "stalk" | "hunt";
export type Creature = "lurker" | "gaunt";

export type Action =
  | { type: "ambient"; kind: AmbientKind; bearing: Bearing; distance: number; volume: number }
  | { type: "spawnCreature"; creature: Creature; tactic: Tactic; minDist: number; maxDist: number }
  | { type: "setTactic"; tactic: Tactic }
  | { type: "retreatLurkers"; reason: string }
  | { type: "stress"; amount: number }
  | { type: "note"; text: string };

export interface EncounterRecord {
  /** event id or "state:<name>" */
  id: string;
  worldSec: number;
}

/** Persistent per-player director memory, serialised to world dynamic properties. */
export interface Memory {
  v: 1;
  state: DirectorState;
  stateSince: number; // worldSec
  /** Rolling log of what has happened to this player (capped). */
  history: EncounterRecord[];
  hunts: number;
  noticedCount: number; // times the player spotted a Lurker (seen -> it vanished)
  survivedHunts: number;
  lastHuntEnd: number; // worldSec
  lastDeath: number; // worldSec
  stress: number;
  /** Encounter-driven build-up (0-100). Rises with frights, decays slowly; gates escalation into a hunt. */
  dread: number;
}

export interface Brain {
  readonly memory: Memory;
  step(s: Snapshot): Action[];
  /** Adapter feedback. */
  onLurkerNoticed(worldSec: number): void;
  onLurkerGone(worldSec: number, reason: string): void;
  onPlayerDied(worldSec: number): void;
  onHuntEnded(worldSec: number, survived: boolean): void;
}
