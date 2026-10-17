import { clamp } from "../util/rng";
import { freshMemory } from "./brain";
import type { DirectorState, EncounterRecord, Memory } from "./types";

const STATES: readonly DirectorState[] = ["dormant", "unease", "observation", "escalation", "hunt", "recovery"];

export function serializeMemory(m: Memory): string {
  return JSON.stringify(m);
}

const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Defensive parse: anything corrupt, truncated or from a future version falls back to a fresh memory. */
export function parseMemory(raw: unknown, worldSec: number): Memory {
  if (typeof raw !== "string") return freshMemory(worldSec);
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return freshMemory(worldSec);
  }
  if (typeof j !== "object" || j === null) return freshMemory(worldSec);
  const o = j as Record<string, unknown>;
  if (o.v !== 1) return freshMemory(worldSec);
  const history: EncounterRecord[] = [];
  if (Array.isArray(o.history)) {
    for (const h of o.history.slice(-40)) {
      if (typeof h === "object" && h !== null && typeof (h as EncounterRecord).id === "string" && Number.isFinite((h as EncounterRecord).worldSec)) {
        history.push({ id: String((h as EncounterRecord).id).slice(0, 48), worldSec: (h as EncounterRecord).worldSec });
      }
    }
  }
  const state = STATES.includes(o.state as DirectorState) ? (o.state as DirectorState) : "dormant";
  return {
    v: 1, state, stateSince: num(o.stateSince, worldSec), history,
    hunts: Math.max(0, Math.floor(num(o.hunts, 0))), noticedCount: Math.max(0, Math.floor(num(o.noticedCount, 0))),
    survivedHunts: Math.max(0, Math.floor(num(o.survivedHunts, 0))),
    lastHuntEnd: num(o.lastHuntEnd, -1e9), lastDeath: num(o.lastDeath, -1e9), stress: clamp(num(o.stress, 10), 0, 100), dread: clamp(num(o.dread, 0), 0, 100),
    ...(o.metMimic === true ? { metMimic: true } : {}),
  };
}
