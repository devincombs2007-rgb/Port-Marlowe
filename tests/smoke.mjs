import { build } from "esbuild";
import assert from "node:assert/strict";

const out = "dist/smoke.mjs";
await build({
  entryPoints: ["src/main.ts"], outfile: out, bundle: true, format: "esm", platform: "node",
  alias: { "@minecraft/server": "../tests/mock-server.mjs" }, external: ["../tests/mock-server.mjs"], logLevel: "silent",
});
const mock = await import("../tests/mock-server.mjs");
await import("../" + out);
const { Player, messages, __fire, world, played } = mock;
const steve = new Player("steve");
const last = () => messages.at(-1);

__fire.spawn(steve);
assert.match(last(), /DREAD .*loaded/, "join banner");

__fire.scriptEvent("dread:set", "soundIntensity 150", steve);
assert.match(last(), /0 to 100/, "range rejected");
__fire.scriptEvent("dread:set", "soundIntensity 35", steve);
assert.equal(world.getDynamicProperty("dread:soundIntensity"), 35);
__fire.scriptEvent("dread:set", "effects cinematic", steve);
__fire.scriptEvent("dread:set", "effects ultra", steve);
assert.match(last(), /performance, balanced or cinematic/);
__fire.scriptEvent("dread:set", "debug false", steve);
__fire.scriptEvent("dread:status", "", steve);
assert.match(last(), /sound=35 jumpscare=40 effects=cinematic debug=false/);
messages.length = 0;
__fire.spawn(steve);
assert.equal(messages.length, 0, "debug off => silent join");
__fire.scriptEvent("dread:reset", "", steve);
__fire.scriptEvent("dread:status", "", steve);
assert.match(last(), /sound=70 .*effects=balanced debug=true/);
__fire.scriptEvent("other:thing", "", steve);
__fire.scriptEvent("dread:bogus", "", steve);
assert.ok(messages.some((m) => /Unknown command "bogus"/.test(m)));
// corrupt stored values must fall back to defaults, never throw
world.setDynamicProperty("dread:soundIntensity", "loud");
world.setDynamicProperty("dread:effects", 7);
__fire.scriptEvent("dread:status", "", steve);
assert.match(last(), /sound=70/);
__fire.scriptEvent("dread:sound", "bogus", steve);
assert.match(last(), /Usage: dread:sound/);
__fire.scriptEvent("dread:sound", "all", steve);
assert.equal(played.length, 14, "all 14 lurker events play");
assert.ok(played.every((p) => p.id.startsWith("dread.lurker.") && Number.isFinite(p.o.location.x)));
assert.ok(played[0].o.location.z < 0, "first sound is behind a player facing +z");
console.log("smoke tests passed (mocked API, not in-game)");
