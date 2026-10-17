#!/usr/bin/env node
/** Packages packs/DREAD_BP + packs/DREAD_RP into dist/ (.mcaddon plus individual .mcpack files). Deterministic output. */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { zipSync } from "fflate";

const ROOT = new URL("..", import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const stage = process.argv[2] ?? "test"; // test | release
const FIXED_MTIME = new Date("2026-01-01T00:00:00Z");

function collect(dir, base) {
  const files = {};
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      if (name.startsWith(".")) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else files[`${base}/${relative(dir, p).split(sep).join("/")}`] = [readFileSync(p), { mtime: FIXED_MTIME, level: name.endsWith(".ogg") || name.endsWith(".png") ? 0 : 6 }];
    }
  };
  walk(dir);
  return files;
}

const bp = collect(join(ROOT, "packs/DREAD_BP"), "DREAD_BP");
const rp = collect(join(ROOT, "packs/DREAD_RP"), "DREAD_RP");
const dist = join(ROOT, "dist");
mkdirSync(dist, { recursive: true });
const name = `DREAD-${pkg.version}-${stage}`;

// .mcpack = a zip with the manifest at the root; .mcaddon = a zip holding both pack folders.
const strip = (files, base) => Object.fromEntries(Object.entries(files).map(([k, v]) => [k.slice(base.length + 1), v]));
writeFileSync(join(dist, `${name}.mcaddon`), zipSync({ ...bp, ...rp }));
writeFileSync(join(dist, `${name}_BP.mcpack`), zipSync(strip(bp, "DREAD_BP")));
writeFileSync(join(dist, `${name}_RP.mcpack`), zipSync(strip(rp, "DREAD_RP")));
for (const f of readdirSync(dist)) console.log(`dist/${f}  ${(statSync(join(dist, f)).size / 1024).toFixed(1)} KB`);
