import assert from "node:assert/strict";
import { GTUNING, GauntTactics, type GCtx, type GEvent } from "../src/gaunt/tactics";
import { makeRng } from "../src/util/rng";

const ctx = (o: Partial<GCtx> = {}): GCtx => ({
  dt: 0.25, age: 0, dist: 30, sees: false, playerInWater: false, playerHealth: 20, hpFrac: 1, hits: 0,
  requested: "stalk", gentle: false, markerDist: 10, trailLeft: 20, trailBroken: false, ...o,
});
let passed = 0;
const test = (n: string, f: () => void) => { f(); passed++; console.log(`  ok  ${n}`); };

function run(seed: number, initial: "stalk" | "hunt", f: (t: number, g: GauntTactics, ev: GEvent[]) => Partial<GCtx>, maxSec = 700) {
  const g = new GauntTactics(makeRng(seed), initial);
  const events: GEvent[] = [];
  let t = 0;
  for (; t < maxSec && g.state !== "gone"; t += 0.25) events.push(...g.step(ctx({ age: t, ...f(t, g, events) })));
  return { g, events, t, outcome: (events.find((e) => e.type === "vanish") as { outcome: string } | undefined)?.outcome };
}

test("tracking advances the marker in stop-start bursts and searches at the trail's end", () => {
  let marker = 10, left = 6;
  const r = run(1, "stalk", (_t, g, ev) => {
    const last = ev[ev.length - 1];
    if (last?.type === "marker" && last.op === "next") { left--; marker = 10; ev.push({ type: "stress", amount: 0 }); }
    if (g.state === "track") marker = Math.max(0, marker - 0.3);
    return { markerDist: marker, trailLeft: left };
  });
  const pauses = r.events.filter((e) => e.type === "group" && e.event === "dread:set_pause").length;
  const moves = r.events.filter((e) => e.type === "group" && e.event === "dread:set_track").length;
  assert.ok(moves >= 2 && pauses >= 2, `moves ${moves} pauses ${pauses}`);
  assert.ok(r.events.some((e) => e.type === "group" && e.event === "dread:set_search"));
  assert.equal(r.outcome, "lost-scent");
});

test("water or campfire smoke breaks the trail: it searches, then sinks away", () => {
  const r = run(2, "stalk", () => ({ trailBroken: true, trailLeft: 0 }));
  assert.ok(r.events.some((e) => e.type === "group" && e.event === "dread:set_search"));
  assert.equal(r.outcome, "lost-scent");
  assert.ok(r.events.some((e) => e.type === "action" && e.action === "burrow"), "always leaves by burrowing");
});

test("seeing the player without permission to hunt: it sizes you up and leaves; first sighting is reported once", () => {
  const r = run(3, "stalk", (t) => ({ sees: t > 2 && t < 30 }));
  assert.equal(r.outcome, "sized-up");
  assert.equal(r.events.filter((e) => e.type === "encounter").length, 1);
});

test("with permission: roar, then pursue; it never pursues without the director's go-ahead", () => {
  const r = run(4, "stalk", (t) => ({ sees: t > 2, dist: 8, requested: "hunt", hits: t > 20 ? 2 : 0 }));
  const idxRoar = r.events.findIndex((e) => e.type === "action" && e.action === "roar");
  const idxPursue = r.events.findIndex((e) => e.type === "group" && e.event === "dread:set_pursue");
  assert.ok(idxRoar >= 0 && idxPursue > idxRoar, "roar precedes pursuit");
  assert.equal(r.outcome, "satisfied");
  const calm = run(5, "stalk", (t) => ({ sees: t > 2, dist: 8, requested: "stalk" }));
  assert.ok(!calm.events.some((e) => e.type === "group" && e.event === "dread:set_pursue"));
});

test("breaking line of sight mid-chase sends it to search the last seen spot", () => {
  const r = run(6, "hunt", (t) => ({ sees: t < 8, dist: 10, requested: "hunt", trailLeft: 0 }));
  assert.ok(r.events.some((e) => e.type === "marker" && e.op === "lastSeen"));
  assert.ok(r.events.filter((e) => e.type === "group" && e.event === "dread:set_search").length >= 2);
  assert.equal(r.outcome, "lost-scent");
});

test("jumping into water ends the chase", () => {
  const r = run(7, "hunt", (t) => ({ sees: true, dist: 6, requested: "hunt", playerInWater: t > 6, trailLeft: 0, trailBroken: t > 6 }));
  assert.ok(r.events.some((e) => e.type === "marker" && e.op === "lastSeen"));
  assert.notEqual(r.outcome, "satisfied");
});

test("injury, a hurt player, timeout: every chase ends", () => {
  assert.equal(run(8, "hunt", (t) => ({ sees: true, dist: 4, requested: "hunt", hpFrac: t > 6 ? 0.4 : 1 })).outcome, "injured");
  assert.equal(run(9, "hunt", (t) => ({ sees: true, dist: 4, requested: "hunt", playerHealth: t > 6 ? 5 : 20 })).outcome, "player-hurt");
  const to = run(10, "hunt", () => ({ sees: true, dist: 4, requested: "hunt" }));
  assert.equal(to.outcome, "timeout");
  assert.ok(to.t < GTUNING.pursueMax + 15);
});

test("gentle mode: one hit and it is done", () => {
  assert.equal(run(11, "hunt", (t) => ({ sees: true, dist: 3, requested: "hunt", gentle: true, hits: t > 5 ? 1 : 0 })).outcome, "satisfied");
});

test("stuck on terrain: it skips unreachable points, then gives up", () => {
  const r = run(12, "stalk", () => ({ markerDist: 15, trailLeft: 30 }));
  assert.equal(r.outcome, "stuck");
  assert.ok(r.events.filter((e) => e.type === "marker").length >= 2);
});

test("director override and lifetime cap always win", () => {
  const g = new GauntTactics(makeRng(13));
  g.step(ctx());
  g.forceRetreat("light");
  const ev = g.step(ctx());
  assert.ok(ev.some((e) => e.type === "action" && e.action === "burrow"));
  for (let seed = 1; seed <= 40; seed++) {
    const rnd = makeRng(seed);
    const r = run(seed, seed % 2 ? "stalk" : "hunt", () => ({ sees: rnd.next() < 0.05, dist: 5 + rnd.next() * 40, markerDist: rnd.next() * 20, trailLeft: Math.floor(rnd.next() * 10), requested: seed % 3 ? "stalk" : "hunt" }), 1000);
    assert.equal(r.g.state, "gone", `seed ${seed}`);
    assert.ok(r.t <= GTUNING.maxLifetime + 5, `seed ${seed} lived ${r.t}`);
  }
});

console.log(`gaunt tactics tests passed (${passed}); pure logic, not in-game`);
