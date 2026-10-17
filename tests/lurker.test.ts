import assert from "node:assert/strict";
import { LTUNING, LurkerTactics, type LCtx, type LEvent } from "../src/lurker/tactics";
import { makeRng } from "../src/util/rng";

const ctx = (o: Partial<LCtx> = {}): LCtx => ({
  dt: 0.25, age: 0, dist: 32, seen: false, playerLit: false, playerHealth: 20, lurkerHealthFrac: 1, hitsLanded: 0,
  requested: "observe", gentle: false, ...o,
});
let passed = 0;
const test = (n: string, f: () => void) => { f(); passed++; console.log(`  ok  ${n}`); };

/** Run until gone; returns events and elapsed seconds. */
function run(seed: number, initial: "observe" | "stalk" | "hunt", f: (t: number, l: LurkerTactics) => Partial<LCtx>, maxSec = 600) {
  const l = new LurkerTactics(makeRng(seed), initial);
  const events: LEvent[] = [];
  let t = 0;
  for (; t < maxSec && l.state !== "gone"; t += 0.25) events.push(...l.step(ctx({ age: t, ...f(t, l) })));
  return { l, events, t, outcome: (events.find((e) => e.type === "vanish") as { outcome: string } | undefined)?.outcome };
}

test("observer: watching it makes it notice, freeze, then vanish; director is told", () => {
  const r = run(1, "observe", () => ({ seen: true }));
  assert.ok(r.events.some((e) => e.type === "action" && e.action === "notice"));
  assert.ok(r.events.some((e) => e.type === "noticed"));
  assert.equal(r.outcome, "noticed");
  assert.ok(r.t > 1.5 && r.t < 5, `took ${r.t}s`);
});

test("observer: walking toward it spooks it before it can be approached", () => {
  const r = run(2, "observe", () => ({ dist: 10 }));
  assert.equal(r.outcome, "spooked");
});

test("observer that is never seen repositions a limited number of times, then leaves", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const r = run(seed, "observe", () => ({}));
    const repos = r.events.filter((e) => e.type === "reposition").length;
    assert.ok(repos <= LTUNING.maxRepositions, `seed ${seed}: ${repos} repositions`);
    assert.equal(r.outcome, "timeout");
    assert.ok(r.t <= LTUNING.maxLifetime + 1);
  }
});

test("light pushes every behaviour back; hunts need sustained light", () => {
  assert.equal(run(3, "observe", () => ({ playerLit: true })).outcome, "light");
  assert.equal(run(4, "stalk", () => ({ playerLit: true })).outcome, "light");
  const h = run(5, "hunt", () => ({ playerLit: true, dist: 6 }));
  assert.equal(h.outcome, "light");
  assert.ok(h.t >= LTUNING.huntLightHold && h.t < LTUNING.huntLightHold + 14, `hunt lasted ${h.t}s in light`);
});

test("a hunt always ends: hits, injury, hurt player, timeout, distance", () => {
  const hits = run(6, "hunt", (t) => ({ dist: 3, hitsLanded: t > 5 ? 3 : 0 }));
  assert.equal(hits.outcome, "satisfied");
  assert.equal(run(7, "hunt", (t) => ({ dist: 3, lurkerHealthFrac: t > 4 ? 0.3 : 1 })).outcome, "injured");
  assert.equal(run(8, "hunt", (t) => ({ dist: 3, playerHealth: t > 4 ? 5 : 20 })).outcome, "player-hurt");
  const to = run(9, "hunt", () => ({ dist: 5 }));
  assert.equal(to.outcome, "timeout");
  assert.ok(to.t <= LTUNING.huntMax + 12, `timeout hunt ran ${to.t}s`);
  assert.equal(run(10, "hunt", () => ({ dist: 80 })).outcome, "lost");
});

test("hunt damage budget: at most 3 hits are ever requested before it backs off", () => {
  const r = run(11, "hunt", (t) => ({ dist: 2, hitsLanded: Math.floor(t / 2) }));
  assert.equal(r.outcome, "satisfied");
  assert.ok(r.t < 20, `ran ${r.t}s`); // 6 s to 3 hits + 6-10 s retreat
});

test("gentle mode shortens hunts and reduces hits needed", () => {
  const normal = run(12, "hunt", () => ({ dist: 5 }));
  const gentle = run(12, "hunt", () => ({ dist: 5, gentle: true }));
  assert.ok(gentle.t < normal.t, `${gentle.t} vs ${normal.t}`);
  assert.equal(run(13, "hunt", () => ({ dist: 3, hitsLanded: 2, gentle: true })).outcome, "satisfied");
});

test("stalker backs off when watched; delivers one close moment when ignored", () => {
  const watched = run(14, "stalk", (t) => ({ dist: 20, seen: t > 3 }));
  assert.equal(watched.outcome, "noticed");
  const ignored = run(15, "stalk", (t) => ({ dist: Math.max(5, 25 - t) }));
  assert.ok(ignored.events.some((e) => e.type === "sound" && e.id === "breath_alert"));
  assert.equal(ignored.outcome, "close-moment");
  assert.equal(ignored.events.filter((e) => e.type === "sound").length, 1, "only one close moment");
});

test("director can escalate an observer to stalk and then hunt", () => {
  const l = new LurkerTactics(makeRng(20));
  const e1 = l.step(ctx({ requested: "stalk" }));
  assert.ok(e1.some((e) => e.type === "group" && e.event === "dread:set_stalk"));
  const e2 = l.step(ctx({ requested: "hunt" }));
  assert.ok(e2.some((e) => e.type === "group" && e.event === "dread:set_hunt"));
  assert.equal(l.state, "hunt");
});

test("nothing outlives the hard lifetime cap, whatever the inputs", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const rnd = makeRng(seed * 7);
    const r = run(seed, (["observe", "stalk", "hunt"] as const)[seed % 3]!, () => ({
      dist: 6 + rnd.next() * 50, seen: rnd.next() < 0.1, playerLit: rnd.next() < 0.02, requested: seed % 3 === 0 ? "hunt" : seed % 3 === 1 ? "stalk" : "observe",
    }), 900);
    assert.equal(r.l.state, "gone", `seed ${seed} still alive after ${r.t}s`);
    assert.ok(r.t <= LTUNING.maxLifetime + 15, `seed ${seed} lived ${r.t}s`);
  }
});

console.log(`lurker tactics tests passed (${passed}); pure logic, not in-game`);
