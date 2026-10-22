// ../../scripts_src/main.ts
import { ItemStack as ItemStack15, Player as Player34, system as system18, world as world32 } from "@minecraft/server";

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
  bullet: "hollow:bullet",
  bomber: "hollow:bomber",
  bomb: "hollow:bomb",
  helicopter: "hollow:helicopter",
  mushroomCloud: "hollow:mushroom_cloud",
  zealot: "hollow:zealot",
  faithful: "hollow:faithful",
  seer: "hollow:seer",
  hierophant: "hollow:hierophant",
  cultRound: "hollow:cult_round"
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
  brokenRadio: "hollow:broken_radio",
  fieldRadio: "hollow:field_radio",
  rifle: "hollow:bolt_rifle",
  rifleRound: "hollow:rifle_round",
  shotgun: "hollow:pump_shotgun",
  shell: "hollow:shotgun_shell",
  flareGun: "hollow:flare_gun",
  hazmatHood: "hollow:hazmat_hood",
  hazmatSuit: "hollow:hazmat_suit",
  hazmatTrousers: "hollow:hazmat_trousers",
  hazmatBoots: "hollow:hazmat_boots",
  sampleKit: "hollow:sample_kit",
  waterSample: "hollow:crater_water_sample",
  soilSample: "hollow:soil_sample",
  woodSample: "hollow:wood_sample",
  tissueSample: "hollow:tissue_sample",
  chelation: "hollow:chelation_shot",
  filmReel: "hollow:film_reel",
  valve: "hollow:vacuum_tube",
  wire: "hollow:copper_wire",
  battery: "hollow:battery_bank",
  shrineKey: "hollow:shrine_key"
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
  rifle: "hollow.gun.rifle",
  shotgun: "hollow.gun.shotgun",
  cineFlash: "hollow.cine.flash",
  cineAlarm: "hollow.cine.alarm",
  distantShot: "hollow.gun.distant",
  dryFire: "hollow.gun.dry",
  reload: "hollow.gun.reload",
  bulletHit: "hollow.gun.hit",
  geiger: ["hollow.geiger.1", "hollow.geiger.2", "hollow.geiger.3", "hollow.geiger.4", "hollow.geiger.5"],
  ringing: "hollow.story.ringing",
  titleHit: "hollow.story.title",
  gasp: "hollow.story.gasp",
  cineWind: "hollow.cine.wind",
  cineCountdown: "hollow.cine.countdown",
  cineBomber: "hollow.cine.bomber",
  cineWhistle: "hollow.cine.whistle",
  cineBoom: "hollow.cine.boom",
  cineFire: "hollow.cine.fire",
  cineRotor: "hollow.cine.rotor",
  cineRadio: "hollow.cine.radio",
  cineImpact: "hollow.cine.impact"
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
  veinMote: "hollow:vein_mote",
  nukePuff: "hollow:nuke_puff",
  nukeGlow: "hollow:nuke_glow"
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
  cineRestore: "hollow:cine_restore",
  // world (island)
  island: "hollow:island",
  story: "hollow:story",
  trevor: "hollow:trevor",
  cine: "hollow:cine_done",
  jobs: "hollow:jobs",
  cult: "hollow:cult",
  survey: "hollow:survey",
  tower: "hollow:tower",
  reel: "hollow:reel",
  scenes: "hollow:scenes",
  objective: "hollow:objective",
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
    const v3 = JSON.parse(raw);
    return Array.isArray(v3) ? v3 : [];
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
    const v3 = world.getDynamicProperty(key);
    return typeof v3 === "number" ? v3 : fallback;
  }
  try {
    const v3 = entity.getDynamicProperty(key);
    return typeof v3 === "number" ? v3 : fallback;
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
  trevorPermadeath: false,
  cult: true
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
  const out2 = { ...WORLD_DEFAULTS };
  out2.intensity = numberSetting(s.intensity, out2.intensity, 0, 2);
  out2.frequency = numberSetting(s.frequency, out2.frequency, 25, 200);
  out2.graceDays = numberSetting(s.graceDays, out2.graceDays, 0, 10);
  out2.knockerNight = numberSetting(s.knockerNight, out2.knockerNight, 1, 20);
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
    "trevorPermadeath",
    "cult"
  ]) {
    if (typeof s[key] === "boolean") out2[key] = s[key];
  }
  return out2;
}
function numberSetting(v3, fallback, min, max) {
  return typeof v3 === "number" && Number.isFinite(v3) ? Math.max(min, Math.min(max, Math.round(v3))) : fallback;
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
var isDusk = () => {
  const t = tod();
  return t >= 11800 && t < 13e3;
};
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
  let start2 = world2.getDynamicProperty(DP.startDay);
  if (typeof start2 !== "number") {
    start2 = world2.getDay();
    world2.setDynamicProperty(DP.startDay, start2);
  }
  return Math.max(0, world2.getDay() - start2);
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
function ambient(p, sound2, opts = {}) {
  const pr = prefs(p);
  if (pr.ambience <= 0) return false;
  const s = st(p);
  const t = now();
  if (t - s.lastAmbient < (opts.minGap ?? 180)) return false;
  const last = s.lastCue.get(sound2) ?? -99999;
  if (t - last < (opts.cueGap ?? 600)) return false;
  s.lastAmbient = t;
  s.lastCue.set(sound2, t);
  try {
    p.playSound(sound2, { location: opts.at, volume: (opts.volume ?? 1) * (pr.ambience / 100), pitch: opts.pitch ?? 1 });
  } catch {
    return false;
  }
  return true;
}
function accent(p, sound2, strength = 1, force = false) {
  const pr = prefs(p);
  if (pr.accents < strength) return false;
  const s = st(p);
  const t = now();
  if (!force && t - s.lastAccent < 900) return false;
  s.lastAccent = t;
  try {
    p.playSound(sound2, { volume: pr.accents === 1 ? 0.6 : 0.9 });
  } catch {
    return false;
  }
  return true;
}
function ui(p, sound2, volume = 1, pitch = 1) {
  try {
    p.playSound(sound2, { volume, pitch });
  } catch {
  }
}
function worldSound(dim2, sound2, at, volume = 1, pitch = 1) {
  try {
    dim2.playSound(sound2, at, { volume, pitch });
  } catch {
  }
}

// ../../scripts_src/core/fx.ts
import { MolangVariableMap, system as system2 } from "@minecraft/server";
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
function particle(dim2, id, at, vars) {
  try {
    if (vars) {
      const m = new MolangVariableMap();
      for (const k of Object.keys(vars)) m.setFloat(k, vars[k]);
      dim2.spawnParticle(id, at, m);
    } else {
      dim2.spawnParticle(id, at);
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
var lastNotice = /* @__PURE__ */ new Map();
function lastNoticeAt(p) {
  return lastNotice.get(p.id) ?? -99999;
}
function notice(p, text) {
  lastNotice.set(p.id, system2.currentTick);
  try {
    p.onScreenDisplay.setActionBar(text);
  } catch {
  }
}

// ../../scripts_src/core/forms.ts
import { system as system3 } from "@minecraft/server";
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
  const current2 = () => p.isValid && sessions.get(p.id) === token;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (!current2()) return void 0;
    let r;
    try {
      r = await form.show(p);
    } catch {
      return void 0;
    }
    if (!current2()) return void 0;
    if (!r.canceled || r.cancelationReason !== FormCancelationReason.UserBusy || attempt === retries) return r;
    await new Promise((resolve) => system3.runTimeout(resolve, 10));
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
var clamp = (v3, lo, hi) => v3 < lo ? lo : v3 > hi ? hi : v3;
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
function biomeGroup(dim2, loc) {
  try {
    const id = dim2.getBiome(loc).id.replace("minecraft:", "");
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
function block(dim2, loc) {
  try {
    return dim2.getBlock(loc);
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
function groundNear(dim2, x, yHint, z, range = 10, headroom = 3) {
  const fx = Math.floor(x), fz = Math.floor(z), fy = Math.floor(yHint);
  for (let i = 0; i <= range * 2; i++) {
    const dy = i % 2 === 0 ? i / 2 : -(i + 1) / 2;
    const y = fy + dy;
    const g = block(dim2, { x: fx, y: y - 1, z: fz });
    if (!solidGround(g)) continue;
    let ok = true;
    for (let h = 0; h < headroom; h++) {
      if (!passable(block(dim2, { x: fx, y: y + h, z: fz }))) {
        ok = false;
        break;
      }
    }
    if (ok) return { x: fx + 0.5, y, z: fz + 0.5 };
  }
  return void 0;
}
function clearLine(dim2, from, to) {
  const d = sub(to, from);
  const L = len(d);
  if (L < 0.5) return true;
  try {
    const hit = dim2.getBlockFromRay(from, norm(d), { maxDistance: L, includePassableBlocks: false, includeLiquidBlocks: false });
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
function hasBlockNear(dim2, c, types, rx, ry, rz) {
  try {
    return dim2.containsBlock(volumeAround(c, rx, ry, rz), { includeTypes: types }, false);
  } catch {
    return false;
  }
}
function findBlocks(dim2, c, types, rx, ry, rz, max = 16) {
  const out2 = [];
  try {
    const list3 = dim2.getBlocks(volumeAround(c, rx, ry, rz), { includeTypes: types }, false);
    for (const loc of list3.getBlockLocationIterator()) {
      out2.push(loc);
      if (out2.length >= max) break;
    }
  } catch {
  }
  return out2;
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
  const dim2 = player.dimension;
  const head = player.getHeadLocation();
  try {
    if (dim2.getSkyLightLevel(head) > 0) return false;
    const top = dim2.getTopmostBlock({ x: head.x, z: head.z });
    return !!top && top.location.y > head.y + 7;
  } catch {
    return false;
  }
}
function isOverworld(dim2) {
  return dim2.id === "minecraft:overworld";
}
function nearbyPlayers(dim2, loc, radius) {
  try {
    return dim2.getPlayers({ location: loc, maxDistance: radius });
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
  const dim2 = p.dimension;
  const ow = isOverworld(dim2);
  const c = {
    overworld: ow,
    biome: ow ? biomeGroup(dim2, p.location) : "other",
    underground: ow ? underground(p) : false,
    roofed: ow ? roofed(p) : false,
    inWater: p.isInWater,
    y: p.location.y
  };
  r.ctx = c;
  r.ctxDim = dim2.id;
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
import { system as system4, world as world5 } from "@minecraft/server";
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
  const start2 = () => system4.runInterval(() => safe(label, fn), ticks);
  if (offset > 0) system4.runTimeout(start2, offset);
  else start2();
}
function everyPlayer(label, period, fn) {
  system4.runInterval(() => {
    const players = world5.getAllPlayers();
    if (players.length === 0) return;
    const t = system4.currentTick;
    for (let i = 0; i < players.length; i++) {
      if ((i * 7 + t) % period !== 0) continue;
      const p = players[i];
      if (!p.isValid) continue;
      safe(label, () => fn(p));
    }
  }, 1);
}
function later(label, ticks, fn) {
  system4.runTimeout(() => safe(label, fn), Math.max(1, Math.round(ticks)));
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
  const v3 = pending.get(playerId) ?? 0;
  pending.delete(playerId);
  return v3;
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
import { Player as Player22, world as world19 } from "@minecraft/server";

// ../../scripts_src/items/blocks.ts
import {
  BlockPermutation as BlockPermutation5,
  EquipmentSlot as EquipmentSlot6,
  GameMode as GameMode8,
  ItemStack as ItemStack8,
  world as world18
} from "@minecraft/server";

// ../../scripts_src/creatures/heart.ts
import { EntityDamageCause as EntityDamageCause2, EquipmentSlot as EquipmentSlot5, GameMode as GameMode7, ItemStack as ItemStack7, Player as Player20, world as world17 } from "@minecraft/server";

// ../../scripts_src/systems/dread.ts
import { GameMode as GameMode4, system as system7, world as world9 } from "@minecraft/server";

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
  const v3 = p.getVelocity();
  const speed = Math.hypot(v3.x, v3.z);
  const st11 = { ...moveState.get(p.id) ?? { airborne: false, lastLand: -999 } };
  const wasAir = st11.airborne;
  st11.airborne = !p.isOnGround;
  let landed = false;
  if (wasAir && p.isOnGround && now() - st11.lastLand > 10) {
    landed = true;
    st11.lastLand = now();
  }
  if (!observeOnly) moveState.set(p.id, st11);
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
import { ItemLockMode, ItemStack, system as system6 } from "@minecraft/server";
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
  },
  // ------------------------------------------------------------------ THE WAY OFF
  {
    id: "tower_parts",
    chapter: "contract",
    island: true,
    title: "The Relay Transmitter",
    icon: `${J}item_vacuum_tube`,
    body: "The hut under the mast holds a steel cabinet the size of a wardrobe: the 1957 relay transmitter. Most of it survived. What didn't:" + P + "§l2 vacuum tubes§r. Cracked. The test crews kept spares in the radio room of the western bunker (the one they sealed).\n§l4 lengths of copper wire§r. Rotted through. The general store in the mock town stocked it; copper ingots can be drawn into wire.\n§l1 battery bank§r. For the valve heaters. The boathouse at the old dock had them.\n§lThe generator§r in the shed next door needs fuel: 8 coal or charcoal." + P + "§8Press the button in the hut to install whatever you're carrying."
  },
  {
    id: "tower_generator",
    chapter: "contract",
    island: true,
    title: "The Generator",
    icon: `${J}place_tower`,
    body: "A diesel-electric set from 1956, converted at some point to burn anything: coal, charcoal, wood scraps. Someone kept it oiled long after the test crews left." + P + "§8Press the button by the hopper with 8 coal or charcoal in your pack."
  },
  {
    id: "transmit",
    chapter: "contract",
    island: true,
    title: "Mayday",
    icon: `${J}item_field_radio`,
    body: `We got through. Coast Guard Sector Honolulu heard us, "faint but readable". They're sending a helicopter at first light, to the old dock on the south-east shore.` + P + "The lamp on top of the mast is burning. Every ship for forty miles can see it now, and so can everyone on this island." + P + "§lOne more night.§r Hold on until dawn, then get to the dock."
  },
  {
    id: "rescue",
    chapter: "contract",
    island: true,
    title: "First Light",
    icon: `${J}item_flare_gun`,
    body: "A Coast Guard helicopter, orange and white, sitting on the old dock with its rotors turning. A crewman in a flight helmet waving us in." + P + "§8Stand next to it to leave the island."
  },
  {
    id: "ending",
    chapter: "contract",
    island: true,
    title: "Leaving Varrow",
    icon: `${J}item_research_log`,
    body: "We lifted off at 06:14. Nobody said anything until the island was a grey line behind us." + P + "The full account went into the report. What happened afterwards is on the last page you were shown when the helicopter lifted off." + P + "§8The island is still there. You can stay as long as you like."
  },
  {
    id: "survey",
    chapter: "survey",
    island: true,
    title: "The Survey",
    icon: `${J}item_geiger_counter`,
    body: "What we came here to do, and still have to, if anyone is going to read it." + P + "§lStations.§r Six concrete huts, built in 1957 to record the fallout. Each has a console button: press it with a Geiger counter in your pack to log today's reading beside the 1957 one. The masts of unlogged stations flicker red." + P + "§lSamples.§r A Sample Kit takes §fcrater water§r, §fblast soil§r and §fscorched wood§r near Ground Zero, and §ftissue§r from one of the island's creatures (point it at one, or carry a kit when you kill one). Use a sample to file it." + P + "§lFilm.§r The test crews filmed everything. Reels turn up in station log barrels and bunker record rooms. Use one to watch it." + P + "§8All six stations and four sample types complete the survey."
  },
  {
    id: "station1",
    chapter: "survey",
    island: true,
    title: "Station 1",
    icon: `${J}item_geiger_counter`,
    body: "Monitoring Station 1: the inner blast line, 1.4 miles from GZ." + P + "§l3 June 1957§r (Shot day +3): 41 mSv/h, from the stencilled log on the hut wall." + P + "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or rusted solid long ago."
  },
  {
    id: "station2",
    chapter: "survey",
    island: true,
    title: "Station 2",
    icon: `${J}item_geiger_counter`,
    body: "Monitoring Station 2: the animal pens." + P + "§l3 June 1957§r (Shot day +3): 18 mSv/h, from the stencilled log on the hut wall." + P + "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or rusted solid long ago."
  },
  {
    id: "station3",
    chapter: "survey",
    island: true,
    title: "Station 3",
    icon: `${J}item_geiger_counter`,
    body: "Monitoring Station 3: the mock town." + P + "§l3 June 1957§r (Shot day +3): 9.5 mSv/h, from the stencilled log on the hut wall." + P + "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or rusted solid long ago."
  },
  {
    id: "station4",
    chapter: "survey",
    island: true,
    title: "Station 4",
    icon: `${J}item_geiger_counter`,
    body: "Monitoring Station 4: the observation bleachers at Blackwood." + P + "§l3 June 1957§r (Shot day +3): 2.2 mSv/h, from the stencilled log on the hut wall." + P + "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or rusted solid long ago."
  },
  {
    id: "station5",
    chapter: "survey",
    island: true,
    title: "Station 5",
    icon: `${J}item_geiger_counter`,
    body: "Monitoring Station 5: the mangrove landing beach." + P + "§l3 June 1957§r (Shot day +3): 4.8 mSv/h, from the stencilled log on the hut wall." + P + "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or rusted solid long ago."
  },
  {
    id: "station6",
    chapter: "survey",
    island: true,
    title: "Station 6",
    icon: `${J}item_geiger_counter`,
    body: "Monitoring Station 6: the north peak, by the relay." + P + "§l3 June 1957§r (Shot day +3): 0.6 mSv/h, from the stencilled log on the hut wall." + P + "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or rusted solid long ago."
  },
  {
    id: "sample_water",
    chapter: "survey",
    island: true,
    title: "Sample: Crater Water",
    icon: `${J}item_sample_kit`,
    body: "Green, faintly warm, and it glows in the dark vial. The counter reads it from a metre away. Something in it is alive: under the lens, threads that move toward light."
  },
  {
    id: "sample_soil",
    chapter: "survey",
    island: true,
    title: "Sample: Blast Soil",
    icon: `${J}item_sample_kit`,
    body: "Fused sand, glass beads, black soil. Normal for an airburst site of this age, except that the contamination gets §lstronger§r with depth instead of weaker. Something below is still adding to it."
  },
  {
    id: "sample_wood",
    chapter: "survey",
    island: true,
    title: "Sample: Scorched Wood",
    icon: `${J}item_sample_kit`,
    body: "Charred on the side that faced the flash, seventy years ago, and still growing on the other. The rings after 1957 are thick, dark and irregular. The trees here grew fast afterwards. Too fast."
  },
  {
    id: "sample_tissue",
    chapter: "survey",
    island: true,
    title: "Sample: Creature Tissue",
    icon: `${J}item_sample_kit`,
    body: "Not muscle, not bark, not quite either. Cell nuclei that look like the crater-water threads. Whatever made the island's creatures, it came up out of the ground after the shot."
  },
  {
    id: "findings",
    chapter: "survey",
    island: true,
    title: "Findings",
    icon: `${J}item_research_log`,
    body: "§lSurvey complete.§r Six stations, four sample types." + P + "The readings don't fall off with time the way they should. The inner stations are §lhigher§r than they were in 1958. The soil gets hotter with depth. The crater water is alive." + P + "Something under Ground Zero has been feeding on what the bomb left behind, and growing." + P + "§8That's the report. Now we need a way to send it."
  },
  {
    id: "reel1",
    chapter: "survey",
    island: true,
    title: "Shot Day Minus Two",
    icon: `${J}item_film_reel`,
    body: "§o[Black and white. A briefing tent, men in shirtsleeves, a chalkboard map of the island.]§r" + P + `§f"Operation SUNLAMP. One weapon, air-dropped, burst height two thousand feet over the marker at the island's centre. Six monitoring stations at fixed range. Animal pens at one mile. A mock township at a mile and a half. Observers at Blackwood, nine miles by road, goggles on."§r` + P + '§o[A hand taps the north peak.]§r §f"The relay stays up whatever happens. Everything goes out through the relay."'
  },
  {
    id: "reel2",
    chapter: "survey",
    island: true,
    title: "The Pens",
    icon: `${J}item_film_reel`,
    body: "§o[Pigs and sheep in wooden pens, numbered on their flanks with paint. A technician waves at the camera.]§r" + P + '§f"Group A, unshielded. Group B, behind sandbags. Group C in the shelter trench. We collect them at plus one day, plus one week and plus one month."§r' + P + "§o[A title card: PLUS ONE MONTH. The pens are empty. The gates are closed and the wire is intact.]"
  },
  {
    id: "reel3",
    chapter: "survey",
    island: true,
    title: "The Mock Town",
    icon: `${J}item_film_reel`,
    body: "§o[Clapboard houses on a grid, a general store, a police post, a water tower. Mannequins in Sunday clothes set out on porches and at a dinner table.]§r" + P + '§f"Effects on typical American construction at intermediate range."§r' + P + "§o[After the shot: the same street. The houses lean. The mannequins are where they were, scorched on one side.]§r" + P + "§o[A later shot, undated: one of the mannequins is standing at a window it was not placed at.]"
  },
  {
    id: "reel4",
    chapter: "survey",
    island: true,
    title: "The Observers",
    icon: `${J}item_film_reel`,
    body: "§o[Wooden bleachers in a clearing. Sixty men in dark goggles, backs to the camera, facing north.]§r" + P + '§f"Ten seconds."§r' + P + "§o[The frame whites out completely. When it returns, the men are half-turned, hands up, and the trees behind them are bending toward the camera in a wind nobody can hear.]"
  },
  {
    id: "reel5",
    chapter: "survey",
    island: true,
    title: "The Landing Beach",
    icon: `${J}item_film_reel`,
    body: "§o[A landing craft nosed into the mangroves. Crates handed down a chain of men.]§r" + P + '§f"Supply run, Shot Day plus nine. Readings on the beach are within tolerance."§r' + P + "§o[Behind the crates, in the mangrove shadow, something tall stands very still. Nobody in the film looks at it. It's gone in the next cut.]"
  },
  {
    id: "reel6",
    chapter: "survey",
    island: true,
    title: "The Relay",
    icon: `${J}item_film_reel`,
    body: "§o[The north peak, the mast going up in sections, men in harnesses.]§r" + P + '§f"Station Six reports normal background. Odd thing, though. The deep-soil probe at GZ is climbing. Not falling. Climbing. They want a crew down the instrument shaft to check the sensors."§r' + P + "§o[A title card: INSTRUMENT SHAFT, GZ NORTH RIM. The film ends.]"
  },
  {
    id: "reel7",
    chapter: "survey",
    island: true,
    title: "Laboratory, Bunker One",
    icon: `${J}item_film_reel`,
    body: "§o[A lab bench, bell jars, a dissecting tray. Hands in rubber gloves.]§r" + P + `§f"Specimen recovered at the pens, plus thirty-one days. Ovine. It should be dead. It isn't anything we have a word for."§r` + P + "§o[The tray. The camera holds on it too long. The thing in the tray turns its head toward the lens.]"
  },
  {
    id: "reel8",
    chapter: "survey",
    island: true,
    title: "Bunker Two Is Sealed",
    icon: `${J}item_film_reel`,
    body: "§o[No picture. Sound only, over a test card.]§r" + P + '§f"...radio room, Bunker Two. We have lost contact with the shaft crew. Four men. The last thing we got was a heartbeat on the open line. Not one of theirs. Too slow."§r' + P + `§f"Bunker Two personnel have stopped responding to the intercom. Their door is closed from the inside. On the Colonel's order the bunker is sealed. God help me."§r`
  },
  {
    id: "reel9",
    chapter: "survey",
    island: true,
    title: "Evacuation",
    icon: `${J}item_film_reel`,
    body: "§o[1958. Men loading crates onto a ship at the old dock. A sign: VARROW ISLAND - RESTRICTED - US AEC.]§r" + P + '§f"The site is closed for a period of not less than one hundred years. The relay remains in place as a navigational hazard light. Nobody comes back here."§r' + P + "§o[The last shot is from the deck as the ship pulls away. On the beach, very small, a figure walks out of the trees and watches it go.]"
  },
  {
    id: "reel10",
    chapter: "survey",
    island: true,
    title: "The Second Sun",
    icon: `${J}item_film_reel`,
    body: "§o[Colour film, faded to orange. 1962. A supply boat run aground in the mangroves. Families wading ashore with suitcases.]§r" + P + "§o[A man in a white shirt stands on a stump and addresses them. He has the Hierophant's face, younger.]§r" + P + '§f"They told you the sun was a weapon. I tell you it was a door. We were not afraid to look through it. This island is the threshold, and we are its keepers."§r' + P + "§o[The last frames: the families kneeling in a ring around the crater, faces to the green light.]"
  },
  // ------------------------------------------------------------------ THE CHILDREN OF THE SECOND SUN
  {
    id: "cult1",
    chapter: "threats",
    island: true,
    title: "The Children of the Second Sun",
    icon: `${J}faithful`,
    body: "The island isn't uninhabited. There are §lpeople§r here: families, gardens, stilt houses behind a log wall in the north-west, and a camp in the mangroves on the east shore." + P + "They're sick-looking (thin hair, raw patches of skin, eyes that don't squint in the sun), and §lnone of the island's creatures touch them§r." + P + "Their armed men shot us out of the sky with rifles older than my grandfather." + P + "§8Killing their people turns all of them against you. Gifts of food, offerings in the shrine barrel at Sunfall, and quiet days make them trust you more. They never forget a death."
  },
  {
    id: "cult_zealot",
    chapter: "threats",
    island: true,
    title: "Zealots",
    icon: `${J}zealot`,
    body: "Their soldiers: hooded, rifles from the 1950s, and good with them. They guard the villages, and after the first night they hunt the island after dark in twos and threes. At dawn they go back into the trees." + P + "§8Their shots carry a long way. If you hear one close, get behind something."
  },
  {
    id: "cult_faithful",
    chapter: "threats",
    island: true,
    title: "The Faithful",
    icon: `${J}faithful`,
    body: "Ordinary people: gardeners, herders, children. They won't speak to anyone holding a weapon. Hurt one and the Zealots come running." + P + "§8Holding food when you speak to one offers it as a gift. Once they trust you, they'll trade copper wire for medicine."
  },
  {
    id: "cult_seer",
    chapter: "threats",
    island: true,
    title: "The Seer",
    icon: `${J}seer`,
    body: "A blindfolded old woman at Sunfall who seems to know who we are. She talks if you come unarmed. She trades, and she knows the island better than the 1957 maps do."
  },
  {
    id: "cult_hierophant",
    chapter: "threats",
    island: true,
    title: "The Hierophant",
    icon: `${J}hierophant`,
    body: 'Their leader, at the shrine in the middle of Sunfall. Robed, very old, with a staff of tower steel. He calls the bomb "the second sun" and this island its threshold.' + P + "§cRaise a hand against him and he answers with everything he has.§r Kill him, and every one of his people will hunt you for as long as you stay." + P + "§8Win their trust instead and he may give you the key to what lies under the shrine."
  },
  {
    id: "seer_story",
    chapter: "threats",
    island: true,
    title: "The Seer's Story",
    icon: `${J}seer`,
    body: `§o"We came in nineteen sixty-two on a supply boat that never went back. The flash had been gone five years. The light was still in everything. Some of us got sick. The ones who didn't heard it singing under the lake."`
  },
  {
    id: "seer_shot",
    chapter: "threats",
    island: true,
    title: "Who Shot Us Down",
    icon: `${J}zealot`,
    body: '§o"The Hierophant says the sky belongs to the sun. The Zealots keep it clean. Your pilot was not the first. He will not be the last."§r' + P + "They've done this before."
  },
  {
    id: "seer_maps",
    chapter: "places",
    island: true,
    title: "The Three Bunkers",
    icon: `${J}seer`,
    body: "The Seer drew them in the dirt for a battery." + P + "§lNorth, by the crater§r: the armoury, the laboratory, the records. Open.\n§lWest, under the hill§r: the radio room. §cSealed from the inside in 1957.§r\n§lNorth-east§r: a laboratory and the spare generator." + P + '§o"Do not open the doors that are already closed."'
  },
  {
    id: "seer_way",
    chapter: "places",
    island: true,
    title: "The Back Way",
    icon: `${J}seer`,
    body: '§o"The machine-house under the western hill is closed. But the rock has a throat. Walk west from its door, a hundred paces, where the ground falls in. Climb down."§r' + P + "A sinkhole about a hundred blocks west of Bunker 2, with a cave that runs into the back of it."
  },
  {
    id: "hierophant_dead",
    chapter: "threats",
    island: true,
    title: "The Hierophant Is Dead",
    icon: `${J}hierophant`,
    body: "He died on the shrine steps. The light in the altar went out with him." + P + "The Children will never forgive this. More Zealots, every night, and the Faithful run from us now. The key to the shrine vault was on his belt."
  },
  {
    id: "ledger",
    chapter: "threats",
    island: true,
    title: "The Hierophant's Ledger",
    icon: `${J}item_shrine_key`,
    body: "In the vault under the shrine: an iron box, and a ledger in a careful hand. Every vessel the Children have brought down since 1962, with a date and a line of scripture:" + P + "§o1971, fishing boat. 1984, light aircraft, two souls. 1996, yacht. 2009, survey drone. 2026, helicopter, white with a red stripe.§r" + P + 'Under that, in the same hand: §o"The mainland sends more each time. Soon it will send enough."'
  },
  {
    id: "heart_island",
    chapter: "survey",
    island: true,
    title: "What Was Under the Lake",
    icon: `${J}heart_below`,
    body: "The thing in the cavern under Ground Zero is dead. It was why the counters climbed going down, why the crater water was alive, why the creatures came out of the ground. It had been feeding on the bomb for seventy years." + P + "The Children called it the voice under the lake. I don't know what they'll call it now."
  },
  // ------------------------------------------------------------------ MORE GEAR
  {
    id: "gear_rifle",
    chapter: "craft",
    island: true,
    title: "Bolt-Action Rifle",
    icon: `${J}item_bolt_rifle`,
    body: "A 1950s service rifle from the Bunker 1 armoury. Five rounds, slow to work the bolt, but it hits hard and true at long range." + P + "§lUse§r to fire, §lsneak + Use§r to reload. Rifle rounds can be made from iron and gunpowder."
  },
  {
    id: "gear_shotgun",
    chapter: "craft",
    island: true,
    title: "Pump Shotgun",
    icon: `${J}item_pump_shotgun`,
    body: "From the police post in the mock town. Four shells, a spray of pellets: devastating up close, useless past twenty metres." + P + "§lUse§r to fire, §lsneak + Use§r to reload."
  },
  {
    id: "gear_flare",
    chapter: "craft",
    island: true,
    title: "Flare Gun",
    icon: `${J}item_flare_gun`,
    body: "Fires a burning red flare that lights the ground where it lands for half a minute, and can be seen from across the island. Trevor comes to it as soon as he finishes what he's doing."
  },
  {
    id: "gear_hazmat",
    chapter: "craft",
    island: true,
    title: "Hazmat Suit",
    icon: `${J}item_hazmat_suit`,
    body: "1957 civil-defence issue, rubberised canvas, gas-mask hood. Each piece cuts radiation uptake; the full set cuts it by nine-tenths. Heavy: wearing most of it slows you down." + P + "§8Hood, suit, trousers and boots. The bunkers had them."
  },
  {
    id: "gear_samples",
    chapter: "craft",
    island: true,
    title: "Sample Kit",
    icon: `${J}item_sample_kit`,
    body: "Glass vials and a scraper. Use it facing crater water, blast soil or scorched wood near Ground Zero, or facing one of the island's creatures. Then use the sample to file it." + P + "§8Three made from glass and paper."
  },
  {
    id: "gear_chelation",
    chapter: "craft",
    island: true,
    title: "Chelation Shot",
    icon: `${J}item_chelation_shot`,
    body: "Prussian blue and DTPA in an auto-injector. Draws a third of your accumulated dose out over a minute. Rare: the bunker laboratories kept a few."
  },
  // ------------------------------------------------------------------ MORE PLACES
  {
    id: "place_town",
    chapter: "places",
    island: true,
    title: "The Mock Town",
    icon: `${J}place_cabin`,
    body: "A whole street of clapboard houses built to be blown down, with a store, a police post and a water tower. Mannequins in 1950s clothes still sit at the tables." + P + "§8The store had wire and supplies; the police post an armoury."
  },
  {
    id: "place_pens",
    chapter: "places",
    island: true,
    title: "The Animal Pens",
    icon: `${J}place_camp`,
    body: "Rows of wooden pens a mile from Ground Zero, where the test crews left animals to see what the bomb would do. The gates are still closed. The pens are empty."
  },
  {
    id: "place_sunfall",
    chapter: "places",
    island: true,
    title: "Sunfall",
    icon: `${J}faithful`,
    body: "The Children's village in the north-west: a log palisade, stilt houses, gardens, and a shrine of tower steel around a burning sun. There's a barrel by the altar for offerings." + P + "§8The Zealots guard the gate. Don't come in shooting."
  },
  {
    id: "place_mangroves",
    chapter: "places",
    island: true,
    title: "The Mangrove Camp",
    icon: `${J}zealot`,
    body: "A stilt camp in the mangroves on the east shore, next to the wreck of a 1957 landing craft. A few of the Faithful live here, and their guards."
  },
  {
    id: "place_tower",
    chapter: "places",
    island: true,
    title: "The North Peak Relay",
    icon: `${J}place_tower`,
    body: "A lattice mast on the highest point of the island, a hut at its foot and a generator shed. Our way off, if we can make it talk."
  },
  {
    id: "place_dock",
    chapter: "places",
    island: true,
    title: "The Old Dock",
    icon: `${J}item_battery_bank`,
    body: "A timber pier on the south-east shore and a boathouse, where the supply ships came in. The only place on the coast a helicopter could set down."
  },
  {
    id: "place_bleachers",
    chapter: "places",
    island: true,
    title: "The Bleachers",
    icon: `${J}watcher`,
    body: "Wooden bleachers in a clearing in Blackwood, nine miles from the flash by road. The observers sat here in goggles. Someone still sits here."
  },
  {
    id: "place_bunkers",
    chapter: "places",
    island: true,
    title: "The Bunkers",
    icon: `${J}shelter`,
    body: "Concrete portals in the hillsides, iron doors (press the button beside them), stairs down to corridors and rooms. Three of them, the Seer says. One is sealed." + P + "§8Bring a light. And a counter."
  },
  {
    id: "mutants",
    chapter: "threats",
    island: true,
    title: "The Island's Animals",
    icon: `${J}tracks`,
    body: "Everything that lives here is wrong. Cows with open sores and bald, raw patches. Pigs with tumours like fists. Sheep losing their wool in clumps. Little points of green light in the skin, like the crater water." + P + "The things that walk at night are worse than the mainland's: §lfaster, and they hit harder§r." + P + "§cThe meat is hot.§r Cooked, it adds a little to your dose; raw, a lot. Rations and fish are safer." + P + "§8Seventy years of fallout, generation after generation."
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
  { id: "survey", title: "Operation SUNLAMP", icon: "textures/ui/hollow/journal/item_film_reel" },
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
  return island ? CHAPTERS.filter((c) => c.id !== "notes").map((c) => c.id === "craft" ? { ...c, title: "Gear & Equipment" } : c) : CHAPTERS.filter((c) => c.id !== "contract" && c.id !== "survey");
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
  DOCK: { x: 192, z: 258 },
  DIORAMA: { x: 2400, z: 0 }
};
var BUNKERS = {
  bunker1: { x: 70, z: -98 },
  bunker2: { x: -104, z: -62 },
  bunker3: { x: 178, z: -150 }
};
var STATIONS = {
  station1: { x: 164, z: -12 },
  station2: { x: 20, z: -18 },
  station3: { x: -64, z: 18 },
  station4: { x: -186, z: 12 },
  station5: { x: 236, z: 70 },
  station6: { x: 18, z: -206 }
};
var SPAWN_POINT = { x: -30, y: 66, z: 252 };
var CRASH_SMOKE = [{ "x": -22, "y": 63, "z": 256 }, { "x": -30, "y": 65, "z": 265 }, { "x": -17, "y": 65, "z": 267 }];
var CRASH_CONTAINERS = [{ "x": -18, "y": 65, "z": 271 }, { "x": -32, "y": 65, "z": 258 }, { "x": -15, "y": 65, "z": 260 }];
var CREW_BODIES = [{ "x": -20, "y": 65, "z": 265 }, { "x": -29, "y": 65, "z": 261 }, { "x": -23, "y": 65, "z": 270 }];
var LOOT_CONTAINERS = [{ "x": -68, "y": 75, "z": 67, "loot": "store_shelf" }, { "x": -78, "y": 75, "z": 67, "loot": "store_wire" }, { "x": -52, "y": 75, "z": 18, "loot": "police_armory" }, { "x": 37, "y": 69, "z": -39, "loot": "pens_shed" }, { "x": 165, "y": 77, "z": -13, "loot": "station1_log" }, { "x": 21, "y": 70, "z": -19, "loot": "station2_log" }, { "x": -63, "y": 75, "z": 17, "loot": "station3_log" }, { "x": -185, "y": 80, "z": 11, "loot": "station4_log" }, { "x": 237, "y": 64, "z": 69, "loot": "station5_log" }, { "x": 19, "y": 158, "z": -207, "loot": "station6_log" }, { "x": 76, "y": 58, "z": -113, "loot": "bunker1_armory" }, { "x": 67, "y": 58, "z": -120, "loot": "bunker1_records" }, { "x": 76, "y": 58, "z": -133, "loot": "bunker1_lab" }, { "x": 67, "y": 58, "z": -134, "loot": "bunker1_bunks" }, { "x": -122, "y": 63, "z": -53, "loot": "bunker2_tubes" }, { "x": -126, "y": 63, "z": -65, "loot": "bunker2_records" }, { "x": -133, "y": 63, "z": -53, "loot": "bunker2_bunks" }, { "x": 184, "y": 59, "z": -171, "loot": "bunker3_lab" }, { "x": 169, "y": 59, "z": -178, "loot": "bunker3_generator" }, { "x": 187, "y": 59, "z": -179, "loot": "bunker3_records" }, { "x": 15, "y": 163, "z": -226, "loot": "tower_hut" }, { "x": 187, "y": 65, "z": 260, "loot": "dock_battery" }, { "x": -149, "y": 75, "z": -180, "loot": "shrine_offerings" }, { "x": -150, "y": 68, "z": -184, "loot": "shrine_vault" }, { "x": -128, "y": 79, "z": -167, "loot": "hut0" }, { "x": -141, "y": 79, "z": -156, "loot": "hut1" }, { "x": -158, "y": 79, "z": -157, "loot": "hut2" }, { "x": -168, "y": 79, "z": -170, "loot": "hut3" }, { "x": -165, "y": 79, "z": -187, "loot": "hut4" }, { "x": -151, "y": 79, "z": -196, "loot": "hut5" }, { "x": -135, "y": 79, "z": -192, "loot": "hut6" }, { "x": 227, "y": 65, "z": 31, "loot": "mangrove_hut" }, { "x": 267, "y": 60, "z": 58, "loot": "landing_craft" }];
var CONSOLES = { "station1": { "x": 164, "y": 76, "z": -12 }, "station2": { "x": 20, "y": 69, "z": -18 }, "station3": { "x": -64, "y": 74, "z": 18 }, "station4": { "x": -186, "y": 79, "z": 12 }, "station5": { "x": 236, "y": 63, "z": 70 }, "station6": { "x": 18, "y": 157, "z": -206 }, "tower": { "x": 18, "y": 163, "z": -224 }, "generator": { "x": 9, "y": 164, "z": -233 }, "pro_hut1": { "x": 2431, "y": 67, "z": 0 }, "pro_hut2": { "x": 2385, "y": 67, "z": 26 }, "pro_hut3": { "x": 2385, "y": 67, "z": -26 }, "pro_tower": { "x": 2404, "y": 68, "z": 0 } };
var POINTS = { "mannequin": [{ "x": -97, "y": 75, "z": 35 }, { "x": -95, "y": 75, "z": 35 }, { "x": -92, "y": 75, "z": 34 }, { "x": -84, "y": 75, "z": 35 }, { "x": -82, "y": 75, "z": 35 }, { "x": -50, "y": 75, "z": 35 }, { "x": -48, "y": 75, "z": 35 }, { "x": -37, "y": 75, "z": 35 }, { "x": -35, "y": 75, "z": 35 }, { "x": -32, "y": 75, "z": 34 }, { "x": -97, "y": 75, "z": 53 }, { "x": -95, "y": 75, "z": 53 }, { "x": -84, "y": 75, "z": 53 }, { "x": -82, "y": 75, "z": 53 }, { "x": -50, "y": 75, "z": 53 }, { "x": -48, "y": 75, "z": 53 }, { "x": -45, "y": 75, "z": 52 }, { "x": -37, "y": 75, "z": 53 }, { "x": -35, "y": 75, "z": 53 }, { "x": -76, "y": 75, "z": 20 }, { "x": -74, "y": 75, "z": 20 }, { "x": -58, "y": 75, "z": 68 }, { "x": -56, "y": 75, "z": 68 }, { "x": -53, "y": 75, "z": 67 }, { "x": -71, "y": 75, "z": 70 }, { "x": 64, "y": 58, "z": -136 }, { "x": -136, "y": 63, "z": -55 }, { "x": 2359, "y": 67, "z": -14 }, { "x": 2361, "y": 67, "z": -14 }, { "x": 2359, "y": 67, "z": 4 }, { "x": 2361, "y": 67, "z": 4 }, { "x": 2373, "y": 68, "z": 22 }, { "x": 2375, "y": 68, "z": 22 }], "town_square": [{ "x": -64, "y": 74, "z": 44 }], "pen": [{ "x": 11, "y": 69, "z": -45 }, { "x": 27, "y": 69, "z": -45 }, { "x": 11, "y": 69, "z": -31 }, { "x": 27, "y": 69, "z": -31 }], "station": [{ "x": 164, "y": 76, "z": -12 }, { "x": 20, "y": 69, "z": -18 }, { "x": -64, "y": 74, "z": 18 }, { "x": -186, "y": 79, "z": 12 }, { "x": 236, "y": 63, "z": 70 }, { "x": 18, "y": 157, "z": -206 }], "sealed_lab": [{ "x": 76, "y": 58, "z": -130 }, { "x": 184, "y": 59, "z": -168 }], "cave_mouth": [{ "x": 86, "y": 56, "z": -159 }, { "x": -197, "y": 81, "z": -76 }, { "x": 199, "y": 57, "z": -206 }], "bunker1_inside": [{ "x": 70, "y": 58, "z": -114 }], "bunker_deep": [{ "x": 70, "y": 58, "z": -137 }, { "x": -143, "y": 63, "z": -62 }, { "x": 178, "y": 59, "z": -189 }], "bunker1_door": [{ "x": 70, "y": 71, "z": -98 }], "bunker2_sinkhole": [{ "x": -197, "y": 80, "z": -76 }], "bunker2_inside": [{ "x": -120, "y": 63, "z": -62 }], "bunker2_door": [{ "x": -104, "y": 76, "z": -62 }], "bunker3_inside": [{ "x": 178, "y": 59, "z": -166 }], "bunker3_door": [{ "x": 178, "y": 72, "z": -150 }], "tower_lamp": [{ "x": 18, "y": 193, "z": -232 }], "tower_top": [{ "x": 18, "y": 197, "z": -232 }], "tower_hut": [{ "x": 18, "y": 163, "z": -225 }], "generator": [{ "x": 9, "y": 163, "z": -232 }], "dock_end": [{ "x": 192, "y": 64, "z": 290 }], "boathouse": [{ "x": 184, "y": 65, "z": 258 }], "cult_gate": [{ "x": -150, "y": 75, "z": -144 }], "shrine": [{ "x": -150, "y": 75, "z": -178 }], "hierophant": [{ "x": -150, "y": 75, "z": -174 }], "vault_shaft": [{ "x": -150, "y": 71, "z": -182 }], "cult_home": [{ "x": -130, "y": 79, "z": -169 }, { "x": -143, "y": 79, "z": -158 }, { "x": -160, "y": 79, "z": -159 }, { "x": -170, "y": 79, "z": -172 }, { "x": -167, "y": 79, "z": -189 }, { "x": -153, "y": 79, "z": -198 }, { "x": -137, "y": 79, "z": -194 }, { "x": 226, "y": 65, "z": 32 }, { "x": 240, "y": 65, "z": 26 }, { "x": 232, "y": 65, "z": 50 }], "garden": [{ "x": -162, "y": 75, "z": -182 }, { "x": -138, "y": 75, "z": -180 }], "cult_post": [{ "x": -149, "y": 75, "z": -165 }, { "x": -153, "y": 75, "z": -165 }, { "x": -153, "y": 75, "z": -190 }, { "x": -139, "y": 75, "z": -186 }, { "x": -151, "y": 75, "z": -190 }, { "x": -139, "y": 75, "z": -185 }, { "x": 236, "y": 65, "z": 38 }], "landing_craft": [{ "x": 264, "y": 60, "z": 58 }], "watcher_seat": [{ "x": -163, "y": 75, "z": 11 }, { "x": -162, "y": 76, "z": 12 }, { "x": -161, "y": 77, "z": 13 }, { "x": -160, "y": 78, "z": 14 }, { "x": -163, "y": 75, "z": 15 }], "bleachers": [{ "x": -160, "y": 74, "z": 14 }], "heart_arena": [{ "x": 112, "y": 13, "z": -12 }], "gz_shaft": [{ "x": 112, "y": 75, "z": -62 }], "pro_bunker": [{ "x": 2400, "y": 66, "z": 42 }], "pro_slit": [{ "x": 2400, "y": 68, "z": 39 }], "pro_start": [{ "x": 2394, "y": 66, "z": -40 }], "pro_ship": [{ "x": 2478, "y": 65, "z": -50 }, { "x": 2316, "y": 65, "z": 58 }] };

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
function detectIsland(dim2) {
  if (isIsland()) return true;
  if (world7.getDynamicProperty(DP.island) === 0) return false;
  try {
    const c = CRASH_CONTAINERS[0];
    const s = CRASH_SMOKE[0];
    if (!c || !s) return false;
    if (!dim2.isChunkLoaded(c) || !dim2.isChunkLoaded(s)) return false;
    const barrel = dim2.getBlock(c)?.typeId === "minecraft:barrel";
    const fire2 = dim2.getBlock(s)?.typeId === "minecraft:campfire";
    const hay = dim2.getBlock({ x: s.x, y: s.y - 1, z: s.z })?.typeId === "minecraft:hay_block";
    if (barrel && fire2 && hay) {
      setIsland(true);
      return true;
    }
  } catch {
  }
  return false;
}

// ../../scripts_src/island/radiation.ts
import { EquipmentSlot as EquipmentSlot2, GameMode as GameMode2, system as system5 } from "@minecraft/server";
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
    const dim2 = p.dimension;
    const top = dim2.getTopmostBlock({ x: p.location.x, z: p.location.z });
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
  for (const extra of extraSources) r += extra(p);
  return Math.max(0.1, r);
}
var extraSources = [];
function addRadiationSource(fn) {
  extraSources.push(fn);
}
var HAZMAT = [
  [EquipmentSlot2.Head, ITEM.hazmatHood, 0.25],
  [EquipmentSlot2.Chest, ITEM.hazmatSuit, 0.35],
  [EquipmentSlot2.Legs, ITEM.hazmatTrousers, 0.2],
  [EquipmentSlot2.Feet, ITEM.hazmatBoots, 0.1]
];
function suitProtection(p) {
  let k = 0;
  try {
    const eq = p.getComponent("minecraft:equippable");
    for (const [slot, id, v3] of HAZMAT) if (eq?.getEquipment(slot)?.typeId === id) k += v3;
  } catch {
  }
  return Math.min(0.9, k);
}
function chelate(p) {
  const s = radState(p);
  const target2 = Math.max(0, s.dose - Math.max(120, s.dose / 3));
  const step3 = (s.dose - target2) / 12;
  let n = 0;
  const run = system5.runInterval(() => {
    if (!p.isValid || ++n > 12) {
      system5.clearRun(run);
      return;
    }
    s.dose = Math.max(0, s.dose - step3);
    if (n === 12) save(p, s, true);
  }, 100);
  notice(p, "§7The shot burns going in. §fYour dose will come down over the next minute.");
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
  const suit = suitProtection(p);
  if (suit >= 0.55) {
    try {
      p.addEffect("slowness", 40, { amplifier: 0, showParticles: false });
    } catch {
    }
  }
  if (rate >= 1) {
    const iodine = s.iodine > t ? 0.5 : 1;
    s.dose = Math.min(3e3, s.dose + rate / 120 * iodine * (1 - suit));
  } else {
    s.dose = Math.max(0, s.dose - 0.4);
  }
  if (inCraterLake(p) && suit < 0.89) {
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
    notice(p, `§a☢ §f${fmt(rate)} §7mSv/h${suit > 0 ? ` §8(suit -${Math.round(suit * 100)}%)` : ""}   §8·   §7dose §f${fmt(s.dose)} §7mSv §8(${bandName(s.dose)})`);
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
  const v3 = r.formValues;
  const next = {
    ambience: Number(v3[0]),
    accents: Number(v3[1]),
    visualFx: Boolean(v3[2]),
    hints: Boolean(v3[3]),
    music: Boolean(v3[4]),
    dreadFx: v3[5] === void 0 ? cur.dreadFx : Boolean(v3[5])
  };
  savePrefs(p, next);
  if (!next.visualFx || !next.dreadFx) clearAllFog(p);
  notice(p, "§7Comfort settings saved.");
}
async function openWorld(p) {
  const s = rawSettings();
  const f = new ModalFormData().title("§lWorld rules").dropdown("Horror intensity", ["Calm: rarer, no ambush strikes", "Standard", "Nightmare: frequent, bolder"], { defaultValueIndex: s.intensity }).slider("Encounter frequency (%)", 25, 200, { defaultValue: s.frequency, valueStep: 25 }).slider("Grace days before creatures hunt", 0, 10, { defaultValue: s.graceDays, valueStep: 1 }).slider("First night the Knocker may visit", 1, 20, { defaultValue: s.knockerNight, valueStep: 1 }).toggle("Creature: The Watcher", { defaultValue: s.watcher }).toggle("Creature: The Borrowed", { defaultValue: s.borrowed }).toggle("Creature: The Hollowed", { defaultValue: s.hollowed }).toggle("Creature: The Knocker", { defaultValue: s.knocker }).toggle("Creature: The Mirebound", { defaultValue: s.mirebound }).toggle("Destructive Knocker (may break wooden doors on Hard)", { defaultValue: s.destructive }).toggle("Rare bedtime knocking (harmless, never blocks sleep)", { defaultValue: s.sleepDisturbance }).toggle("Place cabins, camps, towers, lean-tos and the shrine", { defaultValue: s.sites }).toggle("Scale the Heart Below with player count", { defaultValue: s.bossScaling }).toggle("Rare one-off events (harmless, once per world)", { defaultValue: s.rareEvents }).toggle("Dread: fear, hallucinations, and fear drawing them closer", { defaultValue: s.dread }).toggle("Varrow Island: Trevor's death is permanent", { defaultValue: s.trevorPermadeath }).toggle("Varrow Island: the Children of the Second Sun (villages and night patrols)", { defaultValue: s.cult }).submitButton("Save");
  const r = await showForm(p, f);
  if (!r || r.canceled || !r.formValues || !isOperator(p)) return;
  const v3 = r.formValues;
  const next = {
    intensity: Number(v3[0]),
    frequency: Number(v3[1]),
    graceDays: Number(v3[2]),
    knockerNight: Number(v3[3]),
    watcher: Boolean(v3[4]),
    borrowed: Boolean(v3[5]),
    hollowed: Boolean(v3[6]),
    knocker: Boolean(v3[7]),
    mirebound: Boolean(v3[8]),
    destructive: Boolean(v3[9]),
    sleepDisturbance: Boolean(v3[10]),
    sites: Boolean(v3[11]),
    bossScaling: Boolean(v3[12]),
    rareEvents: Boolean(v3[13]),
    dread: v3[14] === void 0 ? s.dread : Boolean(v3[14]),
    trevorPermadeath: v3[15] === void 0 ? s.trevorPermadeath : Boolean(v3[15]),
    cult: v3[16] === void 0 ? s.cult : Boolean(v3[16])
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
  const phase2 = t < 12e3 ? "daylight" : t < 13e3 ? "dusk" : t < 23200 ? "night" : "dawn";
  const carried2 = /* @__PURE__ */ new Set();
  const inv = p.getComponent("minecraft:inventory")?.container;
  if (inv) for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i);
    if (item) carried2.add(item.typeId);
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
    next = carried2.has(ITEM.lantern) ? "Place your Heartwood Lantern at home. Its registered protection reaches 24 blocks." : "Turn the Stilled Heart into a Heartwood Lantern for your home.";
  } else if (has("heart1") && has("craft_offering")) {
    recipe = "craft_offering";
    next = "Prepare the offering, food and equipment. Read your shrine notes before deciding to wake it.";
  } else if (has("craft_heartseeker")) {
    recipe = "craft_heartseeker";
    next = carried2.has(ITEM.heartseeker) ? "Use your Heartseeker in the Overworld and follow its bearings." : "Craft a Heartseeker when you are ready to investigate farther.";
    if (!s.sites) next += " New shrine placement is disabled in World rules.";
  } else if (has("craft_lens")) {
    recipe = "craft_lens";
    next = carried2.has(ITEM.lens) ? "Use your Seer's Glass to investigate fresh tracks and suspicious animals. Each look wears the glass." : "You have learned to make a Seer's Glass. Craft it to investigate tracks and suspicious animals.";
  } else if (has("watcher1")) {
    recipe = "craft_ward";
    next = "Read your discovered Watcher notes. Improve the shelter and learn its warnings before venturing out.";
  }
  if (settings().dread && dreadOf(p) >= 50) {
    next = "Your nerve is going. Get to light and a roof, find company, or drink Hearth Tea. Frightened people draw them in, and see things that aren't there.";
    if (has("craft_tea") && !carried2.has(ITEM.tea)) recipe = "craft_tea";
  }
  if (!has(recipe)) recipe = "";
  return {
    body: `§7Day ${hollowDay() + 1} · ${phase2} · ${terrain}
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
    const valid = (v3) => typeof v3 === "string" && ENTRY_BY_ID.has(v3);
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
  const pending3 = discoveries.get(playerId);
  if (pending3) system6.clearRun(pending3.run);
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
    const pending3 = discoveries.get(p.id);
    if (pending3) pending3.ids.add(id);
    else {
      const ids = /* @__PURE__ */ new Set([id]);
      const run = system6.runTimeout(() => {
        discoveries.delete(p.id);
        if (!p.isValid) return;
        const unread = [...ids].filter((entry) => !data(p).r.includes(entry));
        if (unread.length === 0) return;
        notice(p, unread.length === 1 ? `§7New journal entry: §f${ENTRY_BY_ID.get(unread[0]).title}` : `§7${unread.length} new journal entries. §fOpen your ${isIsland() ? "Research Log" : "Field Journal"} to read them.`);
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
var logHeader;
function setLogHeader(fn) {
  logHeader = fn;
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
    (logHeader?.(p) ?? "") + `§7Day §f${hollowDay() + 1}§7 · Entries §f${have}/${total}

` + threatsAwake()
  );
  const shown = (e) => entryVisible(e, island) && d.u.includes(e.id);
  const unreadIn = (ch) => ENTRIES.some((e) => e.chapter === ch && shown(e) && !d.r.includes(e.id));
  for (const ch of chapters) {
    const count2 = ENTRIES.filter((e) => e.chapter === ch.id && shown(e)).length;
    form.button(`${ch.title}${unreadIn(ch.id) ? " §6(new)" : ""}
§8${count2} entries`, ch.icon);
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
  const title2 = chaptersFor(island).find((c) => c.id === ch)?.title ?? "Notes";
  const form = new ActionFormData2().title(`§l${title2}`);
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
function stageFor(v3, current2) {
  let stage = current2;
  while (stage < 3 && v3 >= UP[stage]) stage++;
  while (stage > 0 && v3 < UP[stage - 1] - HYST) stage--;
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
function personal(p, sound2, volume, pitch = 1, at) {
  const pr = prefs(p);
  if (!pr.dreadFx) return;
  try {
    p.playSound(sound2, { location: at, volume: volume * Math.max(0.25, pr.ambience / 100), pitch });
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
  const v3 = p.getViewDirection();
  const flat = norm({ x: v3.x, y: 0, z: v3.z });
  return add(p.location, add(scale(flat, -d), { x: 0, y: 0.2, z: 0 }));
}
function followSteps(p, s) {
  const c = ctx(p);
  const sound2 = c.underground ? SND.stepClaws : c.roofed ? SND.stepHeavy : SND.stepLeaves;
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
        personal(p, sound2, 0.55, rand(0.85, 0.95), behind(p, rand(5, 7)));
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
  const dim2 = p.dimension;
  const view = p.getViewDirection();
  const yaw = yawOf(norm({ x: view.x, y: 0, z: view.z }));
  const form = underground2 ? FORM_HOLLOWED : ctx(p).biome === "forest" ? FORM_WATCHER : pick([FORM_WATCHER, FORM_KNOCKER]);
  const head = p.getHeadLocation();
  for (let attempt = 0; attempt < 6; attempt++) {
    const side = chance(0.5) ? 1 : -1;
    const dir = yawDir(yaw + side * rand(38, 58));
    const r = underground2 ? rand(10, 18) : rand(22, 34);
    const guess = add(p.location, scale(dir, r));
    const g = groundNear(dim2, guess.x, p.location.y, guess.z, underground2 ? 4 : 8, form === FORM_HOLLOWED ? 2 : 3);
    if (!g) continue;
    const eye = add(g, { x: 0, y: form === FORM_HOLLOWED ? 0.6 : 2.2, z: 0 });
    if (!clearLine(dim2, head, eye)) continue;
    let e;
    try {
      e = dim2.spawnEntity(ENT.phantom, g);
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
    phantoms.set(e.id, { playerId: p.id, dim: dim2.id, born: now(), form });
    return true;
  }
  return false;
}
function removePhantom(id, seen2) {
  const ph = phantoms.get(id);
  phantoms.delete(id);
  const e = world9.getEntity(id);
  if (!e || !e.isValid) return;
  if (seen2 && ph) {
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
  system7.runInterval(() => safe("dread.phantoms", tickPhantoms), 4);
}
function setDread(p, v3) {
  const s = st2(p);
  s.v = Math.max(0, Math.min(100, v3));
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
import { EquipmentSlot as EquipmentSlot4, GameMode as GameMode6, Player as Player18, system as system12, world as world15 } from "@minecraft/server";

// ../../scripts_src/island/survey.ts
import { BlockPermutation as BlockPermutation3, ItemStack as ItemStack4, Player as Player15, system as system11, world as world12 } from "@minecraft/server";
import { ActionFormData as ActionFormData4 } from "@minecraft/server-ui";

// ../../scripts_src/island/trevor.ts
import { system as system10, world as world11 } from "@minecraft/server";
import { ActionFormData as ActionFormData3 } from "@minecraft/server-ui";

// ../../scripts_src/island/jobs.ts
import { BlockPermutation as BlockPermutation2, ItemStack as ItemStack3, system as system9, world as world10 } from "@minecraft/server";

// ../../scripts_src/island/guns.ts
import {
  EntityDamageCause,
  EquipmentSlot as EquipmentSlot3,
  GameMode as GameMode5,
  ItemStack as ItemStack2,
  Player as Player12,
  system as system8
} from "@minecraft/server";
var GUNS = {
  [ITEM.pistol]: {
    item: ITEM.pistol,
    ammo: ITEM.round,
    ammoName: "9mm rounds",
    mag: 7,
    damage: 7,
    pellets: 1,
    spread: 0,
    range: 48,
    falloffFrom: 20,
    reloadTicks: 26,
    sound: SND.pistol,
    pitch: 1,
    noise: 48,
    shake: 0.22,
    journal: "gear_pistol"
  },
  [ITEM.rifle]: {
    item: ITEM.rifle,
    ammo: ITEM.rifleRound,
    ammoName: ".30 rifle rounds",
    mag: 5,
    damage: 15,
    pellets: 1,
    spread: 0,
    range: 90,
    falloffFrom: 60,
    reloadTicks: 48,
    sound: SND.rifle,
    pitch: 1,
    noise: 64,
    shake: 0.4,
    journal: "gear_rifle"
  },
  [ITEM.shotgun]: {
    item: ITEM.shotgun,
    ammo: ITEM.shell,
    ammoName: "shotgun shells",
    mag: 4,
    damage: 3,
    pellets: 7,
    spread: 5.5,
    range: 22,
    falloffFrom: 8,
    reloadTicks: 40,
    sound: SND.shotgun,
    pitch: 1,
    noise: 56,
    shake: 0.45,
    journal: "gear_shotgun"
  }
};
var MAG_SIZE = 7;
var reloading = /* @__PURE__ */ new Map();
function survivalish(p) {
  const gm = p.getGameMode();
  return gm === GameMode5.Survival || gm === GameMode5.Adventure;
}
function magOf(item) {
  if (!item) return 0;
  const g = GUNS[item.typeId];
  const max = g?.mag ?? MAG_SIZE;
  const v3 = item.getDynamicProperty(DP.mag);
  return typeof v3 === "number" ? Math.max(0, Math.min(max, Math.round(v3))) : max;
}
function setMag(item, n) {
  const g = GUNS[item.typeId];
  item.setDynamicProperty(DP.mag, n);
  item.setLore([`§7Loaded: §f${n}§7/${g?.mag ?? MAG_SIZE}`, "§8Sneak + Use to reload"]);
}
function gunStack(typeId, rounds) {
  const s = new ItemStack2(typeId, 1);
  setMag(s, rounds ?? GUNS[typeId]?.mag ?? MAG_SIZE);
  return s;
}
function pistolStack(rounds = MAG_SIZE) {
  return gunStack(ITEM.pistol, rounds);
}
function heldGun(p) {
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot3.Mainhand);
  const g = item ? GUNS[item.typeId] : void 0;
  return item && g ? [item, g] : void 0;
}
function putBack(p, item) {
  p.getComponent("minecraft:equippable")?.setEquipment(EquipmentSlot3.Mainhand, item);
}
function countAmmo(p, ammo) {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return 0;
  let n = 0;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it?.typeId === ammo) n += it.amount;
  }
  return n;
}
function takeAmmo(p, ammo, want) {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return 0;
  let got = 0;
  for (let i = 0; i < c.size && got < want; i++) {
    const it = c.getItem(i);
    if (it?.typeId !== ammo) continue;
    const take2 = Math.min(it.amount, want - got);
    got += take2;
    if (take2 >= it.amount) c.setItem(i, void 0);
    else {
      it.amount -= take2;
      c.setItem(i, it);
    }
  }
  return got;
}
function reload(p) {
  const held = heldGun(p);
  if (!held) return;
  const [item, g] = held;
  if (magOf(item) >= g.mag) {
    hint(p, "§7It's fully loaded.");
    return;
  }
  const creative = !survivalish(p);
  if (!creative && countAmmo(p, g.ammo) === 0) {
    ui(p, SND.dryFire, 0.8);
    notice(p, `§7No ${g.ammoName} left. §8Crates, bunkers, the dead, or a crafting table (gunpowder, iron, copper).`);
    return;
  }
  const until = system8.currentTick + g.reloadTicks;
  reloading.set(p.id, until);
  worldSound(p.dimension, SND.reload, p.location, 0.9, g.item === ITEM.pistol ? 1 : 0.85);
  system8.runTimeout(() => {
    if (!p.isValid || reloading.get(p.id) !== until) return;
    reloading.delete(p.id);
    const now2 = heldGun(p);
    if (!now2 || now2[1] !== g) return;
    const need = g.mag - magOf(now2[0]);
    const got = creative ? need : takeAmmo(p, g.ammo, need);
    setMag(now2[0], magOf(now2[0]) + got);
    putBack(p, now2[0]);
    hint(p, `§7Reloaded: §f${magOf(now2[0])}§7/${g.mag}  §8(${creative ? "∞" : countAmmo(p, g.ammo)} spare)`);
  }, g.reloadTicks);
}
function add2(a, b, k = 1) {
  return { x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k };
}
function jitter(d, deg) {
  if (deg <= 0) return d;
  const r = deg * Math.PI / 180;
  const v3 = { x: d.x + (Math.random() - 0.5) * 2 * r, y: d.y + (Math.random() - 0.5) * 2 * r, z: d.z + (Math.random() - 0.5) * 2 * r };
  const L = Math.hypot(v3.x, v3.y, v3.z) || 1;
  return { x: v3.x / L, y: v3.y / L, z: v3.z / L };
}
var NO_HIT = ["minecraft:item", "minecraft:xp_orb", ENT.crewBody, ENT.bullet, ENT.trevor, ENT.lure, ENT.phantom, ENT.cultRound];
function fire(p) {
  const held = heldGun(p);
  if (!held) return;
  const [item, g] = held;
  if ((reloading.get(p.id) ?? 0) > system8.currentTick) return;
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
  const dim2 = p.dimension;
  const eye = p.getHeadLocation();
  const view = p.getViewDirection();
  const muzzle2 = add2(eye, view, 0.9);
  worldSound(dim2, g.sound, eye, 1, g.pitch * (0.95 + Math.random() * 0.1));
  particle(dim2, "minecraft:basic_flame_particle", muzzle2);
  particle(dim2, "minecraft:basic_smoke_particle", muzzle2);
  try {
    p.runCommand(`camerashake add @s ${g.shake} 0.12 rotational`);
  } catch {
  }
  emitNoise({ dim: dim2, at: p.location, radius: g.noise, kind: "gunshot", source: p });
  onGunshot(p, g.noise);
  const damage = /* @__PURE__ */ new Map();
  for (let k = 0; k < g.pellets; k++) {
    const dir = jitter(view, g.spread);
    let target2;
    let distance = g.range;
    try {
      const hits = g.pellets === 1 ? p.getEntitiesFromViewDirection({ maxDistance: g.range, excludeTypes: NO_HIT, excludeFamilies: ["inanimate"] }) : dim2.getEntitiesFromRay(eye, dir, { maxDistance: g.range, excludeTypes: NO_HIT, excludeFamilies: ["inanimate"] });
      for (const h of hits) {
        if (h.entity.id === p.id || h.entity.typeId === "minecraft:player") continue;
        target2 = h.entity;
        distance = h.distance;
        break;
      }
    } catch {
    }
    if (!target2) {
      if (k === 0) {
        try {
          const b = dim2.getBlockFromRay(eye, dir, { maxDistance: g.range });
          if (b) {
            const at = add2(b.block.location, b.faceLocation);
            particle(dim2, "minecraft:basic_smoke_particle", at);
            worldSound(dim2, SND.bulletHit, at, 0.5, 1.3);
          }
        } catch {
        }
      }
      continue;
    }
    const hitAt = add2(eye, dir, distance);
    const falloff = distance <= g.falloffFrom ? 1 : Math.max(0.5, 1 - (distance - g.falloffFrom) / (g.range * 1.2));
    let dmg = g.damage * falloff;
    try {
      if (hitAt.y >= target2.getHeadLocation().y - 0.35) dmg *= 1.6;
    } catch {
    }
    const cur = damage.get(target2.id);
    damage.set(target2.id, { e: target2, dmg: (cur?.dmg ?? 0) + dmg, at: hitAt });
  }
  for (const { e, dmg, at } of damage.values()) {
    try {
      e.applyDamage(Math.max(1, Math.round(dmg)), { cause: EntityDamageCause.entityAttack, damagingEntity: p });
    } catch {
    }
    worldSound(dim2, SND.bulletHit, at, 0.9);
    particle(dim2, "minecraft:critical_hit_emitter", at);
  }
  if (mag - 1 === 0) hint(p, "§7Empty. §8Sneak + Use to reload.");
  unlock(p, g.journal, true);
}
var gunshotHook;
function onGunshotHook(fn) {
  gunshotHook = fn;
}
function onGunshot(p, radius) {
  gunshotHook?.(p, radius);
}
function fireFlare(p) {
  const dim2 = p.dimension;
  const eye = p.getHeadLocation();
  const dir = p.getViewDirection();
  worldSound(dim2, SND.pistol, eye, 0.6, 1.6);
  let at = add2(eye, dir, 24);
  try {
    const hit = dim2.getBlockFromRay(eye, dir, { maxDistance: 24 });
    if (hit) at = add2(hit.block.location, hit.faceLocation);
  } catch {
  }
  const lights = [];
  for (const off of [{ x: 0, y: 0, z: 0 }, { x: 0, y: 2, z: 0 }]) {
    const pos = { x: Math.floor(at.x + off.x), y: Math.floor(at.y + off.y), z: Math.floor(at.z + off.z) };
    try {
      const b = dim2.getBlock(pos);
      if (b?.isAir) {
        b.setType("minecraft:light_block_15");
        lights.push(pos);
      }
    } catch {
    }
  }
  let n = 0;
  const run = system8.runInterval(() => {
    n++;
    particle(dim2, "minecraft:basic_flame_particle", { x: at.x, y: at.y + 0.5, z: at.z });
    particle(dim2, "minecraft:lava_particle", { x: at.x, y: at.y + 0.5, z: at.z });
    if (n >= 60) {
      system8.clearRun(run);
      for (const pos of lights) {
        try {
          const b = dim2.getBlock(pos);
          if (b?.typeId === "minecraft:light_block_15") b.setType("minecraft:air");
        } catch {
        }
      }
    }
  }, 10);
  flareHook?.(p, at);
  unlock(p, "gear_flare", true);
}
var flareHook;
var shrineKeyHook;
function onShrineKeyHook(fn) {
  shrineKeyHook = fn;
}
function onFlareHook(fn) {
  flareHook = fn;
}
function forgetGuns(playerId) {
  reloading.delete(playerId);
}
function wear(p, typeId) {
  if (!survivalish(p)) return;
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot3.Mainhand);
  if (!eq || !item || item.typeId !== typeId) return;
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
  const gun = {
    onUse(e) {
      const p = e.source;
      system8.run(() => p.isValid && fire(p));
    }
  };
  reg.registerCustomComponent("hollow:pistol", gun);
  reg.registerCustomComponent("hollow:gun", gun);
  reg.registerCustomComponent("hollow:flare_gun", {
    onUse(e) {
      const p = e.source;
      system8.run(() => {
        if (!p.isValid) return;
        fireFlare(p);
        wear(p, ITEM.flareGun);
      });
    }
  });
  reg.registerCustomComponent("hollow:chelation", {
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player12) system8.run(() => p.isValid && chelate(p));
    }
  });
  reg.registerCustomComponent("hollow:geiger", {
    onUse(e) {
      const p = e.source;
      system8.run(() => {
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
      if (p instanceof Player12) system8.run(() => p.isValid && heal(p));
    }
  });
  reg.registerCustomComponent("hollow:iodine", {
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player12) system8.run(() => p.isValid && takeIodine(p));
    }
  });
  reg.registerCustomComponent("hollow:ration", {
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player12) system8.run(() => p.isValid && hint(p, "§7Beef stew and crackers, cold. It's the best thing you've ever eaten."));
    }
  });
  reg.registerCustomComponent("hollow:field_radio", {
    onUse(e) {
      const p = e.source;
      system8.run(() => {
        if (!p.isValid) return;
        ui(p, "random.click", 0.7, 1.2);
        if (trevorGone()) {
          notice(p, "§8Static. Nobody answers on Trevor's channel any more.");
          return;
        }
        void formSession(p, () => trevorMenu(p, trevorEntity(), true));
      });
    }
  });
  reg.registerCustomComponent("hollow:shrine_key", {
    onUse(e) {
      const p = e.source;
      system8.run(() => p.isValid && shrineKeyHook?.(p));
    }
  });
  reg.registerCustomComponent("hollow:broken_radio", {
    onUse(e) {
      const p = e.source;
      system8.run(() => {
        if (!p.isValid) return;
        ui(p, "random.click", 0.6, 0.8);
        notice(p, "§7Static. The board is cracked clean through and the battery is swollen.\n§fIt will never call the mainland. §7Something bigger might: the old relay on the north peak.\n§8With two copper ingots and some redstone it could still reach Trevor (crafting table).");
        unlock(p, "tower_hint");
      });
    }
  });
}

// ../../scripts_src/island/jobs.ts
var DEFAULT2 = { queue: [], carried: {}, nextId: 1, stats: { trees: 0, stone: 0, food: 0, built: 0 }, lastTopUp: -1 };
var state2;
function st3() {
  if (!state2) state2 = { ...DEFAULT2, ...readWorld(DP.jobs, DEFAULT2) };
  return state2;
}
function save3() {
  writeWorld(DP.jobs, st3());
}
var NAMES = {
  follow: "follow",
  hold: "hold position",
  goto: "go there",
  camp: "make camp",
  chop: "chop trees",
  stone: "gather stone",
  food: "gather food",
  build: "build",
  fire: "light a fire",
  collect: "collect items",
  patrol: "patrol camp"
};
var PLAN_NAMES = { leanto: "a lean-to", cabin: "a cabin", watchtower: "a watchtower", wall: "a palisade wall" };
function orderName(o) {
  return o.kind === "build" && o.plan ? `build ${PLAN_NAMES[o.plan]}` : NAMES[o.kind];
}
function enqueue(p, kind, at, plan2, urgent = false) {
  const s = st3();
  if (s.queue.length >= 12) {
    say("Hang on, hang on. That's a dozen jobs already. Let me get through some of them.");
    return;
  }
  const facing = Math.round((p.getRotation().y % 360 + 360) % 360 / 90) % 4;
  const o = { id: s.nextId++, kind, by: p.id, byName: p.name, at, plan: plan2, facing };
  if (urgent) s.queue.unshift(o);
  else s.queue.push(o);
  save3();
  if (urgent) return;
  const ahead = s.queue.length - 1 + (s.cur ? 1 : 0);
  if (ahead === 0) say(pick([`On it, ${p.name}.`, "Right away.", "Okay. Doing it now."]));
  else say(`Got it, ${p.name}: ${orderName(o)}. ${ahead} ${ahead === 1 ? "job" : "jobs"} ahead of it.`);
}
function cancelMine(p) {
  const s = st3();
  const before = s.queue.length;
  s.queue = s.queue.filter((o) => o.by !== p.id);
  let n = before - s.queue.length;
  if (s.cur && s.cur.order.by === p.id) {
    endJob(false);
    n++;
  }
  save3();
  return n;
}
function clearAll() {
  const s = st3();
  s.queue = [];
  if (s.cur) endJob(false);
  save3();
}
function queueSummary() {
  const s = st3();
  const lines = [];
  if (s.cur) lines.push(`§7Now: §f${orderName(s.cur.order)}§7 for ${s.cur.order.byName}`);
  if (s.queue.length) lines.push(`§7Next: ${s.queue.slice(0, 4).map((o) => `§f${orderName(o)}§7 (${o.byName})`).join(", ")}${s.queue.length > 4 ? "…" : ""}`);
  if (s.camp) {
    const stock = campStock();
    lines.push(`§7Camp crate: §f${stock.logs}§7 logs, §f${stock.stone}§7 stone, §f${stock.food}§7 food`);
  } else lines.push('§8No camp yet. Order "Make camp here".');
  return lines.join("\n");
}
function campPos() {
  return st3().camp;
}
function dim() {
  return world10.getDimension("overworld");
}
function dist2(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function clearMarker(a) {
  if (!a.marker) return;
  try {
    const b = dim().getBlock(a.marker);
    if (b?.typeId === "minecraft:structure_void") b.setType("minecraft:air");
  } catch {
  }
  a.marker = void 0;
}
function travel(e, a, to, phase2) {
  clearMarker(a);
  const g = groundNear(dim(), to.x, to.y, to.z, 6, 2) ?? to;
  const spot = { x: Math.floor(g.x), y: Math.floor(g.y), z: Math.floor(g.z) };
  a.target = spot;
  a.phase = phase2;
  a.since = world10.getAbsoluteTime();
  a.arrived = false;
  try {
    const b = dim().getBlock(spot);
    if (b && (b.isAir || b.typeId === "minecraft:short_grass" || b.typeId === "minecraft:tall_grass")) {
      b.setType("minecraft:structure_void");
      a.marker = spot;
    }
  } catch {
  }
  const d = dist2(e.location, spot);
  if (d > 44) {
    const k = 30 / d;
    const hop = groundNear(dim(), spot.x + (e.location.x - spot.x) * k, spot.y, spot.z + (e.location.z - spot.z) * k, 8);
    if (hop) e.teleport(hop);
  }
  e.triggerEvent("hollow:job_goto");
}
function arrived(e, a) {
  if (!a.target) return true;
  const d = Math.hypot(e.location.x - a.target.x - 0.5, e.location.z - a.target.z - 0.5);
  if (a.arrived || d < 2.4) return true;
  const elapsed = world10.getAbsoluteTime() - a.since;
  if (elapsed > 100 + Math.min(600, d * 14)) {
    const g = groundNear(dim(), a.target.x, a.target.y, a.target.z, 6);
    if (g) e.teleport(g);
    return true;
  }
  return false;
}
function work(e) {
  if (e.getProperty("hollow:state") !== "work") e.triggerEvent("hollow:job_work");
}
function carry(id, n) {
  const c = st3().carried;
  c[id] = (c[id] ?? 0) + n;
}
function carriedTotal() {
  return Object.values(st3().carried).reduce((a, b) => a + b, 0);
}
function campContainer() {
  const s = st3();
  if (!s.camp) return void 0;
  try {
    const b = dim().getBlock(s.camp);
    if (b?.typeId !== "minecraft:trapped_chest") return void 0;
    return b.getComponent("minecraft:inventory")?.container;
  } catch {
    return void 0;
  }
}
function campStock() {
  const c = campContainer();
  const out2 = { logs: 0, stone: 0, food: 0 };
  if (!c) return out2;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (!it) continue;
    if (it.typeId.endsWith("_log")) out2.logs += it.amount;
    else if (it.typeId === "minecraft:cobblestone") out2.stone += it.amount;
    else if (["minecraft:sweet_berries", "minecraft:cod", "minecraft:salmon", "minecraft:tropical_fish"].includes(it.typeId)) out2.food += it.amount;
  }
  return out2;
}
function takeFromCamp(match, n) {
  const c = campContainer();
  if (!c) return 0;
  let got = 0;
  for (let i = 0; i < c.size && got < n; i++) {
    const it = c.getItem(i);
    if (!it || !match(it.typeId)) continue;
    const take2 = Math.min(it.amount, n - got);
    got += take2;
    if (take2 >= it.amount) c.setItem(i, void 0);
    else {
      it.amount -= take2;
      c.setItem(i, it);
    }
  }
  return got;
}
function deposit() {
  const s = st3();
  const c = campContainer();
  for (const [id, n0] of Object.entries(s.carried)) {
    let n = n0;
    while (n > 0) {
      const amount = Math.min(64, n);
      n -= amount;
      const stack = new ItemStack3(id, amount);
      const left = c ? c.addItem(stack) : stack;
      if (left) {
        const at = s.camp ?? trevorEntity()?.location;
        if (at) dim().spawnItem(left, { x: at.x + 0.5, y: at.y + 1, z: at.z + 0.5 });
      }
    }
  }
  s.carried = {};
}
function makeCamp(at) {
  const s = st3();
  try {
    const g = groundNear(dim(), at.x, at.y, at.z, 6, 2);
    if (!g) return false;
    const b = dim().getBlock(g);
    if (!b) return false;
    b.setPermutation(BlockPermutation2.resolve("minecraft:trapped_chest", { "minecraft:cardinal_direction": "south" }));
    s.camp = { x: Math.floor(g.x), y: Math.floor(g.y), z: Math.floor(g.z) };
    setHome(s.camp);
    save3();
    return true;
  } catch {
    return false;
  }
}
var LOG = (id) => id.endsWith("_log") || id.endsWith("_wood") || id === "minecraft:mangrove_roots";
var LEAF = (id) => id.endsWith("_leaves") || id === "minecraft:vine";
var LOG_TYPES = ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "cherry", "pale_oak"].map((t) => `minecraft:${t}_log`);
var STONE_TYPES = [
  "minecraft:stone",
  "minecraft:cobblestone",
  "minecraft:andesite",
  "minecraft:diorite",
  "minecraft:granite",
  "minecraft:tuff",
  "minecraft:gravel",
  "minecraft:calcite",
  "minecraft:deepslate"
];
function nearest(at, list3) {
  let best;
  let bd = 1e9;
  for (const v3 of list3) {
    const d = dist2(at, v3);
    if (d < bd) {
      bd = d;
      best = v3;
    }
  }
  return best;
}
function treeBlocks(start2) {
  const d = dim();
  const seen2 = /* @__PURE__ */ new Set();
  const logs = [];
  const stack = [start2];
  while (stack.length && logs.length < 90) {
    const p = stack.pop();
    const k = `${p.x},${p.y},${p.z}`;
    if (seen2.has(k)) continue;
    seen2.add(k);
    let id;
    try {
      id = d.getBlock(p)?.typeId;
    } catch {
      id = void 0;
    }
    if (!id || !LOG(id)) continue;
    logs.push(p);
    for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      if (dx || dy || dz) stack.push({ x: p.x + dx, y: p.y + dy, z: p.z + dz });
    }
  }
  const leaves = [];
  const lseen = /* @__PURE__ */ new Set();
  for (const l of logs) {
    for (const v3 of findBlocksBy(l, 3, LEAF)) {
      const k = `${v3.x},${v3.y},${v3.z}`;
      if (!lseen.has(k)) {
        lseen.add(k);
        leaves.push(v3);
      }
    }
  }
  logs.sort((a, b) => b.y - a.y);
  return [...leaves, ...logs];
}
function findBlocksBy(c, r, test) {
  const out2 = [];
  const d = dim();
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
    const p = { x: c.x + dx, y: c.y + dy, z: c.z + dz };
    try {
      const id = d.getBlock(p)?.typeId;
      if (id && test(id)) out2.push(p);
    } catch {
    }
  }
  return out2;
}
function exposed(p) {
  try {
    return !!dim().getBlock({ x: p.x, y: p.y + 1, z: p.z })?.isAir;
  } catch {
    return false;
  }
}
function chew(e, a, perTick) {
  const list3 = a.queueBlocks;
  if (!list3 || list3.length === 0) return true;
  const d = dim();
  for (let i = 0; i < perTick && list3.length; i++) {
    const p = list3.shift();
    try {
      const b = d.getBlock(p);
      if (!b) continue;
      const id = b.typeId;
      if (LOG(id)) {
        carry(id === "minecraft:mangrove_roots" ? "minecraft:mangrove_roots" : id.replace("_wood", "_log"), 1);
        worldSound(d, "dig.wood", p, 0.8);
      } else if (LEAF(id)) {
        if (Math.random() < 0.04) carry("minecraft:stick", 1);
        if (Math.random() < 0.02 && id === "minecraft:oak_leaves") carry("minecraft:apple", 1);
      } else if (STONE_TYPES.includes(id)) {
        carry(id === "minecraft:gravel" ? "minecraft:gravel" : "minecraft:cobblestone", 1);
        worldSound(d, "dig.stone", p, 0.8);
      } else continue;
      particle(d, "minecraft:basic_smoke_particle", { x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 });
      b.setType("minecraft:air");
    } catch {
    }
  }
  return list3.length === 0;
}
function blueprint(plan2) {
  const out2 = [];
  const log = (x, y, z) => out2.push([x, y, z, "minecraft:oak_log", { pillar_axis: "y" }]);
  const plank = (x, y, z) => out2.push([x, y, z, "minecraft:oak_planks"]);
  if (plan2 === "leanto") {
    for (const x of [-2, 2]) {
      log(x, 0, -1);
      log(x, 1, -1);
      log(x, 2, -1);
      log(x, 0, 1);
    }
    for (let x = -2; x <= 2; x++) {
      out2.push([x, 3, -1, "minecraft:oak_slab", { "minecraft:vertical_half": "bottom" }]);
      plank(x, 2, 0);
      out2.push([x, 1, 1, "minecraft:oak_slab", { "minecraft:vertical_half": "top" }]);
    }
    out2.push([0, 0, 2, "minecraft:campfire", { extinguished: false, "minecraft:cardinal_direction": "south" }]);
  } else if (plan2 === "cabin") {
    for (let y = 0; y < 4; y++) {
      for (let x = -3; x <= 3; x++) for (const z of [-3, 3]) {
        if (Math.abs(x) === 3 || y === 3) log(x, y, z);
        else if (!(z === 3 && x === 0 && y < 2) && !(y === 1 && Math.abs(x) === 2)) plank(x, y, z);
        else if (y === 1 && Math.abs(x) === 2) out2.push([x, y, z, "minecraft:oak_fence"]);
      }
      for (let z = -2; z <= 2; z++) for (const x of [-3, 3]) {
        if (y === 3) log(x, y, z);
        else if (y === 1 && z === 0) out2.push([x, y, z, "minecraft:oak_fence"]);
        else plank(x, y, z);
      }
    }
    out2.push([0, 0, 3, "minecraft:wooden_door", { "minecraft:cardinal_direction": "south", door_hinge_bit: false, open_bit: false, upper_block_bit: false }]);
    out2.push([0, 1, 3, "minecraft:wooden_door", { "minecraft:cardinal_direction": "south", door_hinge_bit: false, open_bit: false, upper_block_bit: true }]);
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
      const edge = Math.abs(x) === 4 || Math.abs(z) === 4;
      out2.push([x, 4, z, edge ? "minecraft:oak_slab" : "minecraft:oak_planks", edge ? { "minecraft:vertical_half": "bottom" } : void 0]);
    }
    out2.push([2, 3, 2, "minecraft:lantern", { hanging: true }]);
  } else if (plan2 === "watchtower") {
    for (const x of [-1, 1]) for (const z of [-1, 1]) for (let y = 0; y < 7; y++) log(x, y, z);
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
      if (!(x === 0 && z === 2)) plank(x, 7, z);
      if (Math.abs(x) === 2 || Math.abs(z) === 2) {
        if (!(x === 0 && z === 2)) out2.push([x, 8, z, "minecraft:oak_fence"]);
      }
    }
    for (let y = 0; y < 8; y++) out2.push([0, y, 2, "minecraft:ladder", { facing_direction: 3 }]);
    for (let y = 0; y < 7; y++) plank(0, y, 1);
    out2.push([1, 8, 1, "minecraft:torch", { torch_facing_direction: "top" }]);
  } else {
    for (let x = -3; x <= 3; x++) {
      log(x, 0, 0);
      log(x, 1, 0);
      log(x, 2, 0);
      out2.push([x, 3, 0, "minecraft:oak_fence"]);
    }
  }
  return out2;
}
var COST = {
  leanto: { logs: 10, stone: 0 },
  cabin: { logs: 40, stone: 0 },
  watchtower: { logs: 30, stone: 0 },
  wall: { logs: 8, stone: 0 }
};
function rotate(dx, dz, f) {
  switch (f) {
    case 1:
      return [-dz, dx];
    case 2:
      return [-dx, -dz];
    case 3:
      return [dz, -dx];
    default:
      return [dx, dz];
  }
}
var SOFT = /* @__PURE__ */ new Set([
  "minecraft:air",
  "minecraft:short_grass",
  "minecraft:tall_grass",
  "minecraft:fern",
  "minecraft:large_fern",
  "minecraft:deadbush",
  "minecraft:poppy",
  "minecraft:dandelion",
  "minecraft:oxeye_daisy",
  "minecraft:cornflower",
  "minecraft:azure_bluet",
  "minecraft:short_dry_grass",
  "minecraft:tall_dry_grass",
  "minecraft:leaf_litter",
  "minecraft:bush",
  "minecraft:structure_void",
  "minecraft:snow_layer"
]);
function placeNext(a, origin, facing) {
  const list3 = a.queueBlocks;
  if (!list3 || list3.length === 0) return true;
  const [dx, dy, dz, type, states2] = list3.shift();
  const [rx, rz] = rotate(dx, dz, (facing + 2) % 4);
  const p = { x: origin.x + rx, y: origin.y + dy, z: origin.z + rz };
  try {
    const b = dim().getBlock(p);
    if (b && SOFT.has(b.typeId)) {
      if (dy === 0 && type.endsWith("_log")) {
        for (let k = 1; k <= 5; k++) {
          const below = dim().getBlock({ x: p.x, y: p.y - k, z: p.z });
          if (!below || !SOFT.has(below.typeId)) break;
          below.setPermutation(BlockPermutation2.resolve(type, states2));
        }
      }
      let perm;
      try {
        perm = BlockPermutation2.resolve(type, states2);
      } catch {
        perm = BlockPermutation2.resolve(type);
      }
      b.setPermutation(perm);
      worldSound(dim(), "use.wood", p, 0.7);
    }
  } catch {
  }
  return list3.length === 0;
}
function begin(e, o) {
  const s = st3();
  const a = { order: o, phase: "start", since: world10.getAbsoluteTime(), n: 0 };
  s.cur = a;
  save3();
  const owner = world10.getAllPlayers().find((p) => p.id === o.by);
  switch (o.kind) {
    case "follow":
      if (owner) orderFollow(owner);
      s.cur = void 0;
      break;
    case "hold":
      orderHold(owner);
      s.cur = void 0;
      break;
    case "camp":
    case "goto":
    case "chop":
    case "stone":
    case "food":
    case "fire":
    case "collect":
      if (o.at) travel(e, a, o.at, "to_site");
      else s.cur = void 0;
      if (o.kind === "chop") say(pick(["Right. Let's get some timber.", "Trees it is.", `Chopping, for ${o.byName}.`]), "job", 0);
      break;
    case "build": {
      const plan2 = o.plan ?? "leanto";
      const need = COST[plan2];
      const stock = campStock();
      if (stock.logs < need.logs) {
        say(`I'll need ${need.logs} logs at camp for ${PLAN_NAMES[plan2]}. We've got ${stock.logs}. Have me chop some first.`);
        s.cur = void 0;
        break;
      }
      if (s.camp) travel(e, a, s.camp, "to_camp_take");
      break;
    }
    case "patrol":
      if (!s.camp) {
        say("Patrol what? We don't have a camp yet.");
        s.cur = void 0;
      } else travel(e, a, s.camp, "patrol");
      break;
  }
  save3();
}
function endJob(done3) {
  const s = st3();
  const a = s.cur;
  if (!a) return;
  clearMarker(a);
  s.cur = void 0;
  save3();
  const e = trevorEntity();
  if (e) e.triggerEvent("hollow:job_stop");
  if (done3 && s.queue.length === 0) {
    const owner = world10.getAllPlayers().find((p) => p.id === a.order.by);
    if (owner && a.order.kind !== "goto" && a.order.kind !== "camp") orderFollow(owner, true);
    else orderHold(void 0, true);
  }
}
function step(e) {
  const s = st3();
  const a = s.cur;
  if (!a) {
    const next = s.queue.shift();
    if (next) {
      save3();
      begin(e, next);
    }
    return;
  }
  const o = a.order;
  const t = world10.getAbsoluteTime();
  const phaseAge = t - a.since;
  const setPhase2 = (p) => {
    a.phase = p;
    a.since = t;
  };
  if (a.phase.startsWith("to_") || a.phase === "patrol") {
    if (!arrived(e, a)) return;
    clearMarker(a);
  }
  switch (o.kind) {
    case "goto":
      say(pick(["Here.", "Made it. Waiting.", "I'm here. What now?"]), "arrive", 100);
      endJob(true);
      orderHold(void 0, true);
      return;
    case "camp":
      if (makeCamp(o.at ?? e.location)) say("Camp's here, then. Anything I bring back goes in the crate. And this is where I'll come home to.");
      else say("Can't set a crate down there. Pick somewhere flatter.");
      endJob(true);
      return;
    case "fire":
      try {
        const g = groundNear(dim(), e.location.x + 1, e.location.y, e.location.z, 4, 2);
        if (g) dim().getBlock(g)?.setPermutation(BlockPermutation2.resolve("minecraft:campfire", { extinguished: false, "minecraft:cardinal_direction": "south" }));
        say(pick(["There. Warm, and the light keeps them honest.", "Fire's lit."]));
      } catch {
      }
      endJob(true);
      return;
    case "collect": {
      if (a.phase === "to_site") {
        let n = 0;
        for (const it of e.dimension.getEntities({ type: "minecraft:item", location: e.location, maxDistance: 12 })) {
          const stack = it.getComponent("minecraft:item")?.itemStack;
          if (!stack) continue;
          carry(stack.typeId, stack.amount);
          n += stack.amount;
          it.remove();
        }
        say(n ? `Picked up ${n} things. Taking them to camp.` : "Nothing here worth picking up.");
        if (n && s.camp) travel(e, a, s.camp, "to_camp");
        else endJob(true);
        return;
      }
      deposit();
      endJob(true);
      return;
    }
    case "chop":
    case "stone":
    case "food":
      return gatherStep(e, a, phaseAge, setPhase2);
    case "build":
      return buildStep(e, a, phaseAge, setPhase2);
    case "patrol":
      return patrolStep(e, a);
    default:
      endJob(true);
  }
}
function gatherStep(e, a, phaseAge, setPhase2) {
  const s = st3();
  const o = a.order;
  if (a.phase === "to_camp") {
    deposit();
    if (o.kind === "chop") s.stats.trees += a.n;
    else if (o.kind === "stone") s.stats.stone += a.n;
    else s.stats.food += a.n;
    save3();
    const total = o.kind === "chop" ? s.stats.trees : 0;
    say(o.kind === "chop" ? total >= 10 && total % 10 < a.n ? `That's ${total} trees I've cut on this island. My shoulders know it.` : "Logs are in the crate." : o.kind === "stone" ? "Stone's in the crate." : "Food's in the crate.");
    endJob(true);
    return;
  }
  if (a.phase === "working") {
    work(e);
    if (o.kind === "food" && a.target && phaseAge < 160) return;
    const done3 = chew(e, a, o.kind === "chop" ? 3 : 2);
    if (!done3) return;
    a.n++;
    setPhase2("search");
  }
  const limit = o.kind === "chop" ? 3 : 4;
  if (a.n >= limit || carriedTotal() >= 120) {
    if (s.camp) travel(e, a, s.camp, "to_camp");
    else {
      say(`No camp to stack this at, so I'll leave it here. Have someone order "Make camp".`);
      deposit();
      endJob(true);
    }
    return;
  }
  const here = e.location;
  if (o.kind === "chop") {
    const logs = findBlocks(e.dimension, here, LOG_TYPES, 18, 6, 18, 400).filter((p) => {
      try {
        const below = e.dimension.getBlock({ x: p.x, y: p.y - 1, z: p.z });
        return !!below && !LOG(below.typeId);
      } catch {
        return false;
      }
    });
    const base = nearest(here, logs);
    if (!base) return noMore(e, a, "No more trees close by.");
    if (dist2(here, base) > 2.8 && a.phase !== "to_tree") {
      travel(e, a, { x: base.x + 1, y: base.y, z: base.z }, "to_tree");
      return;
    }
    a.queueBlocks = treeBlocks(base);
    setPhase2("working");
    work(e);
  } else if (o.kind === "stone") {
    const stones = findBlocks(e.dimension, here, STONE_TYPES, 14, 5, 14, 400).filter(exposed);
    const at = nearest(here, stones);
    if (!at) return noMore(e, a, "There's no bare stone around here. Try a cliff or the riverbed.");
    if (dist2(here, at) > 3.2 && a.phase !== "to_stone") {
      travel(e, a, { x: at.x, y: at.y + 1, z: at.z }, "to_stone");
      return;
    }
    a.queueBlocks = stones.filter((p) => dist2(p, at) < 3).slice(0, 8);
    setPhase2("working");
  } else {
    const bushes = findBlocks(e.dimension, here, ["minecraft:sweet_berry_bush"], 18, 5, 18, 100).filter((p) => {
      try {
        return Number(e.dimension.getBlock(p)?.permutation.getState("growth") ?? 0) >= 2;
      } catch {
        return false;
      }
    });
    const bush = nearest(here, bushes);
    if (bush) {
      if (dist2(here, bush) > 2.8 && a.phase !== "to_bush") {
        travel(e, a, { x: bush.x + 1, y: bush.y, z: bush.z }, "to_bush");
        return;
      }
      try {
        const b = e.dimension.getBlock(bush);
        b.setPermutation(b.permutation.withState("growth", 1));
        carry("minecraft:sweet_berries", 2 + Math.floor(Math.random() * 2));
      } catch {
      }
      a.queueBlocks = [];
      setPhase2("working");
      a.target = void 0;
      return;
    }
    const water = findBlocks(e.dimension, here, ["minecraft:water"], 20, 4, 20, 300).filter(exposed);
    const shore = nearest(here, water);
    if (!shore) return noMore(e, a, "No berries and no water. We'll go hungry or go further.");
    if (dist2(here, shore) > 3.5 && a.phase !== "to_water") {
      travel(e, a, { x: shore.x, y: shore.y + 1, z: shore.z }, "to_water");
      return;
    }
    carry(pick(["minecraft:cod", "minecraft:salmon", "minecraft:cod", "minecraft:tropical_fish"]), 1);
    a.queueBlocks = [];
    a.target = shore;
    setPhase2("working");
    if (a.n === 0) say("No berries out here. I'll try for a fish.", "fish", 1200);
  }
}
function noMore(e, a, msg) {
  if (a.n === 0 && carriedTotal() === 0) {
    say(msg);
    endJob(true);
    return;
  }
  a.n = 99;
  gatherStep(e, a, 0, () => void 0);
}
function buildStep(e, a, _phaseAge, setPhase2) {
  const o = a.order;
  const plan2 = o.plan ?? "leanto";
  if (a.phase === "to_camp_take") {
    const need = COST[plan2];
    const got = takeFromCamp((id) => id.endsWith("_log"), need.logs);
    if (got < need.logs) {
      deposit();
      say("Someone's been in the crate. Not enough logs left.");
      endJob(true);
      return;
    }
    say(`Right. ${PLAN_NAMES[plan2][0].toUpperCase()}${PLAN_NAMES[plan2].slice(1)}, coming up.`);
    if (o.at) travel(e, a, o.at, "to_site");
    return;
  }
  if (a.phase === "to_site") {
    a.queueBlocks = blueprint(plan2);
    setPhase2("building");
    work(e);
    return;
  }
  if (a.phase === "building" && o.at) {
    const origin = { x: Math.floor(o.at.x), y: Math.floor(o.at.y), z: Math.floor(o.at.z) };
    let done3 = false;
    for (let i = 0; i < 2 && !done3; i++) done3 = placeNext(a, origin, o.facing ?? 0);
    if (done3) {
      st3().stats.built++;
      save3();
      say(pick([`Done. ${PLAN_NAMES[plan2][0].toUpperCase()}${PLAN_NAMES[plan2].slice(1)}. Not pretty, but it'll hold.`, "Finished. Somebody owes me a drink."]));
      endJob(true);
    }
  }
}
var PATROL_POINTS = [[10, 0], [0, 10], [-10, 0], [0, -10]];
function patrolStep(e, a) {
  const s = st3();
  if (!s.camp || isDay() || st3().queue.length > 0) {
    say(isDay() ? "Sun's up. Patrol's over." : "Patrol's over.");
    endJob(true);
    return;
  }
  try {
    const seen2 = e.dimension.getEntities({ families: ["monster"], location: e.location, maxDistance: 26, closest: 1 })[0];
    if (seen2) {
      const dx = seen2.location.x - e.location.x, dz = seen2.location.z - e.location.z;
      const dir = Math.abs(dx) > Math.abs(dz) ? dx > 0 ? "east" : "west" : dz > 0 ? "south" : "north";
      say(`§eMovement to the ${dir}!§r Something's out there.`, "patrol_seen", 600);
    }
  } catch {
  }
  a.n++;
  const [ox, oz] = PATROL_POINTS[a.n % PATROL_POINTS.length];
  travel(e, a, { x: s.camp.x + ox, y: s.camp.y, z: s.camp.z + oz }, "patrol");
}
function topUp() {
  const s = st3();
  const day = world10.getDay();
  if (!s.camp || s.lastTopUp === day || isDarkHours()) return;
  const c = campContainer();
  if (!c) return;
  s.lastTopUp = day;
  c.addItem(new ItemStack3("minecraft:sweet_berries", 3));
  if (day % 2 === 0) c.addItem(new ItemStack3("minecraft:cooked_cod", 1));
  save3();
}
function jobTick() {
  const e = trevorEntity();
  if (!e || trevorDown()) return;
  safe("jobs.step", () => step(e));
  if (!st3().cur) safe("jobs.topup", topUp);
}
function startJobs() {
  world10.afterEvents.dataDrivenEntityTrigger.subscribe((ev) => safe("jobs.arrived", () => {
    if (ev.eventId !== "hollow:arrived") return;
    const a = st3().cur;
    if (a) a.arrived = true;
  }), { entityTypes: ["hollow:trevor"] });
  system9.runInterval(() => safe("jobs", jobTick), 4);
  onFlareHook((p, at) => {
    const e = trevorEntity();
    if (!e?.isValid || trevorDown() || Math.hypot(e.location.x - at.x, e.location.z - at.z) > 220) return;
    enqueue(p, "goto", { x: Math.floor(at.x), y: Math.floor(at.y), z: Math.floor(at.z) }, void 0, true);
    say(pick(["I see your flare! Coming!", "Flare's up. On my way.", "Hold on, I'm coming to the flare!"]), "flare", 200);
  });
}
function lookTarget(p) {
  try {
    const hit = p.getBlockFromViewDirection({ maxDistance: 48 });
    if (hit) return { x: hit.block.location.x, y: hit.block.location.y + 1, z: hit.block.location.z };
  } catch {
  }
  return { x: Math.floor(p.location.x), y: Math.floor(p.location.y), z: Math.floor(p.location.z) };
}
function jobSummary() {
  const s = st3();
  return `jobs: cur=${s.cur ? orderName(s.cur.order) + "/" + s.cur.phase : "-"} queue=${s.queue.length} camp=${s.camp ? `${s.camp.x},${s.camp.y},${s.camp.z}` : "-"} trees=${s.stats.trees} built=${s.stats.built}`;
}

// ../../scripts_src/island/trevor.ts
var DEFAULT3 = {
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
var MEMORY = {
  [ENT.watcher]: ["of those tall ones", "It just stood there, watching us."],
  [ENT.borrowed]: ["sheep that isn't a sheep", "That was not a sheep. That was never a sheep."],
  [ENT.hollowed]: ["clicker", "No eyes. It found us by sound."],
  [ENT.knocker]: ["of the things at the door", "It knocked. It actually knocked."],
  [ENT.mirebound]: ["of the things in the water", "It came up out of the water like a log with teeth."]
};
var REVIVE_TICKS = 60;
var state3;
var lineCooldown = /* @__PURE__ */ new Map();
var reviving = /* @__PURE__ */ new Map();
function st4() {
  if (!state3) state3 = { ...DEFAULT3, ...readWorld(DP.trevor, DEFAULT3) };
  return state3;
}
function saveState() {
  writeWorld(DP.trevor, st4());
}
function trevorEntity() {
  const s = st4();
  if (s.id) {
    try {
      const e = world11.getEntity(s.id);
      if (e?.isValid) return e;
    } catch {
    }
  }
  try {
    const found = world11.getDimension("overworld").getEntities({ type: ENT.trevor });
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
  for (const p of world11.getAllPlayers()) {
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
    const e = world11.getDimension("overworld").spawnEntity(ENT.trevor, at);
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
  system10.run(() => safe("trevor.tame", () => {
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
function trevorDown() {
  return isDown();
}
function leader() {
  const s = st4();
  return world11.getAllPlayers().find((p) => p.id === s.leader && p.isValid);
}
function onDown(e) {
  const s = st4();
  if (s.downAt > 0) return;
  s.downAt = world11.getAbsoluteTime();
  saveState();
  worldSound(e.dimension, "hollow.trevor.hurt", e.location, 1, 0.8);
  say("§cI'm hit... I'm down! §7Somebody... get me up.");
  for (const p of world11.getAllPlayers()) {
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
  system10.run(() => {
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
    for (const p of world11.getAllPlayers()) {
      p.sendMessage("§8Trevor Hale is dead. Nobody reached him in time.");
      notice(p, "§8Trevor is gone.");
    }
    return;
  }
  s.awayDay = world11.getDay();
  s.id = void 0;
  saveState();
  if (e?.isValid) e.triggerEvent("hollow:despawn");
  for (const p of world11.getAllPlayers()) {
    p.sendMessage("§7Trevor crawled off into the brush. §8He'll find his way back to camp at dawn, if he can.");
  }
}
function tickDowned(e) {
  const s = st4();
  const left = DOWN_TICKS - (world11.getAbsoluteTime() - s.downAt);
  if (left <= 0) {
    fallFor(e);
    return;
  }
  for (const p of world11.getAllPlayers()) {
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
    for (const p of world11.getAllPlayers()) {
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
  if (isDown()) {
    if (!reviving.has(p.id)) {
      reviving.set(p.id, 0);
      notice(p, "§7Stay beside him...");
      ui(p, "random.click", 0.4, 0.6);
    }
    return;
  }
  await formSession(p, () => trevorMenu(p, e, false));
  unlock(p, "trevor1");
}
var objectiveVoice;
function setObjectiveVoice(fn) {
  objectiveVoice = fn;
}
async function trevorMenu(p, e, remote) {
  const s = st4();
  const there = lookTarget(p);
  const near = !!e && Math.hypot(e.location.x - p.location.x, e.location.z - p.location.z) < 8;
  const actions = [
    ["Follow me", "textures/ui/hollow/journal/trevor", () => {
      if (rateAt(p) > 60) say("Not in there. Not without a suit. Come back out and I'll follow you anywhere else.");
      else enqueue(p, "follow");
    }],
    ["Hold here", "textures/ui/hollow/world", () => enqueue(p, "hold")],
    ["Go there\n§8where you're looking", "textures/ui/hollow/journal/conditions", () => enqueue(p, "goto", there)],
    ["Make camp here\n§8a crate he fills with what he gathers", "textures/ui/hollow/journal/place_camp", () => enqueue(p, "camp", there)],
    ["Chop trees there", "textures/ui/hollow/journal/item_survival_hatchet", () => enqueue(p, "chop", there)],
    ["Gather stone there", "textures/ui/hollow/journal/shelter", () => enqueue(p, "stone", there)],
    ["Gather food there\n§8berries, or fish from the shore", "textures/ui/hollow/journal/item_ration_pack", () => enqueue(p, "food", there)],
    ["Build...\n§8from the logs in the camp crate", "textures/ui/hollow/journal/place_leanto", () => buildMenu(p, there)],
    ["Light a fire there", "textures/ui/hollow/journal/event_lantern", () => enqueue(p, "fire", there)],
    ["Collect items there", "textures/ui/hollow/journal/recipe", () => enqueue(p, "collect", there)],
    ["Patrol camp tonight", "textures/ui/hollow/journal/watcher", () => enqueue(p, "patrol")]
  ];
  if (near && !remote) actions.push([s.medkits > 0 ? "Patch me up\n§8uses one of his medkits" : "Patch me up\n§8he's out of medkits", "textures/ui/hollow/journal/item_medkit", () => patchUp(p)]);
  actions.push(["Cancel my orders", "textures/ui/hollow/back", () => {
    const n = cancelMine(p);
    say(n ? `Dropping your ${n === 1 ? "order" : `${n} orders`}, ${p.name}.` : "You haven't asked me for anything.");
  }]);
  if (isOperator(p)) actions.push(["§8Clear every order (operator)", "textures/ui/hollow/settings", () => {
    clearAll();
    say("Clean slate.");
  }]);
  const form = new ActionFormData3().title(remote ? "§lField radio: Trevor" : "§lTrevor Hale").body(`${statusLine(e)}
${queueSummary()}

§o"${remote ? "Go ahead, I'm listening." : objectiveVoice?.(p) ?? advice(p)}"`);
  for (const [label, icon] of actions) form.button(label, icon);
  form.button("§8Close", "textures/ui/hollow/back");
  const r = await showForm(p, form);
  if (!r || r.canceled || r.selection === void 0 || r.selection >= actions.length) return;
  await actions[r.selection][2]();
}
async function buildMenu(p, there) {
  const plans = [["leanto", "Lean-to\n§810 logs"], ["cabin", "Cabin\n§840 logs"], ["watchtower", "Watchtower\n§830 logs"], ["wall", "Palisade wall\n§88 logs"]];
  const form = new ActionFormData3().title("§lBuild").body("§7He builds where you're looking, facing you, from the logs in the camp crate.");
  for (const [, label] of plans) form.button(label, "textures/ui/hollow/journal/place_leanto");
  form.button("§8Back", "textures/ui/hollow/back");
  const r = await showForm(p, form);
  if (!r || r.canceled || r.selection === void 0 || r.selection >= plans.length) return;
  enqueue(p, "build", there, plans[r.selection][0]);
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
  if (world11.getDay() > s.medkitDay && s.medkits < 3) {
    s.medkits += 1;
    s.medkitDay = world11.getDay();
    saveState();
  }
  const near = world11.getAllPlayers().filter((p) => p.isValid && p.dimension.id === e.dimension.id && Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z) < 24);
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
function tick2() {
  if (!isIsland()) return;
  const s = st4();
  if (s.gone) return;
  const e = trevorEntity();
  if (!e) {
    if (s.awayDay >= 0 && world11.getDay() > s.awayDay && tod() < 3e3) {
      const home = s.home;
      const dim2 = world11.getDimension("overworld");
      let at;
      try {
        if (dim2.isChunkLoaded(home)) at = groundNear(dim2, home.x, home.y, home.z, 12) ?? home;
      } catch {
        at = void 0;
      }
      if (!at) {
        const p = world11.getAllPlayers().find((x) => x.dimension.id === "minecraft:overworld");
        if (p) at = groundNear(dim2, p.location.x + 6, p.location.y, p.location.z + 6, 8);
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
    if (s.downAt > 0 && world11.getAbsoluteTime() - s.downAt > DOWN_TICKS) fallFor(void 0);
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
  world11.afterEvents.playerInteractWithEntity.subscribe((ev) => safe("trevor.interact", () => {
    if (ev.target.typeId !== ENT.trevor) return;
    void talk(ev.player, ev.target);
  }));
  world11.afterEvents.dataDrivenEntityTrigger.subscribe((ev) => safe("trevor.trigger", () => {
    if (ev.eventId === "hollow:down") onDown(ev.entity);
  }), { entityTypes: [ENT.trevor] });
  world11.afterEvents.entityDie.subscribe((ev) => safe("trevor.die", () => {
    if (ev.deadEntity.typeId !== ENT.trevor) return;
    if (st4().gone) return;
    fallFor(void 0);
  }), { entityTypes: [ENT.trevor] });
  world11.afterEvents.entityDie.subscribe((ev) => safe("trevor.memory", () => {
    const dead = ev.deadEntity;
    const name = MEMORY[dead.typeId];
    if (!name || !isIsland()) return;
    const e = trevorEntity();
    if (!e || e.dimension.id !== dead.dimension.id) return;
    if (Math.hypot(e.location.x - dead.location.x, e.location.z - dead.location.z) > 40) return;
    const s = st4();
    s.kills ??= {};
    const n = s.kills[dead.typeId] = (s.kills[dead.typeId] ?? 0) + 1;
    saveState();
    const ord = ["", "first", "second", "third", "fourth", "fifth", "sixth"][n] ?? `${n}th`;
    if (n === 1) say(`What in God's name was that? ${name[1]}`, `mem:${dead.typeId}`, 200);
    else say(`That's the ${ord} ${name[0]}. ${n >= 3 ? "There's more of them than there should be." : "Keep count. I am."}`, `mem:${dead.typeId}`, 200);
  }));
  world11.afterEvents.entitySpawn.subscribe((ev) => safe("trevor.shot", () => {
    const b = ev.entity;
    if (!b.isValid || b.typeId !== ENT.bullet) return;
    worldSound(b.dimension, SND.pistol, b.location, 1, 0.92 + Math.random() * 0.1);
    particle(b.dimension, "minecraft:basic_smoke_particle", b.location);
    emitNoise({ dim: b.dimension, at: b.location, radius: 48, kind: "gunshot" });
    say(pick(["Contact!", "Get behind me!", "Shooting!", "Down, down!"]), "contact", 600);
  }));
  every("trevor", 10, tick2, 7);
}

// ../../scripts_src/island/survey.ts
var DEFAULT4 = { stocked: [], stations: [], samples: [], reels: [], altar: false, heart: false, findings: false };
var state4;
function st5() {
  if (!state4) state4 = { ...DEFAULT4, ...readWorld(DP.survey, DEFAULT4) };
  return state4;
}
function save4() {
  writeWorld(DP.survey, st5());
}
var REEL = (n) => [`reel:${n}`, 1];
var LOOT = {
  store_shelf: [[ITEM.ration, 3], ["minecraft:bread", 4], [ITEM.sampleKit, 2], ["minecraft:torch", 12], ["minecraft:paper", 6]],
  store_wire: [[ITEM.wire, 4], ["minecraft:copper_ingot", 6], ["minecraft:iron_ingot", 3], ["minecraft:string", 4]],
  police_armory: [[ITEM.shotgun, 1], [ITEM.shell, 12], [ITEM.round, 14], [ITEM.medkit, 1]],
  pens_shed: [[ITEM.sampleKit, 3], ["minecraft:wheat", 12], ["minecraft:shears", 1], ["minecraft:lead", 2]],
  station1_log: [REEL(1), ["minecraft:paper", 3], [ITEM.iodine, 2]],
  station2_log: [REEL(2), ["minecraft:paper", 3], [ITEM.sampleKit, 2]],
  station3_log: [REEL(3), ["minecraft:paper", 2], [ITEM.round, 7]],
  station4_log: [REEL(4), ["minecraft:paper", 2], [ITEM.ration, 2]],
  station5_log: [REEL(5), ["minecraft:paper", 2], [ITEM.medkit, 1]],
  station6_log: [REEL(6), ["minecraft:paper", 2], ["minecraft:coal", 8]],
  bunker1_armory: [[ITEM.rifle, 1], [ITEM.rifleRound, 15], [ITEM.flareGun, 1], [ITEM.hazmatHood, 1], [ITEM.hazmatSuit, 1]],
  bunker1_records: [REEL(7), ["minecraft:paper", 8], ["minecraft:book", 2]],
  bunker1_lab: [[ITEM.chelation, 2], [ITEM.sampleKit, 2], [ITEM.hazmatTrousers, 1], [ITEM.hazmatBoots, 1], ["minecraft:glass_bottle", 4]],
  bunker1_bunks: [[ITEM.ration, 3], [ITEM.medkit, 1], ["minecraft:white_wool", 3]],
  bunker2_tubes: [[ITEM.valve, 2], [ITEM.wire, 2], ["minecraft:redstone", 8]],
  bunker2_records: [REEL(8), ["minecraft:paper", 6]],
  bunker2_bunks: [[ITEM.medkit, 1], [ITEM.rifleRound, 10], [ITEM.iodine, 3]],
  bunker3_lab: [[ITEM.chelation, 2], [ITEM.hazmatHood, 1], [ITEM.hazmatSuit, 1], [ITEM.hazmatTrousers, 1], [ITEM.hazmatBoots, 1]],
  bunker3_generator: [[ITEM.battery, 1], ["minecraft:coal", 16], ["minecraft:copper_ingot", 4]],
  bunker3_records: [REEL(9), ["minecraft:paper", 6], ["minecraft:map", 1]],
  tower_hut: [["minecraft:paper", 4], [ITEM.rifleRound, 5], ["minecraft:coal", 6], [ITEM.wire, 1]],
  dock_battery: [[ITEM.battery, 1], ["minecraft:fishing_rod", 1], [ITEM.ration, 2], [ITEM.flareGun, 1, 0.5]],
  shrine_offerings: [],
  shrine_vault: [REEL(10), [ITEM.valve, 1], [ITEM.rifleRound, 10], [ITEM.chelation, 1], ["minecraft:gold_ingot", 6]],
  mangrove_hut: [[ITEM.rifleRound, 6], ["minecraft:cooked_cod", 4], [ITEM.wire, 1, 0.5]],
  landing_craft: [[ITEM.flareGun, 1], [ITEM.medkit, 1], [ITEM.shell, 8]]
};
var HUT = [["minecraft:bread", 3], ["minecraft:wheat", 6], [ITEM.rifleRound, 4, 0.5], [ITEM.wire, 1, 0.4], ["minecraft:carrot", 4, 0.6]];
function reelStack(n) {
  const it = new ItemStack4(ITEM.filmReel, 1);
  try {
    it.setDynamicProperty(DP.reel, n);
    it.setLore([`§7Reel ${n} of 10`, `§8${reelTitle(n)}`]);
  } catch {
  }
  return it;
}
function fill(key, at) {
  const dim2 = world12.getDimension("overworld");
  try {
    if (!dim2.isChunkLoaded(at)) return false;
    const c = dim2.getBlock(at)?.getComponent("minecraft:inventory")?.container;
    if (!c) return false;
    const table = LOOT[key] ?? (key.startsWith("hut") ? HUT : []);
    for (const [id, n, chance2] of table) {
      if (n <= 0 || chance2 !== void 0 && Math.random() > chance2) continue;
      if (id.startsWith("reel:")) c.addItem(reelStack(Number(id.slice(5))));
      else c.addItem(new ItemStack4(id, n));
    }
    return true;
  } catch {
    return false;
  }
}
function stockNearby() {
  if (!isIsland()) return;
  const s = st5();
  const players = world12.getAllPlayers().filter((p) => p.isValid && p.dimension.id === "minecraft:overworld");
  if (!players.length) return;
  let changed = false;
  for (const c of LOOT_CONTAINERS) {
    const key = `${c.loot}@${c.x},${c.y},${c.z}`;
    if (s.stocked.includes(key)) continue;
    if (!players.some((p) => Math.hypot(p.location.x - c.x, p.location.z - c.z) < 56)) continue;
    if (fill(c.loot, c)) {
      s.stocked.push(key);
      changed = true;
    }
  }
  if (changed) save4();
}
var STATION_1957 = {
  station1: 41,
  station2: 18,
  station3: 9.5,
  station4: 2.2,
  station5: 4.8,
  station6: 0.6
};
function hasItem(p, typeId) {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return false;
  for (let i = 0; i < c.size; i++) if (c.getItem(i)?.typeId === typeId) return true;
  return false;
}
function nextStation(p) {
  const s = st5();
  const left = Object.entries(STATIONS).filter(([k2]) => !s.stations.includes(k2));
  if (!left.length) return "§aAll six stations are logged.";
  left.sort((a, b) => Math.hypot(a[1].x - p.location.x, a[1].z - p.location.z) - Math.hypot(b[1].x - p.location.x, b[1].z - p.location.z));
  const [k, at] = left[0];
  const d = Math.round(Math.hypot(at.x - p.location.x, at.z - p.location.z));
  return `§7Nearest unlogged: §fStation ${k.slice(7)}§7, ${compass(p.location, { x: at.x, y: 0, z: at.z })}, ${d} m.`;
}
function logStation(p, key) {
  const s = st5();
  unlock(p, "survey");
  if (!hasItem(p, ITEM.geiger)) {
    notice(p, "§7The station's 1957 dosimeter panel is dead. Bring a Geiger counter to log a reading here.");
    return;
  }
  const now2 = rateAt(p);
  const then = STATION_1957[key] ?? 1;
  ui(p, "random.click", 1, 0.8);
  if (s.stations.includes(key)) {
    notice(p, `§7Station ${key.slice(7)} already logged. Today: §f${now2.toFixed(2)} mSv/h§7 (1957: ${then} mSv/h). ${nextStation(p)}`);
    return;
  }
  s.stations.push(key);
  save4();
  unlock(p, key);
  notice(p, `§aStation ${key.slice(7)} logged§7: ${now2.toFixed(2)} mSv/h today, ${then} mSv/h on 3 June 1957. §8(${s.stations.length}/6)`);
  notice(p, nextStation(p));
  if (s.stations.length === 1) say("First one. Six of these and we've earned our money. Assuming we live to invoice.", "station", 0);
  else if (s.stations.length === 6) say("That's all six. Whatever happens now, the readings exist. Somebody will have to look at them.", "station", 0);
  checkFindings();
}
var SAMPLE_OF = {
  water: ITEM.waterSample,
  soil: ITEM.soilSample,
  wood: ITEM.woodSample,
  tissue: ITEM.tissueSample
};
var KIND_OF = Object.fromEntries(Object.entries(SAMPLE_OF).map(([k, v3]) => [v3, k]));
var SOIL = [
  "minecraft:dirt",
  "minecraft:coarse_dirt",
  "minecraft:gravel",
  "minecraft:sand",
  "minecraft:red_sand",
  "minecraft:podzol",
  "minecraft:grass_block",
  "minecraft:mud",
  "minecraft:tuff",
  "minecraft:green_stained_glass",
  "minecraft:lime_stained_glass",
  "minecraft:glass"
];
var NO_TISSUE = /* @__PURE__ */ new Set([ENT.trevor, ENT.crewBody, ENT.bullet, ENT.cultRound, ENT.bomber, ENT.bomb, ENT.helicopter, ENT.mushroomCloud]);
function gzDist(at) {
  return Math.hypot(at.x - SITES.GZ.x, at.z - SITES.GZ.z);
}
function takeSample(p) {
  let kind;
  let note = "";
  try {
    const hit = p.getEntitiesFromViewDirection({ maxDistance: 4 })[0]?.entity;
    if (hit && hit.typeId.startsWith("hollow:") && !NO_TISSUE.has(hit.typeId)) {
      if (!hit.matches({ families: ["cult"] })) {
        kind = "tissue";
        note = "You scrape a sliver of something that isn't quite skin into the vial. It moves.";
        try {
          hit.applyDamage(2);
        } catch {
        }
      }
    }
  } catch {
  }
  if (!kind) {
    let b;
    try {
      b = p.getBlockFromViewDirection({ maxDistance: 5, includeLiquidBlocks: true })?.block;
    } catch {
      b = void 0;
    }
    const id = b?.typeId ?? "";
    const near = b ? gzDist(b.location) : gzDist(p.location);
    if (inCraterLake(p) || (id === "minecraft:water" || id === "minecraft:flowing_water") && near < CRATER_R + 8) {
      kind = "water";
      note = "Green water, warm through the glass. The counter climbs as you cap it.";
    } else if ((id.endsWith("_log") || id.endsWith("_wood")) && near < CRATER_R * 3) {
      kind = "wood";
      note = "Charcoal on one side, live wood on the other. The burn is seventy years old.";
    } else if (SOIL.includes(id) && near < CRATER_R * 2.5) {
      kind = "soil";
      note = "Fused sand and black soil, scraped from the blast plain.";
    }
  }
  if (!kind) {
    notice(p, "§7Nothing worth sampling here. The protocol wants §fcrater water§7, §fblast soil§7 and §fscorched wood§7 from near Ground Zero, and §ftissue§7 from the island's creatures.");
    return;
  }
  if (!consumeOne(p, ITEM.sampleKit)) return;
  giveOrDrop(p, new ItemStack4(SAMPLE_OF[kind], 1));
  ui(p, "random.pop", 0.8, 1.2);
  notice(p, `§7${note} §8(use the sample to file it)`);
}
function consumeOne(p, typeId) {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return false;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it?.typeId !== typeId) continue;
    if (it.amount > 1) {
      it.amount -= 1;
      c.setItem(i, it);
    } else c.setItem(i, void 0);
    return true;
  }
  return false;
}
function fileSample(p, typeId) {
  const kind = KIND_OF[typeId];
  if (!kind) return;
  const s = st5();
  if (!consumeOne(p, typeId)) return;
  const fresh = !s.samples.includes(kind);
  if (fresh) {
    s.samples.push(kind);
    save4();
  }
  unlock(p, `sample_${kind}`);
  ui(p, "random.click", 1, 1.1);
  notice(p, fresh ? `§aSample filed§7: ${kind}. §8(${s.samples.length}/4 sample types)` : `§7Another ${kind} sample filed. More data never hurts.`);
  if (fresh && kind === "tissue") say("Don't put that one next to the food.", "tissue", 0);
  checkFindings();
}
function tissueFromKill(dead, killer) {
  if (!(killer instanceof Player15) || !dead.typeId.startsWith("hollow:") || NO_TISSUE.has(dead.typeId)) return;
  if (st5().samples.includes("tissue") || !hasItem(killer, ITEM.sampleKit)) return;
  try {
    if (!dead.matches({ families: ["monster"] })) return;
  } catch {
    return;
  }
  if (!consumeOne(killer, ITEM.sampleKit)) return;
  giveOrDrop(killer, new ItemStack4(ITEM.tissueSample, 1));
  notice(killer, "§7You fill a vial from what's left of it. §8(use the sample to file it)");
}
function checkFindings() {
  const s = st5();
  if (s.findings || s.stations.length < 6 || s.samples.length < 4) return;
  s.findings = true;
  save4();
  for (const p of world12.getAllPlayers()) {
    unlock(p, "findings");
    giveOrDrop(p, new ItemStack4(ITEM.chelation, 1));
    try {
      p.onScreenDisplay.setTitle("§fSurvey complete", { subtitle: "§7the contract is fulfilled", fadeInDuration: 10, stayDuration: 60, fadeOutDuration: 20 });
    } catch {
    }
  }
  say("Six stations, four sample types. The survey's done. Now we just have to get it off the island.", "findings", 0);
}
function reelTitle(n) {
  return ISLAND_ENTRIES.find((e) => e.id === `reel${n}`)?.title ?? "Unlabelled";
}
async function watchReel(p, item) {
  const s = st5();
  let n = 0;
  try {
    n = Number(item?.getDynamicProperty(DP.reel) ?? 0);
  } catch {
    n = 0;
  }
  if (!n) {
    for (let k = 1; k <= 10; k++) {
      if (!s.reels.includes(k)) {
        n = k;
        break;
      }
    }
    n = n || 1;
  }
  if (!s.reels.includes(n)) {
    s.reels.push(n);
    save4();
  }
  unlock(p, `reel${n}`, true);
  const entry = ISLAND_ENTRIES.find((e) => e.id === `reel${n}`);
  if (!entry) return;
  ui(p, SND.cineCountdown, 0.6, 1);
  await formSession(p, async () => {
    const form = new ActionFormData4().title(`§lReel ${n}: ${entry.title}`).body(entry.body);
    form.button("Rewind", "textures/ui/hollow/journal/item_film_reel");
    await showForm(p, form);
  });
}
var ARENA = () => (POINTS.heart_arena ?? [])[0];
function placeAltar() {
  const s = st5();
  if (!isIsland() || s.altar) return;
  const a = ARENA();
  if (!a) return;
  const dim2 = world12.getDimension("overworld");
  const near = world12.getAllPlayers().some((p) => Math.hypot(p.location.x - a.x, p.location.z - a.z) < 44 && p.location.y < a.y + 30);
  if (!near) return;
  const at = { x: a.x, y: a.y, z: a.z - 9 };
  try {
    if (!dim2.isChunkLoaded(at)) return;
    dim2.getBlock(at)?.setPermutation(BlockPermutation3.resolve("hollow:heart_altar"));
    s.altar = true;
    save4();
  } catch {
  }
}
function onHeart(dead) {
  if (dead.typeId !== ENT.heart || !isIsland()) return;
  const s = st5();
  if (!s.heart) {
    s.heart = true;
    save4();
  }
  for (const p of world12.getAllPlayers()) unlock(p, "heart_island");
  say("Whatever that was, it was why the counters climbed going down. It's quiet now. Listen to it.", "heart", 0);
}
function islandHeartTarget() {
  const a = ARENA();
  return a ? { x: a.x + 0.5, y: a.y, z: a.z + 0.5 } : void 0;
}
function surveyState() {
  return st5();
}
function surveySummary() {
  const s = st5();
  return `survey: stations=${s.stations.length}/6 samples=${s.samples.join("+") || "-"} reels=${s.reels.length} stocked=${s.stocked.length}/${LOOT_CONTAINERS.length} heart=${s.heart}`;
}
function registerSurveyComponents(ev) {
  const reg = ev.itemComponentRegistry;
  reg.registerCustomComponent("hollow:sample_kit", {
    onUse(e) {
      const p = e.source;
      system11.run(() => safe("sample", () => p.isValid && takeSample(p)));
    }
  });
  reg.registerCustomComponent("hollow:sample", {
    onUse(e) {
      const p = e.source;
      const id = e.itemStack?.typeId;
      system11.run(() => safe("sample.file", () => p.isValid && id && fileSample(p, id)));
    }
  });
  reg.registerCustomComponent("hollow:film_reel", {
    onUse(e) {
      const p = e.source;
      const item = e.itemStack;
      system11.run(() => p.isValid && void watchReel(p, item));
    }
  });
  reg.registerCustomComponent("hollow:tower_part", {
    onUse(e) {
      const p = e.source;
      system11.run(() => p.isValid && notice(p, "§7A spare for the 1957 relay transmitter. It goes in the cabinet in the hut under the tower on the north peak."));
    }
  });
}
function hotSpots(p) {
  let extra = 0;
  for (const lab of POINTS.sealed_lab ?? []) {
    const d = Math.hypot(p.location.x - lab.x, p.location.y - lab.y, p.location.z - lab.z);
    if (d < 7) extra += 6 * (1 - d / 7);
  }
  const a = ARENA();
  if (a) {
    const d = Math.hypot(p.location.x - a.x, p.location.z - a.z);
    const below = a.y + 40 - p.location.y;
    if (d < 40 && below > 0) extra += (st5().heart ? 1.5 : 9) * Math.min(1, below / 40) * (1 - d / 40);
  }
  return extra;
}
function startSurvey() {
  addRadiationSource(hotSpots);
  world12.afterEvents.buttonPush.subscribe((ev) => safe("survey.button", () => {
    if (!isIsland() || !(ev.source instanceof Player15)) return;
    const b = ev.block.location;
    for (const [key, c] of Object.entries(CONSOLES)) {
      if (c.x !== b.x || c.y !== b.y || c.z !== b.z) continue;
      if (key.startsWith("station")) logStation(ev.source, key);
      else consoleHook?.(ev.source, key);
      return;
    }
  }));
  world12.afterEvents.entityDie.subscribe((ev) => safe("survey.die", () => {
    onHeart(ev.deadEntity);
    if (isIsland()) tissueFromKill(ev.deadEntity, ev.damageSource.damagingEntity);
  }));
  every("survey.stock", 60, stockNearby, 7);
  every("survey.altar", 100, placeAltar, 31);
  every("survey.glow", 200, () => {
    if (!isIsland()) return;
    const s = st5();
    const dim2 = world12.getDimension("overworld");
    for (const [k, c] of Object.entries(CONSOLES)) {
      if (!k.startsWith("station") || s.stations.includes(k)) continue;
      try {
        if (dim2.isChunkLoaded(c)) particle(dim2, "minecraft:redstone_ore_dust_particle", { x: c.x + 0.5, y: c.y + 6, z: c.z + 0.5 });
      } catch {
      }
    }
  }, 17);
}
var consoleHook;
function onConsoleHook(fn) {
  consoleHook = fn;
}

// ../../scripts_src/systems/sites.ts
import {
  BlockVolume as BlockVolume2,
  ItemStack as ItemStack5,
  LocationWaypoint,
  StructureRotation,
  WaypointTexture,
  world as world13
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
function loadedBox(dim2, o, size) {
  try {
    for (const dx of [0, size[0] - 1]) {
      for (const dz of [0, size[2] - 1]) {
        if (!dim2.isChunkLoaded({ x: o.x + dx, y: o.y, z: o.z + dz })) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
function surfaceOk(dim2, o, def) {
  const [sx, sy, sz] = def.size;
  if (!loadedBox(dim2, o, def.size)) return false;
  const pts = [[1, 1], [sx - 2, 1], [1, sz - 2], [sx - 2, sz - 2], [Math.floor(sx / 2), Math.floor(sz / 2)]];
  for (const [dx, dz] of pts) {
    const g = groundNear(dim2, o.x + dx, o.y, o.z + dz, 3, 2);
    if (!g || Math.abs(g.y - o.y) > 2) return false;
    const below = block(dim2, { x: g.x, y: g.y - 1, z: g.z });
    if (!below || below.isLiquid) return false;
  }
  const vol = new BlockVolume2({ x: o.x - 4, y: o.y - def.sink, z: o.z - 4 }, { x: o.x + sx + 3, y: o.y + sy, z: o.z + sz + 3 });
  try {
    if (dim2.containsBlock(vol, { includeTypes: BUILT_BLOCKS }, false)) return false;
    const inner = new BlockVolume2({ x: o.x, y: o.y, z: o.z }, { x: o.x + sx - 1, y: o.y + sy - 1, z: o.z + sz - 1 });
    if (dim2.containsBlock(inner, { includeTypes: LOGS }, false)) return false;
    if (dim2.containsBlock(inner, { includeTypes: ["minecraft:water", "minecraft:flowing_water", "minecraft:lava", "minecraft:flowing_lava"] }, false)) return false;
  } catch {
    return false;
  }
  return true;
}
function farFromOthers(dim2, at, t, spacing) {
  for (const s of allSites()) {
    if (s.d !== dim2.id) continue;
    const min = s.t === t ? spacing : 96;
    if (distXZ(siteCenter(s), at) < min) return false;
  }
  return true;
}
function place(dim2, t, origin) {
  const def = DEFS[t];
  const rot = pick([StructureRotation.None, StructureRotation.Rotate90, StructureRotation.Rotate180, StructureRotation.Rotate270]);
  const o = { x: Math.floor(origin.x), y: Math.floor(origin.y) - def.sink, z: Math.floor(origin.z) };
  try {
    world13.structureManager.place(pick(def.structures), dim2, o, { rotation: rot, includeEntities: false, waterlogged: false });
  } catch (e) {
    console.warn(`[hollow] could not place ${def.structures[0]}: ${e}`);
    return void 0;
  }
  const site = { t, d: dim2.id, x: o.x, y: o.y + def.sink, z: o.z, sx: def.size[0], sy: def.size[1], sz: def.size[2] };
  allSites().push(site);
  saveSites();
  if (def.lootTable) later("sites.fill", 2, () => fill2(dim2, site));
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
function fill2(dim2, s) {
  const def = DEFS[s.t];
  const c = { x: s.x + Math.floor(s.sx / 2), y: s.y + 2, z: s.z + Math.floor(s.sz / 2) };
  const r = Math.max(s.sx, s.sz);
  const containers = findBlocks(dim2, c, ["minecraft:chest", "minecraft:barrel"], Math.ceil(r / 2), s.sy, Math.ceil(r / 2), 4);
  const mgr = world13.getLootTableManager();
  const table = mgr.getLootTable(def.lootTable);
  for (const loc of containers) {
    const b = block(dim2, loc);
    const inv = b?.getComponent("minecraft:inventory")?.container;
    if (!inv) continue;
    const loot2 = table ? mgr.generateLootFromTable(table) ?? [] : [];
    for (const [rule, id, n] of DISABLED_SUPPLY) {
      if (!settings()[rule]) loot2.push(new ItemStack5(id, n));
    }
    for (const item of loot2) {
      const slot = randInt(0, inv.size - 1);
      if (!inv.getItem(slot)) inv.setItem(slot, item);
      else inv.addItem(item);
    }
  }
  for (const loc of findBlocks(dim2, c, ["minecraft:spruce_wall_sign", "minecraft:spruce_standing_sign"], Math.ceil(r / 2), s.sy, Math.ceil(r / 2), 2)) {
    try {
      block(dim2, loc)?.getComponent("minecraft:sign")?.setText(
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
  const dim2 = p.dimension;
  const spawn2 = world13.getDefaultSpawnLocation();
  if (distXZ(p.location, spawn2) < 96) return;
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
    const g = groundNear(dim2, cx, p.location.y, cz, 10, 4);
    if (!g) continue;
    if (bed && bed.dimension.id === dim2.id && distXZ(g, bed) < 64) continue;
    if (!farFromOthers(dim2, g, t, def.spacing)) continue;
    const o = { x: Math.floor(g.x - def.size[0] / 2), y: g.y, z: Math.floor(g.z - def.size[2] / 2) };
    if (!surfaceOk(dim2, o, def)) continue;
    place(dim2, t, o);
    return;
  }
}
function makeShrine(p) {
  const dim2 = p.dimension;
  const def = DEFS.shrine;
  const minY = dim2.heightRange.min;
  for (let k = 0; k < 10; k++) {
    const dir = yawDir(rand(0, 360));
    const r = rand(32, 48);
    const cx = Math.floor(p.location.x + dir.x * r);
    const cz = Math.floor(p.location.z + dir.z * r);
    const y = Math.max(minY + 8, Math.min(-12, Math.floor(p.location.y) - 40) - randInt(0, 12));
    const o = { x: cx - Math.floor(def.size[0] / 2), y, z: cz - Math.floor(def.size[2] / 2) };
    if (!loadedBox(dim2, o, def.size)) continue;
    try {
      const vol = new BlockVolume2({ x: o.x - 1, y: o.y - 1, z: o.z - 1 }, { x: o.x + def.size[0], y: o.y + def.size[1], z: o.z + def.size[2] });
      if (dim2.containsBlock(vol, { includeTypes: ["minecraft:lava", "minecraft:flowing_lava", "minecraft:water", "minecraft:flowing_water"] }, false)) continue;
      if (dim2.containsBlock(vol, { includeTypes: BUILT_BLOCKS }, false)) continue;
    } catch {
      continue;
    }
    return place(dim2, "shrine", o);
  }
  return void 0;
}
var waypoints = /* @__PURE__ */ new Map();
function useHeartseeker(p) {
  if (!isOverworld(p.dimension)) {
    notice(p, "§7The Heartseeker lies still. Its heart is in the Overworld.");
    return;
  }
  if (isIsland()) {
    const c2 = islandHeartTarget();
    if (!c2) return;
    const d2 = Math.round(distXZ(p.location, c2));
    const depth2 = Math.round(p.location.y - c2.y);
    ui(p, SND.heartseeker, 1, d2 < 32 ? 1.3 : d2 < 96 ? 1 : 0.8);
    notice(p, `§7The Heartseeker beats: ${d2 < 6 ? "directly below you" : `${compass(p.location, c2)}, ${d2} blocks`}, ${depth2 > 0 ? `${depth2} blocks down` : "at this depth"}. §8(Under the crater lake. The old instrument shaft on the north rim goes down.)`);
    unlock(p, "craft_heartseeker", true);
    unlock(p, "heart1");
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
  const where2 = d < 6 ? "directly below you" : `${compass(p.location, c)}, ${d} blocks`;
  notice(p, `§7The Heartseeker beats: ${where2}, ${depth > 0 ? `${depth} blocks down` : "at this depth"}.`);
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
      let dim2;
      try {
        dim2 = world13.getDimension(s.d);
      } catch {
        continue;
      }
      const c = siteCenter(s);
      try {
        if (!dim2.isChunkLoaded(c)) continue;
      } catch {
        continue;
      }
      const marker = s.t === "shrine" ? ["hollow:heart_altar"] : ["minecraft:chest", "minecraft:barrel", "minecraft:campfire"];
      if (!hasBlockNear(dim2, c, marker, Math.ceil(s.sx / 2) + 1, s.sy, Math.ceil(s.sz / 2) + 1)) {
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
import { BlockPermutation as BlockPermutation4, world as world14 } from "@minecraft/server";
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
function dirOf(v3) {
  return Math.abs(v3.x) > Math.abs(v3.z) ? v3.x > 0 ? 1 : 3 : v3.z > 0 ? 2 : 0;
}
function pressTrack(dim2, at, kind, facing) {
  const cell = { x: Math.floor(at.x), y: Math.floor(at.y), z: Math.floor(at.z) };
  const here = block(dim2, cell);
  const below = block(dim2, { x: cell.x, y: cell.y - 1, z: cell.z });
  if (!here || !below || !here.isAir || !GROUND.has(below.typeId)) return false;
  const l = list();
  if (l.some((t) => t.d === dim2.id && distSq(t, cell) < 1.5)) return false;
  if (l.length >= CAP && !removeOldest()) return false;
  try {
    here.setPermutation(BlockPermutation4.resolve(BLOCK.tracks, { "hollow:kind": kind, "hollow:dir": dirOf(facing) }));
  } catch {
    return false;
  }
  l.push({ d: dim2.id, x: cell.x, y: cell.y, z: cell.z, t: world14.getAbsoluteTime() });
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
  let dim2;
  try {
    dim2 = world14.getDimension(t.d);
    if (!dim2.isChunkLoaded(t)) return false;
  } catch {
    return false;
  }
  const b = block(dim2, t);
  try {
    if (b?.typeId === BLOCK.tracks) b.setPermutation(BlockPermutation4.resolve("minecraft:air"));
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
  const now2 = world14.getAbsoluteTime();
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
function tracksNear(dim2, at, r) {
  const out2 = [];
  for (const t of list()) {
    if (t.d !== dim2.id || distSq(t, at) > r * r) continue;
    const b = block(dim2, t);
    const k = b?.typeId === BLOCK.tracks ? b.permutation.getState("hollow:kind") : void 0;
    if (typeof k === "number" && !out2.includes(k)) out2.push(k);
  }
  return out2;
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
function survivalish2(p) {
  const gm = p.getGameMode();
  return gm === GameMode6.Survival || gm === GameMode6.Adventure;
}
function wearHeld(p, typeId) {
  if (!survivalish2(p)) return;
  const eq = p.getComponent("minecraft:equippable");
  if (!eq) return;
  const item = eq.getEquipment(EquipmentSlot4.Mainhand);
  if (!item || item.typeId !== typeId) return;
  const dur = item.getComponent("minecraft:durability");
  if (!dur) return;
  if (dur.damage + 1 >= dur.maxDurability) {
    eq.setEquipment(EquipmentSlot4.Mainhand, void 0);
    p.playSound("random.break");
    return;
  }
  dur.damage += 1;
  eq.setEquipment(EquipmentSlot4.Mainhand, item);
}
function consumeHeld(p, typeId) {
  if (!survivalish2(p)) return;
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot4.Mainhand);
  if (!eq || !item || item.typeId !== typeId) return;
  if (item.amount > 1) {
    item.amount -= 1;
    eq.setEquipment(EquipmentSlot4.Mainhand, item);
  } else eq.setEquipment(EquipmentSlot4.Mainhand, void 0);
}
var revealTimers = /* @__PURE__ */ new Map();
var itemSessions = /* @__PURE__ */ new Map();
function forgetItemEffects(playerId) {
  itemSessions.delete(playerId);
  for (const [key, reveal2] of revealTimers) {
    if (reveal2.player.id !== playerId) continue;
    system12.clearRun(reveal2.run);
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
  const dim2 = p.dimension.id;
  system12.run(() => {
    if (!p.isValid || itemSessions.get(p.id) !== token || p.dimension.id !== dim2 || heldItem(p) !== typeId) return;
    const hp = p.getComponent("minecraft:health");
    if (hp && hp.currentValue <= 0) return;
    action();
  });
}
function useLens(p) {
  if (!p.isValid || heldItem(p) !== ITEM.lens) return;
  ui(p, SND.lens, 1);
  const dim2 = p.dimension;
  const head = p.getHeadLocation();
  const lines = [];
  const borrowed = dim2.getEntities({ type: ENT.borrowed, location: p.location, maxDistance: 24 });
  for (const b of borrowed) {
    try {
      p.setPropertyOverrideForEntity(b, PROP.revealed, true);
      p.spawnParticle("hollow:lens_reveal", { x: b.location.x, y: b.location.y + 1.2, z: b.location.z });
      const key = `${p.id}|${b.id}`;
      const old = revealTimers.get(key);
      if (old) system12.clearRun(old.run);
      const run = system12.runTimeout(() => {
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
  const near = dim2.getEntities({ families: [FAMILY.creature], location: p.location, maxDistance: 48, closest: 1 });
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
  const prints = tracksNear(dim2, p.location, 8);
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
        const title2 = unlockNextLore(p);
        if (title2) {
          consumeHeld(p, ITEM.page);
          notice(p, `§7You smooth out the page and copy it into your journal: §f${title2}`);
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
      if (p instanceof Player18) system12.run(() => p.isValid && drinkTea(p));
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
  world15.afterEvents.entityItemPickup.subscribe((ev) => {
    const p = ev.entity;
    if (!(p instanceof Player18)) return;
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
import { Player as Player19, world as world16 } from "@minecraft/server";
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
  const dim2 = p.dimension;
  const head = p.getHeadLocation();
  for (let k = 0; k < 6; k++) {
    const d = yawDir(rand(0, 360));
    const r = rand(18, 30);
    const g = groundNear(dim2, p.location.x + d.x * r, p.location.y + rand(-4, 4), p.location.z + d.z * r, 6, 2);
    if (!g || protectedSpot(dim2, g)) continue;
    try {
      if (dim2.getLightLevel(add(g, { x: 0, y: 0.5, z: 0 })) > 3) continue;
    } catch {
      continue;
    }
    if (hasBlockNear(dim2, g, LIGHT_BLOCKS, 6, 3, 6)) continue;
    if (clearLine(dim2, head, add(g, { x: 0, y: 0.6, z: 0 }))) continue;
    let e;
    try {
      e = dim2.spawnEntity(ENT.hollowed, g);
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
function spawnJuvenile(dim2, at) {
  try {
    const e = dim2.spawnEntity(ENT.hollowed, at);
    e.triggerEvent("hollow:make_juvenile");
    track(e, true);
    return e;
  } catch {
    return void 0;
  }
}
function placeLure(dim2, at) {
  for (const l of lures.values()) {
    if (l.dim === dim2.id && distSq(l.at, at) < 16) {
      const e = world16.getEntity(l.id);
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
    const e = dim2.spawnEntity(ENT.lure, { x: at.x, y: at.y + 0.5, z: at.z });
    lures.set(e.id, { id: e.id, dim: dim2.id, at, born: now() });
  } catch {
  }
}
function removeLure(l) {
  lures.delete(l.id);
  const e = world16.getEntity(l.id);
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
    const e = world16.getEntity(h.id);
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
function listenersNear(dim2, at, radius) {
  const r2 = (radius + 2) * (radius + 2);
  for (const h of hs.values()) if (h.dim === dim2.id && distSq(h.pos, at) <= r2) return true;
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
    const e = world16.getEntity(h.id);
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
  if (killer instanceof Player19) unlock(killer, "hollowed3");
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
function save5() {
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
function arenaLoaded(dim2) {
  try {
    return dim2.isChunkLoaded(boss.center);
  } catch {
    return false;
  }
}
function dimOf() {
  try {
    return world17.getDimension(boss.dim);
  } catch {
    return void 0;
  }
}
function arenaPlayers() {
  const dim2 = dimOf();
  if (!dim2) return [];
  try {
    return dim2.getPlayers({ location: boss.center, maxDistance: 18 }).filter((p) => Math.abs(p.location.y - boss.center.y) < 9);
  } catch {
    return [];
  }
}
function survival(p) {
  const gm = p.getGameMode();
  return gm === GameMode7.Survival || gm === GameMode7.Adventure;
}
function veinSpots(c) {
  const out2 = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out2.push({ x: c.x + sx * 4.3, y: c.y + 1.5, z: c.z + sz * 4.3 });
    }
  }
  return out2;
}
function setAltar(dim2, awake) {
  for (const loc of findBlocks(dim2, boss.center, [BLOCK.altar], 13, 6, 13, 2)) {
    const b = block(dim2, loc);
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
  const held = eq?.getEquipment(EquipmentSlot5.Mainhand);
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
  const dim2 = altar.dimension;
  const center = s && s.d === dim2.id ? { x: s.x + Math.floor(s.sx / 2) + 0.5, y: s.y + 3, z: s.z + Math.floor(s.sz / 2) + 0.5 } : add(altar.location, { x: 0.5, y: 1, z: 9.5 });
  if (survival(p)) {
    if (held.amount > 1) {
      held.amount -= 1;
      eq.setEquipment(EquipmentSlot5.Mainhand, held);
    } else eq.setEquipment(EquipmentSlot5.Mainhand, void 0);
  }
  awaken(dim2, center, altar);
}
function awaken(dim2, center, altar) {
  boss = {
    ...EMPTY,
    active: true,
    dim: dim2.id,
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
  save5();
  worldSound(dim2, SND.altar, altar.center());
  worldSound(dim2, SND.heartAwaken, center, 1);
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
  later("heart.rise", 120, () => rise(dim2));
}
function rise(dim2) {
  rising = false;
  if (!boss.active || boss.heartId) return;
  const n = boss.scale;
  let heart;
  try {
    heart = dim2.spawnEntity(ENT.heart, boss.center);
  } catch (e) {
    console.warn(`[hollow] heart spawn failed: ${e}`);
    dormant(dim2);
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
  spawnVeins(dim2, 4, n);
  nextBurst = now() + 100;
  nextPulse = now() + 240;
  nextGaze = now() + 9999;
  nextBeat = now();
  nextDrone = now() + 40;
  lastPresence = now();
  save5();
}
function spawnVeins(dim2, count2, players) {
  const spots = veinSpots(boss.center).slice(0, count2);
  for (const at of spots) {
    try {
      const v3 = dim2.spawnEntity(ENT.vein, at);
      v3.setDynamicProperty(FIGHT, boss.token);
      if (players >= 3) v3.triggerEvent("hollow:tough");
      boss.veins.push(v3.id);
      particle(dim2, PARTICLE.veinMote, at);
    } catch {
    }
  }
}
function hurt(p, amount, heart) {
  try {
    p.applyDamage(amount, heart ? { cause: EntityDamageCause2.entityAttack, damagingEntity: heart } : { cause: EntityDamageCause2.entityAttack });
  } catch {
  }
}
function rootBurst(dim2, heart, players) {
  for (const p of players.slice(0, 5)) {
    const g = groundNear(dim2, p.location.x, p.location.y, p.location.z, 3, 2) ?? p.location;
    const at = { x: g.x, y: g.y, z: g.z };
    particle(dim2, PARTICLE.rootWarn, at);
    worldSound(dim2, SND.heartRootWarn, at, 0.9);
    later("heart.burst", 24, () => {
      if (!boss.active) return;
      worldSound(dim2, SND.heartRootStrike, at, 1);
      try {
        dim2.spawnEntity(ENT.rootSpike, at);
      } catch {
      }
      for (const q of dim2.getPlayers({ location: at, maxDistance: 2.6 })) {
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
function pulse(dim2, heart, players) {
  worldSound(dim2, SND.heartBeatFast, heart.location, 1);
  particle(dim2, PARTICLE.spores, add(heart.location, { x: 0, y: 2.5, z: 0 }));
  later("heart.pulse", 20, () => {
    if (!boss.active) return;
    const origin = { x: boss.center.x, y: boss.center.y - 1.8, z: boss.center.z };
    worldSound(dim2, SND.heartPulse, origin, 1);
    particle(dim2, PARTICLE.pulseRing, add(origin, { x: 0, y: 0.15, z: 0 }));
    for (const p of players) {
      const d = distXZ(p.location, origin);
      if (d < 2 || d > 15) continue;
      const delay = Math.max(1, Math.round(d / 9 * 20));
      later("heart.pulse.hit", delay, () => {
        if (!boss.active || !p.isValid) return;
        const dNow = distXZ(p.location, origin);
        if (!p.isOnGround || Math.abs(dNow - d) > 2.2) return;
        hurt(p, 5, heart.isValid ? heart : void 0);
        const out2 = norm(sub(p.location, origin));
        try {
          p.applyKnockback({ x: out2.x * 0.7, z: out2.z * 0.7 }, 0.25);
        } catch {
        }
      });
    }
  });
}
function gaze(dim2, heart, players) {
  if (players.length === 0) return;
  const target2 = players[Math.floor(Math.random() * players.length)];
  const core = add(heart.location, { x: 0, y: 1.3, z: 0 });
  worldSound(dim2, SND.heartDrone, core, 1);
  particle(dim2, PARTICLE.spores, core);
  const start2 = norm(sub(target2.location, core));
  const dir0 = { x: start2.x, y: 0, z: start2.z };
  const sweep = Math.random() < 0.5 ? -1 : 1;
  for (let k = 0; k <= 12; k++) {
    later("heart.gaze", 30 + k * 5, () => {
      if (!boss.active || !heart.isValid) return;
      const dir = norm(rotateXZ(dir0, sweep * (k - 6) * 9));
      for (let s = 2; s <= 22; s += 2.5) particle(dim2, PARTICLE.veinMote, add(core, scale(dir, s)));
      for (const p of arenaPlayers()) {
        const head = p.getHeadLocation();
        const flat = { x: head.x - core.x, y: 0, z: head.z - core.z };
        if (angleTo(dir, { x: 0, y: 0, z: 0 }, flat) > 11) continue;
        if (!clearLine(dim2, core, head)) continue;
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
function toPhase(dim2, heart, phase2) {
  boss.phase = phase2;
  worldSound(dim2, SND.heartPhase, heart.location, 1);
  const players = arenaPlayers();
  if (phase2 === 2) {
    try {
      heart.triggerEvent("hollow:phase_2");
      heart.triggerEvent("hollow:shield");
    } catch {
    }
    if (!boss.regrown) {
      boss.regrown = true;
      spawnVeins(dim2, 3, players.length);
    }
    const count2 = Math.min(5, 2 + players.length);
    for (let i = 0; i < count2; i++) {
      const a = i / count2 * 360 + rand(0, 40);
      const d = rotateXZ({ x: 1, y: 0, z: 0 }, a);
      const at = groundNear(dim2, boss.center.x + d.x * 10, boss.center.y - 1, boss.center.z + d.z * 10, 3, 1);
      if (!at) continue;
      const m = spawnJuvenile(dim2, at);
      if (m) minions.add(m.id);
      worldSound(dim2, SND.heartSpawn, at, 0.8);
    }
    for (const p of players) hint(p, "§7The veins grow back. Young ones crawl from the roots. They hunt by sound.");
  } else if (phase2 === 3) {
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
  save5();
}
function update3() {
  if (!load().active) return;
  const dim2 = dimOf();
  if (!dim2) return;
  const t = now();
  if (!arenaLoaded(dim2)) return;
  const players = arenaPlayers();
  if (players.length > 0) lastPresence = t;
  else if (t - lastPresence > 1200) {
    dormant(dim2);
    return;
  }
  if (!boss.heartId) {
    if (!rising) rise(dim2);
    return;
  }
  const heart = findHeart(dim2);
  if (!heart) {
    if (missingSince < 0) missingSince = t;
    else if (t - missingSince > 200) {
      console.warn("[hollow] the Heart is gone without dying; returning the Offering");
      dormant(dim2);
    }
    return;
  }
  missingSince = -1;
  for (const p of players) pushFog(p, FOG.heart, "hollow_heart");
  boss.veins = boss.veins.filter((id) => world17.getEntity(id)?.isValid);
  if (boss.veins.length === 0 && heart.getProperty("hollow:shielded") === true) rebindVeins(dim2);
  if (boss.veins.length === 0 && boss.phase < 3 && heart.getProperty("hollow:shielded") === true) {
    try {
      heart.triggerEvent("hollow:expose");
    } catch {
    }
    worldSound(dim2, SND.heartVeinBreak, heart.location, 1);
    for (const p of players) notice(p, "§cThe Heart is exposed!");
  }
  const hp = hpFraction(heart);
  if (boss.phase === 1 && hp <= 0.6) toPhase(dim2, heart, 2);
  else if (boss.phase === 2 && hp <= 0.25) toPhase(dim2, heart, 3);
  const beatGap = boss.phase === 3 ? 12 : boss.phase === 2 ? 18 : 24;
  if (t >= nextBeat) {
    nextBeat = t + beatGap;
    worldSound(dim2, SND.heartBeat, heart.location, 0.8);
  }
  if (t >= nextDrone) {
    nextDrone = t + 200;
    worldSound(dim2, SND.heartDrone, heart.location, 0.6);
  }
  if (players.length === 0) return;
  if (t >= nextBurst) {
    nextBurst = t + Math.round(boss.phase === 3 ? rand(60, 80) : boss.phase === 2 ? rand(90, 110) : rand(120, 140));
    rootBurst(dim2, heart, players);
  }
  if (t >= nextPulse) {
    nextPulse = t + (boss.phase === 3 ? 180 : boss.phase === 2 ? 200 : 240);
    pulse(dim2, heart, players);
  }
  if (boss.phase === 3 && t >= nextGaze) {
    nextGaze = t + 160;
    gaze(dim2, heart, players);
  }
}
function findHeart(dim2) {
  const byId = world17.getEntity(boss.heartId);
  if (byId?.isValid) return byId;
  try {
    for (const e of dim2.getEntities({ type: ENT.heart, location: boss.center, maxDistance: 24 })) {
      if (e.getDynamicProperty(FIGHT) === boss.token) {
        boss.heartId = e.id;
        rebindVeins(dim2);
        save5();
        return e;
      }
    }
  } catch {
  }
  return void 0;
}
function rebindVeins(dim2) {
  try {
    const found = dim2.getEntities({ type: ENT.vein, location: boss.center, maxDistance: 24 }).filter((e) => e.getDynamicProperty(FIGHT) === boss.token).map((e) => e.id);
    if (found.length > 0) {
      boss.veins = found;
      save5();
    }
  } catch {
  }
}
function clearMinions() {
  for (const id of [...boss.veins, ...minions]) {
    const e = world17.getEntity(id);
    if (e?.isValid) {
      try {
        e.remove();
      } catch {
      }
    }
  }
  minions.clear();
}
function dormant(dim2) {
  try {
    for (const type of [ENT.heart, ENT.vein]) {
      for (const e of dim2.getEntities({ type, location: boss.center, maxDistance: 24 })) {
        if (e.getDynamicProperty(FIGHT) === boss.token) e.remove();
      }
    }
  } catch {
  }
  clearMinions();
  rising = false;
  missingSince = -1;
  const altar = setAltar(dim2, false);
  if (altar) {
    try {
      dim2.spawnItem(new ItemStack7(ITEM.offering, 1), add(altar.location, { x: 0.5, y: 1.2, z: 0.5 }));
    } catch {
    }
  }
  boss = { ...EMPTY, restUntilDay: boss.restUntilDay };
  save5();
}
function onBossHurt(hurtEntity, amount, by) {
  if (!isBossEntity(hurtEntity.id) || !(by instanceof Player20)) return;
  boss.participants[by.id] = (boss.participants[by.id] ?? 0) + amount;
}
function onShieldHit(heart) {
  worldSound(heart.dimension, SND.heartRootWarn, heart.location, 0.4);
  for (const p of arenaPlayers()) hint(p, "§7It's shielded. Break the glowing veins on the pillars first.");
}
function onVeinDied(id) {
  if (!load().active) return;
  boss.veins = boss.veins.filter((v3) => v3 !== id);
  save5();
}
function onHeartDied(id) {
  if (!load().active || id !== boss.heartId) return;
  const dim2 = dimOf();
  const winners = new Set(Object.keys(boss.participants));
  for (const p of arenaPlayers()) winners.add(p.id);
  for (const pid of winners) {
    const p = world17.getEntity(pid);
    if (!p?.isValid) continue;
    giveOrDrop(p, new ItemStack7(ITEM.stilledHeart, 1));
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
  if (dim2) setAltar(dim2, false);
  boss = { ...EMPTY, restUntilDay: hollowDay() + 3 };
  save5();
}
function forgetBossPlayer(p) {
  popFog(p, "hollow_heart");
}
function forceBossPhase(phase2) {
  if (!load().active || !boss.heartId) return "no Heart is awake (use the altar first)";
  const heart = world17.getEntity(boss.heartId);
  const h = heart?.getComponent("minecraft:health");
  if (!heart || !h) return "the Heart is not loaded; stand in the arena";
  const set = (f) => h.setCurrentValue(Math.max(1, Math.floor(h.effectiveMax * f)));
  if (phase2 <= 2) set(0.55);
  else if (boss.phase < 2) {
    set(0.55);
    later("test.phase3", 20, () => {
      if (heart.isValid) set(0.2);
    });
  } else set(0.2);
  return `the Heart drops to phase ${phase2}`;
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
    l = readWorldArray(key).filter((s) => s && typeof s.d === "string" && [s.x, s.y, s.z].every((v3) => typeof v3 === "number" && Number.isFinite(v3)));
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
    let dim2;
    try {
      dim2 = world18.getDimension(s.d);
    } catch {
      continue;
    }
    const existing = block(dim2, s);
    if (existing && existing.typeId !== REGISTERED_TYPES[key]) unregister(key, dim2, s);
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
function wardNear(dim2, loc) {
  for (const s of within(DP.wards, dim2, loc, WARD_RADIUS)) {
    const b = block(dim2, s);
    if (!b) continue;
    const c = wardCharges(b);
    if (c < 0) {
      unregister(DP.wards, dim2, s);
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
function lanternNear(dim2, loc, radius = 24) {
  for (const s of within(LANTERNS, dim2, loc, radius)) {
    const b = block(dim2, s);
    if (!b) continue;
    if (b?.typeId === BLOCK.lantern) return true;
    unregister(LANTERNS, dim2, s);
  }
  return false;
}
function protectedSpot(dim2, loc) {
  return lanternNear(dim2, loc);
}
var chimeCooldown = /* @__PURE__ */ new Map();
function ringChimes() {
  const l = list2(DP.chimes);
  if (l.length === 0) return;
  const t = now();
  for (const s of [...l]) {
    let dim2;
    try {
      dim2 = world18.getDimension(s.d);
    } catch {
      continue;
    }
    const loc = spotLoc(s);
    try {
      if (!dim2.isChunkLoaded(loc)) continue;
    } catch {
      continue;
    }
    const key = `${s.d}|${s.x},${s.y},${s.z}`;
    if ((chimeCooldown.get(key) ?? 0) > t) continue;
    if (dim2.getPlayers({ location: loc, maxDistance: 64 }).length === 0) continue;
    const b = block(dim2, s);
    if (!b || b.typeId !== BLOCK.chime) {
      unregister(DP.chimes, dim2, s);
      continue;
    }
    if (getCustomState(b.permutation, "hollow:silenced") === 1) continue;
    const near = dim2.getEntities({ location: loc, maxDistance: 14, families: [FAMILY.creature] });
    if (near.length === 0) continue;
    chimeCooldown.set(key, t + 120);
    worldSound(dim2, SND.chime, loc, 0.9, 0.95 + Math.random() * 0.1);
    particle(dim2, PARTICLE.chimeRing, loc);
  }
}
function isSurvivalish(p) {
  const gm = p.getGameMode();
  return gm === GameMode8.Survival || gm === GameMode8.Adventure;
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
      const drops = c === 4 ? [new ItemStack8(ITEM.ward, 1)] : [new ItemStack8("minecraft:iron_nugget", 2), new ItemStack8("minecraft:string", 1)];
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
      const held = eq?.getEquipment(EquipmentSlot6.Mainhand);
      if (held?.typeId === "minecraft:charcoal" && c < 4) {
        if (!setWardCharges(b, c + 1)) {
          notice(p, "§7The ward could not be recharged. No charcoal spent; try again when the area is loaded.");
          return;
        }
        if (isSurvivalish(p)) {
          if (held.amount > 1) {
            held.amount -= 1;
            eq.setEquipment(EquipmentSlot6.Mainhand, held);
          } else eq.setEquipment(EquipmentSlot6.Mainhand, void 0);
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
  const dim2 = p.dimension;
  let flock;
  try {
    flock = dim2.getEntities({ type: "minecraft:sheep", location: p.location, maxDistance: 56, minDistance: 16 });
  } catch {
    return false;
  }
  if (flock.length < 2) return false;
  const head = p.getHeadLocation();
  const hidden = flock.filter((sh) => angleTo(p.getViewDirection(), head, sh.location) > 75 || !clearLine(dim2, head, add(sh.location, { x: 0, y: 0.8, z: 0 })));
  if (hidden.length === 0) return false;
  const sheep = pick(hidden);
  const g = groundNear(dim2, sheep.location.x + rand(-2, 2), sheep.location.y, sheep.location.z + rand(-2, 2), 4, 2);
  if (!g || dist(g, p.location) < 14 || lanternNear(dim2, g)) return false;
  let e;
  try {
    e = dim2.spawnEntity(ENT.borrowed, g, { initialRotation: rand(0, 360) });
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
    const e = world19.getEntity(enc.id);
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
    const seen2 = near.some((p) => dist(p.location, e.location) < 20 && clearLine(e.dimension, p.getHeadLocation(), add(e.location, { x: 0, y: 1, z: 0 })));
    if (inState > seconds(10) && !seen2 || inState > seconds(30)) vanish(e, enc);
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
  if (enc.state === "disguised") reveal(e, enc, "hurt", by instanceof Player22 ? by : void 0);
  else if (enc.state === "revealed" && hpFraction2(e) < 0.4) setState(e, enc, "fleeing");
}
function onBorrowedDied(id, killer) {
  encs.delete(id);
  if (killer instanceof Player22) {
    unlock(killer, "borrowed1");
    unlock(killer, "borrowed2");
  }
}
function forgetBorrowedTarget(playerId) {
  for (const enc of [...encs.values()]) {
    if (enc.target === playerId && (enc.state === "disguised" || enc.state === "revealing")) vanish(world19.getEntity(enc.id), enc);
  }
}
function startBorrowed() {
  every("borrowed.update", 10, update4, 3);
}

// ../../scripts_src/creatures/knocker.ts
import { Difficulty as Difficulty3, ItemStack as ItemStack9, Player as Player23, world as world20 } from "@minecraft/server";
var visit;
var SAVE = DP.knocker;
var knockerActive = () => !!visit;
var isKnockerTracked = (id) => visit?.id === id;
var savedCache;
function saved() {
  if (!savedCache) savedCache = readWorld(SAVE, { lastNight: -99, plannedKey: -1, planned: false, planTick: 0 });
  return savedCache;
}
function save6(s) {
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
  save6(next);
  return next;
}
function doorLower(dim2, loc) {
  const below = block(dim2, { x: loc.x, y: loc.y - 1, z: loc.z });
  return below && DOORS.includes(below.typeId) ? { x: loc.x, y: loc.y - 1, z: loc.z } : loc;
}
function outsideDir(dim2, door) {
  let best;
  let bestSky = -1;
  for (const d of [{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }]) {
    const at = add(door, d);
    try {
      const sky = dim2.getSkyLightLevel(add(at, { x: 0.5, y: 1.5, z: 0.5 }));
      if (sky > bestSky) {
        bestSky = sky;
        best = d;
      }
    } catch {
    }
  }
  return bestSky >= 8 ? best : void 0;
}
function doorOpen(dim2, door) {
  const b = block(dim2, door);
  if (!b || !DOORS.includes(b.typeId)) return true;
  return getCustomState(b.permutation, "open_bit") === true;
}
function insidePlayers(v3) {
  try {
    return world20.getDimension(v3.dim).getPlayers({ location: v3.door, maxDistance: 18 });
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
  const dim2 = p.dimension;
  doors.sort((a, b) => dist(a, p.location) - dist(b, p.location));
  for (const d of doors.slice(0, 3)) {
    const door = doorLower(dim2, d);
    const out2 = outsideDir(dim2, door);
    if (!out2) continue;
    for (let k = 0; k < 5; k++) {
      const r = rand(18, 26);
      const side = { x: out2.z, y: 0, z: -out2.x };
      const lateral = rand(-6, 6);
      const target2 = add(add(door, scale(out2, r)), scale(side, lateral));
      const g = groundNear(dim2, target2.x, door.y, target2.z, 8, 3);
      if (!g || lanternNear(dim2, g)) continue;
      if (clearLine(dim2, p.getHeadLocation(), add(g, { x: 0, y: 2, z: 0 }))) continue;
      let e;
      try {
        e = dim2.spawnEntity(ENT.knocker, g);
      } catch {
        continue;
      }
      e.setDynamicProperty(DP.owner, p.id);
      visit = {
        id: e.id,
        target: p.id,
        dim: dim2.id,
        door,
        out: out2,
        started: now(),
        phase: "approach",
        phaseAt: now(),
        step: 0,
        nailDone: false,
        broke: false,
        wardChecked: false
      };
      save6({ ...saved(), lastNight: hollowNight(), planned: false });
      return;
    }
  }
}
function setPhase(e, v3, p) {
  if (v3.phase === p) return;
  v3.phase = p;
  v3.phaseAt = now();
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
  const v3 = visit;
  if (!v3) {
    if (now() < nextTry) return;
    nextTry = now() + 100;
    tryVisit();
    return;
  }
  const e = world20.getEntity(v3.id);
  if (!e?.isValid) {
    visit = void 0;
    return;
  }
  const dim2 = e.dimension;
  const inState = now() - v3.phaseAt;
  const inside = insidePlayers(v3);
  const daybreak = isDay();
  if (v3.phase === "approach" || v3.phase === "leave") trail(e, 1 /* Knocker */, 1.4);
  if (v3.phase === "approach") {
    const d = dist(e.location, add(v3.door, { x: 0.5, y: 0, z: 0.5 }));
    if (!v3.wardChecked && d < 12) {
      v3.wardChecked = true;
      const ward = wardNear(dim2, v3.door);
      if (ward) {
        useWard(ward, "knocker");
        for (const p of inside) {
          unlock(p, "knocker1");
          hint(p, "§7Something stopped outside. The ward flared, and it went away.");
        }
        setPhase(e, v3, "leave");
        return;
      }
    }
    if (d <= 2.4) {
      setPhase(e, v3, "knock");
      for (const p of insidePlayers(v3)) frighten(p, 16);
      standingPrints(e, 1 /* Knocker */);
    } else if (inState > seconds(70) || daybreak) setPhase(e, v3, "leave");
    confront(e, v3);
    return;
  }
  if (v3.phase === "knock") {
    while (v3.step < SCRIPT.length && inState >= SCRIPT[v3.step][0]) {
      const [, snd, vol] = SCRIPT[v3.step];
      worldSound(dim2, snd, add(v3.door, { x: 0.5, y: 1.2, z: 0.5 }), vol);
      if (v3.step === 0) {
        for (const p of inside) {
          unlock(p, "knocker1");
          hint(p, "§8Three knocks at the door.");
        }
      }
      v3.step++;
    }
    if (doorOpen(dim2, v3.door)) {
      answered(e, v3);
      return;
    }
    const cfg = settings();
    if (!v3.broke && cfg.destructive && world20.getDifficulty() === Difficulty3.Hard && inState >= 600 && chance(0.05)) {
      v3.broke = true;
      try {
        e.triggerEvent("hollow:break_in");
      } catch {
      }
      v3.phase = "hunt";
      v3.phaseAt = now();
      for (const p of inside) notice(p, "§cIt's trying to break the door!");
      return;
    }
    if (inState >= KNOCK_END || daybreak) {
      leaveWithNail(e, v3, inside);
      return;
    }
    confront(e, v3);
    return;
  }
  if (v3.phase === "hunt") {
    const h = e.getComponent("minecraft:health");
    const low = h ? h.currentValue / h.effectiveMax < 0.25 : false;
    if (low || inState > seconds(90) || daybreak) setPhase(e, v3, "leave");
    return;
  }
  let nearest3 = 999;
  try {
    for (const p of dim2.getPlayers({ location: e.location, maxDistance: 48 })) nearest3 = Math.min(nearest3, dist(p.location, e.location));
  } catch {
  }
  if (nearest3 > 40 || inState > seconds(30)) end(e);
}
function confront(e, v3) {
  try {
    for (const p of e.dimension.getPlayers({ location: e.location, maxDistance: 5 })) {
      if (!huntable(p)) continue;
      if (ctx(p).roofed) continue;
      setPhase(e, v3, "hunt");
      worldSound(e.dimension, SND.knockerLunge, e.location);
      return;
    }
  } catch {
  }
}
function answered(e, v3) {
  setPhase(e, v3, "hunt");
  worldSound(e.dimension, SND.knockerLunge, add(v3.door, { x: 0.5, y: 1, z: 0.5 }));
  for (const p of insidePlayers(v3)) {
    unlock(p, "knocker1");
    unlock(p, "knocker3");
    accent(p, SND.stingerLow, 2, true);
    frighten(p, 22);
  }
}
function leaveWithNail(e, v3, inside) {
  setPhase(e, v3, "leave");
  const dim2 = e.dimension;
  worldSound(dim2, SND.knockerLeave, add(v3.door, { x: 0.5, y: 1, z: 0.5 }), 0.9);
  if (!v3.nailDone && v3.step > 0) {
    v3.nailDone = true;
    const step3 = add(add(v3.door, { x: 0.5, y: 0.2, z: 0.5 }), scale(v3.out, 1.2));
    later("knocker.nail", 60, () => {
      try {
        dim2.spawnItem(new ItemStack9(ITEM.knockerNail, 1), step3);
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
  const v3 = visit;
  if (!v3 || v3.id !== e.id) return;
  if (v3.phase === "knock" || v3.phase === "approach") {
    if (by instanceof Player23) answered(e, v3);
  }
}
function onKnockerDied(id, killer) {
  if (visit?.id === id) visit = void 0;
  if (killer instanceof Player23) {
    unlock(killer, "knocker1");
    unlock(killer, "knocker3");
  }
}
function forgetKnockerTarget(playerId) {
  if (visit?.target === playerId && (visit.phase === "approach" || visit.phase === "knock")) {
    const e = world20.getEntity(visit.id);
    if (e) setPhase(e, visit, "leave");
  }
}
function forceKnockerTonight() {
  if (visit) return "a visit is already under way";
  const t = tod();
  save6({ ...saved(), plannedKey: nightKey(), planned: true, lastNight: -99, planTick: Math.max(13300, Math.min(21e3, t)) });
  nextTry = 0;
  return t < 13300 || t > 21500 ? "planned: it comes after dusk (time 13300-21500) to a player indoors with a door" : "planned: stay indoors near a door";
}
function startKnocker() {
  every("knocker.update", 10, update5, 9);
}

// ../../scripts_src/creatures/mirebound.ts
import { EntityDamageCause as EntityDamageCause3, Player as Player24, world as world21 } from "@minecraft/server";
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
function shallowWater(dim2, x, yHint, z) {
  const fx = Math.floor(x), fz = Math.floor(z);
  for (let y = Math.floor(yHint) + 2; y >= Math.floor(yHint) - 6; y--) {
    const b = block(dim2, { x: fx, y, z: fz });
    if (!b || !isWater(b.typeId)) continue;
    const above = block(dim2, { x: fx, y: y + 1, z: fz });
    if (!above?.isAir) return void 0;
    let depth = 1;
    let floorY = y - 1;
    while (depth <= 3) {
      const d = block(dim2, { x: fx, y: floorY, z: fz });
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
  const dim2 = p.dimension;
  const f = { x: Math.floor(p.location.x), y: Math.floor(p.location.y), z: Math.floor(p.location.z) };
  for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
    if (isWater(block(dim2, { x: f.x + d[0], y: f.y, z: f.z + d[1] })?.typeId)) return true;
    if (isWater(block(dim2, { x: f.x + d[0], y: f.y - 1, z: f.z + d[1] })?.typeId)) return true;
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
  const dim2 = p.dimension;
  const yaw = yawOf(p.getViewDirection());
  for (let k = 0; k < 10; k++) {
    const d = yawDir(yaw + rand(-55, 55));
    const r = rand(10, 22);
    const at = shallowWater(dim2, p.location.x + d.x * r, p.location.y, p.location.z + d.z * r);
    if (!at || distXZ(at, p.location) < 8 || protectedSpot(dim2, at)) continue;
    let e;
    try {
      e = dim2.spawnEntity(ENT.mirebound, at, { initialRotation: yawOf(norm(sub(p.location, at))) });
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
  const p = world21.getEntity(m.target);
  if (p?.isValid && rt(p).encounter === "mirebound") rt(p).encounter = void 0;
  if (m.victim) {
    const v3 = world21.getEntity(m.victim);
    if (v3?.isValid) popFog(v3, "hollow_mire");
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
  const v3 = m.victim ? world21.getEntity(m.victim) : void 0;
  try {
    e.getComponent("minecraft:rideable")?.ejectRiders();
  } catch {
  }
  if (v3?.isValid) {
    popFog(v3, "hollow_mire");
    unlock(v3, "mirebound2");
    if (why !== "death") notice(v3, why === "sneak" ? "§7You wrench free." : why === "hit" ? "§7It lets go." : "§7It loses its grip.");
  }
  m.victim = void 0;
  worldSound(e.dimension, SND.mireRelease, e.location);
  setState2(e, m, "retreat");
}
function update6() {
  if (ms.size === 0) return;
  const t = now();
  for (const m of [...ms.values()]) {
    const e = world21.getEntity(m.id);
    if (!e?.isValid) {
      release(m);
      continue;
    }
    const dim2 = e.dimension;
    let players = [];
    try {
      players = dim2.getPlayers({ location: e.location, maxDistance: 48 });
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
        particle(dim2, PARTICLE.bubbles, add(e.location, { x: 0, y: 0.9, z: 0 }));
        worldSound(dim2, chance(0.6) ? SND.mireBubble : SND.mireGurgle, e.location, 0.7);
        for (const p of close) {
          if (dist(p.location, e.location) < 18 && clearLine(dim2, p.getHeadLocation(), add(e.location, { x: 0, y: 1, z: 0 }))) unlock(p, "mirebound1");
        }
      }
      const prey = players.find((p) => huntable(p) && distXZ(p.location, e.location) < 3.5 && Math.abs(p.location.y - e.location.y) < 2.5 && nearWater(p) && !protectedSpot(dim2, p.location));
      if (prey) {
        setState2(e, m, "erupt");
        m.victim = prey.id;
        worldSound(dim2, SND.mireErupt, e.location, 1);
        particle(dim2, PARTICLE.bubbles, add(e.location, { x: 0, y: 1, z: 0 }));
        accent(prey, SND.stingerLow, 2);
        frighten(prey, 20);
      }
      continue;
    }
    if (m.state === "erupt") {
      if (inState < 12) continue;
      const v3 = m.victim ? world21.getEntity(m.victim) : void 0;
      if (!v3?.isValid || dist(v3.location, e.location) > 3.2 || !huntable(v3) || protectedSpot(dim2, v3.location)) {
        m.victim = void 0;
        if (v3?.isValid) notice(v3, "§7It snaps at empty water. Get to dry land.");
        setState2(e, m, "retreat");
        continue;
      }
      setState2(e, m, "grab");
      for (let k = 0; k <= 2; k++) {
        const f = k / 2;
        const at = { x: v3.location.x + (e.location.x - v3.location.x) * f, y: v3.location.y, z: v3.location.z + (e.location.z - v3.location.z) * f };
        pressTrack(dim2, at, 2 /* Drag */, { x: e.location.x - v3.location.x, y: 0, z: e.location.z - v3.location.z });
      }
      m.grabs++;
      m.dmgAt = t;
      m.seatTries = 0;
      continue;
    }
    if (m.state === "grab") {
      const v3 = m.victim ? world21.getEntity(m.victim) : void 0;
      if (!v3?.isValid || v3.getComponent("minecraft:health")?.currentValue === 0) {
        letGo(e, m, "death");
        continue;
      }
      if (m.seatTries < 3 && !riding(v3, e)) {
        m.seatTries++;
        let held = false;
        try {
          held = !!e.getComponent("minecraft:rideable")?.addRider(v3);
        } catch {
          held = false;
        }
        if (m.seatTries >= 3 && !held && !riding(v3, e)) {
          v3.applyDamage(3, { cause: EntityDamageCause3.entityAttack, damagingEntity: e });
          v3.addEffect("slowness", 50, { amplifier: 2, showParticles: false });
          letGo(e, m, "timeout");
          continue;
        }
        if (held) {
          worldSound(e.dimension, SND.mireGrab, e.location);
          pushFog(v3, FOG.mire, "hollow_mire");
        }
        continue;
      }
      if (!riding(v3, e)) {
        letGo(e, m, "sneak");
        continue;
      }
      notice(v3, "§fPress §lSNEAK§r§f to break free!");
      if (t - m.dmgAt >= 30) {
        m.dmgAt = t;
        v3.applyDamage(2, { cause: EntityDamageCause3.entityAttack, damagingEntity: e });
      }
      if (inState > 100) letGo(e, m, "timeout");
      continue;
    }
    if (inState > 120) {
      const floor = block(dim2, { x: e.location.x, y: e.location.y + 0.2, z: e.location.z });
      if (m.grabs < 2 && floor && isWater(floor.typeId)) setState2(e, m, "lurk");
      else vanish2(e, m);
    }
  }
}
function onMireboundHurt(e, by) {
  const m = ms.get(e.id);
  if (!m) return;
  if (m.state === "grab" && by instanceof Player24) letGo(e, m, "hit");
  else if (m.state === "lurk") setState2(e, m, "retreat");
}
function onMireboundDied(id, killer) {
  const m = ms.get(id);
  if (m) release(m);
  if (killer instanceof Player24) {
    unlock(killer, "mirebound1");
    unlock(killer, "mirebound2");
  }
}
function forgetMireboundTarget(playerId) {
  for (const m of [...ms.values()]) {
    const e = world21.getEntity(m.id);
    if (m.victim === playerId && e?.isValid) letGo(e, m, "death");
    if (m.target === playerId && m.state === "lurk") vanish2(e, m);
  }
}
function startMirebound() {
  every("mirebound.update", 2, update6, 11);
}

// ../../scripts_src/creatures/watcher.ts
import { EntityDamageCause as EntityDamageCause4, ItemStack as ItemStack10, Player as Player25, world as world22 } from "@minecraft/server";

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
  const dim2 = p.dimension;
  return clearLine(dim2, head, target2) || clearLine(dim2, head, add(e.location, { x: 0, y: 1.4, z: 0 }));
}
function observers(e) {
  const out2 = [];
  for (const p of e.dimension.getPlayers({ location: e.location, maxDistance: 72 })) {
    if (looking(p, e)) out2.push(p);
  }
  return out2;
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
  const dim2 = p.dimension;
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
    const g = groundNear(dim2, x, p.location.y, z, 12, 3);
    if (!g || protectedSpot(dim2, g)) continue;
    if (biomeGroup(dim2, g) !== "forest") continue;
    if (hasBlockNear(dim2, g, LIGHT_BLOCKS, 5, 2, 5)) continue;
    if (!clearLine(dim2, head, add(g, { x: 0, y: HEAD, z: 0 }))) continue;
    let e;
    try {
      e = dim2.spawnEntity(ENT.watcher, g, { initialRotation: yawOf(norm(sub(p.location, g))) });
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
  const p = world22.getEntity(enc.target);
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
  const dim2 = e.dimension;
  worldSound(dim2, SND.watcherSeen, headOf(e), 0.9);
  later("watcher.retreat", 12, () => {
    if (e.isValid) worldSound(dim2, SND.watcherRetreat, e.location, 0.8);
  });
  const target2 = world22.getEntity(enc.target);
  if (target2) popFog(target2, "hollow_watch");
  if (reason === "stared" && by) {
    for (const p of dim2.getPlayers({ location: e.location, maxDistance: 72 })) unlock(p, "watcher2");
    if (!enc.resin && dailyCount(by, "resin") < (settings().intensity === 2 ? 2 : 1)) {
      enc.resin = true;
      dailyAdd(by, "resin");
      const at = add(e.location, { x: 0, y: 0.3, z: 0 });
      try {
        dim2.spawnItem(new ItemStack10(ITEM.paleResin, 1), at);
        particle(dim2, PARTICLE.resinGlint, at);
        later("watcher.glint", 40, () => particle(dim2, PARTICLE.resinGlint, at));
        later("watcher.glint2", 100, () => particle(dim2, PARTICLE.resinGlint, at));
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
    const e = world22.getEntity(enc.id);
    if (!e || !e.isValid) {
      release2(enc);
      continue;
    }
    const p = world22.getEntity(enc.target);
    if (!p || !p.isValid || p.dimension.id !== e.dimension.id) {
      vanish3(e, enc);
      continue;
    }
    const age = t - enc.born;
    const inState = t - enc.stateAt;
    const d = dist(p.location, e.location);
    if (enc.state === "withdraw") {
      const seen2 = observers(e).length > 0;
      if (inState > 60 && (!seen2 || d > 40) || inState > 240) vanish3(e, enc);
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
  if (cause === EntityDamageCause4.fall) return;
  withdraw(hurt2, enc, "hurt", by instanceof Player25 ? by : void 0);
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
  if (killer instanceof Player25) {
    unlock(killer, "watcher1");
    unlock(killer, "watcher2");
  }
}
function forgetWatcherTarget(playerId) {
  for (const enc of [...encounters.values()]) {
    if (enc.target !== playerId) continue;
    vanish3(world22.getEntity(enc.id), enc);
  }
}
function startWatcher() {
  every("watcher.update", 4, update7, 1);
}

// ../../scripts_src/systems/music.ts
var LOOPING = ["boss", "shrine"];
var state5 = /* @__PURE__ */ new Map();
function st6(p) {
  let s = state5.get(p.id);
  if (!s) {
    s = { startedAt: -1, lastAny: -99999, lastCave: -99999, nightPlayed: -1, nightHadEncounter: -1, dawnPlayed: -1, nextNight: 0 };
    state5.set(p.id, s);
  }
  return s;
}
function forgetMusic(playerId) {
  state5.delete(playerId);
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
function tick3(p) {
  const fresh = !state5.has(p.id);
  const s = st6(p);
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
  everyPlayer("music", 200, tick3);
}

// ../../scripts_src/systems/events.ts
import { BlockPermutation as BlockPermutation6, ItemStack as ItemStack11 } from "@minecraft/server";
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
  const out2 = [];
  for (const type of ANIMALS) {
    try {
      out2.push(...p.dimension.getEntities({ type, location: p.location, maxDistance: 24 }));
    } catch {
    }
  }
  return out2;
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
  const dim2 = p.dimension;
  const head = p.getHeadLocation();
  const view = yawOf(p.getViewDirection());
  for (let k = 0; k < 8; k++) {
    const dir = yawDir(view + 180 + rand(-60, 60));
    const r = rand(26, 38);
    const g = groundNear(dim2, p.location.x + dir.x * r, p.location.y, p.location.z + dir.z * r, 8, 3);
    if (!g) continue;
    const stump = block(dim2, g);
    const top = block(dim2, add(g, { x: 0, y: 1, z: 0 }));
    if (!stump?.isAir || !top?.isAir) continue;
    if (clearLine(dim2, head, add(g, { x: 0, y: 1.5, z: 0 }))) continue;
    try {
      stump.setPermutation(BlockPermutation6.resolve("minecraft:spruce_log"));
      top.setPermutation(BlockPermutation6.resolve("minecraft:lantern"));
    } catch {
      continue;
    }
    setLantern({ dim: dim2.id, at: g });
    return true;
  }
  return false;
}
function watchLantern(p) {
  const lantern = getLantern();
  if (!lantern || p.dimension.id !== lantern.dim) return;
  if (dist(p.location, lantern.at) > 6) return;
  const dim2 = p.dimension;
  const top = block(dim2, add(lantern.at, { x: 0, y: 1, z: 0 }));
  if (!top) return;
  if (top.typeId !== "minecraft:lantern") {
    setLantern(void 0);
    return;
  }
  try {
    dim2.spawnItem(new ItemStack11(ITEM.page, 1), add(lantern.at, { x: 0.8, y: 0.2, z: 0.4 }));
  } catch {
    return;
  }
  setLantern(void 0);
  try {
    top.setPermutation(BlockPermutation6.resolve("minecraft:air"));
  } catch {
  }
  worldSound(dim2, SND.windGust, lantern.at, 0.8);
  for (const q of dim2.getPlayers({ location: lantern.at, maxDistance: 16 })) unlock(q, "event_lantern");
}
function onTheRoof(p) {
  const dim2 = p.dimension;
  let roofY;
  try {
    const hit = dim2.getBlockFromRay(p.getHeadLocation(), { x: 0, y: 1, z: 0 }, { maxDistance: 6, includePassableBlocks: false });
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
      worldSound(dim2, "hollow.knocker.step", at, 1, 0.85);
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
function tick4(p) {
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
  everyPlayer("events", 400, tick4);
}

// ../../scripts_src/systems/ambience.ts
function far(p, lo = 18, hi = 40) {
  const d = yawDir(rand(0, 360));
  const r = rand(lo, hi);
  return add(p.location, { x: d.x * r, y: rand(0, 4), z: d.z * r });
}
function tick5(p) {
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
  everyPlayer("ambience", 120, tick5);
  everyPlayer("bedtime", 40, bedtime);
}

// ../../scripts_src/systems/cleanup.ts
import { world as world23 } from "@minecraft/server";
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
      const dim2 = world23.getDimension(id);
      for (const e of dim2.getEntities({ families: [FAMILY.any] })) cleanEntity(e);
    } catch {
    }
  }
}
function startCleanup() {
  world23.afterEvents.entityLoad.subscribe((ev) => {
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

// ../../scripts_src/island/leaves.ts
import { ItemStack as ItemStack12, system as system13, world as world24 } from "@minecraft/server";
var LOG2 = (id) => id.endsWith("_log") || id.endsWith("_wood");
var LEAF2 = (id) => id.endsWith("_leaves");
var SAPLING = {
  "minecraft:oak_leaves": "minecraft:oak_sapling",
  "minecraft:birch_leaves": "minecraft:birch_sapling",
  "minecraft:spruce_leaves": "minecraft:spruce_sapling",
  "minecraft:jungle_leaves": "minecraft:jungle_sapling",
  "minecraft:dark_oak_leaves": "minecraft:dark_oak_sapling",
  "minecraft:mangrove_leaves": "minecraft:mangrove_propagule"
};
function decayAround(at) {
  const dim2 = world24.getDimension("overworld");
  const logs = [];
  const leaves = [];
  for (let dx = -9; dx <= 9; dx++) for (let dy = -6; dy <= 10; dy++) for (let dz = -9; dz <= 9; dz++) {
    const p = { x: at.x + dx, y: at.y + dy, z: at.z + dz };
    let id;
    try {
      id = dim2.getBlock(p)?.typeId;
    } catch {
      return 0;
    }
    if (!id) continue;
    if (LOG2(id)) logs.push(p);
    else if (LEAF2(id) && Math.abs(dx) <= 5 && dy >= -3 && dy <= 7 && Math.abs(dz) <= 5) leaves.push(p);
  }
  const supported = (p) => logs.some((l) => {
    const ax = Math.abs(l.x - p.x), ay = Math.abs(l.y - p.y), az = Math.abs(l.z - p.z);
    return ax <= 4 && ay <= 4 && az <= 4 && ax + ay + az <= 6;
  });
  const doomed = leaves.filter((p) => !supported(p)).slice(0, 260);
  doomed.sort((a, b) => Math.hypot(a.x - at.x, a.z - at.z) - Math.hypot(b.x - at.x, b.z - at.z));
  let i = 0;
  const run = system13.runInterval(() => safe("leaves.fall", () => {
    for (let k = 0; k < 6; k++) {
      const p = doomed[i++];
      if (!p) {
        system13.clearRun(run);
        return;
      }
      const b = dim2.getBlock(p);
      if (!b || !LEAF2(b.typeId)) continue;
      const id = b.typeId;
      b.setType("minecraft:air");
      const r = Math.random();
      const drop2 = r < 0.05 ? SAPLING[id] : r < 0.08 ? "minecraft:stick" : r < 0.09 && id === "minecraft:oak_leaves" ? "minecraft:apple" : void 0;
      if (drop2) dim2.spawnItem(new ItemStack12(drop2, 1), { x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 });
    }
  }), 2);
  return doomed.length;
}
function startLeaves() {
  world24.afterEvents.playerBreakBlock.subscribe((ev) => safe("leaves", () => {
    if (!isIsland() || ev.dimension.id !== "minecraft:overworld") return;
    const id = ev.brokenBlockPermutation.type.id;
    if (!LOG2(id)) return;
    const at = ev.block.location;
    system13.runTimeout(() => safe("leaves.decay", () => void decayAround(at)), 30);
  }));
}

// ../../scripts_src/island/cult.ts
import { BlockPermutation as BlockPermutation7, ItemStack as ItemStack13, world as world27 } from "@minecraft/server";
import { ActionFormData as ActionFormData5 } from "@minecraft/server-ui";

// ../../scripts_src/island/scenes.ts
import { EasingType as EasingType2, Entity as Entity17, GameMode as GameMode10, system as system15, world as world26 } from "@minecraft/server";

// ../../scripts_src/island/cinematic.ts
import {
  BlockVolume as BlockVolume3,
  CameraShakeType,
  EasingType,
  Entity as Entity16,
  GameMode as GameMode9,
  HudVisibility,
  InputPermissionCategory,
  LocationWaypoint as LocationWaypoint2,
  MolangVariableMap as MolangVariableMap2,
  Player as Player27,
  WaypointTexture as WaypointTexture2,
  system as system14,
  world as world25
} from "@minecraft/server";
var D = { x: SITES.DIORAMA.x, z: SITES.DIORAMA.z };
var GROUND2 = 66;
var BURST = { x: D.x, y: GROUND2 + 65, z: D.z };
var C = SITES.CRASH;
var L_SEA = 62;
var v = (x, y, z) => ({ x, y, z });
var pt = (k, fallback) => (POINTS[k] ?? [])[0] ?? fallback;
var START = () => pt("pro_start", v(D.x - 6, GROUND2 + 1, D.z - 40));
var BUNKER = () => pt("pro_bunker", v(D.x, GROUND2 - 1, D.z + 42));
var SLIT = () => pt("pro_slit", v(D.x, GROUND2 + 1, D.z + 39));
var TASKS = [
  ["pro_hut1", "the dosimeter in the east hut"],
  ["pro_hut2", "the dosimeter in the south-west hut"],
  ["pro_hut3", "the dosimeter in the north-west hut"],
  ["pro_tower", "the firing timer at the foot of the tower"]
];
var phase = "idle";
var tick6 = 0;
var proTick = 0;
var crashY = SPAWN_POINT.y - 1;
var viewers = [];
var done2 = /* @__PURE__ */ new Set();
var sneakTicks = /* @__PURE__ */ new Map();
var skipped = /* @__PURE__ */ new Set();
var props = /* @__PURE__ */ new Map();
var marks = /* @__PURE__ */ new Map();
var onFinish;
var caption;
var loop;
function cinematicRunning() {
  return phase !== "idle";
}
function cinematicDone() {
  return world25.getDynamicProperty(DP.cine) === 1;
}
function remember(p) {
  if (needsRestore(p)) return;
  const r = { gm: p.getGameMode(), x: p.location.x, y: p.location.y, z: p.location.z };
  writeEntity(p, DP.cineRestore, r);
}
function enterScene(p, anchor2) {
  enter(p, anchor2);
}
function enter(p, anchor2) {
  remember(p);
  try {
    p.setGameMode(GameMode9.Spectator);
    p.teleport(anchor2);
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
    p.onScreenDisplay.hideAllExcept([]);
  } catch {
  }
}
function leave(p, at) {
  const r = readEntity(p, DP.cineRestore, void 0);
  try {
    p.camera.clear();
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);
    p.onScreenDisplay.setHudVisibility(HudVisibility.Reset);
    p.onScreenDisplay.setActionBar(" ");
    for (const e of ["resistance", "saturation", "weakness"]) p.removeEffect(e);
  } catch {
  }
  const m = marks.get(p.id);
  if (m) {
    try {
      p.locatorBar.removeWaypoint(m);
    } catch {
    }
    marks.delete(p.id);
  }
  if (r && typeof r.gm === "string") {
    try {
      p.setGameMode(r.gm);
      p.teleport(at ?? { x: r.x, y: r.y, z: r.z });
    } catch {
    }
  }
  p.setDynamicProperty(DP.cineRestore, void 0);
}
function needsRestore(p) {
  return typeof p.getDynamicProperty(DP.cineRestore) === "string";
}
function watching() {
  viewers = viewers.filter((p) => p.isValid && !skipped.has(p.id) && needsRestore(p));
  return viewers;
}
function each(fn) {
  for (const p of watching()) {
    try {
      fn(p);
    } catch {
    }
  }
}
function cam(location, facing, ease = 0, type = EasingType.InOutSine) {
  if (!facing) return;
  each((p) => {
    const easeOptions = ease > 0 ? { easeTime: ease, easeType: type } : void 0;
    if (facing instanceof Entity16) {
      if (facing.isValid) p.camera.setCamera("minecraft:free", { location, facingEntity: facing, easeOptions });
    } else {
      p.camera.setCamera("minecraft:free", { location, facingLocation: facing, easeOptions });
    }
  });
}
function fade(r, g, b, fadeIn, hold, fadeOut) {
  each((p) => p.camera.fade({ fadeColor: { red: r, green: g, blue: b }, fadeTime: { fadeInTime: fadeIn, holdTime: hold, fadeOutTime: fadeOut } }));
}
function title(text, sub2, stay = 100) {
  each((p) => p.onScreenDisplay.setTitle(text, { subtitle: sub2, fadeInDuration: 20, stayDuration: stay, fadeOutDuration: 30 }));
}
function say2(text, ticks = 110) {
  caption = { text, until: tick6 + ticks };
  each((p) => p.onScreenDisplay.setActionBar(text));
}
function sound(id, volume = 1, pitch = 1) {
  each((p) => p.playSound(id, { volume, pitch }));
}
function shake(intensity, seconds2) {
  each((p) => {
    try {
      p.camera.addShake({ intensity, duration: seconds2, type: CameraShakeType.Positional });
    } catch {
      p.runCommand(`camerashake add @s ${intensity} ${seconds2} positional`);
    }
  });
}
function anchor(at) {
  each((p) => p.teleport(at));
}
function spawn(key, type, at) {
  try {
    const e = world25.getDimension("overworld").spawnEntity(type, at);
    props.set(key, e);
    return e;
  } catch {
    return void 0;
  }
}
function move(key, at, yaw, pitch = 0) {
  const e = props.get(key);
  if (!e?.isValid) return;
  try {
    e.teleport(at, { rotation: { x: pitch, y: yaw } });
  } catch {
  }
}
function drop(key) {
  const e = props.get(key);
  props.delete(key);
  try {
    if (e?.isValid) e.remove();
  } catch {
  }
}
function fill3(from, to, block2, only) {
  try {
    world25.getDimension("overworld").fillBlocks(
      new BlockVolume3(from, to),
      block2,
      only ? { blockFilter: { includeTypes: only }, ignoreChunkBoundErrors: true } : { ignoreChunkBoundErrors: true }
    );
  } catch {
  }
}
var LEAVES = ["minecraft:oak_leaves", "minecraft:jungle_leaves", "minecraft:spruce_leaves", "minecraft:birch_leaves", "minecraft:dark_oak_leaves"];
var LOGS2 = ["minecraft:oak_log", "minecraft:jungle_log", "minecraft:spruce_log", "minecraft:birch_log", "minecraft:dark_oak_log"];
var PLANTS = ["minecraft:short_grass", "minecraft:tall_grass", "minecraft:fern", "minecraft:large_fern", "minecraft:poppy", "minecraft:dandelion"];
function scar() {
  const R = 24;
  let col = 0;
  const cols = [];
  for (let dx = -R - 6; dx <= R + 6; dx++) {
    for (let dz = -R - 6; dz <= R + 6; dz++) {
      const d = Math.hypot(dx, dz);
      if (d <= R + 6) cols.push([dx, dz, d]);
    }
  }
  fill3(v(D.x - 3, GROUND2 + 1, D.z - 3), v(D.x + 3, GROUND2 + 33, D.z + 3), "minecraft:air");
  const job = system14.runInterval(() => safe("cine.crater", () => {
    for (let k = 0; k < 300 && col < cols.length; k++, col++) {
      const [dx, dz, d] = cols[col];
      const x = D.x + dx;
      const z = D.z + dz;
      if (d < R) {
        const depth = Math.round(11 * (1 - (d / R) ** 2)) + 1;
        const floor = GROUND2 - depth;
        fill3(v(x, floor + 1, z), v(x, GROUND2 + 2, z), "minecraft:air");
        const glass = d < R * 0.55 ? Math.random() < 0.5 ? "minecraft:green_stained_glass" : "minecraft:lime_stained_glass" : "minecraft:blackstone";
        fill3(v(x, floor - 1, z), v(x, floor, z), glass);
      } else {
        const lip = Math.round(2.5 * (1 - (d - R) / 6));
        if (lip > 0) fill3(v(x, GROUND2 + 1, z), v(x, GROUND2 + lip, z), Math.random() < 0.6 ? "minecraft:coarse_dirt" : "minecraft:gravel");
      }
    }
    if (col >= cols.length) {
      system14.clearRun(job);
      scorch();
    }
  }), 1);
}
function scorch() {
  const R = 72;
  for (let x0 = -R; x0 < R; x0 += 24) {
    for (let z0 = -R; z0 < R; z0 += 24) {
      const a = v(D.x + x0, GROUND2 - 6, D.z + z0);
      const b = v(D.x + x0 + 23, GROUND2 + 6, D.z + z0 + 23);
      fill3(a, b, "minecraft:coarse_dirt", ["minecraft:grass_block"]);
      fill3(v(a.x, GROUND2 - 6, a.z), v(b.x, GROUND2 + 30, b.z), "minecraft:air", [...LEAVES, ...PLANTS]);
      fill3(v(a.x, GROUND2 - 6, a.z), v(b.x, GROUND2 + 30, b.z), "minecraft:basalt", LOGS2);
    }
  }
}
function setFires(n0) {
  const dim2 = world25.getDimension("overworld");
  let n = 0;
  for (let i = 0; i < 400 && n < n0; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 26 + Math.random() * 44;
    const x = Math.floor(D.x + Math.cos(a) * r);
    const z = Math.floor(D.z + Math.sin(a) * r);
    try {
      const top = dim2.getTopmostBlock({ x, z });
      if (!top || top.location.y < L_SEA || top.isLiquid) continue;
      const above = dim2.getBlock({ x, y: top.location.y + 1, z });
      if (above?.isAir) {
        above.setType("minecraft:fire");
        n++;
      }
    } catch {
    }
  }
}
function billow(age) {
  const dim2 = world25.getDimension("overworld");
  const px = 2.5;
  const capY = BURST.y + (-22 + Math.min(22, Math.max(0, age - 1.5) * 1.55)) * px + 22 * px;
  const capS = age < 1.5 ? 0 : Math.min(1, 0.3 + (age - 1.5) * 0.055);
  const stemTop = GROUND2 - 1 + Math.min(1, Math.max(0, (age - 2) / 14)) * (capY - GROUND2);
  const puffs = [];
  const gray = Math.max(0, Math.min(1, (age - 6) / 20));
  for (let i = 0; i < 6 && capS > 0; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = (8 + Math.random() * 18) * capS * px;
    const hot = 1 - gray;
    puffs.push([
      v(D.x + Math.cos(a) * r, capY + (Math.random() - 0.4) * 9 * capS * px * 0.4, D.z + Math.sin(a) * r),
      14 + Math.random() * 12,
      0.85 - 0.25 * hot * Math.random(),
      0.62 + 0.2 * gray,
      0.45 + 0.3 * gray,
      8,
      0.25
    ]);
  }
  for (let i = 0; i < 3 && age > 2; i++) {
    const y = GROUND2 + Math.random() * Math.max(1, stemTop - GROUND2);
    puffs.push([
      v(D.x + (Math.random() - 0.5) * 12, y, D.z + (Math.random() - 0.5) * 12),
      10 + Math.random() * 6,
      0.72,
      0.68,
      0.64,
      7,
      0.6
    ]);
  }
  if (age > 2 && age < 22) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.min(60, 10 + (age - 2) * 4.5);
    puffs.push([v(D.x + Math.cos(a) * r, GROUND2 + 2, D.z + Math.sin(a) * r), 12, 0.8, 0.78, 0.74, 6, 0.1]);
  }
  for (const [at, size, r, g, b, life, rise2] of puffs) {
    try {
      const m = new MolangVariableMap2();
      m.setFloat("variable.size", size);
      m.setFloat("variable.r", r);
      m.setFloat("variable.g", g);
      m.setFloat("variable.b", b);
      m.setFloat("variable.life", life);
      m.setFloat("variable.rise", rise2);
      dim2.spawnParticle(PARTICLE.nukePuff, at, m);
    } catch {
    }
  }
  if (age < 8) {
    try {
      const m = new MolangVariableMap2();
      m.setFloat("variable.size", 40 - age * 3);
      m.setFloat("variable.life", 1.5);
      m.setFloat("variable.rise", 2);
      dim2.spawnParticle(PARTICLE.nukeGlow, v(BURST.x, BURST.y + Math.max(0, age - 1) * 5.5, BURST.z), m);
    } catch {
    }
  }
}
function mark(p, at) {
  const old = marks.get(p.id);
  try {
    if (old) p.locatorBar.removeWaypoint(old);
  } catch {
  }
  marks.delete(p.id);
  if (!at) return;
  try {
    const wp = new LocationWaypoint2(
      { dimension: p.dimension, x: at.x + 0.5, y: at.y, z: at.z + 0.5 },
      { textureBoundsList: [{ lowerBound: 0, texture: WaypointTexture2.Circle }] },
      { red: 1, green: 0.72, blue: 0.15 }
    );
    p.locatorBar.addWaypoint(wp);
    marks.set(p.id, wp);
  } catch {
  }
}
function nextTask(p) {
  let best;
  let d = Infinity;
  for (const [k, what] of TASKS) {
    const c = CONSOLES[k];
    if (!c || done2.has(k)) continue;
    const dd = Math.hypot(c.x - p.location.x, c.z - p.location.z);
    if (dd < d) {
      d = dd;
      best = [k, what, c];
    }
  }
  return best;
}
function tasksLeft() {
  return TASKS.filter(([k]) => CONSOLES[k] && !done2.has(k)).length;
}
function enterPrologue(p) {
  remember(p);
  try {
    p.camera.clear();
    p.setGameMode(GameMode9.Adventure);
    p.teleport(START(), { facingLocation: v(D.x, GROUND2 + 20, D.z) });
    p.addEffect("resistance", 20 * 60 * 20, { amplifier: 255, showParticles: false });
    p.addEffect("saturation", 20 * 60 * 20, { amplifier: 1, showParticles: false });
    p.onScreenDisplay.setHudVisibility(HudVisibility.Reset);
    p.onScreenDisplay.setTitle("§l7 MAY 1957", { subtitle: "§7Varrow Island · Operation SUNLAMP · H minus 40 minutes", fadeInDuration: 20, stayDuration: 120, fadeOutDuration: 30 });
    p.playSound(SND.cineWind, { volume: 0.9 });
    p.sendMessage(`§7You are §fDr. ${p.name}§7, radiological safety, Joint Task Force 9.
§7Check the dosimeters, set the firing timer, then get to the observation bunker on the south shore.`);
  } catch {
  }
}
var RADIO = [
  [200, "§7[CONTROL] §fAll stations, Control. H minus forty minutes. Dosimeter checks, please."],
  [900, "§7[HALE] §fDoc, it's Walter Hale on the tower crew. Timer panel's at the foot of the tower when you're ready."],
  [1700, "§7[CONTROL] §fH minus twenty. Clear the inner zone. Observers to shelter."],
  [2600, "§7[CONTROL] §fH minus ten. All personnel into the bunkers. This is not a drill."]
];
function prologueFrame() {
  proTick++;
  const people = watching();
  for (const [t, line] of RADIO) {
    if (proTick === t) {
      for (const p of people) {
        p.sendMessage(line);
        p.playSound(SND.cineRadio, { volume: 0.7 });
      }
    }
  }
  const allDone = tasksLeft() === 0;
  const bunker = BUNKER();
  const inBunker = (p) => Math.hypot(p.location.x - (bunker.x + 0.5), p.location.z - (bunker.z + 0.5)) < 5.5 && Math.abs(p.location.y - bunker.y) < 4;
  if (proTick % 20 === 0) {
    for (const p of people) {
      if (Math.hypot(p.location.x - D.x, p.location.z - D.z) > 88 || p.location.y < L_SEA - 4) {
        p.teleport(START(), { facingLocation: v(D.x, GROUND2 + 20, D.z) });
        p.sendMessage("§7[CONTROL] §fYou're outside the test area, Doctor. Back to your post.");
      }
      const task = allDone ? void 0 : nextTask(p);
      const target2 = task ? task[2] : bunker;
      mark(p, target2);
      const dist3 = Math.round(Math.hypot(target2.x - p.location.x, target2.z - p.location.z));
      const text = task ? `§6▶ Check ${task[1]} §7(${dist3} m) §8· ${TASKS.length - tasksLeft()}/${TASKS.length}` : inBunker(p) ? "§6▶ Wait in the bunker. §7Face the slit." : `§6▶ Get to the observation bunker §7(${dist3} m, south shore)`;
      p.onScreenDisplay.setActionBar(`${text}
§8Hold Sneak to skip the opening`);
    }
  }
  if (proTick === 20 * 60 * 5 && !allDone) {
    for (const p of people) p.sendMessage("§7[CONTROL] §fWe're out of time, Doctor. Bunker. Now.");
    for (const [k] of TASKS) done2.add(k);
  }
  const ready2 = people.length > 0 && people.every(inBunker);
  if (allDone && ready2 || proTick > 20 * 60 * 6) startShot();
}
function onButton(p, at) {
  if (phase !== "prologue") return;
  for (const [k, what] of TASKS) {
    const c = CONSOLES[k];
    if (!c || c.x !== at.x || c.y !== at.y || c.z !== at.z || done2.has(k)) continue;
    done2.add(k);
    const left = tasksLeft();
    for (const q of watching()) {
      q.playSound("random.click", { volume: 1, pitch: 0.8 });
      q.sendMessage(k === "pro_tower" ? `§7[HALE] §fTimer's armed. Thanks, Doc. See you on the other side of it. §8(${TASKS.length - left}/${TASKS.length})` : `§7${p.name} checks ${what}: §fbackground normal. §8(${TASKS.length - left}/${TASKS.length})`);
      if (left === 0) {
        q.sendMessage("§7[CONTROL] §fAll checks in. Everyone to the observation bunker on the south shore.");
        q.playSound(SND.cineAlarm, { volume: 0.7 });
      }
    }
  }
}
var FLASH = 340;
var bomberPath = (t) => v(D.x - 180 + (t - 100) * 0.92, 172, D.z - 18);
var RELEASE = 220;
var bombPath = (t) => {
  const u = Math.min(1, (t - RELEASE) / (FLASH - RELEASE));
  const start2 = bomberPath(RELEASE);
  return v(start2.x + (BURST.x - start2.x) * (1 - (1 - u) ** 2), start2.y - (start2.y - BURST.y) * u * u, start2.z + (BURST.z - start2.z) * u);
};
var H0 = 1265;
var HELI_FROM = () => v(C.x + 26, crashY + 30, C.z + 175);
var HELI_TO = () => v(C.x + 6, crashY + 24, C.z + 38);
var heliPath = (t) => {
  const u = Math.min(1, (t - H0) / 335);
  const a = HELI_FROM();
  const b = HELI_TO();
  return v(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
};
var EYE = () => {
  const s = SLIT();
  return v(s.x + 0.5, s.y + 0.6, s.z + 1.6);
};
var STEPS = [
  [1, () => {
    fade(0, 0, 0, 0.3, 0.6, 1.2);
    each((p) => {
      p.onScreenDisplay.hideAllExcept([]);
      p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
      p.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
    });
  }],
  [10, () => {
    cam(EYE(), v(D.x, GROUND2 + 26, D.z));
    say2("§7[CONTROL] §fAll stations, H minus two minutes. Goggles down. Face away from the island.");
    sound(SND.cineRadio, 0.8);
  }],
  [70, () => say2("§7[HALE] §fGoggles on, Doc. Here she comes.")],
  [100, () => {
    spawn("bomber", ENT.bomber, bomberPath(100));
    sound(SND.cineBomber, 1);
    say2("§7[SUNLAMP ONE] §fControl, Sunlamp One. Final run. Bomb-bay doors coming open.");
  }],
  [112, () => cam(EYE(), props.get("bomber"))],
  [170, () => props.get("bomber")?.setProperty("hollow:open", true)],
  [RELEASE, () => {
    spawn("bomb", ENT.bomb, bombPath(RELEASE));
    sound(SND.cineWhistle, 0.9);
    say2("§7[SUNLAMP ONE] §fBomb away. Bomb away.");
  }],
  [228, () => cam(EYE(), props.get("bomb"))],
  [250, () => {
    sound(SND.cineCountdown, 1);
    say2("§7[CONTROL] §fYield telemetry coming in...", 60);
  }],
  [300, () => {
    sound(SND.cineRadio, 1, 1.1);
    say2("§c[HALE] §fThose numbers are wrong. That's three times the estimate. §lGet down!", 60);
  }],
  [FLASH, () => {
    drop("bomb");
    fade(1, 1, 1, 0.02, 5.2, 0.01);
    sound(SND.cineFlash, 1);
    shake(0.9, 3.5);
    spawn("cloud", ENT.mushroomCloud, BURST);
    say2(" ", 1);
  }],
  [346, scar],
  [352, () => sound(SND.ringing, 1)],
  [380, () => setFires(180)],
  [420, () => {
    fade(0, 0, 0, 1.4, 6.5, 1.6);
    each((p) => p.onScreenDisplay.setTitle(`§fDr. ${p.name}`, { subtitle: "§7Radiological Safety Officer · died 7 May 1957", fadeInDuration: 30, stayDuration: 110, fadeOutDuration: 30 }));
  }],
  [440, () => drop("bomber")],
  [540, () => title("§7Operation SUNLAMP", "§fPredicted yield: 3 megatons. Actual: 11.", 90)],
  [600, () => {
    anchor(v(D.x + 50, 110, D.z - 30));
    cam(v(D.x + 120, 82, D.z - 92), v(D.x, 138, D.z));
  }],
  [602, () => cam(v(D.x + 140, 88, D.z - 60), v(D.x, 142, D.z), 8)],
  [620, () => {
    sound(SND.cineBoom, 1);
    shake(0.45, 4);
  }],
  [780, () => cam(v(D.x - 150, 70, D.z + 70), v(D.x, 150, D.z))],
  [782, () => cam(v(D.x - 120, 96, D.z + 118), v(D.x, 150, D.z), 7)],
  [800, () => title("", "§7as the fleet saw it, nine miles out", 80)],
  [930, () => {
    cam(v(D.x + 46, 118, D.z + 56), v(D.x, GROUND2 - 6, D.z));
    sound(SND.cineFire, 1);
    setFires(120);
  }],
  [932, () => cam(v(D.x - 34, 104, D.z + 50), v(D.x, GROUND2 - 4, D.z), 7)],
  [960, () => title("§fGround Zero", "§7the crater, and the island burning", 90)],
  [1080, () => {
    cam(v(D.x - 30, GROUND2 + 9, D.z + 48), v(D.x, GROUND2 + 4, D.z));
    sound(SND.cineFire, 0.9);
  }],
  [1082, () => cam(v(D.x + 6, GROUND2 + 12, D.z + 44), v(D.x - 4, GROUND2 + 3, D.z), 6)],
  [1190, () => {
    fade(0, 0, 0, 1.4, 4, 1.6);
    title("§l2026", "§7Sixty-nine years later", 90);
  }],
  [1225, () => {
    drop("cloud");
    try {
      world25.setTimeOfDay(7e3);
    } catch {
    }
    anchor(v(C.x, crashY + 56, C.z + 100));
  }],
  [1255, () => sound(SND.cineRotor, 1)],
  [H0, () => {
    const h = spawn("heli", ENT.helicopter, heliPath(H0));
    if (h) cam(v(C.x + 44, crashY + 36, C.z + 196), h);
    say2("§7[OKAFOR] §fMeridian Four-One, island in sight. Coming in from the south, low.", 120);
  }],
  [1390, () => {
    sound(SND.cineRadio, 0.8);
    say2("§7[OKAFOR] §fThat's the crater. Look at that. The water's green.", 110);
  }],
  [1490, () => say2("§7[HALE] §fSmoke on the north-west shore. Somebody's living down there.", 100)],
  [1560, () => cam(v(C.x - 24, crashY + 6, C.z - 14), props.get("heli") ?? v(C.x, crashY + 24, C.z + 40))],
  [1572, () => muzzle(0)],
  [1584, () => muzzle(1)],
  [1594, () => {
    muzzle(2);
    sound("random.glass", 1, 0.9);
    sound(SND.cineRadio, 1, 1.15);
    say2("§c[OKAFOR] §fTaking fire! Taking f—", 60);
  }],
  [1606, () => muzzle(0)],
  [1618, () => muzzle(1)],
  [1630, () => {
    say2("§c[LINDQVIST] §fDan's hit! I have the controls! Brace, brace!", 80);
    cam(v(C.x + 40, crashY + 8, C.z + 24), props.get("heli") ?? v(C.x, crashY + 10, C.z));
  }],
  [1722, () => fade(0, 0, 0, 0.1, 4.5, 2.5)],
  [1730, () => {
    sound(SND.cineImpact, 1);
    shake(0.7, 1.4);
    drop("heli");
    say2(" ", 1);
  }],
  [1790, () => finish()]
];
function muzzle(k) {
  const at = v(C.x - 18 + k * 3, crashY + 3 + k % 2, C.z - 10 - k * 2);
  const dim2 = world25.getDimension("overworld");
  try {
    dim2.spawnParticle("minecraft:basic_flame_particle", at);
    dim2.spawnParticle("minecraft:basic_smoke_particle", at);
  } catch {
  }
  sound(SND.rifle, 0.9, 0.95 + k * 0.03);
}
function shotFrame() {
  tick6++;
  for (const [at, fn] of STEPS) if (at === tick6) safe(`cine.${at}`, fn);
  if (caption && tick6 < caption.until && tick6 % 30 === 0) each((p) => p.onScreenDisplay.setActionBar(caption.text));
  if (tick6 >= 100 && tick6 <= 440) move("bomber", bomberPath(tick6), -90);
  if (tick6 > RELEASE && tick6 < FLASH) {
    const u = (tick6 - RELEASE) / (FLASH - RELEASE);
    move("bomb", bombPath(tick6), -90, 10 + u * 70);
  }
  if (tick6 > FLASH && tick6 < 1225 && tick6 % 6 === 0) safe("cine.billow", () => billow((tick6 - FLASH) / 20));
  if (tick6 >= H0 && tick6 < 1630) move("heli", heliPath(tick6), 180);
  if (tick6 >= 1630 && tick6 < 1730) {
    const u = (tick6 - 1630) / 100;
    const a = HELI_TO();
    const p = v(a.x + (C.x - a.x) * u, a.y + (crashY + 2 - a.y) * u * u, a.z + (C.z - a.z) * u);
    move("heli", p, 180 + (tick6 - 1630) ** 1.35 * 2.2, 8 + u * 10);
  }
}
function startShot() {
  if (phase !== "prologue") return;
  phase = "shot";
  tick6 = 0;
  for (const p of watching()) {
    mark(p, void 0);
    enter(p, EYE());
  }
}
function frame() {
  for (const p of watching()) {
    const n = p.isSneaking ? (sneakTicks.get(p.id) ?? 0) + 1 : 0;
    sneakTicks.set(p.id, n);
    if (n >= 40) {
      skipped.add(p.id);
      leave(p, spawnPoint());
      onFinish?.(p);
    }
  }
  if (phase === "prologue") prologueFrame();
  else if (phase === "shot") shotFrame();
  if (watching().length === 0 && (phase === "shot" ? tick6 > 2 : proTick > 2)) finish();
}
function spawnPoint() {
  return v(SPAWN_POINT.x + 0.5, SPAWN_POINT.y, SPAWN_POINT.z + 0.5);
}
function finish() {
  if (phase === "idle") return;
  phase = "idle";
  if (loop !== void 0) system14.clearRun(loop);
  loop = void 0;
  for (const k of [...props.keys()]) drop(k);
  world25.setDynamicProperty(DP.cine, 1);
  for (const p of watching()) {
    leave(p, spawnPoint());
    onFinish?.(p);
  }
  viewers = [];
}
function playCinematic(players, then) {
  if (phase !== "idle") return false;
  phase = "prologue";
  tick6 = 0;
  proTick = 0;
  caption = void 0;
  onFinish = then;
  done2.clear();
  skipped.clear();
  sneakTicks.clear();
  viewers = players.filter((p) => p.isValid);
  try {
    world25.setTimeOfDay(1500);
  } catch {
  }
  for (const p of viewers) enterPrologue(p);
  loop = system14.runInterval(() => safe("cinematic", frame), 1);
  return true;
}
function joinCinematic(p) {
  if (phase !== "prologue" || !p.isValid) return false;
  viewers.push(p);
  enterPrologue(p);
  return true;
}
function skipToShot() {
  if (phase !== "prologue") return "the opening isn't in its first part";
  for (const [k] of TASKS) done2.add(k);
  startShot();
  return "the shot";
}
function replayCinematic(p) {
  if (phase !== "idle") return "the cinematic is already playing";
  playCinematic([p], () => void 0);
  return "playing the opening (hold Sneak to skip)";
}
function startCinematic() {
  world25.afterEvents.buttonPush.subscribe((ev) => safe("cine.button", () => {
    if (ev.source instanceof Player27) onButton(ev.source, ev.block.location);
  }));
}
function cinematicSummary() {
  return `cine: ${phase} pro=${proTick} shot=${tick6} tasks=${TASKS.length - tasksLeft()}/${TASKS.length}`;
}

// ../../scripts_src/island/scenes.ts
var current;
var queue = [];
function sceneRunning() {
  return !!current;
}
function canWatch(p) {
  if (!p.isValid || needsRestore(p)) return false;
  try {
    const gm = p.getGameMode();
    return gm === GameMode10.Survival || gm === GameMode10.Adventure || gm === GameMode10.Creative;
  } catch {
    return false;
  }
}
function seen(p) {
  return readEntity(p, DP.scenes, []);
}
function hasSeen(p, name) {
  return seen(p).includes(name);
}
function markSeen(p, name) {
  const s = seen(p);
  if (!s.includes(name)) writeEntity(p, DP.scenes, [...s, name]);
}
function camTo(p, at, look, ease) {
  const easeOptions = ease > 0 ? { easeTime: ease, easeType: EasingType2.InOutSine } : void 0;
  try {
    if (look instanceof Entity17) {
      if (look.isValid) p.camera.setCamera("minecraft:free", { location: at, facingEntity: look, easeOptions });
    } else if (look) {
      p.camera.setCamera("minecraft:free", { location: at, facingLocation: look, easeOptions });
    }
  } catch {
  }
}
function step2() {
  const c = current;
  if (!c) return;
  c.tick++;
  const t = c.tick;
  c.viewers = c.viewers.filter((p) => p.isValid && needsRestore(p));
  for (const shot of c.scene.shots) {
    if (shot.t !== t) continue;
    safe(`scene.${c.scene.name}.${t}`, () => {
      shot.run?.();
      for (const p of c.viewers) {
        try {
          if (shot.fade) p.camera.fade({ fadeColor: { red: 0, green: 0, blue: 0 }, fadeTime: { fadeInTime: 0.5, holdTime: 0.3, fadeOutTime: 0.6 } });
          if (shot.cam) {
            const look = typeof shot.cam.look === "function" ? shot.cam.look() : shot.cam.look;
            camTo(p, shot.cam.at, look, shot.cam.ease ?? 0);
          }
          if (shot.title) p.onScreenDisplay.setTitle(shot.title[0], { subtitle: shot.title[1], fadeInDuration: 12, stayDuration: 60, fadeOutDuration: 20 });
          if (shot.bar) p.onScreenDisplay.setActionBar(shot.bar);
          if (shot.sound) p.playSound(shot.sound[0], { volume: shot.sound[1] ?? 1, pitch: shot.sound[2] ?? 1 });
        } catch {
        }
      }
    });
  }
  for (const p of [...c.viewers]) {
    const n = p.isSneaking ? (c.sneak.get(p.id) ?? 0) + 1 : 0;
    c.sneak.set(p.id, n);
    if (n >= 20 && t > 10) {
      c.viewers = c.viewers.filter((v3) => v3.id !== p.id);
      out(p, c.scene);
    }
  }
  if (t >= c.scene.length || c.viewers.length === 0) end2();
}
function out(p, scene) {
  leave(p, scene.returnTo);
  try {
    p.onScreenDisplay.setActionBar(" ");
  } catch {
  }
  safe(`scene.${scene.name}.end`, () => scene.onEnd?.(p));
}
function end2() {
  const c = current;
  if (!c) return;
  system15.clearRun(c.loop);
  current = void 0;
  for (const p of c.viewers) out(p, c.scene);
  for (const shot of c.scene.shots) if (shot.t > c.tick && shot.run) safe(`scene.${c.scene.name}.late`, shot.run);
  const next = queue.shift();
  if (next) system15.runTimeout(() => start(next), 10);
}
function start(scene) {
  if (current || cinematicRunning()) {
    queue.push(scene);
    return false;
  }
  const players = scene.players.filter(canWatch);
  const first = scene.shots.find((s) => s.cam)?.cam?.at ?? players[0]?.location;
  if (!players.length || !first) {
    for (const shot of scene.shots) if (shot.run) safe(`scene.${scene.name}.nobody`, shot.run);
    return false;
  }
  for (const p of players) {
    markSeen(p, scene.name);
    enterScene(p, { x: first.x, y: first.y, z: first.z });
    try {
      p.onScreenDisplay.setActionBar("§8Hold Sneak to skip");
    } catch {
    }
  }
  current = { scene, tick: 0, viewers: players, sneak: /* @__PURE__ */ new Map(), loop: system15.runInterval(() => safe("scene", step2), 1) };
  return true;
}
function playScene(name, players, shots, length, opts = {}) {
  return start({ name, players, shots, length, ...opts });
}
var v2 = (x, y, z) => ({ x, y, z });
function towerScene() {
  const t = SITES.TOWER;
  const hut = (POINTS.tower_hut ?? [])[0] ?? v2(t.x, 163, t.z + 7);
  const top = (POINTS.tower_top ?? [])[0] ?? v2(t.x, hut.y + 34, t.z);
  return [
    { t: 1, fade: true },
    { t: 8, cam: { at: v2(t.x + 16, hut.y + 2, t.z + 18), look: v2(t.x, hut.y + 6, t.z) } },
    { t: 12, cam: { at: v2(t.x + 11, top.y + 3, t.z + 13), look: v2(t.x, top.y - 2, t.z), ease: 6 } },
    { t: 30, title: ["§fThe North Peak Relay", "§7built 1957 · still standing"] },
    { t: 90, bar: "§7The hut at its foot holds the transmitter. The shed beside it, the generator." },
    { t: 128, cam: { at: v2(t.x + 24, hut.y + 10, t.z + 26), look: v2(t.x, hut.y + 1, t.z + 4), ease: 2.5 } },
    { t: 150, bar: "§6Press the buttons inside the hut and the shed to see what they need." }
  ];
}
function sunfallScene() {
  const g = (POINTS.cult_gate ?? [])[0] ?? v2(SITES.SUNFALL.x, 75, SITES.SUNFALL.z + 34);
  const s = (POINTS.shrine ?? [])[0] ?? v2(SITES.SUNFALL.x, 75, SITES.SUNFALL.z);
  return [
    { t: 1, fade: true },
    { t: 8, cam: { at: v2(g.x + 16, g.y + 9, g.z + 24), look: v2(s.x, s.y + 3, s.z) } },
    { t: 12, cam: { at: v2(g.x - 14, g.y + 18, g.z + 2), look: v2(s.x, s.y + 2, s.z), ease: 6.5 } },
    { t: 30, title: ["§fSunfall", "§7the Children of the Second Sun"] },
    { t: 95, bar: "§7Zealots guard the gate. The Faithful will only talk to you unarmed." },
    { t: 140, bar: "§6Gifts of food and offerings at their shrine earn their trust." }
  ];
}
function craterScene() {
  const g = SITES.GZ;
  const r = CRATER_R;
  return [
    { t: 1, fade: true },
    { t: 8, cam: { at: v2(g.x - r - 18, 98, g.z + 34), look: v2(g.x, 60, g.z) } },
    { t: 12, cam: { at: v2(g.x + 24, 104, g.z + r + 20), look: v2(g.x, 58, g.z), ease: 7 } },
    { t: 30, title: ["§aGround Zero", "§77 May 1957"] },
    { t: 95, bar: "§7The counter screams near the green water. Don't swim, don't drink." },
    { t: 140, bar: "§6A hazmat suit lets you work here. The bunkers had them." }
  ];
}
var FIRST_SIGHT = [
  ["tower", (p) => Math.hypot(p.location.x - SITES.TOWER.x, p.location.z - SITES.TOWER.z) < 42, towerScene, 175],
  ["sunfall", (p) => Math.hypot(p.location.x - SITES.SUNFALL.x, p.location.z - SITES.SUNFALL.z) < 78, sunfallScene, 170],
  ["crater", (p) => Math.hypot(p.location.x - SITES.GZ.x, p.location.z - SITES.GZ.z) < CRATER_R + 46, craterScene, 170]
];
function calm(p) {
  try {
    if (p.dimension.getEntities({ location: p.location, maxDistance: 16, families: ["monster"] }).length) return false;
    if (p.dimension.getEntities({ location: p.location, maxDistance: 20, type: "hollow:zealot" }).length) return false;
    const hp = p.getComponent("minecraft:health");
    return !hp || hp.currentValue > 8;
  } catch {
    return true;
  }
}
function firstSight() {
  if (!isIsland() || current || cinematicRunning()) return;
  for (const p of world26.getAllPlayers()) {
    if (!canWatch(p) || getNum(p, DP.woke, 0) !== 1 || p.dimension.id !== "minecraft:overworld") continue;
    for (const [name, near, shots, len2] of FIRST_SIGHT) {
      if (hasSeen(p, name) || !near(p)) continue;
      if (!calm(p)) {
        markSeen(p, name);
        continue;
      }
      const company = world26.getAllPlayers().filter((q) => q.id === p.id || !hasSeen(q, name) && canWatch(q) && Math.hypot(q.location.x - p.location.x, q.location.z - p.location.z) < 30 && calm(q));
      playScene(name, company, shots(), len2, { onEnd: (q) => sceneEndHook?.(q, name) });
      return;
    }
  }
}
var sceneEndHook;
function startScenes() {
  system15.runInterval(() => safe("scenes.sight", firstSight), 20);
}

// ../../scripts_src/island/cult.ts
var DEFAULT5 = {
  standing: 0,
  hierophantDead: false,
  villageDay: {},
  seerDay: -1,
  violentDay: -1,
  quietDay: -1,
  gifts: {},
  offeredDay: -1,
  offeredToday: 0,
  vaultOpen: false,
  wrathSummoned: false
};
var state6;
function st7() {
  if (!state6) state6 = { ...DEFAULT5, ...readWorld(DP.cult, DEFAULT5) };
  return state6;
}
function save7() {
  writeWorld(DP.cult, st7());
}
function changeStanding(delta, why) {
  const s = st7();
  const before = s.standing;
  s.standing = Math.max(-100, Math.min(100, s.standing + delta));
  if (delta < 0) s.violentDay = world27.getDay();
  save7();
  if (why && Math.abs(s.standing - before) >= 1) {
    for (const p of world27.getAllPlayers()) {
      if (p.isValid) notice(p, `${delta > 0 ? "§a" : "§c"}${why} §8(the Children ${standingWord()})`);
    }
  }
}
function standingWord() {
  const v3 = st7().standing;
  return v3 <= -60 ? "want you dead" : v3 <= -25 ? "hate you" : v3 < 10 ? "distrust you" : v3 < 40 ? "tolerate you" : v3 < 70 ? "accept you" : "call you kin";
}
var CULT = [ENT.zealot, ENT.faithful, ENT.seer, ENT.hierophant];
var NAMES2 = [
  "Brother Amos",
  "Sister Ruth",
  "Brother Eli",
  "Sister Hope",
  "Brother Jory",
  "Sister Mae",
  "Brother Cal",
  "Sister June",
  "Brother Walt",
  "Sister Dot",
  "Brother Abel",
  "Sister Nell",
  "Brother Hiram",
  "Sister Clare"
];
function villages() {
  const homes = POINTS.cult_home ?? [];
  const posts = POINTS.cult_post ?? [];
  const near = (c, r) => (v3) => Math.hypot(v3.x - c.x, v3.z - c.z) < r;
  const sun = SITES.SUNFALL, mg = SITES.MANGROVES;
  return [
    { key: "sunfall", center: sun, homes: homes.filter(near(sun, 40)), posts: posts.filter(near(sun, 40)), faithful: 6, zealots: 3 },
    { key: "mangroves", center: mg, homes: homes.filter(near(mg, 40)), posts: posts.filter(near(mg, 40)), faithful: 2, zealots: 2 }
  ];
}
function spawnAt(type, at, resident = true) {
  try {
    const e = world27.getDimension("overworld").spawnEntity(type, { x: at.x + 0.5, y: at.y, z: at.z + 0.5 });
    if (type === ENT.zealot && resident) e.triggerEvent("hollow:resident");
    if (type === ENT.faithful || type === ENT.seer) e.nameTag = pick(NAMES2);
    if (type === ENT.hierophant) e.nameTag = "The Hierophant";
    return e;
  } catch {
    return void 0;
  }
}
function census() {
  if (!isIsland() || !settings().cult) return;
  const s = st7();
  const day = world27.getDay();
  const dim2 = world27.getDimension("overworld");
  for (const v3 of villages()) {
    if (s.villageDay[v3.key] === day) continue;
    const c = { x: v3.center.x, y: 70, z: v3.center.z };
    const someone = world27.getAllPlayers().some((p) => p.dimension.id === dim2.id && Math.hypot(p.location.x - c.x, p.location.z - c.z) < 96);
    if (!someone) continue;
    try {
      if (!dim2.isChunkLoaded(c)) continue;
    } catch {
      continue;
    }
    s.villageDay[v3.key] = day;
    const here = dim2.getEntities({ location: c, maxDistance: 48 }).filter((e) => CULT.includes(e.typeId));
    const count2 = (t) => here.filter((e) => e.typeId === t).length;
    const hostile = s.hierophantDead || s.standing <= -60;
    for (let i = count2(ENT.faithful); i < (hostile ? Math.ceil(v3.faithful / 2) : v3.faithful); i++) {
      const h = v3.homes[i % Math.max(1, v3.homes.length)];
      if (h) spawnAt(ENT.faithful, h);
    }
    for (let i = count2(ENT.zealot); i < v3.zealots + (hostile ? 2 : 0); i++) {
      const p = v3.posts[i % Math.max(1, v3.posts.length)] ?? v3.homes[0];
      if (p) spawnAt(ENT.zealot, p);
    }
    if (v3.key === "sunfall") {
      const shrine2 = (POINTS.hierophant ?? [])[0];
      if (shrine2 && !s.hierophantDead && count2(ENT.hierophant) === 0) spawnAt(ENT.hierophant, shrine2);
      if (count2(ENT.seer) === 0 && s.standing > -40 && Math.random() < 0.65) {
        const h = (POINTS.shrine ?? [])[0];
        if (h) spawnAt(ENT.seer, { x: h.x + 3, y: h.y, z: h.z - 3 });
      }
    }
    save7();
  }
}
var PATROL_TAG = "hollow_patrol";
var patrol = {
  add(id) {
    world27.getEntity(id)?.addTag(PATROL_TAG);
  },
  delete(_id) {
  },
  list() {
    try {
      return world27.getDimension("overworld").getEntities({ tags: [PATROL_TAG] });
    } catch {
      return [];
    }
  },
  get size() {
    return this.list().length;
  }
};
var wrathful = /* @__PURE__ */ new Set();
function patrols() {
  if (!isIsland() || !settings().cult) return;
  const s = st7();
  const dim2 = world27.getDimension("overworld");
  for (const e of patrol.list()) {
    if (!e.isValid) continue;
    if (isDay() && !isDarkHours()) {
      const seen2 = world27.getAllPlayers().some((p) => Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z) < 20);
      if (!seen2) {
        e.triggerEvent("hollow:despawn");
      }
    }
  }
  if (!isDarkHours()) return;
  const hostile = s.hierophantDead || s.standing <= -30;
  if (hollowNight() < 2 && !hostile) return;
  if (patrol.size >= (hostile ? 6 : 4)) return;
  const chance2 = (hostile ? 0.35 : 0.14) * [0.6, 1, 1.5][settings().intensity] * (s.standing >= 40 ? 0.4 : 1);
  for (const p of world27.getAllPlayers()) {
    if (!p.isValid || p.dimension.id !== dim2.id || Math.random() > chance2) continue;
    const near = villages().some((v3) => Math.hypot(p.location.x - v3.center.x, p.location.z - v3.center.z) < 60);
    if (near) continue;
    const a = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 16;
    const at = groundNear(dim2, p.location.x + Math.cos(a) * r, p.location.y, p.location.z + Math.sin(a) * r, 10);
    if (!at) continue;
    const n = hostile ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const e = spawnAt(ENT.zealot, { x: at.x + k * 1.5, y: at.y, z: at.z }, false);
      if (e) patrol.add(e.id);
    }
    worldSound(dim2, SND.distantShot, at, 0.6);
    if (Math.random() < 0.5) say("§7(low)§r Lights in the trees. Torches. That's them, the ones who shot us down.", "patrol", 2400);
    break;
  }
}
function armed(p) {
  const id = heldItem(p);
  return !!id && (!!GUNS[id] || id.endsWith("_sword") || id.endsWith("_axe") || id === ITEM.hatchet || id === "minecraft:bow" || id === "minecraft:crossbow");
}
var FAITHFUL_LINES = [
  "The second sun opened its eye over this island. We were not afraid to look.",
  "My grandmother came here in sixty-two. She said the air tasted of pennies. She lived to ninety.",
  "You carry the mainland on you. It smells of fear.",
  "The sickness is only the sun getting in. It hurts, and then you belong to it.",
  "The things in the woods do not touch us. They know whose island it is.",
  "Do not walk the north-west shore after dark. The Zealots do not ask questions."
];
var FOOD = [
  "minecraft:bread",
  "minecraft:cooked_beef",
  "minecraft:cooked_cod",
  "minecraft:cooked_salmon",
  "minecraft:apple",
  "minecraft:baked_potato",
  "minecraft:cooked_chicken",
  "minecraft:cooked_mutton",
  "minecraft:sweet_berries",
  ITEM.ration
];
async function talkFaithful(p, e) {
  const s = st7();
  unlock(p, "cult1");
  unlock(p, "cult_faithful");
  if (s.hierophantDead || s.standing <= -40) {
    notice(p, `§7${e.nameTag || "The Faithful"} backs away from you, eyes white and wide.`);
    return;
  }
  if (armed(p)) {
    notice(p, `§7${e.nameTag || "The Faithful"}: §f"Put that away, outsider. Then speak."`);
    return;
  }
  const held = heldItem(p);
  if (held && FOOD.includes(held)) {
    const key = `${e.id}:${world27.getDay()}`;
    if (!s.gifts[key]) {
      s.gifts[key] = 1;
      takeOne(p, held);
      changeStanding(4, "A gift, gratefully taken.");
      notice(p, `§7${e.nameTag || "The Faithful"}: §f"The sun sees this. So do I."`);
      return;
    }
  }
  await formSession(p, async () => {
    const form = new ActionFormData5().title(`§l${e.nameTag || "Faithful"}`).body(`§o"${pick(FAITHFUL_LINES)}"

§r§8The Children ${standingWord()}.`);
    const trade = s.standing >= 20;
    form.button(trade ? "Trade: copper wire for a medkit" : "§8Trade §7(they don't trust you yet)", "textures/ui/hollow/journal/item_copper_wire");
    form.button(trade ? "Trade: copper wire for iodine tablets" : "§8 ", "textures/ui/hollow/journal/item_iodine_tablets");
    form.button("§8Leave", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled || r.selection === void 0 || !trade) return;
    const pay = r.selection === 0 ? ITEM.medkit : r.selection === 1 ? ITEM.iodine : void 0;
    if (!pay) return;
    if (!takeOne(p, pay)) {
      notice(p, "§7You don't have one to give.");
      return;
    }
    giveOrDrop(p, new ItemStack13(ITEM.wire, r.selection === 0 ? 3 : 2));
    notice(p, `§7${e.nameTag || "The Faithful"} unwinds a coil of old copper from the tower steel. §f"For the sickness."`);
    changeStanding(2);
  });
}
function takeOne(p, typeId) {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return false;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it?.typeId !== typeId) continue;
    if (it.amount > 1) {
      it.amount -= 1;
      c.setItem(i, it);
    } else c.setItem(i, void 0);
    return true;
  }
  return false;
}
async function talkSeer(p, e) {
  const s = st7();
  unlock(p, "cult1");
  unlock(p, "cult_seer");
  if (armed(p)) {
    notice(p, '§7The Seer turns her blindfolded face toward you. §f"Put it away. Then we talk."');
    return;
  }
  await formSession(p, async () => {
    const options = [
      ["Who are you?", () => {
        unlock(p, "seer_story");
        notice(p, '§7The Seer: §f"We came in nineteen sixty-two on a supply boat that never went back. The flash had been gone five years. The light was still in everything."');
      }],
      ["Who shot down our helicopter?", () => {
        unlock(p, "seer_shot");
        notice(p, '§7The Seer: §f"The Hierophant says the sky belongs to the sun. The Zealots keep it clean. Your pilot was not the first. He will not be the last."');
      }],
      ["Trade: a medkit for a Hush Offering", () => {
        if (!takeOne(p, ITEM.medkit)) return notice(p, "§7The Seer waits. You have no medicine.");
        giveOrDrop(p, new ItemStack13(ITEM.offering, 1));
        changeStanding(3);
        notice(p, '§7The Seer presses something cold into your hand. §f"For the thing under the lake. When you are ready."');
      }],
      ["Trade: a battery bank for the bunker maps", () => {
        if (!takeOne(p, ITEM.battery)) return notice(p, '§7The Seer: §f"Bring me stored lightning. The black boxes from the boathouse."');
        unlock(p, "seer_maps");
        changeStanding(5);
        notice(p, '§7The Seer draws three squares in the dirt with her staff. Your Research Log fills in. §f"Three holes in the ground. Do not open the doors that are already closed."');
      }]
    ];
    if (s.standing >= 40) {
      options.push(["Is there another way into the sealed bunker?", () => {
        unlock(p, "seer_way");
        notice(p, '§7The Seer: §f"The machine-house under the western hill is closed. But the rock has a throat. Walk west from its door, a hundred paces, where the ground falls in. Climb down."');
      }]);
    }
    const form = new ActionFormData5().title("§lThe Seer").body(`§o"You smell of the mainland, and of the dead man you carried."

§r§8The Children ${standingWord()}.`);
    for (const [label] of options) form.button(label, "textures/ui/hollow/journal/seer");
    form.button("§8Leave", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled || r.selection === void 0 || r.selection >= options.length) return;
    options[r.selection][1]();
  });
}
async function talkHierophant(p, e) {
  const s = st7();
  unlock(p, "cult1");
  unlock(p, "cult_hierophant");
  if (wrathful.has(e.id)) return;
  await formSession(p, async () => {
    const welcome = s.standing >= 60;
    const form = new ActionFormData5().title("§lThe Hierophant").body(welcome ? `§o"You have fed my children and left our dead in peace. The sun has seen you. Take this, and open what lies under the sun's feet."` : '§o"You fell out of the sky like ash. The sun let you live, for now. Leave my island, mainlander, or kneel to the light."');
    form.button(welcome ? "Take what he offers" : "Leave", "textures/ui/hollow/journal/hierophant");
    form.button("§8Say nothing", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled || r.selection !== 0 || !welcome) return;
    if (!s.vaultOpen) {
      giveOrDrop(p, new ItemStack13(ITEM.shrineKey, 1));
      notice(p, "§7The Hierophant gives you a heavy key with a sun for a bow.");
    }
  });
}
function onDeath(dead, killer) {
  if (!CULT.includes(dead.typeId)) return;
  const byPlayer = killer?.typeId === "minecraft:player" || killer?.typeId === ENT.trevor;
  patrol.delete(dead.id);
  if (!byPlayer) return;
  const s = st7();
  if (dead.typeId === ENT.faithful) {
    changeStanding(-25, "You killed one of the Faithful.");
    callZealots(dead.location);
  } else if (dead.typeId === ENT.seer) {
    changeStanding(-40, "You killed the Seer.");
    callZealots(dead.location);
  } else if (dead.typeId === ENT.zealot) {
    changeStanding(-3);
  } else if (dead.typeId === ENT.hierophant) {
    s.hierophantDead = true;
    s.standing = -100;
    save7();
    for (const p of world27.getAllPlayers()) {
      notice(p, "§4The Hierophant is dead. §7The Children of the Second Sun will never forgive you.");
      unlock(p, "hierophant_dead");
    }
    say("It's done. Now every one of them will come for us. Every night.", "hiero", 0);
  }
}
function callZealots(at) {
  const dim2 = world27.getDimension("overworld");
  for (let k = 0; k < 2; k++) {
    const g = groundNear(dim2, at.x + 18 + k * 2, at.y, at.z - 14, 10);
    if (!g) continue;
    const e = spawnAt(ENT.zealot, g, false);
    if (e) patrol.add(e.id);
  }
  worldSound(dim2, "bell.use", at, 1);
}
function onHurt(hurt2, by) {
  if (hurt2.typeId === ENT.hierophant && by && (by.typeId === "minecraft:player" || by.typeId === ENT.trevor)) {
    const s = st7();
    if (!wrathful.has(hurt2.id)) {
      wrathful.add(hurt2.id);
      try {
        hurt2.triggerEvent("hollow:wrath");
      } catch {
      }
      const near = world27.getAllPlayers().filter((p) => Math.hypot(p.location.x - hurt2.location.x, p.location.z - hurt2.location.z) < 40);
      const h = hurt2.location;
      const yaw = Math.random() * Math.PI * 2;
      playScene("hierophant", near, [
        { t: 1, cam: { at: { x: h.x + Math.cos(yaw) * 5, y: h.y + 2.2, z: h.z + Math.sin(yaw) * 5 }, look: () => hurt2 } },
        { t: 4, cam: { at: { x: h.x + Math.cos(yaw) * 3, y: h.y + 1.9, z: h.z + Math.sin(yaw) * 3 }, look: () => hurt2, ease: 2.5 } },
        { t: 10, title: ["§4The Hierophant", '§c"You raise your hand against the sun?"'], sound: ["mob.evocation_illager.prepare_attack", 1, 0.7] }
      ], 70);
    }
    const hp = hurt2.getComponent("minecraft:health");
    if (hp && hp.currentValue < hp.effectiveMax * 0.5 && !s.wrathSummoned) {
      s.wrathSummoned = true;
      save7();
      for (let k = 0; k < 3; k++) {
        const g = groundNear(hurt2.dimension, hurt2.location.x + (k - 1) * 4, hurt2.location.y, hurt2.location.z + 6, 6);
        if (g) {
          const e = spawnAt(ENT.zealot, g, false);
          if (e) patrol.add(e.id);
        }
      }
    }
  }
  if (hurt2.typeId === ENT.faithful && by?.typeId === "minecraft:player" && (hurt2.getComponent("minecraft:health")?.currentValue ?? 0) > 0) {
    callZealots(hurt2.location);
    changeStanding(-5);
  }
}
function offerings() {
  if (!isIsland()) return;
  const s = st7();
  const barrel = LOOT_CONTAINERS.find((c) => c.loot === "shrine_offerings");
  if (!barrel) return;
  const dim2 = world27.getDimension("overworld");
  try {
    if (!dim2.isChunkLoaded(barrel)) return;
    const c = dim2.getBlock(barrel)?.getComponent("minecraft:inventory")?.container;
    if (!c) return;
    if (s.offeredDay !== world27.getDay()) {
      s.offeredDay = world27.getDay();
      s.offeredToday = 0;
    }
    let gained = 0;
    for (let i = 0; i < c.size; i++) {
      const it = c.getItem(i);
      if (!it) continue;
      const v3 = it.typeId === ITEM.offering ? 15 : it.typeId === ITEM.medkit || it.typeId === ITEM.iodine ? 5 : FOOD.includes(it.typeId) ? 1 : 0;
      if (!v3) continue;
      gained += v3 * it.amount;
      c.setItem(i, void 0);
    }
    if (gained > 0) {
      const room = Math.max(0, 20 - s.offeredToday);
      const g = Math.min(room, gained);
      s.offeredToday += g;
      save7();
      if (g > 0) changeStanding(g, "The Children take your offering to the shrine.");
      particle(dim2, "minecraft:basic_flame_particle", { x: barrel.x + 0.5, y: barrel.y + 1.2, z: barrel.z + 0.5 });
    }
  } catch {
  }
}
function useShrineKey(p) {
  const s = st7();
  const shrine2 = (POINTS.shrine ?? [])[0];
  if (!shrine2 || Math.hypot(p.location.x - shrine2.x, p.location.z - shrine2.z) > 7) {
    notice(p, "§7A heavy key with a sun for a bow. It belongs to the shrine at Sunfall.");
    return;
  }
  if (s.vaultOpen) {
    notice(p, "§7The vault under the shrine already stands open.");
    return;
  }
  if (!openVault(p.dimension)) {
    notice(p, "§7The key turns, but nothing moves. (Come closer.)");
    return;
  }
  takeOne(p, ITEM.shrineKey);
  notice(p, "§7Stone grinds. A shaft opens in front of the altar, a ladder down into the dark.");
  unlock(p, "ledger");
}
function openVault(dim2 = world27.getDimension("overworld")) {
  const s = st7();
  const shaft = (POINTS.vault_shaft ?? [])[0];
  if (!shaft) return false;
  try {
    for (let y = shaft.y; y < shaft.y + 4; y++) {
      const b = dim2.getBlock({ x: shaft.x, y, z: shaft.z });
      if (!b) return false;
      b.setPermutation(BlockPermutation7.resolve("minecraft:ladder", { facing_direction: 3 }));
    }
    s.vaultOpen = true;
    save7();
    worldSound(dim2, "random.door_open", shaft, 1, 0.5);
    particle(dim2, "minecraft:large_explosion", { x: shaft.x + 0.5, y: shaft.y + 4, z: shaft.z + 0.5 });
    return true;
  } catch {
    return false;
  }
}
function onRound(e) {
  const dim2 = e.dimension;
  const nearest3 = world27.getAllPlayers().reduce((d, p) => Math.min(d, Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z)), 1e9);
  if (nearest3 < 40) worldSound(dim2, SND.rifle, e.location, 1, 0.95 + Math.random() * 0.1);
  else worldSound(dim2, SND.distantShot, e.location, 0.9);
  particle(dim2, "minecraft:basic_smoke_particle", e.location);
  emitNoise({ dim: dim2, at: e.location, radius: 48, kind: "gunshot" });
}
function sendWarband(near, n) {
  if (!settings().cult) return 0;
  const dim2 = world27.getDimension("overworld");
  let made = 0;
  const a = Math.random() * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const r = 28 + Math.random() * 8;
    const g = groundNear(dim2, near.x + Math.cos(a + k * 0.25) * r, near.y, near.z + Math.sin(a + k * 0.25) * r, 12);
    if (!g) continue;
    const e = spawnAt(ENT.zealot, g, false);
    if (e) {
      patrol.add(e.id);
      made++;
    }
  }
  if (made) worldSound(dim2, SND.distantShot, near, 0.8);
  return made;
}
function cultEndingState() {
  const s = st7();
  return { standing: s.standing, hierophantDead: s.hierophantDead };
}
function cultSummary() {
  const s = st7();
  return `cult: standing=${s.standing} (${standingWord()}) hierophant=${s.hierophantDead ? "dead" : "alive"} patrol=${patrol.size} vault=${s.vaultOpen}`;
}
function setStanding(v3) {
  st7().standing = Math.max(-100, Math.min(100, v3));
  save7();
  return `standing ${st7().standing} (${standingWord()})`;
}
function startCult() {
  world27.afterEvents.playerInteractWithEntity.subscribe((ev) => safe("cult.talk", () => {
    const t = ev.target;
    if (t.typeId === ENT.faithful) void talkFaithful(ev.player, t);
    else if (t.typeId === ENT.seer) void talkSeer(ev.player, t);
    else if (t.typeId === ENT.hierophant) void talkHierophant(ev.player, t);
  }));
  world27.afterEvents.entityDie.subscribe((ev) => safe("cult.die", () => onDeath(ev.deadEntity, ev.damageSource.damagingEntity)));
  world27.afterEvents.entityHurt.subscribe((ev) => safe("cult.hurt", () => onHurt(ev.hurtEntity, ev.damageSource.damagingEntity)));
  world27.afterEvents.entitySpawn.subscribe((ev) => safe("cult.round", () => {
    if (ev.entity.isValid && ev.entity.typeId === ENT.cultRound) onRound(ev.entity);
  }));
  onShrineKeyHook(useShrineKey);
  onGunshotHook((p, radius) => {
    if (!isIsland()) return;
    for (const v3 of villages()) {
      if (Math.hypot(p.location.x - v3.center.x, p.location.z - v3.center.z) < radius + 20) {
        changeStanding(-2);
        break;
      }
    }
  });
  every("cult.sight", 100, () => {
    if (!isIsland()) return;
    for (const p of world27.getAllPlayers()) {
      try {
        const seen2 = p.dimension.getEntities({ location: p.location, maxDistance: 28, families: ["cult"] })[0];
        if (!seen2) continue;
        unlock(p, "cult1");
        if (seen2.typeId === ENT.zealot) unlock(p, "cult_zealot");
      } catch {
      }
    }
  });
  every("cult.census", 400, census, 50);
  every("cult.patrol", 1200, patrols, 90);
  every("cult.offerings", 200, offerings, 13);
  every("cult.quiet", 2400, () => {
    const s = st7();
    const day = world27.getDay();
    if (s.quietDay !== day && s.violentDay !== day && day > 0 && isDay()) {
      s.quietDay = day;
      save7();
      if (!s.hierophantDead) changeStanding(2);
    }
  }, 200);
}

// ../../scripts_src/island/tower.ts
import { BlockPermutation as BlockPermutation8, system as system16, world as world28 } from "@minecraft/server";
import { ActionFormData as ActionFormData6 } from "@minecraft/server-ui";
var NEED = { valves: 2, wire: 4, battery: 1 };
var DEFAULT6 = { running: false, valves: 0, wire: 0, battery: 0, phase: "idle", sawNight: false, waves: 0, ending: "" };
var state7;
function st8() {
  if (!state7) state7 = { ...DEFAULT6, ...readWorld(DP.tower, DEFAULT6) };
  return state7;
}
function save8() {
  writeWorld(DP.tower, st8());
}
var FUEL = ["minecraft:coal", "minecraft:charcoal", "minecraft:coal_block"];
function count(p, ids) {
  const c = p.getComponent("minecraft:inventory")?.container;
  let n = 0;
  if (!c) return 0;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it && ids.includes(it.typeId)) n += it.typeId === "minecraft:coal_block" ? it.amount * 9 : it.amount;
  }
  return n;
}
function take(p, ids, want) {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return 0;
  let got = 0;
  for (let i = 0; i < c.size && got < want; i++) {
    const it = c.getItem(i);
    if (!it || !ids.includes(it.typeId)) continue;
    const per = it.typeId === "minecraft:coal_block" ? 9 : 1;
    const use = Math.min(it.amount, Math.ceil((want - got) / per));
    got += use * per;
    if (use >= it.amount) c.setItem(i, void 0);
    else {
      it.amount -= use;
      c.setItem(i, it);
    }
  }
  return got;
}
function generator(p) {
  const s = st8();
  unlock(p, "tower_generator");
  if (s.running) {
    notice(p, "§7The generator thuds away. The cables to the mast are warm.");
    return;
  }
  if (count(p, FUEL) < 8) {
    notice(p, `§7A 1950s diesel-electric set, converted to burn anything. The hopper is empty: it needs §f8 coal or charcoal§7 (you have ${count(p, FUEL)}).`);
    return;
  }
  take(p, FUEL, 8);
  s.running = true;
  save8();
  const g = (POINTS.generator ?? [])[0];
  if (g) {
    worldSound(p.dimension, "random.explode", g, 0.3, 1.8);
    particle(p.dimension, "minecraft:large_explosion", { x: g.x + 0.5, y: g.y + 2, z: g.z + 0.5 });
  }
  notice(p, "§aThe generator coughs, catches, and settles into a roar.§7 The hut lights flicker on.");
  say("Listen to that. Seventy years and it still runs. They built things to outlast the end of the world.", "gen", 0);
}
function partsLine() {
  const s = st8();
  const m = (have, need) => have >= need ? `§a${have}/${need}` : `§c${have}/${need}`;
  return `§7Vacuum tubes ${m(s.valves, NEED.valves)}§7 · Copper wire ${m(s.wire, NEED.wire)}§7 · Battery bank ${m(s.battery, NEED.battery)}§7 · Generator ${s.running ? "§arunning" : "§ccold"}`;
}
function ready() {
  const s = st8();
  return s.running && s.valves >= NEED.valves && s.wire >= NEED.wire && s.battery >= NEED.battery;
}
function install(p) {
  const s = st8();
  let n = 0;
  const put = (key, id) => {
    const got = take(p, [id], NEED[key] - s[key]);
    s[key] += got;
    n += got;
  };
  put("valves", ITEM.valve);
  put("wire", ITEM.wire);
  put("battery", ITEM.battery);
  save8();
  if (n) ui(p, "random.anvil_use", 0.4, 1.4);
  return n;
}
async function towerConsole(p) {
  const s = st8();
  unlock(p, "tower_parts");
  if (s.phase !== "idle") {
    notice(p, s.phase === "waiting" ? '§7The transmitter hums. Coast Guard Sector Honolulu: "Helicopter at first light. Be at the old dock."' : s.phase === "gone" ? "§7The relay is quiet now. The lamp on the mast still burns." : "§7The helicopter is here. Get to the dock.");
    return;
  }
  await formSession(p, async () => {
    const form = new ActionFormData6().title("§lRelay Transmitter, 1957").body("A steel cabinet of valve sockets and cloth-wrapped wiring. Most of it is intact. What isn't, you can replace.\n\n" + partsLine());
    form.button("Install parts from my pack", "textures/ui/hollow/journal/item_vacuum_tube");
    form.button(ready() ? "§lTransmit§r" : "§8Transmit §7(not ready)", "textures/ui/hollow/journal/item_field_radio");
    form.button("§8Leave", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled) return;
    if (r.selection === 0) {
      const n = install(p);
      notice(p, n ? `§7You fit what you have. ${partsLine()}` : `§7Nothing in your pack fits. ${partsLine()}`);
      if (ready()) notice(p, "§aEverything is in. Press the button again to transmit.");
    } else if (r.selection === 1) {
      if (!ready()) {
        notice(p, `§7The transmitter won't warm up. ${partsLine()}`);
        return;
      }
      transmit(p);
    }
  });
}
function transmit(p) {
  const s = st8();
  if (s.phase !== "idle") return;
  s.phase = "waiting";
  s.sawNight = isDarkHours();
  s.waves = 0;
  save8();
  const dim2 = p.dimension;
  const lamp = (POINTS.tower_lamp ?? [])[0];
  const lightLamp = () => {
    if (!lamp) return;
    try {
      dim2.getBlock(lamp)?.setPermutation(BlockPermutation8.resolve("minecraft:sea_lantern"));
      dim2.getBlock({ x: lamp.x, y: lamp.y + 1, z: lamp.z })?.setPermutation(BlockPermutation8.resolve("minecraft:light_block_15"));
    } catch {
    }
  };
  const lines = [
    [0, "§7You key the transmitter. Seventy-year-old valves warm to orange, one by one."],
    [70, '§f"Mayday, mayday, mayday. This is the Varrow Island survey party. Our helicopter was shot down. Two dead. We need extraction."'],
    [200, '§b"Varrow party, Coast Guard Sector Honolulu. We hear you. A helicopter will launch at first light. Can you reach the old dock on the south-east shore?"'],
    [300, '§f"We can reach it."'],
    [340, '§b"Hold on until dawn. And keep your heads down."']
  ];
  for (const [t, text] of lines) {
    system16.runTimeout(() => safe("tower.radio", () => {
      for (const q of world28.getAllPlayers()) q.sendMessage(text);
    }), t);
  }
  const T = SITES.TOWER;
  const hut = (POINTS.tower_hut ?? [])[0] ?? { x: T.x, y: 163, z: T.z + 7 };
  const top = lamp ?? { x: T.x, y: hut.y + 30, z: T.z };
  const shrine2 = (POINTS.shrine ?? [])[0] ?? { x: SITES.SUNFALL.x, y: 75, z: SITES.SUNFALL.z };
  const at = (x, y, z) => ({ x, y, z });
  playScene("transmit", world28.getAllPlayers(), [
    { t: 1, fade: true },
    { t: 8, cam: { at: at(hut.x + 7, hut.y + 2, hut.z + 7), look: at(hut.x, hut.y + 1, hut.z) }, sound: [SND.cineRadio, 0.8] },
    { t: 20, bar: "§7The valves warm to orange, one by one." },
    { t: 70, title: ["", '§f"Mayday, mayday, mayday..."'], sound: [SND.cineRadio, 0.6] },
    { t: 110, cam: { at: at(top.x + 9, top.y - 2, top.z + 9), look: at(top.x, top.y, top.z), ease: 4 } },
    { t: 150, run: lightLamp, sound: ["random.anvil_land", 0.3, 1.8] },
    { t: 160, title: ["", "§eThe lamp on the mast lights."] },
    { t: 200, title: ["§bCoast Guard", '§f"We hear you. Helicopter at first light."'], sound: [SND.cineRadio, 0.7] },
    { t: 215, cam: { at: at(top.x + 70, top.y + 18, top.z + 90), look: at(top.x, top.y, top.z), ease: 5 } },
    { t: 300, cam: { at: at(shrine2.x + 40, shrine2.y + 40, shrine2.z + 50), look: at(shrine2.x, shrine2.y, shrine2.z), ease: 0 }, fade: true },
    { t: 305, title: ["", "§cAt Sunfall, they see it too."], sound: ["bell.use", 1, 0.8] },
    { t: 340, title: ["§fHold on until dawn", "§7then get to the old dock"] }
  ], 410, {
    onEnd: () => void 0
  });
  system16.runTimeout(() => safe("tower.after", () => {
    for (const q of world28.getAllPlayers()) unlock(q, "transmit");
    const kin = cultEndingState().standing >= 70;
    say(kin ? "First light. One more night. And the lamp's lit; every soul on this island can see it. I hope your friends at Sunfall meant it." : "First light. One more night, then. That lamp's lit now; they'll all have seen it. They'll come for it.", "transmit", 0);
  }), 420);
}
function lastNight() {
  const s = st8();
  if (s.phase !== "waiting") return;
  if (isDarkHours()) {
    if (!s.sawNight) {
      s.sawNight = true;
      save8();
    }
    const { standing, hierophantDead } = cultEndingState();
    if (!settings().cult || standing >= 70 || s.waves >= (hierophantDead ? 6 : 4)) return;
    const players = world28.getAllPlayers().filter((p) => p.isValid && p.dimension.id === "minecraft:overworld");
    if (!players.length) return;
    const target2 = pick(players);
    const n = sendWarband(target2.location, hierophantDead ? 4 : 3);
    if (n) {
      s.waves++;
      save8();
      for (const p of players) notice(p, pick(["§cTorches in the trees.", "§cA bell rings at Sunfall. Then another.", "§cVoices, singing, getting closer."]));
    }
    return;
  }
  if (s.sawNight) startRescue();
}
var LANDING = () => {
  const d = (POINTS.dock_end ?? [])[0] ?? { x: SITES.DOCK.x, y: 64, z: SITES.DOCK.z + 30 };
  return { x: d.x + 0.5, y: d.y + 1, z: d.z - 4.5 };
};
var heli;
var flight;
var aboard = /* @__PURE__ */ new Map();
function spawnHeli(at) {
  try {
    heli = world28.getDimension("overworld").spawnEntity(ENT.helicopter, at);
    return heli;
  } catch {
    return void 0;
  }
}
function fly(from, to, ticks, yaw, done3) {
  if (flight !== void 0) system16.clearRun(flight);
  let t = 0;
  flight = system16.runInterval(() => safe("tower.fly", () => {
    t++;
    const k = Math.min(1, t / ticks);
    const e = k * k * (3 - 2 * k);
    const at = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z: from.z + (to.z - from.z) * e };
    try {
      if (heli?.isValid) heli.teleport(at, { rotation: { x: 0, y: yaw } });
    } catch {
    }
    if (t % 20 === 0) worldSound(world28.getDimension("overworld"), SND.cineRotor, at, 1.4);
    if (k >= 1) {
      if (flight !== void 0) system16.clearRun(flight);
      flight = void 0;
      done3();
    }
  }), 1);
}
function startRescue() {
  const s = st8();
  s.phase = "inbound";
  save8();
  const land = LANDING();
  const from = { x: land.x + 30, y: land.y + 45, z: land.z + 190 };
  spawnHeli(from);
  for (const p of world28.getAllPlayers()) {
    notice(p, `§bRotor noise from the south.§7 Orange and white, low over the water: the Coast Guard. It's heading for the old dock (${compass(p.location, land)}).`);
    try {
      p.onScreenDisplay.setTitle("§fDawn", { subtitle: "§7get to the dock", fadeInDuration: 20, stayDuration: 60, fadeOutDuration: 30 });
    } catch {
    }
  }
  playScene("rescue", world28.getAllPlayers(), [
    { t: 1, fade: true },
    { t: 8, cam: { at: { x: land.x - 14, y: land.y + 4, z: land.z - 10 }, look: () => heli } },
    { t: 30, title: ["§fDawn", "§7rotors over the water"], sound: [SND.cineRotor, 1] },
    { t: 90, cam: { at: { x: land.x - 8, y: land.y + 10, z: land.z + 12 }, look: () => heli, ease: 3 } },
    { t: 120, title: ["", "§6It's setting down at the old dock. Get there."] }
  ], 165, { onEnd: () => say("There! Go, go! The dock!", "rescue", 0) });
  fly(from, { x: land.x, y: land.y + 1.5, z: land.z }, 420, 180, () => {
    st8().phase = "landed";
    save8();
    for (const p of world28.getAllPlayers()) {
      unlock(p, "rescue");
      notice(p, "§7The helicopter settles beside the old dock, skids on the planks. A crewman waves you in.");
    }
  });
}
function holdLanded() {
  const s = st8();
  if (s.phase !== "landed" && s.phase !== "inbound") return;
  const land = LANDING();
  const dim2 = world28.getDimension("overworld");
  if (!heli?.isValid) {
    if (s.phase === "inbound" && flight !== void 0) return;
    try {
      if (!dim2.isChunkLoaded(land)) return;
    } catch {
      return;
    }
    if (s.phase === "inbound") {
      s.phase = "landed";
      save8();
    }
    spawnHeli({ x: land.x, y: land.y + 1.5, z: land.z });
  }
  if (s.phase !== "landed" || !heli?.isValid) return;
  try {
    heli.teleport({ x: land.x, y: land.y + 1.5, z: land.z }, { rotation: { x: 0, y: 180 } });
  } catch {
  }
  const near = world28.getAllPlayers().filter((p) => p.isValid && Math.hypot(p.location.x - land.x, p.location.z - land.z) < 7 && Math.abs(p.location.y - land.y) < 6);
  for (const p of world28.getAllPlayers()) if (!near.includes(p)) aboard.delete(p.id);
  for (const p of near) {
    const n = (aboard.get(p.id) ?? 0) + 1;
    aboard.set(p.id, n);
    if (n === 1) notice(p, "§7You climb in...");
    if (n >= 4) {
      ending();
      return;
    }
  }
}
function epilogue() {
  const out2 = [];
  const trevor = trevorEntity();
  if (trevorGone()) out2.push("§lTrevor Hale§r is buried above Crash Beach, between Dan Okafor and Ruth Lindqvist. You carved the markers yourself.");
  else if (trevor?.isValid) out2.push("§lTrevor Hale§r flew home with you, asleep before the island was out of sight. He kept the field radio.");
  else out2.push("§lTrevor Hale§r was found on the beach by the second helicopter, sunburnt and furious. He kept the field radio.");
  const sv = surveyState();
  if (sv.findings) out2.push("Your §lsurvey§r ran to two hundred and twelve pages. Varrow Island went back on the list of places nobody is allowed to go, with your readings attached.");
  else out2.push(`Your §lsurvey§r was incomplete: ${sv.stations.length} of 6 stations, ${sv.samples.length} of 4 sample types. Federal Legacy Sites marked it "inconclusive" and never paid the invoice.`);
  if (sv.heart) out2.push("Whatever lived under the crater lake is dead. Within a month the counters at the inner stations had fallen by a third.");
  else out2.push("Something is still under the crater lake. On still nights, the fishing fleet says, you can hear it from the water.");
  const cult = cultEndingState();
  if (cult.hierophantDead) out2.push("Without the Hierophant the Children of the Second Sun scattered into the mangroves. A Coast Guard landing party found eleven of them a year later. None would speak.");
  else if (cult.standing >= 60) out2.push("The Children let you go. The Seer stood on the shore as you lifted off, her blind face turned to the sun.");
  else out2.push("The Children of the Second Sun are still on Varrow. Nobody has been back.");
  return out2;
}
var ended = false;
function ending() {
  const s = st8();
  if (ended || s.phase !== "landed") return;
  ended = true;
  s.phase = "gone";
  const lines = epilogue();
  s.ending = lines.join("\n\n");
  save8();
  aboard.clear();
  const land = LANDING();
  const t = trevorEntity();
  if (t?.isValid && !trevorGone()) {
    try {
      t.teleport({ x: land.x, y: land.y, z: land.z });
    } catch {
    }
  }
  const at = (x, y, z) => ({ x, y, z });
  const up = at(land.x, land.y + 30, land.z + 20);
  const gz = SITES.GZ;
  const sun = (POINTS.shrine ?? [])[0] ?? at(SITES.SUNFALL.x, 75, SITES.SUNFALL.z);
  const crash = SITES.CRASH;
  const cap = captions();
  playScene("ending", world28.getAllPlayers(), [
    { t: 1, fade: true },
    { t: 8, cam: { at: at(land.x - 22, land.y + 9, land.z - 18), look: () => heli } },
    { t: 14, run: () => fly(at(land.x, land.y + 1.5, land.z), up, 160, 180, () => {
      fly(up, at(land.x + 40, land.y + 60, land.z + 260), 260, 165, () => {
        try {
          heli?.remove();
        } catch {
        }
      });
    }) },
    { t: 60, title: ["§fVarrow Island", "§7June 2026"], sound: [SND.cineWind, 0.8] },
    { t: 130, cam: { at: at(gz.x - 70, 120, gz.z + 70), look: at(gz.x, 58, gz.z) }, fade: true },
    { t: 135, cam: { at: at(gz.x + 40, 130, gz.z + 90), look: at(gz.x, 58, gz.z), ease: 5 } },
    { t: 150, title: cap[0] },
    { t: 230, cam: { at: at(sun.x + 40, sun.y + 35, sun.z + 50), look: at(sun.x, sun.y, sun.z) }, fade: true },
    { t: 235, cam: { at: at(sun.x - 30, sun.y + 45, sun.z + 40), look: at(sun.x, sun.y, sun.z), ease: 5 } },
    { t: 250, title: cap[1] },
    { t: 330, cam: { at: at(crash.x + 30, 90, crash.z + 40), look: at(crash.x, 64, crash.z) }, fade: true },
    { t: 335, cam: { at: at(crash.x - 20, 100, crash.z + 60), look: at(crash.x, 64, crash.z), ease: 5 } },
    { t: 350, title: cap[2] },
    { t: 430, title: cap[3] },
    { t: 510, title: ["§fTHE HOLLOW", "§7thank you for playing"] }
  ], 580, {
    returnTo: at(land.x, land.y, land.z - 3),
    onEnd: (p) => {
      unlock(p, "ending", true);
      void endingForm(p, lines);
    }
  });
  system16.runTimeout(() => {
    ended = false;
  }, 600);
}
function captions() {
  const sv = surveyState();
  const cult = cultEndingState();
  const trevor = trevorEntity();
  return [
    ["§fUnder the Lake", sv.heart ? "§7silence, at last" : "§7something still waits"],
    ["§fThe Children", cult.hierophantDead ? "§7scattered into the mangroves" : cult.standing >= 60 ? "§7let you go" : "§7still watching the sky"],
    ["§fTrevor Hale", trevorGone() ? "§7rests above Crash Beach" : trevor?.isValid ? "§7made it home" : "§7found on the beach, furious"],
    ["§fThe Survey", sv.findings ? "§7complete" : `§7${sv.stations.length}/6 stations, ${sv.samples.length}/4 samples`]
  ];
}
async function endingForm(p, lines) {
  await formSession(p, async () => {
    const form = new ActionFormData6().title("§lVarrow Island").body(lines.join("\n\n") + "\n\n§8THE HOLLOW 2.0. Thank you for playing.\n§8The island is still here, if you want to stay. The Research Log keeps this page under The Contract.");
    form.button("Stay on Varrow Island", "textures/ui/hollow/journal/place_tower");
    await showForm(p, form);
  });
  notice(p, "§7The helicopter is a speck in the south. The island is quiet. You're still here, somehow, and so is everything else.");
}
function towerSummary() {
  const s = st8();
  return `tower: gen=${s.running} valves=${s.valves}/2 wire=${s.wire}/4 battery=${s.battery}/1 phase=${s.phase} waves=${s.waves}`;
}
function towerProgress() {
  const s = st8();
  return { running: s.running, valves: s.valves, wire: s.wire, battery: s.battery, phase: s.phase, ready: ready() };
}
function forceRescue() {
  const s = st8();
  s.running = true;
  s.valves = NEED.valves;
  s.wire = NEED.wire;
  s.battery = NEED.battery;
  s.phase = "waiting";
  s.sawNight = true;
  save8();
  startRescue();
  return "rescue inbound";
}
function startTower() {
  onConsoleHook((p, key) => {
    if (key === "generator") generator(p);
    else if (key === "tower") void towerConsole(p);
  });
  every("tower.night", 900, () => isIsland() && lastNight(), 120);
  every("tower.heli", 10, () => isIsland() && holdLanded(), 5);
}

// ../../scripts_src/island/mutants.ts
import { Player as Player31, world as world29 } from "@minecraft/server";
var HOSTILE = /* @__PURE__ */ new Set([
  "minecraft:zombie",
  "minecraft:husk",
  "minecraft:drowned",
  "minecraft:skeleton",
  "minecraft:stray",
  "minecraft:bogged",
  "minecraft:spider",
  "minecraft:cave_spider",
  "minecraft:creeper",
  "minecraft:witch",
  "minecraft:slime",
  "minecraft:zombie_villager"
]);
var MEAT = {
  "minecraft:beef": 45,
  "minecraft:porkchop": 45,
  "minecraft:mutton": 45,
  "minecraft:chicken": 50,
  "minecraft:rabbit": 45,
  "minecraft:cooked_beef": 18,
  "minecraft:cooked_porkchop": 18,
  "minecraft:cooked_mutton": 18,
  "minecraft:cooked_chicken": 20,
  "minecraft:cooked_rabbit": 18,
  "minecraft:rabbit_stew": 14,
  "minecraft:rotten_flesh": 60
};
var LONG = 20 * 60 * 60 * 24 * 7;
var warned = /* @__PURE__ */ new Map();
function harden(e) {
  try {
    e.addEffect("speed", LONG, { amplifier: 0, showParticles: false });
    e.addEffect("strength", LONG, { amplifier: 0, showParticles: false });
    if (Math.random() < 0.25) e.addEffect("resistance", LONG, { amplifier: 0, showParticles: false });
  } catch {
  }
}
function ate(p, id) {
  const dose = MEAT[id];
  if (!dose) return;
  const s = radState(p);
  setDose(p, s.dose + dose);
  const last = warned.get(p.id) ?? -99999;
  if (now() - last > 20 * 60 * 5) {
    warned.set(p.id, now());
    notice(p, id.includes("cooked") || id.includes("stew") ? `§eThe counter ticks faster as you eat. §7Island meat is hot, even cooked. (+${dose} mSv)` : `§cRaw island meat. §7The counter chatters. Cook it, or eat rations. (+${dose} mSv)`);
  }
  unlock(p, "mutants");
}
function startMutants() {
  world29.afterEvents.entitySpawn.subscribe((ev) => safe("mutants.spawn", () => {
    if (!isIsland() || !ev.entity.isValid || !HOSTILE.has(ev.entity.typeId)) return;
    harden(ev.entity);
  }));
  world29.afterEvents.itemCompleteUse.subscribe((ev) => safe("mutants.eat", () => {
    if (!isIsland() || !(ev.source instanceof Player31)) return;
    ate(ev.source, ev.itemStack.typeId);
  }));
  world29.afterEvents.entityDie.subscribe((ev) => safe("mutants.kill", () => {
    if (!isIsland() || !(ev.damageSource.damagingEntity instanceof Player31)) return;
    if (ev.deadEntity.typeId.startsWith("minecraft:")) unlock(ev.damageSource.damagingEntity, "mutants");
  }));
}

// ../../scripts_src/island/objectives.ts
import { LocationWaypoint as LocationWaypoint3, WaypointTexture as WaypointTexture3, world as world30 } from "@minecraft/server";
var DEFAULT7 = { talked: false, reachedTower: false, last: "" };
var state8;
function st9() {
  if (!state8) state8 = { ...DEFAULT7, ...readWorld(DP.objective, DEFAULT7) };
  return state8;
}
function save9() {
  writeWorld(DP.objective, st9());
}
var loot = (key) => LOOT_CONTAINERS.find((c) => c.loot === key);
var point = (key) => (POINTS[key] ?? [])[0];
var xz = (v3, y = 70) => ({ x: v3.x, y, z: v3.z });
function carried(id) {
  let n = 0;
  for (const p of world30.getAllPlayers()) {
    const c = p.getComponent("minecraft:inventory")?.container;
    if (!c) continue;
    for (let i = 0; i < c.size; i++) {
      const it = c.getItem(i);
      if (it?.typeId === id) n += it.amount;
    }
  }
  return n;
}
function fuelCarried() {
  return carried("minecraft:coal") + carried("minecraft:charcoal") + carried("minecraft:coal_block") * 9;
}
function missingParts() {
  const t = towerProgress();
  const out2 = [];
  if (!t.running && fuelCarried() < 8) out2.push({ what: "8 coal or charcoal", where: "the station hut just below the tower keeps some; or burn logs into charcoal", at: loot("station6_log") });
  if (t.valves + carried(ITEM.valve) < 2) {
    out2.push({ what: "2 vacuum tubes", where: "Bunker 2's radio room. Its door is sealed: go in by the sinkhole to its west", at: point("bunker2_sinkhole") });
  }
  if (t.wire + carried(ITEM.wire) < 4) out2.push({ what: "4 copper wire", where: "the general store in the mock town (or craft it from copper ingots)", at: loot("store_wire") });
  if (t.battery + carried(ITEM.battery) < 1) out2.push({ what: "a battery bank", where: "the boathouse at the old dock", at: loot("dock_battery") });
  return out2;
}
function nearest2(p, list3) {
  let best;
  let d = Infinity;
  for (const x of list3) {
    if (!x.at) continue;
    const k = Math.hypot(x.at.x - p.location.x, x.at.z - p.location.z);
    if (k < d) {
      d = k;
      best = x;
    }
  }
  return best ?? list3[0];
}
function goalFor(p) {
  const s = st9();
  const t = towerProgress();
  if (t.phase === "gone") {
    const sv = surveyState();
    const left = [];
    if (!sv.findings) left.push(`the survey (${sv.stations.length}/6 stations, ${sv.samples.length}/4 samples)`);
    if (!sv.heart) left.push("the thing under the crater lake");
    return {
      key: "free",
      title: "Explore Varrow Island",
      detail: left.length ? `Still unfinished: ${left.join(" and ")}.` : "There's nothing left you have to do here.",
      trevor: "We made it. Anything else we do here, we do because we want to."
    };
  }
  if (t.phase === "inbound" || t.phase === "landed") {
    return {
      key: "dock",
      title: "Get to the old dock",
      detail: "The helicopter is setting down there. Stand next to it to leave.",
      target: point("dock_end") ?? xz(SITES.DOCK),
      trevor: "The dock! Run!"
    };
  }
  if (t.phase === "waiting") {
    return {
      key: "night",
      title: "Survive until dawn",
      detail: "The lamp is lit. Hold out until morning, then go to the old dock on the south-east shore.",
      target: point("dock_end") ?? xz(SITES.DOCK),
      trevor: isDarkHours() ? "Stay close, keep your back to something. Dawn's coming." : "First light. Then the dock. Let's not be late."
    };
  }
  if (!s.talked && !trevorGone()) {
    const e = trevorEntity();
    return {
      key: "talk",
      title: "Talk to Trevor",
      detail: "Walk up to him and press Use. Search the crates by the wreck and the crew for supplies.",
      target: e?.isValid ? e.location : xz(SITES.CRASH, 65),
      trevor: ""
    };
  }
  if (!s.reachedTower) {
    const camp = campPos();
    const night = (isDusk() || isDarkHours()) && !camp;
    return {
      key: "tower",
      title: "Reach the radio tower on the north peak",
      detail: night ? "It's getting dark. Ask Trevor to Make camp (then Build a lean-to), or keep to the fires at the wreck until morning." : "The 1957 relay mast on the grey ridge to the north. Follow the gold marker.",
      target: xz(SITES.TOWER, 160),
      trevor: night ? "It's getting dark. We should make camp and go north in the morning." : "North peak. That mast. If anything on this island can still talk to the mainland, it's that."
    };
  }
  if (!t.ready) {
    const parts = missingParts();
    if (!parts.length) {
      return {
        key: "install",
        title: t.running ? "Fit the parts at the tower" : "Fuel the generator at the tower",
        detail: t.running ? "Press the button in the hut at the foot of the mast." : "Press the button by the generator in the shed next to the hut (8 coal or charcoal).",
        target: t.running ? CONSOLES.tower : CONSOLES.generator,
        trevor: "We've got everything. Back to the tower."
      };
    }
    const next = p ? nearest2(p, parts) : parts[0];
    return {
      key: `parts:${parts.map((x) => x.what).join(",")}`,
      title: "Repair the transmitter",
      detail: `Still needed: ${parts.map((x) => x.what).join(", ")}. Nearest: ${next?.what} — ${next?.where}.`,
      target: next?.at,
      trevor: `We still need ${next?.what}. ${next?.where[0].toUpperCase()}${next?.where.slice(1)}.`
    };
  }
  return {
    key: "transmit",
    title: "Transmit from the tower",
    detail: "Everything is fitted. Press the button in the hut and choose Transmit.",
    target: CONSOLES.tower,
    trevor: "That's all of it. Let's make the call."
  };
}
var marks2 = /* @__PURE__ */ new Map();
function place2(p, which, at) {
  const m = marks2.get(p.id) ?? {};
  marks2.set(p.id, m);
  const old = which === "main" ? m.main : m.side;
  const oldAt = which === "main" ? m.at : m.sideAt;
  if (at && oldAt && Math.hypot(at.x - oldAt.x, at.z - oldAt.z) < 4 && old?.isValid) return;
  try {
    if (old?.isValid) p.locatorBar.removeWaypoint(old);
  } catch {
  }
  if (which === "main") {
    m.main = void 0;
    m.at = void 0;
  } else {
    m.side = void 0;
    m.sideAt = void 0;
  }
  if (!at) return;
  try {
    const wp = new LocationWaypoint3(
      { dimension: world30.getDimension("overworld"), x: at.x + 0.5, y: at.y, z: at.z + 0.5 },
      { textureBoundsList: [{ lowerBound: 0, texture: which === "main" ? WaypointTexture3.Circle : WaypointTexture3.SmallSquare }] },
      which === "main" ? { red: 1, green: 0.72, blue: 0.15 } : { red: 0.85, green: 0.9, blue: 1 }
    );
    p.locatorBar.addWaypoint(wp);
    if (which === "main") {
      m.main = wp;
      m.at = at;
    } else {
      m.side = wp;
      m.sideAt = at;
    }
  } catch {
  }
}
function nearestStation(p) {
  const done3 = surveyState().stations;
  let best;
  let d = Infinity;
  for (const [k, at] of Object.entries(STATIONS)) {
    if (done3.includes(k)) continue;
    const c = CONSOLES[k] ?? xz(at);
    const k2 = Math.hypot(c.x - p.location.x, c.z - p.location.z);
    if (k2 < d) {
      d = k2;
      best = c;
    }
  }
  return best;
}
function where(p, at) {
  if (!at) return "";
  const d = Math.round(Math.hypot(at.x - p.location.x, at.z - p.location.z));
  return d < 8 ? " §7(here)" : ` §7(${d} m ${compass(p.location, at)})`;
}
var lastReminder = /* @__PURE__ */ new Map();
function refresh() {
  if (!isIsland() || cinematicRunning()) return;
  const s = st9();
  if (!s.reachedTower && world30.getAllPlayers().some((p) => Math.hypot(p.location.x - SITES.TOWER.x, p.location.z - SITES.TOWER.z) < 40)) {
    s.reachedTower = true;
    save9();
  }
  const announce = goalFor();
  const changed = announce.key !== s.last;
  if (changed) {
    const first = s.last === "";
    const prev = s.last;
    s.last = announce.key;
    save9();
    const partsOnly = announce.key.startsWith("parts:") && prev.startsWith("parts:");
    if (!first || announce.key !== "talk") {
      for (const p of world30.getAllPlayers()) {
        if (getNum(p, DP.woke, 0) !== 1) continue;
        const g = goalFor(p);
        if (partsOnly) {
          p.sendMessage(`§6Transmitter: §7${g.detail}`);
          ui(p, "random.orb", 0.5, 1.2);
          continue;
        }
        p.sendMessage(`§6Objective: §f${g.title}
§7${g.detail}`);
        if (!sceneRunning()) {
          try {
            p.onScreenDisplay.setTitle("§6New objective", { subtitle: `§f${g.title}`, fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 20 });
          } catch {
          }
        }
        ui(p, "random.levelup", 0.4, 1.6);
      }
    }
  }
  for (const p of world30.getAllPlayers()) {
    if (!p.isValid || getNum(p, DP.woke, 0) !== 1 || p.dimension.id !== "minecraft:overworld") continue;
    const g = goalFor(p);
    place2(p, "main", g.target);
    place2(p, "side", g.key === "free" || surveyState().stations.length < 6 ? nearestStation(p) : void 0);
    const last = lastReminder.get(p.id) ?? 0;
    if (now() - last > 1300 && now() - lastNoticeAt(p) > 200 && !sceneRunning()) {
      lastReminder.set(p.id, now());
      try {
        p.onScreenDisplay.setActionBar(`§6▶ ${g.title}${where(p, g.target)}`);
      } catch {
      }
    }
  }
}
function objectiveHeader(p) {
  if (!isIsland()) return "";
  const g = goalFor(p);
  return `§6Objective: §f${g.title}${where(p, g.target)}
§7${g.detail}

`;
}
function objectiveSummary() {
  const g = goalFor();
  return `objective: ${g.key}`;
}
function forgetObjectives(playerId) {
  marks2.delete(playerId);
  lastReminder.delete(playerId);
}
function startObjectives() {
  world30.afterEvents.playerInteractWithEntity.subscribe((ev) => safe("obj.talk", () => {
    if (ev.target.typeId === ENT.trevor && !st9().talked) {
      st9().talked = true;
      save9();
    }
  }));
  setLogHeader(objectiveHeader);
  setObjectiveVoice((p) => {
    if (!isIsland()) return void 0;
    const g = goalFor(p);
    return g.trevor || void 0;
  });
  every("objectives", 40, refresh, 11);
}

// ../../scripts_src/island/story.ts
import { ItemStack as ItemStack14, system as system17, world as world31 } from "@minecraft/server";
var DEFAULT8 = { setup: false, bodies: [], searched: [], intro: false };
var story;
function st10() {
  if (!story) story = { ...DEFAULT8, ...readWorld(DP.story, DEFAULT8) };
  return story;
}
function save10() {
  writeWorld(DP.story, st10());
}
var SUPPLIES = [
  [[ITEM.ration, 4], [ITEM.medkit, 2], [ITEM.round, 14], [ITEM.iodine, 4]],
  [[ITEM.hatchet, 1], [ITEM.brokenRadio, 1], [ITEM.ration, 2], [ITEM.round, 7]],
  [[ITEM.medkit, 1], [ITEM.ration, 3], [ITEM.iodine, 2], [ITEM.round, 7], [ITEM.sampleKit, 3]]
];
function stockCrates() {
  const dim2 = world31.getDimension("overworld");
  let ok = true;
  CRASH_CONTAINERS.forEach((pos, i) => {
    try {
      if (!dim2.isChunkLoaded(pos)) {
        ok = false;
        return;
      }
      const c = dim2.getBlock(pos)?.getComponent("minecraft:inventory")?.container;
      if (!c) return;
      for (const [id, n] of SUPPLIES[i % SUPPLIES.length]) c.addItem(new ItemStack14(id, n));
    } catch {
      ok = false;
    }
  });
  return ok;
}
function layBodies() {
  const dim2 = world31.getDimension("overworld");
  const ids = [];
  CREW_BODIES.slice(0, 2).forEach((b, i) => {
    try {
      const e = dim2.spawnEntity(ENT.crewBody, { x: b.x + 0.5, y: b.y, z: b.z + 0.5 });
      e.triggerEvent(i === 0 ? "hollow:pilot" : "hollow:copilot");
      e.setRotation({ x: 0, y: i === 0 ? 120 : -40 });
      ids.push(e.id);
    } catch {
    }
  });
  return ids;
}
function setupWorld() {
  const s = st10();
  if (s.setup) return;
  const dim2 = world31.getDimension("overworld");
  if (!dim2.isChunkLoaded({ x: SITES.CRASH.x, y: SPAWN_POINT.y, z: SITES.CRASH.z })) {
    later("story.setup", 40, setupWorld);
    return;
  }
  if (!stockCrates()) {
    later("story.setup", 40, setupWorld);
    return;
  }
  s.bodies = layBodies();
  s.setup = true;
  save10();
  const at = groundNear(dim2, SPAWN_POINT.x + 2, SPAWN_POINT.y, SPAWN_POINT.z - 2, 8) ?? { x: SPAWN_POINT.x + 2, y: SPAWN_POINT.y, z: SPAWN_POINT.z - 2 };
  setHome(SPAWN_POINT);
  if (!trevorGone()) spawnTrevor(at);
}
function issueKit(p) {
  ensureJournal(p);
  const geiger = new ItemStack14(ITEM.geiger, 1);
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
var pending2 = /* @__PURE__ */ new Set();
function wakeUp(p, first) {
  pending2.delete(p.id);
  if (!p.isValid || getNum(p, DP.woke, 0) === 1) return;
  setNum(p, DP.woke, 1);
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
  const step3 = (ticks, fn) => later("story.wake", ticks, () => p.isValid && fn());
  if (first) {
    step3(50, () => {
      ui(p, SND.titleHit, 0.9);
      p.onScreenDisplay.setTitle("§lVARROW ISLAND", {
        subtitle: "§7South Pacific  ·  2026",
        fadeInDuration: 30,
        stayDuration: 90,
        fadeOutDuration: 40
      });
    });
    step3(170, () => ui(p, SND.gasp, 0.9));
    step3(230, () => say("...hey. Hey! You're alive. Good. No, don't get up yet.", "wake1", 200));
    step3(330, () => say("Dan's gone. Ruth too. Someone was §lshooting§r at us from the trees. I saw the flashes.", "wake2", 200));
    step3(450, () => {
      say("Get what you can out of the wreck before it all goes up. Rations, medkits, rounds. Your kit's here. Take it.", "wake3", 200);
      issueKit(p);
      unlock(p, "contract", true);
      unlock(p, "crash");
    });
    step3(600, () => say("Radio's cracked in half. Nobody's coming for us. We need shelter before dark, then we find a way to call out ourselves.", "wake4", 200));
    step3(640, () => notice(p, "§7Talk to §fTrevor§7 (Use on him). Read your §fResearch Log§7. Search the §fcrates§7 by the wreck."));
  } else {
    step3(60, () => ui(p, SND.gasp, 0.8));
    step3(100, () => {
      say(`${p.name}! Thank God. You were thrown clear down the beach. Here, your kit. Crates are by the wreck.`, `late:${p.id}`, 100);
      issueKit(p);
      unlock(p, "contract", true);
      unlock(p, "crash");
    });
  }
  later("story.follow", first ? 470 : 120, () => {
    if (!p.isValid) return;
    const e = trevorEntity();
    if (e && !st10().intro) {
      st10().intro = true;
      save10();
      orderFollow(p, true);
    }
  });
}
function onIslandSpawn(p, initial) {
  if (!isIsland() && !(initial && detectIsland(p.dimension))) return;
  setupWorld();
  if (needsRestore(p)) {
    leave(p);
    if (initial && getNum(p, DP.woke, 0) !== 1) {
      pending2.add(p.id);
      const wait = () => {
        if (!p.isValid) return;
        if (cinematicRunning()) later("story.wait", 20, wait);
        else wakeUp(p, false);
      };
      later("story.wait", 20, wait);
      return;
    }
  }
  if (!initial) {
    later("story.respawn", 20, () => p.isValid && ensureJournal(p));
    return;
  }
  if (getNum(p, DP.woke, 0) === 1 || pending2.has(p.id)) {
    later("story.rejoin", 40, () => p.isValid && ensureJournal(p));
    return;
  }
  pending2.add(p.id);
  const first = !st10().intro && !anyoneAwake(p);
  if (first && !cinematicDone() && !cinematicRunning()) {
    later("story.cine", 30, () => {
      const group = world31.getAllPlayers().filter((q) => q.isValid && q.dimension.id === "minecraft:overworld");
      if (!playCinematic(group, (q) => wakeUp(q, true))) wakeUp(p, true);
    });
    return;
  }
  if (cinematicRunning()) {
    if (joinCinematic(p)) {
      pending2.delete(p.id);
      return;
    }
    const wait = () => {
      if (!p.isValid) return;
      if (cinematicRunning()) later("story.wait", 20, wait);
      else wakeUp(p, false);
    };
    later("story.wait", 20, wait);
    return;
  }
  later("story.wake", 20, () => p.isValid && wakeUp(p, first));
}
function anyoneAwake(except) {
  return world31.getAllPlayers().some((q) => q.id !== except.id && getNum(q, DP.woke, 0) === 1);
}
function searchBody(p, body) {
  const s = st10();
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
    if (first) giveOrDrop(p, new ItemStack14(ITEM.round, 7));
  } else {
    notice(p, "§7Ruth Lindqvist, the co-pilot. §8A notebook in her vest, and a medkit she never got to open.");
    unlock(p, "lindqvist");
    if (first) giveOrDrop(p, new ItemStack14(ITEM.medkit, 1));
  }
  if (first) {
    s.searched.push(body.id);
    save10();
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
  if (d(SITES.MOCK_TOWN) < 50) unlock(p, "place_town");
  if (d(SITES.PENS) < 32) unlock(p, "place_pens");
  if (d(SITES.SUNFALL) < 60) unlock(p, "place_sunfall");
  if (d(SITES.MANGROVES) < 50) unlock(p, "place_mangroves");
  if (d(SITES.TOWER) < 44) unlock(p, "place_tower");
  if (d(SITES.DOCK) < 40) unlock(p, "place_dock");
  if (d(SITES.BLACKWOOD) < 44) unlock(p, "place_bleachers");
  if (Object.values(BUNKERS).some((b) => d(b) < 24)) unlock(p, "place_bunkers");
  const held = heldItem(p);
  if (held === ITEM.sampleKit) unlock(p, "gear_samples", true);
  else if (held === ITEM.chelation) unlock(p, "gear_chelation", true);
  if (suitProtection(p) > 0) unlock(p, "gear_hazmat", true);
  if (d(SITES.GZ) < CRATER_R + 70) {
    if (unlock(p, "place_crater")) say("That's Ground Zero. Keep your counter out and your visit short.", "gz", 12e3);
  }
}
function startStory() {
  world31.afterEvents.playerInteractWithEntity.subscribe((ev) => safe("story.search", () => {
    if (ev.target.typeId === ENT.crewBody) searchBody(ev.player, ev.target);
  }));
  everyPlayer("story.places", 100, places);
  system17.run(() => safe("story.resume", () => {
    if (isIsland()) setupWorld();
  }));
}
function storySummary() {
  const s = st10();
  return `story: island=${isIsland()} setup=${s.setup} bodies=${s.bodies.length} searched=${s.searched.length} intro=${s.intro}`;
}
function giveIslandKit(p) {
  issueKit(p);
}

// ../../scripts_src/main.ts
system18.beforeEvents.startup.subscribe((ev) => {
  registerItemComponents(ev);
  registerBlockComponents(ev);
  registerGearComponents(ev);
  registerSurveyComponents(ev);
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
  startJobs();
  startLeaves();
  startCult();
  startSurvey();
  startTower();
  startScenes();
  startCinematic();
  startMutants();
  startObjectives();
  startStory();
  later("sweep", 40, sweepLoaded);
  console.warn(`[hollow] THE HOLLOW initialised (day ${hollowDay()}).`);
}
world32.afterEvents.worldLoad.subscribe(() => safe("init", init));
world32.afterEvents.playerSpawn.subscribe((ev) => safe("playerSpawn", () => {
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
  forgetObjectives(playerId);
}
world32.beforeEvents.playerLeave.subscribe((ev) => {
  const id = ev.player.id;
  system18.run(() => safe("playerLeave", () => {
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
world32.afterEvents.playerDimensionChange.subscribe((ev) => safe("dimChange", () => {
  rt(ev.player).ctx = void 0;
  forgetEncounters(ev.player.id);
  forgetBossPlayer(ev.player);
  clearAllFog(ev.player);
}));
world32.afterEvents.entityHurt.subscribe((ev) => safe("entityHurt", () => {
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
  if (hurt2 instanceof Player34 && by?.typeId === ENT.watcher) onWatcherStruck(by, hurt2);
  if (hurt2 instanceof Player34 && by?.typeId.startsWith("hollow:")) frighten(hurt2, 8);
  if (hurt2.typeId === ENT.heart || hurt2.typeId === ENT.vein) onBossHurt(hurt2, ev.damage, by);
}));
world32.afterEvents.entityDie.subscribe((ev) => safe("entityDie", () => {
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
world32.afterEvents.dataDrivenEntityTrigger.subscribe((ev) => safe("ddTrigger", () => {
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
      world32.setTimeOfDay(13e3);
      return "dusk (13000)";
    case "midnight":
      world32.setTimeOfDay(18e3);
      return "midnight (18000)";
    case "day":
      world32.setTimeOfDay(1e3);
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
      for (const [id, n] of kit) giveOrDrop(p, new ItemStack15(id, n));
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
    case "cinematic":
      return replayCinematic(p);
    case "rescue":
      return forceRescue();
    case "shot":
      return skipToShot();
    case "cultspawn": {
      const at = p.location;
      for (const t of [ENT.zealot, ENT.faithful, ENT.seer]) p.dimension.spawnEntity(t, { x: at.x + 3, y: at.y, z: at.z + 3 });
      return "zealot, faithful and seer spawned";
    }
    case "rad":
      return `dose ${Math.round(radState(p).dose)} mSv`;
    default:
      if (arg.startsWith("standing")) {
        const v3 = Number(arg.slice(8).trim());
        return Number.isFinite(v3) ? setStanding(v3) : "usage: /scriptevent hollow:test standing <-100..100>";
      }
      if (arg.startsWith("dose")) {
        const v3 = Number(arg.slice(4).trim());
        if (!Number.isFinite(v3)) return "usage: /scriptevent hollow:test dose <0-3000>";
        setDose(p, v3);
        return `dose set to ${v3} mSv`;
      }
      if (arg.startsWith("dread")) {
        const v3 = Number(arg.slice(5).trim());
        return Number.isFinite(v3) ? setDread(p, v3) : "usage: /scriptevent hollow:test dread <0-100>";
      }
      return "usage: /scriptevent hollow:test on|off|night|midnight|day|kit|journal|knocker|boss2|boss3|eye|lantern|roof|phantom|dread <0-100>|island|forest|islandkit|trevordown|cinematic|cultspawn|standing <n>|rescue|rad|dose <mSv>";
  }
}
function nearestPlayer(e, r) {
  try {
    return e.dimension.getPlayers({ location: e.location, maxDistance: r, closest: 1 })[0];
  } catch {
    return void 0;
  }
}
system18.afterEvents.scriptEventReceive.subscribe((ev) => safe("scriptevent", () => {
  const p = ev.sourceEntity;
  if (!(p instanceof Player34)) return;
  switch (ev.id) {
    case "hollow:journal":
      void openJournal(p);
      return;
    case "hollow:status":
      if (!isOperator(p)) return;
      p.sendMessage(
        `§7[hollow] day ${hollowDay()} · watcher ${watcherCount()} · borrowed ${borrowedCount()} · hollowed ${hollowedCount()} · mirebound ${mireboundCount()} · knocker ${knockerActive() ? 1 : 0} · heart ${bossSummary()} · dread ${dreadSummary()} · ${storySummary()} · ${trevorSummary()} · ${jobSummary()} · ${cultSummary()} · ${surveySummary()} · ${towerSummary()} · ${objectiveSummary()} · ${cinematicSummary()} · failures: ${failureReport()}`
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
