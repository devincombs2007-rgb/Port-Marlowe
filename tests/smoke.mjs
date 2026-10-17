// Integration smoke tests: the real TypeScript (config, commands, director adapter, Lurker adapter) running against the
// mock API in tests/mock-server.mjs. Proves the wiring and logic; it does NOT prove behaviour inside Minecraft.
import { build } from "esbuild";
import assert from "node:assert/strict";

const bundle = async (entry, out) => {
  await build({ entryPoints: [entry], outfile: out, bundle: true, format: "esm", platform: "node",
    alias: { "@minecraft/server": "../tests/mock-server.mjs", "@minecraft/server-ui": "../tests/mock-server-ui.mjs" },
    external: ["../tests/mock-server.mjs", "../tests/mock-server-ui.mjs"], logLevel: "silent" });
};
await bundle("tests/entry.ts", ".tmp/smoke-entry.mjs");
const mock = await import("../tests/mock-server.mjs");
await import("../.tmp/smoke-entry.mjs");
const { sim, messages, played, log, terrain, tick, __fire, world } = mock;
const { ui } = await import("../tests/mock-server-ui.mjs");
const flush = () => new Promise((r) => setTimeout(r, 0));

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ok  ${name}`); };
const say = (p, id, msg = "") => __fire.scriptEvent(id, msg, p);
const lastMsg = () => messages.at(-1);
const lurkersIn = () => sim.dims.overworld.entities.filter((e) => e.typeId === "dread:lurker" && e.isValid);
const stateLine = (p) => { messages.length = 0; say(p, "dread:state"); return messages.join("\n"); };

const steve = sim.addPlayer("steve");
__fire.spawn(steve);
say(steve, "dread:set", "debug false"); // keep the transcript quiet
const atest = async (name, fn) => { await fn(); passed++; console.log(`  ok  ${name}`); };

tick(130);
await atest("first join: the Field Journal is given once and its first page unlocked", async () => {
  assert.equal(steve.inventory.filter((i) => i.typeId === "dread:journal").length, 1);
  assert.equal(steve.getDynamicProperty("dread:pages"), "first");
  __fire.spawn(steve, true); tick(130);
  assert.equal(steve.inventory.filter((i) => i.typeId === "dread:journal").length, 1, "not given twice");
});

await atest("journal: settings form round-trips every setting without cheats", async () => {
  ui.shown.length = 0;
  ui.respond = (f) => f.kind === "action" ? { canceled: false, selection: 2 } : { canceled: false, formValues: [true, 25, 40, 0, 0, false, false] };
  __fire.useItem(steve, "dread:journal");
  await flush(); await flush(); await flush();
  const modal = ui.shown.find((f) => f.kind === "modal");
  assert.ok(modal, "settings form shown");
  assert.equal(modal.controls.length, 7);
  say(steve, "dread:status");
  assert.match(lastMsg(), /intensity=25 sound=40 jumpscare=0 effects=performance debug=false/);
  ui.respond = () => ({ canceled: true });
});

await atest("journal: pages and lessons list only what the player has earned", async () => {
  ui.shown.length = 0;
  const answers = [{ canceled: false, selection: 1 }, { canceled: true }];
  ui.respond = () => answers.shift() ?? { canceled: true };
  __fire.useItem(steve, "dread:journal");
  await flush(); await flush(); await flush();
  const lessons = ui.shown.find((f) => f._title === "What I know");
  assert.ok(lessons && /Nothing yet/.test(lessons._body), "no lessons before any encounter");
});

await atest("multiplayer: settings belong to whoever saved them first unless opened to everyone", async () => {
  const guest = sim.addPlayer("guest", { x: 3000, y: 64, z: 3000 });
  ui.shown.length = 0;
  ui.respond = (f) => f.kind === "action" && f._title === "Field Journal" ? { canceled: false, selection: 2 } : { canceled: true };
  __fire.useItem(guest, "dread:journal");
  await flush(); await flush(); await flush();
  assert.ok(ui.shown.some((f) => f.kind === "action" && /managed by the world's DREAD owner/.test(f._body)));
  assert.ok(!ui.shown.some((f) => f.kind === "modal"));
  guest.isValid = false; __fire.leave(guest);
  ui.respond = () => ({ canceled: true });
  say(steve, "dread:reset"); say(steve, "dread:set", "debug false");
});

test("config: ranges, enums, persistence and corrupt-value fallback", () => {
  say(steve, "dread:set", "soundIntensity 150");
  assert.match(lastMsg(), /0 to 100/);
  say(steve, "dread:set", "soundIntensity 35");
  assert.equal(world.getDynamicProperty("dread:soundIntensity"), 35);
  say(steve, "dread:set", "effects ultra");
  assert.match(lastMsg(), /performance, balanced or cinematic/);
  say(steve, "dread:status");
  assert.match(lastMsg(), /sound=35 jumpscare=40 effects=balanced debug=false/);
  say(steve, "dread:reset"); say(steve, "dread:set", "debug false");
  world.setDynamicProperty("dread:soundIntensity", "loud"); world.setDynamicProperty("dread:effects", 7);
  say(steve, "dread:status");
  assert.match(lastMsg(), /sound=70/);
  say(steve, "dread:reset"); say(steve, "dread:set", "debug false");
  say(steve, "dread:bogus");
  assert.ok(messages.some((m) => /Unknown command "bogus"/.test(m)));
});

test("sound test command plays 14 positional Lurker sounds, first one behind the player", () => {
  played.length = 0;
  say(steve, "dread:sound", "all");
  tick(14 * 60 + 5);
  assert.equal(played.length, 14);
  assert.ok(played.every((p) => p.id.startsWith("dread.lurker.") && Number.isFinite(p.o.location.x)));
  assert.ok(played[0].o.location.z < steve.location.z, "behind a player facing +z");
});

test("ambient sound test plays all 10 ambient events", () => {
  played.length = 0;
  say(steve, "dread:sound", "ambient");
  tick(10 * 60 + 5);
  assert.equal(played.length, 10);
  assert.ok(played.every((p) => p.id.startsWith("dread.ambient.")));
});

test("atmosphere: fog follows tense states, never daylight or Performance mode; hunts shake the camera", () => {
  const fogCmds = () => log.commands.filter((c) => /^fog /.test(c.c));
  tick(20 * 200); // clear the 3-minute respawn grace
  sim.timeOfDay = 16000; terrain.underground = true; log.commands.length = 0;
  say(steve, "dread:force", "escalation"); say(steve, "dread:clear");
  tick(60);
  assert.ok(fogCmds().some((c) => c.c === "fog @s push dread:fog_escalation dread_atmos"), JSON.stringify(fogCmds()));
  say(steve, "dread:force", "dormant"); tick(60);
  assert.ok(fogCmds().at(-1).c === "fog @s remove dread_atmos", "fog removed when relaxed");
  log.commands.length = 0;
  say(steve, "dread:set", "effects performance"); say(steve, "dread:force", "escalation"); say(steve, "dread:clear"); tick(60);
  assert.equal(fogCmds().filter((c) => c.c.includes("push")).length, 0, "no fog in Performance mode");
  say(steve, "dread:set", "effects balanced");
  sim.timeOfDay = 6000; terrain.underground = false; tick(20 * 4); log.commands.length = 0; // let the 3 s scan cache refresh
  say(steve, "dread:force", "unease"); tick(60);
  assert.equal(fogCmds().filter((c) => c.c.includes("push")).length, 0, "no fog in open daylight");
  say(steve, "dread:force", "dormant"); say(steve, "dread:clear"); tick(40);
  sim.timeOfDay = 18000; terrain.underground = false; log.commands.length = 0;
  say(steve, "dread:set", "jumpscareIntensity 0"); steve.mode = "Survival";
  say(steve, "dread:set", "jumpscareIntensity 60");
  say(steve, "dread:force", "hunt"); tick(40);
  assert.ok(log.commands.some((c) => /^camerashake add @s [0-9.]+ [0-9.]+ rotational$/.test(c.c)), "camera shake on hunt start");
  say(steve, "dread:clear"); say(steve, "dread:force", "dormant"); say(steve, "dread:clear"); tick(40);
  say(steve, "dread:reset"); say(steve, "dread:set", "debug false");
});

test("debug spawn: a Lurker appears at a vantage 14-24 blocks away, owned by the director", () => {
  terrain.underground = false;
  say(steve, "dread:spawn", "observe");
  const l = lurkersIn();
  assert.equal(l.length, 1);
  const d = Math.hypot(l[0].location.x - steve.location.x, l[0].location.z - steve.location.z);
  assert.ok(d > 10 && d < 30, `distance ${d}`);
  assert.ok(l[0].tags.has("dread_managed"));
  assert.match(stateLine(steve), /lurkers\(own\/global\)=1\/1/);
});

test("observer: looking at it makes it notice, freeze, vanish; director learns the player noticed", () => {
  const l = lurkersIn()[0];
  steve.view = { x: l.location.x - steve.location.x, y: 0, z: l.location.z - steve.location.z };
  const n = Math.hypot(steve.view.x, steve.view.z); steve.view = { x: steve.view.x / n, y: 0, z: steve.view.z / n };
  log.particles.length = 0;
  tick(20 * 10);
  assert.equal(lurkersIn().length, 0, "lurker should be gone");
  assert.ok(log.particles.some((p) => p.name === "dread:lurker_vanish"), "vanish particle");
  assert.ok(log.events.some((e) => e.name === "dread:set_observe"));
  assert.match(stateLine(steve), /noticed=1/);
  tick(80);
  assert.ok(String(steve.getDynamicProperty("dread:pages")).split(",").includes("noticed"), "journal page unlocked");
  assert.ok(played.some((p) => p.id === "dread.lurker.vanish"), "vanish sound played");
});

test("hunt: attacks are capped at 3 hits, then it retreats and leaves", () => {
  steve.view = { x: 0, y: 0, z: 1 };
  say(steve, "dread:spawn", "hunt");
  const l = lurkersIn()[0];
  l.location = { x: steve.location.x + 2, y: 64, z: steve.location.z };
  for (let i = 0; i < 3; i++) { __fire.hurt(steve, l); tick(10); }
  tick(20 * 25);
  assert.equal(lurkersIn().length, 0);
  assert.ok(log.events.some((e) => e.id === l.id && e.name === "dread:set_retreat"));
});

test("light counterplay: a torch beside the player ends a hunt", () => {
  const p = steve.location;
  terrain.extraBlocks.set(`${Math.floor(p.x) + 1},${Math.floor(p.y)},${Math.floor(p.z)}`, "minecraft:torch");
  say(steve, "dread:spawn", "hunt");
  const l = lurkersIn()[0];
  l.location = { x: p.x + 8, y: 64, z: p.z + 8 };
  const t0 = world.getAbsoluteTime();
  tick(20 * 40);
  assert.equal(lurkersIn().length, 0, "lurker still alive in torchlight");
  assert.ok(log.events.some((e) => e.id === l.id && e.name === "dread:set_retreat"));
  terrain.extraBlocks.clear();
  void t0;
});

test("death: Lurkers are removed and the director enters recovery with grace", () => {
  say(steve, "dread:spawn", "hunt");
  assert.equal(lurkersIn().length, 1);
  __fire.die(steve);
  assert.equal(lurkersIn().length, 0);
  assert.match(stateLine(steve), /state=recovery/);
});

test("an unowned Lurker (egg/summon/reload survivor) is adopted and always eventually leaves", () => {
  tick(20 * 6); // let the cached light scan refresh after the torch test
  steve.view = { x: -1, y: 0, z: -1 }; // looking away from it
  const stray = sim.dims.overworld.spawnEntity("dread:lurker", { x: 20, y: 64, z: 20 });
  tick(20 * 12);
  assert.match(stateLine(steve), /lurkers\(own\/global\)=1\/1/, "adopted");
  tick(20 * 450);
  assert.equal(stray.isValid, false, "stray Lurker must not live forever");
});

test("leaving the game saves director memory and removes that player's Lurkers", () => {
  const alex = sim.addPlayer("alex", { x: 500, y: 64, z: 500 });
  __fire.spawn(alex); tick(40);
  say(alex, "dread:spawn", "observe");
  assert.equal(lurkersIn().filter((e) => Math.abs(e.location.x - 500) < 60).length, 1);
  __fire.leave(alex); alex.isValid = false;
  assert.equal(lurkersIn().filter((e) => Math.abs(e.location.x - 500) < 60).length, 0);
  const saved = world.getDynamicProperty(`dread:mem:${alex.id}`);
  assert.equal(typeof saved, "string");
  assert.equal(JSON.parse(saved).v, 1);
});

test("soak: 3 game-hours of a lonely underground night produce encounters, stay bounded, and never throw", () => {
  const alone = sim.addPlayer("hermit", { x: -800, y: 64, z: -800 });
  __fire.spawn(alone); terrain.underground = true; sim.timeOfDay = 16000;
  for (const p of sim.players) if (p !== alone && p.isValid) p.isValid = false;
  let maxLurkers = 0;
  const kinds = new Set();
  played.length = 0;
  tick(20 * 3600 * 3, () => {
    if (mock.system.currentTick % 20 === 0) maxLurkers = Math.max(maxLurkers, lurkersIn().length);
  });
  for (const p of played) kinds.add(p.id);
  const st = stateLine(alone);
  console.log("      " + st.replace(/\n/g, " | ").replace(/\[hermit\] .{0,30}/g, ""));
  assert.ok(maxLurkers <= 1, `max simultaneous lurkers ${maxLurkers}`);
  assert.ok(kinds.size >= 5, `only ${kinds.size} distinct sounds played`);
  assert.ok(played.length > 30, `only ${played.length} sounds in 3 hours`);
  assert.ok(lurkersIn().length <= 1);
});

console.log(`integration smoke tests passed (${passed}); mocked API, not in-game`);
