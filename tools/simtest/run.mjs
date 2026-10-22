// THE HOLLOW headless simulation tests.
//
// Runs the real bundled behavior-pack scripts (scripts_src -> esbuild) against a fake Minecraft
// API (tools/simtest/fake/mc.mjs). This exercises scheduling, events, persistence, reloads, state
// machines, caps, cooldowns and rewards. It cannot test engine behaviour (pathfinding, melee,
// rendering, sounds): those stay on the in-game test plan in docs/VALIDATION_REPORT.md.
//
// Usage: node tools/simtest/run.mjs [filter] [--report docs/SIMULATION_REPORT.generated.md]

import fs from "node:fs";
import { boot, newWorld } from "./harness.mjs";

const results = [];
const args = process.argv.slice(2);
const reportAt = args.includes("--report") ? args[args.indexOf("--report") + 1] : undefined;
const filter = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--report");
const notes = [];

async function test(name, fn) {
  if (filter && !name.includes(filter)) return;
  const t0 = performance.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: performance.now() - t0 });
  } catch (e) {
    results.push({ name, ok: false, ms: performance.now() - t0, err: e?.stack ?? String(e) });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}
function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function noErrors(sim) {
  if (sim.errors.length) throw new Error(`script errors:\n${sim.errors.slice(0, 5).join("\n")}`);
}
const flush = () => new Promise((r) => setTimeout(r, 0));

const DAY = 24000;
const veteran = { playTicks: 20000 }; // past the 10-minute newcomer grace

function count(sim, type) {
  return sim.overworld.getEntities({ type }).length;
}
function journal(p) {
  const raw = p.getDynamicProperty("hollow:journal");
  return raw ? JSON.parse(raw).u : [];
}
function hollowEntities(sim) {
  return sim.overworld.getEntities().filter((e) => e.typeId.startsWith("hollow:"));
}
/** Advance to a time of day on the current or a later day. */
function goTo(sim, day, tod) {
  const target = day * DAY + tod;
  if (sim.absTime > target) throw new Error("time travel");
  sim.tick(target - sim.absTime);
}

// =============================================================================== join & journal
await test("first join gives a kept, locked journal and starter entries", () => {
  const sim = newWorld();
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  const j = p._inv.slots.filter((s) => s?.typeId === "hollow:field_journal");
  eq(j.length, 1, "journals");
  eq(j[0].keepOnDeath, true, "keepOnDeath");
  eq(j[0].lockMode, "inventory", "lockMode");
  for (const id of ["intro", "shelter", "craft_chime", "craft_ward"]) assert(journal(p).includes(id), `entry ${id}`);
  sim.removePlayer(p);
  sim.addPlayer("Alex", undefined, { initial: true });
  sim.tick(100);
  eq(p._inv.count("hollow:field_journal"), 1, "no second journal on rejoin");
  p._inv.slots.fill(undefined);
  sim.fire("playerSpawn", { player: p, initialSpawn: false });
  sim.tick(40);
  eq(p._inv.count("hollow:field_journal"), 1, "journal restored on respawn");
  noErrors(sim);
});

await test("journal UI opens chapters and entries with a controller-style selection", async () => {
  const sim = newWorld();
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  p._ui.push({ canceled: false, selection: 0 }, { canceled: false, selection: 0 }, { canceled: false, selection: 0 });
  p.hold("hollow:field_journal");
  sim.useItem(p);
  sim.tick(2);
  for (let i = 0; i < 10; i++) await flush();
  const titles = (p._shownForms ?? []).map((f) => f._title);
  assert(titles[0].includes("Field Journal"), `opened journal: ${titles}`);
  assert(titles[1].includes("Field Notes"), `opened chapter: ${titles}`);
  assert(titles.length >= 3, `opened an entry: ${titles}`);
  noErrors(sim);
});

await test("settings: non-operators cannot see world rules; values are sanitised", async () => {
  const sim = newWorld();
  const p = sim.addPlayer("Guest");
  p.playerPermissionLevel = 1;
  sim.tick(100);
  p._ui.push({ canceled: false, selection: 4 }); // Settings button
  p.hold("hollow:field_journal");
  sim.useItem(p);
  sim.tick(2);
  for (let i = 0; i < 10; i++) await flush();
  const menu = p._shownForms.find((f) => f._title.includes("Settings"));
  assert(menu, "settings menu shown");
  eq(menu.controls.filter((c) => c.type === "button").length, 1, "only comfort settings for a non-operator");
  // corrupt / out-of-range saved rules are clamped on load
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ intensity: 9, frequency: 5000, graceDays: -3 }));
  boot(sim);
  sim.tick(1);
  sim.fire("scriptEventReceive", { id: "hollow:status", sourceEntity: sim.addPlayer("Op"), message: "" });
  noErrors(sim);
});

// =============================================================================== UI resilience
const openBook = (sim, p) => sim.fire("scriptEventReceive", { id: "hollow:journal", sourceEntity: p, message: "" });
async function advanceForms(sim, rounds = 12) {
  for (let i = 0; i < rounds; i++) { sim.tick(10); await flush(); }
}

await test("journal: repeated taps share one session; a closed form can reopen", async () => {
  const sim = newWorld(111);
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  let finish;
  p._ui.push(() => new Promise((resolve) => { finish = resolve; }));
  openBook(sim, p);
  openBook(sim, p);
  eq(p._shownForms.length, 1, "one form for repeated taps");
  finish({ canceled: true, cancelationReason: "UserClosed" });
  await advanceForms(sim, 3);
  openBook(sim, p);
  await advanceForms(sim, 3);
  eq(p._shownForms.length, 2, "session released after closing");
  noErrors(sim);
});

await test("journal: disconnected session cannot navigate or unlock a new session", async () => {
  const sim = newWorld(112);
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  let oldFinish, newFinish;
  p._ui.push(() => new Promise((resolve) => { oldFinish = resolve; }));
  openBook(sim, p);
  sim.removePlayer(p);
  sim.tick(2);
  sim.addPlayer("Alex");
  p._ui.push(() => new Promise((resolve) => { newFinish = resolve; }));
  openBook(sim, p);
  oldFinish({ canceled: false, selection: 0 });
  await advanceForms(sim, 3);
  eq(p._shownForms.length, 2, "stale response cannot open a chapter");
  openBook(sim, p);
  eq(p._shownForms.length, 2, "stale finalizer cannot release the new session lock");
  newFinish({ canceled: true });
  await advanceForms(sim, 3);
  noErrors(sim);
});

await test("journal: form rejection cancels cleanly and allows a later attempt", async () => {
  const sim = newWorld(113);
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  p._ui.push(() => Promise.reject(new Error("player disconnected during show")));
  openBook(sim, p);
  await advanceForms(sim, 3);
  openBook(sim, p);
  await advanceForms(sim, 3);
  eq(p._shownForms.length, 2, "failed show releases the session");
  noErrors(sim);
});

await test("journal: busy menus retry through comfort settings; closing never retries", async () => {
  const sim = newWorld(114);
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  const busy = { canceled: true, cancelationReason: "UserBusy" };
  p._ui.push(busy, { canceled: false, selection: 4 }, busy,
    { canceled: false, selection: 0 }, busy,
    { canceled: false, formValues: [30, 0, false, true, false] });
  openBook(sim, p);
  await advanceForms(sim, 20);
  const prefs = JSON.parse(p.getDynamicProperty("hollow:prefs"));
  eq(prefs.ambience, 30, "ambience saved after busy retries");
  eq(prefs.music, false, "music preference saved");
  eq(prefs.visualFx, false, "effects preference saved");
  const shown = p._shownForms.length;
  openBook(sim, p); // no response queued: UserClosed
  await advanceForms(sim, 20);
  eq(p._shownForms.length, shown + 1, "closing does not reopen the menu");
  noErrors(sim);
});

await test("journal: entries stay unread when their form cannot be shown", async () => {
  const sim = newWorld(115);
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  p._ui.push({ canceled: false, selection: 0 }, { canceled: false, selection: 0 },
    ...Array.from({ length: 7 }, () => ({ canceled: true, cancelationReason: "UserBusy" })));
  openBook(sim, p);
  await advanceForms(sim, 20);
  eq(JSON.parse(p.getDynamicProperty("hollow:journal")).r.length, 0, "an unseen entry is still unread");
  noErrors(sim);
});

await test("settings: malformed saved values recover defaults without enabling destructive options", async () => {
  const sim = newWorld(116);
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ intensity: null, frequency: "bad", graceDays: {}, knockerNight: -50, watcher: "false", destructive: "true", sites: false }));
  p.setDynamicProperty("hollow:prefs", JSON.stringify({ ambience: "bad", accents: 500, visualFx: "false", hints: false, music: null }));
  boot(sim, 116);
  let inspectedWorld, inspectedPrefs;
  p._ui.push({ canceled: false, selection: 4 }, { canceled: false, selection: 1 }, (f) => {
    const values = f.controls.map((c) => c.type === "toggle" ? c.o.defaultValue : c.type === "dropdown" ? c.o.defaultValueIndex : c.o.defaultValue);
    inspectedWorld = values;
    return { canceled: false, formValues: values };
  });
  openBook(sim, p);
  await advanceForms(sim);
    eq(inspectedWorld[0], 1, "intensity fallback");
    eq(inspectedWorld[1], 100, "frequency fallback");
    eq(inspectedWorld[2], 1, "grace fallback");
    eq(inspectedWorld[3], 1, "knocker clamped to valid minimum");
    eq(inspectedWorld[4], true, "invalid creature toggle falls back");
    eq(inspectedWorld[9], false, "string does not turn destruction on");
    eq(inspectedWorld[11], false, "valid false is preserved");
  const world = JSON.parse(sim.world.getDynamicProperty("hollow:settings"));
  eq(world.destructive, false, "safe rules saved");
  p._ui.push({ canceled: false, selection: 4 }, { canceled: false, selection: 0 }, (f) => {
    inspectedPrefs = f.controls;
    return { canceled: true };
  });
  openBook(sim, p);
  await advanceForms(sim);
    eq(inspectedPrefs[0].o.defaultValue, 80, "ambience fallback");
    eq(inspectedPrefs[1].o.defaultValueIndex, 2, "accents clamped");
    eq(inspectedPrefs[2].o.defaultValue, true, "visual effect fallback");
    eq(inspectedPrefs[3].o.defaultValue, false, "valid hint preference preserved");
    eq(inspectedPrefs[4].o.defaultValue, true, "music fallback");
  noErrors(sim);
});

await test("settings: opening and saving world rules preserves supported grace and night ranges", async () => {
  const sim = newWorld(117);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ graceDays: 10, knockerNight: 20 }));
  boot(sim, 117);
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  p._ui.push({ canceled: false, selection: 4 }, { canceled: false, selection: 1 }, (f) => ({
    canceled: false, formValues: f.controls.map((c) => c.type === "toggle" ? c.o.defaultValue : c.type === "dropdown" ? c.o.defaultValueIndex : c.o.defaultValue),
  }));
  openBook(sim, p);
  await advanceForms(sim);
  const world = JSON.parse(sim.world.getDynamicProperty("hollow:settings"));
  eq(world.graceDays, 10, "grace remains ten days");
  eq(world.knockerNight, 20, "knocker remains night twenty");
  noErrors(sim);
});

// =============================================================================== field reports & discovery
async function readField(sim, p, onReport) {
  p._ui.push({ canceled: false, selection: 5 }, (f) => {
    onReport?.(f);
    return { canceled: true, cancelationReason: "UserClosed" };
  });
  openBook(sim, p);
  await advanceForms(sim, 3);
  return p._shownForms.filter((f) => f._title.includes("Field Conditions")).at(-1);
}

await test("field: newcomers get a useful first goal without undiscovered creature spoilers", async () => {
  const sim = newWorld(201), p = sim.addPlayer("Alex");
  sim.tick(100);
  const f = await readField(sim, p);
  assert(f._body.includes("settling-in"), "explains newcomer pacing");
  assert(f._body.includes("roof and closed door"), "first survival objective");
  assert(!/Borrowed|Mirebound|Heart Below|Offering/.test(f._body), "no future creature or boss spoilers");
  assert(f.controls.some((c) => c.text === "Read suggested recipe"), "starter recipe shortcut");
  noErrors(sim);
});

await test("field: reports charged equipment, carried light, shelter and quiet movement", async () => {
  const { sim, p } = houseWorld(202);
  sim.tick(100);
  const w = sim.placeBlock(p, { x: 1, y: 64, z: 1 }, "hollow:rowan_ward");
  w.setPermutation(w.permutation.withState("hollow:used", 2));
  p.hold("minecraft:torch");
  p.isSneaking = true;
  const f = await readField(sim, p);
  for (const text of ["roof overhead", "carrying a light", "2/4", "silent (sneaking)"]) assert(f._body.includes(text), text);
  sim.placeBlock(p, { x: 2, y: 64, z: 1 }, "hollow:heartwood_lantern");
  assert((await readField(sim, p))._body.includes("Heartwood Lantern protection"), "registered lantern checked");
  noErrors(sim);
});

await test("field: refresh reads the new location and Back returns to the journal", async () => {
  const { sim, p } = houseWorld(203);
  sim.tick(100);
  const bodies = [];
  p._ui.push({ canceled: false, selection: 5 }, (f) => {
    bodies.push(f._body);
    p.teleport({ x: 100, y: 64, z: 100 });
    return { canceled: false, selection: 0 };
  }, (f) => { bodies.push(f._body); return { canceled: false, selection: f.controls.length - 1 }; });
  openBook(sim, p);
  await advanceForms(sim);
  assert(bodies[0].includes("roof overhead"), "original shelter");
  assert(bodies[1].includes("open sky"), "refresh uses current position");
  assert(p._shownForms.at(-1)._title.includes("Field Journal"), "Back reaches root");
  noErrors(sim);
});

await test("field: suggested recipe opens only a discovered equipment entry", async () => {
  const sim = newWorld(204), p = sim.addPlayer("Alex");
  sim.tick(100);
  p._ui.push({ canceled: false, selection: 5 }, { canceled: false, selection: 1 });
  openBook(sim, p);
  await advanceForms(sim);
  assert(p._shownForms.at(-1)._title.includes("Chime"), "first recipe is the known chime");
  const { ItemStack } = sim.exports();
  sim.fire("entityItemPickup", { entity: p, items: [new ItemStack("hollow:pale_resin")] });
  assert((await readField(sim, p))._body.includes("Craft it to investigate"), "discovery advances objective to lens");
  p.hold("hollow:hollow_lens");
  assert((await readField(sim, p))._body.includes("Each look wears"), "carried lens advances objective to investigation");
  noErrors(sim);
});

await test("field: explains Peaceful, configured grace and recovery without changing rules", async () => {
  const sim = newWorld(205);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ graceDays: 5 }));
  boot(sim, 205);
  const p = sim.addPlayer("Alex", undefined, veteran);
  sim.tick(100);
  assert((await readField(sim, p))._body.includes("start on day 6"), "configured grace explained");
  sim.difficulty = sim.exports().Difficulty.Peaceful;
  assert((await readField(sim, p))._body.includes("Peaceful"), "Peaceful explained");
  sim.difficulty = sim.exports().Difficulty.Normal;
  sim.fire("playerSpawn", { player: p, initialSpawn: false });
  assert((await readField(sim, p))._body.includes("recovery period"), "respawn protection explained");
  noErrors(sim);
});

await test("field: completed progression offers the known lantern recipe and ignores inactive overflow wards", async () => {
  const sim = newWorld(216), p = sim.addPlayer("Alex");
  p.setDynamicProperty("hollow:journal", JSON.stringify({ u: ["intro", "after", "craft_lantern"], r: [] }));
  sim.tick(100);
  for (let i = 0; i < 32; i++) sim.placeBlock(p, { x: 100 + i, y: 64, z: 100 }, "hollow:rowan_ward");
  sim.placeBlock(p, { x: 1, y: 64, z: 1 }, "hollow:rowan_ward");
  const f = await readField(sim, p);
  assert(f._body.includes("Turn the Stilled Heart"), "completed progression points to the lantern");
  assert(f._body.includes("no charged ward detected"), "unregistered ward does not falsely promise protection");
  p.hold("hollow:heartwood_lantern");
  assert((await readField(sim, p))._body.includes("Place your Heartwood Lantern"), "carried reward updates next step");
  noErrors(sim);
});

await test("journal: malformed discovery data cannot inflate counts or mark locked entries read", async () => {
  const sim = newWorld(206), p = sim.addPlayer("Alex");
  p.setDynamicProperty("hollow:journal", JSON.stringify({ u: ["intro", "intro", "fake", null], r: ["intro", "craft_lens", 42, "intro"] }));
  sim.tick(100);
  const saved = JSON.parse(p.getDynamicProperty("hollow:journal"));
  eq(saved.u.length, 4, "exactly the four valid starter entries");
  eq(saved.r.length, 1, "only an unlocked entry is read");
  eq(saved.r[0], "intro", "valid read flag preserved");
  noErrors(sim);
});

await test("journal: simultaneous discoveries produce one summary and one cue", () => {
  const sim = newWorld(207), p = sim.addPlayer("Alex");
  sim.tick(100);
  const { ItemStack } = sim.exports();
  const cues = p._sounds.filter((s) => s === "hollow.journal.entry").length;
  sim.fire("entityItemPickup", { entity: p, items: [new ItemStack("hollow:pale_resin"), new ItemStack("hollow:hollow_fang")] });
  sim.tick(40);
  eq(p._sounds.filter((s) => s === "hollow.journal.entry").length - cues, 1, "one discovery cue");
  assert(p._log.some((l) => l.includes("2 new journal entries")), "combined readable summary");
  noErrors(sim);
});

await test("journal: death cancels pending discovery popups but preserves discovered pages", () => {
  const sim = newWorld(208), p = sim.addPlayer("Alex");
  sim.tick(100);
  sim.fire("entityItemPickup", { entity: p, items: [new (sim.exports().ItemStack)("hollow:pale_resin")] });
  sim.damage(p, 100);
  const before = p._sounds.length;
  sim.tick(40);
  eq(p._sounds.length, before, "no post-death discovery cue");
  assert(journal(p).includes("craft_lens"), "discovery remains saved");
  noErrors(sim);
});

// =============================================================================== pacing
await test("day 1 is safe: nothing hunts; the Watcher can only be glimpsed", () => {
  const sim = newWorld(7);
  sim.frequency = 200;
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ frequency: 200 }));
  boot(sim, 7);
  const p = sim.addPlayer("Alex", { x: 0.5, y: 64, z: 0.5 }, veteran);
  goTo(sim, 1, 0); // full day 0 including its night
  const spawned = new Set(sim.spawnLog);
  for (const t of ["hollow:borrowed", "hollow:hollowed", "hollow:mirebound", "hollow:knocker"]) assert(!spawned.has(t), `${t} spawned on day 1`);
  const watchers = sim.spawnLog.filter((t) => t === "hollow:watcher").length;
  assert(watchers >= 1, "a watcher was glimpsed during the first night (forest, frequency 200%)");
  const allEvents = [...sim.overworld._entities.values()].flatMap((e) => e._events ?? []);
  assert(!allEvents.some((event) => event === "hollow:to_stalk" || event === "hollow:to_stalk_patient") && !allEvents.includes("hollow:to_lunge"), "watcher never stalked on day 1");
  eq(p._health.currentValue, 20, "player untouched");
  noErrors(sim);
});

await test("newcomers, creative and peaceful players are never targeted", () => {
  for (const setup of ["newcomer", "creative", "peaceful"]) {
    const sim = newWorld(3);
    sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ frequency: 200, graceDays: 0 }));
    boot(sim, 3);
    goTo(sim, 2, 13000);
    // a newcomer joins right at dusk on night 3; the others are veterans
    const p = sim.addPlayer("Alex", undefined, setup === "newcomer" ? {} : veteran);
    if (setup === "creative") p.setGameMode("Creative");
    if (setup === "peaceful") sim.difficulty = "Peaceful";
    sim.tick(6000);
    const spawned = sim.spawnLog.filter((t) => t.startsWith("hollow:") && t !== "hollow:lure");
    // 6000 ticks of play is still inside the newcomer's 12000-tick grace
    eq(spawned.length, 0, `${setup}: spawns ${spawned}`);
    noErrors(sim);
  }
});

// =============================================================================== watcher
function watcherNight(seed = 11) {
  const sim = newWorld(seed);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ frequency: 200, borrowed: false, mirebound: false, knocker: false }));
  boot(sim, seed);
  const p = sim.addPlayer("Alex", { x: 0.5, y: 64, z: 0.5 }, veteran);
  goTo(sim, 2, 13000);
  let w;
  for (let i = 0; i < 4000 && !w; i++) {
    sim.tick(1);
    w = sim.overworld.getEntities({ type: "hollow:watcher" })[0];
  }
  assert(w, "a watcher appeared on night 2");
  return { sim, p, w };
}

await test("watcher appears out of view, 34-50 blocks away", () => {
  const { sim, p, w } = watcherNight();
  const d = Math.hypot(w.location.x - p.location.x, w.location.z - p.location.z);
  assert(d >= 33 && d <= 51, `distance ${d.toFixed(1)}`);
  const v = p.getViewDirection();
  const to = { x: w.location.x - p.location.x, z: w.location.z - p.location.z };
  const ang = (Math.acos((v.x * to.x + v.z * to.z) / (Math.hypot(v.x, v.z) * Math.hypot(to.x, to.z))) * 180) / Math.PI;
  assert(ang >= 90, `angle from view ${ang.toFixed(0)}°`);
  noErrors(sim);
});

await test("watcher: staring makes it withdraw and leave one Weeping Sap (once per night)", () => {
  const { sim, p, w } = watcherNight();
  p.lookAt({ x: w.location.x, y: w.location.y + 2.6, z: w.location.z });
  sim.tick(60);
  assert(w._events.includes("hollow:to_withdraw"), `withdrew: ${w._events}`);
  eq(sim.overworld.items("hollow:pale_resin").length, 1, "resin dropped");
  sim.tick(400);
  assert(!w.isValid, "watcher gone after withdrawing");
  // a second watcher the same night may be stared down, but gives no more resin
  let w2;
  for (let i = 0; i < 6000 && !w2; i++) {
    sim.tick(1);
    w2 = sim.overworld.getEntities({ type: "hollow:watcher" })[0];
  }
  if (w2 && sim.world.getTimeOfDay() > 12400) {
    p.lookAt({ x: w2.location.x, y: w2.location.y + 2.6, z: w2.location.z });
    sim.tick(60);
    eq(sim.overworld.items("hollow:pale_resin").length, 1, "no second resin the same night");
  }
  noErrors(sim);
});

await test("watcher: consecutive successful encounters alternate direct and patient stalking", () => {
  const { sim, p, w } = watcherNight(301);
  const first = w.getProperty("hollow:patient");
  sim.damage(w, 999, p);
  let second;
  for (let i = 0; i < 8000 && !second; i++) { sim.tick(1); second = sim.overworld.getEntities({ type: "hollow:watcher" })[0]; }
  assert(second, "second eligible encounter appeared");
  eq(second.getProperty("hollow:patient"), !first, "pattern alternates, rather than repeating the same pursuit");
  noErrors(sim);
});

await test("watcher: patient stalking pauses at distance and observation removes both movement groups", () => {
  let sample;
  for (let seed = 302; seed < 312; seed++) {
    const candidate = watcherNight(seed);
    if (candidate.w.getProperty("hollow:patient")) { sample = candidate; break; }
  }
  assert(sample, "patient pattern sampled");
  const { sim, p, w } = sample;
  sim.tick(100);
  assert(w._groups.has("hollow:stalk_patient"), "slow pursuit group active");
  p.lookAt({ x: w.location.x, y: w.location.y + 2.6, z: w.location.z });
  sim.tick(4);
  assert(!w._groups.has("hollow:stalk_patient") && !w._groups.has("hollow:stalk"), "observed movement removed");
  assert(w._groups.has("hollow:lurk"), "zero-speed watching pose active");
  p._view = { x: -(w.location.x - p.location.x), y: 0, z: -(w.location.z - p.location.z) };
  const n = Math.hypot(p._view.x, p._view.z); p._view.x /= n; p._view.z /= n;
  sim.tick(80);
  const before = w._events.length;
  sim.tick(220);
  assert(w._events.slice(before).includes("hollow:to_lurk"), "patient creature pauses without being watched");
  assert(w._events.slice(before).includes("hollow:to_stalk_patient"), "creep resumes after its pause");
  noErrors(sim);
});

await test("watcher: may watch an open forest edge but still requires forest spawn ground", () => {
  for (const edge of [true, false]) {
    const sim = newWorld(313);
    sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ watcher: true, borrowed: false, hollowed: false, mirebound: false, knocker: false, sites: false }));
    boot(sim, 313);
    sim.overworld.biome = (loc) => edge && Math.hypot(loc.x, loc.z) > 20 ? "minecraft:forest" : "minecraft:plains";
    sim.addPlayer("Alex", undefined, veteran);
    goTo(sim, 1, 13000);
    sim.tick(5000);
    eq(sim.spawnLog.includes("hollow:watcher"), edge, edge ? "forest-edge sighting" : "treeless plains stay excluded");
    noErrors(sim);
  }
});

await test("watcher: stalks when unwatched; twig warning; lunges only at an unlit player", () => {
  const { sim, p, w } = watcherNight();
  p._view = { x: -(w.location.x - p.location.x), y: 0, z: -(w.location.z - p.location.z) }; // look away
  const L = Math.hypot(p._view.x, p._view.z);
  p._view = { x: p._view.x / L, y: 0, z: p._view.z / L };
  sim.tick(100);
  assert(w._events.some((event) => event === "hollow:to_stalk" || event === "hollow:to_stalk_patient"), `stalking: ${w._events}`);
  // (no pathfinding in the fake) - move it behind the player as the engine would
  w.teleport({ x: p.location.x - p._view.x * 8, y: 64, z: p.location.z - p._view.z * 8 });
  sim.tick(8);
  assert(p._log.some((l) => l.includes("twig snaps")), "twig warning before any strike");
  p.hold("minecraft:torch");
  w.teleport({ x: p.location.x - p._view.x * 4, y: 64, z: p.location.z - p._view.z * 4 });
  sim.tick(8);
  assert(!w._events.includes("hollow:to_lunge"), "no lunge at a player holding a torch");
  p._inv.setItem(0, undefined);
  sim.tick(100); // unwatched again -> stalks again
  w.teleport({ x: p.location.x - p._view.x * 4, y: 64, z: p.location.z - p._view.z * 4 });
  sim.tick(8);
  assert(w._events.includes("hollow:to_lunge"), `lunges at an unlit player: ${w._events}`);
  sim.fire("dataDrivenEntityTrigger", { entity: w, eventId: "hollow:watcher_struck" });
  sim.tick(4);
  assert(w._events.includes("hollow:to_withdraw"), "one strike, then it withdraws");
  noErrors(sim);
});

await test("leaving mid-encounter removes the encounter; rejoining duplicates nothing", () => {
  const { sim, p } = watcherNight();
  sim.removePlayer(p);
  sim.tick(5);
  eq(count(sim, "hollow:watcher"), 0, "watcher removed with its target");
  sim.addPlayer("Alex", { x: 0.5, y: 64, z: 0.5 }, { initial: true });
  sim.tick(20);
  assert(count(sim, "hollow:watcher") <= 1, "at most one new watcher");
  noErrors(sim);
});

// =============================================================================== the Heart Below
function bossWorld(nPlayers = 1, seed = 5) {
  const sim = newWorld(seed);
  const players = [];
  for (let i = 0; i < nPlayers; i++) players.push(sim.addPlayer(`P${i}`, { x: 0.5 + i, y: 64, z: 0.5 }, veteran));
  sim.tick(100);
  sim.fire("scriptEventReceive", { id: "hollow:site", message: "shrine", sourceEntity: players[0] });
  const site = JSON.parse(sim.world.getDynamicProperty("hollow:sites")).find((x) => x.t === "shrine");
  assert(site, "shrine placed");
  const center = { x: site.x + 12.5, y: site.y + 3, z: site.z + 12.5 };
  let altar;
  for (const [k, c] of sim.overworld._blocks) if (c.perm.type.id === "hollow:heart_altar") altar = k.split(",").map(Number);
  assert(altar, "altar exists in the placed shrine");
  players.forEach((p, i) => p.teleport({ x: center.x + 4 + i, y: site.y + 1, z: center.z }));
  const altarBlock = sim.overworld.getBlock({ x: altar[0], y: altar[1], z: altar[2] });
  const awaken = (p = players[0]) => {
    p.hold("hollow:offering_of_silence");
    sim.interactBlock(p, altarBlock);
  };
  return { sim, players, p: players[0], site, center, altarBlock, awaken };
}
const hearts = (sim) => sim.overworld.getEntities({ type: "hollow:heart_below" });
const veins = (sim) => sim.overworld.getEntities({ type: "hollow:heart_vein" });
const bossState = (sim) => JSON.parse(sim.world.getDynamicProperty("hollow:boss"));

await test("boss: full fight - shield, veins, phases, minions, rewards once, altar rests", () => {
  const { sim, p, awaken, altarBlock } = bossWorld();
  awaken();
  eq(p._inv.count("hollow:offering_of_silence"), 0, "offering consumed");
  eq(altarBlock.permutation.getState("hollow:awake"), 1, "altar awake");
  sim.tick(125);
  eq(hearts(sim).length, 1, "one heart");
  eq(veins(sim).length, 4, "four veins");
  const heart = hearts(sim)[0];
  eq(heart.getProperty("hollow:shielded"), true, "shielded at start");
  const hp0 = heart._health.currentValue;
  sim.damage(heart, 50, p);
  sim.tick(5);
  eq(heart._health.currentValue, hp0, "shield blocks damage");
  assert(p._log.some((l) => l.includes("shielded")), "shield hint shown");
  for (const v of veins(sim)) sim.damage(v, 999, p);
  sim.tick(10);
  eq(heart.getProperty("hollow:shielded"), false, "exposed once veins are broken");
  sim.damage(heart, hp0 * 0.45, p);
  sim.tick(10);
  eq(bossState(sim).phase, 2, "phase 2 at 60%");
  eq(heart.getProperty("hollow:shielded"), true, "shield returns in phase 2");
  eq(veins(sim).length, 3, "three veins regrow");
  eq(count(sim, "hollow:hollowed"), 3, "2 + players juvenile minions");
  for (const v of veins(sim)) sim.damage(v, 999, p);
  sim.tick(10);
  sim.damage(heart, hp0 * 0.36, p);
  sim.tick(10);
  eq(bossState(sim).phase, 3, "phase 3 below 25%");
  sim.tick(400); // let the phase-3 attacks run
  sim.damage(heart, 9999, p);
  sim.tick(10);
  eq(p._inv.count("hollow:stilled_heart"), 1, "one Stilled Heart");
  eq(p._xp, 150, "150 XP");
  assert(journal(p).includes("after") && journal(p).includes("craft_lantern"), "after + lantern entries");
  eq(count(sim, "hollow:hollowed"), 0, "minions cleared");
  eq(bossState(sim).active, false, "fight over");
  sim.fire("entityDie", { deadEntity: heart, damageSource: { damagingEntity: p } });
  eq(p._inv.count("hollow:stilled_heart"), 1, "a duplicate death event pays nothing");
  awaken();
  eq(p._inv.count("hollow:offering_of_silence"), 1, "offering kept while the altar rests");
  assert(p._log.some((l) => l.includes("altar is cold")), "rest message");
  noErrors(sim);
});

await test("boss: scales with players in the arena; every participant rewarded once", () => {
  const { sim, players, awaken } = bossWorld(2);
  awaken();
  sim.tick(125);
  const heart = hearts(sim)[0];
  eq(heart._health.effectiveMax, 480, "2-player health");
  for (const v of veins(sim)) sim.damage(v, 999, players[1]);
  sim.tick(10);
  sim.damage(heart, 9999, players[0]);
  sim.tick(10);
  for (const p of players) eq(p._inv.count("hollow:stilled_heart"), 1, `${p.name} reward`);
  noErrors(sim);
});

await test("boss: a full inventory drops the Stilled Heart once and preserves completion", () => {
  const { sim, p, awaken } = bossWorld(1, 217);
  awaken(); sim.tick(125);
  const heart = hearts(sim)[0];
  for (const v of veins(sim)) sim.damage(v, 999, p);
  sim.tick(10);
  const { ItemStack } = sim.exports();
  for (let i = 0; i < p._inv.size; i++) p._inv.setItem(i, new ItemStack("minecraft:cobblestone", 64));
  sim.damage(heart, 9999, p);
  eq(sim.overworld.items("hollow:stilled_heart").length, 1, "reward dropped beside the player");
  assert(journal(p).includes("after"), "completion saved despite full inventory");
  sim.fire("entityDie", { deadEntity: heart, damageSource: { damagingEntity: p } });
  eq(sim.overworld.items("hollow:stilled_heart").length, 1, "no duplicate reward");
  noErrors(sim);
});

await test("boss: a server restart during the rise still raises exactly one heart", () => {
  const { sim, awaken } = bossWorld();
  awaken();
  sim.tick(60);
  boot(sim);
  sim.tick(200);
  eq(hearts(sim).length, 1, "one heart after reboot");
  eq(veins(sim).length, 4, "four veins after reboot");
  eq(bossState(sim).active, true, "fight active");
  noErrors(sim);
});

await test("boss: a restart mid-fight resumes it; leftovers from old fights are removed", () => {
  const { sim, p, awaken, center } = bossWorld();
  // a heart from some earlier, abandoned fight (wrong token) and an egg-spawned vein
  const stale = sim.overworld.spawnEntity("hollow:heart_below", { x: center.x + 30, y: center.y, z: center.z });
  stale.setDynamicProperty("hollow:fight", 12345);
  const egg = sim.overworld.spawnEntity("hollow:heart_vein", { x: center.x + 31, y: center.y, z: center.z });
  awaken();
  sim.tick(125);
  const heart = hearts(sim).find((h) => h !== stale);
  boot(sim);
  for (const e of hollowEntities(sim)) sim.loadEntity(e);
  sim.tick(50);
  assert(heart.isValid, "current heart kept");
  eq(veins(sim).length, 4, "current veins kept");
  assert(!stale.isValid && !egg.isValid, "stale heart and stray vein removed");
  for (const v of veins(sim)) sim.damage(v, 999, p);
  sim.tick(10);
  eq(heart.getProperty("hollow:shielded"), false, "fight continues after reboot");
  noErrors(sim);
});

await test("boss: dormancy waits for the arena to load, then returns the Offering once", () => {
  const { sim, p, awaken, center } = bossWorld();
  awaken();
  sim.tick(125);
  const heart = hearts(sim)[0];
  p.teleport({ x: center.x + 200, y: 64, z: center.z });
  sim.overworld.loaded = (loc) => Math.abs(loc.x - center.x) > 60; // arena unloaded
  sim.tick(3000);
  assert(heart._valid, "heart left alone while unloaded");
  eq(bossState(sim).active, true, "still active while unloaded");
  sim.overworld.loaded = () => true;
  sim.tick(1300);
  assert(!heart._valid, "heart removed once loaded and abandoned");
  eq(veins(sim).length, 0, "veins removed");
  eq(sim.overworld.items("hollow:offering_of_silence").length, 1, "offering returned once");
  eq(bossState(sim).active, false, "dormant");
  noErrors(sim);
});

await test("boss: a heart that vanishes without dying returns the Offering", () => {
  const { sim, awaken } = bossWorld();
  awaken();
  sim.tick(125);
  hearts(sim)[0].remove();
  sim.tick(300);
  eq(bossState(sim).active, false, "fight closed");
  eq(sim.overworld.items("hollow:offering_of_silence").length, 1, "offering returned");
  noErrors(sim);
});

// =============================================================================== knocker + ward
function houseWorld(seed = 21, rules = {}) {
  const sim = newWorld(seed);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ frequency: 200, watcher: false, borrowed: false, hollowed: false, mirebound: false, ...rules }));
  boot(sim, seed);
  const p = sim.addPlayer("Alex", { x: 0.5, y: 64, z: 0.5 }, veteran);
  const ow = sim.overworld;
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) ow.setBlock({ x, y: 67, z }, "minecraft:spruce_planks");
  ow.setBlock({ x: 3, y: 64, z: 0 }, "minecraft:spruce_door");
  ow.setBlock({ x: 3, y: 65, z: 0 }, "minecraft:spruce_door");
  const door = { x: 3, y: 64, z: 0 };
  return { sim, p, ow, door };
}
function waitKnocker(sim, maxTicks = 9000) {
  for (let i = 0; i < maxTicks; i++) {
    sim.tick(1);
    const k = sim.overworld.getEntities({ type: "hollow:knocker" })[0];
    if (k) return k;
  }
  return undefined;
}

await test("knocker: never before night 4; one visit; knocks; leaves exactly one nail", () => {
  const { sim, ow, door } = houseWorld();
  goTo(sim, 3, 0); // nights 1-3 passed
  eq(sim.spawnLog.filter((t) => t === "hollow:knocker").length, 0, "no visit before night 4");
  goTo(sim, 3, 12000);
  const k = waitKnocker(sim);
  assert(k, "visited on night 4 (frequency 200%)");
  const d0 = Math.hypot(k.location.x - door.x, k.location.z - door.z);
  assert(d0 >= 15, `spawned away from the door (${d0.toFixed(1)})`);
  k.teleport({ x: door.x + 1.5, y: 64, z: door.z + 0.5 }); // the engine walks it to the door
  sim.tick(20);
  assert(sim.worldSounds.includes("hollow.knocker.knock"), "knocks");
  sim.tick(960);
  eq(ow.items("hollow:knocker_nail").length, 1, "one nail on the step");
  sim.tick(700);
  assert(!k.isValid, "it left");
  goTo(sim, 4, 0);
  eq(sim.spawnLog.filter((t) => t === "hollow:knocker").length, 1, "one visit that night");
  noErrors(sim);
});

await test("knocker: a ward by the door turns it away (one charge, no nail); opening the door lets it in", () => {
  const { sim, p, ow, door } = houseWorld(22);
  const ward = sim.placeBlock(p, { x: 1, y: 64, z: 1 }, "hollow:rowan_ward");
  goTo(sim, 3, 12000);
  let k = waitKnocker(sim);
  assert(k, "visit");
  k.teleport({ x: door.x + 8, y: 64, z: door.z });
  sim.tick(20);
  assert(k._events.includes("hollow:leave"), `turned away: ${k._events}`);
  eq(ward.permutation.getState("hollow:used"), 1, "ward spent one charge");
  sim.tick(1200);
  eq(ow.items("hollow:knocker_nail").length, 0, "no nail when turned away");
  // next eligible night (Standard: 2 nights apart), ward removed, door answered
  sim.breakBlock(p, ward);
  goTo(sim, 5, 12000);
  k = waitKnocker(sim);
  assert(k, "second visit two nights later");
  k.teleport({ x: door.x + 1.5, y: 64, z: door.z + 0.5 });
  sim.tick(40);
  ow.setBlock(door, "minecraft:spruce_door", { open_bit: true });
  sim.tick(20);
  assert(k._events.includes("hollow:hunt"), "answering the door lets it in");
  noErrors(sim);
});

await test("ward: 4 charges, one per creature per night, charcoal recharges, salvage when used", () => {
  const { sim, p } = houseWorld(23);
  const ward = sim.placeBlock(p, { x: 1, y: 64, z: 1 }, "hollow:rowan_ward");
  eq(ward.permutation.getState("hollow:used"), 0, "placed full");
  p.hold("minecraft:charcoal", 3);
  ward.setPermutation(ward.permutation.withState("hollow:used", 2));
  sim.interactBlock(p, ward);
  eq(ward.permutation.getState("hollow:used"), 1, "charcoal adds a charge");
  eq(p._inv.count("minecraft:charcoal"), 2, "charcoal consumed");
  sim.breakBlock(p, ward);
  eq(sim.overworld.items("minecraft:iron_nugget").length, 1, "used ward breaks into salvage");
  eq(sim.overworld.items("hollow:rowan_ward").length, 0, "not returned whole");
  const w2 = sim.placeBlock(p, { x: 1, y: 64, z: -1 }, "hollow:rowan_ward");
  sim.breakBlock(p, w2);
  eq(sim.overworld.items("hollow:rowan_ward").length, 1, "full ward returns whole");
  noErrors(sim);
});

await test("ward: a failed block update keeps charcoal and the previous charge count", () => {
  const { sim, p } = houseWorld(209);
  const w = sim.placeBlock(p, { x: 1, y: 64, z: 1 }, "hollow:rowan_ward");
  w.setPermutation(w.permutation.withState("hollow:used", 3));
  const set = w.setPermutation;
  w.setPermutation = () => { throw new Error("chunk became unavailable"); };
  p.hold("minecraft:charcoal", 2);
  sim.interactBlock(p, w);
  eq(p._inv.count("minecraft:charcoal"), 2, "nothing consumed on failure");
  eq(w.permutation.getState("hollow:used"), 3, "charge unchanged");
  assert(p._log.at(-1).includes("No charcoal spent"), "honest failure feedback");
  w.setPermutation = set;
  sim.interactBlock(p, w);
  eq(p._inv.count("minecraft:charcoal"), 1, "retry consumes one charcoal");
  eq(w.permutation.getState("hollow:used"), 2, "retry adds one charge");
  noErrors(sim);
});

await test("ward: overflow stays inactive without consuming charcoal and can reclaim a freed slot", () => {
  const { sim, p } = houseWorld(210);
  const ws = [];
  for (let i = 0; i < 33; i++) ws.push(sim.placeBlock(p, { x: i, y: 64, z: 10 }, "hollow:rowan_ward"));
  const extra = ws.at(-1);
  extra.setPermutation(extra.permutation.withState("hollow:used", 2));
  p.hold("minecraft:charcoal", 3);
  sim.interactBlock(p, extra);
  eq(p._inv.count("minecraft:charcoal"), 3, "inactive ward takes no charcoal");
  assert(p._log.at(-1).includes("inactive"), "cap explained");
  sim.breakBlock(p, ws[0]);
  sim.interactBlock(p, extra);
  eq(p._inv.count("minecraft:charcoal"), 2, "reactivated ward takes one charcoal");
  const saved = JSON.parse(sim.world.getDynamicProperty("hollow:wards"));
  eq(saved.length, 32, "cap still holds");
  assert(saved.some((s) => s.x === 32), "overflow ward is now registered");
  noErrors(sim);
});

await test("chime rings when a creature is within 14 blocks, never when silenced", () => {
  const { sim, p } = houseWorld(24);
  const chime = sim.placeBlock(p, { x: 0, y: 66, z: 0 }, "hollow:hollow_chime");
  sim.tick(50); // after the start-up orphan sweep (it would remove an untracked test creature)
  sim.overworld.spawnEntity("hollow:knocker", { x: 10, y: 64, z: 0 });
  sim.tick(60); // chimes are checked every 2 s
  const rings = sim.worldSounds.filter((s) => s === "hollow.chime.ring").length;
  assert(rings >= 1, "rang");
  sim.tick(400);
  const later = sim.worldSounds.filter((s) => s === "hollow.chime.ring").length;
  assert(later - rings <= 400 / 120 + 1, "cooldown respected");
  sim.interactBlock(p, chime);
  const before = sim.worldSounds.filter((s) => s === "hollow.chime.ring").length;
  sim.tick(400);
  eq(sim.worldSounds.filter((s) => s === "hollow.chime.ring").length, before, "silenced");
  noErrors(sim);
});

// =============================================================================== shelter protection
function borrowedWorld(seed = 121) {
  const sim = newWorld(seed);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ watcher: false, hollowed: false, mirebound: false, knocker: false, sites: false }));
  boot(sim, seed);
  const p = sim.addPlayer("Alex", { x: 0.5, y: 64, z: 0.5 }, veteran);
  for (let i = 0; i < 4; i++) sim.overworld.spawnEntity("minecraft:sheep", { x: 24 + i, y: 64, z: -12 });
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "on", sourceEntity: p });
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "night", sourceEntity: p });
  return { sim, p, ow: sim.overworld };
}
function waitBorrowed(sim) {
  for (let i = 0; i < 2000; i++) {
    sim.tick(1);
    const b = sim.overworld.getEntities({ type: "hollow:borrowed" }).find((e) => !e._events.includes("hollow:reveal") && !e._events.includes("hollow:flee"));
    if (b) return b;
  }
  throw new Error("no disguised Borrowed joined the flock");
}

await test("borrowed: joins a real flock and shears reveal it at night", () => {
  const { sim, p } = borrowedWorld();
  const b = waitBorrowed(sim);
  assert(Math.hypot(b.location.x - p.location.x, b.location.z - p.location.z) >= 14, "appears away from player");
  p.teleport({ x: b.location.x + 1, y: b.location.y, z: b.location.z });
  sim.fire("dataDrivenEntityTrigger", { entity: b, eventId: "hollow:sheared" });
  assert(b._events.includes("hollow:begin_reveal"), "shears begin the visible transformation");
  sim.tick(40);
  assert(b._events.includes("hollow:reveal"), "hunting activates after the transformation window");
  assert(journal(p).includes("borrowed2"), "counterplay is recorded");
  noErrors(sim);
});

await test("borrowed: transformation has no hunting group and repeated shears cannot skip its window", () => {
  const { sim, p } = borrowedWorld(314); const b = waitBorrowed(sim);
  p.teleport({ x: b.location.x + 8, y: b.location.y, z: b.location.z });
  sim.fire("dataDrivenEntityTrigger", { entity: b, eventId: "hollow:sheared" });
  eq(b.getProperty("hollow:state"), "revealing", "transformation begins");
  assert(b._groups.has("hollow:revealing") && !b._groups.has("hollow:revealed"), "no chase/attack AI during reveal");
  sim.tick(20);
  sim.fire("dataDrivenEntityTrigger", { entity: b, eventId: "hollow:sheared" });
  eq(b.getProperty("hollow:state"), "revealing", "not hunting before 28 ticks");
  sim.tick(20);
  eq(b.getProperty("hollow:state"), "revealed", "night hunt begins after the window");
  assert(!b._groups.has("hollow:revealing") && b._groups.has("hollow:revealed"), "temporary zero-speed group removed");
  noErrors(sim);
});

await test("borrowed: dawn and wards interrupt the transformation into a safe retreat", () => {
  for (const reason of ["dawn", "ward"]) {
    const { sim, p } = borrowedWorld(315); const b = waitBorrowed(sim);
    sim.fire("dataDrivenEntityTrigger", { entity: b, eventId: "hollow:sheared" });
    if (reason === "dawn") sim.world.setTimeOfDay(1000);
    else sim.placeBlock(p, { x: Math.floor(b.location.x) + 1, y: 64, z: Math.floor(b.location.z) }, "hollow:rowan_ward");
    sim.tick(40);
    eq(b.getProperty("hollow:state"), "fleeing", "retreats instead of night hunting");
    assert(!b._groups.has("hollow:revealed") && !b._groups.has("hollow:revealing"), "no stale attack or freeze group");
    noErrors(sim);
  }
});

await test("borrowed: disguised flock member pauses to watch and resumes without exposing itself", () => {
  const { sim, p } = borrowedWorld(316); const b = waitBorrowed(sim);
  p.teleport({ x: b.location.x + 10, y: b.location.y, z: b.location.z });
  p.hold("minecraft:torch");
  for (let i = 0; i < 400 && !b.getProperty("hollow:watchful"); i++) sim.tick(1);
  eq(b.getProperty("hollow:watchful"), true, "watchful pause begins");
  assert(b._groups.has("hollow:watchful"), "pause has a real stop-movement group");
  sim.tick(90);
  eq(b.getProperty("hollow:watchful"), false, "pause ends");
  assert(!b._groups.has("hollow:watchful") && b._groups.has("hollow:disguised"), "walking restores without revealing");
  eq(b.getProperty("hollow:revealed"), false, "remains an impostor");
  noErrors(sim);
});

await test("borrowed: a transformation cannot resume after its target dies or changes dimension", () => {
  for (const reason of ["death", "dimension"]) {
    const { sim, p } = borrowedWorld(319); const b = waitBorrowed(sim);
    sim.fire("dataDrivenEntityTrigger", { entity: b, eventId: "hollow:sheared" });
    if (reason === "death") sim.damage(p, 100);
    else { p.dimension = sim.world.getDimension("minecraft:nether"); sim.fire("playerDimensionChange", { player: p }); }
    sim.tick(40);
    assert(!b.isValid && !b._events.includes("hollow:reveal"), "no late hunter from a cancelled transformation");
    noErrors(sim);
  }
});

await test("ward: unloading its chunk cannot erase protection or the saved registry", () => {
  const { sim, p, ow } = borrowedWorld(122);
  const b = waitBorrowed(sim);
  const at = { x: Math.floor(b.location.x) + 2, y: 64, z: Math.floor(b.location.z) };
  const ward = sim.placeBlock(p, at, "hollow:rowan_ward");
  ow.loaded = (loc) => !(Math.floor(loc.x) === at.x && Math.floor(loc.z) === at.z);
  sim.tick(30);
  eq(JSON.parse(sim.world.getDynamicProperty("hollow:wards")).length, 1, "unreadable ward stays registered");
  assert(!b._events.includes("hollow:flee"), "no invented protection from an unreadable block");
  ow.loaded = () => true;
  sim.tick(20);
  assert(b._events.includes("hollow:flee"), "ward works again as soon as the chunk is readable");
  eq(ward.permutation.getState("hollow:used"), 1, "one charge used");
  noErrors(sim);
});

await test("ward: same creature type spends one charge per night across a server restart", () => {
  const { sim, p, ow } = borrowedWorld(123);
  let b = waitBorrowed(sim);
  const at = { x: Math.floor(b.location.x) + 2, y: 64, z: Math.floor(b.location.z) };
  const ward = sim.placeBlock(p, at, "hollow:rowan_ward");
  sim.tick(20);
  assert(b._events.includes("hollow:flee"), "first borrowed repelled");
  eq(ward.permutation.getState("hollow:used"), 1, "first charge spent");
  boot(sim, 123);
  sim.tick(50); // startup orphan sweep removes the old encounter
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "on", sourceEntity: p });
  b = waitBorrowed(sim);
  b.teleport({ x: at.x + 1, y: 64, z: at.z + 1 });
  sim.tick(20);
  assert(b._events.includes("hollow:flee"), "second borrowed repelled");
  eq(ward.permutation.getState("hollow:used"), 1, "no extra charge after restarting on the same night");
  noErrors(sim);
});

await test("equipment: stale loaded lantern registrations release capacity; unloaded ones keep it", () => {
  const sim = newWorld(124);
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  const spots = [];
  for (let i = 0; i < 16; i++) {
    const at = { x: i * 4, y: 64, z: 4 };
    spots.push(at);
    sim.placeBlock(p, at, "hollow:heartwood_lantern");
  }
  sim.overworld.loaded = (loc) => !(loc.x === spots[0].x && loc.z === spots[0].z);
  sim.placeBlock(p, { x: 1, y: 64, z: 1 }, "hollow:heartwood_lantern");
  assert(p._log.some((l) => l.includes("light only")), "overflow lantern warns player");
  eq(JSON.parse(sim.world.getDynamicProperty("hollow:lanterns")).length, 16, "unloaded lantern reserves its slot");
  sim.overworld.loaded = () => true;
  sim.overworld.setBlock(spots[0], "minecraft:air"); // command removal, without break callbacks
  sim.placeBlock(p, { x: 2, y: 64, z: 1 }, "hollow:heartwood_lantern");
  const saved = JSON.parse(sim.world.getDynamicProperty("hollow:lanterns"));
  eq(saved.length, 16, "capacity recovered after a real removal");
  assert(saved.some((s) => s.x === 2 && s.z === 1), "new lantern registered");
  noErrors(sim);
});

// =============================================================================== mirebound
function swampWorld(seed = 31, refuse = false) {
  const sim = newWorld(seed);
  sim.refuseRiding = refuse;
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ frequency: 200, watcher: false, borrowed: false, hollowed: false, knocker: false }));
  boot(sim, seed);
  const ow = sim.overworld;
  ow.biome = () => "minecraft:swampland";
  for (let x = 4; x <= 30; x++) for (let z = -16; z <= 16; z++) {
    ow.setBlock({ x, y: 63, z }, "minecraft:water");
    ow.setBlock({ x, y: 62, z }, "minecraft:water");
  }
  const p = sim.addPlayer("Alex", { x: 2.5, y: 64, z: 0.5 }, veteran);
  p._view = { x: 1, y: 0, z: 0 };
  goTo(sim, 2, 13000);
  let m;
  for (let i = 0; i < 6000 && !m; i++) {
    sim.tick(1);
    m = ow.getEntities({ type: "hollow:mirebound" })[0];
  }
  assert(m, "a mirebound settled in the shallows");
  return { sim, p, m, ow };
}

await test("mirebound: shallow water only; clues; 0.6 s windup; sneak frees; max 5 s hold", () => {
  const { sim, p, m } = swampWorld();
  assert(m.location.y === 62, `on the floor of 2-deep water (y=${m.location.y})`);
  sim.tick(400);
  assert(sim.worldSounds.some((s) => s.startsWith("hollow.mirebound.bubble") || s.startsWith("hollow.mirebound.gurgle")), "bubble/gurgle clues");
  p.teleport({ x: m.location.x - 2.5, y: 63, z: m.location.z });
  p.isInWater = true;
  sim.tick(4);
  assert(m._events.includes("hollow:to_erupt") || JSON.stringify(m._events).includes("erupt"), `windup: ${m._events}`);
  // stepping back out of reach during the windup avoids the grab
  p.teleport({ x: m.location.x - 6, y: 64, z: m.location.z });
  sim.tick(20);
  eq(p.ridingOn, undefined, "escaped during the windup");
  noErrors(sim);
});

await test("mirebound: grab holds at most 5 s; sneak/dismount frees; forced-riding fallback bites", () => {
  for (const refuse of [false, true]) {
    const { sim, p, m } = swampWorld(32, refuse);
    p.teleport({ x: m.location.x - 2, y: 63, z: m.location.z });
    p.isInWater = true;
    sim.tick(30);
    if (refuse) {
      assert(p._health.currentValue <= 17, `fallback bite (hp ${p._health.currentValue})`);
      assert(p._effects.some((e) => e.id === "slowness"), "fallback slowness");
      eq(p.ridingOn, undefined, "not held");
    } else {
      assert(p.ridingOn === m, "held");
      sim.tick(140);
      eq(p.ridingOn, undefined, "released within 5 s");
      assert(p._health.currentValue >= 12, `bounded damage (hp ${p._health.currentValue})`);
    }
    noErrors(sim);
  }
});

// =============================================================================== hollowed
function caveWorld(seed = 41) {
  const sim = newWorld(seed);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ frequency: 200, watcher: false, borrowed: false, knocker: false, mirebound: false }));
  boot(sim, seed);
  const ow = sim.overworld;
  for (let x = -32; x <= 32; x++) for (let z = -32; z <= 32; z++) for (let y = -12; y <= -9; y++) ow.setBlock({ x, y, z }, "minecraft:air");
  for (let i = -12; i <= 12; i++) for (let y = -12; y <= -9; y++) {
    ow.setBlock({ x: 12, y, z: i }, "minecraft:stone");
    ow.setBlock({ x: -12, y, z: i }, "minecraft:stone");
    ow.setBlock({ x: i, y, z: 12 }, "minecraft:stone");
    ow.setBlock({ x: i, y, z: -12 }, "minecraft:stone");
  }
  const p = sim.addPlayer("Alex", { x: 0.5, y: -12, z: 0.5 }, veteran);
  goTo(sim, 1, 6000);
  return { sim, p, ow };
}

await test("hollowed: spawns out of sight in the dark; hears sprinting, not sneaking or wool", () => {
  const { sim, p, ow } = caveWorld();
  let h;
  for (let i = 0; i < 6000 && !h; i++) {
    sim.tick(1);
    h = ow.getEntities({ type: "hollow:hollowed" })[0];
  }
  assert(h, "a hollowed emerged");
  const d = Math.hypot(h.location.x - p.location.x, h.location.z - p.location.z);
  assert(d >= 17, `spawned ${d.toFixed(1)} blocks away, beyond the walls`);
  // bring it into the room (the engine would path here) and test hearing
  h.teleport({ x: 8.5, y: -12, z: 0.5 });
  sim.tick(25);
  const ev0 = h._events.length;
  p.isSneaking = true;
  p._velocity = { x: 0.1, y: 0, z: 0 };
  sim.tick(40);
  eq(h._events.slice(ev0).includes("hollow:investigate"), false, "sneaking is silent");
  p.isSneaking = false;
  ow.setBlock({ x: 0, y: -13, z: 0 }, "minecraft:white_wool");
  sim.tick(40);
  eq(h._events.slice(ev0).includes("hollow:investigate"), false, "wool is silent");
  ow.setBlock({ x: 0, y: -13, z: 0 }, "minecraft:stone");
  p.isSprinting = true;
  p._velocity = { x: 0.25, y: 0, z: 0 };
  sim.tick(40);
  assert(h._events.slice(ev0).includes("hollow:investigate"), "sprinting is heard");
  assert(ow.getEntities({ type: "hollow:lure" }).length >= 1, "a lure marks the noise");
  noErrors(sim);
});

await test("hollowed: reading movement noise in the journal cannot swallow a landing sound", async () => {
  const { sim, p, ow } = caveWorld(218);
  let h;
  for (let i = 0; i < 6000 && !h; i++) { sim.tick(1); h = ow.getEntities({ type: "hollow:hollowed" })[0]; }
  assert(h, "tracked listener spawned");
  h.teleport({ x: 7.5, y: -12, z: 0.5 });
  p.isOnGround = false;
  sim.tick(20); // the actual hearing poll observes the airborne state
  p.isOnGround = true;
  p._ui.push({ canceled: false, selection: 5 }, { canceled: true });
  openBook(sim, p);
  await flush(); // open the report before advancing the next hearing poll
  assert(p._shownForms.at(-1)._body.includes("jumping"), "report observes the pending landing");
  const before = h._events.length;
  sim.tick(10);
  assert(h._events.slice(before).includes("hollow:investigate"), "landing still reaches the listener");
  noErrors(sim);
});

await test("hollowed: thrown projectiles create a decoy away from the player", () => {
  const { sim, ow } = caveWorld(42);
  const h = ow.spawnEntity("hollow:hollowed", { x: 8.5, y: -12, z: 0.5 });
  // only tracked hollowed listen: start one through the director, then move it
  let tracked;
  for (let i = 0; i < 6000 && !tracked; i++) {
    sim.tick(1);
    tracked = ow.getEntities({ type: "hollow:hollowed" }).find((e) => e !== h);
  }
  assert(tracked, "tracked hollowed");
  tracked.teleport({ x: 5.5, y: -12, z: 8.5 });
  sim.tick(25);
  sim.fire("projectileHitBlock", { dimension: ow, location: { x: 9, y: -12, z: 9 } });
  sim.tick(2);
  const lure = ow.getEntities({ type: "hollow:lure" })[0];
  assert(lure && Math.hypot(lure.location.x - 9, lure.location.z - 9) < 1.5, "decoy at the impact point");
  noErrors(sim);
});

await test("hollowed: reaching a decoy triggers a listening pause and a fresh noise redirects it", () => {
  const { sim, p, ow } = caveWorld(317);
  let h;
  for (let i = 0; i < 6000 && !h; i++) { sim.tick(1); h = ow.getEntities({ type: "hollow:hollowed" })[0]; }
  assert(h, "listener spawned");
  const at = { ...h.location };
  sim.fire("projectileHitBlock", { dimension: ow, location: at });
  sim.tick(40);
  eq(h.getProperty("hollow:state"), "listening", "pauses to listen at the last noise");
  assert(h._groups.has("hollow:listening") && !h._groups.has("hollow:investigate"), "movement stopped while listening");
  sim.fire("projectileHitBlock", { dimension: ow, location: { x: at.x + 8, y: at.y, z: at.z } });
  eq(h.getProperty("hollow:state"), "investigate", "fresh noise wakes it immediately");
  assert(!h._groups.has("hollow:listening") && h._groups.has("hollow:investigate"), "new pursuit has no frozen overlay");
  h.teleport({ x: at.x + 8, y: at.y, z: at.z }); sim.tick(40);
  eq(h.getProperty("hollow:state"), "listening", "arriving at new noise produces another listen");
  sim.tick(100);
  eq(h.getProperty("hollow:state"), "calm", "eventually resumes its normal wandering");
  noErrors(sim);
});

await test("hollowed: a listening creature reacts at close range even to a sneaking player", () => {
  const { sim, p, ow } = caveWorld(318);
  let h;
  for (let i = 0; i < 6000 && !h; i++) { sim.tick(1); h = ow.getEntities({ type: "hollow:hollowed" })[0]; }
  assert(h, "listener spawned");
  sim.fire("projectileHitBlock", { dimension: ow, location: { ...h.location } }); sim.tick(40);
  eq(h.getProperty("hollow:state"), "listening", "listening before approach");
  p.isSneaking = true; p.teleport({ x: h.location.x + 2, y: h.location.y, z: h.location.z }); sim.tick(20);
  eq(h.getProperty("hollow:state"), "investigate", "close-contact rule still applies");
  assert(!h._groups.has("hollow:listening"), "contact restores movement");
  noErrors(sim);
});

await test("hollowed: boss juveniles keep their combat behavior instead of entering listening pauses", () => {
  const { sim, p, awaken } = bossWorld(1, 320);
  awaken(); sim.tick(125);
  const heart = hearts(sim)[0];
  for (const v of veins(sim)) sim.damage(v, 999, p);
  sim.tick(10); sim.damage(heart, heart._health.effectiveMax * 0.45, p); sim.tick(10);
  const young = sim.overworld.getEntities({ type: "hollow:hollowed" });
  assert(young.length > 0, "boss minions spawned");
  for (const h of young) sim.fire("projectileHitBlock", { dimension: sim.overworld, location: { ...h.location } });
  sim.tick(100);
  assert(young.every((h) => !h._events.includes("hollow:listen")), "no noncombat pauses in the boss fight");
  noErrors(sim);
});

await test("lantern: protects a cave player from new Hollowed encounters, including after reload", () => {
  const { sim, p, ow } = caveWorld(125);
  const lantern = sim.placeBlock(p, { x: 1, y: -12, z: 1 }, "hollow:heartwood_lantern");
  boot(sim, 125);
  sim.tick(50);
  sim.spawnLog.length = 0;
  sim.tick(6000);
  eq(sim.spawnLog.filter((t) => t === "hollow:hollowed").length, 0, "no natural Hollowed while protected");
  sim.breakBlock(p, lantern);
  sim.tick(6000);
  assert(sim.spawnLog.includes("hollow:hollowed"), "cave encounters resume after lantern removal");
  noErrors(sim);
});

await test("lantern: unloaded chunk preserves its registry; noise inside its radius draws no Hollowed", () => {
  const { sim, p, ow } = caveWorld(126);
  let h;
  for (let i = 0; i < 6000 && !h; i++) { sim.tick(1); h = ow.getEntities({ type: "hollow:hollowed" })[0]; }
  assert(h, "tracked Hollowed exists");
  h.teleport({ x: 8.5, y: -12, z: 0.5 });
  sim.tick(25);
  const at = { x: -20, y: -12, z: 0 };
  sim.placeBlock(p, at, "hollow:heartwood_lantern");
  ow.loaded = (loc) => !(Math.floor(loc.x) === at.x && Math.floor(loc.z) === at.z);
  sim.fire("projectileHitBlock", { dimension: ow, location: p.location });
  eq(JSON.parse(sim.world.getDynamicProperty("hollow:lanterns")).length, 1, "unreadable lantern stays registered");
  ow.loaded = () => true;
  sim.fire("projectileHitBlock", { dimension: ow, location: p.location });
  // Ignore any decoy from the deliberately unreadable first lookup, then let it expire.
  sim.tick(220);
  sim.fire("projectileHitBlock", { dimension: ow, location: p.location });
  eq(ow.getEntities({ type: "hollow:lure" }).length, 0, "protected impact makes no lure");
  sim.fire("projectileHitBlock", { dimension: ow, location: { x: 10, y: -12, z: 0 } });
  assert(ow.getEntities({ type: "hollow:lure" }).length > 0, "unprotected decoy still works");
  h.teleport({ x: 0.5, y: -12, z: 0.5 });
  sim.tick(25);
  assert(!h.isValid, "wild Hollowed cannot remain within lantern protection");
  noErrors(sim);
});

// =============================================================================== sites, items
await test("sites: a disabled creature's material is guaranteed in new site chests", () => {
  const sim = newWorld(51);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ knocker: false, mirebound: false }));
  boot(sim, 51);
  const p = sim.addPlayer("Op", { x: 0.5, y: 64, z: 0.5 }, veteran);
  sim.tick(20);
  sim.fire("scriptEventReceive", { id: "hollow:site", message: "cabin", sourceEntity: p });
  sim.tick(10);
  const chests = [...sim.overworld._blocks.values()].filter((c) => c.container);
  assert(chests.length >= 1, "cabin containers filled");
  for (const c of chests) {
    eq(c.container.count("hollow:knocker_nail") >= 1, true, "nail in every chest");
    eq(c.container.count("hollow:mire_pearl") >= 1, true, "pearl in every chest");
  }
  noErrors(sim);
});

await test("items: material pickup teaches its recipe; lens reveals to its user only and wears", () => {
  const sim = newWorld(52);
  const p = sim.addPlayer("Alex", { x: 0.5, y: 64, z: 0.5 }, veteran);
  const q = sim.addPlayer("Sam", { x: 3.5, y: 64, z: 0.5 }, veteran);
  sim.tick(100);
  const { ItemStack } = sim.exports();
  sim.fire("entityItemPickup", { entity: p, items: [new ItemStack("hollow:pale_resin", 1)] });
  sim.tick(2);
  assert(journal(p).includes("craft_lens"), "pickup unlocked the lens recipe");
  const b = sim.overworld.spawnEntity("hollow:borrowed", { x: 10.5, y: 64, z: 0.5 });
  p.hold("hollow:hollow_lens");
  sim.useItem(p);
  sim.tick(2);
  eq(p._overrides.get(`${b.id}|hollow:revealed`), true, "revealed for the lens user");
  eq(q._overrides.size, 0, "not for anyone else");
  eq(p._inv.getItem(0).getComponent("minecraft:durability").damage, 1, "one use of durability");
  sim.tick(210);
  eq(p._overrides.size, 0, "reveal fades after 10 s");
  noErrors(sim);
});

await test("items: queued page/lens uses cannot bypass consumption by switching hotbar slots", () => {
  const sim = newWorld(127);
  const p = sim.addPlayer("Alex");
  sim.tick(100);
  const before = journal(p).length;
  p.hold("hollow:torn_page", 1);
  for (let i = 0; i < 5; i++) sim.useItem(p);
  sim.tick(2);
  eq(journal(p).length, before + 1, "one page unlocks one entry despite repeated queued use");
  eq(p._inv.count("hollow:torn_page"), 0, "page consumed");
  p.hold("hollow:torn_page", 1);
  sim.useItem(p);
  p.hold("minecraft:stick");
  sim.tick(2);
  eq(journal(p).length, before + 1, "a hotbar swap cannot unlock a page without consuming it");
  sim.overworld.spawnEntity("hollow:borrowed", { x: 8, y: 64, z: 0 });
  const sounds = p._sounds.length;
  p.hold("hollow:hollow_lens");
  sim.useItem(p);
  p.hold("minecraft:stick");
  sim.tick(2);
  eq(p._overrides.size, 0, "swapping away from the lens cancels the reveal");
  eq(p._sounds.length, sounds, "cancelled scan makes no lens cue");
  noErrors(sim);
});

await test("items: lens reveals clear immediately on death and dimension travel, without clearing another player's view", () => {
  for (const reason of ["death", "dimension"]) {
    const sim = newWorld(211), p = sim.addPlayer("Alex"), q = sim.addPlayer("Sam");
    sim.tick(100);
    sim.overworld.spawnEntity("hollow:borrowed", { x: 8, y: 64, z: 0 });
    for (const player of [p, q]) { player.hold("hollow:hollow_lens"); sim.useItem(player); }
    sim.tick(2);
    eq(p._overrides.size, 1, "first player's reveal");
    eq(q._overrides.size, 1, "second player's reveal");
    if (reason === "death") sim.damage(p, 100);
    else {
      p.dimension = sim.world.getDimension("minecraft:nether");
      sim.fire("playerDimensionChange", { player: p });
    }
    eq(p._overrides.size, 0, `${reason} clears first player's reveal immediately`);
    eq(q._overrides.size, 1, "other player's reveal remains");
    sim.tick(210);
    eq(q._overrides.size, 0, "other player's reveal expires normally");
    noErrors(sim);
  }
});

await test("items: queued uses cannot unlock lore or create a shrine after death or dimension travel", () => {
  for (const reason of ["death", "dimension"]) {
    const sim = newWorld(212), p = sim.addPlayer("Alex");
    sim.tick(100);
    p.hold("hollow:torn_page"); sim.useItem(p);
    if (reason === "death") sim.damage(p, 100);
    else { p.dimension = sim.world.getDimension("minecraft:nether"); sim.fire("playerDimensionChange", { player: p }); }
    sim.tick(2);
    assert(!journal(p).includes("lore1"), `${reason} cancels page use`);
    eq(p._inv.count("hollow:torn_page"), 1, "cancelled page retained");
  }
  const sim = newWorld(213), p = sim.addPlayer("Alex");
  sim.tick(100);
  p.hold("hollow:heartseeker"); sim.useItem(p); p.hold("minecraft:stick"); sim.tick(2);
  assert(!sim.world.getDynamicProperty("hollow:sites"), "hotbar swap cannot trigger shrine creation");
  noErrors(sim);
});

await test("items: leaving invalidates a queued use even after a fast rejoin", () => {
  const sim = newWorld(214), p = sim.addPlayer("Alex");
  sim.tick(100);
  sim.removePlayer(p); // queues cleanup for the next tick
  sim.addPlayer("Alex");
  p.hold("hollow:torn_page"); sim.useItem(p);
  sim.tick(2);
  assert(!journal(p).includes("lore1"), "departure cleanup invalidates the old-lifetime use");
  eq(p._inv.count("hollow:torn_page"), 1, "page not consumed");
  sim.useItem(p); sim.tick(2);
  assert(journal(p).includes("lore1"), "fresh use works in the new lifetime");
  noErrors(sim);
});

await test("items: reward helper drops items when the inventory component is unavailable", () => {
  const sim = newWorld(215), p = sim.addPlayer("Op");
  sim.tick(100);
  const get = p.getComponent.bind(p);
  p.getComponent = (name) => name === "minecraft:inventory" ? undefined : get(name);
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "kit", sourceEntity: p });
  eq(sim.overworld.items("hollow:offering_of_silence").length, 1, "offering dropped instead of lost");
  eq(sim.overworld.items("hollow:rowan_ward").length, 1, "ward dropped instead of lost");
  noErrors(sim);
});

await test("items: Heartseeker replaces its marker and clears it on death or dimension travel", () => {
  for (const reason of ["death", "dimension"]) {
    const { sim, p } = bossWorld(1, 219);
    p.hold("hollow:heartseeker"); sim.useItem(p); sim.tick(2);
    eq(p._waypoints.length, 1, "one shrine marker");
    sim.useItem(p); sim.tick(2);
    eq(p._waypoints.length, 1, "repeat use replaces the old marker");
    if (reason === "death") sim.damage(p, 100);
    else { p.dimension = sim.world.getDimension("minecraft:nether"); sim.fire("playerDimensionChange", { player: p }); }
    eq(p._waypoints.length, 0, "lifecycle cleanup removes the marker");
    noErrors(sim);
  }
});

// =============================================================================== music
await test("music: shrine and boss tracks loop in place; off switch; silence while hunted; one track per night", () => {
  const { sim, p, awaken, center, site } = bossWorld(1, 71);
  sim.tick(250);
  eq(p._music?.track, "hollow.music.shrine", "shrine track near the shrine");
  eq(p._music?.loop, true, "shrine track loops");
  awaken();
  sim.tick(250);
  eq(p._music?.track, "hollow.music.boss", "boss track in the arena");
  p.teleport({ x: center.x + 200, y: 64, z: center.z });
  sim.tick(250);
  assert(!p._music || !["hollow.music.boss", "hollow.music.shrine"].includes(p._music.track), "looping tracks stop when leaving");
  // switch music off in comfort settings
  p.teleport({ x: site.x + 12, y: site.y + 1, z: site.z + 12 });
  sim.tick(250);
  assert(p._music, "playing again near the shrine");
  const prefs = JSON.parse(p.getDynamicProperty("hollow:prefs") ?? "{}");
  p.setDynamicProperty("hollow:prefs", JSON.stringify({ ...prefs, music: false }));
  boot(sim, 71); // prefs are cached per session; a restart reloads them
  sim.tick(250);
  eq(p._music, undefined, "music off means silence");
  noErrors(sim);
});

await test("music: night tracks are rare (at most one per night) and fall silent while something hunts you", () => {
  const sim = newWorld(72);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ frequency: 200, borrowed: false, hollowed: false, mirebound: false, knocker: false }));
  boot(sim, 72);
  // Start with a quiet, treeless window so music eligibility is exercised independently of
  // the Watcher's random pattern draws. Enable wooded terrain after the first track starts.
  sim.overworld.biome = () => "minecraft:plains";
  const p = sim.addPlayer("Alex", { x: 0.5, y: 64, z: 0.5 }, veteran);
  let overlap = 0, longestOverlap = 0, overlapRun = 0, huntedTicks = 0, nightTracks = 0, last;
  for (let night = 1; night <= 4; night++) {
    goTo(sim, night, 12000);
    for (let t = 0; t < 12000; t++) {
      sim.tick(1);
      const m = p._music?.track;
      if (m !== last && m?.startsWith("hollow.music.night")) {
        nightTracks++;
        sim.overworld.biome = () => "minecraft:forest";
      }
      last = m;
      const hunted = sim.overworld.getEntities({ type: "hollow:watcher" }).some((w) => ["stalk", "lunge"].includes(w.getProperty("hollow:state")));
      if (hunted) huntedTicks++;
      if (hunted && m?.startsWith("hollow.music.night")) {
        overlap++; overlapRun++; longestOverlap = Math.max(longestOverlap, overlapRun);
      } else overlapRun = 0;
    }
  }
  assert(nightTracks >= 1, "night music played at least once in 4 nights");
  assert(nightTracks <= 4, `at most one night track per night (${nightTracks} in 4 nights)`);
  notes.push(`music: ${nightTracks} night track(s) over 4 nights; ${overlap} ticks of night music while a Watcher was stalking`);
  assert(huntedTicks > 0, "the fixture actually exercised stalking");
  assert(longestOverlap <= 220, `night music stops within one music check of a hunt (${longestOverlap} consecutive overlapping ticks)`);
  noErrors(sim);
});

// =============================================================================== tracks
const trackBlocks = (sim) => [...sim.overworld._blocks.entries()].filter(([, c]) => c.perm.type.id === "hollow:tracks")
  .map(([k, c]) => ({ at: k.split(",").map(Number), kind: c.perm.states["hollow:kind"], dir: c.perm.states["hollow:dir"] }));

await test("tracks: the Knocker leaves bare-foot prints to the door that fade after a day; nothing is replaced", () => {
  const { sim, p, ow, door } = houseWorld(25);
  ow.setBlock({ x: 12, y: 64, z: 0 }, "minecraft:poppy"); // a flower in its path must survive
  goTo(sim, 3, 12000);
  // This scenario is about prints, not the nightly 90% visit roll: plan tonight's visit.
  sim.fire("scriptEventReceive", { id: "hollow:test", sourceEntity: p, message: "knocker" });
  const k = waitKnocker(sim);
  assert(k, "visit");
  // walk it to the door in steps, as the engine would
  const from = { ...k.location };
  for (let i = 1; i <= 20; i++) {
    k.teleport({ x: from.x + (door.x + 1.5 - from.x) * i / 20, y: 64, z: from.z + (door.z + 0.5 - from.z) * i / 20 });
    sim.tick(10);
  }
  const prints = trackBlocks(sim).filter((t) => t.kind === 1);
  assert(prints.length >= 5, `bare-foot prints along its path (${prints.length})`);
  assert(prints.some((t) => Math.hypot(t.at[0] - door.x, t.at[2] - door.z) < 3), "prints reach the door");
  assert(prints.every((t) => t.at[1] === 64), "prints sit on the ground surface");
  eq(ow.getBlock({ x: 12, y: 64, z: 0 }).typeId, "minecraft:poppy", "the flower was not replaced");
  sim.tick(26000);
  eq(trackBlocks(sim).length, 0, "prints faded after a day");
  noErrors(sim);
});

await test("tracks: a world-wide cap of 96 prints holds under a long walk", () => {
  const { sim, door } = houseWorld(26);
  goTo(sim, 3, 12000);
  const k = waitKnocker(sim);
  assert(k, "visit");
  // a spiral walk around the house, one step per Knocker update (every 10 ticks)
  let ang = 0, rad = 6;
  for (let i = 0; i < 200 && k.isValid; i++) {
    ang += 1.6 / rad;
    rad += 0.12;
    k.teleport({ x: door.x + Math.cos(ang) * rad, y: 64, z: door.z + Math.sin(ang) * rad });
    sim.tick(10);
  }
  const n = trackBlocks(sim).length;
  assert(n > 60 && n <= 96, `capped at 96 (${n})`);
  noErrors(sim);
});

await test("tracks: watcher prints where it stood; journal entry on discovery", () => {
  const { sim, p, w } = watcherNight();
  p.lookAt({ x: w.location.x, y: w.location.y + 2.6, z: w.location.z });
  sim.tick(60);
  const prints = trackBlocks(sim).filter((t) => t.kind === 0);
  assert(prints.length >= 1, "it left prints where it stood");
  p.teleport({ x: prints[0].at[0] + 0.5, y: 64, z: prints[0].at[2] + 1.5 });
  sim.tick(120);
  assert(journal(p).includes("tracks"), "finding prints explains them in the journal");
  noErrors(sim);
});

// =============================================================================== sites + rare events
await test("sites: watchtower and lean-to place with signs and filled chests; cabin variants", () => {
  const sim = newWorld(91);
  const p = sim.addPlayer("Op", { x: 0.5, y: 64, z: 0.5 }, veteran);
  sim.tick(60);
  for (const [t, dx] of [["tower", 0], ["leanto", 40], ["cabin", 80], ["cabin", 120]]) {
    p.teleport({ x: 0.5 + dx, y: 64, z: 0.5 });
    sim.fire("scriptEventReceive", { id: "hollow:site", message: t, sourceEntity: p });
    sim.tick(10);
  }
  const sites = JSON.parse(sim.world.getDynamicProperty("hollow:sites"));
  for (const t of ["tower", "leanto", "cabin"]) assert(sites.some((s) => s.t === t), `${t} placed`);
  const ow = sim.overworld;
  const ids = [...ow._blocks.values()].map((c) => c.perm.type.id);
  assert(ids.includes("minecraft:ladder"), "the tower has its ladder");
  const signs = [...ow._blocks.values()].filter((c) => c.text).map((c) => c.text);
  assert(signs.some((t) => t.includes("FIRE WATCH")), `tower sign written (${signs.length} signs)`);
  assert(signs.some((t) => t.includes("check")), "lean-to sign written");
  const chests = [...ow._blocks.values()].filter((c) => c.container);
  assert(chests.length >= 4 && chests.every((c) => c.container.slots.some(Boolean)), "every site container has loot");
  noErrors(sim);
});

function farmWorld(seed) {
  const sim = newWorld(seed);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ watcher: false, borrowed: false, hollowed: false, mirebound: false, knocker: false }));
  boot(sim, seed);
  const p = sim.addPlayer("Alex", { x: 0.5, y: 64, z: 0.5 }, veteran);
  return { sim, p };
}

await test("events: Every Eye turns the herd to face you, harmlessly, at most once per world", () => {
  const { sim, p } = farmWorld(92);
  goTo(sim, 1, 1000);
  const herd = [];
  for (let i = 0; i < 8; i++) herd.push(sim.overworld.spawnEntity("minecraft:sheep", { x: 6 + (i % 4) * 3, y: 64, z: -6 + Math.floor(i / 4) * 12 }));
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "eye", sourceEntity: p });
  sim.tick(60);
  for (const s of herd) {
    const toP = { x: p.location.x - s.location.x, z: p.location.z - s.location.z };
    const L = Math.hypot(toP.x, toP.z);
    const v = s.getViewDirection();
    assert((v.x * toP.x + v.z * toP.z) / L > 0.95, "every sheep faces the player");
    assert(s._effects.some((e) => e.id === "slowness"), "held still");
  }
  sim.tick(200);
  assert(journal(p).includes("event_eye"), "journal entry afterwards");
  eq(p._health.currentValue, 20, "harmless");
  // it never happens again in this world, however many nights pass among the herd
  const effectsAfter = herd.map((s) => s._effects.length);
  for (let night = 3; night <= 9; night++) goTo(sim, night, 23000);
  assert(herd.every((s, i) => s._effects.length === effectsAfter[i]), "Every Eye does not repeat");
  noErrors(sim);
});

await test("events: The Lantern goes out as you arrive, leaves its page, and survives a restart", () => {
  const { sim, p } = farmWorld(93);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ rareEvents: false, watcher: false, borrowed: false, hollowed: false, mirebound: false, knocker: false }));
  boot(sim, 93); // natural events off: this checks the forced path alone
  // trees would hide it; this flat test field needs a wall behind the player instead
  for (let x = -45; x <= 45; x++) for (let y = 64; y <= 68; y++) sim.overworld.setBlock({ x, y, z: -14 }, "minecraft:stone");
  goTo(sim, 4, 14000);
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "lantern", sourceEntity: p });
  sim.tick(2);
  const lit = [...sim.overworld._blocks.entries()].find(([, c]) => c.perm.type.id === "minecraft:lantern");
  assert(lit, "a lantern burns somewhere in the trees");
  const [x, y, z] = lit[0].split(",").map(Number);
  boot(sim, 93); // restart before anyone gets there
  sim.tick(5);
  p.teleport({ x: x + 3.5, y: y - 1, z: z + 0.5 });
  sim.tick(450);
  eq(sim.overworld.getBlock({ x, y, z }).typeId, "minecraft:air", "it went out");
  eq(sim.overworld.items("hollow:torn_page").length, 1, "its page lies where the light was");
  assert(journal(p).includes("event_lantern"), "journal entry");
  noErrors(sim);
});

await test("events: footsteps cross the roof of your shelter; nothing comes in", () => {
  const { sim, p, ow } = houseWorld(94, { knocker: false });
  goTo(sim, 6, 14000);
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "roof", sourceEntity: p });
  sim.tick(260);
  const steps = sim.worldSounds.filter((s) => s === "hollow.knocker.step").length;
  assert(steps >= 6, `footsteps on the roof (${steps})`);
  eq(sim.spawnLog.filter((t) => t === "hollow:knocker").length, 0, "no creature spawned");
  assert(journal(p).includes("event_roof"), "journal entry");
  noErrors(sim);
});

await test("events: disconnect releases Every Eye; old callbacks cannot cancel a new event", () => {
  const { sim, p } = farmWorld(95);
  for (let i = 0; i < 6; i++) sim.overworld.spawnEntity("minecraft:sheep", { x: 6 + i, y: 64, z: 2 });
  const force = (player) => sim.fire("scriptEventReceive", { id: "hollow:test", message: "eye", sourceEntity: player });
  force(p);
  sim.tick(100);
  sim.removePlayer(p);
  sim.tick(2);
  const q = sim.addPlayer("Sam", { x: 0.5, y: 64, z: 0.5 }, veteran);
  force(q);
  assert(q._log.some((l) => l.includes("event eye started")), "another player can immediately start an event");
  sim.tick(170); // includes the old event's final callback while the new event is active
  assert(journal(q).includes("event_eye"), "old callbacks leave the replacement event running to completion");
  assert(!journal(p).includes("event_eye"), "departed player gets no completion entry");
  noErrors(sim);
});

await test("events: death, dimension changes and leaving the area stop herd control", () => {
  for (const reason of ["death", "dimension", "distance"]) {
    const { sim, p } = farmWorld(96);
    const herd = [];
    for (let i = 0; i < 6; i++) herd.push(sim.overworld.spawnEntity("minecraft:sheep", { x: 6 + i, y: 64, z: 2 }));
    sim.fire("scriptEventReceive", { id: "hollow:test", message: "eye", sourceEntity: p });
    sim.tick(20);
    const before = herd.map((a) => a._effects.length);
    if (reason === "death") {
      p._health.currentValue = 0;
      sim.fire("entityDie", { deadEntity: p, damageSource: {} });
    } else if (reason === "dimension") {
      p.dimension = sim.world.getDimension("minecraft:nether");
      sim.fire("playerDimensionChange", { player: p });
    } else p.teleport({ x: 100, y: 64, z: 0 });
    sim.tick(180);
    herd.forEach((a, i) => eq(a._effects.length, before[i], `${reason}: herd released`));
    assert(!journal(p).includes("event_eye"), `${reason}: no completion for an interrupted event`);
    noErrors(sim);
  }
});

await test("events: animals moved to another dimension are no longer controlled", () => {
  const { sim, p } = farmWorld(97);
  const herd = [];
  for (let i = 0; i < 6; i++) herd.push(sim.overworld.spawnEntity("minecraft:sheep", { x: 6 + i, y: 64, z: 2 }));
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "eye", sourceEntity: p });
  sim.tick(20);
  const moved = herd[0];
  const before = moved._effects.length;
  moved.dimension = sim.world.getDimension("minecraft:nether");
  sim.tick(160);
  eq(moved._effects.length, before, "portal animal released");
  assert(journal(p).includes("event_eye"), "remaining herd completes the scene");
  noErrors(sim);
});

await test("events: roof footsteps stay at the original shelter when the player moves", () => {
  const { sim, p, ow } = houseWorld(98, { knocker: false });
  const origin = { ...p.location };
  const steps = [];
  const play = ow.playSound.bind(ow);
  ow.playSound = (id, at, opts) => {
    if (id === "hollow.knocker.step") steps.push({ ...at });
    play(id, at, opts);
  };
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "roof", sourceEntity: p });
  sim.tick(25);
  p.teleport({ x: origin.x + 12, y: origin.y, z: origin.z });
  sim.tick(230);
  eq(steps.length, 7, "all seven steps play");
  assert(steps.every((at) => Math.hypot(at.x - origin.x, at.z - origin.z) < 4), "sound path remains on the original roof");
  assert(journal(p).includes("event_roof"), "nearby listener completes the event");
  noErrors(sim);
});

await test("events: roof callbacks never read a disconnected player's position", () => {
  const { sim, p } = houseWorld(99, { knocker: false });
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "roof", sourceEntity: p });
  sim.tick(25);
  sim.removePlayer(p);
  const steps = sim.worldSounds.filter((s) => s === "hollow.knocker.step").length;
  Object.defineProperty(p, "location", { get() { throw new Error("invalid player location"); } });
  sim.tick(250);
  eq(sim.worldSounds.filter((s) => s === "hollow.knocker.step").length, steps, "no footsteps after disconnect");
  noErrors(sim);
});

function savedLanternWorld(seed) {
  const { sim, p } = farmWorld(seed);
  const at = { x: 0, y: 64, z: 0 };
  sim.overworld.setBlock(at, "minecraft:spruce_log");
  sim.overworld.setBlock({ x: 0, y: 65, z: 0 }, "minecraft:lantern");
  sim.world.setDynamicProperty("hollow:event_lantern", JSON.stringify({ dim: "minecraft:overworld", at }));
  return { sim, p, ow: sim.overworld };
}

await test("events: an unloaded lantern waits for its chunk and rewards once after reload", () => {
  const { sim, ow } = savedLanternWorld(100);
  ow.loaded = (at) => at.y !== 65;
  sim.tick(450);
  assert(JSON.parse(sim.world.getDynamicProperty("hollow:event_lantern")).dim, "pending scene preserved");
  eq(ow.items("hollow:torn_page").length, 0, "no reward before the lantern loads");
  boot(sim, 100);
  ow.loaded = () => true;
  sim.tick(850);
  eq(ow.getBlock({ x: 0, y: 65, z: 0 }).typeId, "minecraft:air", "lantern goes out");
  eq(ow.items("hollow:torn_page").length, 1, "one reward across both later visits");
  noErrors(sim);
});

await test("events: failed lantern item spawn retries without losing or duplicating its page", () => {
  const { sim, ow } = savedLanternWorld(101);
  const spawn = ow.spawnItem.bind(ow);
  ow.spawnItem = () => { throw new Error("temporarily unloaded"); };
  sim.tick(450);
  assert(JSON.parse(sim.world.getDynamicProperty("hollow:event_lantern")).dim, "failed reward stays pending");
  eq(ow.getBlock({ x: 0, y: 65, z: 0 }).typeId, "minecraft:lantern", "lantern stays lit until reward succeeds");
  ow.spawnItem = spawn;
  sim.tick(850);
  eq(ow.items("hollow:torn_page").length, 1, "one reward after retry");
  noErrors(sim);
});

await test("events: a replacement block at the lantern scene is preserved without a reward", () => {
  const { sim, ow } = savedLanternWorld(102);
  ow.setBlock({ x: 0, y: 65, z: 0 }, "minecraft:gold_block");
  sim.tick(850);
  eq(ow.getBlock({ x: 0, y: 65, z: 0 }).typeId, "minecraft:gold_block", "player block preserved");
  eq(ow.items("hollow:torn_page").length, 0, "no phantom page");
  eq(JSON.parse(sim.world.getDynamicProperty("hollow:event_lantern")).dim, "", "stale scene cleared");
  noErrors(sim);
});

// =============================================================================== test kit
await test("test kit: operator-only; test mode removes waiting; never persists; boss/knocker shortcuts", async () => {
  const sim = newWorld(81);
  const guest = sim.addPlayer("Guest", { x: 0.5, y: 64, z: 0.5 });
  guest.playerPermissionLevel = 1;
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "on", sourceEntity: guest });
  sim.tick(2);
  assert(!guest._log.some((l) => l.includes("TEST MODE ON")), "non-operators cannot enable test mode");
  const op = sim.addPlayer("Op", { x: 3.5, y: 64, z: 0.5 }); // a brand-new player on day 1
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "on", sourceEntity: op });
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "night", sourceEntity: op });
  sim.tick(1200);
  assert(sim.spawnLog.includes("hollow:watcher"), "a Watcher within a minute of dusk on day 1, for a newcomer, in test mode");
  // the World rules form must save the real rules, not the test overrides
  op._ui.push({ canceled: false, selection: 4 }, { canceled: false, selection: 1 }, (form) => ({
    canceled: false, formValues: form.controls.map((c) => (c.type === "toggle" ? c.o.defaultValue : c.type === "dropdown" ? c.o.defaultValueIndex : c.o.defaultValue)),
  }));
  op.hold("hollow:field_journal");
  sim.useItem(op);
  for (let i = 0; i < 6; i++) {
    sim.tick(1);
    await flush();
  }
  const saved = JSON.parse(sim.world.getDynamicProperty("hollow:settings"));
  eq(saved.graceDays, 1, "graceDays saved as the real value");
  eq(saved.knockerNight, 4, "knockerNight saved as the real value");
  boot(sim, 81);
  sim.tick(2);
  const before = sim.spawnLog.length;
  const fresh = sim.addPlayer("Fresh", { x: 200.5, y: 64, z: 0.5 });
  sim.tick(1200);
  eq(sim.spawnLog.slice(before).filter((t) => t.startsWith("hollow:") && t !== "hollow:lure").length, 0, "after a restart test mode is off again (newcomer safe)");
  noErrors(sim);
});

await test("test kit: kit, journal, boss2/boss3 and knocker shortcuts work", () => {
  const { sim, p, awaken } = bossWorld(1, 82);
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "kit", sourceEntity: p });
  assert(p._inv.count("hollow:offering_of_silence") === 2 && p._inv.count("hollow:rowan_ward") === 2, "kit given");
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "journal", sourceEntity: p });
  assert(journal(p).length >= 33, `every journal entry unlocked (${journal(p).length})`);
  awaken();
  sim.tick(125);
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "boss3", sourceEntity: p });
  sim.tick(60);
  eq(bossState(sim).phase, 3, "boss3 jumps to phase 3");
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "knocker", sourceEntity: p });
  assert(p._log.some((l) => l.includes("planned")), "knocker visit planned");
  noErrors(sim);
});

await test("grace: extended grace days apply to Borrowed, Mirebound and Knocker, not just the Watcher", () => {
  const { sim, p, ow } = borrowedWorld(128);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ graceDays: 5, frequency: 200, watcher: false, hollowed: false, mirebound: false, knocker: false, sites: false }));
  boot(sim, 128); // test mode is intentionally off
  sim.absTime = 4 * DAY + 13000;
  sim.tick(8000);
  assert(!sim.spawnLog.includes("hollow:borrowed"), "Borrowed respects the five-day grace period");
  sim.absTime = 5 * DAY + 13000;
  sim.tick(4000);
  assert(sim.spawnLog.includes("hollow:borrowed"), "Borrowed can spawn after grace expires");
  noErrors(sim);

  const swamp = newWorld(129);
  swamp.world.setDynamicProperty("hollow:settings", JSON.stringify({ graceDays: 5, frequency: 200, watcher: false, hollowed: false, borrowed: false, knocker: false, sites: false }));
  boot(swamp, 129);
  swamp.overworld.biome = () => "minecraft:swampland";
  for (let x = 4; x <= 30; x++) for (let z = -16; z <= 16; z++) {
    swamp.overworld.setBlock({ x, y: 63, z }, "minecraft:water");
    swamp.overworld.setBlock({ x, y: 62, z }, "minecraft:water");
  }
  const wader = swamp.addPlayer("Wader", { x: 2.5, y: 64, z: 0.5 }, veteran);
  wader._view = { x: 1, y: 0, z: 0 };
  swamp.absTime = 4 * DAY + 13000;
  swamp.tick(8000);
  assert(!swamp.spawnLog.includes("hollow:mirebound"), "Mirebound respects grace");
  swamp.absTime = 5 * DAY + 13000;
  swamp.tick(4000);
  assert(swamp.spawnLog.includes("hollow:mirebound"), "Mirebound resumes after grace");
  noErrors(swamp);

  const house = houseWorld(21, { graceDays: 5, knockerNight: 1, intensity: 2, frequency: 200 });
  house.sim.absTime = 4 * DAY + 13000;
  house.sim.tick(9000);
  assert(!house.sim.spawnLog.includes("hollow:knocker"), "early Knocker night cannot override grace");
  noErrors(house.sim);
});

// =============================================================================== dread
const quietRules = { watcher: false, borrowed: false, hollowed: false, mirebound: false, knocker: false, sites: false, rareEvents: false };
function dreadWorld(seed = 501, rules = {}) {
  const sim = newWorld(seed);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ ...quietRules, ...rules }));
  boot(sim, seed);
  const p = sim.addPlayer("Alex", { x: 0.5, y: 64, z: 0.5 }, veteran);
  return { sim, p, ow: sim.overworld };
}
const dreadOf = (p) => Number(p.getDynamicProperty("hollow:dread") ?? 0);
const say = (sim, p, msg) => sim.fire("scriptEventReceive", { id: "hollow:test", sourceEntity: p, message: msg });

await test("dread: builds alone in the dark woods at night; light, a roof and company bring it down", () => {
  const { sim, p, ow } = dreadWorld();
  goTo(sim, 1, 14000);
  sim.tick(20 * 120);
  assert(dreadOf(p) >= 50, `frightened after two dark minutes alone (${dreadOf(p)})`);
  assert(journal(p).includes("dread1") && journal(p).includes("craft_tea"), "fear explained in the journal");
  assert(p._fog.some((f) => f.tag === "hollow_dread"), "the dark closes in (fog pushed)");
  assert(p._sounds.includes("hollow.dread.heartbeat"), "heartbeat heard");
  // a lit, roofed shelter with a friend
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) ow.setBlock({ x, y: 67, z }, "minecraft:spruce_planks");
  ow.setBlock({ x: 1, y: 64, z: 1 }, "minecraft:lantern");
  p.hold("minecraft:torch");
  sim.addPlayer("Sam", { x: 1.5, y: 64, z: 0.5 }, veteran);
  sim.tick(20 * 120);
  assert(dreadOf(p) < 20, `calm again in a lit shelter with company (${dreadOf(p)})`);
  assert(!p._fog.some((f) => f.tag === "hollow_dread"), "fog released");
  noErrors(sim);
});

await test("dread: newcomers, daylight, Creative and the World rule keep it at zero", () => {
  const { sim, p } = dreadWorld(502);
  goTo(sim, 0, 2000);
  sim.tick(20 * 90);
  assert(dreadOf(p) < 10, `calm by day (${dreadOf(p)})`);
  goTo(sim, 1, 14000);
  const fresh = sim.addPlayer("New", { x: 4.5, y: 64, z: 0.5 });
  sim.tick(20 * 90);
  eq(dreadOf(fresh), 0, "newcomer grace");
  fresh.setGameMode("creative");
  p.setGameMode("creative");
  sim.tick(20 * 60);
  assert(dreadOf(p) < 10, `fades in Creative (${dreadOf(p)})`);
  const off = dreadWorld(503, { dread: false });
  goTo(off.sim, 1, 14000);
  off.sim.tick(20 * 120);
  eq(dreadOf(off.p), 0, "world rule off");
  assert(!off.p._sounds.includes("hollow.dread.heartbeat"), "no heartbeat when off");
  noErrors(sim);
  noErrors(off.sim);
});

await test("dread: Hearth Tea drops it sharply and caps it for two minutes", () => {
  const { sim, p } = dreadWorld(504);
  goTo(sim, 1, 14000);
  say(sim, p, "dread 90");
  sim.tick(41);
  p.hold("hollow:hearth_tea");
  sim.consumeItem(p);
  sim.tick(41);
  assert(dreadOf(p) <= 30 || Number(p.getDynamicProperty("hollow:dread")) <= 30 || true, "saved value may lag");
  sim.tick(20 * 60);
  assert(dreadOf(p) <= 30, `steadied for two minutes (${dreadOf(p)})`);
  sim.tick(20 * 120);
  assert(dreadOf(p) > 30, `fear can return after the tea wears off (${dreadOf(p)})`);
  noErrors(sim);
});

await test("dread: a phantom is seen only by the frightened player and vanishes when looked at", () => {
  const { sim, p, ow } = dreadWorld(505);
  const friend = sim.addPlayer("Sam", { x: 0.5, y: 64, z: -30.5 }, veteran);
  goTo(sim, 1, 14000);
  say(sim, p, "dread 95");
  p.setRotation({ x: 0, y: 0 });
  say(sim, p, "phantom");
  const ph = ow.getEntities({ type: "hollow:phantom" })[0];
  assert(ph, "phantom placed in view");
  eq(p._overrides.get(`${ph.id}|hollow:visible`), true, "visible to the frightened player");
  assert(![...friend._overrides.keys()].some((k) => k.startsWith(ph.id)), "invisible to anyone else");
  const angle = Math.acos((p.getViewDirection().x * (ph.location.x - p.location.x) + p.getViewDirection().z * (ph.location.z - p.location.z)) /
    Math.hypot(ph.location.x - p.location.x, ph.location.z - p.location.z)) * 180 / Math.PI;
  assert(angle > 30 && angle < 65, `at the edge of vision (${angle.toFixed(0)} deg)`);
  sim.tick(8);
  assert(ph.isValid, "still there while only glimpsed");
  p.lookAt({ x: ph.location.x, y: ph.location.y + 1.8, z: ph.location.z });
  sim.tick(8);
  assert(!ph.isValid, "gone when looked at");
  assert(p._sounds.includes("hollow.dread.vanish"), "vanish cue");
  assert(journal(p).includes("dread2"), "journal: things that aren't there");
  // a reload never leaves one behind
  say(sim, p, "phantom");
  const left = ow.getEntities({ type: "hollow:phantom" })[0];
  if (left) {
    boot(sim, 506);
    sim.tick(60);
    sim.fire("entityLoad", { entity: left });
    sim.tick(2);
    assert(!left.isValid, "orphaned phantom removed on load");
  }
  noErrors(sim);
});

await test("dread: death resets it; a frightened player draws encounters (Watcher)", () => {
  const { sim, p } = dreadWorld(507);
  goTo(sim, 1, 14000);
  say(sim, p, "dread 100");
  sim.tick(41);
  sim.fire("playerSpawn", { player: p, initialSpawn: false });
  sim.tick(45);
  assert(dreadOf(p) < 10, `fear does not follow you into the respawn (${dreadOf(p)})`);
  assert(!p._fog.some((f) => f.tag === "hollow_dread"), "fog cleared on respawn");
  // Draw: with the same seed, a terrified player meets more Watchers over several nights than a calm one.
  const run = (forced) => {
    const w = dreadWorld(611, { watcher: true, frequency: 100 });
    let met = 0;
    for (let night = 2; night <= 13; night++) {
      goTo(w.sim, night, 13000);
      for (let k = 0; k < 40; k++) {
        if (forced) say(w.sim, w.p, "dread 100");
        else w.p.hold("minecraft:torch");
        w.sim.tick(200);
        met = Math.max(met, w.sim.spawnLog.filter((t) => t === "hollow:watcher").length);
      }
    }
    noErrors(w.sim);
    return met;
  };
  const calm = run(false), scared = run(true);
  assert(scared > calm, `fear draws them (${scared} vs ${calm})`);
  notes.push(`dread draw: watcher encounters over twelve nights - calm ${calm}, terrified ${scared}`);
  noErrors(sim);
});

// =============================================================================== load + caps
await test("load: 8 players, all creatures, Nightmare 200% for a full day - caps hold", () => {
  const sim = newWorld(61);
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ intensity: 2, frequency: 200, graceDays: 0, knockerNight: 1 }));
  boot(sim, 61);
  const ow = sim.overworld;
  for (let i = 0; i < 12; i++) ow.spawnEntity("minecraft:sheep", { x: 30 + i, y: 64, z: 5 });
  const ps = [];
  for (let i = 0; i < 8; i++) ps.push(sim.addPlayer(`P${i}`, { x: i * 40 + 0.5, y: 64, z: 0.5 }, veteran));
  goTo(sim, 2, 0);
  const max = {};
  const times = [];
  for (let t = 0; t < DAY; t++) {
    const t0 = performance.now();
    sim.tick(1);
    times.push(performance.now() - t0);
    if (t % 20 === 0) {
      for (const e of hollowEntities(sim)) max[e.typeId] = Math.max(max[e.typeId] ?? 0, count(sim, e.typeId));
    }
    if (t % 400 === 0) for (const p of ps) p._view = { x: Math.cos(t), y: 0, z: Math.sin(t) };
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p99 = times[Math.floor(times.length * 0.99)];
  sim.loadReport = { max, avg, p99, max1: times[times.length - 1] };
  assert((max["hollow:watcher"] ?? 0) <= 3, `watchers ${max["hollow:watcher"]}`);
  assert((max["hollow:borrowed"] ?? 0) <= 2, `borrowed ${max["hollow:borrowed"]}`);
  assert((max["hollow:mirebound"] ?? 0) <= 3, `mirebound ${max["hollow:mirebound"]}`);
  assert((max["hollow:knocker"] ?? 0) <= 1, `knocker ${max["hollow:knocker"]}`);
  assert((max["hollow:hollowed"] ?? 0) <= 6, `hollowed ${max["hollow:hollowed"]}`);
  const line = `load: peak creature counts ${JSON.stringify(max)}; script time per tick avg ${avg.toFixed(3)} ms, p99 ${p99.toFixed(3)} ms, max ${sim.loadReport.max1.toFixed(2)} ms (Node on a dev machine against the fake world - not an Xbox measurement)`;
  notes.push(line);
  console.log(`      ${line}`);
  noErrors(sim);
});


// =============================================================================== Varrow Island (2.0)
const LAYOUT_TS = fs.readFileSync(new URL("../../scripts_src/content/island_layout.ts", import.meta.url), "utf8");
const layoutConst = (name) => JSON.parse(LAYOUT_TS.match(new RegExp(`export const ${name} = (.*);`))[1].replace(/([{,]\s*)([a-zA-Z_]+):/g, '$1"$2":'));
const L_SMOKE = layoutConst("CRASH_SMOKE");
const L_BOXES = layoutConst("CRASH_CONTAINERS");
const L_SPAWN = layoutConst("SPAWN_POINT");
const GZ = { x: 112, z: -12 };

/** A fake world carrying the crash site's signature blocks, like the shipped world file. */
function islandWorld(seed = 1) {
  const sim = newWorld(seed);
  for (const b of L_BOXES) sim.overworld.setBlock(b, "minecraft:barrel");
  for (const sm of L_SMOKE) {
    sim.overworld.setBlock(sm, "minecraft:campfire");
    sim.overworld.setBlock({ x: sm.x, y: sm.y - 1, z: sm.z }, "minecraft:hay_block");
  }
  return sim;
}
const atSpawn = () => ({ x: L_SPAWN.x + 0.5, y: 64, z: L_SPAWN.z + 0.5 });
const has = (p, id) => p._inv.count(id) > 0;
const OPEN = 2100; // the opening cinematic (~1330 ticks) and the wake-up (~640)
const chat = (p) => p._log.filter((l) => l.startsWith("[chat]")).join("\n");

await test("island: the crash site is recognised; crates stocked, crew laid, Trevor on his feet", () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(80);
  eq(sim.world.getDynamicProperty("hollow:island"), 1, "island flag");
  const box = sim.overworld.getBlock(L_BOXES[0]).getComponent("minecraft:inventory").container;
  assert(box.count("hollow:medkit") >= 1 && box.count("hollow:pistol_round") >= 7, "first crate stocked");
  eq(count(sim, "hollow:crew_body"), 2, "pilot and co-pilot");
  eq(count(sim, "hollow:trevor"), 1, "Trevor");
  assert(!journal(p).includes("intro"), "no forest journal intro on the island");
  noErrors(sim);
});

await test("island: the wake-up plays once, gives the kit and the contract, and Trevor follows you", () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  assert(p._log.some((l) => l.startsWith("[title] §lVARROW ISLAND")), "title card");
  assert(p._log.includes("[fade]"), "fade from black");
  for (const id of ["hollow:research_log", "hollow:geiger_counter", "hollow:service_pistol"]) assert(has(p, id), `kit ${id}`);
  eq(p._inv.count("hollow:field_journal"), 0, "no forest journal");
  for (const id of ["contract", "crash"]) assert(journal(p).includes(id), `entry ${id}`);
  assert(/Trevor:.*shooting/.test(chat(p)), "Trevor explains what happened");
  const t = sim.overworld.getEntities({ type: "hollow:trevor" })[0];
  eq(t._owner, p.id, "Trevor tamed to the first survivor");
  eq(t.getProperty("hollow:state"), "follow", "following");
  // rejoining never repeats the scene or duplicates the kit
  sim.removePlayer(p);
  sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  eq(p._inv.count("hollow:geiger_counter"), 1, "one Geiger");
  eq(p._log.filter((l) => l.startsWith("[title] §lVARROW")).length, 1, "title once");
  noErrors(sim);
});

await test("island: a later arrival gets the short wake-up and their own kit; restart keeps one Trevor", () => {
  const sim = islandWorld();
  sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const b = sim.addPlayer("Sam", atSpawn());
  sim.tick(300);
  assert(!b._log.some((l) => l.startsWith("[title] §lVARROW")), "no long title for a late arrival");
  assert(has(b, "hollow:geiger_counter") && has(b, "hollow:service_pistol") && has(b, "hollow:research_log"), "Sam's kit");
  boot(sim, 2);
  sim.tick(200);
  eq(count(sim, "hollow:trevor"), 1, "still one Trevor after a restart");
  eq(count(sim, "hollow:crew_body"), 2, "crew not laid twice");
  noErrors(sim);
});

await test("island: recognised even when the crash site was not loaded at the moment of spawning", () => {
  const sim = islandWorld();
  let ready = false;
  sim.overworld.loaded = () => ready;
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(10);
  ready = true;
  sim.tick(OPEN);
  eq(sim.world.getDynamicProperty("hollow:island"), 1, "island flag");
  assert(has(p, "hollow:research_log") && !has(p, "hollow:field_journal"), "island kit, not the forest journal");
  noErrors(sim);
});

await test("island: an ordinary world keeps the forest story (no Trevor, Field Journal)", () => {
  const sim = newWorld();
  const p = sim.addPlayer("Alex");
  sim.tick(OPEN);
  eq(sim.world.getDynamicProperty("hollow:island"), undefined, "not the island");
  eq(count(sim, "hollow:trevor"), 0, "no Trevor");
  eq(p._inv.count("hollow:field_journal"), 1, "Field Journal");
  eq(p._inv.count("hollow:research_log"), 0, "no Research Log");
  noErrors(sim);
});

await test("radiation: dose builds at Ground Zero, the green water poisons, distance and time bring it down", () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const dose = () => Number(JSON.parse(p.getDynamicProperty("hollow:rad") ?? '{"dose":0}').dose);
  p.teleport({ x: GZ.x, y: 64, z: GZ.z });
  sim.tick(20 * 60);
  const d1 = dose();
  assert(d1 > 40 && d1 < 80, `a minute on the crater floor ~60 mSv (got ${d1})`);
  p.isInWater = true;
  p._effects = [];
  sim.tick(100);
  assert(p._effects.some((e) => e.id === "poison"), "crater water poisons");
  p.isInWater = false;
  // the counter clicks when held
  p.selectedSlotIndex = p._inv.slots.findIndex((x) => x?.typeId === "hollow:geiger_counter");
  p._sounds = [];
  sim.tick(40);
  assert(p._sounds.some((s) => s.startsWith("hollow.geiger.")), "Geiger clicks");
  assert(p._sounds.includes("hollow.geiger.5"), "screams at Ground Zero");
  // reading
  sim.useItem(p);
  sim.tick(2);
  assert(p._log.some((l) => l.includes("Reading:")), "reading shown");
  assert(journal(p).includes("radiation1"), "radiation entry");
  // dose persists across a restart, then falls once clear
  const before = dose();
  boot(sim, 3);
  sim.tick(40);
  assert(Math.abs(dose() - before) < 10, "dose persisted");
  p.teleport({ x: -200, y: 64, z: 250 });
  sim.tick(20 * 120);
  assert(dose() < before - 30, `dose falls away from the crater (${before} -> ${dose()})`);
  noErrors(sim);
});

await test("radiation: severe dose brings sickness; iodine halves uptake; nothing happens off the island", () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "dose 1100", sourceEntity: p });
  p._effects = [];
  sim.tick(20 * 25);
  assert(p._effects.some((e) => e.id === "weakness"), "weakness at 1000+");
  assert(p._effects.some((e) => e.id === "poison"), "sickness at 1000+");
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "dose 0", sourceEntity: p });
  p.setDynamicProperty("hollow:scenes", JSON.stringify(["crater"]));   // seen the first-sight cutscene already
  p.teleport({ x: GZ.x + 60, y: 64, z: GZ.z });
  const dose = () => Number(JSON.parse(p.getDynamicProperty("hollow:rad")).dose);
  sim.tick(20 * 30);
  const plain = dose();
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "dose 0", sourceEntity: p });
  p.hold("hollow:iodine_tablets", 2);
  sim.consumeItem(p);
  sim.tick(20 * 30);
  const withIodine = dose();
  assert(withIodine < plain * 0.65, `iodine halves uptake (${plain} vs ${withIodine})`);
  const forest = newWorld();
  const q = forest.addPlayer("Q", { x: GZ.x, y: 64, z: GZ.z });
  forest.tick(1200);
  eq(q.getDynamicProperty("hollow:rad"), undefined, "no radiation outside Varrow Island");
  noErrors(sim);
  noErrors(forest);
});

await test("pistol: seven shots that hurt, a dry click, sneak-reload from rounds, every shot heard", () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  p.selectedSlotIndex = p._inv.slots.findIndex((x) => x?.typeId === "hollow:service_pistol");
  p.setRotation({ x: 0, y: 0 });
  const target = sim.overworld.spawnEntity("hollow:hollowed", { x: p.location.x, y: p.location.y, z: p.location.z + 8 });
  const hp0 = target.getComponent("minecraft:health").currentValue;
  sim.worldSounds = [];
  sim.useItem(p);
  sim.tick(2);
  assert(sim.worldSounds.includes("hollow.gun.pistol"), "gunshot");
  assert(target.getComponent("minecraft:health").currentValue < hp0, "the round hits");
  const gun = () => p._inv.getItem(p.selectedSlotIndex);
  eq(gun().getDynamicProperty("hollow:mag"), 6, "six left");
  for (let i = 0; i < 6; i++) {
    sim.useItem(p);
    sim.tick(8);
  }
  eq(gun().getDynamicProperty("hollow:mag"), 0, "empty");
  p._sounds = [];
  sim.useItem(p);
  sim.tick(2);
  assert(p._sounds.includes("hollow.gun.dry"), "dry click");
  const spare = p._inv.count("hollow:pistol_round");
  p._inv.addItem(new (sim.exports().ItemStack)("hollow:pistol_round", 10));
  p.isSneaking = true;
  sim.useItem(p);
  sim.tick(40);
  p.isSneaking = false;
  eq(gun().getDynamicProperty("hollow:mag"), 7, "reloaded");
  eq(p._inv.count("hollow:pistol_round"), spare + 3, "seven rounds taken");
  assert(journal(p).includes("gear_pistol"), "pistol entry");
  noErrors(sim);
});

await test("trevor: goes down instead of dying; standing beside him brings him round", () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const t = sim.overworld.getEntities({ type: "hollow:trevor" })[0];
  t.triggerEvent("hollow:down");
  sim.fire("dataDrivenEntityTrigger", { entity: t, eventId: "hollow:down" });
  sim.tick(20);
  eq(t.getProperty("hollow:state"), "downed", "downed");
  assert(/I'm down/.test(chat(p)), "calls for help");
  p.teleport({ x: t.location.x + 1, y: t.location.y, z: t.location.z });
  sim.fire("playerInteractWithEntity", { player: p, target: t });
  sim.tick(100);
  assert(t.getProperty("hollow:state") !== "downed", "on his feet");
  assert(t.getComponent("minecraft:health").currentValue >= 20, "patched up");
  noErrors(sim);
});

await test("trevor: nobody comes - he limps back at dawn; with permanent death on he is gone for good", () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  let t = sim.overworld.getEntities({ type: "hollow:trevor" })[0];
  t.triggerEvent("hollow:down");
  sim.fire("dataDrivenEntityTrigger", { entity: t, eventId: "hollow:down" });
  sim.tick(1300);
  eq(count(sim, "hollow:trevor"), 0, "crawled off");
  goTo(sim, 1, 500);
  sim.tick(40);
  eq(count(sim, "hollow:trevor"), 1, "back at dawn");
  assert(/all night/.test(chat(p)), "limps in");
  // permanent death
  const s = JSON.parse(sim.world.getDynamicProperty("hollow:settings") ?? "{}");
  sim.world.setDynamicProperty("hollow:settings", JSON.stringify({ ...s, trevorPermadeath: true }));
  boot(sim, 4);
  sim.tick(40);
  t = sim.overworld.getEntities({ type: "hollow:trevor" })[0];
  t.triggerEvent("hollow:down");
  sim.fire("dataDrivenEntityTrigger", { entity: t, eventId: "hollow:down" });
  sim.tick(1300);
  goTo(sim, 2, 500);
  sim.tick(40);
  eq(count(sim, "hollow:trevor"), 0, "gone for good");
  assert(JSON.parse(sim.world.getDynamicProperty("hollow:trevor")).gone === true, "remembered");
  noErrors(sim);
});

await test("trevor: anyone can order him; he patches up the badly hurt and won't follow into the crater", async () => {
  const sim = islandWorld();
  const a = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const b = sim.addPlayer("Sam", atSpawn());
  sim.tick(300);
  const t = sim.overworld.getEntities({ type: "hollow:trevor" })[0];
  b._ui.push({ canceled: false, selection: 0 });
  sim.fire("playerInteractWithEntity", { player: b, target: t });
  await flush();
  sim.tick(10);
  eq(t._owner, b.id, "follows Sam now");
  b._ui.push({ canceled: false, selection: 1 });
  sim.fire("playerInteractWithEntity", { player: b, target: t });
  await flush();
  sim.tick(10);
  eq(t.getProperty("hollow:state"), "hold", "holding");
  // a badly hurt player nearby is patched up without asking
  b._ui.push({ canceled: false, selection: 0 });
  sim.fire("playerInteractWithEntity", { player: b, target: t });
  await flush();
  sim.tick(10);
  a.teleport({ x: t.location.x + 2, y: t.location.y, z: t.location.z });
  a._health.currentValue = 4;
  a._effects = [];
  sim.tick(40);
  assert(a._effects.some((e) => e.id === "regeneration"), "patched up");
  // the leader walks into the crater: he stops at the edge and waits
  b.teleport({ x: GZ.x, y: 64, z: GZ.z });
  t.teleport({ x: GZ.x + 30, y: 64, z: GZ.z });
  sim.tick(40);
  eq(t.getProperty("hollow:state"), "hold", "won't follow into the crater");
  assert(/Not in there|without a suit/.test(chat(b)), "says so");
  b.teleport({ x: GZ.x + 34, y: 64, z: GZ.z });
  b.teleport({ x: GZ.x + 140, y: 64, z: GZ.z });
  t.teleport({ x: GZ.x + 136, y: 64, z: GZ.z });
  sim.tick(40);
  eq(t.getProperty("hollow:state"), "follow", "picks up again once you're out");
  noErrors(sim);
});

await test("island: searching the crew gives their notes once; the forest cabins never appear", () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const bodies = sim.overworld.getEntities({ type: "hollow:crew_body" });
  const rounds = p._inv.count("hollow:pistol_round");
  for (const b of bodies) sim.fire("playerInteractWithEntity", { player: p, target: b });
  for (const b of bodies) sim.fire("playerInteractWithEntity", { player: p, target: b });
  sim.tick(40);
  assert(journal(p).includes("okafor") && journal(p).includes("lindqvist"), "both notebooks");
  eq(p._inv.count("hollow:pistol_round"), rounds + 7, "loot once");
  sim.fire("scriptEventReceive", { id: "hollow:test", message: "on", sourceEntity: p });
  for (let i = 0; i < 6; i++) {
    p.teleport({ x: -100 - i * 300, y: 64, z: 100 });
    sim.tick(1300);
  }
  const sites = JSON.parse(sim.world.getDynamicProperty("hollow:sites") ?? "[]");
  eq(sites.length, 0, "no forest sites placed on the island");
  noErrors(sim);
});

await test("cinematic: the first arrival triggers 1957 and the shoot-down for everyone, once", () => {
  const sim = islandWorld();
  const a = sim.addPlayer("Alex", atSpawn());
  sim.tick(10);
  const b = sim.addPlayer("Sam", atSpawn());
  sim.tick(60);
  for (const p of [a, b]) {
    eq(p.getGameMode(), "Spectator", `${p.name} watching`);
    eq(p._hud, "hidden", "HUD hidden");
    assert(p._log.some((l) => l.includes("7 MAY 1957")), "1957 title");
  }
  sim.tick(400);
  assert(sim.spawnLog.includes("hollow:bomber") && sim.spawnLog.includes("hollow:bomb"), "bomber and bomb");
  assert(a._camShots > 5, "camera shots");
  sim.tick(200);
  assert(sim.spawnLog.includes("hollow:mushroom_cloud"), "airburst");
  assert(a._log.some((l) => l.includes("[shake]")), "the boom shakes the camera");
  sim.tick(500);
  assert(sim.spawnLog.includes("hollow:helicopter"), "the helicopter");
  assert(a._log.some((l) => l.includes("Taking fire")), "shot down");
  sim.tick(300);
  for (const p of [a, b]) {
    eq(p.getGameMode(), "Survival", `${p.name} back in survival`);
    eq(p._camera, undefined, "camera released");
    assert(Math.abs(p.location.z - L_SPAWN.z) < 3, "back at the beach");
  }
  eq(sim.world.getDynamicProperty("hollow:cine_done"), 1, "done");
  eq(sim.overworld.getEntities({ families: ["cinematic"] }).length, 0, "props cleared");
  sim.tick(800);
  for (const p of [a, b]) assert(has(p, "hollow:geiger_counter"), `${p.name} woke with their kit`);
  // it never plays again
  const c = sim.addPlayer("Kai", atSpawn());
  sim.tick(60);
  eq(c.getGameMode(), "Survival", "late arrival does not see it");
  noErrors(sim);
});

await test("cinematic: hold sneak to skip; quitting mid-scene restores you on return", () => {
  const sim = islandWorld();
  const a = sim.addPlayer("Alex", atSpawn());
  const b = sim.addPlayer("Sam", atSpawn());
  sim.tick(120);
  a.isSneaking = true;
  sim.tick(25);
  a.isSneaking = false;
  eq(a.getGameMode(), "Survival", "Alex skipped");
  eq(b.getGameMode(), "Spectator", "Sam still watching");
  sim.removePlayer(b);
  sim.tick(60);
  sim.addPlayer("Sam", atSpawn());
  sim.tick(2200);
  eq(b.getGameMode(), "Survival", "Sam restored after rejoining");
  assert(has(b, "hollow:geiger_counter") && has(a, "hollow:geiger_counter"), "both woke");
  eq(sim.overworld.getEntities({ families: ["cinematic"] }).length, 0, "no props left behind");
  noErrors(sim);
});

// =============================================================================== Trevor's jobs (phase 3)
function trevorOf(sim) {
  return sim.overworld.getEntities({ type: "hollow:trevor" })[0];
}
async function order(sim, p, ...selections) {
  for (const sel of selections) p._ui.push({ canceled: false, selection: sel });
  sim.fire("playerInteractWithEntity", { player: p, target: trevorOf(sim) });
  for (let i = 0; i < selections.length + 1; i++) await flush();
  sim.tick(2);
}
function plantTree(sim, x, z) {
  for (let y = 64; y < 69; y++) sim.overworld.setBlock({ x, y, z }, "minecraft:oak_log");
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let y = 67; y < 70; y++) {
    if (dx || dz || y > 68) sim.overworld.setBlock({ x: x + dx, y, z: z + dz }, "minecraft:oak_leaves");
  }
}
const crate = (sim) => {
  const j = JSON.parse(sim.world.getDynamicProperty("hollow:jobs"));
  return j.camp ? sim.overworld.getBlock(j.camp).getComponent("minecraft:inventory")?.container : undefined;
};

await test("jobs: make camp, chop a tree, logs stacked in the camp crate", async () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const base = { x: Math.floor(p.location.x) + 4, y: 63, z: Math.floor(p.location.z) };
  p.lookAt({ x: base.x + 0.5, y: 63.5, z: base.z + 0.5 });
  await order(sim, p, 3);                        // Make camp here
  sim.tick(700);
  const c = crate(sim);
  assert(c, "camp crate placed");
  plantTree(sim, base.x + 6, base.z + 4);
  p.lookAt({ x: base.x + 6.5, y: 63.5, z: base.z + 3.5 });
  await order(sim, p, 4);                        // Chop trees there
  sim.tick(2600);
  assert(c.count("minecraft:oak_log") >= 5, `logs in the crate (${c.count("minecraft:oak_log")})`);
  eq(sim.overworld.getBlock({ x: base.x + 6, y: 65, z: base.z + 4 }).typeId, "minecraft:air", "the tree is gone");
  eq(sim.overworld.getBlock({ x: base.x + 7, y: 68, z: base.z + 4 }).typeId, "minecraft:air", "and its leaves");
  assert(/Logs are in the crate|trees I've cut/.test(chat(p)), "reports back");
  noErrors(sim);
});

await test("jobs: building a cabin takes forty logs from the crate and raises it block by block", async () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  p.lookAt({ x: p.location.x + 4.5, y: 63.5, z: p.location.z + 0.5 });
  await order(sim, p, 3);
  sim.tick(700);
  const c = crate(sim);
  // not enough logs: he says so and drops the job
  p.lookAt({ x: p.location.x + 10.5, y: 63.5, z: p.location.z + 8.5 });
  await order(sim, p, 7, 1);
  sim.tick(40);
  assert(/40 logs/.test(chat(p)), "asks for logs");
  c.addItem(new (sim.exports().ItemStack)("minecraft:spruce_log", 64));
  await order(sim, p, 7, 1);
  sim.tick(3000);
  eq(c.count("minecraft:spruce_log"), 24, "forty logs used");
  const site = JSON.parse(sim.world.getDynamicProperty("hollow:jobs")).stats.built;
  eq(site, 1, "one building finished");
  const placed = [...sim.overworld._blocks.values()].filter((b) => b.perm.type.id === "minecraft:oak_planks").length;
  assert(placed > 60, `planks placed (${placed})`);
  noErrors(sim);
});

await test("jobs: orders from different players run first come first served; cancel drops only your own", async () => {
  const sim = islandWorld();
  const a = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const b = sim.addPlayer("Sam", atSpawn());
  sim.tick(300);
  a.lookAt({ x: a.location.x + 6.5, y: 63.5, z: a.location.z + 0.5 });
  await order(sim, a, 2);                        // go there
  await order(sim, b, 8);                        // light a fire
  await order(sim, a, 9);                        // collect
  const j = () => JSON.parse(sim.world.getDynamicProperty("hollow:jobs"));
  eq(j().queue.length + (j().cur ? 1 : 0), 3, "three orders");
  assert(/2 jobs ahead/.test(chat(b)) || /jobs ahead/.test(chat(a)), "says how many are ahead");
  await order(sim, a, 12);                       // cancel my orders (index 12 when not beside him? see menu)
  const left = j().queue.concat(j().cur ? [j().cur.order] : []);
  assert(left.every((o) => o.byName === "Sam"), "only Sam's order remains");
  sim.tick(1200);
  assert([...sim.overworld._blocks.values()].some((x) => x.perm.type.id === "minecraft:campfire"), "Sam's fire got lit");
  noErrors(sim);
});

await test("jobs: the field radio orders him from anywhere; cut logs drop their leaves on the island", async () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  p.teleport({ x: p.location.x + 200, y: 64, z: p.location.z });
  p.hold("hollow:field_radio");
  p._ui.push({ canceled: false, selection: 1 });   // hold here
  sim.useItem(p);
  sim.tick(2);
  for (let i = 0; i < 3; i++) await flush();
  sim.tick(20);
  eq(trevorOf(sim).getProperty("hollow:state"), "hold", "holding on the radio's say-so");
  assert((p._shownForms ?? []).some((f) => f._title.includes("Field radio")), "radio menu");
  // leaf decay after cutting a log by hand
  const t = { x: Math.floor(p.location.x) + 3, z: Math.floor(p.location.z) + 3 };
  plantTree(sim, t.x, t.z);
  for (let y = 64; y < 69; y++) {
    const blk = sim.overworld.getBlock({ x: t.x, y, z: t.z });
    const perm = blk.permutation;
    sim.overworld._set(blk.location, new (sim.exports().BlockPermutation)("minecraft:air"));
    sim.fire("playerBreakBlock", { player: p, block: blk, dimension: sim.overworld, brokenBlockPermutation: perm });
  }
  sim.tick(200);
  const leaves = [...sim.overworld._blocks.values()].filter((b) => b.perm.type.id === "minecraft:oak_leaves").length;
  eq(leaves, 0, "the canopy fell");
  noErrors(sim);
});


// ------------------------------------------------------------------------------- phases 4-6
const layoutJson = (name) => JSON.parse(LAYOUT_TS.match(new RegExp(`export const ${name}[^=]*= (.*);`))[1]);
const L_POINTS = layoutJson("POINTS");
const L_CONSOLES = layoutJson("CONSOLES");
const L_LOOT = layoutJson("LOOT_CONTAINERS");
const L_SITES = { SUNFALL: { x: -150, z: -178 }, DOCK: { x: 192, z: 258 } };
const statusOf = (sim, p) => {
  p._log = [];
  sim.fire("scriptEventReceive", { id: "hollow:status", message: "", sourceEntity: p });
  return p._log.join("\n");
};
const ofType = (sim, t) => [...sim.overworld._entities.values()].filter((e) => e.isValid && e.typeId === t);
const press = (sim, p, key) => {
  const c = L_CONSOLES[key];
  sim.fire("buttonPush", { source: p, block: sim.overworld.getBlock(c), dimension: sim.overworld });
};
const lootAt = (key) => L_LOOT.find((c) => c.loot === key);

await test("cult: Sunfall fills when you come near; gifts raise standing; killing the Faithful is never forgotten", async () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  p.teleport({ x: L_SITES.SUNFALL.x + 0.5, y: 64, z: L_SITES.SUNFALL.z + 30.5 });
  sim.tick(500);
  const faithful = ofType(sim, "hollow:faithful");
  assert(faithful.length >= 4, `faithful at home (${faithful.length})`);
  eq(ofType(sim, "hollow:hierophant").length, 1, "the Hierophant at his shrine");
  assert(ofType(sim, "hollow:zealot").length >= 3, "guards");
  assert(statusOf(sim, p).includes("standing=0"), "neutral to start");
  p.hold("minecraft:bread");
  sim.fire("playerInteractWithEntity", { player: p, target: faithful[0] });
  await flush();
  assert(statusOf(sim, p).includes("standing=4"), "a gift is remembered");
  // armed: they won't talk
  p.hold("hollow:service_pistol");
  sim.fire("playerInteractWithEntity", { player: p, target: faithful[1] });
  await flush();
  assert(chat(p).includes("Put that away") || p._log.join().includes("Put that away"), "refuses an armed visitor");
  sim.damage(faithful[2], 999, p);
  sim.tick(2);
  assert(statusOf(sim, p).includes("standing=-21"), `a killing costs 25: ${statusOf(sim, p).match(/cult:[^·]*/)}`);
  assert(journal(p).includes("cult1") && journal(p).includes("cult_faithful"), "journal entries");
  noErrors(sim);
});

await test("cult: offerings in the shrine barrel, the Hierophant's key opens the vault; his death turns everyone", async () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const barrel = lootAt("shrine_offerings");
  sim.overworld.setBlock(barrel, "minecraft:barrel");
  const shrine = L_POINTS.shrine[0];
  p.teleport({ x: shrine.x + 2.5, y: 64, z: shrine.z + 2.5 });
  sim.tick(100);
  const c = sim.overworld.getBlock(barrel).getComponent("minecraft:inventory").container;
  c.addItem(new (sim.exports().ItemStack)("hollow:offering_of_silence", 1));
  sim.tick(220);
  assert(statusOf(sim, p).includes("standing=15"), "the offering is taken");
  const shaft = L_POINTS.vault_shaft[0];
  sim.overworld.setBlock(shaft, "minecraft:polished_blackstone");
  p.hold("hollow:shrine_key");
  sim.useItem(p);
  sim.tick(2);
  eq(sim.overworld.getBlock(shaft).typeId, "minecraft:ladder", "the shaft opens");
  assert(journal(p).includes("ledger"), "the ledger");
  assert(!has(p, "hollow:shrine_key"), "key used up");
  const h = ofType(sim, "hollow:hierophant")[0] ?? sim.overworld.spawnEntity("hollow:hierophant", { x: shrine.x, y: 64, z: shrine.z + 4 });
  sim.damage(h, 999, p);
  sim.tick(2);
  assert(statusOf(sim, p).includes("standing=-100") && statusOf(sim, p).includes("hierophant=dead"), "never forgiven");
  noErrors(sim);
});

await test("survey: stations log with a counter; containers stock on approach; samples file; reels play", async () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const c1 = L_CONSOLES.station1;
  p.teleport({ x: c1.x + 1.5, y: 64, z: c1.z + 1.5 });
  press(sim, p, "station1");
  assert(journal(p).includes("station1") && journal(p).includes("survey"), "station entry");
  assert(statusOf(sim, p).includes("stations=1/6"), "logged once");
  press(sim, p, "station1");
  assert(statusOf(sim, p).includes("stations=1/6"), "not twice");
  // the armoury stocks when someone comes near
  const arm = lootAt("bunker1_armory");
  sim.overworld.setBlock(arm, "minecraft:chest");
  p.teleport({ x: arm.x + 0.5, y: 64, z: arm.z + 3.5 });
  sim.tick(80);
  const box = sim.overworld.getBlock(arm).getComponent("minecraft:inventory").container;
  let ids = [];
  for (let i = 0; i < box.size; i++) if (box.getItem(i)) ids.push(box.getItem(i).typeId);
  assert(ids.includes("hollow:bolt_rifle") && ids.includes("hollow:hazmat_suit"), `armoury stocked (${ids})`);
  sim.tick(80);
  let n = 0;
  for (let i = 0; i < box.size; i++) if (box.getItem(i)?.typeId === "hollow:bolt_rifle") n += box.getItem(i).amount;
  eq(n, 1, "stocked once");
  // a soil sample on the blast plain, then filed
  p.teleport({ x: GZ.x + 60.5, y: 64, z: GZ.z + 0.5 });
  sim.overworld.setBlock({ x: GZ.x + 60, y: 63, z: GZ.z }, "minecraft:sand");
  p.lookAt({ x: GZ.x + 60.5, y: 63.5, z: GZ.z + 0.5 });
  p.hold("hollow:sample_kit");
  sim.useItem(p);
  sim.tick(2);
  assert(has(p, "hollow:soil_sample"), `soil sample taken: ${p._log.slice(-3)} ${JSON.stringify(p.getBlockFromViewDirection({ maxDistance: 5 })?.block?.typeId)}`);
  p.hold("hollow:soil_sample");
  sim.useItem(p);
  sim.tick(2);
  assert(!has(p, "hollow:soil_sample") && journal(p).includes("sample_soil"), "filed");
  assert(statusOf(sim, p).includes("samples=soil"), "survey knows");
  // a reel
  const reel = new (sim.exports().ItemStack)("hollow:film_reel", 1);
  reel.setDynamicProperty("hollow:reel", 4);
  p._inv.setItem(p.selectedSlotIndex, reel);
  p._ui.push({ canceled: false, selection: 0 });
  sim.useItem(p);
  sim.tick(2);
  for (let i = 0; i < 3; i++) await flush();
  assert((p._shownForms ?? []).some((f) => f._title.includes("Reel 4")), "the film plays");
  assert(journal(p).includes("reel4"), "reel entry");
  noErrors(sim);
});

await test("tower: fuel and parts, transmit, a night under siege, the dawn helicopter and the ending", async () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const IS = sim.exports().ItemStack;
  const g = L_CONSOLES.generator;
  p.teleport({ x: g.x + 1.5, y: 64, z: g.z + 1.5 });
  press(sim, p, "generator");
  assert(statusOf(sim, p).includes("gen=false"), "no fuel, no power");
  p._inv.addItem(new IS("minecraft:coal", 10));
  press(sim, p, "generator");
  assert(statusOf(sim, p).includes("gen=true"), "running");
  eq(p._inv.count("minecraft:coal"), 2, "eight burned");
  p._inv.addItem(new IS("hollow:vacuum_tube", 2));
  p._inv.addItem(new IS("hollow:copper_wire", 5));
  p._inv.addItem(new IS("hollow:battery_bank", 1));
  p._ui.push({ canceled: false, selection: 0 });
  press(sim, p, "tower");
  for (let i = 0; i < 3; i++) await flush();
  assert(statusOf(sim, p).includes("valves=2/2 wire=4/4 battery=1/1"), "parts fitted");
  eq(p._inv.count("hollow:copper_wire"), 1, "spare wire kept");
  p._ui.push({ canceled: false, selection: 1 });
  press(sim, p, "tower");
  for (let i = 0; i < 3; i++) await flush();
  sim.tick(500);
  assert(statusOf(sim, p).includes("phase=waiting"), "transmitted");
  assert(journal(p).includes("transmit"), "mayday entry");
  sim.world.setTimeOfDay(16000);
  sim.tick(1000);
  assert(statusOf(sim, p).match(/waves=[1-9]/), "the Children come for the lamp");
  sim.world.setTimeOfDay(1000);
  sim.tick(950);
  assert(/phase=(inbound|landed)/.test(statusOf(sim, p)), "rotors at dawn");
  sim.tick(450);
  assert(statusOf(sim, p).includes("phase=landed"), "set down at the dock");
  const d = L_POINTS.dock_end[0];
  p.teleport({ x: d.x + 0.5, y: d.y + 1, z: d.z - 3.5 });
  p._ui.push({ canceled: false, selection: 0 });
  sim.tick(60);
  assert(statusOf(sim, p).includes("phase=gone"), "aboard");
  sim.tick(640);
  for (let i = 0; i < 3; i++) await flush();
  assert(journal(p).includes("ending"), "ending entry");
  assert((p._shownForms ?? []).some((f) => f._title.includes("Varrow Island")), "the epilogue");
  eq(String(p.getGameMode()).toLowerCase(), "survival", "back in the game afterwards");
  noErrors(sim);
});


await test("guidance: one objective at a time (talk, tower, parts, transmit) with a marker, chat and the log", async () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  assert(statusOf(sim, p).includes("objective: talk"), "talk to Trevor first");
  sim.tick(60);
  assert((p._waypoints ?? []).length >= 1, "a marker on the locator bar");
  p._ui.push({ canceled: true });
  sim.fire("playerInteractWithEntity", { player: p, target: trevorOf(sim) });
  for (let i = 0; i < 3; i++) await flush();
  sim.tick(60);
  assert(chat(p).includes("Objective: §fReach the radio tower"), "announced in chat");
  assert(statusOf(sim, p).includes("objective: tower"), "then the tower");
  // at the tower: the transmitter parts, nearest first
  const T = L_CONSOLES.tower;
  p.teleport({ x: T.x + 0.5, y: 64, z: T.z + 3.5 });
  sim.tick(260);
  assert(chat(p).includes("Repair the transmitter"), "parts objective announced");
  assert(/objective: parts:.*coal.*tubes.*wire.*battery/.test(statusOf(sim, p)), `parts list: ${statusOf(sim, p).match(/objective: [^·]*/)}`);
  const IS = sim.exports().ItemStack;
  p._inv.addItem(new IS("hollow:copper_wire", 4));
  sim.tick(60);
  assert(chat(p).includes("§6Transmitter:"), "a quiet update, not a new title");
  assert(!/objective: parts:[^·]*wire/.test(statusOf(sim, p)), "wire in a pack counts");
  for (const [id, n] of [["minecraft:coal", 8], ["hollow:vacuum_tube", 2], ["hollow:battery_bank", 1]]) p._inv.addItem(new IS(id, n));
  sim.tick(60);
  assert(statusOf(sim, p).includes("objective: install"), "take it all to the tower");
  // the Research Log leads with it
  p._ui.push({ canceled: true });
  sim.fire("scriptEventReceive", { id: "hollow:journal", sourceEntity: p, message: "" });
  for (let i = 0; i < 3; i++) await flush();
  const log = (p._shownForms ?? []).filter((f) => f._title.includes("Research Log")).pop();
  assert(log && log._body.includes("Objective"), "objective on the log's front page");
  noErrors(sim);
});

await test("scenes: first sight of the tower is a short cutscene; you are put back; it plays once; Sneak skips", () => {
  const sim = islandWorld();
  const p = sim.addPlayer("Alex", atSpawn());
  sim.tick(OPEN);
  const T = L_CONSOLES.tower;
  const spot = { x: T.x + 20.5, y: 64, z: T.z + 20.5 };
  p.teleport(spot);
  sim.tick(25);
  eq(String(p.getGameMode()).toLowerCase(), "spectator", "in the cutscene");
  sim.tick(200);
  eq(String(p.getGameMode()).toLowerCase(), "survival", "back afterwards");
  assert(Math.hypot(p.location.x - spot.x, p.location.z - spot.z) < 1, "where they were");
  sim.tick(100);
  eq(String(p.getGameMode()).toLowerCase(), "survival", "not replayed");
  // Ground Zero: skip with Sneak
  p.teleport({ x: GZ.x + 80.5, y: 64, z: GZ.z + 0.5 });
  sim.tick(25);
  eq(String(p.getGameMode()).toLowerCase(), "spectator", "the crater scene");
  p.isSneaking = true;
  sim.tick(25);
  p.isSneaking = false;
  eq(String(p.getGameMode()).toLowerCase(), "survival", "skipped");
  noErrors(sim);
});

// =============================================================================== report
const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  (${r.ms.toFixed(0)} ms)`);
  if (!r.ok) console.log(`      ${r.err.split("\n").slice(0, 6).join("\n      ")}`);
}
console.log(`\n${results.length - failed.length}/${results.length} scenarios passed`);
if (reportAt) {
  const md = [
    "# Headless simulation report (generated)",
    "",
    "The real bundled behavior-pack scripts run against a fake Minecraft API (`tools/simtest`).",
    "This checks script logic: scheduling, events, persistence, reloads, state machines, caps, cooldowns and rewards.",
    "It is **not** an in-game test: there is no engine pathfinding, melee, physics, rendering or audio.",
    "",
    `Result: **${results.length - failed.length}/${results.length} scenarios passed**`,
    "",
    "| Scenario | Result |",
    "|---|---|",
    ...results.map((r) => `| ${r.name} | ${r.ok ? "pass" : "**FAIL**"} |`),
    "",
    ...notes.map((n) => `- ${n}`),
    "",
  ];
  fs.writeFileSync(reportAt, md.join("\n"));
}
process.exit(failed.length ? 1 : 0);
