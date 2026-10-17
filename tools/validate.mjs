#!/usr/bin/env node
/**
 * DREAD static validation. Checks manifests, JSON against Mojang's official schemas
 * (@minecraft/bedrock-schemas), cross-file references (entity -> geometry/animation/texture/sound),
 * audio files, script imports and path hygiene.
 *
 * PASSING THIS DOES NOT MEAN THE ADD-ON WORKS IN MINECRAFT. It catches structural mistakes only;
 * see docs/TESTING.md for what has and has not been tested in-game.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, sep, posix } from "node:path";
import Ajv from "ajv";

const ROOT = new URL("..", import.meta.url).pathname;
const BP = join(ROOT, "packs/DREAD_BP");
const RP = join(ROOT, "packs/DREAD_RP");
const SCHEMA_DIR = join(ROOT, "node_modules/@minecraft/bedrock-schemas");

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);
const rel = (p) => relative(ROOT, p).split(sep).join("/");

// ---------- helpers -------------------------------------------------------------------------
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    err(rel(file), `invalid JSON: ${e.message}`);
    return undefined;
  }
}
function globToRegex(glob) {
  // Catalog globs look like "**/entities/**/*.json". Anchor directory-based ones at the pack root so
  // "loot_tables/entities/x.json" is not mistaken for an entity file; bare filenames may float.
  const body = glob.startsWith("**/") ? glob.slice(3) : glob;
  const anchored = body.includes("/");
  const re = body
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "(?:.*/)?")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*");
  return new RegExp((anchored ? "^" : "^(?:.*/)?") + re + "$");
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const isVersionArray = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => Number.isInteger(n) && n >= 0);
const sameVersion = (a, b) => a.every((n, i) => n === b[i]);

// ---------- 1. manifests --------------------------------------------------------------------
const bpManifestPath = join(BP, "manifest.json");
const rpManifestPath = join(RP, "manifest.json");
const bpM = readJson(bpManifestPath);
const rpM = readJson(rpManifestPath);
const allUuids = new Map();
function claimUuid(uuid, where) {
  if (!UUID_RE.test(uuid ?? "")) err(where, `"${uuid}" is not a valid v4 UUID`);
  else if (allUuids.has(uuid)) err(where, `UUID ${uuid} already used at ${allUuids.get(uuid)}`);
  else allUuids.set(uuid, where);
}

const STABLE_SERVER_MODULES = new Map([
  ["@minecraft/server", ["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0"]],
  ["@minecraft/server-ui", ["2.0.0", "2.1.0", "2.2.0"]],
]);

function checkManifest(m, pack, dir) {
  const f = rel(join(dir, "manifest.json"));
  if (!m) return;
  if (m.format_version !== 2) err(f, "format_version must be 2");
  const h = m.header ?? {};
  for (const k of ["name", "description", "uuid", "version", "min_engine_version"]) if (h[k] === undefined) err(f, `header.${k} missing`);
  if (h.uuid) claimUuid(h.uuid, `${f} header`);
  if (!isVersionArray(h.version)) err(f, "header.version must be [major, minor, patch]");
  if (!isVersionArray(h.min_engine_version)) err(f, "header.min_engine_version must be [major, minor, patch]");
  for (const [i, mod] of (m.modules ?? []).entries()) {
    claimUuid(mod.uuid, `${f} modules[${i}]`);
    if (!isVersionArray(mod.version) && typeof mod.version !== "string") err(f, `modules[${i}].version invalid`);
  }
  const types = (m.modules ?? []).map((x) => x.type);
  if (pack === "BP") {
    if (!types.includes("data")) err(f, 'behavior pack needs a "data" module');
    const script = (m.modules ?? []).find((x) => x.type === "script");
    if (script) {
      if (script.language !== "javascript") err(f, 'script module language must be "javascript"');
      if (!script.entry || !existsSync(join(dir, script.entry))) err(f, `script entry "${script.entry}" does not exist (run npm run build:scripts)`);
    }
  } else if (!types.includes("resources")) err(f, 'resource pack needs a "resources" module');
  for (const [i, d] of (m.dependencies ?? []).entries()) {
    if (d.module_name) {
      const allowed = STABLE_SERVER_MODULES.get(d.module_name);
      if (!allowed) err(f, `dependencies[${i}] uses non-allowlisted module ${d.module_name}`);
      else if (!allowed.includes(d.version)) err(f, `dependencies[${i}] ${d.module_name}@${d.version} is not a known STABLE version (beta/rc/unknown). Allowed: ${allowed.join(", ")}`);
    } else if (!UUID_RE.test(d.uuid ?? "") || !isVersionArray(d.version)) err(f, `dependencies[${i}] malformed`);
  }
  // lang resolution + icon
  const lang = join(dir, "texts/en_US.lang");
  if (!existsSync(lang)) err(f, "texts/en_US.lang missing");
  else {
    const text = readFileSync(lang, "utf8");
    for (const key of [h.name, h.description]) if (key && !new RegExp(`^${key.replace(/\./g, "\\.")}=`, "m").test(text)) err(rel(lang), `missing key ${key}`);
  }
  if (!existsSync(join(dir, "texts/languages.json"))) err(f, "texts/languages.json missing");
  const icon = join(dir, "pack_icon.png");
  if (!existsSync(icon)) err(f, "pack_icon.png missing");
  else {
    const b = readFileSync(icon);
    const w = b.readUInt32BE(16), hgt = b.readUInt32BE(20);
    if (w !== hgt) err(rel(icon), `must be square, got ${w}x${hgt}`);
  }
}
checkManifest(bpM, "BP", BP);
checkManifest(rpM, "RP", RP);

if (bpM && rpM) {
  const bpDep = (bpM.dependencies ?? []).find((d) => d.uuid === rpM.header?.uuid);
  const rpDep = (rpM.dependencies ?? []).find((d) => d.uuid === bpM.header?.uuid);
  if (!bpDep) err("manifests", "BP does not depend on RP");
  else if (!sameVersion(bpDep.version, rpM.header.version)) err("manifests", "BP->RP dependency version != RP header version");
  if (!rpDep) err("manifests", "RP does not depend on BP");
  else if (!sameVersion(rpDep.version, bpM.header.version)) err("manifests", "RP->BP dependency version != BP header version");
  if (!sameVersion(bpM.header.version, rpM.header.version)) err("manifests", "BP and RP header versions differ");
  // version coherence
  const pkg = readJson(join(ROOT, "package.json"));
  const constants = readFileSync(join(ROOT, "src/core/constants.ts"), "utf8");
  const tsVer = /ADDON_VERSION = "([^"]+)"/.exec(constants)?.[1];
  const manifestVer = bpM.header.version.join(".");
  if (pkg?.version !== manifestVer) err("version", `package.json ${pkg?.version} != manifest ${manifestVer}`);
  if (tsVer !== manifestVer) err("version", `constants.ts ${tsVer} != manifest ${manifestVer}`);
}

// ---------- 2. path hygiene (iOS/Android file systems are case-sensitive) --------------------
const bpFiles = walk(BP);
const rpFiles = walk(RP);
const SAFE_PATH = /^[a-z0-9_./\-]+$/;
for (const file of [...bpFiles, ...rpFiles]) {
  const r = rel(file).replace(/^packs\/DREAD_(BP|RP)\//, "");
  if (r === "pack_icon.png" || r === "manifest.json" || /^texts\/[a-z]{2}_[A-Z]{2}\.lang$/.test(r)) continue;
  if (!SAFE_PATH.test(r)) err(rel(file), "path must be lowercase a-z 0-9 _ - . / only (case/space issues break on iOS)");
}

// ---------- 3. script checks ----------------------------------------------------------------
const scriptDir = join(BP, "scripts");
if (existsSync(scriptDir)) {
  const declared = new Set((bpM?.dependencies ?? []).filter((d) => d.module_name).map((d) => d.module_name));
  for (const file of walk(scriptDir).filter((p) => p.endsWith(".js"))) {
    const code = readFileSync(file, "utf8");
    for (const m of code.matchAll(/(?:import|export)[^'"]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g)) {
      const spec = m[1] ?? m[2];
      if (spec.startsWith("@minecraft/")) {
        if (!declared.has(spec)) err(rel(file), `imports ${spec} but the BP manifest does not declare it`);
      } else if (!spec.startsWith(".")) err(rel(file), `imports "${spec}" which Bedrock cannot resolve`);
    }
    if (/\beval\s*\(|new Function\s*\(|\brequire\s*\(/.test(code)) err(rel(file), "uses eval/new Function/require, unsupported in Bedrock scripting");
    const src = walk(join(ROOT, "src")).filter((p) => p.endsWith(".ts") && !p.endsWith(".d.ts"));
    const newestSrc = Math.max(...src.map((p) => statSync(p).mtimeMs));
    if (statSync(file).mtimeMs + 1000 < newestSrc) warn(rel(file), "older than TypeScript sources; run npm run build:scripts");
  }
}

// ---------- 4. JSON + official schemas ------------------------------------------------------
const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });
// Mojang's schemas use relative file $refs ("./x.schema.json") that do not line up with their $ids,
// so rewrite each file ref to the target file's $id before handing the schemas to Ajv.
const schemaFiles = new Map(); // abs path -> schema object
for (const f of walk(join(SCHEMA_DIR, "schemas")).filter((p) => p.endsWith(".json") && !p.endsWith("/catalog.json"))) {
  try {
    schemaFiles.set(f, JSON.parse(readFileSync(f, "utf8")));
  } catch (e) {
    warn(rel(f), `schema load failed: ${e.message}`);
  }
}
let danglingRefs = 0;
function rewriteRefs(node, fromFile) {
  if (Array.isArray(node)) return node.forEach((n) => rewriteRefs(n, fromFile));
  if (!node || typeof node !== "object") return;
  if (typeof node.$ref === "string" && /\.json/.test(node.$ref) && !/^[a-z]+:/.test(node.$ref)) {
    const [path, frag] = node.$ref.split("#");
    let target = schemaFiles.get(join(fromFile, "..", path));
    // The published package references common/expression.schema.json, which it does not ship.
    if (!target && path.endsWith("common/expression.schema.json")) target = schemaFiles.get(join(SCHEMA_DIR, "schemas/common/molang_expression.schema.json"));
    if (target?.$id) node.$ref = target.$id + (frag ? "#" + frag : "");
    else {
      danglingRefs++;
      delete node.$ref; // permissive: accept anything rather than failing on a Mojang packaging bug
    }
  }
  for (const v of Object.values(node)) rewriteRefs(v, fromFile);
}
for (const [f, s] of schemaFiles) s.$id = "dread-schema:/" + relative(SCHEMA_DIR, f).split(sep).join("/");
for (const [f, s] of schemaFiles) rewriteRefs(s, f);
for (const s of schemaFiles.values()) {
  if (s.$id && !ajv.getSchema(s.$id)) {
    try { ajv.addSchema(s, s.$id); } catch (e) { warn("schemas", `${s.$id}: ${e.message.split("\n")[0]}`); }
  }
}
if (danglingRefs) warn("schemas", `${danglingRefs} dangling $ref(s) in @minecraft/bedrock-schemas treated as permissive`);
const catalog = JSON.parse(readFileSync(join(SCHEMA_DIR, "catalog.json"), "utf8"));
const catalogEntries = catalog.schemas.map((s) => ({
  name: s.name,
  res: s.fileMatch.map(globToRegex),
  file: join(SCHEMA_DIR, s.url),
}));
const validators = new Map();
function getValidator(entry) {
  if (validators.has(entry.file)) return validators.get(entry.file);
  let v;
  try {
    const s = schemaFiles.get(entry.file);
    v = (s.$id && ajv.getSchema(s.$id)) || ajv.compile(s);
  } catch (e) {
    warn(entry.name, `could not compile official schema (${e.message.split("\n")[0]}); skipping schema checks for this type`);
    v = null;
  }
  validators.set(entry.file, v);
  return v;
}

const geometryBones = new Map(); // geometry identifier -> Set(bone names)
function checkGeometry(r, json) {
  if (typeof json.format_version !== "string") err(r, "format_version missing");
  const geos = json["minecraft:geometry"];
  if (!Array.isArray(geos) || geos.length === 0) return err(r, 'missing "minecraft:geometry" array');
  const num3 = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));
  for (const g of geos) {
    const d = g.description ?? {};
    if (!d.identifier?.startsWith("geometry.")) err(r, `identifier "${d.identifier}" must start with "geometry."`);
    const { texture_width: tw, texture_height: th } = d;
    if (!Number.isInteger(tw) || !Number.isInteger(th)) err(r, "texture_width/height must be integers");
    const names = new Set();
    for (const b of g.bones ?? []) {
      if (names.has(b.name)) err(r, `${d.identifier}: duplicate bone ${b.name}`);
      names.add(b.name);
    }
    for (const b of g.bones ?? []) {
      if (!num3(b.pivot ?? [0, 0, 0])) err(r, `bone ${b.name}: pivot must be 3 numbers`);
      if (b.rotation && !num3(b.rotation)) err(r, `bone ${b.name}: rotation must be 3 numbers`);
      if (b.parent && !names.has(b.parent)) err(r, `bone ${b.name}: unknown parent ${b.parent}`);
      for (let hops = 0, p = b; p?.parent; hops++, p = g.bones.find((x) => x.name === p.parent)) if (hops > 64) { err(r, `bone ${b.name}: parent cycle`); break; }
      for (const [i, c] of (b.cubes ?? []).entries()) {
        const where = `bone ${b.name} cube ${i}`;
        if (!num3(c.origin) || !num3(c.size)) { err(r, `${where}: origin/size must be 3 numbers`); continue; }
        if (c.size.some((n) => n < 0)) err(r, `${where}: negative size`);
        const rects = c.uv && !Array.isArray(c.uv) ? Object.entries(c.uv).map(([f, u]) => [f, u.uv, u.uv_size]) : [["box", c.uv, null]];
        for (const [f, uv, size] of rects) {
          if (!Array.isArray(uv)) { err(r, `${where}: missing uv`); continue; }
          const [u, v] = uv, [w, h] = size ?? [0, 0];
          if (u < 0 || v < 0 || u + w > tw || v + h > th) err(r, `${where} ${f}: UV rect outside ${tw}x${th} texture`);
        }
      }
    }
    if (d.identifier) geometryBones.set(d.identifier, names);
  }
}

// Mojang's published schemas have a few wrong types; these exact errors are waived and re-checked by hand where noted.
const KNOWN_SCHEMA_BUGS = [
  { type: "Fog", path: "/minecraft:fog_settings/description/identifier", message: "must be boolean" },
  // Vanilla item_texture.json uses plain strings for single textures; the schema only allows arrays.
  { type: "Item Texture", path: /^\/texture_data\/[^/]+\/textures$/, message: "must be array" },
  // Vanilla render controllers write part_visibility as an array of {bone: condition} objects.
  { type: "Render Controller", path: /^\/render_controllers\/[^/]+\/part_visibility$/, message: "must be object" },
];
const fogIds = new Set();
const recipeChecks = [];
function checkRecipe(r, json) {
  const kind = Object.keys(json).find((k) => k.startsWith("minecraft:recipe_"));
  if (!kind) return err(r, "no minecraft:recipe_* body");
  const body = json[kind];
  if (!/^[a-z0-9_]+:[a-z0-9_]+$/.test(body.description?.identifier ?? "")) err(r, "description.identifier must be namespaced");
  if (!Array.isArray(body.tags) || body.tags.length === 0) err(r, "tags must list at least one crafting station");
  const items = [];
  if (kind === "minecraft:recipe_shapeless") {
    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0 || body.ingredients.length > 9) err(r, "shapeless needs 1-9 ingredients");
    for (const i of body.ingredients ?? []) items.push(i.item ?? i);
  } else if (kind === "minecraft:recipe_shaped") {
    const pat = body.pattern ?? [];
    const keys = new Set(pat.join("").replace(/ /g, ""));
    for (const k of keys) if (!body.key?.[k]) err(r, `pattern symbol "${k}" missing from key`);
    for (const v of Object.values(body.key ?? {})) items.push(v.item ?? v);
  } else warn(r, `${kind} is not structurally checked`);
  const res = body.result;
  items.push(res?.item ?? res);
  recipeChecks.push([r, items]);
}
const parsed = new Map(); // rel path -> json
let schemaChecked = 0;
for (const file of [...bpFiles, ...rpFiles].filter((p) => p.endsWith(".json"))) {
  const r = rel(file);
  const json = readJson(file);
  if (json === undefined) continue;
  parsed.set(r, json);
  if (r.endsWith("manifest.json")) continue;
  if (r.endsWith("texts/languages.json")) {
    // Mojang's bundled schema models this array as an object (schema bug), so check it directly.
    if (!Array.isArray(json) || !json.every((x) => typeof x === "string")) err(r, "must be an array of locale strings");
    continue;
  }
  const inPack = r.replace(/^packs\/DREAD_(BP|RP)\//, "");
  const entry = catalogEntries.find((e) => e.res.some((re) => re.test(inPack)));
  if (!entry) continue;
  if (entry.name === "Recipe" && !json["minecraft:recipe_brewing_mix"]) {
    // The published package only ships the brewing schema; check crafting recipes structurally.
    checkRecipe(r, json);
    schemaChecked++;
    continue;
  }
  if (entry.name === "Model Geometry") {
    // Mojang's published geometry schema types numeric arrays as strings (unusable), so check structure directly.
    checkGeometry(r, json);
    schemaChecked++;
    continue;
  }
  const validate = getValidator(entry);
  if (!validate) continue;
  schemaChecked++;
  if (!validate(json)) {
    const real = validate.errors.filter((e) => !KNOWN_SCHEMA_BUGS.some((b) => b.type === entry.name && (b.path instanceof RegExp ? b.path.test(e.instancePath) : b.path === e.instancePath) && b.message === e.message));
    for (const e of real.slice(0, 5)) err(r, `schema (${entry.name}) ${e.instancePath || "/"} ${e.message}`);
    if (real.length > 5) err(r, `...and ${real.length - 5} more schema errors`);
  }
  if (entry.name === "Fog") {
    const id = json["minecraft:fog_settings"]?.description?.identifier;
    if (typeof id !== "string" || !id.includes(":")) err(r, "fog identifier must be a namespaced string");
    else fogIds.add(id);
  }
}

// ---------- 5. cross references ------------------------------------------------------------
const inRP = (p) => parsed.get(`packs/DREAD_RP/${p}`);
const jsonIn = (pack, dirPrefix) =>
  [...parsed.entries()].filter(([k]) => k.startsWith(`packs/DREAD_${pack}/${dirPrefix}`)).map(([k, v]) => [k, v]);

const geometries = new Set();
for (const [k, j] of jsonIn("RP", "models/")) for (const g of j["minecraft:geometry"] ?? []) if (g.description?.identifier) geometries.add(g.description.identifier);
const animations = new Set();
for (const [k, j] of jsonIn("RP", "animations/")) for (const a of Object.keys(j.animations ?? {})) animations.add(a);
const animControllers = new Set();
for (const [k, j] of jsonIn("RP", "animation_controllers/")) for (const a of Object.keys(j.animation_controllers ?? {})) animControllers.add(a);
const renderControllers = new Set();
for (const [k, j] of jsonIn("RP", "render_controllers/")) for (const a of Object.keys(j.render_controllers ?? {})) renderControllers.add(a);
const particles = new Set();
for (const [k, j] of jsonIn("RP", "particles/")) if (j.particle_effect?.description?.identifier) particles.add(j.particle_effect.description.identifier);

const soundDefs = inRP("sounds/sound_definitions.json");
const definedSoundEvents = new Set(Object.keys(soundDefs?.sound_definitions ?? {}));

const rpFileSet = new Set(rpFiles.map((p) => rel(p).replace("packs/DREAD_RP/", "")));
const textureExists = (base) => [".png", ".tga"].some((e) => rpFileSet.has(base + e));
const refCheck = (file, kind, id, set) => {
  if (!set.has(id)) err(file, `${kind} "${id}" is referenced but not defined`);
};

const clientEntityIds = new Set();
for (const [k, j] of jsonIn("RP", "entity/")) {
  const d = j["minecraft:client_entity"]?.description;
  if (!d) continue;
  clientEntityIds.add(d.identifier);
  for (const g of Object.values(d.geometry ?? {})) refCheck(k, "geometry", g, geometries);
  for (const t of Object.values(d.textures ?? {})) if (!textureExists(t)) err(k, `texture "${t}" has no .png/.tga in the RP`);
  for (const a of Object.values(d.animations ?? {})) refCheck(k, "animation", a, new Set([...animations, ...animControllers]));
  const bonesOfEntity = new Set(Object.values(d.geometry ?? {}).flatMap((g) => [...(geometryBones.get(g) ?? [])]));
  for (const a of Object.values(d.animations ?? {})) {
    for (const [, aj] of jsonIn("RP", "animations/")) {
      for (const b of Object.keys(aj.animations?.[a]?.bones ?? {})) {
        if (bonesOfEntity.size && !bonesOfEntity.has(b)) err(k, `animation ${a} animates bone "${b}" which the geometry does not have`);
      }
    }
  }
  // animation controllers reference short names that must exist in this entity's animation map
  for (const [ck, cj] of jsonIn("RP", "animation_controllers/")) {
    for (const [cid, c] of Object.entries(cj.animation_controllers ?? {})) {
      if (!Object.values(d.animations ?? {}).includes(cid)) continue;
      for (const [sn, st] of Object.entries(c.states ?? {})) {
        for (const an of st.animations ?? []) {
          const name = typeof an === "string" ? an : Object.keys(an)[0];
          if (!(name in (d.animations ?? {}))) err(ck, `${cid}/${sn}: animation "${name}" is not in ${d.identifier}'s animations map`);
        }
        for (const t of st.transitions ?? []) {
          const target = Object.keys(t)[0];
          if (!(target in (c.states ?? {}))) err(ck, `${cid}/${sn}: transition to unknown state "${target}"`);
        }
      }
    }
  }
  for (const sn of (d.scripts?.animate ?? []).map((x) => (typeof x === "string" ? x : Object.keys(x)[0]))) if (!(sn in (d.animations ?? {}))) err(k, `scripts.animate uses "${sn}" which is not in the animations map`);
  for (const [, aj] of jsonIn("RP", "animations/")) {
    for (const [aid, anim] of Object.entries(aj.animations ?? {})) {
      if (!Object.values(d.animations ?? {}).includes(aid)) continue;
      for (const tl of Object.values(anim.sound_effects ?? {})) for (const e of Array.isArray(tl) ? tl : [tl]) {
        if (e.effect && !(e.effect in (d.sound_effects ?? {}))) err(k, `${aid} plays sound effect "${e.effect}" not in the entity's sound_effects map`);
      }
    }
  }
  for (const rc of d.render_controllers ?? []) {
    const rcId = typeof rc === "string" ? rc : Object.keys(rc)[0];
    refCheck(k, "render controller", rcId, renderControllers);
    // part_visibility bones must exist in this entity's geometry
    const bones = new Set(Object.values(d.geometry ?? {}).flatMap((g) => [...(geometryBones.get(g) ?? [])]));
    for (const [, rj] of jsonIn("RP", "render_controllers/")) {
      for (const pv of rj.render_controllers?.[rcId]?.part_visibility ?? []) for (const bone of Object.keys(pv)) {
        if (bone !== "*" && bones.size && !bones.has(bone)) err(k, `render controller ${rcId} toggles bone "${bone}" which the geometry does not have`);
      }
    }
  }
  for (const s of Object.values(d.sound_effects ?? {})) refCheck(k, "sound event", s, definedSoundEvents);
  for (const p of Object.values(d.particle_effects ?? {})) refCheck(k, "particle", p, particles);
}
const bpEntityIds = new Set();
for (const [k, j] of jsonIn("BP", "entities/")) {
  const id = j["minecraft:entity"]?.description?.identifier;
  if (!id) continue;
  if (bpEntityIds.has(id)) err(k, `duplicate entity identifier ${id}`);
  bpEntityIds.add(id);
  if (!id.startsWith("dread:")) err(k, `entity identifier ${id} must use the dread: namespace`);
  if (!clientEntityIds.has(id)) warn(k, `no client entity definition for ${id} (will render as a missing-model entity)`);
}
for (const id of clientEntityIds) if (!bpEntityIds.has(id)) warn("entity", `client entity ${id} has no behavior definition`);

// sound events (RP/sounds.json) and files
const soundsJson = inRP("sounds.json");
for (const [section, body] of Object.entries(soundsJson ?? {})) {
  if (section === "format_version" || typeof body !== "object") continue;
  for (const [ev, data] of Object.entries(body.events ?? body ?? {})) {
    const def = data?.sound;
    if (def && !definedSoundEvents.has(def)) err("sounds/sounds.json", `event ${ev} -> undefined definition ${def}`);
  }
}
for (const [name, def] of Object.entries(soundDefs?.sound_definitions ?? {})) {
  for (const s of def.sounds ?? []) {
    const n = typeof s === "string" ? s : s.name;
    if (!n.startsWith("sounds/")) err("sound_definitions.json", `${name}: "${n}" must be a path under sounds/`);
    const base = n;
    const found = [".ogg", ".wav", ".fsb"].find((e) => rpFileSet.has(base + e));
    if (!found) err("sound_definitions.json", `${name}: no audio file for "${n}" (missing asset)`);
    else if (found !== ".ogg") warn("sound_definitions.json", `${name}: "${n}" is ${found}; project standard is .ogg`);
  }
}

// recipes must only use vanilla items or items this pack defines
{
  const ownItems = new Set();
  for (const [, j] of jsonIn("BP", "items/")) if (j["minecraft:item"]?.description?.identifier) ownItems.add(j["minecraft:item"].description.identifier);
  for (const [r, items] of recipeChecks) for (const it of items) {
    if (typeof it !== "string") { err(r, "ingredient/result item must be a string id"); continue; }
    if (!it.startsWith("minecraft:") && !ownItems.has(it)) err(r, `unknown item ${it}`);
  }
}

// item icons resolve through item_texture.json to real files; names are localised
{
  const itemTex = inRP("textures/item_texture.json")?.texture_data ?? {};
  const rpLang = existsSync(join(RP, "texts/en_US.lang")) ? readFileSync(join(RP, "texts/en_US.lang"), "utf8") : "";
  const hasLang = (k) => new RegExp(`^${k.replace(/[.:]/g, (c) => "\\" + c)}=`, "m").test(rpLang);
  for (const [k, j] of jsonIn("BP", "items/")) {
    const comps = j["minecraft:item"]?.components ?? {};
    const icon = comps["minecraft:icon"];
    const short = typeof icon === "string" ? icon : icon?.textures?.default ?? icon?.texture;
    if (!short) err(k, "item has no minecraft:icon");
    else if (!itemTex[short]) err(k, `icon "${short}" is not in textures/item_texture.json`);
    else {
      const t = itemTex[short].textures;
      for (const path of Array.isArray(t) ? t : [t]) if (!textureExists(path)) err("item_texture.json", `${short} -> ${path} has no .png/.tga`);
    }
    const dn = comps["minecraft:display_name"]?.value;
    if (dn && !hasLang(dn)) err(k, `display name key ${dn} missing from RP en_US.lang`);
  }
  for (const id of bpEntityIds) if (!hasLang(`entity.${id}.name`)) err("texts/en_US.lang", `missing entity.${id}.name`);
}

// ---------- 5b. identifiers used by scripts must exist in the packs --------------------------
{
  const mainJs = join(BP, "scripts/main.js");
  if (existsSync(mainJs)) {
    const code = readFileSync(mainJs, "utf8");
    const bpEvents = new Set();
    const props = new Set();
    for (const [, j] of jsonIn("BP", "entities/")) {
      for (const e of Object.keys(j["minecraft:entity"]?.events ?? {})) bpEvents.add(e);
      for (const pr of Object.keys(j["minecraft:entity"]?.description?.properties ?? {})) props.add(pr);
    }
    const ownItems = new Set();
    for (const [, j] of jsonIn("BP", "items/")) if (j["minecraft:item"]?.description?.identifier) ownItems.add(j["minecraft:item"].description.identifier);
    // dynamic-property storage keys are declared in source as `const SOMETHING_KEY = "dread:..."`
    const storageKeys = new Set();
    for (const f of walk(join(ROOT, "src")).filter((x) => x.endsWith(".ts"))) {
      for (const m of readFileSync(f, "utf8").matchAll(/const [A-Z_]+_KEY = "(dread:[a-z_]+)"/g)) storageKeys.add(m[1]);
    }
    const known = new Set([...bpEvents, ...props, ...fogIds, ...particles, ...bpEntityIds, ...ownItems, ...storageKeys]);
    for (const m of new Set(code.match(/"dread:[a-z_]+"/g) ?? [])) {
      const id = m.slice(1, -1);
      if (!known.has(id)) err("scripts/main.js", `references ${id}, which no pack file defines (entity event, property, fog, particle or entity)`);
    }
    for (const m of new Set(code.match(/"dread\.(?:lurker|ambient)\.[a-z_]+"/g) ?? [])) {
      const id = m.slice(1, -1);
      if (!definedSoundEvents.has(id)) err("scripts/main.js", `plays sound event ${id}, which is not in sound_definitions.json`);
    }
    // template-built sound ids: every dread.lurker.* / dread.ambient.* defined event should be reachable by name in the source
    const viaEntities = new Set();
    for (const [, j] of jsonIn("RP", "entity/")) for (const v of Object.values(j["minecraft:client_entity"]?.description?.sound_effects ?? {})) viaEntities.add(v);
    for (const ev of definedSoundEvents) {
      const tail = ev.split(".").pop();
      if (!code.includes(tail) && !viaEntities.has(ev)) warn("sound_definitions.json", `${ev} is defined but its name never appears in the scripts (unused asset?)`);
    }
  }
}

// ---------- 6. asset checks -----------------------------------------------------------------
let totalBytes = 0;
function oggInfo(buf) {
  if (buf.toString("latin1", 0, 4) !== "OggS") return null;
  const segs = buf[26];
  const p = 27 + segs;
  if (buf[p] !== 1 || buf.toString("latin1", p + 1, p + 7) !== "vorbis") return null;
  return { channels: buf[p + 11], rate: buf.readUInt32LE(p + 12) };
}
for (const file of [...bpFiles, ...rpFiles]) {
  const size = statSync(file).size;
  totalBytes += size;
  const ext = extname(file);
  const r = rel(file);
  if (ext === ".png" && !r.endsWith("pack_icon.png")) {
    const b = readFileSync(file);
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    const pow2 = (n) => (n & (n - 1)) === 0;
    if (w > 256 || h > 256) warn(r, `${w}x${h} exceeds the 256px mobile budget unless it is an atlas/skin sheet`);
    if (r.includes("/textures/entity/") && (!pow2(w) || !pow2(h))) warn(r, `${w}x${h} is not power-of-two`);
  }
  if (ext === ".ogg") {
    const info = oggInfo(readFileSync(file));
    if (!info) err(r, "not a valid Ogg Vorbis file");
    else {
      if (info.channels > 1 && r.includes("/sounds/entity/")) warn(r, `${info.channels}-channel; positional (3D) sounds should be mono`);
      if (size > 1_500_000) warn(r, `${(size / 1e6).toFixed(1)}MB; consider shortening or lowering bitrate for mobile`);
    }
  }
}
if (totalBytes > 100e6) err("size", `packs total ${(totalBytes / 1e6).toFixed(1)}MB (> 100MB budget)`);
else if (totalBytes > 50e6) warn("size", `packs total ${(totalBytes / 1e6).toFixed(1)}MB (> 50MB soft budget)`);

// ---------- report --------------------------------------------------------------------------
console.log(`DREAD validation: ${bpFiles.length} BP files, ${rpFiles.length} RP files, ${(totalBytes / 1024).toFixed(0)} KB, ${schemaChecked} JSON files schema-checked`);
for (const w of warnings) console.log(`  WARN  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
if (errors.length) {
  console.log(`FAILED with ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
console.log(`OK with ${warnings.length} warning(s). (Static checks only: this is not an in-game test.)`);
