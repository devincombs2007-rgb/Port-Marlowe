// ../../scripts_src/main.ts
import { Player as Player18, system as system6, world as world17 } from "@minecraft/server";

// ../../scripts_src/core/config.ts
import { PlayerPermissionLevel } from "@minecraft/server";

// ../../scripts_src/core/ids.ts
var ENT = {
  watcher: "hollow:watcher",
  borrowed: "hollow:borrowed",
  hollowed: "hollow:hollowed",
  knocker: "hollow:knocker",
  mirebound: "hollow:mirebound",
  heart: "hollow:heart_below",
  vein: "hollow:heart_vein",
  rootSpike: "hollow:root_spike",
  lure: "hollow:lure"
};
var ITEM = {
  journal: "hollow:field_journal",
  page: "hollow:torn_page",
  paleResin: "hollow:pale_resin",
  borrowedHide: "hollow:borrowed_hide",
  hollowFang: "hollow:hollow_fang",
  knockerNail: "hollow:knocker_nail",
  mirePearl: "hollow:mire_pearl",
  lens: "hollow:hollow_lens",
  heartseeker: "hollow:heartseeker",
  offering: "hollow:offering_of_silence",
  stilledHeart: "hollow:stilled_heart",
  chime: "hollow:hollow_chime",
  ward: "hollow:rowan_ward",
  lantern: "hollow:heartwood_lantern"
};
var BLOCK = {
  chime: "hollow:hollow_chime",
  ward: "hollow:rowan_ward",
  lantern: "hollow:heartwood_lantern",
  altar: "hollow:heart_altar",
  roots: "hollow:hollow_roots"
};
var FAMILY = {
  any: "hollow",
  creature: "hollow_creature",
  temp: "hollow_temp"
};
var PROP = {
  state: "hollow:state",
  revealed: "hollow:revealed",
  phase: "hollow:phase",
  shielded: "hollow:shielded",
  variant: "hollow:variant"
};
var SND = {
  watcherSeen: "hollow.watcher.seen",
  watcherRetreat: "hollow.watcher.retreat",
  watcherLunge: "hollow.watcher.lunge",
  windGust: "hollow.amb.forest.wind",
  farCall: "hollow.amb.forest.far_call",
  branchSnap: "hollow.amb.forest.branch_snap",
  farSteps: "hollow.amb.forest.footsteps",
  hush: "hollow.amb.forest.hush",
  caveDrip: "hollow.amb.cave.drip",
  caveShift: "hollow.amb.cave.shift",
  caveBreath: "hollow.amb.cave.breath",
  swampGurgle: "hollow.amb.swamp.gurgle",
  swampCreak: "hollow.amb.swamp.creak",
  bedtimeKnock: "hollow.amb.bedtime_knock",
  stingerLow: "hollow.stinger.low",
  musicNight: ["hollow.music.night_1", "hollow.music.night_2", "hollow.music.night_3"],
  musicCave: "hollow.music.cave",
  musicShrine: "hollow.music.shrine",
  musicBoss: "hollow.music.boss",
  musicDawn: "hollow.music.dawn",
  stingerDistant: "hollow.stinger.distant",
  journalOpen: "hollow.journal.open",
  journalEntry: "hollow.journal.entry",
  chime: "hollow.chime.ring",
  wardRepel: "hollow.ward.repel",
  wardPlace: "hollow.ward.place",
  wardSpent: "hollow.ward.spent",
  lens: "hollow.lens.use",
  heartseeker: "hollow.heartseeker.pulse",
  altar: "hollow.altar.insert",
  borrowedReveal: "hollow.borrowed.reveal",
  borrowedWrong: "hollow.borrowed.baa_wrong",
  hollowedClick: "hollow.hollowed.click",
  hollowedAlert: "hollow.hollowed.alert",
  hollowedSniff: "hollow.hollowed.sniff",
  knock: "hollow.knocker.knock",
  scratch: "hollow.knocker.scratch",
  knockerBreath: "hollow.knocker.breath",
  knockerLeave: "hollow.knocker.leave",
  knockerLunge: "hollow.knocker.lunge",
  mireBubble: "hollow.mirebound.bubble",
  mireGurgle: "hollow.mirebound.gurgle",
  mireErupt: "hollow.mirebound.erupt",
  mireGrab: "hollow.mirebound.grab",
  mireRelease: "hollow.mirebound.release",
  heartBeat: "hollow.heart.beat",
  heartBeatFast: "hollow.heart.beat_fast",
  heartAwaken: "hollow.heart.awaken",
  heartDrone: "hollow.heart.drone",
  heartRootWarn: "hollow.heart.root_warn",
  heartRootStrike: "hollow.heart.root_strike",
  heartPulse: "hollow.heart.pulse",
  heartPhase: "hollow.heart.phase",
  heartVeinBreak: "hollow.heart.vein_break",
  heartSpawn: "hollow.heart.spawn",
  heartDeath: "hollow.heart.death"
};
var PARTICLE = {
  shed: "hollow:watcher_shed",
  resinGlint: "hollow:resin_glint",
  wardGlow: "hollow:ward_glow",
  chimeRing: "hollow:chime_ring",
  bubbles: "hollow:mire_bubbles",
  spores: "hollow:heart_spores",
  rootWarn: "hollow:root_warning",
  pulseRing: "hollow:pulse_ring",
  lensReveal: "hollow:lens_reveal",
  tracks: "hollow:pale_tracks",
  veinMote: "hollow:vein_mote"
};
var FOG = {
  watched: "hollow:fog_watched",
  heart: "hollow:fog_heart",
  mire: "hollow:fog_mire"
};
var DP = {
  // world
  settings: "hollow:settings",
  startDay: "hollow:start_day",
  sites: "hollow:sites",
  chimes: "hollow:chimes",
  wards: "hollow:wards",
  boss: "hollow:boss",
  knocker: "hollow:knocker",
  version: "hollow:data_version",
  // player
  journal: "hollow:journal",
  prefs: "hollow:prefs",
  stats: "hollow:stats",
  firstJoin: "hollow:first_join",
  playTicks: "hollow:play_ticks",
  daily: "hollow:daily",
  // entity
  owner: "hollow:owner",
  fight: "hollow:fight",
  born: "hollow:born"
};

// ../../scripts_src/core/store.ts
import { world } from "@minecraft/server";
function readWorld(key, fallback) {
  try {
    const raw = world.getDynamicProperty(key);
    if (typeof raw !== "string" || raw.length === 0) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}
function readWorldArray(key) {
  try {
    const raw = world.getDynamicProperty(key);
    if (typeof raw !== "string" || raw.length === 0) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeWorld(key, value) {
  try {
    world.setDynamicProperty(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[hollow] failed to save ${key}: ${e}`);
  }
}
function readEntity(entity, key, fallback) {
  try {
    const raw = entity.getDynamicProperty(key);
    if (typeof raw !== "string" || raw.length === 0) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}
function writeEntity(entity, key, value) {
  try {
    if (entity.isValid) entity.setDynamicProperty(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[hollow] failed to save ${key} on ${entity.typeId}: ${e}`);
  }
}
function getNum(entity, key, fallback = 0) {
  if (!entity) {
    const v = world.getDynamicProperty(key);
    return typeof v === "number" ? v : fallback;
  }
  try {
    const v = entity.getDynamicProperty(key);
    return typeof v === "number" ? v : fallback;
  } catch {
    return fallback;
  }
}
function setNum(entity, key, value) {
  try {
    if (!entity) world.setDynamicProperty(key, value);
    else if (entity.isValid) entity.setDynamicProperty(key, value);
  } catch {
  }
}

// ../../scripts_src/core/config.ts
var WORLD_DEFAULTS = {
  intensity: 1,
  frequency: 100,
  graceDays: 1,
  knockerNight: 4,
  watcher: true,
  borrowed: true,
  hollowed: true,
  knocker: true,
  mirebound: true,
  destructive: false,
  sleepDisturbance: true,
  sites: true,
  bossScaling: true
};
var PREF_DEFAULTS = { ambience: 80, accents: 1, visualFx: true, hints: true, music: true };
var worldCache;
var prefCache = /* @__PURE__ */ new Map();
function settings() {
  if (!worldCache) {
    worldCache = sanitizeWorld(readWorld(DP.settings, WORLD_DEFAULTS));
  }
  return worldCache;
}
function saveSettings(s) {
  worldCache = sanitizeWorld(s);
  writeWorld(DP.settings, worldCache);
}
function sanitizeWorld(s) {
  const out = { ...WORLD_DEFAULTS, ...s };
  out.intensity = Math.max(0, Math.min(2, Math.round(out.intensity)));
  out.frequency = Math.max(25, Math.min(200, Math.round(out.frequency)));
  out.graceDays = Math.max(0, Math.min(10, Math.round(out.graceDays)));
  out.knockerNight = Math.max(1, Math.min(20, Math.round(out.knockerNight)));
  return out;
}
function prefs(player) {
  let p = prefCache.get(player.id);
  if (!p) {
    p = { ...PREF_DEFAULTS, ...readEntity(player, DP.prefs, PREF_DEFAULTS) };
    prefCache.set(player.id, p);
  }
  return p;
}
function savePrefs(player, p) {
  const clean = {
    ambience: Math.max(0, Math.min(100, Math.round(p.ambience))),
    accents: Math.max(0, Math.min(2, Math.round(p.accents))),
    visualFx: !!p.visualFx,
    hints: !!p.hints,
    music: p.music !== false
  };
  prefCache.set(player.id, clean);
  writeEntity(player, DP.prefs, clean);
}
function forgetPrefs(playerId) {
  prefCache.delete(playerId);
}
function isOperator(player) {
  try {
    return player.playerPermissionLevel >= PlayerPermissionLevel.Operator;
  } catch {
    return false;
  }
}
function chanceScale() {
  const s = settings();
  const byIntensity = [0.55, 1, 1.5][s.intensity];
  return byIntensity * (s.frequency / 100);
}
function cooldownScale() {
  const s = settings();
  const byIntensity = [1.6, 1, 0.7][s.intensity];
  return byIntensity / Math.max(0.25, s.frequency / 100);
}

// ../../scripts_src/core/time.ts
import { system, world as world2 } from "@minecraft/server";
var tod = () => world2.getTimeOfDay();
var isNight = () => {
  const t = tod();
  return t >= 13e3 && t < 23200;
};
var isDarkHours = () => {
  const t = tod();
  return t >= 12400 && t < 23400;
};
var isDay = () => !isDarkHours();
var now = () => system.currentTick;
function hollowDay() {
  let start = world2.getDynamicProperty(DP.startDay);
  if (typeof start !== "number") {
    start = world2.getDay();
    world2.setDynamicProperty(DP.startDay, start);
  }
  return Math.max(0, world2.getDay() - start);
}
function hollowNight() {
  return hollowDay() + (tod() >= 12e3 ? 1 : 0);
}
function nightKey() {
  return world2.getDay() * 2 + (tod() >= 12e3 ? 1 : 0);
}
var seconds = (s) => Math.round(s * 20);

// ../../scripts_src/core/audio.ts
var state = /* @__PURE__ */ new Map();
function st(p) {
  let s = state.get(p.id);
  if (!s) {
    s = { lastAmbient: -9999, lastAccent: -9999, lastCue: /* @__PURE__ */ new Map() };
    state.set(p.id, s);
  }
  return s;
}
function forgetAudio(playerId) {
  state.delete(playerId);
}
function ambient(p, sound, opts = {}) {
  const pr = prefs(p);
  if (pr.ambience <= 0) return false;
  const s = st(p);
  const t = now();
  if (t - s.lastAmbient < (opts.minGap ?? 180)) return false;
  const last = s.lastCue.get(sound) ?? -99999;
  if (t - last < (opts.cueGap ?? 600)) return false;
  s.lastAmbient = t;
  s.lastCue.set(sound, t);
  try {
    p.playSound(sound, { location: opts.at, volume: (opts.volume ?? 1) * (pr.ambience / 100), pitch: opts.pitch ?? 1 });
  } catch {
    return false;
  }
  return true;
}
function accent(p, sound, strength = 1, force = false) {
  const pr = prefs(p);
  if (pr.accents < strength) return false;
  const s = st(p);
  const t = now();
  if (!force && t - s.lastAccent < 900) return false;
  s.lastAccent = t;
  try {
    p.playSound(sound, { volume: pr.accents === 1 ? 0.6 : 0.9 });
  } catch {
    return false;
  }
  return true;
}
function ui(p, sound, volume = 1, pitch = 1) {
  try {
    p.playSound(sound, { volume, pitch });
  } catch {
  }
}
function worldSound(dim, sound, at, volume = 1, pitch = 1) {
  try {
    dim.playSound(sound, at, { volume, pitch });
  } catch {
  }
}

// ../../scripts_src/core/fx.ts
import { MolangVariableMap } from "@minecraft/server";
var FOG_TAGS = ["hollow_watch", "hollow_heart", "hollow_mire"];
function pushFog(p, fogId, tag) {
  if (!prefs(p).visualFx) return;
  try {
    p.fogSettings.remove(tag);
    p.fogSettings.push(fogId, tag);
  } catch {
  }
}
function popFog(p, tag) {
  try {
    p.fogSettings.remove(tag);
  } catch {
  }
}
function clearAllFog(p) {
  for (const t of FOG_TAGS) popFog(p, t);
}
function particle(dim, id, at, vars) {
  try {
    if (vars) {
      const m = new MolangVariableMap();
      for (const k of Object.keys(vars)) m.setFloat(k, vars[k]);
      dim.spawnParticle(id, at, m);
    } else {
      dim.spawnParticle(id, at);
    }
  } catch {
  }
}
function hint(p, text) {
  if (!prefs(p).hints) return;
  try {
    p.onScreenDisplay.setActionBar(text);
  } catch {
  }
}
function notice(p, text) {
  try {
    p.onScreenDisplay.setActionBar(text);
  } catch {
  }
}

// ../../scripts_src/core/log.ts
import { world as world3 } from "@minecraft/server";
var enabled;
function debugEnabled() {
  if (enabled === void 0) enabled = world3.getDynamicProperty("hollow:debug") === true;
  return enabled;
}
function setDebug(on) {
  enabled = on;
  world3.setDynamicProperty("hollow:debug", on);
}
function debug(msg) {
  if (!debugEnabled()) return;
  console.warn(`[hollow] ${msg}`);
  for (const p of world3.getAllPlayers()) {
    if (p.hasTag("hollow_debug")) p.sendMessage(`§8[hollow] ${msg}`);
  }
}

// ../../scripts_src/core/players.ts
import { Difficulty, GameMode, world as world4 } from "@minecraft/server";

// ../../scripts_src/core/world.ts
import { BlockVolume, EquipmentSlot } from "@minecraft/server";

// ../../scripts_src/core/math.ts
var add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
var sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
var scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
var dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
var len = (a) => Math.sqrt(dot(a, a));
var dist = (a, b) => len(sub(a, b));
var distSq = (a, b) => {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
};
var distXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
var norm = (a) => {
  const l = len(a);
  return l > 1e-6 ? scale(a, 1 / l) : { x: 0, y: 0, z: 0 };
};
var clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
function angleTo(view, from, to) {
  const d = norm(sub(to, from));
  const c = clamp(dot(norm(view), d), -1, 1);
  return Math.acos(c) * 180 / Math.PI;
}
function yawDir(yawDeg) {
  const r = yawDeg * Math.PI / 180;
  return { x: -Math.sin(r), y: 0, z: Math.cos(r) };
}
function yawOf(dir) {
  return Math.atan2(-dir.x, dir.z) * 180 / Math.PI;
}
function rotateXZ(dir, deg) {
  const r = deg * Math.PI / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return { x: dir.x * c - dir.z * s, y: dir.y, z: dir.x * s + dir.z * c };
}
var rand = (lo, hi) => lo + Math.random() * (hi - lo);
var randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
var chance = (p) => Math.random() < p;
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function compass(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const ang = Math.atan2(dx, -dz) * 180 / Math.PI;
  const names = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  return names[(Math.round(ang / 45) % 8 + 8) % 8];
}

// ../../scripts_src/core/world.ts
var DOORS = [
  "minecraft:wooden_door",
  "minecraft:spruce_door",
  "minecraft:birch_door",
  "minecraft:jungle_door",
  "minecraft:acacia_door",
  "minecraft:dark_oak_door",
  "minecraft:mangrove_door",
  "minecraft:cherry_door",
  "minecraft:bamboo_door",
  "minecraft:pale_oak_door",
  "minecraft:poplar_door",
  "minecraft:crimson_door",
  "minecraft:warped_door",
  "minecraft:iron_door",
  "minecraft:copper_door",
  "minecraft:exposed_copper_door",
  "minecraft:weathered_copper_door",
  "minecraft:oxidized_copper_door",
  "minecraft:waxed_copper_door",
  "minecraft:waxed_exposed_copper_door",
  "minecraft:waxed_weathered_copper_door",
  "minecraft:waxed_oxidized_copper_door"
];
var WOODEN_DOORS = DOORS.filter((d) => !d.includes("iron") && !d.includes("copper"));
var LIGHT_BLOCKS = [
  "minecraft:torch",
  "minecraft:soul_torch",
  "minecraft:copper_torch",
  "minecraft:lantern",
  "minecraft:soul_lantern",
  "minecraft:copper_lantern",
  "minecraft:exposed_copper_lantern",
  "minecraft:weathered_copper_lantern",
  "minecraft:oxidized_copper_lantern",
  "minecraft:waxed_copper_lantern",
  "minecraft:waxed_exposed_copper_lantern",
  "minecraft:waxed_weathered_copper_lantern",
  "minecraft:waxed_oxidized_copper_lantern",
  "minecraft:campfire",
  "minecraft:soul_campfire",
  "minecraft:glowstone",
  "minecraft:sea_lantern",
  "minecraft:shroomlight",
  "minecraft:ochre_froglight",
  "minecraft:verdant_froglight",
  "minecraft:pearlescent_froglight",
  "minecraft:lit_pumpkin",
  "minecraft:lit_redstone_lamp",
  "minecraft:end_rod",
  "minecraft:beacon",
  "minecraft:lit_furnace",
  "minecraft:lit_smoker",
  "minecraft:lit_blast_furnace",
  BLOCK.lantern
];
var LIGHT_ITEMS = /* @__PURE__ */ new Set([
  "minecraft:torch",
  "minecraft:soul_torch",
  "minecraft:copper_torch",
  "minecraft:lantern",
  "minecraft:soul_lantern",
  "minecraft:copper_lantern",
  "minecraft:exposed_copper_lantern",
  "minecraft:weathered_copper_lantern",
  "minecraft:oxidized_copper_lantern",
  "minecraft:waxed_copper_lantern",
  "minecraft:waxed_exposed_copper_lantern",
  "minecraft:waxed_weathered_copper_lantern",
  "minecraft:waxed_oxidized_copper_lantern",
  ITEM.lantern
]);
var LOGS = [
  "minecraft:oak_log",
  "minecraft:spruce_log",
  "minecraft:birch_log",
  "minecraft:jungle_log",
  "minecraft:acacia_log",
  "minecraft:dark_oak_log",
  "minecraft:mangrove_log",
  "minecraft:cherry_log",
  "minecraft:pale_oak_log",
  "minecraft:poplar_log"
];
var BUILT_BLOCKS = [
  "minecraft:oak_planks",
  "minecraft:spruce_planks",
  "minecraft:birch_planks",
  "minecraft:jungle_planks",
  "minecraft:acacia_planks",
  "minecraft:dark_oak_planks",
  "minecraft:mangrove_planks",
  "minecraft:cherry_planks",
  "minecraft:bamboo_planks",
  "minecraft:pale_oak_planks",
  "minecraft:crafting_table",
  "minecraft:furnace",
  "minecraft:lit_furnace",
  "minecraft:chest",
  "minecraft:barrel",
  "minecraft:bed",
  "minecraft:glass",
  "minecraft:glass_pane",
  "minecraft:cobblestone",
  "minecraft:stone_bricks",
  "minecraft:brick_block",
  "minecraft:torch",
  "minecraft:lantern",
  "minecraft:white_wool",
  "minecraft:farmland",
  "minecraft:smooth_stone",
  ...DOORS
];
var FOREST = /* @__PURE__ */ new Set([
  "forest",
  "forest_hills",
  "flower_forest",
  "birch_forest",
  "birch_forest_hills",
  "birch_forest_mutated",
  "birch_forest_hills_mutated",
  "roofed_forest",
  "roofed_forest_mutated",
  "dappled_forest",
  "pale_garden",
  "taiga",
  "taiga_hills",
  "taiga_mutated",
  "mega_taiga",
  "mega_taiga_hills",
  "redwood_taiga_mutated",
  "redwood_taiga_hills_mutated",
  "cold_taiga",
  "cold_taiga_hills",
  "cold_taiga_mutated",
  "grove",
  "extreme_hills_plus_trees",
  "extreme_hills_plus_trees_mutated",
  "jungle_edge",
  "cherry_grove"
]);
var SWAMP = /* @__PURE__ */ new Set(["swampland", "swampland_mutated", "mangrove_swamp"]);
var SHORE = /* @__PURE__ */ new Set(["river", "beach", "stone_beach", "frozen_river", "cold_beach"]);
var OPEN = /* @__PURE__ */ new Set(["plains", "sunflower_plains", "meadow", "savanna", "savanna_mutated", "savanna_plateau", "ice_plains"]);
function biomeGroup(dim, loc) {
  try {
    const id = dim.getBiome(loc).id.replace("minecraft:", "");
    if (FOREST.has(id)) return "forest";
    if (SWAMP.has(id)) return "swamp";
    if (SHORE.has(id)) return "shore";
    if (OPEN.has(id)) return "open";
    if (id === "lush_caves" || id === "dripstone_caves" || id === "deep_dark" || id === "sulfur_caves") return "cave";
    return "other";
  } catch {
    return "other";
  }
}
function block(dim, loc) {
  try {
    return dim.getBlock(loc);
  } catch {
    return void 0;
  }
}
function passable(b) {
  if (!b) return false;
  if (b.isAir) return true;
  if (b.isLiquid) return false;
  const id = b.typeId;
  return id === "minecraft:short_grass" || id === "minecraft:tall_grass" || id === "minecraft:fern" || id === "minecraft:large_fern" || id === "minecraft:snow_layer" || id === "minecraft:deadbush" || id.endsWith("_flower") || id === "minecraft:poppy" || id === "minecraft:dandelion" || id === "minecraft:leaf_litter" || id === "minecraft:bush" || id === "minecraft:short_dry_grass" || id === "minecraft:tall_dry_grass" || id === "minecraft:firefly_bush";
}
function solidGround(b) {
  if (!b || b.isAir || b.isLiquid) return false;
  const id = b.typeId;
  if (id.includes("leaves") || id.includes("_log") || id.includes("fence") || id.includes("door")) return false;
  return !passable(b);
}
function groundNear(dim, x, yHint, z, range = 10, headroom = 3) {
  const fx = Math.floor(x), fz = Math.floor(z), fy = Math.floor(yHint);
  for (let i = 0; i <= range * 2; i++) {
    const dy = i % 2 === 0 ? i / 2 : -(i + 1) / 2;
    const y = fy + dy;
    const g = block(dim, { x: fx, y: y - 1, z: fz });
    if (!solidGround(g)) continue;
    let ok = true;
    for (let h = 0; h < headroom; h++) {
      if (!passable(block(dim, { x: fx, y: y + h, z: fz }))) {
        ok = false;
        break;
      }
    }
    if (ok) return { x: fx + 0.5, y, z: fz + 0.5 };
  }
  return void 0;
}
function clearLine(dim, from, to) {
  const d = sub(to, from);
  const L = len(d);
  if (L < 0.5) return true;
  try {
    const hit = dim.getBlockFromRay(from, norm(d), { maxDistance: L, includePassableBlocks: false, includeLiquidBlocks: false });
    if (!hit) return true;
    const hp = add(hit.block.location, hit.faceLocation);
    return dist(from, hp) >= L - 0.75;
  } catch {
    return false;
  }
}
function holdingLight(player) {
  try {
    const eq = player.getComponent("minecraft:equippable");
    if (!eq) return false;
    const main = eq.getEquipment(EquipmentSlot.Mainhand);
    const off = eq.getEquipment(EquipmentSlot.Offhand);
    return !!main && LIGHT_ITEMS.has(main.typeId) || !!off && LIGHT_ITEMS.has(off.typeId);
  } catch {
    return false;
  }
}
function volumeAround(c, rx, ry, rz) {
  const x = Math.floor(c.x), y = Math.floor(c.y), z = Math.floor(c.z);
  return new BlockVolume({ x: x - rx, y: y - ry, z: z - rz }, { x: x + rx, y: y + ry, z: z + rz });
}
function hasBlockNear(dim, c, types, rx, ry, rz) {
  try {
    return dim.containsBlock(volumeAround(c, rx, ry, rz), { includeTypes: types }, false);
  } catch {
    return false;
  }
}
function findBlocks(dim, c, types, rx, ry, rz, max = 16) {
  const out = [];
  try {
    const list2 = dim.getBlocks(volumeAround(c, rx, ry, rz), { includeTypes: types }, false);
    for (const loc of list2.getBlockLocationIterator()) {
      out.push(loc);
      if (out.length >= max) break;
    }
  } catch {
  }
  return out;
}
function inLitArea(player, radius = 5) {
  return hasBlockNear(player.dimension, player.location, LIGHT_BLOCKS, radius, 2, radius);
}
function roofed(player) {
  try {
    const hit = player.dimension.getBlockFromRay(player.getHeadLocation(), { x: 0, y: 1, z: 0 }, {
      maxDistance: 6,
      includePassableBlocks: false,
      includeLiquidBlocks: false
    });
    return !!hit;
  } catch {
    return false;
  }
}
function underground(player) {
  const dim = player.dimension;
  const head = player.getHeadLocation();
  try {
    if (dim.getSkyLightLevel(head) > 0) return false;
    const top = dim.getTopmostBlock({ x: head.x, z: head.z });
    return !!top && top.location.y > head.y + 7;
  } catch {
    return false;
  }
}
function isOverworld(dim) {
  return dim.id === "minecraft:overworld";
}
function getCustomState(perm, name) {
  try {
    return perm.getState(name);
  } catch {
    return void 0;
  }
}
function withCustomState(perm, name, value) {
  return perm.withState(name, value);
}

// ../../scripts_src/core/players.ts
var runtime = /* @__PURE__ */ new Map();
function rt(p) {
  let r = runtime.get(p.id);
  if (!r) {
    r = { joinedAt: now(), cooldowns: /* @__PURE__ */ new Map(), ctxAt: -999, diedAt: -99999 };
    runtime.set(p.id, r);
  }
  return r;
}
function forgetRuntime(playerId) {
  runtime.delete(playerId);
}
function ctx(p, maxAge = 40) {
  const r = rt(p);
  if (r.ctx && now() - r.ctxAt <= maxAge) return r.ctx;
  const dim = p.dimension;
  const ow = isOverworld(dim);
  const c = {
    overworld: ow,
    biome: ow ? biomeGroup(dim, p.location) : "other",
    underground: ow ? underground(p) : false,
    roofed: ow ? roofed(p) : false,
    inWater: p.isInWater,
    y: p.location.y
  };
  r.ctx = c;
  r.ctxAt = now();
  return c;
}
function cooldownReady(p, key) {
  return (rt(p).cooldowns.get(key) ?? 0) <= now();
}
function setCooldown(p, key, ticks) {
  rt(p).cooldowns.set(key, now() + Math.max(0, Math.round(ticks)));
}
function huntable(p) {
  if (!p.isValid) return false;
  try {
    const gm = p.getGameMode();
    if (gm === GameMode.Creative || gm === GameMode.Spectator) return false;
    if (world4.getDifficulty() === Difficulty.Peaceful) return false;
    const hp = p.getComponent("minecraft:health");
    if (hp && hp.currentValue <= 0) return false;
  } catch {
    return false;
  }
  return now() - rt(p).diedAt > 1200;
}
function addPlayTime(p, ticks) {
  setNum(p, DP.playTicks, getNum(p, DP.playTicks, 0) + ticks);
}
function isNewcomer(p) {
  return getNum(p, DP.playTicks, 0) < 12e3;
}
function onlinePlayers() {
  return world4.getAllPlayers().filter((p) => p.isValid);
}

// ../../scripts_src/core/scheduler.ts
import { system as system2, world as world5 } from "@minecraft/server";
var failures = /* @__PURE__ */ new Map();
function safe(label, fn) {
  try {
    fn();
  } catch (e) {
    const n = (failures.get(label) ?? 0) + 1;
    failures.set(label, n);
    if (n <= 3 || n % 100 === 0) console.warn(`[hollow] ${label} failed (${n}x): ${e}`);
  }
}
function every(label, ticks, fn, offset = 0) {
  const start = () => system2.runInterval(() => safe(label, fn), ticks);
  if (offset > 0) system2.runTimeout(start, offset);
  else start();
}
function everyPlayer(label, period, fn) {
  system2.runInterval(() => {
    const players = world5.getAllPlayers();
    if (players.length === 0) return;
    const t = system2.currentTick;
    for (let i = 0; i < players.length; i++) {
      if ((i * 7 + t) % period !== 0) continue;
      const p = players[i];
      if (!p.isValid) continue;
      safe(label, () => fn(p));
    }
  }, 1);
}
function later(label, ticks, fn) {
  system2.runTimeout(() => safe(label, fn), Math.max(1, Math.round(ticks)));
}
function failureReport() {
  const parts = [];
  failures.forEach((n, k) => parts.push(`${k}:${n}`));
  debug(`failures ${parts.join(" ")}`);
  return parts.join(", ") || "none";
}

// ../../scripts_src/creatures/borrowed.ts
import { Player as Player14, world as world12 } from "@minecraft/server";

// ../../scripts_src/items/blocks.ts
import {
  BlockPermutation as BlockPermutation2,
  EquipmentSlot as EquipmentSlot4,
  GameMode as GameMode4,
  ItemStack as ItemStack5,
  world as world11
} from "@minecraft/server";

// ../../scripts_src/creatures/heart.ts
import { EntityDamageCause, EquipmentSlot as EquipmentSlot3, GameMode as GameMode3, ItemStack as ItemStack4, Player as Player12, world as world10 } from "@minecraft/server";

// ../../scripts_src/items/components.ts
import { EquipmentSlot as EquipmentSlot2, GameMode as GameMode2, Player as Player10, system as system5, world as world8 } from "@minecraft/server";

// ../../scripts_src/systems/journal.ts
import { ItemLockMode, ItemStack, system as system4 } from "@minecraft/server";
import { ActionFormData as ActionFormData2, FormCancelationReason as FormCancelationReason2 } from "@minecraft/server-ui";

// ../../scripts_src/content/journal.ts
var P = "§r\n\n";
var ENTRIES = [
  // ------------------------------------------------------------------ NOTES
  {
    id: "intro",
    chapter: "notes",
    title: "Ranger Marlowe's Field Journal",
    icon: "textures/items/hollow/field_journal",
    body: "§oIf you are reading this, the station is empty and the journal found you instead of me.§r" + P + "These woods are beautiful. Fish the rivers, mine the hills, raise your house. But something here is wrong, and it is patient." + P + "§lThe first day is safe.§r Use it. Gather wood, find food, build walls and a §lclosed door§r." + P + "This journal fills itself in as you learn. When something new happens, look here first. Hold it and press §lUse§r to read. It stays with you when you fall."
  },
  {
    id: "shelter",
    chapter: "notes",
    title: "On Shelter",
    icon: "textures/items/hollow/rowan_ward",
    body: "Rules I keep:" + P + "§l1.§r A roof and a §lclosed door§r. Nothing out there opens doors." + P + "§l2.§r Light keeps the tall one back. Carry a torch or lantern after dusk." + P + "§l3.§r Hang a §lHollow Chime§r. It rings when one of them comes near, long before you would hear it yourself." + P + "§l4.§r A §lRowan Ward§r by the door turns visitors away. It burns down with use; feed it charcoal." + P + "§l5.§r Sleep is still safe. If you hear knocking from bed, stay in bed."
  },
  {
    id: "lore1",
    chapter: "notes",
    lore: 1,
    title: "Torn Page: Arrival",
    icon: "textures/items/hollow/torn_page",
    body: "§oDay 3 at the station.§r" + P + 'The previous ranger left in a hurry. Coffee still in the pot. Boots by the door. The logbook ends mid-sentence: §o"it stood at the edge of the clearing all night and when I"§r' + P + "I have decided the previous ranger was a dramatic person."
  },
  {
    id: "lore2",
    chapter: "notes",
    lore: 2,
    title: "Torn Page: The Count",
    icon: "textures/items/hollow/torn_page",
    body: "§oDay 9.§r" + P + "Counted the Hobbs flock at dusk. Thirty-one. Counted again at dawn. Thirty-one. But I only ever sold them thirty." + P + "One of them doesn't graze. It just stands at the back and watches the house."
  },
  {
    id: "lore3",
    chapter: "notes",
    lore: 3,
    title: "Torn Page: Underfoot",
    icon: "textures/items/hollow/torn_page",
    body: "§oDay 14.§r" + P + "The miners at the east camp say the deep tunnels §oclick§r, like someone tapping a tongue against their teeth. They say if you stand very still, it goes away." + P + "They moved camp the next day. Nobody told me where."
  },
  {
    id: "lore4",
    chapter: "notes",
    lore: 4,
    title: "Torn Page: Visitors",
    icon: "textures/items/hollow/torn_page",
    body: "§oDay 22.§r" + P + "Three knocks after midnight. I almost answered. There are no neighbours for miles." + P + "In the morning there was a long iron nail on the step, bent like a finger beckoning."
  },
  {
    id: "lore5",
    chapter: "notes",
    lore: 5,
    title: "Torn Page: The Shrine",
    icon: "textures/items/hollow/torn_page",
    body: "§oDay 30.§r" + P + "Found an old map in the cabin floor. Beneath these hills there is a room older than any of us, where the roots of the forest meet. Something sleeps in it and §ldreams§r them all: the watcher, the borrowed things, the clickers, the knocker, the thing in the mire." + P + "They are not five monsters. They are one heart, thinking in five directions."
  },
  {
    id: "lore6",
    chapter: "notes",
    lore: 6,
    title: "Torn Page: Last Entry",
    icon: "textures/items/hollow/torn_page",
    body: "§oDay 41.§r" + P + "A piece from each of them, laid on the altar, wakes it. An offering of silence." + P + "I have them all now. If I'm right, I can still it. If I'm wrong, whoever reads this: do not go alone. Bring light, bring friends, and §lbreak the veins first§r."
  },
  {
    id: "after",
    chapter: "notes",
    title: "Afterward",
    icon: "textures/items/hollow/stilled_heart",
    body: "The Heart is still." + P + "The forest will never be entirely quiet; things that were dreamed do not stop at once. But the dark is a little smaller now, and you made it so." + P + "§7Place a §lHeartwood Lantern§r§7 at home. Nothing that remains will cross its light."
  },
  // ------------------------------------------------------------------ THREATS
  {
    id: "watcher1",
    chapter: "threats",
    title: "The Watcher",
    icon: "textures/items/hollow/pale_resin",
    body: "A tall shape at the treeline. I took it for a dead sapling until the pale face turned to follow me." + P + "§lSigns:§r a pale face in the forest at dusk or night, far away. The woods go quiet first." + P + "It only appears in wooded country. It has not followed me into the open."
  },
  {
    id: "watcher2",
    chapter: "threats",
    title: "The Watcher: Staring Back",
    icon: "textures/items/hollow/pale_resin",
    body: "§lIt does not like being watched back.§r" + P + "Hold your gaze on it for a breath or two and it steps back into the trees and is gone. Where it stood you will find §lPale Resin§r, bleeding from the bark it scraped." + P + "Resin glints faintly at night. It's the base of the §lHollow Lens§r."
  },
  {
    id: "watcher3",
    chapter: "threats",
    title: "The Watcher: Turned Backs",
    icon: "textures/items/hollow/pale_resin",
    body: "§lIt only moves while nobody is looking at it.§r" + P + "Ignore it and it creeps closer, tree by tree. In the dark it will close the last few steps and strike." + P + "§lCounterplay:§r turn and look at it; hold a torch or lantern; stay near placed lights. It will not approach a lit place, and it won't strike someone holding a light."
  },
  {
    id: "borrowed1",
    chapter: "threats",
    title: "The Borrowed",
    icon: "textures/items/hollow/borrowed_hide",
    body: "One of the sheep is not a sheep." + P + "§lSigns:§r it never lowers its head to graze; its bleat is a little too low and ends in a soft §oclick§r; at night its eyes catch the light; it stands still when the others wander, and it faces you." + P + "By day it is harmless if left alone."
  },
  {
    id: "borrowed2",
    chapter: "threats",
    title: "The Borrowed: Tests",
    icon: "textures/items/hollow/borrowed_hide",
    body: "§lHow to tell:§r" + P + "• Hold §lwheat§r. Real sheep come to you. It does not move toward the wheat. It just watches you.§r\n• Try to §lshear§r it. The wool doesn't come off. It peels.§r\n• Look through a §lHollow Lens§r. It cannot hold its shape.§r" + P + "Once revealed it hunts until hurt badly, then flees. At night, don't let it get close in the dark. Fight with your back to a wall. It drops §lBorrowed Hide§r."
  },
  {
    id: "hollowed1",
    chapter: "threats",
    title: "The Hollowed",
    icon: "textures/items/hollow/hollow_fang",
    body: "Deep tunnels, darkness, and a rapid §oclick-click-click§r ahead of me. It hunts by sound. It has no eyes at all." + P + "§lSigns:§r echolocation clicks, distant breathing, scraping on stone."
  },
  {
    id: "hollowed2",
    chapter: "threats",
    title: "The Hollowed: What It Hears",
    icon: "textures/items/hollow/hollow_fang",
    body: "§lIt hears:§r sprinting (16 blocks), walking (6), jumping and landing (8), breaking blocks (12), placing blocks (8), doors, trapdoors, levers, buttons, pressure plates and chests (10), fighting (14), explosions (40), and things you throw landing nearby (12)." + P + "§lIt cannot hear:§r sneaking, and anyone walking on §lwool§r or §lcarpet§r." + P + "§lCounterplay:§r crouch past it. Throw a snowball, egg or arrow away from you; it goes to the sound. Within 3 blocks it finds you anyway, so keep your distance."
  },
  {
    id: "hollowed3",
    chapter: "threats",
    title: "The Hollowed: Fangs",
    icon: "textures/items/hollow/hollow_fang",
    body: "They die like anything else. Their fangs are hollow and hum faintly when held near running water. §lHollow Fangs§r go into the §lHeartseeker§r."
  },
  {
    id: "knocker1",
    chapter: "threats",
    title: "The Knocker",
    icon: "textures/items/hollow/knocker_nail",
    body: "§lThree knocks at the door, after dark.§r" + P + "It only comes to occupied shelters with a door, never before the fourth night, and rarely. Your Chime will ring as it approaches."
  },
  {
    id: "knocker2",
    chapter: "threats",
    title: "The Knocker: Don't Answer",
    icon: "textures/items/hollow/knocker_nail",
    body: "§lDo not open the door.§r It cannot open doors. It knocks, scratches, breathes against the wood. Then it gives up and leaves." + P + "When it leaves, it leaves a §lKnocker's Nail§r on the step." + P + "A §lRowan Ward§r near the door sends it away before it knocks."
  },
  {
    id: "knocker3",
    chapter: "threats",
    title: "The Knocker: I Opened It",
    icon: "textures/items/hollow/knocker_nail",
    body: "I answered. It was waiting with its arms already reaching." + P + "If you open the door while it's there, it comes in. It's slow but strong. Fight it in the light, step back through a doorway, or close the door again between you."
  },
  {
    id: "mirebound1",
    chapter: "threats",
    title: "The Mirebound",
    icon: "textures/items/hollow/mire_pearl",
    body: "In the swamps and along riverbanks there is a mossy hump in the shallows that wasn't there yesterday." + P + "§lSigns:§r bubbles rising where no fish swim, a low gurgle, two dull lights just under the surface at night."
  },
  {
    id: "mirebound2",
    chapter: "threats",
    title: "The Mirebound: Breaking Free",
    icon: "textures/items/hollow/mire_pearl",
    body: "It waits until you're close, then grabs you and drags you toward deeper water." + P + "§lPress Sneak (crouch) to wrench free.§r Hitting it also makes it let go. It can't hold you for long, and it can't follow you onto dry land for more than a few steps." + P + "Walk the banks, not the shallows. It drops a §lMire Pearl§r."
  },
  {
    id: "heart1",
    chapter: "threats",
    title: "The Heart Below",
    icon: "textures/items/hollow/heartseeker",
    body: "Something huge beneath the hills, rooted into stone, beating slow." + P + "§lIt is shielded§r while its §lveins§r pulse around the chamber. Break every vein to expose it. Watch the ground: roots burst where dust rises, and its pulse ring can be jumped."
  },
  {
    id: "heart2",
    chapter: "threats",
    title: "The Heart Below: Phases",
    icon: "textures/items/hollow/heartseeker",
    body: "§lFirst:§r root bursts (dust warns you) and slow pulses." + P + "§lSecond:§r the veins regrow once; young hollowed crawl out. Kill them first, they hunt by sound." + P + "§lLast:§r it opens. The bursts come faster and its gaze sweeps the room. Break line of sight behind the pillars." + P + "It grows stronger with every person in the chamber. Everyone who fights earns a share."
  },
  // ------------------------------------------------------------------ CRAFTING
  {
    id: "craft_chime",
    chapter: "craft",
    title: "Hollow Chime",
    icon: "textures/items/hollow/hollow_chime",
    body: "§lWarning device.§r Hang it under a ceiling, a porch roof or a beam. It rings softly when one of the Hollow comes within 14 blocks, at most once every few seconds. Use it to silence or unsilence it." + P + "§7Recipe (crafting table):§r\n  [   ] [String] [   ]\n  [Iron Nugget] [Copper Ingot] [Iron Nugget]\n  [   ] [Iron Nugget] [   ]" + P + "§7No fuel. Up to 32 chimes per world are active at once."
  },
  {
    id: "craft_ward",
    chapter: "craft",
    title: "Rowan Ward",
    icon: "textures/items/hollow/rowan_ward",
    body: "§lLimited protection.§r A charm of iron and smouldering charcoal. Within 10 blocks:" + P + "• the Knocker turns back before it reaches your door\n• the Watcher will not step closer\n• the Borrowed reveal themselves and flee§r" + P + "§lCharges:§r 4. One charge burns each time it turns something away (at most one per creature per night). Use §lcharcoal§r on it to add a charge back." + P + "§7Recipe:§r\n  [   ] [String] [   ]\n  [Iron Nugget] [Charcoal] [Iron Nugget]\n  [Iron Nugget] [Stick] [Iron Nugget]" + P + "§7It does not stop the Hollowed underground, the Mirebound, or the Heart."
  },
  {
    id: "craft_lens",
    chapter: "craft",
    title: "Hollow Lens",
    icon: "textures/items/hollow/hollow_lens",
    body: "§lInvestigation tool.§r Use it to:" + P + "• reveal any Borrowed within 24 blocks (only you see it)\n• show the direction and distance of the nearest Hollow creature within 48 blocks\n• show how loud you are right now to the Hollowed§r" + P + "§l64 uses§r, 3 s cooldown. Repair with copper ingots at an anvil." + P + "§7Recipe:§r\n  [   ] [Copper Ingot] [   ]\n  [Copper Ingot] [Glass Pane] [Copper Ingot]\n  [   ] [Pale Resin] [   ]"
  },
  {
    id: "craft_heartseeker",
    chapter: "craft",
    title: "Heartseeker",
    icon: "textures/items/hollow/heartseeker",
    body: "§lBoss progression.§r A compass that beats instead of points. Use it to feel the direction, distance and depth of the shrine. It also marks the shrine on your locator bar." + P + "If no shrine has formed in this world yet, the first use draws one up from the deep beneath the hills nearby." + P + "§7Recipe (shapeless):§r Compass + Pale Resin + 2 Hollow Fangs"
  },
  {
    id: "craft_offering",
    chapter: "craft",
    title: "Offering of Silence",
    icon: "textures/items/hollow/offering_of_silence",
    body: "§lBoss progression.§r A piece of each of them. Place it in the altar at the shrine to wake the Heart Below." + P + "§7Recipe:§r\n  [Hollow Fang] [Pale Resin] [Hollow Fang]\n  [Borrowed Hide] [Gold Ingot] [Knocker's Nail]\n  [   ] [Mire Pearl] [   ]" + P + "§7Cabin and campsite chests sometimes hold components. If a creature is switched off in World Rules, every new site chest holds its component instead."
  },
  {
    id: "craft_lantern",
    chapter: "craft",
    title: "Heartwood Lantern",
    icon: "textures/items/hollow/heartwood_lantern",
    body: "§lReward.§r Crafted from a Stilled Heart and a lantern. A permanent light: within 24 blocks no Hollow creature is drawn to you, the Knocker never visits, and nothing of theirs spawns." + P + "§7Recipe (shapeless):§r Stilled Heart + Lantern"
  },
  // ------------------------------------------------------------------ PLACES
  {
    id: "place_cabin",
    chapter: "places",
    title: "The Ranger Cabin",
    icon: "textures/items/hollow/torn_page",
    body: "A spruce cabin in the woods with a cold stove and a chest of supplies. Rangers kept spare notes here. Look for §lTorn Pages§r." + P + "§7Cabins appear in forests, well away from where you've built."
  },
  {
    id: "place_camp",
    chapter: "places",
    title: "The Ruined Campsite",
    icon: "textures/items/hollow/torn_page",
    body: "Two collapsed tents and a dead fire. Whoever camped here left in the night and didn't take their pack. Check the barrel." + P + "§7Campsites appear on open ground and at forest edges."
  },
  {
    id: "place_shrine",
    chapter: "places",
    title: "The Underground Shrine",
    icon: "textures/items/hollow/heartseeker",
    body: "A root-choked chamber deep below the hills, lit by old candles. The altar at its centre takes the §lOffering of Silence§r." + P + "§7Follow the Heartseeker. Dig down carefully and bring a way back up."
  }
];
var ENTRY_BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));
var LORE_PAGES = ENTRIES.filter((e) => e.lore !== void 0).sort((a, b) => (a.lore ?? 0) - (b.lore ?? 0));
var CHAPTERS = [
  { id: "notes", title: "Field Notes", icon: "textures/items/hollow/field_journal" },
  { id: "threats", title: "Threats", icon: "textures/items/hollow/pale_resin" },
  { id: "craft", title: "Equipment", icon: "textures/items/hollow/rowan_ward" },
  { id: "places", title: "Places", icon: "textures/items/hollow/torn_page" }
];

// ../../scripts_src/systems/settings_ui.ts
import { system as system3 } from "@minecraft/server";
import { ActionFormData, FormCancelationReason, ModalFormData } from "@minecraft/server-ui";
function showModal(p, f, retries = 6) {
  return f.show(p).then((r) => {
    if (r.canceled && r.cancelationReason === FormCancelationReason.UserBusy && retries > 0) {
      return new Promise((res) => system3.runTimeout(() => showModal(p, f, retries - 1).then(res), 10));
    }
    return r;
  });
}
async function openSettings(p, op) {
  const menu = new ActionFormData().title("§lSettings").body("§7Comfort settings are yours alone. World rules affect everyone and need operator permission.\n\n§8Brightness, render distance, graphics mode (Vibrant Visuals), the sound sliders (Music, Ambient/Environment, Hostile Creatures) and Subtitles are in Minecraft's own Settings menu.").button("My comfort settings", "textures/ui/hollow/settings");
  if (op) menu.button("World rules §8(operator)", "textures/ui/hollow/world");
  const r = await menu.show(p);
  if (r.canceled || r.selection === void 0) return;
  if (r.selection === 0) return openPrefs(p);
  if (r.selection === 1 && isOperator(p)) return openWorld(p);
}
async function openPrefs(p) {
  const cur = prefs(p);
  const f = new ModalFormData().title("§lMy comfort settings").slider("Ambience volume (script cues)", 0, 100, { defaultValue: cur.ambience, valueStep: 10 }).dropdown("Encounter accents (short stingers)", ["Off", "Subtle", "Full"], { defaultValueIndex: cur.accents }).toggle("Visual effects (fog shifts, soft fades)", { defaultValue: cur.visualFx }).toggle("Action-bar hints", { defaultValue: cur.hints }).toggle("Music (night, cave, shrine and boss tracks)", { defaultValue: cur.music }).submitButton("Save");
  const r = await showModal(p, f);
  if (!r || r.canceled || !r.formValues) return;
  const v = r.formValues;
  const next = {
    ambience: Number(v[0]),
    accents: Number(v[1]),
    visualFx: Boolean(v[2]),
    hints: Boolean(v[3]),
    music: Boolean(v[4])
  };
  savePrefs(p, next);
  if (!next.visualFx) clearAllFog(p);
  notice(p, "§7Comfort settings saved.");
}
async function openWorld(p) {
  const s = settings();
  const f = new ModalFormData().title("§lWorld rules").dropdown("Horror intensity", ["Calm: rarer, no ambush strikes", "Standard", "Nightmare: frequent, bolder"], { defaultValueIndex: s.intensity }).slider("Encounter frequency (%)", 25, 200, { defaultValue: s.frequency, valueStep: 25 }).slider("Grace days before creatures hunt", 0, 5, { defaultValue: s.graceDays, valueStep: 1 }).slider("First night the Knocker may visit", 2, 10, { defaultValue: Math.max(2, Math.min(10, s.knockerNight)), valueStep: 1 }).toggle("Creature: The Watcher", { defaultValue: s.watcher }).toggle("Creature: The Borrowed", { defaultValue: s.borrowed }).toggle("Creature: The Hollowed", { defaultValue: s.hollowed }).toggle("Creature: The Knocker", { defaultValue: s.knocker }).toggle("Creature: The Mirebound", { defaultValue: s.mirebound }).toggle("Destructive Knocker (may break wooden doors on Hard)", { defaultValue: s.destructive }).toggle("Rare bedtime knocking (harmless, never blocks sleep)", { defaultValue: s.sleepDisturbance }).toggle("Place cabins, campsites and the shrine", { defaultValue: s.sites }).toggle("Scale the Heart Below with player count", { defaultValue: s.bossScaling }).submitButton("Save");
  const r = await showModal(p, f);
  if (!r || r.canceled || !r.formValues || !isOperator(p)) return;
  const v = r.formValues;
  const next = {
    intensity: Number(v[0]),
    frequency: Number(v[1]),
    graceDays: Number(v[2]),
    knockerNight: Number(v[3]),
    watcher: Boolean(v[4]),
    borrowed: Boolean(v[5]),
    hollowed: Boolean(v[6]),
    knocker: Boolean(v[7]),
    mirebound: Boolean(v[8]),
    destructive: Boolean(v[9]),
    sleepDisturbance: Boolean(v[10]),
    sites: Boolean(v[11]),
    bossScaling: Boolean(v[12])
  };
  saveSettings(next);
  notice(p, "§7World rules saved.");
}

// ../../scripts_src/systems/journal.ts
var cache = /* @__PURE__ */ new Map();
function data(p) {
  let d = cache.get(p.id);
  if (!d) {
    const raw = readEntity(p, DP.journal, { u: [], r: [] });
    d = { u: Array.isArray(raw.u) ? raw.u : [], r: Array.isArray(raw.r) ? raw.r : [] };
    cache.set(p.id, d);
  }
  return d;
}
function save(p, d) {
  writeEntity(p, DP.journal, d);
}
function forgetJournal(playerId) {
  cache.delete(playerId);
}
function hasEntry(p, id) {
  return data(p).u.includes(id);
}
function unlock(p, id, quiet = false) {
  if (!ENTRY_BY_ID.has(id) || !p.isValid) return false;
  const d = data(p);
  if (d.u.includes(id)) return false;
  d.u.push(id);
  save(p, d);
  if (!quiet) {
    const e = ENTRY_BY_ID.get(id);
    system4.runTimeout(() => {
      if (!p.isValid) return;
      notice(p, `§7New journal entry: §f${e.title}`);
      ui(p, SND.journalEntry, 0.8);
    }, 30);
  }
  return true;
}
function unlockNextLore(p) {
  for (const e of LORE_PAGES) {
    if (!hasEntry(p, e.id)) {
      unlock(p, e.id);
      return e.title;
    }
  }
  return void 0;
}
function journalStack() {
  const s = new ItemStack(ITEM.journal, 1);
  s.keepOnDeath = true;
  s.lockMode = ItemLockMode.inventory;
  return s;
}
function ensureJournal(p, force = false) {
  try {
    const inv = p.getComponent("minecraft:inventory");
    const c = inv?.container;
    if (!c) return;
    if (!force) {
      for (let i = 0; i < c.size; i++) {
        if (c.getItem(i)?.typeId === ITEM.journal) return;
      }
    }
    const left = c.addItem(journalStack());
    if (left) p.dimension.spawnItem(left, p.location);
  } catch {
  }
}
function show(p, form, retries = 6) {
  return form.show(p).then((r) => {
    if (r.canceled && r.cancelationReason === FormCancelationReason2.UserBusy && retries > 0) {
      return new Promise(
        (res) => system4.runTimeout(() => show(p, form, retries - 1).then(res), 10)
      );
    }
    return r;
  });
}
function threatsAwake() {
  const s = settings();
  const day = hollowDay();
  const night = hollowNight();
  const hunting = day >= s.graceDays;
  const lines = [];
  if (s.watcher) lines.push(hunting ? "§7• In the woods after dusk, something watches." : "§7• The woods feel watched, but nothing hunts yet.");
  if (s.borrowed && day >= 1) lines.push("§7• Count the flocks.");
  if (s.hollowed && hunting) lines.push("§7• Deep tunnels click.");
  if (s.mirebound && day >= 2) lines.push("§7• The shallows are not empty.");
  if (s.knocker) lines.push(night >= s.knockerNight ? "§7• Keep your door closed at night." : "§7• Nights are quiet at the door, for now.");
  return lines.join("\n");
}
async function openJournal(p) {
  ui(p, SND.journalOpen, 0.9);
  const d = data(p);
  const total = ENTRIES.length;
  const form = new ActionFormData2().title("§lField Journal").body(
    `§7Day §f${hollowDay() + 1}§7 · Entries §f${d.u.length}/${total}

` + threatsAwake()
  );
  const unreadIn = (ch) => ENTRIES.some((e) => e.chapter === ch && d.u.includes(e.id) && !d.r.includes(e.id));
  for (const ch of CHAPTERS) {
    const count = ENTRIES.filter((e) => e.chapter === ch.id && d.u.includes(e.id)).length;
    form.button(`${ch.title}${unreadIn(ch.id) ? " §6(new)" : ""}
§8${count} entries`, ch.icon);
  }
  form.button("Settings\n§8comfort & world rules", "textures/ui/hollow/settings");
  const r = await show(p, form);
  if (!r || r.canceled || r.selection === void 0) return;
  if (r.selection < CHAPTERS.length) await openChapter(p, CHAPTERS[r.selection].id);
  else await openSettings(p, isOperator(p));
}
async function openChapter(p, ch) {
  const d = data(p);
  const unlocked = ENTRIES.filter((e) => e.chapter === ch && d.u.includes(e.id));
  const locked = ENTRIES.filter((e) => e.chapter === ch && !d.u.includes(e.id)).length;
  const title = CHAPTERS.find((c) => c.id === ch).title;
  const form = new ActionFormData2().title(`§l${title}`);
  form.body(
    unlocked.length === 0 ? "§7Nothing written here yet." : locked > 0 ? `§7${locked} ${locked === 1 ? "page is" : "pages are"} still blank.` : "§7Complete."
  );
  for (const e of unlocked) {
    form.button(`${d.r.includes(e.id) ? "" : "§6• §r"}${e.title}`, e.icon);
  }
  form.button("§8Back", "textures/ui/hollow/back");
  const r = await show(p, form);
  if (!r || r.canceled || r.selection === void 0) return;
  if (r.selection >= unlocked.length) return openJournal(p);
  await openEntry(p, unlocked[r.selection].id, ch);
}
async function openEntry(p, id, back) {
  const e = ENTRY_BY_ID.get(id);
  if (!e) return;
  const d = data(p);
  if (!d.r.includes(id)) {
    d.r.push(id);
    save(p, d);
  }
  ui(p, SND.journalOpen, 0.6, 1.15);
  const form = new ActionFormData2().title(`§l${e.title}`).body(e.body).button("§8Back", "textures/ui/hollow/back");
  const r = await show(p, form);
  if (!r || r.canceled) return;
  await openChapter(p, back);
}

// ../../scripts_src/systems/noise.ts
import { Player as Player8, world as world6 } from "@minecraft/server";
var listeners = [];
var activeCheck = () => false;
function onNoise(fn) {
  listeners.push(fn);
}
function setListenerCheck(fn) {
  activeCheck = fn;
}
function emitNoise(n) {
  if (!activeCheck(n.dim, n.at, n.radius)) return;
  for (const l of listeners) safe("noise.listener", () => l(n));
}
var INTERACT_LOUD = ["door", "trapdoor", "fence_gate", "chest", "barrel", "shulker_box", "lever", "button"];
function quietFloor(p) {
  const below = block(p.dimension, { x: p.location.x, y: p.location.y - 0.2, z: p.location.z });
  if (!below) return false;
  const id = below.typeId;
  return id.endsWith("_wool") || id.endsWith("_carpet") || id === "minecraft:moss_carpet";
}
var moveState = /* @__PURE__ */ new Map();
function movementNoise(p) {
  if (p.isSneaking) return { radius: 0, kind: "move" };
  const v = p.getVelocity();
  const speed = Math.hypot(v.x, v.z);
  const st3 = moveState.get(p.id) ?? { airborne: false, lastLand: -999 };
  const wasAir = st3.airborne;
  st3.airborne = !p.isOnGround;
  let landed = false;
  if (wasAir && p.isOnGround && now() - st3.lastLand > 10) {
    landed = true;
    st3.lastLand = now();
  }
  moveState.set(p.id, st3);
  if (quietFloor(p)) return { radius: 0, kind: "move" };
  if (p.isSprinting && speed > 0.05) return { radius: 16, kind: "sprint" };
  if (landed || p.isJumping) return { radius: 8, kind: "jump" };
  if (speed > 0.04) return { radius: 6, kind: "move" };
  return { radius: 0, kind: "move" };
}
function noiseDescription(p) {
  const { radius, kind } = movementNoise(p);
  if (radius === 0) return p.isSneaking ? "silent (sneaking)" : "silent";
  const word = radius >= 16 ? "loud" : radius >= 8 ? "noticeable" : "soft";
  return `${word} (${kind === "sprint" ? "sprinting" : kind === "jump" ? "jumping" : "walking"}, ${radius} blocks)`;
}
function forgetNoise(playerId) {
  moveState.delete(playerId);
}
function startNoiseEvents() {
  const ev = world6.afterEvents;
  ev.playerBreakBlock.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 12, kind: "break", source: e.player }));
  ev.playerPlaceBlock.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 8, kind: "place", source: e.player }));
  ev.playerInteractWithBlock.subscribe((e) => {
    const id = e.block.typeId;
    if (INTERACT_LOUD.some((k) => id.includes(k))) {
      emitNoise({ dim: e.block.dimension, at: e.block.location, radius: 10, kind: "use", source: e.player });
    }
  });
  ev.leverAction.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 10, kind: "redstone", source: e.player }));
  ev.buttonPush.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 10, kind: "redstone" }));
  ev.pressurePlatePush.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 10, kind: "redstone" }));
  ev.tripWireTrip.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 10, kind: "redstone" }));
  ev.pistonActivate.subscribe((e) => emitNoise({ dim: e.dimension, at: e.block.location, radius: 10, kind: "redstone" }));
  ev.explosion.subscribe((e) => {
    const src = e.source;
    const at = src?.isValid ? src.location : e.getImpactedBlocks()[0]?.location;
    if (at) emitNoise({ dim: e.dimension, at, radius: 40, kind: "explosion" });
  });
  ev.projectileHitBlock.subscribe((e) => emitNoise({ dim: e.dimension, at: e.location, radius: 12, kind: "impact" }));
  ev.projectileHitEntity.subscribe((e) => emitNoise({ dim: e.dimension, at: e.location, radius: 12, kind: "impact" }));
  ev.entityHurt.subscribe((e) => {
    const hurt2 = e.hurtEntity;
    const by = e.damageSource.damagingEntity;
    const player = hurt2 instanceof Player8 ? hurt2 : by instanceof Player8 ? by : void 0;
    if (!player || !hurt2.isValid) return;
    emitNoise({ dim: hurt2.dimension, at: hurt2.location, radius: 14, kind: "combat", source: player });
  });
}

// ../../scripts_src/systems/sites.ts
import {
  BlockVolume as BlockVolume2,
  ItemStack as ItemStack2,
  LocationWaypoint,
  StructureRotation,
  WaypointTexture,
  world as world7
} from "@minecraft/server";
var DEFS = {
  cabin: { structure: "hollow:cabin", size: [11, 9, 11], sink: 1, spacing: 320, cap: 8, lootTable: "hollow/sites/cabin", journal: "place_cabin" },
  camp: { structure: "hollow:campsite", size: [13, 6, 13], sink: 1, spacing: 256, cap: 10, lootTable: "hollow/sites/campsite", journal: "place_camp" },
  shrine: { structure: "hollow:shrine", size: [25, 13, 25], sink: 0, spacing: 0, cap: 1, lootTable: "", journal: "place_shrine" }
};
var sites;
function allSites() {
  if (!sites) sites = readWorldArray(DP.sites).filter((s) => s && typeof s.x === "number" && DEFS[s.t]);
  return sites;
}
function saveSites() {
  writeWorld(DP.sites, allSites());
}
var siteCenter = (s) => ({ x: s.x + s.sx / 2, y: s.y + 1, z: s.z + s.sz / 2 });
function shrine() {
  return allSites().find((s) => s.t === "shrine");
}
function shrineCenter() {
  const s = shrine();
  return s ? siteCenter(s) : void 0;
}
function loadedBox(dim, o, size) {
  try {
    for (const dx of [0, size[0] - 1]) {
      for (const dz of [0, size[2] - 1]) {
        if (!dim.isChunkLoaded({ x: o.x + dx, y: o.y, z: o.z + dz })) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
function surfaceOk(dim, o, def) {
  const [sx, sy, sz] = def.size;
  if (!loadedBox(dim, o, def.size)) return false;
  const pts = [[1, 1], [sx - 2, 1], [1, sz - 2], [sx - 2, sz - 2], [Math.floor(sx / 2), Math.floor(sz / 2)]];
  for (const [dx, dz] of pts) {
    const g = groundNear(dim, o.x + dx, o.y, o.z + dz, 3, 2);
    if (!g || Math.abs(g.y - o.y) > 2) return false;
    const below = block(dim, { x: g.x, y: g.y - 1, z: g.z });
    if (!below || below.isLiquid) return false;
  }
  const vol = new BlockVolume2({ x: o.x - 4, y: o.y - def.sink, z: o.z - 4 }, { x: o.x + sx + 3, y: o.y + sy, z: o.z + sz + 3 });
  try {
    if (dim.containsBlock(vol, { includeTypes: BUILT_BLOCKS }, false)) return false;
    const inner = new BlockVolume2({ x: o.x, y: o.y, z: o.z }, { x: o.x + sx - 1, y: o.y + sy - 1, z: o.z + sz - 1 });
    if (dim.containsBlock(inner, { includeTypes: LOGS }, false)) return false;
    if (dim.containsBlock(inner, { includeTypes: ["minecraft:water", "minecraft:flowing_water", "minecraft:lava", "minecraft:flowing_lava"] }, false)) return false;
  } catch {
    return false;
  }
  return true;
}
function farFromOthers(dim, at, t, spacing) {
  for (const s of allSites()) {
    if (s.d !== dim.id) continue;
    const min = s.t === t ? spacing : 96;
    if (distXZ(siteCenter(s), at) < min) return false;
  }
  return true;
}
function place(dim, t, origin) {
  const def = DEFS[t];
  const rot = pick([StructureRotation.None, StructureRotation.Rotate90, StructureRotation.Rotate180, StructureRotation.Rotate270]);
  const o = { x: Math.floor(origin.x), y: Math.floor(origin.y) - def.sink, z: Math.floor(origin.z) };
  try {
    world7.structureManager.place(def.structure, dim, o, { rotation: rot, includeEntities: false, waterlogged: false });
  } catch (e) {
    console.warn(`[hollow] could not place ${def.structure}: ${e}`);
    return void 0;
  }
  const site = { t, d: dim.id, x: o.x, y: o.y + def.sink, z: o.z, sx: def.size[0], sy: def.size[1], sz: def.size[2] };
  allSites().push(site);
  saveSites();
  if (def.lootTable) later("sites.fill", 2, () => fill(dim, site));
  return site;
}
var DISABLED_SUPPLY = [
  ["watcher", ITEM.paleResin, 1],
  ["borrowed", ITEM.borrowedHide, 1],
  ["hollowed", ITEM.hollowFang, 2],
  ["knocker", ITEM.knockerNail, 1],
  ["mirebound", ITEM.mirePearl, 1]
];
function fill(dim, s) {
  const def = DEFS[s.t];
  const c = { x: s.x + Math.floor(s.sx / 2), y: s.y + 2, z: s.z + Math.floor(s.sz / 2) };
  const r = Math.max(s.sx, s.sz);
  const containers = findBlocks(dim, c, ["minecraft:chest", "minecraft:barrel"], Math.ceil(r / 2), s.sy, Math.ceil(r / 2), 4);
  const mgr = world7.getLootTableManager();
  const table = mgr.getLootTable(def.lootTable);
  for (const loc of containers) {
    const b = block(dim, loc);
    const inv = b?.getComponent("minecraft:inventory")?.container;
    if (!inv) continue;
    const loot = table ? mgr.generateLootFromTable(table) ?? [] : [];
    for (const [rule, id, n] of DISABLED_SUPPLY) {
      if (!settings()[rule]) loot.push(new ItemStack2(id, n));
    }
    for (const item of loot) {
      const slot = randInt(0, inv.size - 1);
      if (!inv.getItem(slot)) inv.setItem(slot, item);
      else inv.addItem(item);
    }
  }
  for (const loc of findBlocks(dim, c, ["minecraft:spruce_wall_sign", "minecraft:spruce_standing_sign"], Math.ceil(r / 2), s.sy, Math.ceil(r / 2), 2)) {
    try {
      block(dim, loc)?.getComponent("minecraft:sign")?.setText(
        s.t === "cabin" ? "§lMISSING§r\nRanger E. Marlowe\nLast seen: the\neast woods" : "DON'T\nANSWER\nTHE\nDOOR"
      );
    } catch {
    }
  }
}
function trySurfaceSite(p) {
  const s = settings();
  if (!s.sites) return;
  const c = ctx(p);
  if (!c.overworld || c.underground || c.inWater || c.roofed) return;
  if (!chance(0.3)) return;
  const dim = p.dimension;
  const spawn = world7.getDefaultSpawnLocation();
  if (distXZ(p.location, spawn) < 96) return;
  const bed = p.getSpawnPoint();
  const t = c.biome === "forest" ? chance(0.7) ? "cabin" : "camp" : c.biome === "open" ? "camp" : "cabin";
  if (t === "cabin" && c.biome !== "forest") return;
  const def = DEFS[t];
  if (allSites().filter((x) => x.t === t).length >= def.cap) return;
  const baseYaw = yawOf(p.getViewDirection());
  for (let k = 0; k < 4; k++) {
    const dir = yawDir(baseYaw + 180 + rand(-70, 70));
    const r = rand(56, 80);
    const cx = p.location.x + dir.x * r;
    const cz = p.location.z + dir.z * r;
    const g = groundNear(dim, cx, p.location.y, cz, 10, 4);
    if (!g) continue;
    if (bed && bed.dimension.id === dim.id && distXZ(g, bed) < 64) continue;
    if (!farFromOthers(dim, g, t, def.spacing)) continue;
    const o = { x: Math.floor(g.x - def.size[0] / 2), y: g.y, z: Math.floor(g.z - def.size[2] / 2) };
    if (!surfaceOk(dim, o, def)) continue;
    place(dim, t, o);
    return;
  }
}
function makeShrine(p) {
  const dim = p.dimension;
  const def = DEFS.shrine;
  const minY = dim.heightRange.min;
  for (let k = 0; k < 10; k++) {
    const dir = yawDir(rand(0, 360));
    const r = rand(32, 48);
    const cx = Math.floor(p.location.x + dir.x * r);
    const cz = Math.floor(p.location.z + dir.z * r);
    const y = Math.max(minY + 8, Math.min(-12, Math.floor(p.location.y) - 40) - randInt(0, 12));
    const o = { x: cx - Math.floor(def.size[0] / 2), y, z: cz - Math.floor(def.size[2] / 2) };
    if (!loadedBox(dim, o, def.size)) continue;
    try {
      const vol = new BlockVolume2({ x: o.x - 1, y: o.y - 1, z: o.z - 1 }, { x: o.x + def.size[0], y: o.y + def.size[1], z: o.z + def.size[2] });
      if (dim.containsBlock(vol, { includeTypes: ["minecraft:lava", "minecraft:flowing_lava", "minecraft:water", "minecraft:flowing_water"] }, false)) continue;
      if (dim.containsBlock(vol, { includeTypes: BUILT_BLOCKS }, false)) continue;
    } catch {
      continue;
    }
    return place(dim, "shrine", o);
  }
  return void 0;
}
var waypoints = /* @__PURE__ */ new Map();
function useHeartseeker(p) {
  if (!isOverworld(p.dimension)) {
    notice(p, "§7The Heartseeker lies still. Its heart is in the Overworld.");
    return;
  }
  let s = shrine();
  if (!s) {
    if (!settings().sites) {
      notice(p, "§7The Heartseeker beats, but finds nothing. (Sites are disabled in World rules.)");
      return;
    }
    worldSound(p.dimension, SND.heartAwaken, p.location, 0.25, 1.4);
    s = makeShrine(p);
    if (!s) {
      notice(p, "§7The Heartseeker shudders. The ground here is wrong (water or lava below). Try elsewhere.");
      return;
    }
    notice(p, "§7Far below, something old answers the Heartseeker.");
  }
  const c = siteCenter(s);
  const d = Math.round(distXZ(p.location, c));
  const depth = Math.round(p.location.y - c.y);
  ui(p, SND.heartseeker, 1, d < 32 ? 1.3 : d < 96 ? 1 : 0.8);
  particle(p.dimension, PARTICLE.veinMote, { x: p.location.x, y: p.location.y + 1.2, z: p.location.z });
  const where = d < 6 ? "directly below you" : `${compass(p.location, c)}, ${d} blocks`;
  notice(p, `§7The Heartseeker beats: ${where}, ${depth > 0 ? `${depth} blocks down` : "at this depth"}.`);
  unlock(p, "craft_heartseeker", true);
  unlock(p, "heart1");
  try {
    const old = waypoints.get(p.id);
    if (old?.isValid) p.locatorBar.removeWaypoint(old);
    const wp = new LocationWaypoint(
      { dimension: p.dimension, x: c.x, y: c.y, z: c.z },
      { textureBoundsList: [{ lowerBound: 0, texture: WaypointTexture.SmallStar }] },
      { red: 0.85, green: 0.25, blue: 0.2 }
    );
    p.locatorBar.addWaypoint(wp);
    waypoints.set(p.id, wp);
  } catch {
  }
}
function forgetSites(playerId) {
  waypoints.delete(playerId);
}
function discover(p) {
  if (!isOverworld(p.dimension)) return;
  for (const s of allSites()) {
    if (s.d !== p.dimension.id) continue;
    const r = s.t === "shrine" ? 22 : 16;
    if (dist(siteCenter(s), p.location) <= r) unlock(p, DEFS[s.t].journal);
  }
}
function startSites() {
  everyPlayer("sites.place", 1200, trySurfaceSite);
  everyPlayer("sites.discover", 100, discover);
  every("sites.validate", 6e3, () => {
    for (const s of [...allSites()]) {
      let dim;
      try {
        dim = world7.getDimension(s.d);
      } catch {
        continue;
      }
      const c = siteCenter(s);
      try {
        if (!dim.isChunkLoaded(c)) continue;
      } catch {
        continue;
      }
      const marker = s.t === "shrine" ? ["hollow:heart_altar"] : ["minecraft:chest", "minecraft:barrel", "minecraft:campfire"];
      if (!hasBlockNear(dim, c, marker, Math.ceil(s.sx / 2) + 1, s.sy, Math.ceil(s.sz / 2) + 1)) {
        allSites().splice(allSites().indexOf(s), 1);
        saveSites();
      }
    }
  }, 300);
}
function forceSite(p, t) {
  if (t === "shrine") {
    const s2 = shrine() ?? makeShrine(p);
    return s2 ? `shrine at ${s2.x} ${s2.y} ${s2.z}` : "no valid shrine location";
  }
  const def = DEFS[t];
  const dir = yawDir(yawOf(p.getViewDirection()));
  const g = groundNear(p.dimension, p.location.x + dir.x * 20, p.location.y, p.location.z + dir.z * 20, 10, 4);
  if (!g) return "no ground";
  const o = { x: Math.floor(g.x - def.size[0] / 2), y: g.y, z: Math.floor(g.z - def.size[2] / 2) };
  const s = place(p.dimension, t, o);
  return s ? `${t} at ${s.x} ${s.y} ${s.z}` : "placement failed";
}

// ../../scripts_src/items/components.ts
var CREATURE_NAMES = {
  [ENT.watcher]: ["watcher1", "the Watcher"],
  [ENT.borrowed]: ["borrowed1", "a Borrowed"],
  [ENT.hollowed]: ["hollowed1", "a Hollowed"],
  [ENT.knocker]: ["knocker1", "the Knocker"],
  [ENT.mirebound]: ["mirebound1", "a Mirebound"],
  [ENT.heart]: ["heart1", "the Heart Below"]
};
function survivalish(p) {
  const gm = p.getGameMode();
  return gm === GameMode2.Survival || gm === GameMode2.Adventure;
}
function wearHeld(p, typeId) {
  if (!survivalish(p)) return;
  const eq = p.getComponent("minecraft:equippable");
  if (!eq) return;
  const item = eq.getEquipment(EquipmentSlot2.Mainhand);
  if (!item || item.typeId !== typeId) return;
  const dur = item.getComponent("minecraft:durability");
  if (!dur) return;
  if (dur.damage + 1 >= dur.maxDurability) {
    eq.setEquipment(EquipmentSlot2.Mainhand, void 0);
    p.playSound("random.break");
    return;
  }
  dur.damage += 1;
  eq.setEquipment(EquipmentSlot2.Mainhand, item);
}
function consumeHeld(p, typeId) {
  if (!survivalish(p)) return;
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot2.Mainhand);
  if (!eq || !item || item.typeId !== typeId) return;
  if (item.amount > 1) {
    item.amount -= 1;
    eq.setEquipment(EquipmentSlot2.Mainhand, item);
  } else eq.setEquipment(EquipmentSlot2.Mainhand, void 0);
}
var revealTimers = /* @__PURE__ */ new Map();
function useLens(p) {
  ui(p, SND.lens, 1);
  const dim = p.dimension;
  const head = p.getHeadLocation();
  const lines = [];
  const borrowed = dim.getEntities({ type: ENT.borrowed, location: p.location, maxDistance: 24 });
  for (const b of borrowed) {
    try {
      p.setPropertyOverrideForEntity(b, PROP.revealed, true);
      p.spawnParticle("hollow:lens_reveal", { x: b.location.x, y: b.location.y + 1.2, z: b.location.z });
      const key = `${p.id}|${b.id}`;
      const old = revealTimers.get(key);
      if (old !== void 0) system5.clearRun(old);
      revealTimers.set(key, system5.runTimeout(() => {
        revealTimers.delete(key);
        try {
          if (p.isValid && b.isValid) p.removePropertyOverrideForEntity(b, PROP.revealed);
        } catch {
        }
      }, 200));
    } catch {
    }
  }
  if (borrowed.length > 0) {
    unlock(p, "borrowed1");
    unlock(p, "borrowed2");
    lines.push(`§c${borrowed.length === 1 ? "One animal here is not" : `${borrowed.length} animals here are not`} what it seems.`);
  }
  const near = dim.getEntities({ families: [FAMILY.creature], location: p.location, maxDistance: 48, closest: 1 });
  if (near.length > 0) {
    const e = near[0];
    const info = CREATURE_NAMES[e.typeId];
    const name = info && hasEntry(p, info[0]) ? info[1] : "something";
    const d = Math.round(dist(head, e.location));
    const dy = e.location.y - p.location.y;
    const vert = dy > 6 ? ", above you" : dy < -6 ? ", below you" : "";
    lines.push(`§7The lens clouds: ${name}, ${compass(p.location, e.location)}, ~${d} blocks${vert}.`);
  } else if (borrowed.length === 0) {
    lines.push("§7The lens stays clear. Nothing of theirs within 48 blocks.");
  }
  lines.push(`§8Your noise: ${noiseDescription(p)}`);
  notice(p, lines.join("\n"));
  wearHeld(p, ITEM.lens);
}
function registerItemComponents(ev) {
  ev.itemComponentRegistry.registerCustomComponent("hollow:journal", {
    onUse(e) {
      const p = e.source;
      system5.run(() => void openJournal(p));
    }
  });
  ev.itemComponentRegistry.registerCustomComponent("hollow:torn_page", {
    onUse(e) {
      const p = e.source;
      system5.run(() => {
        const title = unlockNextLore(p);
        if (title) {
          consumeHeld(p, ITEM.page);
          notice(p, `§7You smooth out the page and copy it into your journal: §f${title}`);
        } else {
          notice(p, "§7This page repeats what you already have.");
        }
      });
    }
  });
  ev.itemComponentRegistry.registerCustomComponent("hollow:lens", {
    onUse(e) {
      const p = e.source;
      system5.run(() => useLens(p));
    }
  });
  ev.itemComponentRegistry.registerCustomComponent("hollow:heartseeker", {
    onUse(e) {
      const p = e.source;
      system5.run(() => useHeartseeker(p));
    }
  });
  ev.itemComponentRegistry.registerCustomComponent("hollow:material", {
    // Crafting materials: using one re-reads its hint (pickup teaches the recipe, see below).
    onUse(e) {
      const p = e.source;
      const id = e.itemStack?.typeId;
      system5.run(() => describeMaterial(p, id));
    }
  });
}
var MATERIAL_HINTS = {
  [ITEM.paleResin]: ["craft_lens", "§7Pale Resin: sticky, faintly warm. A lens could be set with it."],
  [ITEM.hollowFang]: ["craft_heartseeker", "§7Hollow Fang: it hums, faintly, toward the ground."],
  [ITEM.borrowedHide]: ["craft_offering", "§7Borrowed Hide: it is still slightly warm, and it isn't wool."],
  [ITEM.knockerNail]: ["craft_offering", "§7Knocker's Nail: cold iron, bent like a beckoning finger."],
  [ITEM.mirePearl]: ["craft_offering", "§7Mire Pearl: something in it turns over when you look away."],
  [ITEM.stilledHeart]: ["craft_lantern", "§7Stilled Heart: it does not beat. Set it in a lantern."]
};
function describeMaterial(p, id) {
  if (!id) return;
  const h = MATERIAL_HINTS[id];
  if (!h) return;
  unlock(p, h[0]);
  notice(p, h[1]);
}
function startMaterialPickups() {
  world8.afterEvents.entityItemPickup.subscribe((ev) => {
    const p = ev.entity;
    if (!(p instanceof Player10)) return;
    for (const stack of ev.items) {
      const h = MATERIAL_HINTS[stack.typeId];
      if (h && !hasEntry(p, h[0])) describeMaterial(p, stack.typeId);
    }
  }, { entityFilter: { type: "minecraft:player" }, itemFilter: { includeTypes: Object.keys(MATERIAL_HINTS) } });
}
function giveOrDrop(p, stack) {
  const inv = p.getComponent("minecraft:inventory");
  const left = inv?.container?.addItem(stack);
  if (left) p.dimension.spawnItem(left, p.location);
}

// ../../scripts_src/creatures/hollowed.ts
import { Player as Player11, world as world9 } from "@minecraft/server";
var hs = /* @__PURE__ */ new Map();
var lures = /* @__PURE__ */ new Map();
var hollowedCount = () => hs.size;
var isHollowedTracked = (id) => hs.has(id);
var isLureTracked = (id) => lures.has(id);
function track(e, juvenile) {
  hs.set(e.id, {
    id: e.id,
    dim: e.dimension.id,
    born: now(),
    state: juvenile ? "investigate" : "calm",
    stateAt: now(),
    alertAt: -999,
    pos: e.location,
    lastSeenPlayer: now(),
    juvenile
  });
}
function tryStartHollowed(p) {
  const s = settings();
  if (!s.hollowed || hollowDay() < s.graceDays) return false;
  const c = ctx(p);
  if (!c.overworld || !c.underground || !huntable(p) || !cooldownReady(p, "hollowed")) return false;
  const maxY = hollowDay() < 3 ? 0 : 40;
  if (p.location.y > maxY) return false;
  let nearCount = 0;
  for (const h of hs.values()) if (h.dim === p.dimension.id && distSq(h.pos, p.location) < 48 * 48) nearCount++;
  if (nearCount >= (s.intensity === 2 ? 3 : 2) || hs.size >= 6) return false;
  if (!chance(0.15 * chanceScale())) return false;
  const dim = p.dimension;
  const head = p.getHeadLocation();
  for (let k = 0; k < 6; k++) {
    const d = yawDir(rand(0, 360));
    const r = rand(18, 30);
    const g = groundNear(dim, p.location.x + d.x * r, p.location.y + rand(-4, 4), p.location.z + d.z * r, 6, 2);
    if (!g) continue;
    try {
      if (dim.getLightLevel(add(g, { x: 0, y: 0.5, z: 0 })) > 3) continue;
    } catch {
      continue;
    }
    if (hasBlockNear(dim, g, LIGHT_BLOCKS, 6, 3, 6)) continue;
    if (clearLine(dim, head, add(g, { x: 0, y: 0.6, z: 0 }))) continue;
    let e;
    try {
      e = dim.spawnEntity(ENT.hollowed, g);
    } catch {
      continue;
    }
    e.setDynamicProperty(DP.owner, p.id);
    track(e, false);
    setCooldown(p, "hollowed", seconds(rand(150, 240) * cooldownScale()));
    return true;
  }
  return false;
}
function spawnJuvenile(dim, at) {
  try {
    const e = dim.spawnEntity(ENT.hollowed, at);
    e.triggerEvent("hollow:make_juvenile");
    track(e, true);
    return e;
  } catch {
    return void 0;
  }
}
function placeLure(dim, at) {
  for (const l of lures.values()) {
    if (l.dim === dim.id && distSq(l.at, at) < 16) {
      const e = world9.getEntity(l.id);
      if (e?.isValid) {
        try {
          e.teleport(at);
          l.at = at;
          l.born = now();
          return;
        } catch {
        }
      }
      lures.delete(l.id);
      break;
    }
  }
  if (lures.size >= 8) {
    const oldest = [...lures.values()].sort((a, b) => a.born - b.born)[0];
    removeLure(oldest);
  }
  try {
    const e = dim.spawnEntity(ENT.lure, { x: at.x, y: at.y + 0.5, z: at.z });
    lures.set(e.id, { id: e.id, dim: dim.id, at, born: now() });
  } catch {
  }
}
function removeLure(l) {
  lures.delete(l.id);
  const e = world9.getEntity(l.id);
  if (e?.isValid) {
    try {
      e.remove();
    } catch {
    }
  }
}
function hear(n) {
  let heard = false;
  for (const h of hs.values()) {
    if (h.dim !== n.dim.id) continue;
    const d = dist(h.pos, n.at);
    if (d > n.radius) continue;
    const e = world9.getEntity(h.id);
    if (!e?.isValid) continue;
    heard = true;
    if (now() - h.alertAt > 80) {
      h.alertAt = now();
      worldSound(e.dimension, SND.hollowedAlert, e.location, 1, 0.95 + Math.random() * 0.1);
    }
    if (h.state !== "investigate") {
      try {
        e.triggerEvent("hollow:investigate");
      } catch {
        continue;
      }
      h.state = "investigate";
    }
    h.stateAt = now();
    if (n.source && dist(n.source.location, h.pos) < 24) unlock(n.source, "hollowed2");
  }
  if (heard) placeLure(n.dim, n.at);
}
function listenersNear(dim, at, radius) {
  const r2 = (radius + 2) * (radius + 2);
  for (const h of hs.values()) if (h.dim === dim.id && distSq(h.pos, at) <= r2) return true;
  return false;
}
function pollMovement(p) {
  if (hs.size === 0 || !ctx(p).underground) return;
  if (!listenersNear(p.dimension, p.location, 18)) return;
  const { radius, kind } = movementNoise(p);
  if (radius > 0) emitNoise({ dim: p.dimension, at: p.location, radius, kind, source: p });
}
function update() {
  const t = now();
  for (const l of [...lures.values()]) if (t - l.born > 200) removeLure(l);
  for (const h of [...hs.values()]) {
    const e = world9.getEntity(h.id);
    if (!e?.isValid) {
      hs.delete(h.id);
      continue;
    }
    h.pos = e.location;
    let players = [];
    try {
      players = e.dimension.getPlayers({ location: e.location, maxDistance: 64 });
    } catch {
    }
    if (players.length > 0) h.lastSeenPlayer = t;
    else if (t - h.lastSeenPlayer > 600) {
      hs.delete(h.id);
      try {
        e.remove();
      } catch {
      }
      continue;
    }
    for (const p of players) if (dist(p.location, e.location) < 20) unlock(p, "hollowed1");
    if (h.state === "investigate" && !h.juvenile) {
      const lureNear = [...lures.values()].some((l) => l.dim === h.dim && distSq(l.at, h.pos) < 36 * 36);
      if (!lureNear || t - h.stateAt > 240) {
        worldSound(e.dimension, SND.hollowedSniff, e.location, 0.8);
        try {
          e.triggerEvent("hollow:calm");
        } catch {
        }
        h.state = "calm";
        h.stateAt = t;
      }
    }
  }
}
function onHollowedDied(id, killer) {
  hs.delete(id);
  if (killer instanceof Player11) unlock(killer, "hollowed3");
}
function startHollowed() {
  setListenerCheck(listenersNear);
  onNoise(hear);
  every("hollowed.update", 20, update, 5);
  everyPlayer("hollowed.steps", 10, pollMovement);
}

// ../../scripts_src/creatures/heart.ts
var FIGHT = DP.fight;
var EMPTY = {
  active: false,
  dim: "minecraft:overworld",
  center: { x: 0, y: 0, z: 0 },
  heartId: "",
  veins: [],
  phase: 1,
  regrown: false,
  startedAt: 0,
  restUntilDay: -1,
  participants: {},
  token: 0,
  scale: 1
};
var boss = EMPTY;
var loaded = false;
var minions = /* @__PURE__ */ new Set();
var nextBurst = 0;
var nextPulse = 0;
var nextGaze = 0;
var nextBeat = 0;
var nextDrone = 0;
var lastPresence = 0;
var rising = false;
var missingSince = -1;
var gazeHit = /* @__PURE__ */ new Map();
function load() {
  if (!loaded) {
    boss = { ...EMPTY, ...readWorld(DP.boss, EMPTY) };
    loaded = true;
    lastPresence = now();
  }
  return boss;
}
function save2() {
  writeWorld(DP.boss, boss);
}
function inBossArena(p) {
  if (!load().active || p.dimension.id !== boss.dim) return false;
  const c = boss.center;
  return Math.hypot(p.location.x - c.x, p.location.z - c.z) <= 18 && Math.abs(p.location.y - c.y) < 9;
}
var isBossEntity = (id) => load().active && (id === boss.heartId || boss.veins.includes(id));
function isCurrentFightEntity(e) {
  if (!load().active || !boss.token) return false;
  try {
    return e.getDynamicProperty(FIGHT) === boss.token;
  } catch {
    return false;
  }
}
function arenaLoaded(dim) {
  try {
    return dim.isChunkLoaded(boss.center);
  } catch {
    return false;
  }
}
function dimOf() {
  try {
    return world10.getDimension(boss.dim);
  } catch {
    return void 0;
  }
}
function arenaPlayers() {
  const dim = dimOf();
  if (!dim) return [];
  try {
    return dim.getPlayers({ location: boss.center, maxDistance: 18 }).filter((p) => Math.abs(p.location.y - boss.center.y) < 9);
  } catch {
    return [];
  }
}
function survival(p) {
  const gm = p.getGameMode();
  return gm === GameMode3.Survival || gm === GameMode3.Adventure;
}
function veinSpots(c) {
  const out = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out.push({ x: c.x + sx * 4.3, y: c.y + 1.5, z: c.z + sz * 4.3 });
    }
  }
  return out;
}
function setAltar(dim, awake) {
  for (const loc of findBlocks(dim, boss.center, [BLOCK.altar], 13, 6, 13, 2)) {
    const b = block(dim, loc);
    if (!b) continue;
    try {
      b.setPermutation(withCustomState(b.permutation, "hollow:awake", awake ? 1 : 0));
    } catch {
    }
    return b;
  }
  return void 0;
}
function useAltar(p, altar) {
  load();
  const eq = p.getComponent("minecraft:equippable");
  const held = eq?.getEquipment(EquipmentSlot3.Mainhand);
  if (boss.active) {
    notice(p, "§7The Heart is already awake.");
    return;
  }
  if (hollowDay() < boss.restUntilDay) {
    notice(p, `§7The altar is cold. It will wake again in ${boss.restUntilDay - hollowDay()} day(s).`);
    return;
  }
  if (held?.typeId !== ITEM.offering) {
    notice(p, "§7A socket of old roots. It waits for an §fOffering of Silence§7.");
    unlock(p, "craft_offering");
    return;
  }
  const s = shrine();
  const dim = altar.dimension;
  const center = s && s.d === dim.id ? { x: s.x + Math.floor(s.sx / 2) + 0.5, y: s.y + 3, z: s.z + Math.floor(s.sz / 2) + 0.5 } : add(altar.location, { x: 0.5, y: 1, z: 9.5 });
  if (survival(p)) {
    if (held.amount > 1) {
      held.amount -= 1;
      eq.setEquipment(EquipmentSlot3.Mainhand, held);
    } else eq.setEquipment(EquipmentSlot3.Mainhand, void 0);
  }
  awaken(dim, center, altar);
}
function awaken(dim, center, altar) {
  boss = {
    ...EMPTY,
    active: true,
    dim: dim.id,
    center,
    startedAt: now(),
    restUntilDay: boss.restUntilDay,
    participants: {},
    token: 1 + Math.floor(Math.random() * 2e9),
    scale: 1
  };
  const players = arenaPlayers();
  const n = Math.max(1, players.length);
  boss.scale = n;
  save2();
  worldSound(dim, SND.altar, altar.center());
  worldSound(dim, SND.heartAwaken, center, 1);
  try {
    altar.setPermutation(withCustomState(altar.permutation, "hollow:awake", 1));
  } catch {
  }
  for (const p of players) {
    pushFog(p, FOG.heart, "hollow_heart");
    unlock(p, "heart1");
    unlock(p, "heart2");
    try {
      p.onScreenDisplay.setTitle("§4The Heart Below", { subtitle: "§7wakes", fadeInDuration: 20, stayDuration: 50, fadeOutDuration: 30 });
    } catch {
    }
  }
  rising = true;
  later("heart.rise", 120, () => rise(dim));
}
function rise(dim) {
  rising = false;
  if (!boss.active || boss.heartId) return;
  const n = boss.scale;
  let heart;
  try {
    heart = dim.spawnEntity(ENT.heart, boss.center);
  } catch (e) {
    console.warn(`[hollow] heart spawn failed: ${e}`);
    dormant(dim);
    return;
  }
  heart.setDynamicProperty(FIGHT, boss.token);
  if (settings().bossScaling && n >= 2) {
    try {
      heart.triggerEvent(n >= 4 ? "hollow:scale_4" : n === 3 ? "hollow:scale_3" : "hollow:scale_2");
    } catch {
    }
  }
  boss.heartId = heart.id;
  spawnVeins(dim, 4, n);
  nextBurst = now() + 100;
  nextPulse = now() + 240;
  nextGaze = now() + 9999;
  nextBeat = now();
  nextDrone = now() + 40;
  lastPresence = now();
  save2();
}
function spawnVeins(dim, count, players) {
  const spots = veinSpots(boss.center).slice(0, count);
  for (const at of spots) {
    try {
      const v = dim.spawnEntity(ENT.vein, at);
      v.setDynamicProperty(FIGHT, boss.token);
      if (players >= 3) v.triggerEvent("hollow:tough");
      boss.veins.push(v.id);
      particle(dim, PARTICLE.veinMote, at);
    } catch {
    }
  }
}
function hurt(p, amount, heart) {
  try {
    p.applyDamage(amount, heart ? { cause: EntityDamageCause.entityAttack, damagingEntity: heart } : { cause: EntityDamageCause.entityAttack });
  } catch {
  }
}
function rootBurst(dim, heart, players) {
  for (const p of players.slice(0, 5)) {
    const g = groundNear(dim, p.location.x, p.location.y, p.location.z, 3, 2) ?? p.location;
    const at = { x: g.x, y: g.y, z: g.z };
    particle(dim, PARTICLE.rootWarn, at);
    worldSound(dim, SND.heartRootWarn, at, 0.9);
    later("heart.burst", 24, () => {
      if (!boss.active) return;
      worldSound(dim, SND.heartRootStrike, at, 1);
      try {
        dim.spawnEntity(ENT.rootSpike, at);
      } catch {
      }
      for (const q of dim.getPlayers({ location: at, maxDistance: 2.6 })) {
        if (distXZ(q.location, at) > 1.7 || Math.abs(q.location.y - at.y) > 2.5) continue;
        hurt(q, 6, heart.isValid ? heart : void 0);
        try {
          q.applyKnockback({ x: 0, z: 0 }, 0.55);
        } catch {
        }
      }
    });
  }
}
function pulse(dim, heart, players) {
  worldSound(dim, SND.heartBeatFast, heart.location, 1);
  particle(dim, PARTICLE.spores, add(heart.location, { x: 0, y: 2.5, z: 0 }));
  later("heart.pulse", 20, () => {
    if (!boss.active) return;
    const origin = { x: boss.center.x, y: boss.center.y - 1.8, z: boss.center.z };
    worldSound(dim, SND.heartPulse, origin, 1);
    particle(dim, PARTICLE.pulseRing, add(origin, { x: 0, y: 0.15, z: 0 }));
    for (const p of players) {
      const d = distXZ(p.location, origin);
      if (d < 2 || d > 15) continue;
      const delay = Math.max(1, Math.round(d / 9 * 20));
      later("heart.pulse.hit", delay, () => {
        if (!boss.active || !p.isValid) return;
        const dNow = distXZ(p.location, origin);
        if (!p.isOnGround || Math.abs(dNow - d) > 2.2) return;
        hurt(p, 5, heart.isValid ? heart : void 0);
        const out = norm(sub(p.location, origin));
        try {
          p.applyKnockback({ x: out.x * 0.7, z: out.z * 0.7 }, 0.25);
        } catch {
        }
      });
    }
  });
}
function gaze(dim, heart, players) {
  if (players.length === 0) return;
  const target = players[Math.floor(Math.random() * players.length)];
  const core = add(heart.location, { x: 0, y: 1.3, z: 0 });
  worldSound(dim, SND.heartDrone, core, 1);
  particle(dim, PARTICLE.spores, core);
  const start = norm(sub(target.location, core));
  const dir0 = { x: start.x, y: 0, z: start.z };
  const sweep = Math.random() < 0.5 ? -1 : 1;
  for (let k = 0; k <= 12; k++) {
    later("heart.gaze", 30 + k * 5, () => {
      if (!boss.active || !heart.isValid) return;
      const dir = norm(rotateXZ(dir0, sweep * (k - 6) * 9));
      for (let s = 2; s <= 22; s += 2.5) particle(dim, PARTICLE.veinMote, add(core, scale(dir, s)));
      for (const p of arenaPlayers()) {
        const head = p.getHeadLocation();
        const flat = { x: head.x - core.x, y: 0, z: head.z - core.z };
        if (angleTo(dir, { x: 0, y: 0, z: 0 }, flat) > 11) continue;
        if (!clearLine(dim, core, head)) continue;
        if ((gazeHit.get(p.id) ?? 0) > now()) continue;
        gazeHit.set(p.id, now() + 20);
        hurt(p, 3, heart);
        p.addEffect("slowness", 20, { amplifier: 1, showParticles: false });
      }
    });
  }
}
function hpFraction(e) {
  const h = e.getComponent("minecraft:health");
  return h ? h.currentValue / Math.max(1, h.effectiveMax) : 1;
}
function toPhase(dim, heart, phase) {
  boss.phase = phase;
  worldSound(dim, SND.heartPhase, heart.location, 1);
  const players = arenaPlayers();
  if (phase === 2) {
    try {
      heart.triggerEvent("hollow:phase_2");
      heart.triggerEvent("hollow:shield");
    } catch {
    }
    if (!boss.regrown) {
      boss.regrown = true;
      spawnVeins(dim, 3, players.length);
    }
    const count = Math.min(5, 2 + players.length);
    for (let i = 0; i < count; i++) {
      const a = i / count * 360 + rand(0, 40);
      const d = rotateXZ({ x: 1, y: 0, z: 0 }, a);
      const at = groundNear(dim, boss.center.x + d.x * 10, boss.center.y - 1, boss.center.z + d.z * 10, 3, 1);
      if (!at) continue;
      const m = spawnJuvenile(dim, at);
      if (m) minions.add(m.id);
      worldSound(dim, SND.heartSpawn, at, 0.8);
    }
    for (const p of players) hint(p, "§7The veins grow back. Young ones crawl from the roots. They hunt by sound.");
  } else if (phase === 3) {
    try {
      heart.triggerEvent("hollow:phase_3");
    } catch {
    }
    nextGaze = now() + 60;
    for (const p of players) {
      accent(p, SND.stingerLow, 2, true);
      hint(p, "§7It opens. Stay behind the pillars when it looks for you.");
    }
  }
  save2();
}
function update2() {
  if (!load().active) return;
  const dim = dimOf();
  if (!dim) return;
  const t = now();
  if (!arenaLoaded(dim)) return;
  const players = arenaPlayers();
  if (players.length > 0) lastPresence = t;
  else if (t - lastPresence > 1200) {
    dormant(dim);
    return;
  }
  if (!boss.heartId) {
    if (!rising) rise(dim);
    return;
  }
  const heart = findHeart(dim);
  if (!heart) {
    if (missingSince < 0) missingSince = t;
    else if (t - missingSince > 200) {
      console.warn("[hollow] the Heart is gone without dying; returning the Offering");
      dormant(dim);
    }
    return;
  }
  missingSince = -1;
  for (const p of players) pushFog(p, FOG.heart, "hollow_heart");
  boss.veins = boss.veins.filter((id) => world10.getEntity(id)?.isValid);
  if (boss.veins.length === 0 && heart.getProperty("hollow:shielded") === true) rebindVeins(dim);
  if (boss.veins.length === 0 && boss.phase < 3 && heart.getProperty("hollow:shielded") === true) {
    try {
      heart.triggerEvent("hollow:expose");
    } catch {
    }
    worldSound(dim, SND.heartVeinBreak, heart.location, 1);
    for (const p of players) notice(p, "§cThe Heart is exposed!");
  }
  const hp = hpFraction(heart);
  if (boss.phase === 1 && hp <= 0.6) toPhase(dim, heart, 2);
  else if (boss.phase === 2 && hp <= 0.25) toPhase(dim, heart, 3);
  const beatGap = boss.phase === 3 ? 12 : boss.phase === 2 ? 18 : 24;
  if (t >= nextBeat) {
    nextBeat = t + beatGap;
    worldSound(dim, SND.heartBeat, heart.location, 0.8);
  }
  if (t >= nextDrone) {
    nextDrone = t + 200;
    worldSound(dim, SND.heartDrone, heart.location, 0.6);
  }
  if (players.length === 0) return;
  if (t >= nextBurst) {
    nextBurst = t + Math.round(boss.phase === 3 ? rand(60, 80) : boss.phase === 2 ? rand(90, 110) : rand(120, 140));
    rootBurst(dim, heart, players);
  }
  if (t >= nextPulse) {
    nextPulse = t + (boss.phase === 3 ? 180 : boss.phase === 2 ? 200 : 240);
    pulse(dim, heart, players);
  }
  if (boss.phase === 3 && t >= nextGaze) {
    nextGaze = t + 160;
    gaze(dim, heart, players);
  }
}
function findHeart(dim) {
  const byId = world10.getEntity(boss.heartId);
  if (byId?.isValid) return byId;
  try {
    for (const e of dim.getEntities({ type: ENT.heart, location: boss.center, maxDistance: 24 })) {
      if (e.getDynamicProperty(FIGHT) === boss.token) {
        boss.heartId = e.id;
        rebindVeins(dim);
        save2();
        return e;
      }
    }
  } catch {
  }
  return void 0;
}
function rebindVeins(dim) {
  try {
    const found = dim.getEntities({ type: ENT.vein, location: boss.center, maxDistance: 24 }).filter((e) => e.getDynamicProperty(FIGHT) === boss.token).map((e) => e.id);
    if (found.length > 0) {
      boss.veins = found;
      save2();
    }
  } catch {
  }
}
function clearMinions() {
  for (const id of [...boss.veins, ...minions]) {
    const e = world10.getEntity(id);
    if (e?.isValid) {
      try {
        e.remove();
      } catch {
      }
    }
  }
  minions.clear();
}
function dormant(dim) {
  try {
    for (const type of [ENT.heart, ENT.vein]) {
      for (const e of dim.getEntities({ type, location: boss.center, maxDistance: 24 })) {
        if (e.getDynamicProperty(FIGHT) === boss.token) e.remove();
      }
    }
  } catch {
  }
  clearMinions();
  rising = false;
  missingSince = -1;
  const altar = setAltar(dim, false);
  if (altar) {
    try {
      dim.spawnItem(new ItemStack4(ITEM.offering, 1), add(altar.location, { x: 0.5, y: 1.2, z: 0.5 }));
    } catch {
    }
  }
  boss = { ...EMPTY, restUntilDay: boss.restUntilDay };
  save2();
}
function onBossHurt(hurtEntity, amount, by) {
  if (!isBossEntity(hurtEntity.id) || !(by instanceof Player12)) return;
  boss.participants[by.id] = (boss.participants[by.id] ?? 0) + amount;
}
function onShieldHit(heart) {
  worldSound(heart.dimension, SND.heartRootWarn, heart.location, 0.4);
  for (const p of arenaPlayers()) hint(p, "§7It's shielded. Break the glowing veins on the pillars first.");
}
function onVeinDied(id) {
  if (!load().active) return;
  boss.veins = boss.veins.filter((v) => v !== id);
  save2();
}
function onHeartDied(id) {
  if (!load().active || id !== boss.heartId) return;
  const dim = dimOf();
  const winners = new Set(Object.keys(boss.participants));
  for (const p of arenaPlayers()) winners.add(p.id);
  for (const pid of winners) {
    const p = world10.getEntity(pid);
    if (!p?.isValid) continue;
    giveOrDrop(p, new ItemStack4(ITEM.stilledHeart, 1));
    p.addExperience(150);
    unlock(p, "after");
    unlock(p, "craft_lantern");
    popFog(p, "hollow_heart");
    try {
      p.onScreenDisplay.setTitle("§7The Heart is still.", { fadeInDuration: 20, stayDuration: 60, fadeOutDuration: 40 });
    } catch {
    }
  }
  clearMinions();
  if (dim) setAltar(dim, false);
  boss = { ...EMPTY, restUntilDay: hollowDay() + 3 };
  save2();
}
function forgetBossPlayer(p) {
  popFog(p, "hollow_heart");
}
function startHeart() {
  load();
  every("heart.update", 5, update2, 13);
}
function bossSummary() {
  if (!load().active) return boss.restUntilDay > hollowDay() ? `resting until day ${boss.restUntilDay + 1}` : "dormant";
  return `phase ${boss.phase}, veins ${boss.veins.length}, participants ${Object.keys(boss.participants).length}`;
}

// ../../scripts_src/items/blocks.ts
var LIMITS = { [DP.chimes]: 32, [DP.wards]: 32, lanterns: 16 };
var LANTERNS = "hollow:lanterns";
var cache2 = /* @__PURE__ */ new Map();
function list(key) {
  let l = cache2.get(key);
  if (!l) {
    l = readWorldArray(key).filter((s) => typeof s?.x === "number");
    cache2.set(key, l);
  }
  return l;
}
function persist(key) {
  writeWorld(key, list(key));
}
var same = (s, d, loc) => s.d === d.id && s.x === Math.floor(loc.x) && s.y === Math.floor(loc.y) && s.z === Math.floor(loc.z);
function register(key, b, limit) {
  const l = list(key);
  if (l.some((s) => same(s, b.dimension, b.location))) return true;
  if (l.length >= limit) return false;
  l.push({ d: b.dimension.id, x: b.location.x, y: b.location.y, z: b.location.z });
  persist(key);
  return true;
}
function unregister(key, d, loc) {
  const l = list(key);
  const i = l.findIndex((s) => same(s, d, loc));
  if (i >= 0) {
    l.splice(i, 1);
    persist(key);
  }
}
function within(key, d, loc, radius) {
  const r2 = radius * radius;
  return list(key).filter((s) => s.d === d.id && distSq({ x: s.x + 0.5, y: s.y + 0.5, z: s.z + 0.5 }, loc) <= r2);
}
var spotLoc = (s) => ({ x: s.x + 0.5, y: s.y + 0.5, z: s.z + 0.5 });
var WARD_RADIUS = 10;
var wardUses = /* @__PURE__ */ new Map();
function chargesOf(perm) {
  const used = getCustomState(perm, "hollow:used");
  return 4 - (typeof used === "number" ? used : 0);
}
function wardCharges(b) {
  if (!b || b.typeId !== BLOCK.ward) return -1;
  return chargesOf(b.permutation);
}
function setWardCharges(b, n) {
  try {
    b.setPermutation(withCustomState(b.permutation, "hollow:used", 4 - Math.max(0, Math.min(4, n))));
  } catch {
  }
}
function wardNear(dim, loc) {
  for (const s of within(DP.wards, dim, loc, WARD_RADIUS)) {
    const b = block(dim, s);
    const c = wardCharges(b);
    if (c < 0) {
      unregister(DP.wards, dim, s);
      continue;
    }
    if (c > 0) return b;
  }
  return void 0;
}
function useWard(ward, creature) {
  const key = `${ward.location.x},${ward.location.y},${ward.location.z}|${creature}|${nightKey()}`;
  const loc = ward.center();
  worldSound(ward.dimension, SND.wardRepel, loc);
  particle(ward.dimension, PARTICLE.wardGlow, loc);
  if (wardUses.has(key)) return;
  wardUses.set(key, now());
  if (wardUses.size > 256) wardUses.clear();
  const c = wardCharges(ward);
  setWardCharges(ward, c - 1);
  if (c - 1 <= 0) worldSound(ward.dimension, SND.wardSpent, loc);
}
function lanternNear(dim, loc, radius = 24) {
  for (const s of within(LANTERNS, dim, loc, radius)) {
    const b = block(dim, s);
    if (b?.typeId === BLOCK.lantern) return true;
    unregister(LANTERNS, dim, s);
  }
  return false;
}
function protectedSpot(dim, loc) {
  return lanternNear(dim, loc);
}
var chimeCooldown = /* @__PURE__ */ new Map();
function ringChimes() {
  const l = list(DP.chimes);
  if (l.length === 0) return;
  const t = now();
  for (const s of [...l]) {
    let dim;
    try {
      dim = world11.getDimension(s.d);
    } catch {
      continue;
    }
    const loc = spotLoc(s);
    try {
      if (!dim.isChunkLoaded(loc)) continue;
    } catch {
      continue;
    }
    const key = `${s.d}|${s.x},${s.y},${s.z}`;
    if ((chimeCooldown.get(key) ?? 0) > t) continue;
    if (dim.getPlayers({ location: loc, maxDistance: 64 }).length === 0) continue;
    const b = block(dim, s);
    if (!b || b.typeId !== BLOCK.chime) {
      unregister(DP.chimes, dim, s);
      continue;
    }
    if (getCustomState(b.permutation, "hollow:silenced") === 1) continue;
    const near = dim.getEntities({ location: loc, maxDistance: 14, families: [FAMILY.creature] });
    if (near.length === 0) continue;
    chimeCooldown.set(key, t + 120);
    worldSound(dim, SND.chime, loc, 0.9, 0.95 + Math.random() * 0.1);
    particle(dim, PARTICLE.chimeRing, loc);
  }
}
function isSurvivalish(p) {
  const gm = p.getGameMode();
  return gm === GameMode4.Survival || gm === GameMode4.Adventure;
}
function registerBlockComponents(ev) {
  ev.blockComponentRegistry.registerCustomComponent("hollow:chime", {
    onPlace(e) {
      if (!register(DP.chimes, e.block, LIMITS[DP.chimes])) {
        for (const p of e.dimension.getPlayers({ location: e.block.location, maxDistance: 8 })) {
          notice(p, "§7This world already has 32 active chimes. This one will stay silent.");
        }
      }
    },
    onPlayerBreak(e) {
      unregister(DP.chimes, e.dimension, e.block.location);
    },
    onBreak(e) {
      unregister(DP.chimes, e.dimension, e.block.location);
    },
    onPlayerInteract(e) {
      const b = e.block;
      const silenced = getCustomState(b.permutation, "hollow:silenced") === 1;
      try {
        b.setPermutation(withCustomState(b.permutation, "hollow:silenced", silenced ? 0 : 1));
      } catch {
        return;
      }
      if (e.player) {
        ui(e.player, SND.chime, 0.35, silenced ? 1.2 : 0.7);
        notice(e.player, silenced ? "§7Chime unsilenced." : "§7Chime silenced.");
      }
    }
  });
  ev.blockComponentRegistry.registerCustomComponent("hollow:ward", {
    onPlace(e) {
      if (!register(DP.wards, e.block, LIMITS[DP.wards])) {
        for (const p of e.dimension.getPlayers({ location: e.block.location, maxDistance: 8 })) {
          notice(p, "§7This world already has 32 active wards. This one will stay cold.");
        }
      }
      worldSound(e.dimension, SND.wardPlace, e.block.center());
    },
    onPlayerBreak(e) {
      unregister(DP.wards, e.dimension, e.block.location);
      const p = e.player;
      if (!p || !isSurvivalish(p)) return;
      const c = chargesOf(e.brokenBlockPermutation);
      const at = e.block.center();
      const drops = c === 4 ? [new ItemStack5(ITEM.ward, 1)] : [new ItemStack5("minecraft:iron_nugget", 2), new ItemStack5("minecraft:string", 1)];
      for (const d of drops) e.dimension.spawnItem(d, at);
    },
    onBreak(e) {
      unregister(DP.wards, e.dimension, e.block.location);
    },
    onPlayerInteract(e) {
      const p = e.player;
      if (!p) return;
      const b = e.block;
      const c = wardCharges(b);
      const eq = p.getComponent("minecraft:equippable");
      const held = eq?.getEquipment(EquipmentSlot4.Mainhand);
      if (held?.typeId === "minecraft:charcoal" && c < 4) {
        setWardCharges(b, c + 1);
        if (isSurvivalish(p)) {
          if (held.amount > 1) {
            held.amount -= 1;
            eq.setEquipment(EquipmentSlot4.Mainhand, held);
          } else eq.setEquipment(EquipmentSlot4.Mainhand, void 0);
        }
        register(DP.wards, b, LIMITS[DP.wards]);
        worldSound(e.dimension, SND.wardPlace, b.center(), 0.8, 1.2);
        particle(e.dimension, PARTICLE.wardGlow, b.center());
        notice(p, `§7The ward smoulders. Charges: §f${c + 1}/4`);
      } else {
        notice(p, c > 0 ? `§7Rowan Ward · charges §f${c}/4§7 · add charcoal to recharge` : "§7The ward is spent. Use charcoal on it to rekindle it.");
      }
    }
  });
  ev.blockComponentRegistry.registerCustomComponent("hollow:altar", {
    onPlayerInteract(e) {
      const p = e.player;
      if (p) useAltar(p, e.block);
    }
  });
  ev.blockComponentRegistry.registerCustomComponent("hollow:lantern", {
    onPlace(e) {
      register(LANTERNS, e.block, LIMITS.lanterns);
    },
    onPlayerBreak(e) {
      unregister(LANTERNS, e.dimension, e.block.location);
    },
    onBreak(e) {
      unregister(LANTERNS, e.dimension, e.block.location);
    }
  });
}
function startBlockSystems() {
  every("chimes", 40, ringChimes, 7);
}

// ../../scripts_src/creatures/borrowed.ts
var encs = /* @__PURE__ */ new Map();
var borrowedCount = () => encs.size;
var isBorrowedTracked = (id) => encs.has(id);
function setState(e, enc, s) {
  if (enc.state === s) return;
  enc.state = s;
  enc.stateAt = now();
  try {
    e.triggerEvent(s === "revealed" ? "hollow:reveal" : s === "fleeing" ? "hollow:flee" : "minecraft:entity_spawned");
  } catch {
  }
}
function playersNear(e, r) {
  try {
    return e.dimension.getPlayers({ location: e.location, maxDistance: r });
  } catch {
    return [];
  }
}
function teach(e, deep) {
  for (const p of playersNear(e, 24)) {
    unlock(p, "borrowed1");
    if (deep) unlock(p, "borrowed2");
  }
}
function reveal(e, enc, why, by) {
  if (enc.state !== "disguised") return;
  const night = isDarkHours();
  setState(e, enc, night ? "revealed" : "fleeing");
  teach(e, true);
  for (const p of playersNear(e, 32)) accent(p, SND.stingerLow, 2);
  if (by) hint(by, why === "shears" ? "§7The wool doesn't shear. It peels away in one wet sheet." : "§7That was never a sheep.");
}
function tryStartBorrowed(p) {
  const s = settings();
  if (!s.borrowed || hollowDay() < 1) return false;
  const c = ctx(p);
  if (!c.overworld || c.underground || c.inWater) return false;
  if (!huntable(p) || !cooldownReady(p, "borrowed")) return false;
  if (encs.size >= Math.min(2, Math.max(1, onlinePlayers().length))) return false;
  for (const enc of encs.values()) if (enc.target === p.id) return false;
  const base = isDarkHours() ? 0.12 : 0.04;
  if (!chance(base * chanceScale())) return false;
  if (lanternNear(p.dimension, p.location)) return false;
  const dim = p.dimension;
  let flock;
  try {
    flock = dim.getEntities({ type: "minecraft:sheep", location: p.location, maxDistance: 56, minDistance: 16 });
  } catch {
    return false;
  }
  if (flock.length < 2) return false;
  const head = p.getHeadLocation();
  const hidden = flock.filter((sh) => angleTo(p.getViewDirection(), head, sh.location) > 75 || !clearLine(dim, head, add(sh.location, { x: 0, y: 0.8, z: 0 })));
  if (hidden.length === 0) return false;
  const sheep = pick(hidden);
  const g = groundNear(dim, sheep.location.x + rand(-2, 2), sheep.location.y, sheep.location.z + rand(-2, 2), 4, 2);
  if (!g || dist(g, p.location) < 14) return false;
  let e;
  try {
    e = dim.spawnEntity(ENT.borrowed, g, { initialRotation: rand(0, 360) });
  } catch {
    return false;
  }
  e.setDynamicProperty(DP.owner, p.id);
  encs.set(e.id, { id: e.id, target: p.id, born: now(), state: "disguised", stateAt: now(), close: 0, noticed: /* @__PURE__ */ new Set(), nextWrong: now() + seconds(30) });
  setCooldown(p, "borrowed", seconds(rand(600, 900) * cooldownScale()));
  return true;
}
function vanish(e, enc) {
  encs.delete(enc.id);
  if (e?.isValid) {
    try {
      e.remove();
    } catch {
    }
  }
}
function hpFraction2(e) {
  const h = e.getComponent("minecraft:health");
  return h ? h.currentValue / Math.max(1, h.effectiveMax) : 1;
}
function update3() {
  if (encs.size === 0) return;
  const t = now();
  for (const enc of [...encs.values()]) {
    const e = world12.getEntity(enc.id);
    if (!e || !e.isValid) {
      encs.delete(enc.id);
      continue;
    }
    const near = playersNear(e, 72);
    const age = t - enc.born;
    const inState = t - enc.stateAt;
    if (near.length === 0 && age > seconds(60)) {
      vanish(e, enc);
      continue;
    }
    if (enc.state === "disguised") {
      const ward = wardNear(e.dimension, e.location);
      if (ward) {
        useWard(ward, "borrowed");
        reveal(e, enc, "ward");
        setState(e, enc, "fleeing");
        continue;
      }
      if (lanternNear(e.dimension, e.location)) {
        vanish(e, enc);
        continue;
      }
      if (isDay() && age > seconds(180) && playersNear(e, 24).length === 0) {
        vanish(e, enc);
        continue;
      }
      const night = isDarkHours();
      for (const p of playersNear(e, 16)) {
        if (enc.noticed.has(p.id)) continue;
        if (clearLine(e.dimension, p.getHeadLocation(), add(e.location, { x: 0, y: 1, z: 0 }))) {
          enc.noticed.add(p.id);
          if (night) unlock(p, "borrowed1");
        }
      }
      if (night && t >= enc.nextWrong && playersNear(e, 24).length > 0) {
        enc.nextWrong = t + seconds(rand(35, 70));
        if (chance(0.45)) worldSound(e.dimension, SND.borrowedWrong, e.location, 0.8);
      }
      if (!night) {
        enc.close = 0;
        continue;
      }
      const close = playersNear(e, 4).filter((p) => huntable(p) && !holdingLight(p) && !inLitArea(p, 4));
      enc.close = close.length > 0 ? enc.close + 10 : Math.max(0, enc.close - 10);
      if (enc.close >= 40) reveal(e, enc, "close", close[0]);
      continue;
    }
    if (enc.state === "revealed") {
      if (hpFraction2(e) < 0.4 || isDay()) {
        setState(e, enc, "fleeing");
        continue;
      }
      if (inState > seconds(60) && playersNear(e, 24).length === 0) vanish(e, enc);
      continue;
    }
    const seen = near.some((p) => dist(p.location, e.location) < 20 && clearLine(e.dimension, p.getHeadLocation(), add(e.location, { x: 0, y: 1, z: 0 })));
    if (inState > seconds(10) && !seen || inState > seconds(30)) vanish(e, enc);
  }
}
function onBorrowedSheared(e, by) {
  const enc = encs.get(e.id);
  if (!enc) return;
  if (by) unlock(by, "borrowed2");
  reveal(e, enc, "shears", by);
}
function onBorrowedHurt(e, by) {
  const enc = encs.get(e.id);
  if (!enc) return;
  if (enc.state === "disguised") reveal(e, enc, "hurt", by instanceof Player14 ? by : void 0);
  else if (enc.state === "revealed" && hpFraction2(e) < 0.4) setState(e, enc, "fleeing");
}
function onBorrowedDied(id, killer) {
  encs.delete(id);
  if (killer instanceof Player14) {
    unlock(killer, "borrowed1");
    unlock(killer, "borrowed2");
  }
}
function forgetBorrowedTarget(playerId) {
  for (const enc of [...encs.values()]) {
    if (enc.target === playerId && enc.state === "disguised") vanish(world12.getEntity(enc.id), enc);
  }
}
function startBorrowed() {
  every("borrowed.update", 10, update3, 3);
}

// ../../scripts_src/creatures/knocker.ts
import { Difficulty as Difficulty2, ItemStack as ItemStack6, Player as Player15, world as world13 } from "@minecraft/server";
var visit;
var SAVE = DP.knocker;
var knockerActive = () => !!visit;
var isKnockerTracked = (id) => visit?.id === id;
var savedCache;
function saved() {
  if (!savedCache) savedCache = readWorld(SAVE, { lastNight: -99, plannedKey: -1, planned: false, planTick: 0 });
  return savedCache;
}
function save3(s) {
  savedCache = s;
  writeWorld(SAVE, s);
}
function plan() {
  const s = saved();
  const key = nightKey();
  if (s.plannedKey === key) return s;
  const cfg = settings();
  const gap = [3, 2, 1][cfg.intensity];
  const night = hollowNight();
  const eligible = cfg.knocker && night >= cfg.knockerNight && night - s.lastNight >= gap;
  const next = {
    ...s,
    plannedKey: key,
    planned: eligible && chance(Math.min(0.9, 0.45 * chanceScale())),
    planTick: Math.round(rand(13600, 19e3))
  };
  save3(next);
  return next;
}
function doorLower(dim, loc) {
  const below = block(dim, { x: loc.x, y: loc.y - 1, z: loc.z });
  return below && DOORS.includes(below.typeId) ? { x: loc.x, y: loc.y - 1, z: loc.z } : loc;
}
function outsideDir(dim, door) {
  let best;
  let bestSky = -1;
  for (const d of [{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }]) {
    const at = add(door, d);
    try {
      const sky = dim.getSkyLightLevel(add(at, { x: 0.5, y: 1.5, z: 0.5 }));
      if (sky > bestSky) {
        bestSky = sky;
        best = d;
      }
    } catch {
    }
  }
  return bestSky >= 8 ? best : void 0;
}
function doorOpen(dim, door) {
  const b = block(dim, door);
  if (!b || !DOORS.includes(b.typeId)) return true;
  return getCustomState(b.permutation, "open_bit") === true;
}
function insidePlayers(v) {
  try {
    return world13.getDimension(v.dim).getPlayers({ location: v.door, maxDistance: 18 });
  } catch {
    return [];
  }
}
function tryVisit() {
  if (visit) return;
  const t = tod();
  if (t < 13300 || t > 21500) return;
  const s = plan();
  if (!s.planned || t < s.planTick) return;
  const candidates = [];
  for (const p2 of onlinePlayers()) {
    if (!huntable(p2) || isNewcomer(p2)) continue;
    const c = ctx(p2, 0);
    if (!c.overworld || c.underground || !c.roofed) continue;
    if (lanternNear(p2.dimension, p2.location)) continue;
    const doors2 = findBlocks(p2.dimension, p2.location, DOORS, 10, 4, 10, 12);
    if (doors2.length > 0) candidates.push({ p: p2, doors: doors2 });
  }
  if (candidates.length === 0) return;
  const { p, doors } = pick(candidates);
  const dim = p.dimension;
  doors.sort((a, b) => dist(a, p.location) - dist(b, p.location));
  for (const d of doors.slice(0, 3)) {
    const door = doorLower(dim, d);
    const out = outsideDir(dim, door);
    if (!out) continue;
    for (let k = 0; k < 5; k++) {
      const r = rand(18, 26);
      const side = { x: out.z, y: 0, z: -out.x };
      const lateral = rand(-6, 6);
      const target = add(add(door, scale(out, r)), scale(side, lateral));
      const g = groundNear(dim, target.x, door.y, target.z, 8, 3);
      if (!g) continue;
      if (clearLine(dim, p.getHeadLocation(), add(g, { x: 0, y: 2, z: 0 }))) continue;
      let e;
      try {
        e = dim.spawnEntity(ENT.knocker, g);
      } catch {
        continue;
      }
      e.setDynamicProperty(DP.owner, p.id);
      visit = {
        id: e.id,
        target: p.id,
        dim: dim.id,
        door,
        out,
        started: now(),
        phase: "approach",
        phaseAt: now(),
        step: 0,
        nailDone: false,
        broke: false,
        wardChecked: false
      };
      save3({ ...saved(), lastNight: hollowNight(), planned: false });
      return;
    }
  }
}
function setPhase(e, v, p) {
  if (v.phase === p) return;
  v.phase = p;
  v.phaseAt = now();
  const ev = p === "knock" ? "hollow:at_door" : p === "hunt" ? "hollow:hunt" : p === "leave" ? "hollow:leave" : void 0;
  if (ev) {
    try {
      e.triggerEvent(ev);
    } catch {
    }
  }
}
function end(e) {
  visit = void 0;
  if (e?.isValid) {
    try {
      e.remove();
    } catch {
    }
  }
}
var SCRIPT = [
  [0, SND.knock, 1],
  [160, SND.knock, 1],
  [300, SND.scratch, 0.9],
  [420, SND.knockerBreath, 0.8],
  [600, SND.knock, 1],
  [760, SND.scratch, 0.9]
];
var KNOCK_END = 900;
var nextTry = 0;
function update4() {
  const v = visit;
  if (!v) {
    if (now() < nextTry) return;
    nextTry = now() + 100;
    tryVisit();
    return;
  }
  const e = world13.getEntity(v.id);
  if (!e?.isValid) {
    visit = void 0;
    return;
  }
  const dim = e.dimension;
  const inState = now() - v.phaseAt;
  const inside = insidePlayers(v);
  const daybreak = isDay();
  if (v.phase === "approach") {
    const d = dist(e.location, add(v.door, { x: 0.5, y: 0, z: 0.5 }));
    if (!v.wardChecked && d < 12) {
      v.wardChecked = true;
      const ward = wardNear(dim, v.door);
      if (ward) {
        useWard(ward, "knocker");
        for (const p of inside) {
          unlock(p, "knocker1");
          hint(p, "§7Something stopped outside. The ward flared, and it went away.");
        }
        setPhase(e, v, "leave");
        return;
      }
    }
    if (d <= 2.4) setPhase(e, v, "knock");
    else if (inState > seconds(70) || daybreak) setPhase(e, v, "leave");
    confront(e, v);
    return;
  }
  if (v.phase === "knock") {
    while (v.step < SCRIPT.length && inState >= SCRIPT[v.step][0]) {
      const [, snd, vol] = SCRIPT[v.step];
      worldSound(dim, snd, add(v.door, { x: 0.5, y: 1.2, z: 0.5 }), vol);
      if (v.step === 0) {
        for (const p of inside) {
          unlock(p, "knocker1");
          hint(p, "§8Three knocks at the door.");
        }
      }
      v.step++;
    }
    if (doorOpen(dim, v.door)) {
      answered(e, v);
      return;
    }
    const cfg = settings();
    if (!v.broke && cfg.destructive && world13.getDifficulty() === Difficulty2.Hard && inState >= 600 && chance(0.05)) {
      v.broke = true;
      try {
        e.triggerEvent("hollow:break_in");
      } catch {
      }
      v.phase = "hunt";
      v.phaseAt = now();
      for (const p of inside) notice(p, "§cIt's trying to break the door!");
      return;
    }
    if (inState >= KNOCK_END || daybreak) {
      leaveWithNail(e, v, inside);
      return;
    }
    confront(e, v);
    return;
  }
  if (v.phase === "hunt") {
    const h = e.getComponent("minecraft:health");
    const low = h ? h.currentValue / h.effectiveMax < 0.25 : false;
    if (low || inState > seconds(90) || daybreak) setPhase(e, v, "leave");
    return;
  }
  let nearest = 999;
  try {
    for (const p of dim.getPlayers({ location: e.location, maxDistance: 48 })) nearest = Math.min(nearest, dist(p.location, e.location));
  } catch {
  }
  if (nearest > 40 || inState > seconds(30)) end(e);
}
function confront(e, v) {
  try {
    for (const p of e.dimension.getPlayers({ location: e.location, maxDistance: 5 })) {
      if (!huntable(p)) continue;
      if (ctx(p).roofed) continue;
      setPhase(e, v, "hunt");
      worldSound(e.dimension, SND.knockerLunge, e.location);
      return;
    }
  } catch {
  }
}
function answered(e, v) {
  setPhase(e, v, "hunt");
  worldSound(e.dimension, SND.knockerLunge, add(v.door, { x: 0.5, y: 1, z: 0.5 }));
  for (const p of insidePlayers(v)) {
    unlock(p, "knocker1");
    unlock(p, "knocker3");
    accent(p, SND.stingerLow, 2, true);
  }
}
function leaveWithNail(e, v, inside) {
  setPhase(e, v, "leave");
  const dim = e.dimension;
  worldSound(dim, SND.knockerLeave, add(v.door, { x: 0.5, y: 1, z: 0.5 }), 0.9);
  if (!v.nailDone && v.step > 0) {
    v.nailDone = true;
    const step = add(add(v.door, { x: 0.5, y: 0.2, z: 0.5 }), scale(v.out, 1.2));
    later("knocker.nail", 60, () => {
      try {
        dim.spawnItem(new ItemStack6(ITEM.knockerNail, 1), step);
      } catch {
      }
    });
  }
  for (const p of inside) {
    unlock(p, "knocker2");
    hint(p, "§7Footsteps, dragging away. It's gone. For tonight.");
  }
}
function onKnockerHurt(e, by) {
  const v = visit;
  if (!v || v.id !== e.id) return;
  if (v.phase === "knock" || v.phase === "approach") {
    if (by instanceof Player15) answered(e, v);
  }
}
function onKnockerDied(id, killer) {
  if (visit?.id === id) visit = void 0;
  if (killer instanceof Player15) {
    unlock(killer, "knocker1");
    unlock(killer, "knocker3");
  }
}
function forgetKnockerTarget(playerId) {
  if (visit?.target === playerId && (visit.phase === "approach" || visit.phase === "knock")) {
    const e = world13.getEntity(visit.id);
    if (e) setPhase(e, visit, "leave");
  }
}
function startKnocker() {
  every("knocker.update", 10, update4, 9);
}

// ../../scripts_src/creatures/mirebound.ts
import { EntityDamageCause as EntityDamageCause2, Player as Player16, world as world14 } from "@minecraft/server";
var ms = /* @__PURE__ */ new Map();
var mireboundCount = () => ms.size;
var isMireboundTracked = (id) => ms.has(id);
function setState2(e, m, s) {
  if (m.state === s) return;
  m.state = s;
  m.stateAt = now();
  try {
    e.triggerEvent(`hollow:${s}`);
  } catch {
  }
}
function isWater(id) {
  return id === "minecraft:water" || id === "minecraft:flowing_water";
}
function shallowWater(dim, x, yHint, z) {
  const fx = Math.floor(x), fz = Math.floor(z);
  for (let y = Math.floor(yHint) + 2; y >= Math.floor(yHint) - 6; y--) {
    const b = block(dim, { x: fx, y, z: fz });
    if (!b || !isWater(b.typeId)) continue;
    const above = block(dim, { x: fx, y: y + 1, z: fz });
    if (!above?.isAir) return void 0;
    let depth = 1;
    let floorY = y - 1;
    while (depth <= 3) {
      const d = block(dim, { x: fx, y: floorY, z: fz });
      if (!d) return void 0;
      if (isWater(d.typeId)) {
        depth++;
        floorY--;
        continue;
      }
      if (d.isAir || d.isLiquid) return void 0;
      return depth >= 1 && depth <= 2 ? { x: fx + 0.5, y: floorY + 1, z: fz + 0.5 } : void 0;
    }
    return void 0;
  }
  return void 0;
}
function nearWater(p) {
  if (p.isInWater) return true;
  const dim = p.dimension;
  const f = { x: Math.floor(p.location.x), y: Math.floor(p.location.y), z: Math.floor(p.location.z) };
  for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
    if (isWater(block(dim, { x: f.x + d[0], y: f.y, z: f.z + d[1] })?.typeId)) return true;
    if (isWater(block(dim, { x: f.x + d[0], y: f.y - 1, z: f.z + d[1] })?.typeId)) return true;
  }
  return false;
}
function tryStartMirebound(p) {
  const s = settings();
  if (!s.mirebound || hollowDay() < 2) return false;
  const c = ctx(p);
  if (!c.overworld || c.underground || c.biome !== "swamp" && c.biome !== "shore") return false;
  if (!huntable(p) || rt(p).encounter || !cooldownReady(p, "mirebound")) return false;
  if (ms.size >= Math.min(3, Math.max(1, onlinePlayers().length))) return false;
  const base = isDarkHours() ? 0.12 : 0.03;
  if (!chance(base * chanceScale())) return false;
  if (protectedSpot(p.dimension, p.location)) return false;
  const dim = p.dimension;
  const yaw = yawOf(p.getViewDirection());
  for (let k = 0; k < 10; k++) {
    const d = yawDir(yaw + rand(-55, 55));
    const r = rand(10, 22);
    const at = shallowWater(dim, p.location.x + d.x * r, p.location.y, p.location.z + d.z * r);
    if (!at || distXZ(at, p.location) < 8) continue;
    let e;
    try {
      e = dim.spawnEntity(ENT.mirebound, at, { initialRotation: yawOf(norm(sub(p.location, at))) });
    } catch {
      continue;
    }
    e.setDynamicProperty(DP.owner, p.id);
    ms.set(e.id, { id: e.id, target: p.id, born: now(), state: "lurk", stateAt: now(), grabs: 0, nextCue: now() + 40, lastPlayer: now(), dmgAt: 0, seatTries: 0 });
    rt(p).encounter = "mirebound";
    setCooldown(p, "mirebound", seconds(rand(360, 540) * cooldownScale()));
    return true;
  }
  return false;
}
function release(m) {
  ms.delete(m.id);
  const p = world14.getEntity(m.target);
  if (p?.isValid && rt(p).encounter === "mirebound") rt(p).encounter = void 0;
  if (m.victim) {
    const v = world14.getEntity(m.victim);
    if (v?.isValid) popFog(v, "hollow_mire");
  }
}
function vanish2(e, m) {
  release(m);
  if (e?.isValid) {
    particle(e.dimension, PARTICLE.bubbles, add(e.location, { x: 0, y: 0.8, z: 0 }));
    try {
      e.remove();
    } catch {
    }
  }
}
function riding(p, e) {
  try {
    return p.getComponent("minecraft:riding")?.entityRidingOn?.id === e.id;
  } catch {
    return false;
  }
}
function letGo(e, m, why) {
  const v = m.victim ? world14.getEntity(m.victim) : void 0;
  try {
    e.getComponent("minecraft:rideable")?.ejectRiders();
  } catch {
  }
  if (v?.isValid) {
    popFog(v, "hollow_mire");
    unlock(v, "mirebound2");
    if (why !== "death") notice(v, why === "sneak" ? "§7You wrench free." : why === "hit" ? "§7It lets go." : "§7It loses its grip.");
  }
  m.victim = void 0;
  worldSound(e.dimension, SND.mireRelease, e.location);
  setState2(e, m, "retreat");
}
function update5() {
  if (ms.size === 0) return;
  const t = now();
  for (const m of [...ms.values()]) {
    const e = world14.getEntity(m.id);
    if (!e?.isValid) {
      release(m);
      continue;
    }
    const dim = e.dimension;
    let players = [];
    try {
      players = dim.getPlayers({ location: e.location, maxDistance: 48 });
    } catch {
    }
    if (players.length > 0) m.lastPlayer = t;
    const inState = t - m.stateAt;
    if (m.state === "lurk") {
      if (t - m.lastPlayer > seconds(60) || t - m.born > seconds(300)) {
        vanish2(e, m);
        continue;
      }
      const close = players.filter((p) => dist(p.location, e.location) < 24);
      if (close.length > 0 && t >= m.nextCue) {
        m.nextCue = t + Math.round(rand(110, 200));
        particle(dim, PARTICLE.bubbles, add(e.location, { x: 0, y: 0.9, z: 0 }));
        worldSound(dim, chance(0.6) ? SND.mireBubble : SND.mireGurgle, e.location, 0.7);
        for (const p of close) {
          if (dist(p.location, e.location) < 18 && clearLine(dim, p.getHeadLocation(), add(e.location, { x: 0, y: 1, z: 0 }))) unlock(p, "mirebound1");
        }
      }
      const prey = players.find((p) => huntable(p) && distXZ(p.location, e.location) < 3.5 && Math.abs(p.location.y - e.location.y) < 2.5 && nearWater(p));
      if (prey) {
        setState2(e, m, "erupt");
        m.victim = prey.id;
        worldSound(dim, SND.mireErupt, e.location, 1);
        particle(dim, PARTICLE.bubbles, add(e.location, { x: 0, y: 1, z: 0 }));
        accent(prey, SND.stingerLow, 2);
      }
      continue;
    }
    if (m.state === "erupt") {
      if (inState < 12) continue;
      const v = m.victim ? world14.getEntity(m.victim) : void 0;
      if (!v?.isValid || dist(v.location, e.location) > 3.2 || !huntable(v)) {
        m.victim = void 0;
        if (v?.isValid) notice(v, "§7It snaps at empty water. Get to dry land.");
        setState2(e, m, "retreat");
        continue;
      }
      setState2(e, m, "grab");
      m.grabs++;
      m.dmgAt = t;
      m.seatTries = 0;
      continue;
    }
    if (m.state === "grab") {
      const v = m.victim ? world14.getEntity(m.victim) : void 0;
      if (!v?.isValid || v.getComponent("minecraft:health")?.currentValue === 0) {
        letGo(e, m, "death");
        continue;
      }
      if (m.seatTries < 3 && !riding(v, e)) {
        m.seatTries++;
        let held = false;
        try {
          held = !!e.getComponent("minecraft:rideable")?.addRider(v);
        } catch {
          held = false;
        }
        if (m.seatTries >= 3 && !held && !riding(v, e)) {
          v.applyDamage(3, { cause: EntityDamageCause2.entityAttack, damagingEntity: e });
          v.addEffect("slowness", 50, { amplifier: 2, showParticles: false });
          letGo(e, m, "timeout");
          continue;
        }
        if (held) {
          worldSound(e.dimension, SND.mireGrab, e.location);
          pushFog(v, FOG.mire, "hollow_mire");
        }
        continue;
      }
      if (!riding(v, e)) {
        letGo(e, m, "sneak");
        continue;
      }
      notice(v, "§fPress §lSNEAK§r§f to break free!");
      if (t - m.dmgAt >= 30) {
        m.dmgAt = t;
        v.applyDamage(2, { cause: EntityDamageCause2.entityAttack, damagingEntity: e });
      }
      if (inState > 100) letGo(e, m, "timeout");
      continue;
    }
    if (inState > 120) {
      const floor = block(dim, { x: e.location.x, y: e.location.y + 0.2, z: e.location.z });
      if (m.grabs < 2 && floor && isWater(floor.typeId)) setState2(e, m, "lurk");
      else vanish2(e, m);
    }
  }
}
function onMireboundHurt(e, by) {
  const m = ms.get(e.id);
  if (!m) return;
  if (m.state === "grab" && by instanceof Player16) letGo(e, m, "hit");
  else if (m.state === "lurk") setState2(e, m, "retreat");
}
function onMireboundDied(id, killer) {
  const m = ms.get(id);
  if (m) release(m);
  if (killer instanceof Player16) {
    unlock(killer, "mirebound1");
    unlock(killer, "mirebound2");
  }
}
function forgetMireboundTarget(playerId) {
  for (const m of [...ms.values()]) {
    const e = world14.getEntity(m.id);
    if (m.victim === playerId && e?.isValid) letGo(e, m, "death");
    if (m.target === playerId && m.state === "lurk") vanish2(e, m);
  }
}
function startMirebound() {
  every("mirebound.update", 2, update5, 11);
}

// ../../scripts_src/creatures/watcher.ts
import { EntityDamageCause as EntityDamageCause3, ItemStack as ItemStack7, Player as Player17, world as world15 } from "@minecraft/server";

// ../../scripts_src/systems/daily.ts
function dailyCount(p, key) {
  const d = readEntity(p, DP.daily, { k: -1, c: {} });
  if (d.k !== nightKey()) return 0;
  return d.c[key] ?? 0;
}
function dailyAdd(p, key, n = 1) {
  const d = readEntity(p, DP.daily, { k: -1, c: {} });
  const k = nightKey();
  const next = d.k === k ? d : { k, c: {} };
  next.c[key] = (next.c[key] ?? 0) + n;
  writeEntity(p, DP.daily, next);
  return next.c[key];
}

// ../../scripts_src/creatures/watcher.ts
var encounters = /* @__PURE__ */ new Map();
var HEAD = 2.6;
function watcherCount() {
  return encounters.size;
}
function isWatcherTracked(id) {
  return encounters.has(id);
}
function setState3(e, enc, s) {
  if (enc.state === s) return;
  enc.state = s;
  enc.stateAt = now();
  try {
    e.triggerEvent(`hollow:to_${s}`);
  } catch {
  }
}
function headOf(e) {
  return add(e.location, { x: 0, y: HEAD, z: 0 });
}
function looking(p, e) {
  const head = p.getHeadLocation();
  const target = headOf(e);
  const d = dist(head, target);
  if (d > 72) return false;
  const tol = Math.max(8, Math.atan(1.6 / Math.max(d, 0.1)) * 180 / Math.PI);
  if (angleTo(p.getViewDirection(), head, target) > tol) return false;
  const dim = p.dimension;
  return clearLine(dim, head, target) || clearLine(dim, head, add(e.location, { x: 0, y: 1.4, z: 0 }));
}
function observers(e) {
  const out = [];
  for (const p of e.dimension.getPlayers({ location: e.location, maxDistance: 72 })) {
    if (looking(p, e)) out.push(p);
  }
  return out;
}
function targetSafe(p, enc) {
  const t = now();
  if (t - enc.litAt > 40) {
    enc.lit = inLitArea(p, 6) || lanternNear(p.dimension, p.location) || ctx(p).roofed;
    enc.litAt = t;
  }
  return enc.lit;
}
function canStrike(p, enc) {
  return settings().intensity >= 1 && huntable(p) && !holdingLight(p) && !targetSafe(p, enc);
}
function tryStartWatcher(p) {
  const s = settings();
  if (!s.watcher || !isDarkHours()) return false;
  const c = ctx(p);
  if (!c.overworld || c.biome !== "forest" || c.underground || c.inWater || c.roofed) return false;
  if (!huntable(p) || rt(p).encounter || !cooldownReady(p, "watcher")) return false;
  if (encounters.size >= Math.min(3, Math.max(1, onlinePlayers().length))) return false;
  if (!chance(0.1 * chanceScale())) return false;
  if (protectedSpot(p.dimension, p.location)) return false;
  const dim = p.dimension;
  const view = p.getViewDirection();
  const baseYaw = yawOf(view);
  const head = p.getHeadLocation();
  for (let k = 0; k < 7; k++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const yaw = baseYaw + side * rand(95, 160);
    const r = rand(34, 50);
    const dir = yawDir(yaw);
    const x = p.location.x + dir.x * r;
    const z = p.location.z + dir.z * r;
    const g = groundNear(dim, x, p.location.y, z, 12, 3);
    if (!g) continue;
    if (biomeGroup(dim, g) !== "forest") continue;
    if (hasBlockNear(dim, g, LIGHT_BLOCKS, 5, 2, 5)) continue;
    if (!clearLine(dim, head, add(g, { x: 0, y: HEAD, z: 0 }))) continue;
    let e;
    try {
      e = dim.spawnEntity(ENT.watcher, g, { initialRotation: yawOf(norm(sub(p.location, g))) });
    } catch {
      continue;
    }
    e.setDynamicProperty(DP.owner, p.id);
    e.setDynamicProperty(DP.born, now());
    const enc = {
      id: e.id,
      target: p.id,
      born: now(),
      state: "lurk",
      stateAt: now(),
      stare: 0,
      unseen: 0,
      sawOnce: false,
      glimpse: hollowDay() < s.graceDays,
      closeCue: false,
      resin: false,
      litAt: -999,
      lit: false
    };
    encounters.set(e.id, enc);
    rt(p).encounter = "watcher";
    setCooldown(p, "watcher", seconds(rand(240, 420) * cooldownScale()));
    ambient(p, SND.hush, { volume: 0.7, minGap: 0, cueGap: 1200 });
    pushFog(p, FOG.watched, "hollow_watch");
    return true;
  }
  return false;
}
function release2(enc) {
  encounters.delete(enc.id);
  const p = world15.getEntity(enc.target);
  if (p && p.isValid) {
    if (rt(p).encounter === "watcher") rt(p).encounter = void 0;
    popFog(p, "hollow_watch");
  }
}
function vanish3(e, enc) {
  release2(enc);
  if (!e || !e.isValid) return;
  particle(e.dimension, PARTICLE.shed, add(e.location, { x: 0, y: 1.4, z: 0 }));
  try {
    e.remove();
  } catch {
  }
}
function withdraw(e, enc, reason, by) {
  if (enc.state === "withdraw") return;
  setState3(e, enc, "withdraw");
  const dim = e.dimension;
  worldSound(dim, SND.watcherSeen, headOf(e), 0.9);
  later("watcher.retreat", 12, () => {
    if (e.isValid) worldSound(dim, SND.watcherRetreat, e.location, 0.8);
  });
  const target = world15.getEntity(enc.target);
  if (target) popFog(target, "hollow_watch");
  if (reason === "stared" && by) {
    for (const p of dim.getPlayers({ location: e.location, maxDistance: 72 })) unlock(p, "watcher2");
    if (!enc.resin && dailyCount(by, "resin") < (settings().intensity === 2 ? 2 : 1)) {
      enc.resin = true;
      dailyAdd(by, "resin");
      const at = add(e.location, { x: 0, y: 0.3, z: 0 });
      try {
        dim.spawnItem(new ItemStack7(ITEM.paleResin, 1), at);
        particle(dim, PARTICLE.resinGlint, at);
        later("watcher.glint", 40, () => particle(dim, PARTICLE.resinGlint, at));
        later("watcher.glint2", 100, () => particle(dim, PARTICLE.resinGlint, at));
      } catch {
      }
      hint(by, "§7It stepped back into the trees. Something glints where it stood.");
    }
  }
}
function update6() {
  if (encounters.size === 0) return;
  const t = now();
  for (const enc of [...encounters.values()]) {
    const e = world15.getEntity(enc.id);
    if (!e || !e.isValid) {
      release2(enc);
      continue;
    }
    const p = world15.getEntity(enc.target);
    if (!p || !p.isValid || p.dimension.id !== e.dimension.id) {
      vanish3(e, enc);
      continue;
    }
    const age = t - enc.born;
    const inState = t - enc.stateAt;
    const d = dist(p.location, e.location);
    if (enc.state === "withdraw") {
      const seen = observers(e).length > 0;
      if (inState > 60 && (!seen || d > 40) || inState > 240) vanish3(e, enc);
      continue;
    }
    if (isDay()) {
      withdraw(e, enc, "dawn");
      continue;
    }
    if (age > seconds(180) || d > 96) {
      withdraw(e, enc, "timeout");
      continue;
    }
    const obs = observers(e);
    if (obs.length > 0) {
      enc.unseen = 0;
      enc.stare += 4;
      if (!enc.sawOnce) {
        enc.sawOnce = true;
        for (const o of obs) {
          unlock(o, "watcher1");
          accent(o, SND.stingerDistant, 1);
        }
      }
      if (enc.state === "stalk") setState3(e, enc, "lurk");
      if (enc.state === "lunge" && inState < 10) continue;
      if (enc.stare >= 24 && (enc.state === "lurk" || enc.state === "stalk")) withdraw(e, enc, "stared", obs[0]);
      continue;
    }
    enc.unseen += 4;
    enc.stare = Math.max(0, enc.stare - 4);
    const ward = wardNear(e.dimension, e.location);
    if (ward && (enc.state === "stalk" || enc.state === "lunge")) {
      useWard(ward, "watcher");
      withdraw(e, enc, "ward");
      continue;
    }
    if (enc.state === "lurk") {
      if (enc.glimpse) {
        if (age > seconds(45)) withdraw(e, enc, "timeout");
        continue;
      }
      if (enc.unseen >= 60 && !targetSafe(p, enc)) setState3(e, enc, "stalk");
      continue;
    }
    if (enc.state === "stalk") {
      if (targetSafe(p, enc)) {
        setState3(e, enc, "lurk");
        continue;
      }
      if (d <= 10 && !enc.closeCue) {
        enc.closeCue = true;
        worldSound(e.dimension, "hollow.watcher.step", e.location, 1, 0.8);
        hint(p, "§8...a twig snaps behind you.");
        unlock(p, "watcher3", true);
      }
      if (d <= 5) {
        if (canStrike(p, enc)) {
          setState3(e, enc, "lunge");
          worldSound(e.dimension, SND.watcherLunge, headOf(e));
        } else setState3(e, enc, "lurk");
      }
      continue;
    }
    if (enc.state === "lunge" && inState > 70) withdraw(e, enc, "timeout");
  }
}
function onWatcherHurt(hurt2, cause, by) {
  const enc = encounters.get(hurt2.id);
  if (!enc) return;
  if (cause === EntityDamageCause3.fall) return;
  withdraw(hurt2, enc, "hurt", by instanceof Player17 ? by : void 0);
}
function onWatcherStruck(watcher, victim) {
  const enc = encounters.get(watcher.id);
  if (!enc) return;
  if (victim) {
    try {
      victim.addEffect("slowness", 50, { amplifier: 0, showParticles: false });
    } catch {
    }
    unlock(victim, "watcher3");
    hint(victim, "§7It struck from the dark. Keep a light in hand after dusk.");
  }
  withdraw(watcher, enc, "struck");
}
function onWatcherDied(id, killer) {
  const enc = encounters.get(id);
  if (enc) release2(enc);
  if (killer instanceof Player17) {
    unlock(killer, "watcher1");
    unlock(killer, "watcher2");
  }
}
function forgetWatcherTarget(playerId) {
  for (const enc of [...encounters.values()]) {
    if (enc.target !== playerId) continue;
    vanish3(world15.getEntity(enc.id), enc);
  }
}
function startWatcher() {
  every("watcher.update", 4, update6, 1);
}

// ../../scripts_src/systems/music.ts
var LOOPING = ["boss", "shrine"];
var state2 = /* @__PURE__ */ new Map();
function st2(p) {
  let s = state2.get(p.id);
  if (!s) {
    s = { startedAt: -1, lastAny: -99999, lastCave: -99999, nightPlayed: -1, nightHadEncounter: -1, dawnPlayed: -1, nextNight: 0 };
    state2.set(p.id, s);
  }
  return s;
}
function forgetMusic(playerId) {
  state2.delete(playerId);
}
function play(p, s, cue, track2) {
  try {
    p.playMusic(track2, { fade: cue === "boss" ? 1 : 3, loop: LOOPING.includes(cue), volume: 0.8 });
  } catch {
    return;
  }
  s.cue = cue;
  s.startedAt = now();
  s.lastAny = now();
}
function stop(p, s) {
  if (!s.cue) return;
  try {
    p.stopMusic();
  } catch {
  }
  s.cue = void 0;
}
function nearShrine(p) {
  const c = shrineCenter();
  return !!c && p.dimension.id === "minecraft:overworld" && distXZ(p.location, c) < 28 && Math.abs(p.location.y - c.y) < 16;
}
function tick(p) {
  const fresh = !state2.has(p.id);
  const s = st2(p);
  if (fresh) {
    try {
      p.stopMusic();
    } catch {
    }
  }
  if (!prefs(p).music) {
    stop(p, s);
    return;
  }
  const t = now();
  const night = isNight();
  const key = nightKey();
  if (night && rt(p).encounter) s.nightHadEncounter = key;
  if (inBossArena(p)) {
    if (s.cue !== "boss") play(p, s, "boss", SND.musicBoss);
    return;
  }
  if (s.cue === "boss") stop(p, s);
  if (nearShrine(p)) {
    if (s.cue !== "shrine") play(p, s, "shrine", SND.musicShrine);
    return;
  }
  if (s.cue === "shrine") stop(p, s);
  if (rt(p).encounter && (s.cue === "night" || s.cue === "cave")) {
    stop(p, s);
    return;
  }
  if (s.cue && !LOOPING.includes(s.cue) && t - s.startedAt > 2400) s.cue = void 0;
  if (s.cue) return;
  if (t - s.lastAny < 6e3) return;
  const c = ctx(p);
  if (!c.overworld) return;
  const tm = tod();
  if (!night && tm < 2500 && s.nightHadEncounter === key - 1 && s.dawnPlayed !== key) {
    s.dawnPlayed = key;
    play(p, s, "dawn", SND.musicDawn);
    return;
  }
  if (night && !c.underground && !c.roofed && !rt(p).encounter && s.nightPlayed !== key && tm > 13500) {
    if (t >= s.nextNight && chance(0.25)) {
      s.nightPlayed = key;
      play(p, s, "night", SND.musicNight[(key >> 1) % SND.musicNight.length]);
    } else s.nextNight = t + 600;
    return;
  }
  if (c.underground && t - s.lastCave > 24e3 && !rt(p).encounter && chance(0.15)) {
    s.lastCave = t;
    play(p, s, "cave", SND.musicCave);
  }
}
function startMusic() {
  everyPlayer("music", 200, tick);
}

// ../../scripts_src/systems/ambience.ts
function far(p, lo = 18, hi = 40) {
  const d = yawDir(rand(0, 360));
  const r = rand(lo, hi);
  return add(p.location, { x: d.x * r, y: rand(0, 4), z: d.z * r });
}
function tick2(p) {
  const c = ctx(p);
  if (!c.overworld) return;
  const night = isDarkHours();
  const busy = !!rt(p).encounter;
  if (busy) return;
  if (c.underground) {
    if (chance(0.18)) ambient(p, SND.caveDrip, { at: far(p, 6, 18), cueGap: 300 });
    else if (chance(0.06)) ambient(p, SND.caveShift, { at: far(p, 16, 32), cueGap: 1800 });
    else if (chance(0.04) && settings().hollowed && hollowDay() >= settings().graceDays) {
      ambient(p, SND.caveBreath, { at: far(p, 20, 34), cueGap: 2400 });
    }
    return;
  }
  if (c.biome === "forest") {
    if (night) {
      if (chance(0.06) && hollowNight() >= 1) ambient(p, SND.farCall, { at: far(p, 40, 60), cueGap: 3600 });
      else if (chance(0.1)) ambient(p, SND.branchSnap, { at: far(p, 18, 34), cueGap: 900 });
      else if (chance(0.04) && hollowNight() >= 2) ambient(p, SND.farSteps, { at: far(p, 20, 30), cueGap: 3e3 });
      else if (chance(0.12)) ambient(p, SND.windGust, { volume: 0.8, cueGap: 1200 });
    } else if (chance(0.1)) ambient(p, SND.windGust, { volume: 0.6, cueGap: 1600 });
    return;
  }
  if (c.biome === "swamp" || c.biome === "shore") {
    if (night && chance(0.14)) ambient(p, SND.swampGurgle, { at: far(p, 8, 20), cueGap: 900 });
    else if (chance(0.06)) ambient(p, SND.swampCreak, { at: far(p, 16, 30), cueGap: 1800 });
    if (night && c.biome === "swamp" && !hasEntry(p, "mirebound1") && hollowDay() >= 2 && chance(0.05)) {
      unlock(p, "mirebound1");
    }
    return;
  }
  if (night && chance(0.08)) ambient(p, SND.windGust, { volume: 0.6, cueGap: 1600 });
}
function bedtime(p) {
  const s = settings();
  if (!s.sleepDisturbance || !s.knocker || !p.isSleeping) return;
  if (hollowNight() < s.knockerNight) return;
  if (dailyCount(p, "bedknock") > 0) return;
  dailyAdd(p, "bedknock");
  if ((nightKey() + p.name.length) % 6 !== 0) return;
  ambient(p, SND.bedtimeKnock, { volume: 0.9, minGap: 0, cueGap: 0 });
}
function startAmbience() {
  everyPlayer("ambience", 120, tick2);
  everyPlayer("bedtime", 40, bedtime);
}

// ../../scripts_src/systems/cleanup.ts
import { world as world16 } from "@minecraft/server";
var trackers = /* @__PURE__ */ new Map();
function trackType(typeId, isTracked) {
  trackers.set(typeId, isTracked);
}
var BOSS_PARTS = /* @__PURE__ */ new Set([ENT.heart, ENT.vein]);
function orphan(e) {
  if (!e.isValid) return false;
  if (BOSS_PARTS.has(e.typeId)) return !isCurrentFightEntity(e);
  const t = trackers.get(e.typeId);
  if (t) return !t(e.id);
  try {
    return e.matches({ families: [FAMILY.temp] });
  } catch {
    return false;
  }
}
function cleanEntity(e) {
  if (!orphan(e)) return;
  debug(`cleanup orphan ${e.typeId}`);
  try {
    e.remove();
  } catch {
  }
}
function sweepLoaded() {
  for (const id of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) {
    try {
      const dim = world16.getDimension(id);
      for (const e of dim.getEntities({ families: [FAMILY.any] })) cleanEntity(e);
    } catch {
    }
  }
}
function startCleanup() {
  world16.afterEvents.entityLoad.subscribe((ev) => {
    const e = ev.entity;
    if (e.typeId.startsWith("hollow:")) cleanEntity(e);
  });
}

// ../../scripts_src/systems/director.ts
var starters = [];
function addStarter(s) {
  starters.push(s);
}
var PERIOD = 100;
function evaluate(p) {
  addPlayTime(p, PERIOD);
  if (!huntable(p) || isNewcomer(p)) return;
  let major = false;
  for (const s of starters) {
    if (s.independent) {
      s.tryStart(p);
      continue;
    }
    if (major) continue;
    if (s.tryStart(p)) major = true;
  }
}
function startDirector() {
  everyPlayer("director", PERIOD, evaluate);
}

// ../../scripts_src/main.ts
system6.beforeEvents.startup.subscribe((ev) => {
  registerItemComponents(ev);
  registerBlockComponents(ev);
});
var started = false;
function init() {
  if (started) return;
  started = true;
  hollowDay();
  trackType(ENT.watcher, isWatcherTracked);
  trackType(ENT.borrowed, isBorrowedTracked);
  trackType(ENT.hollowed, isHollowedTracked);
  trackType(ENT.lure, isLureTracked);
  trackType(ENT.knocker, isKnockerTracked);
  trackType(ENT.mirebound, isMireboundTracked);
  addStarter({ key: "mirebound", tryStart: tryStartMirebound });
  addStarter({ key: "watcher", tryStart: tryStartWatcher });
  addStarter({ key: "borrowed", tryStart: tryStartBorrowed, independent: true });
  addStarter({ key: "hollowed", tryStart: tryStartHollowed, independent: true });
  startCleanup();
  startNoiseEvents();
  startDirector();
  startAmbience();
  startBlockSystems();
  startMaterialPickups();
  startMusic();
  startSites();
  startWatcher();
  startBorrowed();
  startHollowed();
  startKnocker();
  startMirebound();
  startHeart();
  later("sweep", 40, sweepLoaded);
  console.warn(`[hollow] THE HOLLOW initialised (day ${hollowDay()}).`);
}
world17.afterEvents.worldLoad.subscribe(() => safe("init", init));
world17.afterEvents.playerSpawn.subscribe((ev) => safe("playerSpawn", () => {
  const p = ev.player;
  clearAllFog(p);
  if (ev.initialSpawn) {
    rt(p);
    later("welcome", 60, () => {
      if (!p.isValid) return;
      const fresh = unlock(p, "intro", true);
      unlock(p, "shelter", true);
      unlock(p, "craft_chime", true);
      unlock(p, "craft_ward", true);
      ensureJournal(p);
      if (fresh) p.sendMessage("§7You find a weathered §fField Journal§7 in your pack. Hold it and press §fUse§7 to read.");
    });
  } else {
    rt(p).diedAt = now();
    forgetEncounters(p.id);
    later("journalBack", 20, () => p.isValid && ensureJournal(p));
  }
}));
function forgetEncounters(playerId) {
  forgetWatcherTarget(playerId);
  forgetBorrowedTarget(playerId);
  forgetMireboundTarget(playerId);
  forgetKnockerTarget(playerId);
}
world17.beforeEvents.playerLeave.subscribe((ev) => {
  const id = ev.player.id;
  system6.run(() => safe("playerLeave", () => {
    forgetEncounters(id);
    forgetRuntime(id);
    forgetAudio(id);
    forgetPrefs(id);
    forgetJournal(id);
    forgetNoise(id);
    forgetSites(id);
    forgetMusic(id);
  }));
});
world17.afterEvents.playerDimensionChange.subscribe((ev) => safe("dimChange", () => {
  forgetEncounters(ev.player.id);
  forgetBossPlayer(ev.player);
  clearAllFog(ev.player);
}));
world17.afterEvents.entityHurt.subscribe((ev) => safe("entityHurt", () => {
  const hurt2 = ev.hurtEntity;
  const by = ev.damageSource.damagingEntity;
  switch (hurt2.typeId) {
    case ENT.watcher:
      onWatcherHurt(hurt2, ev.damageSource.cause, by);
      break;
    case ENT.borrowed:
      onBorrowedHurt(hurt2, by);
      break;
    case ENT.knocker:
      onKnockerHurt(hurt2, by);
      break;
    case ENT.mirebound:
      onMireboundHurt(hurt2, by);
      break;
  }
  if (hurt2 instanceof Player18 && by?.typeId === ENT.watcher) onWatcherStruck(by, hurt2);
  if (hurt2.typeId === ENT.heart || hurt2.typeId === ENT.vein) onBossHurt(hurt2, ev.damage, by);
}));
world17.afterEvents.entityDie.subscribe((ev) => safe("entityDie", () => {
  const dead = ev.deadEntity;
  const killer = ev.damageSource.damagingEntity;
  switch (dead.typeId) {
    case ENT.watcher:
      onWatcherDied(dead.id, killer);
      break;
    case ENT.borrowed:
      onBorrowedDied(dead.id, killer);
      break;
    case ENT.hollowed:
      onHollowedDied(dead.id, killer);
      break;
    case ENT.knocker:
      onKnockerDied(dead.id, killer);
      break;
    case ENT.mirebound:
      onMireboundDied(dead.id, killer);
      break;
    case ENT.heart:
      onHeartDied(dead.id);
      break;
    case ENT.vein:
      onVeinDied(dead.id);
      break;
    case "minecraft:player":
      forgetEncounters(dead.id);
      break;
  }
}));
world17.afterEvents.dataDrivenEntityTrigger.subscribe((ev) => safe("ddTrigger", () => {
  if (ev.eventId === "hollow:watcher_struck") onWatcherStruck(ev.entity, nearestPlayer(ev.entity, 5));
  else if (ev.eventId === "hollow:sheared") onBorrowedSheared(ev.entity, nearestPlayer(ev.entity, 6));
  else if (ev.eventId === "hollow:shield_hit") onShieldHit(ev.entity);
}), { entityTypes: [ENT.watcher, ENT.borrowed, ENT.heart] });
function nearestPlayer(e, r) {
  try {
    return e.dimension.getPlayers({ location: e.location, maxDistance: r, closest: 1 })[0];
  } catch {
    return void 0;
  }
}
system6.afterEvents.scriptEventReceive.subscribe((ev) => safe("scriptevent", () => {
  const p = ev.sourceEntity;
  if (!(p instanceof Player18)) return;
  switch (ev.id) {
    case "hollow:journal":
      void openJournal(p);
      return;
    case "hollow:status":
      if (!isOperator(p)) return;
      p.sendMessage(
        `§7[hollow] day ${hollowDay()} · watcher ${watcherCount()} · borrowed ${borrowedCount()} · hollowed ${hollowedCount()} · mirebound ${mireboundCount()} · knocker ${knockerActive() ? 1 : 0} · heart ${bossSummary()} · failures: ${failureReport()}`
      );
      return;
    case "hollow:debug":
      if (!isOperator(p)) return;
      setDebug(!debugEnabled());
      if (debugEnabled()) p.addTag("hollow_debug");
      else p.removeTag("hollow_debug");
      p.sendMessage(`§7[hollow] debug ${debugEnabled() ? "on" : "off"}`);
      return;
    case "hollow:site": {
      if (!isOperator(p)) return;
      const t = ev.message.trim();
      if (t !== "cabin" && t !== "camp" && t !== "shrine") {
        p.sendMessage("§7usage: /scriptevent hollow:site cabin|camp|shrine");
        return;
      }
      p.sendMessage(`§7[hollow] ${forceSite(p, t)}`);
      debug(`forced site ${t}`);
      return;
    }
  }
}), { namespaces: ["hollow"] });
