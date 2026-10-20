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
  assert(!allEvents.includes("hollow:to_stalk") && !allEvents.includes("hollow:to_lunge"), "watcher never stalked on day 1");
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

await test("watcher: staring makes it withdraw and leave one Pale Resin (once per night)", () => {
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

await test("watcher: stalks when unwatched; twig warning; lunges only at an unlit player", () => {
  const { sim, p, w } = watcherNight();
  p._view = { x: -(w.location.x - p.location.x), y: 0, z: -(w.location.z - p.location.z) }; // look away
  const L = Math.hypot(p._view.x, p._view.z);
  p._view = { x: p._view.x / L, y: 0, z: p._view.z / L };
  sim.tick(100);
  assert(w._events.includes("hollow:to_stalk"), `stalking: ${w._events}`);
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
  const p = sim.addPlayer("Alex", { x: 0.5, y: 64, z: 0.5 }, veteran);
  let overlap = 0, nightTracks = 0, last;
  for (let night = 1; night <= 4; night++) {
    goTo(sim, night, 12000);
    for (let t = 0; t < 12000; t++) {
      sim.tick(1);
      const m = p._music?.track;
      if (m !== last && m?.startsWith("hollow.music.night")) nightTracks++;
      last = m;
      const state = (w) => [...w._events].reverse().find((e) => e.startsWith("hollow:to_"));
      const hunted = sim.overworld.getEntities({ type: "hollow:watcher" }).some((w) => ["hollow:to_stalk", "hollow:to_lunge"].includes(state(w)));
      if (hunted && m?.startsWith("hollow.music.night")) overlap++;
    }
  }
  assert(nightTracks >= 1, "night music played at least once in 4 nights");
  assert(nightTracks <= 4, `at most one night track per night (${nightTracks} in 4 nights)`);
  notes.push(`music: ${nightTracks} night track(s) over 4 nights; ${overlap} ticks of night music while a Watcher was stalking`);
  assert(overlap <= 220, `night music stops within one music check of a hunt (${overlap} overlapping ticks)`);
  noErrors(sim);
});

// =============================================================================== tracks
const trackBlocks = (sim) => [...sim.overworld._blocks.entries()].filter(([, c]) => c.perm.type.id === "hollow:tracks")
  .map(([k, c]) => ({ at: k.split(",").map(Number), kind: c.perm.states["hollow:kind"], dir: c.perm.states["hollow:dir"] }));

await test("tracks: the Knocker leaves bare-foot prints to the door that fade after a day; nothing is replaced", () => {
  const { sim, ow, door } = houseWorld(25);
  ow.setBlock({ x: 12, y: 64, z: 0 }, "minecraft:poppy"); // a flower in its path must survive
  goTo(sim, 3, 12000);
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
