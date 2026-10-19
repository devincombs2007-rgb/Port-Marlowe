// Builds the real behavior-pack scripts against the fake Minecraft API and boots them in a VM.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { Sim } from "./fake/mc.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "build", "simtest", "bundle.js");

export function buildBundle() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const esbuild = path.join(ROOT, "tools", "typecheck", "node_modules", ".bin", "esbuild");
  execFileSync(esbuild, [
    path.join(ROOT, "scripts_src", "main.ts"), "--bundle", "--format=iife", "--platform=neutral", "--target=es2022",
    `--alias:@minecraft/server=${path.join(HERE, "fake", "shim_server.js")}`,
    `--alias:@minecraft/server-ui=${path.join(HERE, "fake", "shim_ui.js")}`,
    `--outfile=${OUT}`, "--log-level=warning",
  ], { stdio: "inherit" });
  return fs.readFileSync(OUT, "utf8");
}

let CODE;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Boot (or reboot) the add-on in this world: fresh script state, same world data. */
export function boot(sim, seed = 1) {
  CODE ??= buildBundle();
  sim.boot();
  const logs = [];
  const ctx = vm.createContext({
    __mc: sim.exports(),
    console: {
      log: (...a) => logs.push(a.join(" ")),
      warn: (...a) => {
        const s = a.join(" ");
        logs.push(s);
        if (/failed/.test(s)) sim.errors.push(s);
      },
      error: (...a) => sim.errors.push(a.join(" ")),
    },
  });
  ctx.__rand = seeded(seed);
  vm.runInContext("Math.random = __rand;", ctx);
  vm.runInContext(CODE, ctx, { filename: "main.js" });
  sim.fireStartup();
  sim.fire("worldLoad", {});
  sim.logs = logs;
  return sim;
}

export function newWorld(seed = 1) {
  return boot(new Sim(), seed);
}
