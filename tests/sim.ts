import { DirectorBrain, blockedReason, freshMemory } from "../src/director/brain";
import type { Action, DirectorState, Snapshot } from "../src/director/types";
import { makeRng } from "../src/util/rng";

export type Ctx = Partial<Snapshot>;
export const base = (over: Ctx = {}): Snapshot => ({
  t: 0, worldSec: 100000, playerId: "p1", dimension: "overworld", timeOfDay: 18000, gameMode: "survival", peaceful: false,
  health: 20, maxHealth: 20, sinceHurt: 9999, sinceRespawn: 9999, skyVisible: false, lit: false, nearHome: false, inWater: false,
  sleeping: false, companions: 0, idleFor: 0, globalActiveLurkers: 0, ownLurkers: 0,
  settings: { enabled: true, effects: "balanced", intensity: 60 }, ...over,
});

export interface SimResult {
  perState: Record<DirectorState, number>;
  actions: { t: number; a: Action; state: DirectorState }[];
  hunts: { start: number; end: number; healthAtStart: number }[];
  dormantDurations: number[];
  statesVisited: Set<DirectorState>;
  hostileWhileBlocked: number;
  events: Record<string, number>;
  stressSum: number;
  escalations: number;
}

/** Runs one player's brain for `hours` of game time against a context function, with a crude Lurker model as the adapter. */
export function simulate(seed: number, hours: number, ctx: (t: number) => Ctx, opts: { noticeProb?: number } = {}): SimResult {
  const rng = makeRng(seed);
  const world = makeRng(seed ^ 0xabcdef);
  const brain = new DirectorBrain(freshMemory(100000), rng, 0);
  const res: SimResult = {
    perState: { dormant: 0, unease: 0, observation: 0, escalation: 0, hunt: 0, recovery: 0 }, actions: [], hunts: [],
    dormantDurations: [], statesVisited: new Set(), hostileWhileBlocked: 0, events: {}, stressSum: 0, escalations: 0,
  };
  let lurker: { tactic: string; since: number; noticeAt: number } | undefined;
  let lastState: DirectorState = brain.memory.state;
  let stateStart = 0;
  let huntStart = -1;
  for (let t = 1; t <= hours * 3600; t++) {
    const snap = base({ t, worldSec: 100000 + t, ...ctx(t), ownLurkers: lurker ? 1 : 0, globalActiveLurkers: lurker ? 1 : 0 });
    const stateBefore = brain.memory.state;
    const memBefore = { ...brain.memory };
    const acts = brain.step(snap);
    for (const a of acts) {
      res.actions.push({ t, a, state: brain.memory.state });
      if (a.type === "ambient") res.events[a.kind] = (res.events[a.kind] ?? 0) + 1;
      const hostile = a.type === "spawnLurker" || (a.type === "setTactic" && a.tactic !== "observe");
      if (hostile && blockedReason(snap, memBefore, a.type === "setTactic" && a.tactic === "hunt")) res.hostileWhileBlocked++;
      if (a.type === "spawnLurker") lurker = { tactic: a.tactic, since: t, noticeAt: t + 20 + world.next() * 80 };
      if (a.type === "setTactic" && lurker) {
        lurker.tactic = a.tactic;
        lurker.since = t;
        if (a.tactic === "hunt") {
          huntStart = t;
          res.hunts.push({ start: t, end: -1, healthAtStart: snap.health });
        }
      }
      if (a.type === "retreatLurkers" && lurker) { lurker = undefined; if (huntStart >= 0) { res.hunts[res.hunts.length - 1]!.end = t; huntStart = -1; } }
    }
    // crude Lurker lifetime model
    if (lurker) {
      if (lurker.tactic === "observe" && t >= lurker.noticeAt) {
        if (world.next() < (opts.noticeProb ?? 0.7)) { brain.onLurkerNoticed(snap.worldSec); lurker = undefined; brain.onLurkerGone(snap.worldSec, "noticed"); }
        else lurker.noticeAt = t + 30;
      } else if (lurker.tactic === "hunt" && t - lurker.since > 30 + world.next() * 30) {
        lurker = undefined; res.hunts[res.hunts.length - 1]!.end = t; huntStart = -1; brain.onHuntEnded(snap.worldSec, true);
      } else if (lurker.tactic === "stalk" && t - lurker.since > 240) lurker = undefined;
    }
    const st = brain.memory.state;
    res.perState[st]++;
    res.stressSum += brain.memory.stress;
    if (st === "escalation" && lastState !== "escalation") res.escalations++;
    res.statesVisited.add(st);
    if (st !== lastState) {
      if (lastState === "dormant") res.dormantDurations.push(t - stateStart);
      lastState = st;
      stateStart = t;
    }
    void stateBefore;
  }
  return res;
}

