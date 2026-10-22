// ../../scripts_src/main.ts
import { ItemStack as ItemStack11, Player as Player26, system as system10, world as world23 } from "@minecraft/server";

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
  lure: "hollow:lure",
  phantom: "hollow:phantom",
  trevor: "hollow:trevor",
  crewBody: "hollow:crew_body",
  bullet: "hollow:bullet"
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
  lantern: "hollow:heartwood_lantern",
  tea: "hollow:hearth_tea",
  researchLog: "hollow:research_log",
  geiger: "hollow:geiger_counter",
  pistol: "hollow:service_pistol",
  round: "hollow:pistol_round",
  medkit: "hollow:medkit",
  ration: "hollow:ration_pack",
  iodine: "hollow:iodine_tablets",
  hatchet: "hollow:survival_hatchet",
  brokenRadio: "hollow:broken_radio"
};
var BLOCK = {
  chime: "hollow:hollow_chime",
  ward: "hollow:rowan_ward",
  lantern: "hollow:heartwood_lantern",
  altar: "hollow:heart_altar",
  roots: "hollow:hollow_roots",
  tracks: "hollow:tracks"
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
  variant: "hollow:variant",
  form: "hollow:form",
  visible: "hollow:visible"
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
  heartDeath: "hollow.heart.death",
  heartbeat: "hollow.dread.heartbeat",
  breath: "hollow.dread.breath",
  whisper: "hollow.dread.whisper",
  vanish: "hollow.dread.vanish",
  teaSip: "hollow.dread.calm",
  stepLeaves: "hollow.watcher.step",
  stepHeavy: "hollow.knocker.step",
  stepClaws: "hollow.hollowed.step",
  pistol: "hollow.gun.pistol",
  distantShot: "hollow.gun.distant",
  dryFire: "hollow.gun.dry",
  reload: "hollow.gun.reload",
  bulletHit: "hollow.gun.hit",
  geiger: ["hollow.geiger.1", "hollow.geiger.2", "hollow.geiger.3", "hollow.geiger.4", "hollow.geiger.5"],
  ringing: "hollow.story.ringing",
  titleHit: "hollow.story.title",
  gasp: "hollow.story.gasp"
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
  mire: "hollow:fog_mire",
  dread: "hollow:fog_dread"
};
var DP = {
  // world
  settings: "hollow:settings",
  startDay: "hollow:start_day",
  sites: "hollow:sites",
  chimes: "hollow:chimes",
  wards: "hollow:wards",
  wardUses: "hollow:ward_uses",
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
  tracks: "hollow:track_list",
  events: "hollow:events_done",
  lantern: "hollow:event_lantern",
  dread: "hollow:dread",
  rad: "hollow:rad",
  woke: "hollow:woke",
  // world (island)
  island: "hollow:island",
  story: "hollow:story",
  trevor: "hollow:trevor",
  // item
  mag: "hollow:mag",
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
  bossScaling: true,
  rareEvents: true,
  dread: true,
  trevorPermadeath: false
};
var PREF_DEFAULTS = { ambience: 80, accents: 1, visualFx: true, hints: true, music: true, dreadFx: true };
var worldCache;
var prefCache = /* @__PURE__ */ new Map();
var testMode = false;
var isTestMode = () => testMode;
function setTestMode(on) {
  testMode = on;
}
function settings() {
  if (!worldCache) {
    worldCache = sanitizeWorld(readWorld(DP.settings, WORLD_DEFAULTS));
  }
  return testMode ? { ...worldCache, graceDays: 0, knockerNight: 1 } : worldCache;
}
function rawSettings() {
  settings();
  return worldCache;
}
function dayReached(hollowDayNow, n) {
  return testMode || hollowDayNow >= n;
}
function saveSettings(s) {
  worldCache = sanitizeWorld(s);
  writeWorld(DP.settings, worldCache);
}
function sanitizeWorld(s) {
  const out = { ...WORLD_DEFAULTS };
  out.intensity = numberSetting(s.intensity, out.intensity, 0, 2);
  out.frequency = numberSetting(s.frequency, out.frequency, 25, 200);
  out.graceDays = numberSetting(s.graceDays, out.graceDays, 0, 10);
  out.knockerNight = numberSetting(s.knockerNight, out.knockerNight, 1, 20);
  for (const key of [
    "watcher",
    "borrowed",
    "hollowed",
    "knocker",
    "mirebound",
    "destructive",
    "sleepDisturbance",
    "sites",
    "bossScaling",
    "rareEvents",
    "dread",
    "trevorPermadeath"
  ]) {
    if (typeof s[key] === "boolean") out[key] = s[key];
  }
  return out;
}
function numberSetting(v, fallback, min, max) {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback;
}
function sanitizePrefs(p) {
  return {
    ambience: numberSetting(p.ambience, PREF_DEFAULTS.ambience, 0, 100),
    accents: numberSetting(p.accents, PREF_DEFAULTS.accents, 0, 2),
    visualFx: typeof p.visualFx === "boolean" ? p.visualFx : PREF_DEFAULTS.visualFx,
    hints: typeof p.hints === "boolean" ? p.hints : PREF_DEFAULTS.hints,
    music: typeof p.music === "boolean" ? p.music : PREF_DEFAULTS.music,
    dreadFx: typeof p.dreadFx === "boolean" ? p.dreadFx : PREF_DEFAULTS.dreadFx
  };
}
function prefs(player) {
  let p = prefCache.get(player.id);
  if (!p) {
    p = sanitizePrefs(readEntity(player, DP.prefs, PREF_DEFAULTS));
    prefCache.set(player.id, p);
  }
  return p;
}
function savePrefs(player, p) {
  const clean = sanitizePrefs(p);
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
  if (testMode) return 25;
  const s = settings();
  const byIntensity = [0.55, 1, 1.5][s.intensity];
  return byIntensity * (s.frequency / 100);
}
function cooldownScale() {
  if (testMode) return 0.02;
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
var FOG_TAGS = ["hollow_watch", "hollow_heart", "hollow_mire", "hollow_dread"];
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

// ../../scripts_src/core/forms.ts
import { system as system2 } from "@minecraft/server";
import { FormCancelationReason } from "@minecraft/server-ui";
var sessions = /* @__PURE__ */ new Map();
function forgetForms(playerId) {
  sessions.delete(playerId);
}
async function formSession(p, render) {
  if (!p.isValid || sessions.has(p.id)) return;
  const token = {};
  sessions.set(p.id, token);
  try {
    await render();
  } finally {
    if (sessions.get(p.id) === token) sessions.delete(p.id);
  }
}
async function showForm(p, form, retries = 6) {
  const token = sessions.get(p.id);
  const current = () => p.isValid && sessions.get(p.id) === token;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (!current()) return void 0;
    let r;
    try {
      r = await form.show(p);
    } catch {
      return void 0;
    }
    if (!current()) return void 0;
    if (!r.canceled || r.cancelationReason !== FormCancelationReason.UserBusy || attempt === retries) return r;
    await new Promise((resolve) => system2.runTimeout(resolve, 10));
  }
  return void 0;
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
import { BlockVolume, EquipmentSlot } from "@minecraft/server";
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
function heldItem(player) {
  try {
    return player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand)?.typeId;
  } catch {
    return void 0;
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
    const list3 = dim.getBlocks(volumeAround(c, rx, ry, rz), { includeTypes: types }, false);
    for (const loc of list3.getBlockLocationIterator()) {
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
function nearbyPlayers(dim, loc, radius) {
  try {
    return dim.getPlayers({ location: loc, maxDistance: radius });
  } catch {
    return [];
  }
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
  if (r.ctx && r.ctxDim === p.dimension.id && r.ctxPos && distSq(r.ctxPos, p.location) < 64 && r.ctx.inWater === p.isInWater && now() - r.ctxAt <= maxAge) return r.ctx;
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
  r.ctxDim = dim.id;
  r.ctxPos = { ...p.location };
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
import { system as system3, world as world5 } from "@minecraft/server";
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
  const start = () => system3.runInterval(() => safe(label, fn), ticks);
  if (offset > 0) system3.runTimeout(start, offset);
  else start();
}
function everyPlayer(label, period, fn) {
  system3.runInterval(() => {
    const players = world5.getAllPlayers();
    if (players.length === 0) return;
    const t = system3.currentTick;
    for (let i = 0; i < players.length; i++) {
      if ((i * 7 + t) % period !== 0) continue;
      const p = players[i];
      if (!p.isValid) continue;
      safe(label, () => fn(p));
    }
  }, 1);
}
function later(label, ticks, fn) {
  system3.runTimeout(() => safe(label, fn), Math.max(1, Math.round(ticks)));
}
function failureReport() {
  const parts = [];
  failures.forEach((n, k) => parts.push(`${k}:${n}`));
  debug(`failures ${parts.join(" ")}`);
  return parts.join(", ") || "none";
}

// ../../scripts_src/core/fear.ts
var pending = /* @__PURE__ */ new Map();
var reader = () => 0;
function frighten(p, amount) {
  if (!p || !p.isValid || amount <= 0) return;
  pending.set(p.id, Math.min(60, (pending.get(p.id) ?? 0) + amount));
}
function takeFright(playerId) {
  const v = pending.get(playerId) ?? 0;
  pending.delete(playerId);
  return v;
}
function forgetFright(playerId) {
  pending.delete(playerId);
}
function setDreadReader(fn) {
  reader = fn;
}
function dreadLevel(p) {
  return reader(p);
}
function dreadChance(p) {
  const d = reader(p);
  return d <= 40 ? 1 : 1 + (Math.min(100, d) - 40) / 150;
}

// ../../scripts_src/creatures/borrowed.ts
import { Player as Player18, world as world16 } from "@minecraft/server";

// ../../scripts_src/items/blocks.ts
import {
  BlockPermutation as BlockPermutation3,
  EquipmentSlot as EquipmentSlot5,
  GameMode as GameMode7,
  ItemStack as ItemStack5,
  world as world15
} from "@minecraft/server";

// ../../scripts_src/creatures/heart.ts
import { EntityDamageCause, EquipmentSlot as EquipmentSlot4, GameMode as GameMode6, ItemStack as ItemStack4, Player as Player16, world as world14 } from "@minecraft/server";

// ../../scripts_src/systems/dread.ts
import { GameMode as GameMode4, system as system5, world as world9 } from "@minecraft/server";

// ../../scripts_src/systems/noise.ts
import { Player as Player7, world as world6 } from "@minecraft/server";
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
function movementNoise(p, observeOnly = false) {
  if (p.isSneaking) return { radius: 0, kind: "move" };
  const v = p.getVelocity();
  const speed = Math.hypot(v.x, v.z);
  const st6 = { ...moveState.get(p.id) ?? { airborne: false, lastLand: -999 } };
  const wasAir = st6.airborne;
  st6.airborne = !p.isOnGround;
  let landed = false;
  if (wasAir && p.isOnGround && now() - st6.lastLand > 10) {
    landed = true;
    st6.lastLand = now();
  }
  if (!observeOnly) moveState.set(p.id, st6);
  if (quietFloor(p)) return { radius: 0, kind: "move" };
  if (p.isSprinting && speed > 0.05) return { radius: 16, kind: "sprint" };
  if (landed || p.isJumping) return { radius: 8, kind: "jump" };
  if (speed > 0.04) return { radius: 6, kind: "move" };
  return { radius: 0, kind: "move" };
}
function noiseDescription(p) {
  const { radius, kind } = movementNoise(p, true);
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
    const player = hurt2 instanceof Player7 ? hurt2 : by instanceof Player7 ? by : void 0;
    if (!player || !hurt2.isValid) return;
    emitNoise({ dim: hurt2.dimension, at: hurt2.location, radius: 14, kind: "combat", source: player });
  });
}

// ../../scripts_src/systems/journal.ts
import { ItemLockMode, ItemStack, system as system4 } from "@minecraft/server";
import { ActionFormData as ActionFormData2, FormCancelationReason as FormCancelationReason2 } from "@minecraft/server-ui";

// ../../scripts_src/content/island_journal.ts
var P = "§r\n\n";
var J = "textures/ui/hollow/journal/";
var ISLAND_ENTRIES = [
  // ------------------------------------------------------------------ CONTRACT
  {
    id: "contract",
    chapter: "contract",
    island: true,
    title: "Contract FLS-2026-114",
    icon: `${J}item_research_log`,
    body: "§lFederal Legacy Sites Program§r\n§7Field survey, Varrow Island (former Pacific test site, 1957)§r" + P + "§lScope.§r Take dose-rate readings at the six 1957 monitoring stations, collect soil, water and biological samples, and assess the condition of the remaining structures." + P + "§lTeam.§r Senior field technician §lTrevor Hale§r. Field researchers (you). Pilot §lDan Okafor§r, co-pilot §lRuth Lindqvist§r (Meridian Air Charter)." + P + "§lSchedule.§r Eight hours on the ground. Pickup at the south beach before dark." + P + "§lAdvisory.§r Unverified fishing-fleet reports of gunfire from the north-west shore. The island has been uninhabited since 1957. §oRecord and avoid.§r"
  },
  {
    id: "crash",
    chapter: "contract",
    island: true,
    title: "What Happened",
    icon: `${J}crew`,
    body: "§oWritten that first night, by firelight.§r" + P + "We came in low from the south at about two in the afternoon. Dan was pointing out the crater when the windscreen starred. Then again. Trevor saw muzzle flashes in the trees on the north-west side. §lSomeone shot at us. On purpose.§r" + P + "Dan was hit. Ruth fought it the whole way down. She got us to the beach. She didn't get herself out." + P + "The radio is cracked in half. Nobody knows we're down until we miss the pickup, and nobody is going to fly in here once they hear why. §lWe have to call out ourselves.§r"
  },
  {
    id: "tower_hint",
    chapter: "contract",
    island: true,
    title: "A Way Off",
    icon: `${J}item_broken_radio`,
    body: "The satellite radio is finished. Trevor says the 1957 test crews ran everything through a §lrelay tower on the north peak§r: valve transmitter, its own generator, a mast you could see from the ships." + P + "Seventy years of salt air. But the old gear was built to survive a bomb going off next to it." + P + "§lGoal:§r reach the north peak, see what's left of the relay, and find out what it needs." + P + "§8The peak is the high grey ridge across the island to the north. You can see it from the beach."
  },
  {
    id: "okafor",
    chapter: "contract",
    island: true,
    title: "Okafor's Kneeboard",
    icon: `${J}crew`,
    body: "Clipped to the pilot's leg, spattered:" + P + "§o14:02 feet wet. 14:09 island in sight, wind 12 kt from the SE. 14:11 GZ crater visible, water in it - GREEN??§r" + P + "§oNotes for the return leg: stay off the NW shore, fleet reports shots. LZ south beach. Fuel for 40 min loiter.§r" + P + 'On the back, in a different pen: §o"Ade - home Sunday. Save me some jollof."§r'
  },
  {
    id: "lindqvist",
    chapter: "contract",
    island: true,
    title: "Lindqvist's Notebook",
    icon: `${J}crew`,
    body: "A waterproof notebook in the co-pilot's vest. Mostly checklists, neat block capitals." + P + "The last page is a sketch of the island from the air: the crater, a grey ridge to the north with a tall mast drawn on it, a cluster of small square buildings in the middle, and on the north-west side a ring of huts with smoke rising, circled twice." + P + 'Under it: §o"PEOPLE?? 60 yrs exclusion zone. Ask T."§r'
  },
  {
    id: "trevor1",
    chapter: "contract",
    island: true,
    title: "Trevor Hale",
    icon: `${J}trevor`,
    body: "Thirty years of fieldwork: Bikini, Maralinga, the Nevada flats. Calm the way people get when they've stopped expecting things to go to plan." + P + "§lTalk to him§r (Use on him) to have him §lfollow§r you or §lhold§r a spot. Anyone can give orders; he says whose order he's on. He fights with his service pistol, carries medkits and patches up whoever is badly hurt, and he will not walk into the crater without a suit." + P + "§lIf he goes down§r, go to him and press Use, then stay beside him for a few seconds. You have a minute. If nobody reaches him, he crawls off and finds his way back at dawn §8(unless the world rules make his death permanent)§r."
  },
  {
    id: "trevor_down",
    chapter: "contract",
    island: true,
    title: "Close Call",
    icon: `${J}trevor`,
    body: "Trevor went down and I got him back on his feet. He laughed about it afterwards, but his hands were shaking when he reloaded." + P + `§o"Next time, you go first,"§r he said. I'm fairly sure he was joking.`
  },
  // ------------------------------------------------------------------ GEAR
  {
    id: "radiation1",
    chapter: "craft",
    island: true,
    title: "Radiation and the Geiger Counter",
    icon: `${J}item_geiger_counter`,
    body: "Hold the counter to hear it: a few clicks a minute is background, a steady crackle means you should be moving, a roar means you're already in trouble. Use it to take a §lreading§r: the dose rate here, your total dose, and which way the reading climbs." + P + "Your §ldose§r adds up while you're exposed and falls only slowly once you're clear:" + P + "§l100 mSv§r metal taste, hunger.  §l300§r nausea.  §l600§r weakness.  §l1000§r radiation sickness.  §l1500§r your body starts to fail." + P + "The worst is §lGround Zero§r, east of the island's centre, and worst of all §lthe green water§r in the crater: it burns. Rock overhead blocks most of it. §lIodine tablets§r halve what you take in for five minutes."
  },
  {
    id: "gear_pistol",
    chapter: "craft",
    island: true,
    title: "Service Pistol",
    icon: `${J}item_service_pistol`,
    body: "Seven rounds in the magazine. Aim and press §lUse§r to fire; §lsneak + Use§r reloads from the 9mm rounds you carry. Hits are instant out to about 48 blocks, weaker at long range, and much harder to the head." + P + "§lEvery shot is heard for 48 blocks.§r Some things on this island hunt by sound. Shoot when it's the only choice, not the first one." + P + "§8Rounds: the crash crates, and whatever else you can find."
  },
  {
    id: "gear_crash",
    chapter: "craft",
    island: true,
    title: "What We Saved",
    icon: `${J}item_medkit`,
    body: "From the wreck: field rations, medkits, a survival hatchet, iodine tablets, spare 9mm rounds and the broken satellite radio." + P + "§lMedkit§r: hold Use to dress wounds (heals over a few seconds).\n§lField ration§r: a proper meal.\n§lSurvival hatchet§r: fells trees fast; a decent weapon.\n§lIodine tablets§r: halve radiation uptake for five minutes."
  },
  // ------------------------------------------------------------------ PLACES
  {
    id: "place_crash",
    chapter: "places",
    island: true,
    title: "Crash Beach",
    icon: `${J}item_broken_radio`,
    body: "The south shore, where Ruth put us down. The wreck will burn for days. The smoke can be seen from anywhere on the island, which cuts both ways." + P + "§8Make camp nearby: Trevor treats this place as home until you build somewhere better."
  },
  {
    id: "place_crater",
    chapter: "places",
    island: true,
    title: "Ground Zero",
    icon: `${J}item_geiger_counter`,
    body: "The bomb went off in the air above this spot in May 1957. The ground for a long way round is flattened and black, dead trees snapped off at the same height, sand fused into green glass." + P + "In the middle, a crater full of water that §lglows§r at night. The counter doesn't click here. It screams." + P + "§cDon't linger. Don't drink. Don't swim."
  }
];

// ../../scripts_src/content/journal.ts
var P2 = "§r\n\n";
var ENTRIES = [
  // ------------------------------------------------------------------ NOTES
  {
    id: "intro",
    chapter: "notes",
    title: "Ranger Marlowe's Field Journal",
    icon: "textures/ui/hollow/journal/item_field_journal",
    body: "§oIf you are reading this, the station is empty and the journal found you instead of me.§r" + P2 + "These woods are beautiful. Fish the rivers, mine the hills, raise your house. But something here is wrong, and it is patient." + P2 + "§lThe first day is safe.§r Use it. Gather wood, find food, build walls and a §lclosed door§r." + P2 + "This journal fills itself in as you learn. When something new happens, look here first. Hold it and press §lUse§r to read. It stays with you when you fall."
  },
  {
    id: "shelter",
    chapter: "notes",
    title: "On Shelter",
    icon: "textures/ui/hollow/journal/shelter",
    body: "Rules I keep:" + P2 + "§l1.§r A roof and a §lclosed door§r. Nothing out there opens doors." + P2 + "§l2.§r Light keeps the tall one back. Carry a torch or lantern after dusk." + P2 + "§l3.§r Hang a §lTelltale Chime§r. It rings when one of them comes near, long before you would hear it yourself." + P2 + "§l4.§r A §lRowan Ward§r by the door turns visitors away. It burns down with use; feed it charcoal." + P2 + "§l5.§r Sleep is still safe. If you hear knocking from bed, stay in bed."
  },
  {
    id: "lore1",
    chapter: "notes",
    lore: 1,
    title: "Torn Page: Arrival",
    icon: "textures/ui/hollow/journal/page",
    body: "§oDay 3 at the station.§r" + P2 + 'The previous ranger left in a hurry. Coffee still in the pot. Boots by the door. The logbook ends mid-sentence: §o"it stood at the edge of the clearing all night and when I"§r' + P2 + "I have decided the previous ranger was a dramatic person."
  },
  {
    id: "lore2",
    chapter: "notes",
    lore: 2,
    title: "Torn Page: The Count",
    icon: "textures/ui/hollow/journal/page",
    body: "§oDay 9.§r" + P2 + "Counted the Hobbs flock at dusk. Thirty-one. Counted again at dawn. Thirty-one. But I only ever sold them thirty." + P2 + "One of them doesn't graze. It just stands at the back and watches the house."
  },
  {
    id: "lore3",
    chapter: "notes",
    lore: 3,
    title: "Torn Page: Underfoot",
    icon: "textures/ui/hollow/journal/page",
    body: "§oDay 14.§r" + P2 + "The miners at the east camp say the deep tunnels §oclick§r, like someone tapping a tongue against their teeth. They say if you stand very still, it goes away." + P2 + "They moved camp the next day. Nobody told me where."
  },
  {
    id: "lore4",
    chapter: "notes",
    lore: 4,
    title: "Torn Page: Visitors",
    icon: "textures/ui/hollow/journal/page",
    body: "§oDay 22.§r" + P2 + "Three knocks after midnight. I almost answered. There are no neighbours for miles." + P2 + "In the morning there was a long iron nail on the step, bent like a finger beckoning."
  },
  {
    id: "lore_prints",
    chapter: "notes",
    lore: 5,
    title: "Torn Page: Prints",
    icon: "textures/ui/hollow/journal/page",
    body: "§oDay 17.§r" + P2 + "Bare footprints in the frost this morning, from the tree line straight to my door. Long feet. Too long. They stop at the step." + P2 + "There are no prints going back."
  },
  {
    id: "lore_tower",
    chapter: "notes",
    lore: 6,
    title: "Torn Page: Fire Watch",
    icon: "textures/ui/hollow/journal/page",
    body: "§oDay 25, from the tower.§r" + P2 + "From up here you can count the lights in the valley. Mine, the Hobbs farm, the camp by the river." + P2 + "Tonight there was a fourth. It moved when I looked away, and it went out when I looked at it."
  },
  {
    id: "lore_eye",
    chapter: "notes",
    lore: 7,
    title: "Torn Page: The Flock",
    icon: "textures/ui/hollow/journal/page",
    body: "§oDay 27.§r" + P2 + "Every animal in the meadow stopped at once and turned to look at me. Cows, sheep, the chickens. Nobody moved for a long breath. Then they went back to grazing as if nothing happened." + P2 + "Something was looking out through them."
  },
  {
    id: "lore5",
    chapter: "notes",
    lore: 8,
    title: "Torn Page: The Shrine",
    icon: "textures/ui/hollow/journal/page",
    body: "§oDay 30.§r" + P2 + "Found an old map in the cabin floor. Beneath these hills there is a room older than any of us, where the roots of the forest meet. Something sleeps in it and §ldreams§r them all: the watcher, the borrowed things, the clickers, the knocker, the thing in the mire." + P2 + "They are not five monsters. They are one heart, thinking in five directions."
  },
  {
    id: "lore6",
    chapter: "notes",
    lore: 9,
    title: "Torn Page: Last Entry",
    icon: "textures/ui/hollow/journal/page",
    body: "§oDay 41.§r" + P2 + "A piece from each of them, laid on the altar, wakes it. An offering of silence." + P2 + "I have them all now. If I'm right, I can still it. If I'm wrong, whoever reads this: do not go alone. Bring light, bring friends, and §lbreak the veins first§r."
  },
  {
    id: "tracks",
    chapter: "notes",
    title: "Reading Tracks",
    icon: "textures/ui/hollow/journal/tracks",
    body: "The ground keeps what the night won't tell you. Prints fade within a day." + P2 + "§lThin, root-toed prints§r, far apart: the Watcher. Where there are two side by side, it stood still there a long time, looking at something." + P2 + "§lLong bare feet§r with a dragging heel: the Knocker. They come out of the trees and stop at a door." + P2 + "§lA wet smear§r from the bank into the shallows: something was dragged. Walk the banks." + P2 + "§lSheep hooves that turn into claws§r halfway along: a Borrowed stopped pretending." + P2 + "§7A Seer's Glass names fresh tracks within 8 blocks."
  },
  {
    id: "event_eye",
    chapter: "notes",
    title: "Every Eye",
    icon: "textures/ui/hollow/journal/event_eye",
    body: "Every animal around me stopped, turned, and looked at me. For a long breath nothing moved. Then it let them go." + P2 + "It didn't hurt anyone. It wanted me to know it can look through anything that has eyes."
  },
  {
    id: "event_lantern",
    chapter: "notes",
    title: "The Lantern",
    icon: "textures/ui/hollow/journal/event_lantern",
    body: "A lantern burning on a stump, deep in the trees, with nobody near it. When I got close it went out." + P2 + "Someone left a page under it. Someone wanted it found."
  },
  {
    id: "event_roof",
    chapter: "notes",
    title: "On the Roof",
    icon: "textures/ui/hollow/journal/event_roof",
    body: "Footsteps on the roof. Slow, heavy, from one end to the other. Then nothing." + P2 + "It never came in. Things that can't open doors can still climb."
  },
  {
    id: "dread1",
    chapter: "notes",
    title: "On Fear",
    icon: "textures/ui/hollow/journal/dread",
    body: "My hands are shaking as I write this. Good. Fear is information. Learn to read it." + P2 + "§lIt builds§r in the dark, underground, in the woods and the swamp after sunset, when you are alone, and when you are hurt. Every one of them leaves some behind when it shows itself." + P2 + "§lIt eases§r with daylight, a light in your hand, a lit room with a roof, a campfire, friends close by, a Heartwood Lantern, and sleep. A bowl of §lHearth Tea§r takes the edge off quickly." + P2 + "§lIt draws them.§r When I am frightened, more of them come. When I'm calm and lit, they keep to the usual rules." + P2 + "At its worst you will hear your own heart, and the dark will seem to close in. Down in the deep tunnels, the blind ones can hear that heart too." + P2 + "§7Your current nerve is on the Field Conditions page."
  },
  {
    id: "dread2",
    chapter: "notes",
    title: "Things That Aren't There",
    icon: "textures/ui/hollow/journal/phantom",
    body: "Footsteps behind me that stopped when I stopped. A tall shape at the corner of my eye that was gone when I turned. A voice right at my ear." + P2 + "§lNone of it touched me.§r If it vanishes when you look straight at it, it was never there. If it doesn't vanish, it was." + P2 + "Nobody standing beside me ever saw them. Calm down, find light, and they stop."
  },
  {
    id: "after",
    chapter: "notes",
    title: "Afterward",
    icon: "textures/ui/hollow/journal/after",
    body: "The Heart is still." + P2 + "The forest will never be entirely quiet; things that were dreamed do not stop at once. But the dark is a little smaller now, and you made it so." + P2 + "§7Place a §lHeartwood Lantern§r§7 at home. Nothing that remains will cross its light."
  },
  // ------------------------------------------------------------------ THREATS
  {
    id: "watcher1",
    chapter: "threats",
    title: "The Watcher",
    icon: "textures/ui/hollow/journal/watcher",
    body: "A tall shape at the treeline. I took it for a dead sapling until the pale face turned to follow me." + P2 + "§lSigns:§r a pale face in the forest at dusk or night, far away. The woods go quiet first." + P2 + "It only appears in wooded country. It has not followed me into the open."
  },
  {
    id: "watcher2",
    chapter: "threats",
    title: "The Watcher: Staring Back",
    icon: "textures/ui/hollow/journal/watcher",
    body: "§lIt does not like being watched back.§r" + P2 + "Hold your gaze on it for a breath or two and it steps back into the trees and is gone. Where it stood you will find §lWeeping Sap§r, bleeding from the bark it scraped." + P2 + "Sap glints faintly at night. It's the base of the §lSeer's Glass§r."
  },
  {
    id: "watcher3",
    chapter: "threats",
    title: "The Watcher: Turned Backs",
    icon: "textures/ui/hollow/journal/watcher",
    body: "§lIt only moves while nobody is looking at it.§r" + P2 + "Ignore it and it creeps closer, tree by tree. In the dark it will close the last few steps and strike." + P2 + "§lCounterplay:§r turn and look at it; hold a torch or lantern; stay near placed lights. It will not approach a lit place, and it won't strike someone holding a light."
  },
  {
    id: "borrowed1",
    chapter: "threats",
    title: "The Borrowed",
    icon: "textures/ui/hollow/journal/borrowed",
    body: "One of the sheep is not a sheep." + P2 + "§lSigns:§r it never lowers its head to graze; its bleat is a little too low and ends in a soft §oclick§r; at night its eyes catch the light; it stands still when the others wander, and it faces you." + P2 + "By day it is harmless if left alone."
  },
  {
    id: "borrowed2",
    chapter: "threats",
    title: "The Borrowed: Tests",
    icon: "textures/ui/hollow/journal/borrowed",
    body: "§lHow to tell:§r" + P2 + "• Hold §lwheat§r. Real sheep come to you. It does not move toward the wheat. It just watches you.§r\n• Try to §lshear§r it. The wool doesn't come off. It peels.§r\n• Look through a §lSeer's Glass§r. It cannot hold its shape.§r" + P2 + "Once revealed it hunts until hurt badly, then flees. At night, don't let it get close in the dark. Fight with your back to a wall. It drops §lFalse Fleece§r."
  },
  {
    id: "hollowed1",
    chapter: "threats",
    title: "The Hollowed",
    icon: "textures/ui/hollow/journal/hollowed",
    body: "Deep tunnels, darkness, and a rapid §oclick-click-click§r ahead of me. It hunts by sound. It has no eyes at all." + P2 + "§lSigns:§r echolocation clicks, distant breathing, scraping on stone."
  },
  {
    id: "hollowed2",
    chapter: "threats",
    title: "The Hollowed: What It Hears",
    icon: "textures/ui/hollow/journal/hollowed",
    body: "§lIt hears:§r sprinting (16 blocks), walking (6), jumping and landing (8), breaking blocks (12), placing blocks (8), doors, trapdoors, levers, buttons, pressure plates and chests (10), fighting (14), explosions (40), and things you throw landing nearby (12)." + P2 + "§lIt cannot hear:§r sneaking, and anyone walking on §lwool§r or §lcarpet§r." + P2 + "§lCounterplay:§r crouch past it. Throw a snowball, egg or arrow away from you; it goes to the sound. Within 3 blocks it finds you anyway, so keep your distance."
  },
  {
    id: "hollowed3",
    chapter: "threats",
    title: "The Hollowed: Fangs",
    icon: "textures/ui/hollow/journal/hollowed",
    body: "They die like anything else. Their fangs are hollow and hum faintly when held near running water. §lEcho Fangs§r go into the §lHeartseeker§r."
  },
  {
    id: "knocker1",
    chapter: "threats",
    title: "The Knocker",
    icon: "textures/ui/hollow/journal/knocker",
    body: "§lThree knocks at the door, after dark.§r" + P2 + "It only comes to occupied shelters with a door, never before the fourth night, and rarely. Your Chime will ring as it approaches."
  },
  {
    id: "knocker2",
    chapter: "threats",
    title: "The Knocker: Don't Answer",
    icon: "textures/ui/hollow/journal/knocker",
    body: "§lDo not open the door.§r It cannot open doors. It knocks, scratches, breathes against the wood. Then it gives up and leaves." + P2 + "When it leaves, it leaves a §lDoorstep Nail§r on the step." + P2 + "A §lRowan Ward§r near the door sends it away before it knocks."
  },
  {
    id: "knocker3",
    chapter: "threats",
    title: "The Knocker: I Opened It",
    icon: "textures/ui/hollow/journal/knocker",
    body: "I answered. It was waiting with its arms already reaching." + P2 + "If you open the door while it's there, it comes in. It's slow but strong. Fight it in the light, step back through a doorway, or close the door again between you."
  },
  {
    id: "mirebound1",
    chapter: "threats",
    title: "The Mirebound",
    icon: "textures/ui/hollow/journal/mirebound",
    body: "In the swamps and along riverbanks there is a mossy hump in the shallows that wasn't there yesterday." + P2 + "§lSigns:§r bubbles rising where no fish swim, a low gurgle, two dull lights just under the surface at night."
  },
  {
    id: "mirebound2",
    chapter: "threats",
    title: "The Mirebound: Breaking Free",
    icon: "textures/ui/hollow/journal/mirebound",
    body: "It waits until you're close, then grabs you and drags you toward deeper water." + P2 + "§lPress Sneak (crouch) to wrench free.§r Hitting it also makes it let go. It can't hold you for long, and it can't follow you onto dry land for more than a few steps." + P2 + "Walk the banks, not the shallows. It drops a §lMire Pearl§r."
  },
  {
    id: "heart1",
    chapter: "threats",
    title: "The Heart Below",
    icon: "textures/ui/hollow/journal/heart_below",
    body: "Something huge beneath the hills, rooted into stone, beating slow." + P2 + "§lIt is shielded§r while its §lveins§r pulse around the chamber. Break every vein to expose it. Watch the ground: roots burst where dust rises, and its pulse ring can be jumped."
  },
  {
    id: "heart2",
    chapter: "threats",
    title: "The Heart Below: Phases",
    icon: "textures/ui/hollow/journal/heart_below",
    body: "§lFirst:§r root bursts (dust warns you) and slow pulses." + P2 + "§lSecond:§r the veins regrow once; young hollowed crawl out. Kill them first, they hunt by sound." + P2 + "§lLast:§r it opens. The bursts come faster and its gaze sweeps the room. Break line of sight behind the pillars." + P2 + "It grows stronger with every person in the chamber. Everyone who fights earns a share."
  },
  // ------------------------------------------------------------------ CRAFTING
  {
    id: "craft_chime",
    chapter: "craft",
    title: "Telltale Chime",
    icon: "textures/ui/hollow/journal/item_hollow_chime",
    body: "§lWarning device.§r Hang it under a ceiling, a porch roof or a beam. It rings softly when one of the Hollow comes within 14 blocks, at most once every few seconds. Use it to silence or unsilence it." + P2 + "§7Recipe (crafting table):§r\n  [   ] [String] [   ]\n  [Iron Nugget] [Copper Ingot] [Iron Nugget]\n  [   ] [Iron Nugget] [   ]" + P2 + "§7No fuel. Up to 32 chimes per world are active at once."
  },
  {
    id: "craft_ward",
    chapter: "craft",
    title: "Rowan Ward",
    icon: "textures/ui/hollow/journal/item_rowan_ward",
    body: "§lLimited protection.§r A charm of iron and smouldering charcoal. Within 10 blocks:" + P2 + "• the Knocker turns back before it reaches your door\n• the Watcher will not step closer\n• the Borrowed reveal themselves and flee§r" + P2 + "§lCharges:§r 4. One charge burns each time it turns something away (at most one per creature per night). Use §lcharcoal§r on it to add a charge back." + P2 + "§7Recipe:§r\n  [   ] [String] [   ]\n  [Iron Nugget] [Charcoal] [Iron Nugget]\n  [Iron Nugget] [Stick] [Iron Nugget]" + P2 + "§7It does not stop the Hollowed underground, the Mirebound, or the Heart."
  },
  {
    id: "craft_lens",
    chapter: "craft",
    title: "Seer's Glass",
    icon: "textures/ui/hollow/journal/item_hollow_lens",
    body: "§lInvestigation tool.§r Use it to:" + P2 + "• reveal any Borrowed within 24 blocks (only you see it)\n• show the direction and distance of the nearest Hollow creature within 48 blocks\n• show how loud you are right now to the Hollowed§r" + P2 + "§l64 uses§r, 3 s cooldown. Repair with copper ingots at an anvil." + P2 + "§7Recipe:§r\n  [   ] [Copper Ingot] [   ]\n  [Copper Ingot] [Glass Pane] [Copper Ingot]\n  [   ] [Weeping Sap] [   ]"
  },
  {
    id: "craft_heartseeker",
    chapter: "craft",
    title: "Heartseeker",
    icon: "textures/ui/hollow/journal/item_heartseeker",
    body: "§lBoss progression.§r A compass that beats instead of points. Use it to feel the direction, distance and depth of the shrine. It also marks the shrine on your locator bar." + P2 + "If no shrine has formed in this world yet, the first use draws one up from the deep beneath the hills nearby." + P2 + "§7Recipe (shapeless):§r Compass + Weeping Sap + 2 Echo Fangs"
  },
  {
    id: "craft_offering",
    chapter: "craft",
    title: "Hush Offering",
    icon: "textures/ui/hollow/journal/item_offering_of_silence",
    body: "§lBoss progression.§r A piece of each of them. Place it in the altar at the shrine to wake the Heart Below." + P2 + "§7Recipe:§r\n  [Echo Fang] [Weeping Sap] [Echo Fang]\n  [False Fleece] [Gold Ingot] [Doorstep Nail]\n  [   ] [Mire Pearl] [   ]" + P2 + "§7Cabin and campsite chests sometimes hold components. If a creature is switched off in World Rules, every new site chest holds its component instead."
  },
  {
    id: "craft_lantern",
    chapter: "craft",
    title: "Heartwood Lantern",
    icon: "textures/ui/hollow/journal/item_heartwood_lantern",
    body: "§lReward.§r Crafted from a Stilled Heart and a lantern. A permanent light: within 24 blocks no Hollow creature is drawn to you, the Knocker never visits, and nothing of theirs spawns." + P2 + "§7Recipe (shapeless):§r Stilled Heart + Lantern"
  },
  {
    id: "craft_tea",
    chapter: "craft",
    title: "Hearth Tea",
    icon: "textures/ui/hollow/journal/item_hearth_tea",
    body: "§7Recipe (shapeless):§r Bowl + Sugar + Sweet Berries §8(or an Apple)§r" + P2 + "Drink it when your nerve is going. It lowers Dread sharply and steadies you for two minutes: fear can still rise, but only half as fast and never past uneasy." + P2 + "§7It is also a little food. You can drink it even when you're full."
  },
  // ------------------------------------------------------------------ PLACES
  {
    id: "place_cabin",
    chapter: "places",
    title: "The Ranger Cabin",
    icon: "textures/ui/hollow/journal/place_cabin",
    body: "A spruce cabin in the woods with a cold stove and a chest of supplies. Rangers kept spare notes here. Look for §lTorn Pages§r." + P2 + "§7Cabins appear in forests, well away from where you've built."
  },
  {
    id: "place_camp",
    chapter: "places",
    title: "The Ruined Campsite",
    icon: "textures/ui/hollow/journal/place_camp",
    body: "Two collapsed tents and a dead fire. Whoever camped here left in the night and didn't take their pack. Check the barrel." + P2 + "§7Campsites appear on open ground and at forest edges."
  },
  {
    id: "place_tower",
    chapter: "places",
    title: "The Fire Watch Tower",
    icon: "textures/ui/hollow/journal/place_tower",
    body: "A spruce fire-watch tower above the trees. Its lantern is still lit. Nobody has climbed it in months." + P2 + "§7Towers stand in forests. Climb for the view, and check the lookout's chest."
  },
  {
    id: "place_leanto",
    chapter: "places",
    title: "The Lean-to",
    icon: "textures/ui/hollow/journal/place_leanto",
    body: `A hunter's lean-to: bedroll turned back, fire cold, a note on a stake: §o"went to check the noise"§r.` + P2 + "§7Lean-tos appear at forest edges and in open country."
  },
  {
    id: "place_shrine",
    chapter: "places",
    title: "The Underground Shrine",
    icon: "textures/ui/hollow/journal/place_shrine",
    body: "A root-choked chamber deep below the hills, lit by old candles. The altar at its centre takes the §lHush Offering§r." + P2 + "§7Follow the Heartseeker. Dig down carefully and bring a way back up."
  }
];
ENTRIES.push(...ISLAND_ENTRIES);
var ENTRY_BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));
var LORE_PAGES = ENTRIES.filter((e) => e.lore !== void 0).sort((a, b) => (a.lore ?? 0) - (b.lore ?? 0));
var CHAPTERS = [
  { id: "notes", title: "Field Notes", icon: "textures/ui/hollow/journal/chapter_notes" },
  { id: "contract", title: "The Contract", icon: "textures/ui/hollow/journal/item_research_log" },
  { id: "threats", title: "Threats", icon: "textures/ui/hollow/journal/chapter_threats" },
  { id: "craft", title: "Equipment", icon: "textures/ui/hollow/journal/chapter_craft" },
  { id: "places", title: "Places", icon: "textures/ui/hollow/journal/chapter_places" }
];
var FOREST_PLACES = /* @__PURE__ */ new Set(["place_cabin", "place_camp", "place_tower", "place_leanto"]);
function entryVisible(e, island) {
  if (island) return !!e.island || e.chapter !== "notes" && !FOREST_PLACES.has(e.id);
  return !e.island;
}
function chaptersFor(island) {
  return island ? CHAPTERS.filter((c) => c.id !== "notes").map((c) => c.id === "craft" ? { ...c, title: "Gear & Equipment" } : c) : CHAPTERS.filter((c) => c.id !== "contract");
}

// ../../scripts_src/island/mode.ts
import { world as world7 } from "@minecraft/server";

// ../../scripts_src/content/island_layout.ts
var CRATER_R = 44;
var SITES = {
  GZ: { x: 112, z: -12 },
  CRASH: { x: -24, z: 262 },
  SPAWN: { x: -30, z: 252 },
  PENS: { x: 20, z: -40 },
  MOCK_TOWN: { x: -64, z: 44 },
  BLACKWOOD: { x: -200, z: 20 },
  SUNFALL: { x: -150, z: -178 },
  MANGROVES: { x: 236, z: 40 },
  NORTH_PEAK: { x: 18, z: -226 },
  TOWER: { x: 18, z: -232 },
  DOCK: { x: 196, z: 214 },
  DIORAMA: { x: 2400, z: 0 }
};
var SPAWN_POINT = { x: -30, y: 66, z: 252 };
var CRASH_SMOKE = [{ "x": -22, "y": 63, "z": 256 }, { "x": -30, "y": 65, "z": 265 }, { "x": -17, "y": 65, "z": 267 }];
var CRASH_CONTAINERS = [{ "x": -18, "y": 65, "z": 271 }, { "x": -32, "y": 65, "z": 258 }, { "x": -15, "y": 65, "z": 260 }];
var CREW_BODIES = [{ "x": -20, "y": 65, "z": 265 }, { "x": -29, "y": 65, "z": 261 }, { "x": -23, "y": 65, "z": 270 }];

// ../../scripts_src/island/mode.ts
var cached;
function isIsland() {
  if (cached === void 0) cached = world7.getDynamicProperty(DP.island) === 1;
  return cached;
}
function setIsland(on) {
  cached = on;
  world7.setDynamicProperty(DP.island, on ? 1 : 0);
}
function detectIsland(dim) {
  if (isIsland()) return true;
  if (world7.getDynamicProperty(DP.island) === 0) return false;
  try {
    const c = CRASH_CONTAINERS[0];
    const s = CRASH_SMOKE[0];
    if (!c || !s) return false;
    if (!dim.isChunkLoaded(c) || !dim.isChunkLoaded(s)) return false;
    const barrel = dim.getBlock(c)?.typeId === "minecraft:barrel";
    const fire2 = dim.getBlock(s)?.typeId === "minecraft:campfire";
    const hay = dim.getBlock({ x: s.x, y: s.y - 1, z: s.z })?.typeId === "minecraft:hay_block";
    if (barrel && fire2 && hay) {
      setIsland(true);
      return true;
    }
  } catch {
  }
  return false;
}

// ../../scripts_src/island/radiation.ts
import { EquipmentSlot as EquipmentSlot2, GameMode as GameMode2 } from "@minecraft/server";
var DEFAULT = { dose: 0, iodine: 0, told: 0 };
var cache = /* @__PURE__ */ new Map();
var lastSave = /* @__PURE__ */ new Map();
function radState(p) {
  let s = cache.get(p.id);
  if (!s) {
    const raw = readEntity(p, DP.rad, DEFAULT);
    s = {
      dose: Number.isFinite(raw.dose) ? Math.max(0, Math.min(3e3, raw.dose)) : 0,
      iodine: 0,
      // runtime ticks do not survive a restart; the tablets wear off
      told: Number.isFinite(raw.told) ? raw.told : 0
    };
    cache.set(p.id, s);
  }
  return s;
}
function save(p, s, force = false) {
  const t = now();
  if (!force && t - (lastSave.get(p.id) ?? -9999) < 200) return;
  lastSave.set(p.id, t);
  writeEntity(p, DP.rad, { dose: Math.round(s.dose * 10) / 10, iodine: 0, told: s.told });
}
function forgetRadiation(playerId) {
  cache.delete(playerId);
  lastSave.delete(playerId);
}
var GZ = SITES.GZ;
function groundRate(at) {
  const d = Math.hypot(at.x - GZ.x, at.z - GZ.z);
  const core = 120 * Math.exp(-Math.max(0, d - 30) / 45);
  return Math.max(0.1, core);
}
function inCraterLake(p) {
  const d = Math.hypot(p.location.x - GZ.x, p.location.z - GZ.z);
  return p.isInWater && d < CRATER_R + 6;
}
function shielded(p) {
  try {
    const dim = p.dimension;
    const top = dim.getTopmostBlock({ x: p.location.x, z: p.location.z });
    return !!top && top.location.y > p.location.y + 6;
  } catch {
    return false;
  }
}
function rateAt(p) {
  if (p.dimension.id !== "minecraft:overworld") return 0.1;
  let r = groundRate(p.location);
  if (inCraterLake(p)) r *= 4;
  if (shielded(p)) r *= 0.3;
  return Math.max(0.1, r);
}
function band(dose) {
  return dose >= 1500 ? 5 : dose >= 1e3 ? 4 : dose >= 600 ? 3 : dose >= 300 ? 2 : dose >= 100 ? 1 : 0;
}
function bandName(dose) {
  return ["none", "mild", "moderate", "serious", "severe", "critical"][band(dose)];
}
var BAND_TEXT = [
  "",
  "§eYour mouth tastes of metal. You've taken a real dose of radiation.",
  "§6Nausea rolls through you. The dose is building: get away from the crater.",
  "§cYour limbs feel heavy and weak. Radiation sickness is setting in.",
  "§cYou're sick, properly sick. Get out of the contaminated ground and take iodine.",
  "§4Your body is failing. Leave the zone now."
];
function holdsGeiger(p) {
  try {
    const eq = p.getComponent("minecraft:equippable");
    return eq?.getEquipment(EquipmentSlot2.Mainhand)?.typeId === ITEM.geiger || eq?.getEquipment(EquipmentSlot2.Offhand)?.typeId === ITEM.geiger;
  } catch {
    return false;
  }
}
function geigerLevel(rate) {
  return rate < 0.6 ? 0 : rate < 5 ? 1 : rate < 25 ? 2 : rate < 70 ? 3 : 4;
}
function fmt(n) {
  return n < 10 ? n.toFixed(1) : String(Math.round(n));
}
function tick(p) {
  if (!isIsland()) return;
  const gm = p.getGameMode();
  if (gm === GameMode2.Creative || gm === GameMode2.Spectator) return;
  const hp = p.getComponent("minecraft:health");
  if (hp && hp.currentValue <= 0) return;
  const s = radState(p);
  const rate = rateAt(p);
  const t = now();
  if (rate >= 1) {
    const iodine = s.iodine > t ? 0.5 : 1;
    s.dose = Math.min(3e3, s.dose + rate / 120 * iodine);
  } else {
    s.dose = Math.max(0, s.dose - 0.4);
  }
  if (inCraterLake(p)) {
    try {
      p.addEffect("poison", 50, { amplifier: 1, showParticles: false });
    } catch {
    }
    if (t % 100 < 20) notice(p, "§aThe water is warm, and it stings like acid. §7Get out.");
  }
  const b = band(s.dose);
  try {
    if (b >= 1 && t % 600 < 20) p.addEffect("hunger", 200, { amplifier: 0, showParticles: false });
    if (b >= 2 && t % 900 < 20) p.addEffect("nausea", 160, { amplifier: 0, showParticles: false });
    if (b >= 3) p.addEffect("weakness", 40, { amplifier: 0, showParticles: false });
    if (b >= 4 && t % 400 < 20) p.addEffect("poison", 60, { amplifier: 0, showParticles: false });
    if (b >= 5 && t % 600 < 20) p.addEffect("wither", 40, { amplifier: 0, showParticles: false });
  } catch {
  }
  if (b > s.told) {
    s.told = b;
    notice(p, BAND_TEXT[b]);
    save(p, s, true);
  } else if (b < s.told - 1) {
    s.told = b;
  }
  if (holdsGeiger(p)) {
    ui(p, SND.geiger[geigerLevel(rate)], 0.9);
    notice(p, `§a☢ §f${fmt(rate)} §7mSv/h   §8·   §7dose §f${fmt(s.dose)} §7mSv §8(${bandName(s.dose)})`);
  }
  save(p, s);
}
function geigerReading(p) {
  const s = radState(p);
  const rate = rateAt(p);
  const dirs = [["N", 0, -1], ["NE", 1, -1], ["E", 1, 0], ["SE", 1, 1], ["S", 0, 1], ["SW", -1, 1], ["W", -1, 0], ["NW", -1, -1]];
  let best = "";
  let bestRate = groundRate(p.location);
  for (const [name, dx, dz] of dirs) {
    const k = 12 / Math.hypot(dx, dz);
    const r = groundRate({ x: p.location.x + dx * k, y: p.location.y, z: p.location.z + dz * k });
    if (r > bestRate * 1.04) {
      bestRate = r;
      best = name;
    }
  }
  const trend = rate < 0.6 ? "Background only." : best ? `Climbing to the §f${best}§7.` : "Level all round.";
  const iod = s.iodine > now() ? ` §8· iodine active (${Math.ceil((s.iodine - now()) / 1200)} min)` : "";
  return `§a☢ Reading: §f${fmt(rate)} mSv/h§7. ${trend}
§7Your dose: §f${fmt(s.dose)} mSv §7(${bandName(s.dose)})${iod}`;
}
function takeIodine(p) {
  const s = radState(p);
  s.iodine = now() + 6e3;
  notice(p, "§7Iodine tablets: your thyroid is blocked. §fRadiation uptake halved for 5 minutes.");
}
function setDose(p, dose) {
  const s = radState(p);
  s.dose = Math.max(0, Math.min(3e3, dose));
  s.told = band(s.dose);
  save(p, s, true);
}
function startRadiation() {
  everyPlayer("radiation", 20, tick);
}

// ../../scripts_src/systems/settings_ui.ts
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
async function openSettings(p, op) {
  const menu = new ActionFormData().title("§lSettings").body("§7Comfort settings are yours alone. World rules affect everyone and need operator permission.\n\n§8Brightness, render distance, graphics mode (Vibrant Visuals), the sound sliders (Music, Ambient/Environment, Hostile Creatures) and Subtitles are in Minecraft's own Settings menu.").button("My comfort settings", "textures/ui/hollow/settings");
  if (op) menu.button("World rules §8(operator)", "textures/ui/hollow/world");
  const r = await showForm(p, menu);
  if (!r || r.canceled || r.selection === void 0) return;
  if (r.selection === 0) return openPrefs(p);
  if (r.selection === 1 && isOperator(p)) return openWorld(p);
}
async function openPrefs(p) {
  const cur = prefs(p);
  const f = new ModalFormData().title("§lMy comfort settings").slider("Ambience volume (script cues)", 0, 100, { defaultValue: cur.ambience, valueStep: 10 }).dropdown("Encounter accents (short stingers)", ["Off", "Subtle", "Full"], { defaultValueIndex: cur.accents }).toggle("Visual effects (fog shifts, soft fades)", { defaultValue: cur.visualFx }).toggle("Action-bar hints", { defaultValue: cur.hints }).toggle("Music (night, cave, shrine and boss tracks)", { defaultValue: cur.music }).toggle("Dread effects (heartbeat, breathing, closing fog, hallucinations)", { defaultValue: cur.dreadFx }).submitButton("Save");
  const r = await showForm(p, f);
  if (!r || r.canceled || !r.formValues) return;
  const v = r.formValues;
  const next = {
    ambience: Number(v[0]),
    accents: Number(v[1]),
    visualFx: Boolean(v[2]),
    hints: Boolean(v[3]),
    music: Boolean(v[4]),
    dreadFx: v[5] === void 0 ? cur.dreadFx : Boolean(v[5])
  };
  savePrefs(p, next);
  if (!next.visualFx || !next.dreadFx) clearAllFog(p);
  notice(p, "§7Comfort settings saved.");
}
async function openWorld(p) {
  const s = rawSettings();
  const f = new ModalFormData().title("§lWorld rules").dropdown("Horror intensity", ["Calm: rarer, no ambush strikes", "Standard", "Nightmare: frequent, bolder"], { defaultValueIndex: s.intensity }).slider("Encounter frequency (%)", 25, 200, { defaultValue: s.frequency, valueStep: 25 }).slider("Grace days before creatures hunt", 0, 10, { defaultValue: s.graceDays, valueStep: 1 }).slider("First night the Knocker may visit", 1, 20, { defaultValue: s.knockerNight, valueStep: 1 }).toggle("Creature: The Watcher", { defaultValue: s.watcher }).toggle("Creature: The Borrowed", { defaultValue: s.borrowed }).toggle("Creature: The Hollowed", { defaultValue: s.hollowed }).toggle("Creature: The Knocker", { defaultValue: s.knocker }).toggle("Creature: The Mirebound", { defaultValue: s.mirebound }).toggle("Destructive Knocker (may break wooden doors on Hard)", { defaultValue: s.destructive }).toggle("Rare bedtime knocking (harmless, never blocks sleep)", { defaultValue: s.sleepDisturbance }).toggle("Place cabins, camps, towers, lean-tos and the shrine", { defaultValue: s.sites }).toggle("Scale the Heart Below with player count", { defaultValue: s.bossScaling }).toggle("Rare one-off events (harmless, once per world)", { defaultValue: s.rareEvents }).toggle("Dread: fear, hallucinations, and fear drawing them closer", { defaultValue: s.dread }).toggle("Varrow Island: Trevor's death is permanent", { defaultValue: s.trevorPermadeath }).submitButton("Save");
  const r = await showForm(p, f);
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
    bossScaling: Boolean(v[12]),
    rareEvents: Boolean(v[13]),
    dread: v[14] === void 0 ? s.dread : Boolean(v[14]),
    trevorPermadeath: v[15] === void 0 ? s.trevorPermadeath : Boolean(v[15])
  };
  saveSettings(next);
  notice(p, "§7World rules saved.");
}

// ../../scripts_src/systems/field_notes.ts
import { Difficulty as Difficulty2, GameMode as GameMode3, world as world8 } from "@minecraft/server";
function fieldNotes(p, has) {
  const c = ctx(p, 0);
  const s = settings();
  const t = tod();
  const phase = t < 12e3 ? "daylight" : t < 13e3 ? "dusk" : t < 23200 ? "night" : "dawn";
  const carried = /* @__PURE__ */ new Set();
  const inv = p.getComponent("minecraft:inventory")?.container;
  if (inv) for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i);
    if (item) carried.add(item.typeId);
  }
  const w = wardNear(p.dimension, p.location);
  const used = w ? getCustomState(w.permutation, "hollow:used") : void 0;
  const charges = typeof used === "number" ? Math.max(0, Math.min(4, 4 - used)) : 0;
  const grace = Math.max(0, s.graceDays - hollowDay());
  const gm = p.getGameMode();
  const pacing = world8.getDifficulty() === Difficulty2.Peaceful ? "Peaceful: regular hunts paused" : gm === GameMode3.Creative || gm === GameMode3.Spectator ? "Regular hunts paused in this game mode" : now() - rt(p).diedAt <= 1200 ? "Brief recovery period after respawn" : isNewcomer(p) && !isTestMode() ? "New arrival: settling-in period still active" : grace > 0 ? `World grace: regular hunts start on day ${s.graceDays + 1}` : "Regular encounter rules active";
  const terrain = !c.overworld ? "beyond the Overworld" : c.underground ? "underground" : c.inWater ? "in water" : c.roofed ? "roof overhead" : "open sky";
  const light = holdingLight(p) ? "carrying a light" : inLitArea(p) ? "placed light nearby" : "no shelter light detected";
  const ward = w ? `charged ward within 10 blocks (${charges}/4)` : "no charged ward detected";
  const protection = lanternNear(p.dimension, p.location) ? "Heartwood Lantern protection nearby" : ward;
  let recipe = "craft_chime";
  let next = "Build a roof and closed door. Carry a torch after dusk; a chime warns you of visitors.";
  if (has("after")) {
    recipe = "craft_lantern";
    next = carried.has(ITEM.lantern) ? "Place your Heartwood Lantern at home. Its registered protection reaches 24 blocks." : "Turn the Stilled Heart into a Heartwood Lantern for your home.";
  } else if (has("heart1") && has("craft_offering")) {
    recipe = "craft_offering";
    next = "Prepare the offering, food and equipment. Read your shrine notes before deciding to wake it.";
  } else if (has("craft_heartseeker")) {
    recipe = "craft_heartseeker";
    next = carried.has(ITEM.heartseeker) ? "Use your Heartseeker in the Overworld and follow its bearings." : "Craft a Heartseeker when you are ready to investigate farther.";
    if (!s.sites) next += " New shrine placement is disabled in World rules.";
  } else if (has("craft_lens")) {
    recipe = "craft_lens";
    next = carried.has(ITEM.lens) ? "Use your Seer's Glass to investigate fresh tracks and suspicious animals. Each look wears the glass." : "You have learned to make a Seer's Glass. Craft it to investigate tracks and suspicious animals.";
  } else if (has("watcher1")) {
    recipe = "craft_ward";
    next = "Read your discovered Watcher notes. Improve the shelter and learn its warnings before venturing out.";
  }
  if (settings().dread && dreadOf(p) >= 50) {
    next = "Your nerve is going. Get to light and a roof, find company, or drink Hearth Tea. Frightened people draw them in, and see things that aren't there.";
    if (has("craft_tea") && !carried.has(ITEM.tea)) recipe = "craft_tea";
  }
  if (!has(recipe)) recipe = "";
  return {
    body: `§7Day ${hollowDay() + 1} · ${phase} · ${terrain}
§7Light: ${light}
§7Equipment: ${protection}
§7Movement: ${noiseDescription(p)}
§7Pacing: ${pacing}
` + (settings().dread ? `§7Nerve: ${nerve(p)}
` : "") + `
§lNext step§r
${next}

§8Local checks are not a guarantee of safety. Refresh after moving.`,
    recipe
  };
}
function nerve(p) {
  const name = dreadStageName(p);
  const colour = ["§a", "§e", "§6", "§c"][["Calm", "Uneasy", "Frightened", "Terrified"].indexOf(name)] ?? "§7";
  const why = dreadReasons(p).slice(0, 3).join(", ");
  return `${colour}${name}§7 (${Math.round(dreadOf(p))}/100)${why ? `§8 · ${why}` : ""}`;
}

// ../../scripts_src/systems/journal.ts
var cache2 = /* @__PURE__ */ new Map();
var discoveries = /* @__PURE__ */ new Map();
function data(p) {
  let d = cache2.get(p.id);
  if (!d) {
    const raw = readEntity(p, DP.journal, { u: [], r: [] });
    const valid = (v) => typeof v === "string" && ENTRY_BY_ID.has(v);
    const u = [...new Set(Array.isArray(raw.u) ? raw.u.filter(valid) : [])];
    d = { u, r: [...new Set(Array.isArray(raw.r) ? raw.r.filter((id) => valid(id) && u.includes(id)) : [])] };
    cache2.set(p.id, d);
  }
  return d;
}
function save2(p, d) {
  writeEntity(p, DP.journal, d);
}
function forgetJournal(playerId) {
  cancelJournalNotices(playerId);
  cache2.delete(playerId);
}
function cancelJournalNotices(playerId) {
  const pending2 = discoveries.get(playerId);
  if (pending2) system4.clearRun(pending2.run);
  discoveries.delete(playerId);
}
function hasEntry(p, id) {
  return data(p).u.includes(id);
}
function unlock(p, id, quiet = false) {
  if (!ENTRY_BY_ID.has(id) || !p.isValid) return false;
  const d = data(p);
  if (d.u.includes(id)) return false;
  d.u.push(id);
  save2(p, d);
  if (!quiet) {
    const pending2 = discoveries.get(p.id);
    if (pending2) pending2.ids.add(id);
    else {
      const ids = /* @__PURE__ */ new Set([id]);
      const run = system4.runTimeout(() => {
        discoveries.delete(p.id);
        if (!p.isValid) return;
        const unread = [...ids].filter((entry) => !data(p).r.includes(entry));
        if (unread.length === 0) return;
        notice(p, unread.length === 1 ? `§7New journal entry: §f${ENTRY_BY_ID.get(unread[0]).title}` : `§7${unread.length} new journal entries. §fOpen your Field Journal to read them.`);
        ui(p, SND.journalEntry, 0.8);
      }, 30);
      discoveries.set(p.id, { run, ids });
    }
  }
  return true;
}
function unlockAll(p) {
  let n = 0;
  for (const e of ENTRIES) if (unlock(p, e.id, true)) n++;
  return n;
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
  const s = new ItemStack(isIsland() ? ITEM.researchLog : ITEM.journal, 1);
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
        const id = c.getItem(i)?.typeId;
        if (id === ITEM.journal || id === ITEM.researchLog) return;
      }
    }
    const left = c.addItem(journalStack());
    if (left) p.dimension.spawnItem(left, p.location);
  } catch {
  }
}
function threatsAwake() {
  const s = settings();
  if (isIsland()) {
    return [
      "§7• Find shelter before dark. Something walks the island at night.",
      "§7• Mind your dose near Ground Zero. Never touch the green water.",
      "§7• Someone shot us down. Stay off the north-west shore.",
      "§7• Get to the relay tower on the north peak."
    ].join("\n");
  }
  const day = hollowDay();
  const night = hollowNight();
  const hunting = day >= s.graceDays;
  const lines = [];
  if (s.watcher) lines.push(hunting ? "§7• In the woods after dusk, something watches." : "§7• The woods feel watched, but nothing hunts yet.");
  if (s.borrowed && hunting && day >= 1) lines.push("§7• Count the flocks.");
  if (s.hollowed && hunting) lines.push("§7• Deep tunnels click.");
  if (s.mirebound && hunting && day >= 2) lines.push("§7• The shallows are not empty.");
  if (s.knocker) lines.push(hunting && night >= s.knockerNight ? "§7• Keep your door closed at night." : "§7• Nights are quiet at the door, for now.");
  return lines.join("\n");
}
async function openJournal(p) {
  await formSession(p, () => openJournalMenu(p));
}
async function openJournalMenu(p) {
  ui(p, SND.journalOpen, 0.9);
  const d = data(p);
  const island = isIsland();
  const chapters = chaptersFor(island);
  const total = ENTRIES.filter((e) => entryVisible(e, island)).length;
  const have = d.u.filter((id) => entryVisible(ENTRY_BY_ID.get(id), island)).length;
  const form = new ActionFormData2().title(island ? "§lResearch Log" : "§lField Journal").body(
    `§7Day §f${hollowDay() + 1}§7 · Entries §f${have}/${total}

` + threatsAwake()
  );
  const shown = (e) => entryVisible(e, island) && d.u.includes(e.id);
  const unreadIn = (ch) => ENTRIES.some((e) => e.chapter === ch && shown(e) && !d.r.includes(e.id));
  for (const ch of chapters) {
    const count = ENTRIES.filter((e) => e.chapter === ch.id && shown(e)).length;
    form.button(`${ch.title}${unreadIn(ch.id) ? " §6(new)" : ""}
§8${count} entries`, ch.icon);
  }
  form.button("Settings\n§8comfort & world rules", "textures/ui/hollow/settings");
  form.button("Field conditions & next steps\n§8your nerve, local checks and a suggested recipe", "textures/ui/hollow/journal/conditions");
  const r = await showForm(p, form);
  if (!r || r.canceled || r.selection === void 0) return;
  if (r.selection < chapters.length) await openChapter(p, chapters[r.selection].id);
  else if (r.selection === chapters.length) await openSettings(p, isOperator(p));
  else if (r.selection === chapters.length + 1) await openFieldNotes(p);
}
async function openFieldNotes(p) {
  while (p.isValid) {
    const report = fieldNotes(p, (id) => hasEntry(p, id));
    let body = report.body;
    if (isIsland()) {
      const rs = radState(p);
      const rate = rateAt(p);
      body = `§lRadiation§r
§7Here: §f${rate < 10 ? rate.toFixed(1) : Math.round(rate)} mSv/h§7 · your dose §f${Math.round(rs.dose)} mSv§7 (${bandName(rs.dose)})` + (rs.dose >= 300 ? "\n§cLeave contaminated ground and rest; take iodine before going back." : "") + "\n\n" + body;
    }
    const form = new ActionFormData2().title("§lField Conditions").body(body);
    form.button("Refresh", "textures/ui/hollow/journal/refresh");
    if (report.recipe) form.button("Read suggested recipe", ENTRY_BY_ID.get(report.recipe).icon);
    form.button("§8Back", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled || r.selection === void 0) return;
    if (r.selection === 0) continue;
    if (report.recipe && r.selection === 1) return openEntry(p, report.recipe, "craft");
    return openJournalMenu(p);
  }
}
async function openChapter(p, ch) {
  const d = data(p);
  const island = isIsland();
  const unlocked = ENTRIES.filter((e) => e.chapter === ch && entryVisible(e, island) && d.u.includes(e.id));
  const locked = ENTRIES.filter((e) => e.chapter === ch && entryVisible(e, island) && !d.u.includes(e.id)).length;
  const title = chaptersFor(island).find((c) => c.id === ch)?.title ?? "Notes";
  const form = new ActionFormData2().title(`§l${title}`);
  form.body(
    unlocked.length === 0 ? "§7Nothing written here yet." : locked > 0 ? `§7${locked} ${locked === 1 ? "page is" : "pages are"} still blank.` : "§7Complete."
  );
  for (const e of unlocked) {
    form.button(`${d.r.includes(e.id) ? "" : "§6• §r"}${e.title}`, e.icon);
  }
  form.button("§8Back", "textures/ui/hollow/back");
  const r = await showForm(p, form);
  if (!r || r.canceled || r.selection === void 0) return;
  if (r.selection >= unlocked.length) return openJournalMenu(p);
  await openEntry(p, unlocked[r.selection].id, ch);
}
async function openEntry(p, id, back) {
  const e = ENTRY_BY_ID.get(id);
  if (!e) return;
  const d = data(p);
  ui(p, SND.journalOpen, 0.6, 1.15);
  const form = new ActionFormData2().title(`§l${e.title}`).body(e.body).button("§8Back", "textures/ui/hollow/back");
  const r = await showForm(p, form);
  if (r && r.cancelationReason !== FormCancelationReason2.UserBusy && !d.r.includes(id)) {
    d.r.push(id);
    save2(p, d);
  }
  if (!r || r.canceled) return;
  await openChapter(p, back);
}

// ../../scripts_src/systems/dread.ts
var STAGE_NAMES = ["Calm", "Uneasy", "Frightened", "Terrified"];
var UP = [25, 50, 75];
var HYST = 5;
var PERIOD = 40;
var states = /* @__PURE__ */ new Map();
function st2(p) {
  let s = states.get(p.id);
  if (!s) {
    const saved2 = getNum(p, DP.dread, 0);
    s = {
      v: Math.max(0, Math.min(100, Number.isFinite(saved2) ? saved2 : 0)),
      stage: 0,
      steadyUntil: -1,
      nextHallucination: now() + 2400,
      episodeUntil: -1,
      nextEpisode: -1,
      saveIn: 5,
      fog: false,
      reasons: [],
      hallucinating: false
    };
    s.stage = stageFor(s.v, 0);
    states.set(p.id, s);
  }
  return s;
}
function stageFor(v, current) {
  let stage = current;
  while (stage < 3 && v >= UP[stage]) stage++;
  while (stage > 0 && v < UP[stage - 1] - HYST) stage--;
  return stage;
}
function dreadOf(p) {
  return states.get(p.id)?.v ?? 0;
}
function dreadStageName(p) {
  return STAGE_NAMES[states.get(p.id)?.stage ?? 0];
}
function dreadReasons(p) {
  return states.get(p.id)?.reasons ?? [];
}
function forgetDread(playerId) {
  states.delete(playerId);
  forgetFright(playerId);
  for (const [id, ph] of phantoms) if (ph.playerId === playerId) removePhantom(id, false);
}
function resetDread(p) {
  const s = st2(p);
  s.v = 0;
  s.stage = 0;
  s.episodeUntil = -1;
  setFog(p, s, false);
  setNum(p, DP.dread, 0);
}
function enabledFor(p) {
  if (!settings().dread || !huntable(p)) return false;
  if (isNewcomer(p) && !isTestMode()) return false;
  try {
    const gm = p.getGameMode();
    return gm === GameMode4.Survival || gm === GameMode4.Adventure;
  } catch {
    return false;
  }
}
function target(p, reasons) {
  const c = ctx(p);
  const dark = isDarkHours();
  let t = 4;
  const lit = holdingLight(p);
  const placed = inLitArea(p, 6);
  if (c.underground) {
    t = 30;
    let block2 = 15;
    try {
      block2 = p.dimension.getLightLevel(p.getHeadLocation());
    } catch {
    }
    if (block2 < 7 && !lit) {
      t += 22;
      reasons.push("+ darkness underground");
    } else reasons.push("+ deep underground");
  } else if (dark && c.overworld) {
    t = 28;
    if (c.biome === "forest" || c.biome === "swamp") {
      t += 14;
      reasons.push(c.biome === "forest" ? "+ the woods at night" : "+ the swamp at night");
    } else reasons.push("+ night");
    if (!lit && !placed) {
      t += 14;
      reasons.push("+ no light");
    }
  }
  if (c.inWater && dark) {
    t += 8;
    reasons.push("+ dark water");
  }
  const company = nearbyPlayers(p.dimension, p.location, 16).filter((o) => o.id !== p.id).length;
  if (company > 0) {
    t -= 16;
    reasons.push("- company");
  } else if (t > 10) {
    t += 8;
    reasons.push("+ alone");
  }
  try {
    const hp = p.getComponent("minecraft:health")?.currentValue ?? 20;
    if (hp <= 6) {
      t += 14;
      reasons.push("+ badly hurt");
    }
  } catch {
  }
  if (lit && t > 8) {
    t -= 14;
    reasons.push("- light in hand");
  }
  if (placed && (c.roofed || c.underground) && t > 8) {
    t -= 14;
    reasons.push("- lit shelter");
  } else if (placed && t > 8) {
    t -= 8;
    reasons.push("- placed light");
  }
  if (t > 6 && hasBlockNear(p.dimension, p.location, ["minecraft:campfire", "minecraft:soul_campfire"], 5, 2, 5)) {
    t -= 18;
    reasons.push("- campfire");
  }
  if (lanternNear(p.dimension, p.location)) {
    t = Math.min(t, 6);
    reasons.push("- Heartwood Lantern");
  }
  if (p.isSleeping) {
    t = 0;
    reasons.push("- sleep");
  }
  return Math.max(0, Math.min(100, t));
}
function setFog(p, s, on) {
  const want = on && prefs(p).dreadFx;
  if (want === s.fog) return;
  s.fog = want;
  if (want) pushFog(p, FOG.dread, "hollow_dread");
  else popFog(p, "hollow_dread");
}
function personal(p, sound, volume, pitch = 1, at) {
  const pr = prefs(p);
  if (!pr.dreadFx) return;
  try {
    p.playSound(sound, { location: at, volume: volume * Math.max(0.25, pr.ambience / 100), pitch });
  } catch {
  }
}
function heartbeat(p, s) {
  if (s.stage < 2 || p.isSleeping) return;
  const t = now();
  if (s.stage === 2) {
    if (t >= s.nextEpisode && t >= s.episodeUntil) {
      s.episodeUntil = t + 200;
      s.nextEpisode = t + 200 + Math.round(rand(300, 600));
    }
    if (t >= s.episodeUntil) return;
  }
  const interval = s.stage === 3 ? 13 : 19;
  const vol = s.stage === 3 ? 0.75 : 0.5;
  for (let k = 0; k * interval < PERIOD; k++) {
    later("dread.beat", 1 + k * interval, () => {
      if (!p.isValid || (states.get(p.id)?.stage ?? 0) < 2) return;
      personal(p, SND.heartbeat, vol, s.stage === 3 ? 1.08 : 1);
    });
  }
  if (s.stage === 3 && chance(0.22)) later("dread.breath", 10, () => p.isValid && personal(p, SND.breath, 0.6));
}
function onStageChange(p, s, from) {
  if (s.stage > from) {
    if (s.stage >= 1) {
      unlock(p, "dread1");
      unlock(p, "craft_tea", true);
    }
    if (s.stage === 1) hint(p, "§8Something feels wrong.");
    if (s.stage === 2) hint(p, "§8Your heart is pounding. The dark is closing in.");
    if (s.stage === 3) hint(p, "§8You can't stop shaking. Find light. Find people.");
  } else if (s.stage === 0) {
    hint(p, "§8Your breathing slows.");
  }
  setFog(p, s, s.stage >= 2 && prefs(p).visualFx);
}
function update(p) {
  const s = st2(p);
  const spike = takeFright(p.id);
  if (!enabledFor(p)) {
    if (s.v > 0 || s.stage > 0) {
      s.v = Math.max(0, s.v - 6);
      const from2 = s.stage;
      s.stage = stageFor(s.v, s.stage);
      if (s.stage !== from2) onStageChange(p, s, from2);
      setNum(p, DP.dread, Math.round(s.v));
    }
    setFog(p, s, false);
    return;
  }
  const reasons = [];
  const goal = target(p, reasons);
  s.reasons = reasons;
  const steady = now() < s.steadyUntil;
  if (spike) s.v += steady ? spike * 0.5 : spike;
  const rate = goal > s.v ? 0.05 : p.isSleeping ? 0.35 : 0.09;
  s.v += (goal - s.v) * rate;
  if (steady) s.v = Math.min(s.v, 30);
  s.v = Math.max(0, Math.min(100, s.v));
  const from = s.stage;
  s.stage = stageFor(s.v, s.stage);
  if (s.stage !== from) onStageChange(p, s, from);
  else setFog(p, s, s.stage >= 2 && prefs(p).visualFx);
  heartbeat(p, s);
  if (s.stage === 3 && ctx(p).underground) {
    emitNoise({ dim: p.dimension, at: p.location, radius: 4, kind: "move", source: p });
  }
  maybeHallucinate(p, s);
  if (--s.saveIn <= 0) {
    s.saveIn = 5;
    setNum(p, DP.dread, Math.round(s.v));
  }
}
function drinkTea(p) {
  const s = st2(p);
  s.v = Math.max(0, s.v - 45);
  s.steadyUntil = now() + 2400;
  const from = s.stage;
  s.stage = stageFor(s.v, s.stage);
  if (s.stage !== from) onStageChange(p, s, from);
  try {
    p.playSound(SND.teaSip, { volume: 0.8 });
  } catch {
  }
  hint(p, "§7Warmth spreads through your chest. Your hands are steady.");
}
var phantoms = /* @__PURE__ */ new Map();
function isPhantomTracked(id) {
  return phantoms.has(id);
}
function maybeHallucinate(p, s) {
  if (s.stage < 2 || s.hallucinating || !prefs(p).dreadFx) return;
  const t = now();
  if (t < s.nextHallucination) return;
  if (rt(p).encounter || hollowDay() < settings().graceDays) return;
  const c = ctx(p);
  if (!c.overworld) return;
  if (!chance(s.stage === 3 ? 0.16 : 0.08)) return;
  const options = ["steps", "whisper"];
  if (c.underground || isDarkHours() && !c.roofed) options.push("phantom", "phantom");
  if (c.roofed && isDarkHours() && settings().knocker && hollowNight() >= settings().knockerNight) options.push("knock");
  const kind = pick(options);
  const ok = kind === "phantom" ? spawnPhantom(p, c.underground) : kind === "steps" ? followSteps(p, s) : kind === "whisper" ? whisper(p) : falseKnock(p);
  if (ok) s.nextHallucination = t + Math.round(rand(2400, 5400) * (s.stage === 3 ? 0.6 : 1));
}
function behind(p, d) {
  const v = p.getViewDirection();
  const flat = norm({ x: v.x, y: 0, z: v.z });
  return add(p.location, add(scale(flat, -d), { x: 0, y: 0.2, z: 0 }));
}
function followSteps(p, s) {
  const c = ctx(p);
  const sound = c.underground ? SND.stepClaws : c.roofed ? SND.stepHeavy : SND.stepLeaves;
  s.hallucinating = true;
  let last = { ...p.location };
  let played = 0;
  for (let k = 1; k <= 10; k++) {
    later("dread.steps", k * 9, () => {
      if (!p.isValid) return;
      const moved = dist(last, p.location) > 0.6;
      last = { ...p.location };
      if (moved && played < 6) {
        played++;
        personal(p, sound, 0.55, rand(0.85, 0.95), behind(p, rand(5, 7)));
      }
      if (k === 10) {
        s.hallucinating = false;
        if (played >= 2) unlock(p, "dread2");
      }
    });
  }
  return true;
}
function whisper(p) {
  personal(p, SND.whisper, 0.45, rand(0.9, 1.05), behind(p, 1.6));
  later("dread.whisper", 60, () => p.isValid && unlock(p, "dread2"));
  return true;
}
function falseKnock(p) {
  const d = yawDir(rand(0, 360));
  personal(p, SND.bedtimeKnock, 0.7, 0.95, add(p.location, scale(d, 6)));
  return true;
}
var FORM_WATCHER = 0;
var FORM_HOLLOWED = 1;
var FORM_KNOCKER = 2;
function spawnPhantom(p, underground2) {
  if (phantoms.size >= 8) return false;
  const dim = p.dimension;
  const view = p.getViewDirection();
  const yaw = yawOf(norm({ x: view.x, y: 0, z: view.z }));
  const form = underground2 ? FORM_HOLLOWED : ctx(p).biome === "forest" ? FORM_WATCHER : pick([FORM_WATCHER, FORM_KNOCKER]);
  const head = p.getHeadLocation();
  for (let attempt = 0; attempt < 6; attempt++) {
    const side = chance(0.5) ? 1 : -1;
    const dir = yawDir(yaw + side * rand(38, 58));
    const r = underground2 ? rand(10, 18) : rand(22, 34);
    const guess = add(p.location, scale(dir, r));
    const g = groundNear(dim, guess.x, p.location.y, guess.z, underground2 ? 4 : 8, form === FORM_HOLLOWED ? 2 : 3);
    if (!g) continue;
    const eye = add(g, { x: 0, y: form === FORM_HOLLOWED ? 0.6 : 2.2, z: 0 });
    if (!clearLine(dim, head, eye)) continue;
    let e;
    try {
      e = dim.spawnEntity(ENT.phantom, g);
    } catch {
      return false;
    }
    if (!e) return false;
    try {
      e.setProperty(PROP.form, form);
      e.setRotation({ x: 0, y: yawOf(norm(sub(p.location, g))) });
      p.setPropertyOverrideForEntity(e, PROP.visible, true);
    } catch {
      try {
        e.remove();
      } catch {
      }
      return false;
    }
    phantoms.set(e.id, { playerId: p.id, dim: dim.id, born: now(), form });
    return true;
  }
  return false;
}
function removePhantom(id, seen) {
  const ph = phantoms.get(id);
  phantoms.delete(id);
  const e = world9.getEntity(id);
  if (!e || !e.isValid) return;
  if (seen && ph) {
    const p = world9.getAllPlayers().find((o) => o.id === ph.playerId);
    if (p) {
      personal(p, SND.vanish, 0.7, 1, e.location);
      particle(e.dimension, PARTICLE.shed, add(e.location, { x: 0, y: ph.form === FORM_HOLLOWED ? 0.5 : 1.6, z: 0 }));
      unlock(p, "dread2");
    }
  }
  try {
    e.remove();
  } catch {
  }
}
function observedBy(p, e, form) {
  const head = p.getHeadLocation();
  const at = add(e.location, { x: 0, y: form === FORM_HOLLOWED ? 0.5 : 1.8, z: 0 });
  const to = sub(at, head);
  const d = Math.max(1e-3, Math.hypot(to.x, to.y, to.z));
  const cos = dot(norm(p.getViewDirection()), scale(to, 1 / d));
  return cos > Math.cos(Math.max(9, Math.atan(1.2 / d) * 180 / Math.PI) * Math.PI / 180);
}
function tickPhantoms() {
  const t = now();
  for (const [id, ph] of phantoms) {
    const e = world9.getEntity(id);
    const p = world9.getAllPlayers().find((o) => o.id === ph.playerId);
    if (!e || !e.isValid || !p || !p.isValid || p.dimension.id !== ph.dim) {
      removePhantom(id, false);
      continue;
    }
    const d = dist(p.location, e.location);
    if (observedBy(p, e, ph.form) || d < 9) removePhantom(id, true);
    else if (t - ph.born > 240 || d > 64) removePhantom(id, false);
  }
}
function startDread() {
  setDreadReader((p) => settings().dread ? dreadOf(p) : 0);
  everyPlayer("dread", PERIOD, update);
  system5.runInterval(() => safe("dread.phantoms", tickPhantoms), 4);
}
function setDread(p, v) {
  const s = st2(p);
  s.v = Math.max(0, Math.min(100, v));
  const from = s.stage;
  s.stage = stageFor(s.v, s.stage);
  if (s.stage !== from) onStageChange(p, s, from);
  return `dread ${Math.round(s.v)} (${STAGE_NAMES[s.stage]})`;
}
function forcePhantom(p) {
  return spawnPhantom(p, ctx(p).underground) ? "a phantom stands at the edge of your vision" : "no spot in view for a phantom";
}
function dreadSummary() {
  const parts = [];
  for (const p of world9.getAllPlayers()) parts.push(`${p.name}:${Math.round(dreadLevel(p))}`);
  return parts.join(" ") || "-";
}

// ../../scripts_src/items/components.ts
import { EquipmentSlot as EquipmentSlot3, GameMode as GameMode5, Player as Player14, system as system6, world as world12 } from "@minecraft/server";

// ../../scripts_src/systems/sites.ts
import {
  BlockVolume as BlockVolume2,
  ItemStack as ItemStack2,
  LocationWaypoint,
  StructureRotation,
  WaypointTexture,
  world as world10
} from "@minecraft/server";
var DEFS = {
  cabin: { structures: ["hollow:cabin", "hollow:cabin_collapsed"], size: [11, 9, 11], sink: 1, spacing: 320, cap: 8, lootTable: "hollow/sites/cabin", journal: "place_cabin" },
  camp: { structures: ["hollow:campsite"], size: [13, 6, 13], sink: 1, spacing: 256, cap: 10, lootTable: "hollow/sites/campsite", journal: "place_camp" },
  tower: { structures: ["hollow:watchtower"], size: [7, 15, 7], sink: 1, spacing: 480, cap: 4, lootTable: "hollow/sites/tower", journal: "place_tower" },
  leanto: { structures: ["hollow:leanto"], size: [7, 5, 7], sink: 1, spacing: 220, cap: 8, lootTable: "hollow/sites/leanto", journal: "place_leanto" },
  shrine: { structures: ["hollow:shrine"], size: [25, 13, 25], sink: 0, spacing: 0, cap: 1, lootTable: "", journal: "place_shrine" }
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
    world10.structureManager.place(pick(def.structures), dim, o, { rotation: rot, includeEntities: false, waterlogged: false });
  } catch (e) {
    console.warn(`[hollow] could not place ${def.structures[0]}: ${e}`);
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
var SIGNS = {
  cabin: "§lMISSING§r\nRanger E. Marlowe\nLast seen: the\neast woods",
  camp: "DON'T\nANSWER\nTHE\nDOOR",
  tower: "FIRE WATCH 3\nlights in the\ntrees again.\nnot ours.",
  leanto: "went to check\nthe noise.\nback by dark"
};
function fill(dim, s) {
  const def = DEFS[s.t];
  const c = { x: s.x + Math.floor(s.sx / 2), y: s.y + 2, z: s.z + Math.floor(s.sz / 2) };
  const r = Math.max(s.sx, s.sz);
  const containers = findBlocks(dim, c, ["minecraft:chest", "minecraft:barrel"], Math.ceil(r / 2), s.sy, Math.ceil(r / 2), 4);
  const mgr = world10.getLootTableManager();
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
        SIGNS[s.t] ?? ""
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
  const spawn = world10.getDefaultSpawnLocation();
  if (distXZ(p.location, spawn) < 96) return;
  const bed = p.getSpawnPoint();
  if (c.biome !== "forest" && c.biome !== "open") return;
  const r = Math.random();
  const t = c.biome === "forest" ? r < 0.45 ? "cabin" : r < 0.65 ? "camp" : r < 0.82 ? "tower" : "leanto" : r < 0.65 ? "camp" : "leanto";
  const def = DEFS[t];
  if (allSites().filter((x) => x.t === t).length >= def.cap) return;
  const baseYaw = yawOf(p.getViewDirection());
  for (let k = 0; k < 4; k++) {
    const dir = yawDir(baseYaw + 180 + rand(-70, 70));
    const r2 = rand(56, 80);
    const cx = p.location.x + dir.x * r2;
    const cz = p.location.z + dir.z * r2;
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
    if (old?.point.isValid) p.locatorBar.removeWaypoint(old.point);
    const wp = new LocationWaypoint(
      { dimension: p.dimension, x: c.x, y: c.y, z: c.z },
      { textureBoundsList: [{ lowerBound: 0, texture: WaypointTexture.SmallStar }] },
      { red: 0.85, green: 0.25, blue: 0.2 }
    );
    p.locatorBar.addWaypoint(wp);
    waypoints.set(p.id, { player: p, point: wp });
  } catch {
  }
}
function forgetSites(playerId) {
  const old = waypoints.get(playerId);
  try {
    if (old?.player.isValid && old.point.isValid) old.player.locatorBar.removeWaypoint(old.point);
  } catch {
  }
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
  everyPlayer("sites.place", 1200, (p) => {
    if (!isIsland()) trySurfaceSite(p);
  });
  everyPlayer("sites.discover", 100, discover);
  every("sites.validate", 6e3, () => {
    for (const s of [...allSites()]) {
      let dim;
      try {
        dim = world10.getDimension(s.d);
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

// ../../scripts_src/systems/tracks.ts
import { BlockPermutation as BlockPermutation2, world as world11 } from "@minecraft/server";
var CAP = 96;
var LIFETIME = 24e3;
var GROUND = /* @__PURE__ */ new Set([
  "minecraft:grass_block",
  "minecraft:dirt",
  "minecraft:coarse_dirt",
  "minecraft:podzol",
  "minecraft:mycelium",
  "minecraft:dirt_with_roots",
  "minecraft:mud",
  "minecraft:moss_block",
  "minecraft:sand",
  "minecraft:red_sand",
  "minecraft:gravel",
  "minecraft:clay",
  "minecraft:snow",
  "minecraft:grass_path",
  "minecraft:pale_moss_block"
]);
var tracks;
var lastPrint = /* @__PURE__ */ new Map();
function list() {
  if (!tracks) tracks = readWorldArray(DP.tracks).filter((t) => typeof t?.x === "number");
  return tracks;
}
function persist() {
  writeWorld(DP.tracks, list());
}
function dirOf(v) {
  return Math.abs(v.x) > Math.abs(v.z) ? v.x > 0 ? 1 : 3 : v.z > 0 ? 2 : 0;
}
function pressTrack(dim, at, kind, facing) {
  const cell = { x: Math.floor(at.x), y: Math.floor(at.y), z: Math.floor(at.z) };
  const here = block(dim, cell);
  const below = block(dim, { x: cell.x, y: cell.y - 1, z: cell.z });
  if (!here || !below || !here.isAir || !GROUND.has(below.typeId)) return false;
  const l = list();
  if (l.some((t) => t.d === dim.id && distSq(t, cell) < 1.5)) return false;
  if (l.length >= CAP && !removeOldest()) return false;
  try {
    here.setPermutation(BlockPermutation2.resolve(BLOCK.tracks, { "hollow:kind": kind, "hollow:dir": dirOf(facing) }));
  } catch {
    return false;
  }
  l.push({ d: dim.id, x: cell.x, y: cell.y, z: cell.z, t: world11.getAbsoluteTime() });
  persist();
  return true;
}
function trail(e, kind, stride = 2.2) {
  if (!e.isValid) return;
  const loc = e.location;
  const last = lastPrint.get(e.id);
  if (last && distSq(last, loc) < stride * stride) return;
  const facing = last ? { x: loc.x - last.x, y: 0, z: loc.z - last.z } : e.getViewDirection();
  lastPrint.set(e.id, { ...loc });
  if (lastPrint.size > 64) lastPrint.clear();
  pressTrack(e.dimension, loc, kind, facing);
}
function standingPrints(e, kind) {
  if (!e.isValid) return;
  const loc = e.location;
  const f = e.getViewDirection();
  pressTrack(e.dimension, loc, kind, f);
  pressTrack(e.dimension, { x: loc.x + f.z * 0.9, y: loc.y, z: loc.z - f.x * 0.9 }, kind, f);
}
function removeAt(t) {
  let dim;
  try {
    dim = world11.getDimension(t.d);
    if (!dim.isChunkLoaded(t)) return false;
  } catch {
    return false;
  }
  const b = block(dim, t);
  try {
    if (b?.typeId === BLOCK.tracks) b.setPermutation(BlockPermutation2.resolve("minecraft:air"));
  } catch {
    return false;
  }
  return true;
}
function removeOldest() {
  const l = list();
  for (let i = 0; i < l.length; i++) {
    if (removeAt(l[i])) {
      l.splice(i, 1);
      return true;
    }
  }
  return false;
}
function expire() {
  const l = list();
  if (l.length === 0) return;
  const now2 = world11.getAbsoluteTime();
  let changed = false;
  for (let i = l.length - 1; i >= 0; i--) {
    if (now2 - l[i].t < LIFETIME) continue;
    if (removeAt(l[i])) {
      l.splice(i, 1);
      changed = true;
    }
  }
  if (changed) persist();
}
function notice2(p) {
  const l = list();
  if (l.length === 0) return;
  const loc = p.location;
  for (const t of l) {
    if (t.d === p.dimension.id && distSq(t, loc) < 16) {
      unlock(p, "tracks");
      return;
    }
  }
}
function tracksNear(dim, at, r) {
  const out = [];
  for (const t of list()) {
    if (t.d !== dim.id || distSq(t, at) > r * r) continue;
    const b = block(dim, t);
    const k = b?.typeId === BLOCK.tracks ? b.permutation.getState("hollow:kind") : void 0;
    if (typeof k === "number" && !out.includes(k)) out.push(k);
  }
  return out;
}
function startTracks() {
  every("tracks.expire", 600, expire, 17);
  everyPlayer("tracks.notice", 100, notice2);
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
  return gm === GameMode5.Survival || gm === GameMode5.Adventure;
}
function wearHeld(p, typeId) {
  if (!survivalish(p)) return;
  const eq = p.getComponent("minecraft:equippable");
  if (!eq) return;
  const item = eq.getEquipment(EquipmentSlot3.Mainhand);
  if (!item || item.typeId !== typeId) return;
  const dur = item.getComponent("minecraft:durability");
  if (!dur) return;
  if (dur.damage + 1 >= dur.maxDurability) {
    eq.setEquipment(EquipmentSlot3.Mainhand, void 0);
    p.playSound("random.break");
    return;
  }
  dur.damage += 1;
  eq.setEquipment(EquipmentSlot3.Mainhand, item);
}
function consumeHeld(p, typeId) {
  if (!survivalish(p)) return;
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot3.Mainhand);
  if (!eq || !item || item.typeId !== typeId) return;
  if (item.amount > 1) {
    item.amount -= 1;
    eq.setEquipment(EquipmentSlot3.Mainhand, item);
  } else eq.setEquipment(EquipmentSlot3.Mainhand, void 0);
}
var revealTimers = /* @__PURE__ */ new Map();
var itemSessions = /* @__PURE__ */ new Map();
function forgetItemEffects(playerId) {
  itemSessions.delete(playerId);
  for (const [key, reveal2] of revealTimers) {
    if (reveal2.player.id !== playerId) continue;
    system6.clearRun(reveal2.run);
    revealTimers.delete(key);
    try {
      if (reveal2.player.isValid && reveal2.entity.isValid) {
        reveal2.player.removePropertyOverrideForEntity(reveal2.entity, PROP.revealed);
      }
    } catch {
    }
  }
}
function queueUse(p, typeId, action) {
  let token = itemSessions.get(p.id);
  if (!token) {
    token = {};
    itemSessions.set(p.id, token);
  }
  const dim = p.dimension.id;
  system6.run(() => {
    if (!p.isValid || itemSessions.get(p.id) !== token || p.dimension.id !== dim || heldItem(p) !== typeId) return;
    const hp = p.getComponent("minecraft:health");
    if (hp && hp.currentValue <= 0) return;
    action();
  });
}
function useLens(p) {
  if (!p.isValid || heldItem(p) !== ITEM.lens) return;
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
      if (old) system6.clearRun(old.run);
      const run = system6.runTimeout(() => {
        revealTimers.delete(key);
        try {
          if (p.isValid && b.isValid) p.removePropertyOverrideForEntity(b, PROP.revealed);
        } catch {
        }
      }, 200);
      revealTimers.set(key, { run, player: p, entity: b });
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
    lines.push(`§7The glass clouds: ${name}, ${compass(p.location, e.location)}, ~${d} blocks${vert}.`);
  } else if (borrowed.length === 0) {
    lines.push("§7The glass stays clear. Nothing of theirs within 48 blocks.");
  }
  const prints = tracksNear(dim, p.location, 8);
  if (prints.length > 0) {
    const names = ["the Watcher", "the Knocker", "something dragged from the water", "a Borrowed"];
    lines.push(`§7Fresh tracks here: ${prints.map((k) => names[k]).join(", ")}.`);
  }
  lines.push(`§8Your noise: ${noiseDescription(p)}`);
  notice(p, lines.join("\n"));
  wearHeld(p, ITEM.lens);
}
function registerItemComponents(ev) {
  ev.itemComponentRegistry.registerCustomComponent("hollow:journal", {
    onUse(e) {
      const p = e.source;
      queueUse(p, e.itemStack?.typeId ?? ITEM.journal, () => void openJournal(p));
    }
  });
  ev.itemComponentRegistry.registerCustomComponent("hollow:torn_page", {
    onUse(e) {
      const p = e.source;
      queueUse(p, ITEM.page, () => {
        if (!p.isValid || heldItem(p) !== ITEM.page) return;
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
      queueUse(p, ITEM.lens, () => useLens(p));
    }
  });
  ev.itemComponentRegistry.registerCustomComponent("hollow:heartseeker", {
    onUse(e) {
      const p = e.source;
      queueUse(p, ITEM.heartseeker, () => useHeartseeker(p));
    }
  });
  ev.itemComponentRegistry.registerCustomComponent("hollow:tea", {
    // Hearth Tea: drinking it calms Dread sharply and steadies the nerves for two minutes.
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player14) system6.run(() => p.isValid && drinkTea(p));
    }
  });
  ev.itemComponentRegistry.registerCustomComponent("hollow:material", {
    // Crafting materials: using one re-reads its hint (pickup teaches the recipe, see below).
    onUse(e) {
      const p = e.source;
      const id = e.itemStack?.typeId;
      if (id) queueUse(p, id, () => describeMaterial(p, id));
    }
  });
}
var MATERIAL_HINTS = {
  [ITEM.paleResin]: ["craft_lens", "§7Weeping Sap: sticky, faintly warm, and it never quite dries. A glass could be set with it."],
  [ITEM.hollowFang]: ["craft_heartseeker", "§7Echo Fang: it hums, faintly, toward the ground."],
  [ITEM.borrowedHide]: ["craft_offering", "§7False Fleece: still warm, and it isn't wool. It isn't anything."],
  [ITEM.knockerNail]: ["craft_offering", "§7Doorstep Nail: cold iron, bent like a beckoning finger."],
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
  world12.afterEvents.entityItemPickup.subscribe((ev) => {
    const p = ev.entity;
    if (!(p instanceof Player14)) return;
    for (const stack of ev.items) {
      const h = MATERIAL_HINTS[stack.typeId];
      if (h && !hasEntry(p, h[0])) describeMaterial(p, stack.typeId);
    }
  }, { entityFilter: { type: "minecraft:player" }, itemFilter: { includeTypes: Object.keys(MATERIAL_HINTS) } });
}
function giveOrDrop(p, stack) {
  const inv = p.getComponent("minecraft:inventory");
  const left = inv?.container ? inv.container.addItem(stack) : stack;
  if (left) p.dimension.spawnItem(left, p.location);
}

// ../../scripts_src/creatures/hollowed.ts
import { Player as Player15, world as world13 } from "@minecraft/server";
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
    juvenile,
    listenUntil: 0
  });
}
function tryStartHollowed(p) {
  const s = settings();
  if (!s.hollowed || hollowDay() < s.graceDays) return false;
  const c = ctx(p);
  if (!c.overworld || !c.underground || !huntable(p) || !cooldownReady(p, "hollowed")) return false;
  if (protectedSpot(p.dimension, p.location)) return false;
  const maxY = dayReached(hollowDay(), 3) ? 40 : 0;
  if (p.location.y > maxY) return false;
  let nearCount = 0;
  for (const h of hs.values()) if (h.dim === p.dimension.id && distSq(h.pos, p.location) < 48 * 48) nearCount++;
  if (nearCount >= (s.intensity === 2 ? 3 : 2) || hs.size >= 6) return false;
  if (!chance(0.15 * chanceScale() * dreadChance(p))) return false;
  const dim = p.dimension;
  const head = p.getHeadLocation();
  for (let k = 0; k < 6; k++) {
    const d = yawDir(rand(0, 360));
    const r = rand(18, 30);
    const g = groundNear(dim, p.location.x + d.x * r, p.location.y + rand(-4, 4), p.location.z + d.z * r, 6, 2);
    if (!g || protectedSpot(dim, g)) continue;
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
    setCooldown(p, "hollowed", seconds(rand(150, 240) * cooldownScale() / dreadChance(p)));
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
      const e = world13.getEntity(l.id);
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
  const e = world13.getEntity(l.id);
  if (e?.isValid) {
    try {
      e.remove();
    } catch {
    }
  }
}
function hear(n) {
  if (protectedSpot(n.dim, n.at)) return;
  let heard = false;
  for (const h of hs.values()) {
    if (h.dim !== n.dim.id) continue;
    const d = dist(h.pos, n.at);
    if (d > n.radius) continue;
    const e = world13.getEntity(h.id);
    if (!e?.isValid) continue;
    heard = true;
    if (now() - h.alertAt > 80) {
      h.alertAt = now();
      worldSound(e.dimension, SND.hollowedAlert, e.location, 1, 0.95 + Math.random() * 0.1);
      if (n.source && dist(n.source.location, h.pos) < 20) frighten(n.source, 9);
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
    h.searchAt = { ...n.at };
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
function update2() {
  const t = now();
  for (const l of [...lures.values()]) if (t - l.born > 200) removeLure(l);
  for (const h of [...hs.values()]) {
    const e = world13.getEntity(h.id);
    if (!e?.isValid) {
      hs.delete(h.id);
      continue;
    }
    if (!h.juvenile && protectedSpot(e.dimension, e.location)) {
      hs.delete(h.id);
      e.remove();
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
    if (h.state === "listening") {
      const contact = players.some((p) => huntable(p) && dist(p.location, e.location) < 3);
      if (contact || t >= h.listenUntil) {
        e.triggerEvent(contact ? "hollow:investigate" : "hollow:calm");
        h.state = contact ? "investigate" : "calm";
        h.stateAt = t;
        h.searchAt = void 0;
      }
      continue;
    }
    if (h.state === "investigate" && !h.juvenile) {
      const contact = players.some((p) => huntable(p) && dist(p.location, e.location) < 3);
      if (!contact && h.searchAt && dist(e.location, h.searchAt) < 2.5 && t - h.stateAt >= 20) {
        e.triggerEvent("hollow:listen");
        h.state = "listening";
        h.stateAt = t;
        h.listenUntil = t + seconds(rand(2, 4));
        continue;
      }
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
  if (killer instanceof Player15) unlock(killer, "hollowed3");
}
function startHollowed() {
  setListenerCheck(listenersNear);
  onNoise(hear);
  every("hollowed.update", 20, update2, 5);
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
function save3() {
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
    return world14.getDimension(boss.dim);
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
  return gm === GameMode6.Survival || gm === GameMode6.Adventure;
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
  const held = eq?.getEquipment(EquipmentSlot4.Mainhand);
  if (boss.active) {
    notice(p, "§7The Heart is already awake.");
    return;
  }
  if (hollowDay() < boss.restUntilDay) {
    notice(p, `§7The altar is cold. It will wake again in ${boss.restUntilDay - hollowDay()} day(s).`);
    return;
  }
  if (held?.typeId !== ITEM.offering) {
    notice(p, "§7A socket of old roots. It waits for a §fHush Offering§7.");
    unlock(p, "craft_offering");
    return;
  }
  const s = shrine();
  const dim = altar.dimension;
  const center = s && s.d === dim.id ? { x: s.x + Math.floor(s.sx / 2) + 0.5, y: s.y + 3, z: s.z + Math.floor(s.sz / 2) + 0.5 } : add(altar.location, { x: 0.5, y: 1, z: 9.5 });
  if (survival(p)) {
    if (held.amount > 1) {
      held.amount -= 1;
      eq.setEquipment(EquipmentSlot4.Mainhand, held);
    } else eq.setEquipment(EquipmentSlot4.Mainhand, void 0);
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
  save3();
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
      frighten(p, 20);
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
  save3();
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
  const target2 = players[Math.floor(Math.random() * players.length)];
  const core = add(heart.location, { x: 0, y: 1.3, z: 0 });
  worldSound(dim, SND.heartDrone, core, 1);
  particle(dim, PARTICLE.spores, core);
  const start = norm(sub(target2.location, core));
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
  save3();
}
function update3() {
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
  boss.veins = boss.veins.filter((id) => world14.getEntity(id)?.isValid);
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
  const byId = world14.getEntity(boss.heartId);
  if (byId?.isValid) return byId;
  try {
    for (const e of dim.getEntities({ type: ENT.heart, location: boss.center, maxDistance: 24 })) {
      if (e.getDynamicProperty(FIGHT) === boss.token) {
        boss.heartId = e.id;
        rebindVeins(dim);
        save3();
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
      save3();
    }
  } catch {
  }
}
function clearMinions() {
  for (const id of [...boss.veins, ...minions]) {
    const e = world14.getEntity(id);
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
  save3();
}
function onBossHurt(hurtEntity, amount, by) {
  if (!isBossEntity(hurtEntity.id) || !(by instanceof Player16)) return;
  boss.participants[by.id] = (boss.participants[by.id] ?? 0) + amount;
}
function onShieldHit(heart) {
  worldSound(heart.dimension, SND.heartRootWarn, heart.location, 0.4);
  for (const p of arenaPlayers()) hint(p, "§7It's shielded. Break the glowing veins on the pillars first.");
}
function onVeinDied(id) {
  if (!load().active) return;
  boss.veins = boss.veins.filter((v) => v !== id);
  save3();
}
function onHeartDied(id) {
  if (!load().active || id !== boss.heartId) return;
  const dim = dimOf();
  const winners = new Set(Object.keys(boss.participants));
  for (const p of arenaPlayers()) winners.add(p.id);
  for (const pid of winners) {
    const p = world14.getEntity(pid);
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
  save3();
}
function forgetBossPlayer(p) {
  popFog(p, "hollow_heart");
}
function forceBossPhase(phase) {
  if (!load().active || !boss.heartId) return "no Heart is awake (use the altar first)";
  const heart = world14.getEntity(boss.heartId);
  const h = heart?.getComponent("minecraft:health");
  if (!heart || !h) return "the Heart is not loaded; stand in the arena";
  const set = (f) => h.setCurrentValue(Math.max(1, Math.floor(h.effectiveMax * f)));
  if (phase <= 2) set(0.55);
  else if (boss.phase < 2) {
    set(0.55);
    later("test.phase3", 20, () => {
      if (heart.isValid) set(0.2);
    });
  } else set(0.2);
  return `the Heart drops to phase ${phase}`;
}
function startHeart() {
  load();
  every("heart.update", 5, update3, 13);
}
function bossSummary() {
  if (!load().active) return boss.restUntilDay > hollowDay() ? `resting until day ${boss.restUntilDay + 1}` : "dormant";
  return `phase ${boss.phase}, veins ${boss.veins.length}, participants ${Object.keys(boss.participants).length}`;
}

// ../../scripts_src/items/blocks.ts
var LIMITS = { [DP.chimes]: 32, [DP.wards]: 32, lanterns: 16 };
var LANTERNS = "hollow:lanterns";
var REGISTERED_TYPES = { [DP.chimes]: BLOCK.chime, [DP.wards]: BLOCK.ward, [LANTERNS]: BLOCK.lantern };
var cache3 = /* @__PURE__ */ new Map();
function list2(key) {
  let l = cache3.get(key);
  if (!l) {
    l = readWorldArray(key).filter((s) => s && typeof s.d === "string" && [s.x, s.y, s.z].every((v) => typeof v === "number" && Number.isFinite(v)));
    cache3.set(key, l);
  }
  return l;
}
function persist2(key) {
  writeWorld(key, list2(key));
}
var same = (s, d, loc) => s.d === d.id && s.x === Math.floor(loc.x) && s.y === Math.floor(loc.y) && s.z === Math.floor(loc.z);
function register(key, b, limit) {
  const l = list2(key);
  if (l.some((s) => same(s, b.dimension, b.location))) return true;
  for (const s of [...l]) {
    let dim;
    try {
      dim = world15.getDimension(s.d);
    } catch {
      continue;
    }
    const existing = block(dim, s);
    if (existing && existing.typeId !== REGISTERED_TYPES[key]) unregister(key, dim, s);
  }
  if (l.length >= limit) return false;
  l.push({ d: b.dimension.id, x: b.location.x, y: b.location.y, z: b.location.z });
  persist2(key);
  return true;
}
function unregister(key, d, loc) {
  const l = list2(key);
  const i = l.findIndex((s) => same(s, d, loc));
  if (i >= 0) {
    l.splice(i, 1);
    persist2(key);
    if (key === DP.wards) forgetWardUses(d, loc);
  }
}
function within(key, d, loc, radius) {
  const r2 = radius * radius;
  return list2(key).filter((s) => s.d === d.id && distSq({ x: s.x + 0.5, y: s.y + 0.5, z: s.z + 0.5 }, loc) <= r2);
}
var spotLoc = (s) => ({ x: s.x + 0.5, y: s.y + 0.5, z: s.z + 0.5 });
var WARD_RADIUS = 10;
var wardUses;
var wardKey = (d, loc) => `${d.id}|${Math.floor(loc.x)},${Math.floor(loc.y)},${Math.floor(loc.z)}|`;
function currentWardUses() {
  wardUses ??= readWorldArray(DP.wardUses);
  wardUses = wardUses.filter((u) => u && typeof u.key === "string" && u.night === nightKey()).slice(-256);
  return wardUses;
}
function forgetWardUses(d, loc) {
  const prefix = wardKey(d, loc);
  wardUses = currentWardUses().filter((u) => !u.key.startsWith(prefix));
  writeWorld(DP.wardUses, wardUses);
}
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
    return true;
  } catch {
    return false;
  }
}
function wardNear(dim, loc) {
  for (const s of within(DP.wards, dim, loc, WARD_RADIUS)) {
    const b = block(dim, s);
    if (!b) continue;
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
  const key = `${wardKey(ward.dimension, ward.location)}${creature}`;
  const c = wardCharges(ward);
  if (c <= 0) return;
  const loc = ward.center();
  worldSound(ward.dimension, SND.wardRepel, loc);
  particle(ward.dimension, PARTICLE.wardGlow, loc);
  const uses = currentWardUses();
  if (uses.some((u) => u.key === key)) return;
  if (!setWardCharges(ward, c - 1)) return;
  uses.push({ key, night: nightKey() });
  writeWorld(DP.wardUses, uses);
  if (c - 1 <= 0) worldSound(ward.dimension, SND.wardSpent, loc);
}
function lanternNear(dim, loc, radius = 24) {
  for (const s of within(LANTERNS, dim, loc, radius)) {
    const b = block(dim, s);
    if (!b) continue;
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
  const l = list2(DP.chimes);
  if (l.length === 0) return;
  const t = now();
  for (const s of [...l]) {
    let dim;
    try {
      dim = world15.getDimension(s.d);
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
  return gm === GameMode7.Survival || gm === GameMode7.Adventure;
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
      if (!register(DP.wards, b, LIMITS[DP.wards])) {
        notice(p, "§7This ward is inactive: 32 wards are already registered. Remove another ward, then use this one again. No charcoal spent.");
        return;
      }
      const eq = p.getComponent("minecraft:equippable");
      const held = eq?.getEquipment(EquipmentSlot5.Mainhand);
      if (held?.typeId === "minecraft:charcoal" && c < 4) {
        if (!setWardCharges(b, c + 1)) {
          notice(p, "§7The ward could not be recharged. No charcoal spent; try again when the area is loaded.");
          return;
        }
        if (isSurvivalish(p)) {
          if (held.amount > 1) {
            held.amount -= 1;
            eq.setEquipment(EquipmentSlot5.Mainhand, held);
          } else eq.setEquipment(EquipmentSlot5.Mainhand, void 0);
        }
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
      if (!register(LANTERNS, e.block, LIMITS.lanterns)) {
        for (const p of e.dimension.getPlayers({ location: e.block.location, maxDistance: 8 })) {
          notice(p, "§7This world already has 16 active Heartwood Lanterns. This one gives light only.");
        }
      }
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
    e.triggerEvent(s === "revealing" ? "hollow:begin_reveal" : s === "revealed" ? "hollow:reveal" : s === "fleeing" ? "hollow:flee" : "minecraft:entity_spawned");
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
  setState(e, enc, "revealing");
  enc.pauseUntil = 0;
  teach(e, true);
  for (const p of playersNear(e, 32)) {
    accent(p, SND.stingerLow, 2);
    frighten(p, dist(p.location, e.location) < 12 ? 22 : 10);
  }
  if (by) hint(by, why === "shears" ? "§7The wool doesn't shear. It peels away in one wet sheet." : "§7That was never a sheep.");
}
function tryStartBorrowed(p) {
  const s = settings();
  if (!s.borrowed || hollowDay() < s.graceDays || !dayReached(hollowDay(), 1)) return false;
  const c = ctx(p);
  if (!c.overworld || c.underground || c.inWater) return false;
  if (!huntable(p) || !cooldownReady(p, "borrowed")) return false;
  if (encs.size >= Math.min(2, Math.max(1, onlinePlayers().length))) return false;
  for (const enc of encs.values()) if (enc.target === p.id) return false;
  const base = isDarkHours() ? 0.12 : 0.04;
  if (!chance(base * chanceScale() * dreadChance(p))) return false;
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
  if (!g || dist(g, p.location) < 14 || lanternNear(dim, g)) return false;
  let e;
  try {
    e = dim.spawnEntity(ENT.borrowed, g, { initialRotation: rand(0, 360) });
  } catch {
    return false;
  }
  e.setDynamicProperty(DP.owner, p.id);
  encs.set(e.id, { id: e.id, target: p.id, born: now(), state: "disguised", stateAt: now(), close: 0, noticed: /* @__PURE__ */ new Set(), nextWrong: now() + seconds(30), pauseUntil: 0, nextPause: now() + seconds(rand(8, 16)) });
  setCooldown(p, "borrowed", seconds(rand(600, 900) * cooldownScale() / dreadChance(p)));
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
function update4() {
  if (encs.size === 0) return;
  const t = now();
  for (const enc of [...encs.values()]) {
    const e = world16.getEntity(enc.id);
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
    if (enc.state === "revealing") {
      if (lanternNear(e.dimension, e.location)) {
        vanish(e, enc);
        continue;
      }
      const ward = wardNear(e.dimension, e.location);
      if (ward) {
        useWard(ward, "borrowed");
        setState(e, enc, "fleeing");
        continue;
      }
      if (inState >= 28) setState(e, enc, isDarkHours() ? "revealed" : "fleeing");
      continue;
    }
    if (enc.state === "disguised") {
      if (enc.pauseUntil && t >= enc.pauseUntil) {
        enc.pauseUntil = 0;
        e.triggerEvent("hollow:watchful_end");
      }
      if (!enc.pauseUntil && t >= enc.nextPause) {
        enc.nextPause = t + seconds(rand(10, 18));
        if (near.some((q) => dist(q.location, e.location) <= 20)) {
          enc.pauseUntil = t + seconds(rand(2, 4));
          e.triggerEvent("hollow:watchful");
        }
      }
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
    trail(e, 3 /* Borrowed */, 1.8);
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
  if (enc.state === "disguised") reveal(e, enc, "hurt", by instanceof Player18 ? by : void 0);
  else if (enc.state === "revealed" && hpFraction2(e) < 0.4) setState(e, enc, "fleeing");
}
function onBorrowedDied(id, killer) {
  encs.delete(id);
  if (killer instanceof Player18) {
    unlock(killer, "borrowed1");
    unlock(killer, "borrowed2");
  }
}
function forgetBorrowedTarget(playerId) {
  for (const enc of [...encs.values()]) {
    if (enc.target === playerId && (enc.state === "disguised" || enc.state === "revealing")) vanish(world16.getEntity(enc.id), enc);
  }
}
function startBorrowed() {
  every("borrowed.update", 10, update4, 3);
}

// ../../scripts_src/creatures/knocker.ts
import { Difficulty as Difficulty3, ItemStack as ItemStack6, Player as Player19, world as world17 } from "@minecraft/server";
var visit;
var SAVE = DP.knocker;
var knockerActive = () => !!visit;
var isKnockerTracked = (id) => visit?.id === id;
var savedCache;
function saved() {
  if (!savedCache) savedCache = readWorld(SAVE, { lastNight: -99, plannedKey: -1, planned: false, planTick: 0 });
  return savedCache;
}
function save4(s) {
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
  const eligible2 = cfg.knocker && hollowDay() >= cfg.graceDays && night >= cfg.knockerNight && night - s.lastNight >= gap;
  const next = {
    ...s,
    plannedKey: key,
    planned: eligible2 && chance(Math.min(0.9, 0.45 * chanceScale())),
    planTick: Math.round(rand(13600, 19e3))
  };
  save4(next);
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
    return world17.getDimension(v.dim).getPlayers({ location: v.door, maxDistance: 18 });
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
    if (!huntable(p2) || isNewcomer(p2) && !isTestMode()) continue;
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
      const target2 = add(add(door, scale(out, r)), scale(side, lateral));
      const g = groundNear(dim, target2.x, door.y, target2.z, 8, 3);
      if (!g || lanternNear(dim, g)) continue;
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
      save4({ ...saved(), lastNight: hollowNight(), planned: false });
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
function update5() {
  const v = visit;
  if (!v) {
    if (now() < nextTry) return;
    nextTry = now() + 100;
    tryVisit();
    return;
  }
  const e = world17.getEntity(v.id);
  if (!e?.isValid) {
    visit = void 0;
    return;
  }
  const dim = e.dimension;
  const inState = now() - v.phaseAt;
  const inside = insidePlayers(v);
  const daybreak = isDay();
  if (v.phase === "approach" || v.phase === "leave") trail(e, 1 /* Knocker */, 1.4);
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
    if (d <= 2.4) {
      setPhase(e, v, "knock");
      for (const p of insidePlayers(v)) frighten(p, 16);
      standingPrints(e, 1 /* Knocker */);
    } else if (inState > seconds(70) || daybreak) setPhase(e, v, "leave");
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
    if (!v.broke && cfg.destructive && world17.getDifficulty() === Difficulty3.Hard && inState >= 600 && chance(0.05)) {
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
    frighten(p, 22);
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
    if (by instanceof Player19) answered(e, v);
  }
}
function onKnockerDied(id, killer) {
  if (visit?.id === id) visit = void 0;
  if (killer instanceof Player19) {
    unlock(killer, "knocker1");
    unlock(killer, "knocker3");
  }
}
function forgetKnockerTarget(playerId) {
  if (visit?.target === playerId && (visit.phase === "approach" || visit.phase === "knock")) {
    const e = world17.getEntity(visit.id);
    if (e) setPhase(e, visit, "leave");
  }
}
function forceKnockerTonight() {
  if (visit) return "a visit is already under way";
  const t = tod();
  save4({ ...saved(), plannedKey: nightKey(), planned: true, lastNight: -99, planTick: Math.max(13300, Math.min(21e3, t)) });
  nextTry = 0;
  return t < 13300 || t > 21500 ? "planned: it comes after dusk (time 13300-21500) to a player indoors with a door" : "planned: stay indoors near a door";
}
function startKnocker() {
  every("knocker.update", 10, update5, 9);
}

// ../../scripts_src/creatures/mirebound.ts
import { EntityDamageCause as EntityDamageCause2, Player as Player20, world as world18 } from "@minecraft/server";
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
  if (!s.mirebound || hollowDay() < s.graceDays || !dayReached(hollowDay(), 2)) return false;
  const c = ctx(p);
  if (!c.overworld || c.underground || c.biome !== "swamp" && c.biome !== "shore") return false;
  if (!huntable(p) || rt(p).encounter || !cooldownReady(p, "mirebound")) return false;
  if (ms.size >= Math.min(3, Math.max(1, onlinePlayers().length))) return false;
  const base = isDarkHours() ? 0.12 : 0.03;
  if (!chance(base * chanceScale() * dreadChance(p))) return false;
  if (protectedSpot(p.dimension, p.location)) return false;
  const dim = p.dimension;
  const yaw = yawOf(p.getViewDirection());
  for (let k = 0; k < 10; k++) {
    const d = yawDir(yaw + rand(-55, 55));
    const r = rand(10, 22);
    const at = shallowWater(dim, p.location.x + d.x * r, p.location.y, p.location.z + d.z * r);
    if (!at || distXZ(at, p.location) < 8 || protectedSpot(dim, at)) continue;
    let e;
    try {
      e = dim.spawnEntity(ENT.mirebound, at, { initialRotation: yawOf(norm(sub(p.location, at))) });
    } catch {
      continue;
    }
    e.setDynamicProperty(DP.owner, p.id);
    ms.set(e.id, { id: e.id, target: p.id, born: now(), state: "lurk", stateAt: now(), grabs: 0, nextCue: now() + 40, lastPlayer: now(), dmgAt: 0, seatTries: 0 });
    rt(p).encounter = "mirebound";
    setCooldown(p, "mirebound", seconds(rand(360, 540) * cooldownScale() / dreadChance(p)));
    return true;
  }
  return false;
}
function release(m) {
  ms.delete(m.id);
  const p = world18.getEntity(m.target);
  if (p?.isValid && rt(p).encounter === "mirebound") rt(p).encounter = void 0;
  if (m.victim) {
    const v = world18.getEntity(m.victim);
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
  const v = m.victim ? world18.getEntity(m.victim) : void 0;
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
function update6() {
  if (ms.size === 0) return;
  const t = now();
  for (const m of [...ms.values()]) {
    const e = world18.getEntity(m.id);
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
      const prey = players.find((p) => huntable(p) && distXZ(p.location, e.location) < 3.5 && Math.abs(p.location.y - e.location.y) < 2.5 && nearWater(p) && !protectedSpot(dim, p.location));
      if (prey) {
        setState2(e, m, "erupt");
        m.victim = prey.id;
        worldSound(dim, SND.mireErupt, e.location, 1);
        particle(dim, PARTICLE.bubbles, add(e.location, { x: 0, y: 1, z: 0 }));
        accent(prey, SND.stingerLow, 2);
        frighten(prey, 20);
      }
      continue;
    }
    if (m.state === "erupt") {
      if (inState < 12) continue;
      const v = m.victim ? world18.getEntity(m.victim) : void 0;
      if (!v?.isValid || dist(v.location, e.location) > 3.2 || !huntable(v) || protectedSpot(dim, v.location)) {
        m.victim = void 0;
        if (v?.isValid) notice(v, "§7It snaps at empty water. Get to dry land.");
        setState2(e, m, "retreat");
        continue;
      }
      setState2(e, m, "grab");
      for (let k = 0; k <= 2; k++) {
        const f = k / 2;
        const at = { x: v.location.x + (e.location.x - v.location.x) * f, y: v.location.y, z: v.location.z + (e.location.z - v.location.z) * f };
        pressTrack(dim, at, 2 /* Drag */, { x: e.location.x - v.location.x, y: 0, z: e.location.z - v.location.z });
      }
      m.grabs++;
      m.dmgAt = t;
      m.seatTries = 0;
      continue;
    }
    if (m.state === "grab") {
      const v = m.victim ? world18.getEntity(m.victim) : void 0;
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
  if (m.state === "grab" && by instanceof Player20) letGo(e, m, "hit");
  else if (m.state === "lurk") setState2(e, m, "retreat");
}
function onMireboundDied(id, killer) {
  const m = ms.get(id);
  if (m) release(m);
  if (killer instanceof Player20) {
    unlock(killer, "mirebound1");
    unlock(killer, "mirebound2");
  }
}
function forgetMireboundTarget(playerId) {
  for (const m of [...ms.values()]) {
    const e = world18.getEntity(m.id);
    if (m.victim === playerId && e?.isValid) letGo(e, m, "death");
    if (m.target === playerId && m.state === "lurk") vanish2(e, m);
  }
}
function startMirebound() {
  every("mirebound.update", 2, update6, 11);
}

// ../../scripts_src/creatures/watcher.ts
import { EntityDamageCause as EntityDamageCause3, ItemStack as ItemStack7, Player as Player21, world as world19 } from "@minecraft/server";

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
    e.triggerEvent(s === "stalk" && enc.pattern === "patient" ? "hollow:to_stalk_patient" : `hollow:to_${s}`);
  } catch {
  }
}
function headOf(e) {
  return add(e.location, { x: 0, y: HEAD, z: 0 });
}
function looking(p, e) {
  const head = p.getHeadLocation();
  const target2 = headOf(e);
  const d = dist(head, target2);
  if (d > 72) return false;
  const tol = Math.max(8, Math.atan(1.6 / Math.max(d, 0.1)) * 180 / Math.PI);
  if (angleTo(p.getViewDirection(), head, target2) > tol) return false;
  const dim = p.dimension;
  return clearLine(dim, head, target2) || clearLine(dim, head, add(e.location, { x: 0, y: 1.4, z: 0 }));
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
  if (!c.overworld || !["forest", "open", "shore"].includes(c.biome) || c.underground || c.inWater || c.roofed) return false;
  if (!huntable(p) || rt(p).encounter || !cooldownReady(p, "watcher")) return false;
  if (encounters.size >= Math.min(3, Math.max(1, onlinePlayers().length))) return false;
  if (!chance(0.1 * chanceScale() * dreadChance(p))) return false;
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
    if (!g || protectedSpot(dim, g)) continue;
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
    const previous = rt(p).lastWatcherPattern;
    const pattern = previous ? previous === "direct" ? "patient" : "direct" : chance(0.5) ? "patient" : "direct";
    rt(p).lastWatcherPattern = pattern;
    e.setProperty("hollow:patient", pattern === "patient");
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
      lit: false,
      pattern,
      pauseUntil: 0,
      nextPause: now() + seconds(rand(8, 12))
    };
    encounters.set(e.id, enc);
    rt(p).encounter = "watcher";
    setCooldown(p, "watcher", seconds(rand(240, 420) * cooldownScale() / dreadChance(p)));
    ambient(p, SND.hush, { volume: 0.7, minGap: 0, cueGap: 1200 });
    pushFog(p, FOG.watched, "hollow_watch");
    return true;
  }
  return false;
}
function release2(enc) {
  encounters.delete(enc.id);
  const p = world19.getEntity(enc.target);
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
  if (reason !== "dawn") standingPrints(e, 0 /* Watcher */);
  const dim = e.dimension;
  worldSound(dim, SND.watcherSeen, headOf(e), 0.9);
  later("watcher.retreat", 12, () => {
    if (e.isValid) worldSound(dim, SND.watcherRetreat, e.location, 0.8);
  });
  const target2 = world19.getEntity(enc.target);
  if (target2) popFog(target2, "hollow_watch");
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
function update7() {
  if (encounters.size === 0) return;
  const t = now();
  for (const enc of [...encounters.values()]) {
    const e = world19.getEntity(enc.id);
    if (!e || !e.isValid) {
      release2(enc);
      continue;
    }
    const p = world19.getEntity(enc.target);
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
          frighten(o, 14);
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
      if (t >= enc.pauseUntil && enc.unseen >= 60 && !targetSafe(p, enc)) setState3(e, enc, "stalk");
      continue;
    }
    if (enc.state === "stalk") {
      trail(e, 0 /* Watcher */, 2.8);
      if (targetSafe(p, enc)) {
        setState3(e, enc, "lurk");
        continue;
      }
      if (enc.pattern === "patient" && d > 12 && t >= enc.nextPause) {
        enc.pauseUntil = t + seconds(rand(0.8, 1.4));
        enc.nextPause = t + seconds(rand(7, 11));
        setState3(e, enc, "lurk");
        continue;
      }
      if (d <= 10 && !enc.closeCue) {
        enc.closeCue = true;
        worldSound(e.dimension, "hollow.watcher.step", e.location, 1, 0.8);
        hint(p, "§8...a twig snaps behind you.");
        frighten(p, 12);
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
  withdraw(hurt2, enc, "hurt", by instanceof Player21 ? by : void 0);
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
  if (killer instanceof Player21) {
    unlock(killer, "watcher1");
    unlock(killer, "watcher2");
  }
}
function forgetWatcherTarget(playerId) {
  for (const enc of [...encounters.values()]) {
    if (enc.target !== playerId) continue;
    vanish3(world19.getEntity(enc.id), enc);
  }
}
function startWatcher() {
  every("watcher.update", 4, update7, 1);
}

// ../../scripts_src/systems/music.ts
var LOOPING = ["boss", "shrine"];
var state2 = /* @__PURE__ */ new Map();
function st3(p) {
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
function tick2(p) {
  const fresh = !state2.has(p.id);
  const s = st3(p);
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
  everyPlayer("music", 200, tick2);
}

// ../../scripts_src/systems/events.ts
import { BlockPermutation as BlockPermutation4, ItemStack as ItemStack8 } from "@minecraft/server";
var ANIMALS = [
  "minecraft:sheep",
  "minecraft:cow",
  "minecraft:pig",
  "minecraft:chicken",
  "minecraft:horse",
  "minecraft:donkey",
  "minecraft:rabbit",
  "minecraft:goat",
  "minecraft:llama",
  "minecraft:mooshroom"
];
var done;
var running;
function beginEvent(p) {
  const event = { playerId: p.id, dim: p.dimension.id, origin: { ...p.location } };
  running = event;
  return event;
}
function stillPresent(p, event) {
  if (running !== event) return false;
  if (!p.isValid || p.dimension.id !== event.dim || dist(p.location, event.origin) > 32 || (p.getComponent("minecraft:health")?.currentValue ?? 0) <= 0) {
    running = void 0;
    return false;
  }
  return true;
}
function forgetEventTarget(playerId) {
  if (running?.playerId === playerId) running = void 0;
}
function isDone(id) {
  done ??= readWorldArray(DP.events);
  return done.includes(id);
}
function markDone(id) {
  done ??= readWorldArray(DP.events);
  if (!done.includes(id)) done.push(id);
  writeWorld(DP.events, done);
}
function animalsAround(p) {
  const out = [];
  for (const type of ANIMALS) {
    try {
      out.push(...p.dimension.getEntities({ type, location: p.location, maxDistance: 24 }));
    } catch {
    }
  }
  return out;
}
function everyEye(p) {
  const herd = animalsAround(p).slice(0, 24);
  if (herd.length < 5) return false;
  const event = beginEvent(p);
  ambient(p, SND.hush, { volume: 0.9, minGap: 0, cueGap: 0 });
  accent(p, SND.stingerDistant, 1, true);
  const steps = 32;
  for (let k = 0; k <= steps; k++) {
    later("event.eye", k * 5, () => {
      if (!stillPresent(p, event)) return;
      for (const a of herd) {
        if (!a.isValid || a.dimension.id !== event.dim || dist(a.location, event.origin) > 32) continue;
        try {
          a.setRotation({ x: 0, y: yawOf(norm(sub(p.location, a.location))) });
          a.addEffect("slowness", 10, { amplifier: 255, showParticles: false });
        } catch {
        }
      }
      if (k === steps) {
        running = void 0;
        unlock(p, "event_eye");
      }
    });
  }
  return true;
}
function getLantern() {
  const l = readWorld(DP.lantern, { dim: "" });
  return l.dim ? l : void 0;
}
function setLantern(l) {
  writeWorld(DP.lantern, l ?? { dim: "" });
}
function theLantern(p) {
  if (getLantern()) return false;
  const dim = p.dimension;
  const head = p.getHeadLocation();
  const view = yawOf(p.getViewDirection());
  for (let k = 0; k < 8; k++) {
    const dir = yawDir(view + 180 + rand(-60, 60));
    const r = rand(26, 38);
    const g = groundNear(dim, p.location.x + dir.x * r, p.location.y, p.location.z + dir.z * r, 8, 3);
    if (!g) continue;
    const stump = block(dim, g);
    const top = block(dim, add(g, { x: 0, y: 1, z: 0 }));
    if (!stump?.isAir || !top?.isAir) continue;
    if (clearLine(dim, head, add(g, { x: 0, y: 1.5, z: 0 }))) continue;
    try {
      stump.setPermutation(BlockPermutation4.resolve("minecraft:spruce_log"));
      top.setPermutation(BlockPermutation4.resolve("minecraft:lantern"));
    } catch {
      continue;
    }
    setLantern({ dim: dim.id, at: g });
    return true;
  }
  return false;
}
function watchLantern(p) {
  const lantern = getLantern();
  if (!lantern || p.dimension.id !== lantern.dim) return;
  if (dist(p.location, lantern.at) > 6) return;
  const dim = p.dimension;
  const top = block(dim, add(lantern.at, { x: 0, y: 1, z: 0 }));
  if (!top) return;
  if (top.typeId !== "minecraft:lantern") {
    setLantern(void 0);
    return;
  }
  try {
    dim.spawnItem(new ItemStack8(ITEM.page, 1), add(lantern.at, { x: 0.8, y: 0.2, z: 0.4 }));
  } catch {
    return;
  }
  setLantern(void 0);
  try {
    top.setPermutation(BlockPermutation4.resolve("minecraft:air"));
  } catch {
  }
  worldSound(dim, SND.windGust, lantern.at, 0.8);
  for (const q of dim.getPlayers({ location: lantern.at, maxDistance: 16 })) unlock(q, "event_lantern");
}
function onTheRoof(p) {
  const dim = p.dimension;
  let roofY;
  try {
    const hit = dim.getBlockFromRay(p.getHeadLocation(), { x: 0, y: 1, z: 0 }, { maxDistance: 6, includePassableBlocks: false });
    roofY = hit ? hit.block.location.y + 1 : void 0;
  } catch {
    roofY = void 0;
  }
  if (roofY === void 0) return false;
  const along = yawDir(yawOf(p.getViewDirection()) + 90);
  const event = beginEvent(p);
  for (let k = 0; k < 7; k++) {
    later("event.roof", 20 + k * 17, () => {
      if (!stillPresent(p, event)) return;
      const at = { x: event.origin.x + along.x * (k - 3) * 1.2, y: roofY, z: event.origin.z + along.z * (k - 3) * 1.2 };
      worldSound(dim, "hollow.knocker.step", at, 1, 0.85);
    });
  }
  later("event.roof.end", 20 + 7 * 17 + 60, () => {
    if (!stillPresent(p, event)) return;
    running = void 0;
    unlock(p, "event_roof");
  });
  return true;
}
function eligible(p) {
  return settings().rareEvents && huntable(p) && !isNewcomer(p) && !rt(p).encounter && !running;
}
function tick3(p) {
  watchLantern(p);
  if (!eligible(p) || !isNight() || !chance(0.04)) return;
  const c = ctx(p);
  if (!c.overworld || c.underground) return;
  const night = hollowNight();
  if (!c.roofed && night >= 3 && !isDone("eye") && everyEye(p)) markDone("eye");
  else if (!c.roofed && c.biome === "forest" && night >= 4 && !isDone("lantern") && theLantern(p)) markDone("lantern");
  else if (c.roofed && night >= 6 && !isDone("roof") && onTheRoof(p)) markDone("roof");
}
function forceEvent(p, id) {
  if (running) return "an event is already running";
  if (id === "lantern" && getLantern()) return "a lantern is already burning; walk to it first";
  const ok = id === "eye" ? everyEye(p) : id === "lantern" ? theLantern(p) : id === "roof" ? onTheRoof(p) : false;
  if (ok) markDone(id);
  if (!ok) {
    return id === "eye" ? "needs 5+ animals within 24 blocks" : id === "lantern" ? "needs open ground nearby" : id === "roof" ? "stand under a roof" : "usage: event eye|lantern|roof";
  }
  return `event ${id} started`;
}
function startEvents() {
  everyPlayer("events", 400, tick3);
}

// ../../scripts_src/systems/ambience.ts
function far(p, lo = 18, hi = 40) {
  const d = yawDir(rand(0, 360));
  const r = rand(lo, hi);
  return add(p.location, { x: d.x * r, y: rand(0, 4), z: d.z * r });
}
function tick4(p) {
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
  everyPlayer("ambience", 120, tick4);
  everyPlayer("bedtime", 40, bedtime);
}

// ../../scripts_src/systems/cleanup.ts
import { world as world20 } from "@minecraft/server";
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
      const dim = world20.getDimension(id);
      for (const e of dim.getEntities({ families: [FAMILY.any] })) cleanEntity(e);
    } catch {
    }
  }
}
function startCleanup() {
  world20.afterEvents.entityLoad.subscribe((ev) => {
    const e = ev.entity;
    if (e.typeId.startsWith("hollow:")) cleanEntity(e);
  });
}

// ../../scripts_src/systems/director.ts
var starters = [];
function addStarter(s) {
  starters.push(s);
}
var PERIOD2 = 100;
function evaluate(p) {
  addPlayTime(p, PERIOD2);
  if (!huntable(p) || isNewcomer(p) && !isTestMode()) return;
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
  everyPlayer("director", PERIOD2, evaluate);
}

// ../../scripts_src/island/guns.ts
import {
  EntityDamageCause as EntityDamageCause4,
  EquipmentSlot as EquipmentSlot6,
  GameMode as GameMode8,
  ItemStack as ItemStack9,
  Player as Player23,
  system as system7
} from "@minecraft/server";
var MAG_SIZE = 7;
var RANGE = 48;
var reloading = /* @__PURE__ */ new Map();
function survivalish2(p) {
  const gm = p.getGameMode();
  return gm === GameMode8.Survival || gm === GameMode8.Adventure;
}
function magOf(item) {
  if (!item) return 0;
  const v = item.getDynamicProperty(DP.mag);
  return typeof v === "number" ? Math.max(0, Math.min(MAG_SIZE, Math.round(v))) : MAG_SIZE;
}
function setMag(item, n) {
  item.setDynamicProperty(DP.mag, n);
  item.setLore([`§7Magazine: §f${n}§7/${MAG_SIZE}`, "§8Sneak + Use to reload"]);
}
function pistolStack(rounds = MAG_SIZE) {
  const s = new ItemStack9(ITEM.pistol, 1);
  setMag(s, rounds);
  return s;
}
function heldPistol(p) {
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot6.Mainhand);
  return item?.typeId === ITEM.pistol ? item : void 0;
}
function putBack(p, item) {
  p.getComponent("minecraft:equippable")?.setEquipment(EquipmentSlot6.Mainhand, item);
}
function countRounds(p) {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return 0;
  let n = 0;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it?.typeId === ITEM.round) n += it.amount;
  }
  return n;
}
function takeRounds(p, want) {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return 0;
  let got = 0;
  for (let i = 0; i < c.size && got < want; i++) {
    const it = c.getItem(i);
    if (it?.typeId !== ITEM.round) continue;
    const take = Math.min(it.amount, want - got);
    got += take;
    if (take >= it.amount) c.setItem(i, void 0);
    else {
      it.amount -= take;
      c.setItem(i, it);
    }
  }
  return got;
}
function reload(p) {
  const item = heldPistol(p);
  if (!item) return;
  const mag = magOf(item);
  if (mag >= MAG_SIZE) {
    hint(p, "§7The magazine is full.");
    return;
  }
  const creative = !survivalish2(p);
  if (!creative && countRounds(p) === 0) {
    ui(p, SND.dryFire, 0.8);
    notice(p, "§7No 9mm rounds left. §8Check the crash crates, bunkers and the dead.");
    return;
  }
  const until = system7.currentTick + 26;
  reloading.set(p.id, until);
  worldSound(p.dimension, SND.reload, p.location, 0.9);
  system7.runTimeout(() => {
    if (!p.isValid || reloading.get(p.id) !== until) return;
    reloading.delete(p.id);
    const now2 = heldPistol(p);
    if (!now2) return;
    const need = MAG_SIZE - magOf(now2);
    const got = creative ? need : takeRounds(p, need);
    setMag(now2, magOf(now2) + got);
    putBack(p, now2);
    hint(p, `§7Reloaded: §f${magOf(now2)}§7/${MAG_SIZE}  §8(${creative ? "∞" : countRounds(p)} spare)`);
  }, 26);
}
function add2(a, b, k = 1) {
  return { x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k };
}
function fire(p) {
  const item = heldPistol(p);
  if (!item) return;
  if ((reloading.get(p.id) ?? 0) > system7.currentTick) return;
  if (p.isSneaking) {
    reload(p);
    return;
  }
  const mag = magOf(item);
  if (mag <= 0) {
    ui(p, SND.dryFire, 0.9);
    hint(p, "§7Click. Empty. §8Sneak + Use to reload.");
    return;
  }
  setMag(item, mag - 1);
  putBack(p, item);
  const dim = p.dimension;
  const eye = p.getHeadLocation();
  const dir = p.getViewDirection();
  const muzzle = add2(eye, dir, 0.9);
  worldSound(dim, SND.pistol, eye, 1, 0.95 + Math.random() * 0.1);
  particle(dim, "minecraft:basic_flame_particle", muzzle);
  particle(dim, "minecraft:basic_smoke_particle", muzzle);
  try {
    p.runCommand("camerashake add @s 0.22 0.12 rotational");
  } catch {
  }
  emitNoise({ dim, at: p.location, radius: 48, kind: "gunshot", source: p });
  let hitAt;
  let target2;
  let distance = RANGE;
  try {
    const hits = p.getEntitiesFromViewDirection({
      maxDistance: RANGE,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb", ENT.crewBody, ENT.bullet, ENT.trevor, ENT.lure, ENT.phantom],
      excludeFamilies: ["inanimate"]
    });
    for (const h of hits) {
      if (h.entity.id === p.id || h.entity.typeId === "minecraft:player") continue;
      target2 = h.entity;
      distance = h.distance;
      break;
    }
  } catch {
  }
  if (target2) {
    hitAt = add2(eye, dir, distance);
    const falloff = distance <= 20 ? 1 : Math.max(0.57, 1 - (distance - 20) / 65);
    let dmg = 7 * falloff;
    try {
      if (hitAt.y >= target2.getHeadLocation().y - 0.35) dmg *= 1.6;
    } catch {
    }
    try {
      target2.applyDamage(Math.round(dmg), { cause: EntityDamageCause4.entityAttack, damagingEntity: p });
    } catch {
    }
    worldSound(dim, SND.bulletHit, hitAt, 0.9);
    particle(dim, "minecraft:critical_hit_emitter", hitAt);
  } else {
    try {
      const b = p.getBlockFromViewDirection({ maxDistance: RANGE });
      if (b) {
        hitAt = add2(b.block.location, b.faceLocation);
        particle(dim, "minecraft:basic_smoke_particle", hitAt);
        worldSound(dim, SND.bulletHit, hitAt, 0.5, 1.3);
      }
    } catch {
    }
  }
  if (mag - 1 === 0) hint(p, "§7Last round. §8Sneak + Use to reload.");
  unlock(p, "gear_pistol", true);
}
function forgetGuns(playerId) {
  reloading.delete(playerId);
}
function heal(p) {
  try {
    p.addEffect("instant_health", 1, { amplifier: 0, showParticles: false });
    p.addEffect("regeneration", 120, { amplifier: 1, showParticles: true });
  } catch {
  }
  notice(p, "§7You clean and dress the wounds.");
}
function registerGearComponents(ev) {
  const reg = ev.itemComponentRegistry;
  reg.registerCustomComponent("hollow:pistol", {
    onUse(e) {
      const p = e.source;
      system7.run(() => p.isValid && fire(p));
    }
  });
  reg.registerCustomComponent("hollow:geiger", {
    onUse(e) {
      const p = e.source;
      system7.run(() => {
        if (!p.isValid) return;
        if (!isIsland()) {
          notice(p, "§7The needle barely moves. Background radiation only.");
          return;
        }
        notice(p, geigerReading(p));
        unlock(p, "radiation1");
      });
    }
  });
  reg.registerCustomComponent("hollow:medkit", {
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player23) system7.run(() => p.isValid && heal(p));
    }
  });
  reg.registerCustomComponent("hollow:iodine", {
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player23) system7.run(() => p.isValid && takeIodine(p));
    }
  });
  reg.registerCustomComponent("hollow:ration", {
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player23) system7.run(() => p.isValid && hint(p, "§7Beef stew and crackers, cold. It's the best thing you've ever eaten."));
    }
  });
  reg.registerCustomComponent("hollow:broken_radio", {
    onUse(e) {
      const p = e.source;
      system7.run(() => {
        if (!p.isValid) return;
        ui(p, "random.click", 0.6, 0.8);
        notice(p, "§7Static. The board is cracked clean through and the battery is swollen.\n§fIt will never call the mainland. §7Something bigger might: the old relay on the north peak.");
        unlock(p, "tower_hint");
      });
    }
  });
}

// ../../scripts_src/island/story.ts
import { ItemStack as ItemStack10, system as system9, world as world22 } from "@minecraft/server";

// ../../scripts_src/island/trevor.ts
import { system as system8, world as world21 } from "@minecraft/server";
import { ActionFormData as ActionFormData3 } from "@minecraft/server-ui";
var DEFAULT2 = {
  mode: "follow",
  downAt: 0,
  awayDay: -1,
  gone: false,
  medkits: 3,
  medkitDay: 0,
  home: { x: SITES.SPAWN.x, y: 66, z: SITES.SPAWN.z },
  lastNight: -1,
  deaths: 0
};
var DOWN_TICKS = 1200;
var REVIVE_TICKS = 60;
var state3;
var lineCooldown = /* @__PURE__ */ new Map();
var reviving = /* @__PURE__ */ new Map();
function st4() {
  if (!state3) state3 = { ...DEFAULT2, ...readWorld(DP.trevor, DEFAULT2) };
  return state3;
}
function saveState() {
  writeWorld(DP.trevor, st4());
}
function trevorEntity() {
  const s = st4();
  if (s.id) {
    try {
      const e = world21.getEntity(s.id);
      if (e?.isValid) return e;
    } catch {
    }
  }
  try {
    const found = world21.getDimension("overworld").getEntities({ type: ENT.trevor });
    if (found.length > 0) {
      for (const extra of found.slice(1)) extra.triggerEvent("hollow:despawn");
      s.id = found[0].id;
      saveState();
      return found[0];
    }
  } catch {
  }
  return void 0;
}
function trevorGone() {
  return st4().gone;
}
function say(text, key, cooldownTicks = 0) {
  if (key) {
    const last = lineCooldown.get(key) ?? -999999;
    if (now() - last < cooldownTicks) return false;
    lineCooldown.set(key, now());
  }
  const e = trevorEntity();
  const msg = `§2Trevor:§r ${text}`;
  for (const p of world21.getAllPlayers()) {
    if (!p.isValid) continue;
    if (e && p.dimension.id === e.dimension.id) {
      const d = Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z);
      if (d > 64) continue;
    }
    p.sendMessage(msg);
  }
  return true;
}
function spawnTrevor(at) {
  const s = st4();
  if (s.gone) return void 0;
  const existing = trevorEntity();
  if (existing) return existing;
  try {
    const e = world21.getDimension("overworld").spawnEntity(ENT.trevor, at);
    e.nameTag = "Trevor";
    s.id = e.id;
    s.downAt = 0;
    saveState();
    return e;
  } catch {
    return void 0;
  }
}
function setStateProp(e, mode) {
  e.triggerEvent(mode === "follow" ? "hollow:follow" : "hollow:hold");
}
function orderFollow(p, quiet = false) {
  const s = st4();
  const e = trevorEntity();
  s.mode = "follow";
  s.leader = p.id;
  s.leaderName = p.name;
  saveState();
  if (!e || isDown()) return;
  e.triggerEvent("hollow:release");
  system8.run(() => safe("trevor.tame", () => {
    if (!e.isValid || !p.isValid) return;
    const tame = e.getComponent("minecraft:tameable");
    let ok = false;
    try {
      ok = !!tame?.tame(p);
    } catch {
      ok = false;
    }
    if (!ok) setStateProp(e, "follow");
  }));
  if (!quiet) say(pick([`Right behind you, ${p.name}.`, "Lead on.", `On you, ${p.name}.`, "I've got your back."]));
}
function orderHold(p, quiet = false) {
  const s = st4();
  const e = trevorEntity();
  s.mode = "hold";
  if (p) {
    s.leader = p.id;
    s.leaderName = p.name;
  }
  saveState();
  if (!e || isDown()) return;
  setStateProp(e, "hold");
  if (!quiet) say(pick(["I'll hold here.", "Holding. Shout if you need me.", "Fine. I'll keep watch on this spot."]));
}
function isDown() {
  return st4().downAt > 0;
}
function leader() {
  const s = st4();
  return world21.getAllPlayers().find((p) => p.id === s.leader && p.isValid);
}
function onDown(e) {
  const s = st4();
  if (s.downAt > 0) return;
  s.downAt = world21.getAbsoluteTime();
  saveState();
  worldSound(e.dimension, "hollow.trevor.hurt", e.location, 1, 0.8);
  say("§cI'm hit... I'm down! §7Somebody... get me up.");
  for (const p of world21.getAllPlayers()) {
    notice(p, "§cTrevor is down. §7Go to him and press Use on him to help him up (60 s).");
  }
}
function helpUp(e, by) {
  const s = st4();
  s.downAt = 0;
  saveState();
  e.triggerEvent("hollow:revive");
  try {
    const hp = e.getComponent("minecraft:health");
    hp?.setCurrentValue(Math.max(hp.currentValue, 22));
  } catch {
  }
  system8.run(() => {
    if (!e.isValid) return;
    const l = leader();
    if (s.mode === "follow" && l) orderFollow(l, true);
    else setStateProp(e, "hold");
  });
  say(by ? pick([`Thanks, ${by.name}. I owe you one.`, "Ugh. That was close. Thank you.", "Okay... okay. I'm good. Let's move."]) : "On my feet again.");
  if (by) unlock(by, "trevor_down", true);
}
function fallFor(e) {
  const s = st4();
  s.downAt = 0;
  s.deaths += 1;
  if (settings().trevorPermadeath) {
    s.gone = true;
    s.id = void 0;
    saveState();
    if (e?.isValid) {
      try {
        e.kill();
      } catch {
        e.triggerEvent("hollow:despawn");
      }
    }
    for (const p of world21.getAllPlayers()) {
      p.sendMessage("§8Trevor Hale is dead. Nobody reached him in time.");
      notice(p, "§8Trevor is gone.");
    }
    return;
  }
  s.awayDay = world21.getDay();
  s.id = void 0;
  saveState();
  if (e?.isValid) e.triggerEvent("hollow:despawn");
  for (const p of world21.getAllPlayers()) {
    p.sendMessage("§7Trevor crawled off into the brush. §8He'll find his way back to camp at dawn, if he can.");
  }
}
function tickDowned(e) {
  const s = st4();
  const left = DOWN_TICKS - (world21.getAbsoluteTime() - s.downAt);
  if (left <= 0) {
    fallFor(e);
    return;
  }
  for (const p of world21.getAllPlayers()) {
    const n = reviving.get(p.id);
    if (n === void 0) continue;
    const d = Math.hypot(p.location.x - e.location.x, p.location.y - e.location.y, p.location.z - e.location.z);
    if (!p.isValid || p.dimension.id !== e.dimension.id || d > 3.2) {
      reviving.delete(p.id);
      notice(p, "§7You moved away. §8Press Use on him again to help him up.");
      continue;
    }
    const next = n + 10;
    reviving.set(p.id, next);
    const bars = Math.round(next / REVIVE_TICKS * 10);
    notice(p, `§7Helping Trevor up  §a${"█".repeat(bars)}§8${"█".repeat(10 - bars)}`);
    if (next >= REVIVE_TICKS) {
      reviving.clear();
      helpUp(e, p);
      return;
    }
  }
  if (left % 200 < 10) {
    for (const p of world21.getAllPlayers()) {
      if (!reviving.has(p.id)) notice(p, `§cTrevor is down §7(${Math.ceil(left / 20)} s left).`);
    }
  }
}
function statusLine(e) {
  const s = st4();
  if (s.gone) return "§8Trevor is dead.";
  if (!e) return s.awayDay >= 0 ? "§7Trevor is somewhere out there, making his way back to camp." : "§7Trevor isn't nearby.";
  const hp = e.getComponent("minecraft:health");
  const pct = hp ? Math.round(hp.currentValue / hp.effectiveMax * 100) : 100;
  const order = s.mode === "follow" ? `following §f${s.leaderName ?? "the group"}` : "holding his position";
  return `§7Health §f${pct}%§7 · ${order}§7 · medkits §f${s.medkits}`;
}
function advice(p) {
  const rate = rateAt(p);
  if (rate > 40) return "That counter of yours is going mad. Whatever we're doing here, let's do it fast.";
  if (isDarkHours()) return pick([
    "Stay in the light tonight. Something's been circling us since the sun went down.",
    "Sleep in shifts if you can. I'll take first watch.",
    "If you hear clicking, freeze. Don't run. Trust me on that."
  ]);
  const dCrash = Math.hypot(p.location.x - SITES.CRASH.x, p.location.z - SITES.CRASH.z);
  if (dCrash < 60) return pick([
    "Shelter first. Walls, a roof, a door that shuts. Then we worry about getting off this rock.",
    "The crates had rations and rounds. Don't leave anything in that wreck.",
    "Dan had a flight bag. Check him, if you can stomach it. I couldn't."
  ]);
  return pick([
    "The survey map put six monitoring stations on this island. If they're still standing, they'll have logs.",
    "There's a relay tower on the north peak. If it has any power left, that's our phone home.",
    "Those shots came from the north-west treeline. Whoever they were, they knew how to shoot.",
    "Keep your dose low. Radiation doesn't hurt until it's far too late.",
    "Seventy years since the test. Nothing here should still be this... alive."
  ]);
}
async function talk(p, e) {
  const s = st4();
  if (isDown()) {
    if (!reviving.has(p.id)) {
      reviving.set(p.id, 0);
      notice(p, "§7Stay beside him...");
      ui(p, "random.click", 0.4, 0.6);
    }
    return;
  }
  await formSession(p, async () => {
    const form = new ActionFormData3().title("§lTrevor Hale").body(`${statusLine(e)}

§o"${advice(p)}"`).button("Follow me", "textures/ui/hollow/journal/trevor").button("Hold here", "textures/ui/hollow/world").button(s.medkits > 0 ? "Patch me up\n§8uses one of his medkits" : "Patch me up\n§8he's out of medkits", "textures/ui/hollow/journal/item_medkit").button("§8Chop trees · gather · build\n§8(coming with the next update)", "textures/ui/hollow/journal/item_survival_hatchet").button("§8Close", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled || r.selection === void 0 || !e.isValid) return;
    if (r.selection === 0) {
      if (rateAt(p) > 60) say("Not in there. Not without a suit. Come back out and I'll follow you anywhere else.");
      else orderFollow(p);
    } else if (r.selection === 1) orderHold(p);
    else if (r.selection === 2) patchUp(p);
    else if (r.selection === 3) say("One thing at a time. Let's stay alive tonight first.");
  });
  unlock(p, "trevor1");
}
function patchUp(p) {
  const s = st4();
  const hp = p.getComponent("minecraft:health");
  if (!hp) return;
  if (hp.currentValue >= hp.effectiveMax - 1) {
    say(`You're fine, ${p.name}. I'm saving these.`);
    return;
  }
  if (s.medkits <= 0) {
    say("I'm out. Bring me anything you find in the bunkers and I'll make it stretch.");
    return;
  }
  s.medkits -= 1;
  saveState();
  try {
    p.addEffect("instant_health", 1, { amplifier: 0, showParticles: false });
    p.addEffect("regeneration", 120, { amplifier: 1 });
  } catch {
  }
  say(pick(["Hold still. This'll sting.", "Pressure on it. There. You'll live.", "Clean, dressed. Try not to do that again."]));
}
var beats = 0;
function awareness(e) {
  const s = st4();
  beats++;
  if (beats % 20 === 0) {
    try {
      const hp = e.getComponent("minecraft:health");
      if (hp && hp.currentValue < hp.effectiveMax) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + 1));
    } catch {
    }
  }
  if (world21.getDay() > s.medkitDay && s.medkits < 3) {
    s.medkits += 1;
    s.medkitDay = world21.getDay();
    saveState();
  }
  const near = world21.getAllPlayers().filter((p) => p.isValid && p.dimension.id === e.dimension.id && Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z) < 24);
  for (const p of near) {
    const hp = p.getComponent("minecraft:health");
    if (!hp || hp.currentValue <= 0 || hp.currentValue > 6 || s.medkits <= 0) continue;
    if (Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z) > 8) continue;
    const key = `medkit:${p.id}`;
    if (now() - (lineCooldown.get(key) ?? -99999) < 1800) continue;
    lineCooldown.set(key, now());
    patchUp(p);
  }
  const l = leader();
  if (s.mode === "follow" && l && rateAt(l) > 60 && Math.hypot(l.location.x - e.location.x, l.location.z - e.location.z) < 40) {
    s.mode = "hold";
    saveState();
    setStateProp(e, "hold");
    say("§eNo. Not in there without a suit. §rI'll wait right here. Don't be long.");
    s.waitingFor = l.id;
  }
  const waiting = s.waitingFor;
  if (s.mode === "hold" && waiting && l && l.id === waiting && rateAt(l) < 20 && Math.hypot(l.location.x - e.location.x, l.location.z - e.location.z) < 12) {
    s.waitingFor = void 0;
    orderFollow(l, true);
    say("Good. Let's get away from that hole.");
  }
  if (s.mode === "follow" && l && l.dimension.id === e.dimension.id) {
    const d = Math.hypot(l.location.x - e.location.x, l.location.z - e.location.z);
    if (d > 40) {
      const back = l.getViewDirection();
      const g = groundNear(l.dimension, l.location.x - back.x * 4, l.location.y, l.location.z - back.z * 4, 6);
      if (g) e.teleport(g);
    }
  }
  if (isDarkHours() && s.lastNight !== nightKey()) {
    s.lastNight = nightKey();
    saveState();
    say(pick(["Sun's going down. Stay close, stay in the light.", "Here comes the dark. Weapons where you can reach them.", "Night. Listen more than you look."]));
  }
  try {
    const clickers = e.dimension.getEntities({ type: ENT.hollowed, location: e.location, maxDistance: 22 });
    if (clickers.length > 0) say("§7(whispering)§r Hear that clicking? Don't move. Don't make a sound.", "hollowed", 3600);
    const watcher = e.dimension.getEntities({ type: ENT.watcher, location: e.location, maxDistance: 40 });
    if (watcher.length > 0) say("There's... someone standing in the trees. Don't take your eyes off it.", "watcher", 4800);
  } catch {
  }
  if (tod() < 400 && s.lastNight >= 0) say(pick(["Made it to morning.", "Sun's up. We live another day."]), "dawn", 12e3);
}
function tick5() {
  if (!isIsland()) return;
  const s = st4();
  if (s.gone) return;
  const e = trevorEntity();
  if (!e) {
    if (s.awayDay >= 0 && world21.getDay() > s.awayDay && tod() < 3e3) {
      const home = s.home;
      const dim = world21.getDimension("overworld");
      let at;
      try {
        if (dim.isChunkLoaded(home)) at = groundNear(dim, home.x, home.y, home.z, 12) ?? home;
      } catch {
        at = void 0;
      }
      if (!at) {
        const p = world21.getAllPlayers().find((x) => x.dimension.id === "minecraft:overworld");
        if (p) at = groundNear(dim, p.location.x + 6, p.location.y, p.location.z + 6, 8);
      }
      if (at) {
        s.awayDay = -1;
        saveState();
        const back = spawnTrevor(at);
        if (back) {
          const hp = back.getComponent("minecraft:health");
          try {
            hp?.setCurrentValue(20);
          } catch {
          }
          s.medkits = Math.max(0, s.medkits - 1);
          saveState();
          say("§7(limping)§r Took me all night to find you. Lost a medkit on the way. Don't ask.");
          const l = leader();
          if (l) orderFollow(l, true);
        }
      }
    }
    if (s.downAt > 0 && world21.getAbsoluteTime() - s.downAt > DOWN_TICKS) fallFor(void 0);
    return;
  }
  if (isDown()) {
    tickDowned(e);
    return;
  }
  awareness(e);
}
function forgetTrevorPlayer(playerId) {
  reviving.delete(playerId);
}
function trevorSummary() {
  const s = st4();
  const e = trevorEntity();
  return `trevor: ${e ? "loaded" : "absent"} mode=${s.mode} leader=${s.leaderName ?? "-"} down=${s.downAt > 0} gone=${s.gone} away=${s.awayDay} medkits=${s.medkits} falls=${s.deaths}`;
}
function forceDown() {
  const e = trevorEntity();
  if (!e) return "Trevor is not loaded";
  e.triggerEvent("hollow:down");
  onDown(e);
  return "Trevor is down";
}
function setHome(at) {
  st4().home = { x: Math.floor(at.x), y: Math.floor(at.y), z: Math.floor(at.z) };
  saveState();
}
function startTrevor() {
  world21.afterEvents.playerInteractWithEntity.subscribe((ev) => safe("trevor.interact", () => {
    if (ev.target.typeId !== ENT.trevor) return;
    void talk(ev.player, ev.target);
  }));
  world21.afterEvents.dataDrivenEntityTrigger.subscribe((ev) => safe("trevor.trigger", () => {
    if (ev.eventId === "hollow:down") onDown(ev.entity);
  }), { entityTypes: [ENT.trevor] });
  world21.afterEvents.entityDie.subscribe((ev) => safe("trevor.die", () => {
    if (ev.deadEntity.typeId !== ENT.trevor) return;
    if (st4().gone) return;
    fallFor(void 0);
  }), { entityTypes: [ENT.trevor] });
  world21.afterEvents.entitySpawn.subscribe((ev) => safe("trevor.shot", () => {
    const b = ev.entity;
    if (!b.isValid || b.typeId !== ENT.bullet) return;
    worldSound(b.dimension, SND.pistol, b.location, 1, 0.92 + Math.random() * 0.1);
    particle(b.dimension, "minecraft:basic_smoke_particle", b.location);
    emitNoise({ dim: b.dimension, at: b.location, radius: 48, kind: "gunshot" });
    say(pick(["Contact!", "Get behind me!", "Shooting!", "Down, down!"]), "contact", 600);
  }));
  every("trevor", 10, tick5, 7);
}

// ../../scripts_src/island/story.ts
var DEFAULT3 = { setup: false, bodies: [], searched: [], intro: false };
var story;
function st5() {
  if (!story) story = { ...DEFAULT3, ...readWorld(DP.story, DEFAULT3) };
  return story;
}
function save5() {
  writeWorld(DP.story, st5());
}
var SUPPLIES = [
  [[ITEM.ration, 4], [ITEM.medkit, 2], [ITEM.round, 14], [ITEM.iodine, 4]],
  [[ITEM.hatchet, 1], [ITEM.brokenRadio, 1], [ITEM.ration, 2], [ITEM.round, 7]],
  [[ITEM.medkit, 1], [ITEM.ration, 3], [ITEM.iodine, 2], [ITEM.round, 7]]
];
function stockCrates() {
  const dim = world22.getDimension("overworld");
  let ok = true;
  CRASH_CONTAINERS.forEach((pos, i) => {
    try {
      if (!dim.isChunkLoaded(pos)) {
        ok = false;
        return;
      }
      const c = dim.getBlock(pos)?.getComponent("minecraft:inventory")?.container;
      if (!c) return;
      for (const [id, n] of SUPPLIES[i % SUPPLIES.length]) c.addItem(new ItemStack10(id, n));
    } catch {
      ok = false;
    }
  });
  return ok;
}
function layBodies() {
  const dim = world22.getDimension("overworld");
  const ids = [];
  CREW_BODIES.slice(0, 2).forEach((b, i) => {
    try {
      const e = dim.spawnEntity(ENT.crewBody, { x: b.x + 0.5, y: b.y, z: b.z + 0.5 });
      e.triggerEvent(i === 0 ? "hollow:pilot" : "hollow:copilot");
      e.setRotation({ x: 0, y: i === 0 ? 120 : -40 });
      ids.push(e.id);
    } catch {
    }
  });
  return ids;
}
function setupWorld() {
  const s = st5();
  if (s.setup) return;
  const dim = world22.getDimension("overworld");
  if (!dim.isChunkLoaded({ x: SITES.CRASH.x, y: SPAWN_POINT.y, z: SITES.CRASH.z })) {
    later("story.setup", 40, setupWorld);
    return;
  }
  if (!stockCrates()) {
    later("story.setup", 40, setupWorld);
    return;
  }
  s.bodies = layBodies();
  s.setup = true;
  save5();
  const at = groundNear(dim, SPAWN_POINT.x + 2, SPAWN_POINT.y, SPAWN_POINT.z - 2, 8) ?? { x: SPAWN_POINT.x + 2, y: SPAWN_POINT.y, z: SPAWN_POINT.z - 2 };
  setHome(SPAWN_POINT);
  if (!trevorGone()) spawnTrevor(at);
}
function issueKit(p) {
  ensureJournal(p);
  const geiger = new ItemStack10(ITEM.geiger, 1);
  geiger.keepOnDeath = true;
  giveOrDrop(p, geiger);
  giveOrDrop(p, pistolStack());
}
function face(p, at) {
  try {
    p.teleport(p.location, { facingLocation: at });
  } catch {
  }
}
function wakeUp(p, first) {
  const fx = prefs(p).visualFx;
  face(p, { x: SITES.CRASH.x, y: SPAWN_POINT.y + 1, z: SITES.CRASH.z });
  try {
    if (fx) p.camera.fade({ fadeColor: { red: 0, green: 0, blue: 0 }, fadeTime: { fadeInTime: 0, holdTime: first ? 6 : 2, fadeOutTime: first ? 5 : 3 } });
    p.addEffect("slowness", first ? 300 : 120, { amplifier: 2, showParticles: false });
    p.addEffect("nausea", first ? 220 : 80, { amplifier: 0, showParticles: false });
    if (fx) p.addEffect("darkness", first ? 200 : 60, { amplifier: 0, showParticles: false });
  } catch {
  }
  ui(p, SND.ringing, 0.9);
  const step = (ticks, fn) => later("story.wake", ticks, () => p.isValid && fn());
  if (first) {
    step(50, () => {
      ui(p, SND.titleHit, 0.9);
      p.onScreenDisplay.setTitle("§lVARROW ISLAND", {
        subtitle: "§7South Pacific  ·  2026",
        fadeInDuration: 30,
        stayDuration: 90,
        fadeOutDuration: 40
      });
    });
    step(170, () => ui(p, SND.gasp, 0.9));
    step(230, () => say("...hey. Hey! You're alive. Good. No, don't get up yet.", "wake1", 200));
    step(330, () => say("Dan's gone. Ruth too. Someone was §lshooting§r at us from the trees. I saw the flashes.", "wake2", 200));
    step(450, () => {
      say("Get what you can out of the wreck before it all goes up. Rations, medkits, rounds. Your kit's here. Take it.", "wake3", 200);
      issueKit(p);
      unlock(p, "contract", true);
      unlock(p, "crash");
    });
    step(600, () => say("Radio's cracked in half. Nobody's coming for us. We need shelter before dark, then we find a way to call out ourselves.", "wake4", 200));
    step(640, () => notice(p, "§7Talk to §fTrevor§7 (Use on him). Read your §fResearch Log§7. Search the §fcrates§7 by the wreck."));
  } else {
    step(60, () => ui(p, SND.gasp, 0.8));
    step(100, () => {
      say(`${p.name}! Thank God. You were thrown clear down the beach. Here, your kit. Crates are by the wreck.`, `late:${p.id}`, 100);
      issueKit(p);
      unlock(p, "contract", true);
      unlock(p, "crash");
    });
  }
  later("story.follow", first ? 470 : 120, () => {
    if (!p.isValid) return;
    const e = trevorEntity();
    if (e && !st5().intro) {
      st5().intro = true;
      save5();
      orderFollow(p, true);
    }
  });
}
function onIslandSpawn(p, initial) {
  if (!isIsland() && !(initial && detectIsland(p.dimension))) return;
  setupWorld();
  if (!initial) {
    later("story.respawn", 20, () => p.isValid && ensureJournal(p));
    return;
  }
  if (getNum(p, DP.woke, 0) === 1) {
    later("story.rejoin", 40, () => p.isValid && ensureJournal(p));
    return;
  }
  setNum(p, DP.woke, 1);
  const first = !st5().intro && world22.getAllPlayers().length >= 1 && !anyoneAwake(p);
  later("story.wake", 20, () => p.isValid && wakeUp(p, first));
}
function anyoneAwake(except) {
  return world22.getAllPlayers().some((q) => q.id !== except.id && getNum(q, DP.woke, 0) === 1);
}
function searchBody(p, body) {
  const s = st5();
  let variant = 0;
  try {
    variant = body.getComponent("minecraft:variant")?.value ?? 0;
  } catch {
    variant = 0;
  }
  const first = !s.searched.includes(body.id);
  if (variant === 0) {
    notice(p, "§7Dan Okafor, the pilot. §8His kneeboard is still clipped to his leg.");
    unlock(p, "okafor");
    if (first) giveOrDrop(p, new ItemStack10(ITEM.round, 7));
  } else {
    notice(p, "§7Ruth Lindqvist, the co-pilot. §8A notebook in her vest, and a medkit she never got to open.");
    unlock(p, "lindqvist");
    if (first) giveOrDrop(p, new ItemStack10(ITEM.medkit, 1));
  }
  if (first) {
    s.searched.push(body.id);
    save5();
    say(variant === 0 ? "Dan had two kids. I'll write to them myself, if we get out." : "She got us down. Remember that. She got us down.", `body${variant}`, 6e3);
  }
}
function places(p) {
  if (p.dimension.id !== "minecraft:overworld") return;
  const d = (c) => Math.hypot(p.location.x - c.x, p.location.z - c.z);
  if (!isIsland()) {
    if (d(SITES.CRASH) < 48 && detectIsland(p.dimension)) onIslandSpawn(p, true);
    return;
  }
  if (d(SITES.CRASH) < 40) unlock(p, "place_crash", true);
  if (d(SITES.GZ) < CRATER_R + 70) {
    if (unlock(p, "place_crater")) say("That's Ground Zero. Keep your counter out and your visit short.", "gz", 12e3);
  }
}
function startStory() {
  world22.afterEvents.playerInteractWithEntity.subscribe((ev) => safe("story.search", () => {
    if (ev.target.typeId === ENT.crewBody) searchBody(ev.player, ev.target);
  }));
  everyPlayer("story.places", 100, places);
  system9.run(() => safe("story.resume", () => {
    if (isIsland()) setupWorld();
  }));
}
function storySummary() {
  const s = st5();
  return `story: island=${isIsland()} setup=${s.setup} bodies=${s.bodies.length} searched=${s.searched.length} intro=${s.intro}`;
}
function giveIslandKit(p) {
  issueKit(p);
}

// ../../scripts_src/main.ts
system10.beforeEvents.startup.subscribe((ev) => {
  registerItemComponents(ev);
  registerBlockComponents(ev);
  registerGearComponents(ev);
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
  trackType(ENT.phantom, isPhantomTracked);
  addStarter({ key: "mirebound", tryStart: tryStartMirebound });
  addStarter({ key: "watcher", tryStart: tryStartWatcher });
  addStarter({ key: "borrowed", tryStart: tryStartBorrowed, independent: true });
  addStarter({ key: "hollowed", tryStart: tryStartHollowed, independent: true });
  startCleanup();
  startNoiseEvents();
  startDirector();
  startDread();
  startAmbience();
  startBlockSystems();
  startMaterialPickups();
  startMusic();
  startTracks();
  startEvents();
  startSites();
  startWatcher();
  startBorrowed();
  startHollowed();
  startKnocker();
  startMirebound();
  startHeart();
  startRadiation();
  startTrevor();
  startStory();
  later("sweep", 40, sweepLoaded);
  console.warn(`[hollow] THE HOLLOW initialised (day ${hollowDay()}).`);
}
world23.afterEvents.worldLoad.subscribe(() => safe("init", init));
world23.afterEvents.playerSpawn.subscribe((ev) => safe("playerSpawn", () => {
  const p = ev.player;
  clearAllFog(p);
  const island = isIsland() || ev.initialSpawn && detectIsland(p.dimension);
  if (ev.initialSpawn) {
    rt(p);
    if (island) {
      onIslandSpawn(p, true);
      return;
    }
    later("welcome", 60, () => {
      if (!p.isValid) return;
      if (detectIsland(p.dimension)) {
        onIslandSpawn(p, true);
        return;
      }
      const fresh = unlock(p, "intro", true);
      unlock(p, "shelter", true);
      unlock(p, "craft_chime", true);
      unlock(p, "craft_ward", true);
      ensureJournal(p);
      if (fresh) p.sendMessage("§7You find a weathered §fField Journal§7 in your pack. Hold it and press §fUse§7 to read.");
    });
  } else {
    rt(p).diedAt = now();
    rt(p).ctx = void 0;
    resetDread(p);
    forgetEncounters(p.id);
    if (island) onIslandSpawn(p, false);
    else later("journalBack", 20, () => p.isValid && ensureJournal(p));
  }
}));
function forgetEncounters(playerId) {
  forgetSites(playerId);
  cancelJournalNotices(playerId);
  forgetItemEffects(playerId);
  forgetForms(playerId);
  forgetEventTarget(playerId);
  forgetWatcherTarget(playerId);
  forgetBorrowedTarget(playerId);
  forgetMireboundTarget(playerId);
  forgetKnockerTarget(playerId);
  forgetTrevorPlayer(playerId);
}
world23.beforeEvents.playerLeave.subscribe((ev) => {
  const id = ev.player.id;
  system10.run(() => safe("playerLeave", () => {
    forgetEncounters(id);
    forgetRuntime(id);
    forgetAudio(id);
    forgetPrefs(id);
    forgetJournal(id);
    forgetNoise(id);
    forgetMusic(id);
    forgetDread(id);
    forgetRadiation(id);
    forgetGuns(id);
  }));
});
world23.afterEvents.playerDimensionChange.subscribe((ev) => safe("dimChange", () => {
  rt(ev.player).ctx = void 0;
  forgetEncounters(ev.player.id);
  forgetBossPlayer(ev.player);
  clearAllFog(ev.player);
}));
world23.afterEvents.entityHurt.subscribe((ev) => safe("entityHurt", () => {
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
  if (hurt2 instanceof Player26 && by?.typeId === ENT.watcher) onWatcherStruck(by, hurt2);
  if (hurt2 instanceof Player26 && by?.typeId.startsWith("hollow:")) frighten(hurt2, 8);
  if (hurt2.typeId === ENT.heart || hurt2.typeId === ENT.vein) onBossHurt(hurt2, ev.damage, by);
}));
world23.afterEvents.entityDie.subscribe((ev) => safe("entityDie", () => {
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
world23.afterEvents.dataDrivenEntityTrigger.subscribe((ev) => safe("ddTrigger", () => {
  if (ev.eventId === "hollow:watcher_struck") onWatcherStruck(ev.entity, nearestPlayer(ev.entity, 5));
  else if (ev.eventId === "hollow:sheared") onBorrowedSheared(ev.entity, nearestPlayer(ev.entity, 6));
  else if (ev.eventId === "hollow:shield_hit") onShieldHit(ev.entity);
}), { entityTypes: [ENT.watcher, ENT.borrowed, ENT.heart] });
function testCommand(p, arg) {
  switch (arg) {
    case "on":
      setTestMode(true);
      return "TEST MODE ON: no grace days, no cooldowns, encounters ~25x likelier, every day-gate open. Resets on restart.";
    case "off":
      setTestMode(false);
      return "test mode off: normal rules";
    case "night":
      world23.setTimeOfDay(13e3);
      return "dusk (13000)";
    case "midnight":
      world23.setTimeOfDay(18e3);
      return "midnight (18000)";
    case "day":
      world23.setTimeOfDay(1e3);
      return "morning (1000)";
    case "kit": {
      const kit = [
        ["hollow:hollow_chime", 2],
        ["hollow:rowan_ward", 2],
        ["minecraft:charcoal", 8],
        ["hollow:hollow_lens", 1],
        ["hollow:heartseeker", 1],
        ["hollow:offering_of_silence", 2],
        ["hollow:pale_resin", 2],
        ["hollow:hollow_fang", 2],
        ["hollow:borrowed_hide", 2],
        ["hollow:knocker_nail", 2],
        ["hollow:mire_pearl", 2],
        ["hollow:stilled_heart", 1],
        ["minecraft:torch", 16],
        ["minecraft:shears", 1],
        ["minecraft:wheat", 8],
        ["minecraft:snowball", 16],
        ["hollow:hearth_tea", 2]
      ];
      for (const [id, n] of kit) giveOrDrop(p, new ItemStack11(id, n));
      ensureJournal(p);
      return "test kit given";
    }
    case "journal":
      return `${unlockAll(p)} journal entries unlocked`;
    case "knocker":
      return forceKnockerTonight();
    case "boss2":
      return forceBossPhase(2);
    case "boss3":
      return forceBossPhase(3);
    case "eye":
    case "lantern":
    case "roof":
      return forceEvent(p, arg);
    case "phantom":
      return forcePhantom(p);
    case "island":
      setIsland(true);
      onIslandSpawn(p, true);
      return "Varrow Island mode ON for this world (story, Trevor, radiation)";
    case "forest":
      setIsland(false);
      return "Varrow Island mode OFF: the original forest story";
    case "islandkit":
      giveIslandKit(p);
      return "Research Log, Geiger counter and pistol given";
    case "trevordown":
      return forceDown();
    case "rad":
      return `dose ${Math.round(radState(p).dose)} mSv`;
    default:
      if (arg.startsWith("dose")) {
        const v = Number(arg.slice(4).trim());
        if (!Number.isFinite(v)) return "usage: /scriptevent hollow:test dose <0-3000>";
        setDose(p, v);
        return `dose set to ${v} mSv`;
      }
      if (arg.startsWith("dread")) {
        const v = Number(arg.slice(5).trim());
        return Number.isFinite(v) ? setDread(p, v) : "usage: /scriptevent hollow:test dread <0-100>";
      }
      return "usage: /scriptevent hollow:test on|off|night|midnight|day|kit|journal|knocker|boss2|boss3|eye|lantern|roof|phantom|dread <0-100>|island|forest|islandkit|trevordown|rad|dose <mSv>";
  }
}
function nearestPlayer(e, r) {
  try {
    return e.dimension.getPlayers({ location: e.location, maxDistance: r, closest: 1 })[0];
  } catch {
    return void 0;
  }
}
system10.afterEvents.scriptEventReceive.subscribe((ev) => safe("scriptevent", () => {
  const p = ev.sourceEntity;
  if (!(p instanceof Player26)) return;
  switch (ev.id) {
    case "hollow:journal":
      void openJournal(p);
      return;
    case "hollow:status":
      if (!isOperator(p)) return;
      p.sendMessage(
        `§7[hollow] day ${hollowDay()} · watcher ${watcherCount()} · borrowed ${borrowedCount()} · hollowed ${hollowedCount()} · mirebound ${mireboundCount()} · knocker ${knockerActive() ? 1 : 0} · heart ${bossSummary()} · dread ${dreadSummary()} · ${storySummary()} · ${trevorSummary()} · failures: ${failureReport()}`
      );
      return;
    case "hollow:debug":
      if (!isOperator(p)) return;
      setDebug(!debugEnabled());
      if (debugEnabled()) p.addTag("hollow_debug");
      else p.removeTag("hollow_debug");
      p.sendMessage(`§7[hollow] debug ${debugEnabled() ? "on" : "off"}`);
      return;
    case "hollow:test": {
      if (!isOperator(p)) return;
      p.sendMessage(`§7[hollow test] ${testCommand(p, ev.message.trim())}`);
      return;
    }
    case "hollow:site": {
      if (!isOperator(p)) return;
      const t = ev.message.trim();
      if (!["cabin", "camp", "tower", "leanto", "shrine"].includes(t)) {
        p.sendMessage("§7usage: /scriptevent hollow:site cabin|camp|tower|leanto|shrine");
        return;
      }
      p.sendMessage(`§7[hollow] ${forceSite(p, t)}`);
      debug(`forced site ${t}`);
      return;
    }
  }
}), { namespaces: ["hollow"] });
