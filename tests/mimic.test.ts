import assert from "node:assert/strict";
import { MTUNING, MimicTactics, type MCtx, type MEvent } from "../src/mimic/tactics";
import { makeRng } from "../src/util/rng";

const ctx = (o: Partial<MCtx> = {}): MCtx => ({
  dt: 0.25, age: 0, dist: 24, seen: false, struck: false, playerLit: false, playerHealth: 20, hpFrac: 1, hits: 0,
  requested: "observe", gentle: false, ...o,
});
let passed = 0;
const test = (n: string, f: () => void) => { f(); passed++; console.log(`  ok  ${n}`); };
function run(seed: number, f: (t: number, m: MimicTactics) => Partial<MCtx>, maxSec = 500) {
  const m = new MimicTactics(makeRng(seed));
  const events: (MEvent & { t: number })[] = [];
  let t = 0;
  for (; t < maxSec && m.state !== "gone"; t += 0.25) for (const e of m.step(ctx({ age: t, ...f(t, m) }))) events.push({ ...e, t });
  return { m, events, t, outcome: (events.find((e) => e.type === "vanish") as { outcome: string } | undefined)?.outcome };
}

test("in disguise it imitates familiar sounds only while unwatched and within earshot, never the same twice running", () => {
  const watched = (t: number) => t % 33 < 3; // brief glances, too short to make it turn
  const r = run(1, (t) => ({ seen: watched(t), dist: 20 }), 300);
  const imit = r.events.filter((e) => e.type === "imitate") as (MEvent & { type: "imitate"; t: number })[];
  assert.ok(imit.length >= 3, `only ${imit.length} imitations`);
  for (let i = 1; i < imit.length; i++) assert.notEqual(imit[i]!.sound, imit[i - 1]!.sound);
  for (const e of imit) assert.ok(!watched(e.t), "imitated while being watched");
  const far = run(2, () => ({ dist: 60 }), 200);
  assert.equal(far.events.filter((e) => e.type === "imitate").length, 0, "no imitations out of earshot");
});

test("it never moves while watched: freezes when seen, resumes grazing only after you look away", () => {
  const r = run(3, (t) => ({ seen: t > 3 && t < 4.5, dist: 30 }), 20);
  const g = r.events.filter((e) => e.type === "group").map((e) => (e as { event: string }).event);
  assert.deepEqual(g.slice(0, 3), ["dread:set_graze", "dread:set_still", "dread:set_graze"]);
});

test("stare at it long enough and its head turns around; it then leaves when you look away", () => {
  const r = run(4, (t) => ({ seen: t < 9, dist: 25 }));
  assert.ok(r.events.some((e) => e.type === "action" && e.action === "head_turn"));
  assert.ok(r.events.some((e) => e.type === "encounter" && e.kind === "mimic_turned"));
  assert.equal(r.outcome, "turned");
});

test("approach, strike or bring light near it and it reveals with a readable 1.4 s tell, then flees", () => {
  for (const [name, f] of [["approach", () => ({ dist: 5 })], ["strike", (t: number) => ({ struck: t > 2 && t < 2.3 })], ["light", () => ({ dist: 8, playerLit: true })]] as const) {
    const r = run(5, f as (t: number) => Partial<MCtx>);
    const rev = r.events.find((e) => e.type === "group" && e.event === "dread:set_reveal");
    const flee = r.events.find((e) => e.type === "group" && e.event === "dread:set_flee");
    assert.ok(rev && flee, name);
    assert.ok(flee.t - rev.t >= MTUNING.revealTime - 0.01, `${name}: tell too short`);
    assert.equal(r.outcome, "revealed", name);
  }
});

test("it only attacks with the director's go-ahead, after the reveal, and stops after 2 hits", () => {
  const calm = run(6, () => ({ dist: 4, requested: "stalk" }));
  assert.ok(!calm.events.some((e) => e.type === "group" && e.event === "dread:set_attack"));
  const r = run(7, (t) => ({ dist: 4, requested: "hunt", hits: t > 8 ? 2 : 0 }));
  const evs = r.events.filter((e) => e.type === "group").map((e) => (e as { event: string }).event);
  assert.ok(evs.indexOf("dread:set_reveal") < evs.indexOf("dread:set_attack"));
  assert.equal(r.outcome, "satisfied");
  assert.equal(run(8, (t) => ({ dist: 4, requested: "hunt", gentle: true, hits: t > 4 ? 1 : 0 })).outcome, "satisfied");
  assert.equal(run(9, () => ({ dist: 4, requested: "hunt", playerLit: true })).outcome, "revealed", "no attack in light");
});

test("everything ends: injury, timeout, director override, lifetime cap", () => {
  assert.equal(run(10, (t) => ({ dist: 4, requested: "hunt", hpFrac: t > 4 ? 0.4 : 1 })).outcome, "injured");
  const to = run(11, () => ({ dist: 4, requested: "hunt" }));
  assert.equal(to.outcome, "timeout");
  const m = new MimicTactics(makeRng(12));
  m.step(ctx()); m.forceRetreat("light");
  assert.ok(m.step(ctx()).some((e) => e.type === "vanish"));
  for (let seed = 1; seed <= 40; seed++) {
    const rnd = makeRng(seed);
    const r = run(seed, () => ({ dist: 3 + rnd.next() * 50, seen: rnd.next() < 0.2, struck: rnd.next() < 0.002, requested: seed % 2 ? "hunt" : "observe" }), 1000);
    assert.equal(r.m.state, "gone", `seed ${seed}`);
    assert.ok(r.t <= MTUNING.maxLifetime + 10);
  }
});

console.log(`mimic tactics tests passed (${passed}); pure logic, not in-game`);
