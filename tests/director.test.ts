import assert from "node:assert/strict";
import { TUNING, DirectorBrain, blockedReason, freshMemory } from "../src/director/brain";
import { parseMemory, serializeMemory } from "../src/director/persistence";
import { stressTarget } from "../src/director/stress";
import type { DirectorState } from "../src/director/types";
import { makeRng } from "../src/util/rng";
import { base, simulate, type Ctx, type SimResult } from "./sim";

const dark = (t: number): Ctx => ({ timeOfDay: 14000 + (t % 8000), skyVisible: t % 1800 < 900, companions: 0 });
let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

test("a 6h lonely night session visits every state, without living in the scary ones", () => {
  const r = simulate(1, 6, dark);
  for (const s of ["dormant", "unease", "observation", "escalation", "hunt", "recovery"] as DirectorState[]) assert.ok(r.statesVisited.has(s), `never reached ${s}`);
  const total = Object.values(r.perState).reduce((a, b) => a + b, 0);
  const quiet = (r.perState.dormant + r.perState.recovery) / total;
  const hunt = r.perState.hunt / total;
  console.log(`      quiet=${(quiet * 100).toFixed(0)}% hunt=${(hunt * 100).toFixed(1)}% hunts=${r.hunts.length} ` + JSON.stringify(r.perState));
  assert.ok(quiet >= 0.35, `too little downtime: ${quiet}`);
  assert.ok(hunt <= 0.1, `too much hunting: ${hunt}`);
});

test("hunt fairness: cooldown, health gate, light/home gate, never stacked", () => {
  for (let seed = 1; seed <= 25; seed++) {
    const lowHp = (t: number): Ctx => ({ ...dark(t), health: t % 3000 < 1500 ? 7 : 20, lit: t % 2400 > 2000 });
    const r = simulate(seed, 8, lowHp);
    assert.equal(r.hostileWhileBlocked, 0, `seed ${seed}: hostile action while blocked`);
    for (let i = 1; i < r.hunts.length; i++) assert.ok(r.hunts[i]!.start - r.hunts[i - 1]!.start >= TUNING.huntCooldown, `seed ${seed}: hunts too close`);
    for (const h of r.hunts) assert.ok(h.healthAtStart >= TUNING.huntMinHealth, `seed ${seed}: hunt started at hp ${h.healthAtStart}`);
  }
});

test("safe places stay safe: standing at a lit home never produces a hunt", () => {
  for (let seed = 1; seed <= 15; seed++) {
    const r = simulate(seed, 6, (t) => ({ ...dark(t), lit: true, nearHome: true }));
    assert.equal(r.hunts.length, 0, `seed ${seed}`);
    assert.equal(r.perState.hunt + r.perState.escalation, 0, `seed ${seed}: escalated at home`);
  }
});

test("daylight with company is overwhelmingly quiet and never hostile", () => {
  for (let seed = 1; seed <= 15; seed++) {
    const r = simulate(seed, 4, () => ({ timeOfDay: 6000, skyVisible: true, companions: 2 }));
    assert.equal(r.hunts.length, 0);
    assert.ok(!r.actions.some((x) => x.a.type === "spawnCreature"), `seed ${seed}: lurker in daylight with friends`);
  }
});

test("creative, spectator, peaceful, disabled, other dimensions: nothing hostile ever", () => {
  const cases: Ctx[] = [{ gameMode: "creative" }, { gameMode: "spectator" }, { peaceful: true }, { settings: { enabled: false, effects: "balanced", intensity: 100 } }, { dimension: "nether" }];
  for (const c of cases) {
    const r = simulate(3, 3, (t) => ({ ...dark(t), ...c }));
    assert.ok(!r.actions.some((x) => x.a.type === "spawnCreature" || x.a.type === "setTactic"), JSON.stringify(c));
  }
});

test("no predictable timers: dormant durations vary widely and traces differ per seed", () => {
  const a = simulate(11, 8, dark), b = simulate(12, 8, dark);
  const d = [...a.dormantDurations, ...b.dormantDurations, ...simulate(13, 8, dark).dormantDurations];
  assert.ok(d.length >= 5, "not enough samples");
  const mean = d.reduce((x, y) => x + y, 0) / d.length;
  const sd = Math.sqrt(d.reduce((x, y) => x + (y - mean) ** 2, 0) / d.length);
  assert.ok(sd / mean > 0.25, `dormant durations too regular (cv=${(sd / mean).toFixed(2)})`);
  assert.notDeepEqual(a.actions.slice(0, 20).map((x) => `${x.t}:${x.a.type}`), b.actions.slice(0, 20).map((x) => `${x.t}:${x.a.type}`));
  const again = simulate(11, 8, dark);
  assert.deepEqual(again.actions.map((x) => `${x.t}:${JSON.stringify(x.a)}`), a.actions.map((x) => `${x.t}:${JSON.stringify(x.a)}`), "same seed must reproduce exactly");
});

test("ambient variety: no event dominates and per-event cooldowns hold", () => {
  const r = simulate(5, 8, dark);
  const counts = Object.entries(r.events);
  const total = counts.reduce((s, [, n]) => s + n, 0);
  assert.ok(total > 40, `too few ambient events (${total})`);
  assert.ok(counts.length >= 7, `only ${counts.length} kinds used`);
  const top = Math.max(...counts.map(([, n]) => n)) / total;
  console.log(`      ${total} ambient events, ${counts.length} kinds, top share ${(top * 100).toFixed(0)}%`);
  assert.ok(top < 0.3, `one event is ${(top * 100).toFixed(0)}% of all events`);
});

test("player death: long grace, no hunts, memory survives a save/load", () => {
  const rng = makeRng(9);
  const brain = new DirectorBrain(freshMemory(0), rng, 0);
  for (let t = 1; t < 400; t++) brain.step(base({ t, worldSec: t }));
  brain.onPlayerDied(400);
  assert.equal(brain.memory.state, "recovery");
  const restored = parseMemory(serializeMemory(brain.memory), 500);
  assert.deepEqual(restored, brain.memory);
  assert.ok(blockedReason(base({ worldSec: 400 + 600 }), restored, true) === "death-grace");
});

test("reload mid-encounter settles to recovery, corrupt saves reset safely", () => {
  const m = freshMemory(0);
  m.state = "hunt";
  const b = new DirectorBrain(parseMemory(serializeMemory(m), 0), makeRng(1), 0);
  assert.equal(b.memory.state, "recovery");
  for (const junk of [undefined, null, 42, "{", "[]", '{"v":2}', '{"v":1,"state":"nope","stress":"x","history":[1,{"id":3}]}', "x".repeat(50000)]) {
    const p = parseMemory(junk, 5);
    assert.equal(p.v, 1);
    assert.ok(p.stress >= 0 && p.stress <= 100);
  }
});

test("stress responds to context, not to time online", () => {
  const night = base({ skyVisible: false });
  assert.ok(stressTarget(night) > stressTarget(base({ timeOfDay: 6000, skyVisible: true })) + 20, "dark cave vs sunny field");
  assert.ok(stressTarget(base({ lit: true })) < stressTarget(night), "light helps");
  assert.ok(stressTarget(base({ nearHome: true })) < stressTarget(night) - 15, "home helps");
  assert.ok(stressTarget(base({ companions: 2 })) < stressTarget(night), "company helps");
  assert.ok(stressTarget(base({ health: 4 })) > stressTarget(night), "injury hurts");
  assert.equal(stressTarget(base({ t: 99999, worldSec: 99999999 })), stressTarget(base()), "elapsed time must not matter");
});

test("intensity setting scales encounter frequency", () => {
  const low = simulate(21, 8, (t) => ({ ...dark(t), settings: { enabled: true, effects: "balanced", intensity: 0 } }));
  const high = simulate(21, 8, (t) => ({ ...dark(t), settings: { enabled: true, effects: "balanced", intensity: 100 } }));
  const n = (r: SimResult) => r.actions.filter((x) => x.a.type === "ambient").length;
  console.log(`      ambient events: intensity0=${n(low)} intensity100=${n(high)}`);
  assert.ok(n(high) > n(low) * 1.3);
});

test("the Lurker is always met first; the Gaunt only joins later, and more often underground", () => {
  const kinds = (r: SimResult) => r.actions.filter((x) => x.a.type === "spawnCreature").map((x) => (x.a as { creature: string; tactic: string }));
  let gauntUnder = 0, gauntSurface = 0, spawnsUnder = 0, spawnsSurface = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const under = kinds(simulate(seed, 6, (t) => ({ timeOfDay: 14000 + (t % 8000), skyVisible: false })));
    const surf = kinds(simulate(seed + 100, 6, (t) => ({ timeOfDay: 14000 + (t % 8000), skyVisible: true })));
    for (const [list, which] of [[under, "u"], [surf, "s"]] as const) {
      const firstGaunt = list.findIndex((k) => k.creature === "gaunt");
      if (firstGaunt >= 0) assert.ok(list.slice(0, firstGaunt).filter((k) => k.creature === "lurker").length >= 2, "met the Lurker before any Gaunt");
      assert.ok(list.every((k) => k.creature === "lurker" || k.tactic !== "observe"), "the Gaunt never 'observes'");
      const esc = list.filter((k) => k.tactic === "stalk");
      if (which === "u") { gauntUnder += esc.filter((k) => k.creature === "gaunt").length; spawnsUnder += esc.length; }
      else { gauntSurface += esc.filter((k) => k.creature === "gaunt").length; spawnsSurface += esc.length; }
    }
  }
  console.log(`      gaunt share of escalations: underground ${(gauntUnder / spawnsUnder * 100).toFixed(0)}%, surface ${(gauntSurface / spawnsSurface * 100).toFixed(0)}%`);
  assert.ok(gauntUnder > 0 && gauntUnder / spawnsUnder > gauntSurface / Math.max(1, spawnsSurface), "gaunt favoured underground");
});

console.log(`director tests passed (${passed}); pure logic simulation, not in-game`);
