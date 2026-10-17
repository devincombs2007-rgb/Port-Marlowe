import { build } from "esbuild";
import { statSync } from "node:fs";

const out = "packs/DREAD_BP/scripts/main.js";
await build({
  entryPoints: ["src/main.ts"],
  outfile: out,
  bundle: true,
  format: "esm",
  target: "es2022",
  platform: "neutral",
  // Game-provided modules must stay as imports; everything else is bundled.
  external: ["@minecraft/server", "@minecraft/server-ui"],
  legalComments: "none",
  logLevel: "info",
});
console.log(`built ${out} (${statSync(out).size} bytes)`);
