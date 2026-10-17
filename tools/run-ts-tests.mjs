#!/usr/bin/env node
/** Bundles and runs every tests/*.test.ts (pure-logic tests; no Minecraft needed). */
import { build } from "esbuild";
import { readdirSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

mkdirSync(".tmp", { recursive: true });
let failed = 0;
for (const f of readdirSync("tests").filter((n) => n.endsWith(".test.ts"))) {
  const out = `.tmp/${f.replace(".ts", ".mjs")}`;
  await build({ entryPoints: [`tests/${f}`], outfile: out, bundle: true, platform: "node", format: "esm", logLevel: "warning" });
  console.log(`# ${f}`);
  const r = spawnSync("node", [out], { stdio: "inherit" });
  if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
