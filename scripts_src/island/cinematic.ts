import {
  BlockVolume, CameraShakeType, EasingType, Entity, GameMode, HudVisibility, InputPermissionCategory, LocationWaypoint,
  MolangVariableMap, Player, Vector3, WaypointTexture, system, world,
} from "@minecraft/server";
import { CONSOLES, POINTS, SITES, SPAWN_POINT } from "../content/island_layout";
import { DP, ENT, PARTICLE, SND } from "../core/ids";
import { safe } from "../core/scheduler";
import { readEntity, writeEntity } from "../core/store";

// THE OPENING
//
// Part one is played, not watched. 7 May 1957: you are a radiological safety officer on the test
// island an hour before Operation SUNLAMP. Check the dosimeters in two instrument huts, set the
// timer at the foot of the tower, and get into the observation bunker on the south shore.
// (Everyone who is online plays it together, in Adventure mode; nothing can hurt you.)
//
// Part two is the shot, through your own eyes from the bunker's viewing slit: the bomber, the drop,
// the countdown, the yield telemetry coming in three times too high, the flash. You don't survive it.
//
// Part three is what the fleet saw: the fireball, the mushroom cloud climbing, the boom arriving late,
// the shock wave over the water, the crater and the island burning. Then 2026: the charter helicopter
// comes in low, and someone in the trees opens fire.
//
// All of it happens on a pristine copy of the test site the world file keeps far out at sea.
// Hold Sneak for two seconds at any point to skip (per player).

interface Restore {
  gm: string;
  x: number;
  y: number;
  z: number;
}

const D = { x: SITES.DIORAMA.x, z: SITES.DIORAMA.z };
const GROUND = 66;                                   // the diorama's ground level (diorama.py CENTER_Y)
const BURST: Vector3 = { x: D.x, y: GROUND + 65, z: D.z };
const C = SITES.CRASH;
const L_SEA = 62;
const v = (x: number, y: number, z: number): Vector3 => ({ x, y, z });
const pt = (k: string, fallback: Vector3): Vector3 => (POINTS[k] ?? [])[0] ?? fallback;
const START = (): Vector3 => pt("pro_start", v(D.x - 6, GROUND + 1, D.z - 40));
const BUNKER = (): Vector3 => pt("pro_bunker", v(D.x, GROUND - 1, D.z + 42));
const SLIT = (): Vector3 => pt("pro_slit", v(D.x, GROUND + 1, D.z + 39));
const TASKS: [string, string][] = [["pro_hut1", "the dosimeter in the east hut"], ["pro_hut2", "the dosimeter in the south-west hut"],
  ["pro_hut3", "the dosimeter in the north-west hut"], ["pro_tower", "the firing timer at the foot of the tower"]];

type Phase = "idle" | "prologue" | "shot";
let phase: Phase = "idle";
let tick = 0;
let proTick = 0;
let crashY = SPAWN_POINT.y - 1;
let viewers: Player[] = [];
const done = new Set<string>();
const sneakTicks = new Map<string, number>();
const skipped = new Set<string>();
const props = new Map<string, Entity>();
const marks = new Map<string, LocationWaypoint>();
let onFinish: ((p: Player) => void) | undefined;
let caption: { text: string; until: number } | undefined;
let loop: number | undefined;

export function cinematicRunning(): boolean {
  return phase !== "idle";
}

export function cinematicDone(): boolean {
  return world.getDynamicProperty(DP.cine) === 1;
}

// ------------------------------------------------------------------------- players

function remember(p: Player): void {
  if (needsRestore(p)) return;                       // keep the first snapshot (the real one)
  const r: Restore = { gm: p.getGameMode(), x: p.location.x, y: p.location.y, z: p.location.z };
  writeEntity(p, DP.cineRestore, r);
}

/** Spectator, camera locked, HUD hidden; remembers how to put the player back (see leave). */
export function enterScene(p: Player, anchor: Vector3): void {
  enter(p, anchor);
}

function enter(p: Player, anchor: Vector3): void {
  remember(p);
  try {
    p.setGameMode(GameMode.Spectator);
    p.teleport(anchor);
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
    p.onScreenDisplay.hideAllExcept([]);
  } catch {
    /* ignore */
  }
}

/** Put a player back exactly as they were (also used on rejoin after a crash mid-scene). */
export function leave(p: Player, at?: Vector3): void {
  const r = readEntity<Restore | undefined>(p, DP.cineRestore, undefined as unknown as Restore);
  try {
    p.camera.clear();
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);
    p.onScreenDisplay.setHudVisibility(HudVisibility.Reset);
    p.onScreenDisplay.setActionBar(" ");
    for (const e of ["resistance", "saturation", "weakness"]) p.removeEffect(e);
  } catch {
    /* ignore */
  }
  const m = marks.get(p.id);
  if (m) {
    try {
      p.locatorBar.removeWaypoint(m);
    } catch {
      /* ignore */
    }
    marks.delete(p.id);
  }
  if (r && typeof r.gm === "string") {
    try {
      p.setGameMode(r.gm as GameMode);
      p.teleport(at ?? { x: r.x, y: r.y, z: r.z });
    } catch {
      /* ignore */
    }
  }
  p.setDynamicProperty(DP.cineRestore, undefined);
}

export function needsRestore(p: Player): boolean {
  return typeof p.getDynamicProperty(DP.cineRestore) === "string";
}

function watching(): Player[] {
  viewers = viewers.filter((p) => p.isValid && !skipped.has(p.id) && needsRestore(p));
  return viewers;
}

function each(fn: (p: Player) => void): void {
  for (const p of watching()) {
    try {
      fn(p);
    } catch {
      /* ignore */
    }
  }
}

function cam(location: Vector3, facing: Vector3 | Entity | undefined, ease = 0, type = EasingType.InOutSine): void {
  if (!facing) return;
  each((p) => {
    const easeOptions = ease > 0 ? { easeTime: ease, easeType: type } : undefined;
    if (facing instanceof Entity) {
      if (facing.isValid) p.camera.setCamera("minecraft:free", { location, facingEntity: facing, easeOptions });
    } else {
      p.camera.setCamera("minecraft:free", { location, facingLocation: facing, easeOptions });
    }
  });
}

function fade(r: number, g: number, b: number, fadeIn: number, hold: number, fadeOut: number): void {
  each((p) => p.camera.fade({ fadeColor: { red: r, green: g, blue: b }, fadeTime: { fadeInTime: fadeIn, holdTime: hold, fadeOutTime: fadeOut } }));
}

function title(text: string, sub: string, stay = 100): void {
  each((p) => p.onScreenDisplay.setTitle(text, { subtitle: sub, fadeInDuration: 20, stayDuration: stay, fadeOutDuration: 30 }));
}

/** A caption that stays on screen (the action bar is re-sent until it expires). */
function say(text: string, ticks = 110): void {
  caption = { text, until: tick + ticks };
  each((p) => p.onScreenDisplay.setActionBar(text));
}

function sound(id: string, volume = 1, pitch = 1): void {
  each((p) => p.playSound(id, { volume, pitch }));
}

function shake(intensity: number, seconds: number): void {
  each((p) => {
    try {
      p.camera.addShake({ intensity, duration: seconds, type: CameraShakeType.Positional });
    } catch {
      p.runCommand(`camerashake add @s ${intensity} ${seconds} positional`);
    }
  });
}

function anchor(at: Vector3): void {
  each((p) => p.teleport(at));
}

// ------------------------------------------------------------------------- props

function spawn(key: string, type: string, at: Vector3): Entity | undefined {
  try {
    const e = world.getDimension("overworld").spawnEntity(type, at);
    props.set(key, e);
    return e;
  } catch {
    return undefined;
  }
}

function move(key: string, at: Vector3, yaw: number, pitch = 0): void {
  const e = props.get(key);
  if (!e?.isValid) return;
  try {
    e.teleport(at, { rotation: { x: pitch, y: yaw } });
  } catch {
    /* chunk gone */
  }
}

function drop(key: string): void {
  const e = props.get(key);
  props.delete(key);
  try {
    if (e?.isValid) e.remove();
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------------- the blast's marks on the land

function fill(from: Vector3, to: Vector3, block: string, only?: string[]): void {
  try {
    world.getDimension("overworld").fillBlocks(new BlockVolume(from, to), block,
      only ? { blockFilter: { includeTypes: only }, ignoreChunkBoundErrors: true } : { ignoreChunkBoundErrors: true });
  } catch {
    /* unloaded or too big */
  }
}

const LEAVES = ["minecraft:oak_leaves", "minecraft:jungle_leaves", "minecraft:spruce_leaves", "minecraft:birch_leaves", "minecraft:dark_oak_leaves"];
const LOGS = ["minecraft:oak_log", "minecraft:jungle_log", "minecraft:spruce_log", "minecraft:birch_log", "minecraft:dark_oak_log"];
const PLANTS = ["minecraft:short_grass", "minecraft:tall_grass", "minecraft:fern", "minecraft:large_fern", "minecraft:poppy", "minecraft:dandelion"];

/** The crater, the vaporised tower, and everything scorched for sixty blocks: run during the white-out. */
function scar(): void {
  const R = 24;
  let col = 0;
  const cols: [number, number, number][] = [];
  for (let dx = -R - 6; dx <= R + 6; dx++) {
    for (let dz = -R - 6; dz <= R + 6; dz++) {
      const d = Math.hypot(dx, dz);
      if (d <= R + 6) cols.push([dx, dz, d]);
    }
  }
  fill(v(D.x - 3, GROUND + 1, D.z - 3), v(D.x + 3, GROUND + 33, D.z + 3), "minecraft:air");   // the tower, vaporised
  const job = system.runInterval(() => safe("cine.crater", () => {
    for (let k = 0; k < 300 && col < cols.length; k++, col++) {
      const [dx, dz, d] = cols[col];
      const x = D.x + dx;
      const z = D.z + dz;
      if (d < R) {
        const depth = Math.round(11 * (1 - (d / R) ** 2)) + 1;
        const floor = GROUND - depth;
        fill(v(x, floor + 1, z), v(x, GROUND + 2, z), "minecraft:air");
        const glass = d < R * 0.55 ? (Math.random() < 0.5 ? "minecraft:green_stained_glass" : "minecraft:lime_stained_glass") : "minecraft:blackstone";
        fill(v(x, floor - 1, z), v(x, floor, z), glass);
      } else {
        const lip = Math.round(2.5 * (1 - (d - R) / 6));
        if (lip > 0) fill(v(x, GROUND + 1, z), v(x, GROUND + lip, z), Math.random() < 0.6 ? "minecraft:coarse_dirt" : "minecraft:gravel");
      }
    }
    if (col >= cols.length) {
      system.clearRun(job);
      scorch();
    }
  }), 1);
}

function scorch(): void {
  const R = 72;
  for (let x0 = -R; x0 < R; x0 += 24) {
    for (let z0 = -R; z0 < R; z0 += 24) {
      const a = v(D.x + x0, GROUND - 6, D.z + z0);
      const b = v(D.x + x0 + 23, GROUND + 6, D.z + z0 + 23);
      fill(a, b, "minecraft:coarse_dirt", ["minecraft:grass_block"]);
      fill(v(a.x, GROUND - 6, a.z), v(b.x, GROUND + 30, b.z), "minecraft:air", [...LEAVES, ...PLANTS]);
      fill(v(a.x, GROUND - 6, a.z), v(b.x, GROUND + 30, b.z), "minecraft:basalt", LOGS);
    }
  }
}

function setFires(n0: number): void {
  const dim = world.getDimension("overworld");
  let n = 0;
  for (let i = 0; i < 400 && n < n0; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 26 + Math.random() * 44;
    const x = Math.floor(D.x + Math.cos(a) * r);
    const z = Math.floor(D.z + Math.sin(a) * r);
    try {
      const top = dim.getTopmostBlock({ x, z });
      if (!top || top.location.y < L_SEA || top.isLiquid) continue;
      const above = dim.getBlock({ x, y: top.location.y + 1, z });
      if (above?.isAir) {
        above.setType("minecraft:fire");
        n++;
      }
    } catch {
      /* unloaded */
    }
  }
}

// ------------------------------------------------------------------------- the cloud's billows

/** Big soft puffs over the model, following its growth (see animations.py mushroom_cloud.bloom). */
function billow(age: number): void {
  const dim = world.getDimension("overworld");
  const px = 2.5;                                                    // blocks per model pixel
  const capY = BURST.y + (-22 + Math.min(22, Math.max(0, age - 1.5) * 1.55)) * px + 22 * px;
  const capS = age < 1.5 ? 0 : Math.min(1, 0.3 + (age - 1.5) * 0.055);
  const stemTop = (GROUND - 1) + Math.min(1, Math.max(0, (age - 2) / 14)) * (capY - GROUND);
  const puffs: [Vector3, number, number, number, number, number, number][] = [];
  const gray = Math.max(0, Math.min(1, (age - 6) / 20));
  for (let i = 0; i < 6 && capS > 0; i++) {                           // the cap's rolling rim
    const a = Math.random() * Math.PI * 2;
    const r = (8 + Math.random() * 18) * capS * px;
    const hot = 1 - gray;
    puffs.push([v(D.x + Math.cos(a) * r, capY + (Math.random() - 0.4) * 9 * capS * px * 0.4, D.z + Math.sin(a) * r),
      14 + Math.random() * 12, 0.85 - 0.25 * hot * Math.random(), 0.62 + 0.2 * gray, 0.45 + 0.3 * gray, 8, 0.25]);
  }
  for (let i = 0; i < 3 && age > 2; i++) {                           // the column
    const y = GROUND + Math.random() * Math.max(1, stemTop - GROUND);
    puffs.push([v(D.x + (Math.random() - 0.5) * 12, y, D.z + (Math.random() - 0.5) * 12), 10 + Math.random() * 6,
      0.72, 0.68, 0.64, 7, 0.6]);
  }
  if (age > 2 && age < 22) {                                         // the base surge
    const a = Math.random() * Math.PI * 2;
    const r = Math.min(60, 10 + (age - 2) * 4.5);
    puffs.push([v(D.x + Math.cos(a) * r, GROUND + 2, D.z + Math.sin(a) * r), 12, 0.8, 0.78, 0.74, 6, 0.1]);
  }
  for (const [at, size, r, g, b, life, rise] of puffs) {
    try {
      const m = new MolangVariableMap();
      m.setFloat("variable.size", size);
      m.setFloat("variable.r", r);
      m.setFloat("variable.g", g);
      m.setFloat("variable.b", b);
      m.setFloat("variable.life", life);
      m.setFloat("variable.rise", rise);
      dim.spawnParticle(PARTICLE.nukePuff, at, m);
    } catch {
      /* unloaded */
    }
  }
  if (age < 8) {
    try {
      const m = new MolangVariableMap();
      m.setFloat("variable.size", 40 - age * 3);
      m.setFloat("variable.life", 1.5);
      m.setFloat("variable.rise", 2);
      dim.spawnParticle(PARTICLE.nukeGlow, v(BURST.x, BURST.y + Math.max(0, age - 1) * 5.5, BURST.z), m);
    } catch {
      /* unloaded */
    }
  }
}

// ------------------------------------------------------------------------- part one: the morning of the shot

function mark(p: Player, at: Vector3 | undefined): void {
  const old = marks.get(p.id);
  try {
    if (old) p.locatorBar.removeWaypoint(old);
  } catch {
    /* ignore */
  }
  marks.delete(p.id);
  if (!at) return;
  try {
    const wp = new LocationWaypoint({ dimension: p.dimension, x: at.x + 0.5, y: at.y, z: at.z + 0.5 },
      { textureBoundsList: [{ lowerBound: 0, texture: WaypointTexture.Circle }] }, { red: 1, green: 0.72, blue: 0.15 });
    p.locatorBar.addWaypoint(wp);
    marks.set(p.id, wp);
  } catch {
    /* locator bar off */
  }
}

function nextTask(p: Player): [string, string, Vector3] | undefined {
  let best: [string, string, Vector3] | undefined;
  let d = Infinity;
  for (const [k, what] of TASKS) {
    const c = CONSOLES[k];
    if (!c || done.has(k)) continue;
    const dd = Math.hypot(c.x - p.location.x, c.z - p.location.z);
    if (dd < d) {
      d = dd;
      best = [k, what, c];
    }
  }
  return best;
}

function tasksLeft(): number {
  return TASKS.filter(([k]) => CONSOLES[k] && !done.has(k)).length;
}

function enterPrologue(p: Player): void {
  remember(p);
  try {
    p.camera.clear();
    p.setGameMode(GameMode.Adventure);
    p.teleport(START(), { facingLocation: v(D.x, GROUND + 20, D.z) });
    p.addEffect("resistance", 20 * 60 * 20, { amplifier: 255, showParticles: false });
    p.addEffect("saturation", 20 * 60 * 20, { amplifier: 1, showParticles: false });
    p.onScreenDisplay.setHudVisibility(HudVisibility.Reset);
    p.onScreenDisplay.setTitle("§l7 MAY 1957", { subtitle: "§7Varrow Island · Operation SUNLAMP · H minus 40 minutes", fadeInDuration: 20, stayDuration: 120, fadeOutDuration: 30 });
    p.playSound(SND.cineWind, { volume: 0.9 });
    p.sendMessage(`§7You are §fDr. ${p.name}§7, radiological safety, Joint Task Force 9.\n§7Check the dosimeters, set the firing timer, then get to the observation bunker on the south shore.`);
  } catch {
    /* ignore */
  }
}

const RADIO: [number, string][] = [
  [200, "§7[CONTROL] §fAll stations, Control. H minus forty minutes. Dosimeter checks, please."],
  [900, "§7[HALE] §fDoc, it's Walter Hale on the tower crew. Timer panel's at the foot of the tower when you're ready."],
  [1700, "§7[CONTROL] §fH minus twenty. Clear the inner zone. Observers to shelter."],
  [2600, "§7[CONTROL] §fH minus ten. All personnel into the bunkers. This is not a drill."],
];

function prologueFrame(): void {
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
  const inBunker = (p: Player) => Math.hypot(p.location.x - (bunker.x + 0.5), p.location.z - (bunker.z + 0.5)) < 5.5 && Math.abs(p.location.y - bunker.y) < 4;
  if (proTick % 20 === 0) {
    for (const p of people) {
      // keep everyone on the test site
      if (Math.hypot(p.location.x - D.x, p.location.z - D.z) > 88 || p.location.y < L_SEA - 4) {
        p.teleport(START(), { facingLocation: v(D.x, GROUND + 20, D.z) });
        p.sendMessage("§7[CONTROL] §fYou're outside the test area, Doctor. Back to your post.");
      }
      const task = allDone ? undefined : nextTask(p);
      const target = task ? task[2] : bunker;
      mark(p, target);
      const dist = Math.round(Math.hypot(target.x - p.location.x, target.z - p.location.z));
      const text = task ? `§6▶ Check ${task[1]} §7(${dist} m) §8· ${TASKS.length - tasksLeft()}/${TASKS.length}`
        : inBunker(p) ? "§6▶ Wait in the bunker. §7Face the slit." : `§6▶ Get to the observation bunker §7(${dist} m, south shore)`;
      p.onScreenDisplay.setActionBar(`${text}\n§8Hold Sneak to skip the opening`);
    }
  }
  if (proTick === 20 * 60 * 5 && !allDone) {
    for (const p of people) p.sendMessage("§7[CONTROL] §fWe're out of time, Doctor. Bunker. Now.");
    for (const [k] of TASKS) done.add(k);
  }
  const ready = people.length > 0 && people.every(inBunker);
  if ((allDone && ready) || proTick > 20 * 60 * 6) startShot();
}

function onButton(p: Player, at: Vector3): void {
  if (phase !== "prologue") return;
  for (const [k, what] of TASKS) {
    const c = CONSOLES[k];
    if (!c || c.x !== at.x || c.y !== at.y || c.z !== at.z || done.has(k)) continue;
    done.add(k);
    const left = tasksLeft();
    for (const q of watching()) {
      q.playSound("random.click", { volume: 1, pitch: 0.8 });
      q.sendMessage(k === "pro_tower"
        ? `§7[HALE] §fTimer's armed. Thanks, Doc. See you on the other side of it. §8(${TASKS.length - left}/${TASKS.length})`
        : `§7${p.name} checks ${what}: §fbackground normal. §8(${TASKS.length - left}/${TASKS.length})`);
      if (left === 0) {
        q.sendMessage("§7[CONTROL] §fAll checks in. Everyone to the observation bunker on the south shore.");
        q.playSound(SND.cineAlarm, { volume: 0.7 });
      }
    }
  }
}

// ------------------------------------------------------------------------- part two and three: the shot

type Step = [number, () => void];

const FLASH = 340;
const bomberPath = (t: number): Vector3 => v(D.x - 180 + (t - 100) * 0.92, 172, D.z - 18);
const RELEASE = 220;
const bombPath = (t: number): Vector3 => {
  const u = Math.min(1, (t - RELEASE) / (FLASH - RELEASE));
  const start = bomberPath(RELEASE);
  return v(start.x + (BURST.x - start.x) * (1 - (1 - u) ** 2), start.y - (start.y - BURST.y) * u * u, start.z + (BURST.z - start.z) * u);
};
const H0 = 1265;                                                    // 2026: the helicopter
const HELI_FROM = (): Vector3 => v(C.x + 26, crashY + 30, C.z + 175);
const HELI_TO = (): Vector3 => v(C.x + 6, crashY + 24, C.z + 38);
const heliPath = (t: number): Vector3 => {
  const u = Math.min(1, (t - H0) / 335);
  const a = HELI_FROM();
  const b = HELI_TO();
  return v(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
};
const EYE = (): Vector3 => {
  const s = SLIT();
  return v(s.x + 0.5, s.y + 0.6, s.z + 1.6);
};

const STEPS: Step[] = [
  [1, () => {
    fade(0, 0, 0, 0.3, 0.6, 1.2);
    each((p) => {
      p.onScreenDisplay.hideAllExcept([]);
      p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
      p.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
    });
  }],
  [10, () => {
    cam(EYE(), v(D.x, GROUND + 26, D.z));
    say("§7[CONTROL] §fAll stations, H minus two minutes. Goggles down. Face away from the island.");
    sound(SND.cineRadio, 0.8);
  }],
  [70, () => say("§7[HALE] §fGoggles on, Doc. Here she comes.")],
  [100, () => {
    spawn("bomber", ENT.bomber, bomberPath(100));
    sound(SND.cineBomber, 1);
    say("§7[SUNLAMP ONE] §fControl, Sunlamp One. Final run. Bomb-bay doors coming open.");
  }],
  [112, () => cam(EYE(), props.get("bomber"))],
  [170, () => props.get("bomber")?.setProperty("hollow:open", true)],
  [RELEASE, () => {
    spawn("bomb", ENT.bomb, bombPath(RELEASE));
    sound(SND.cineWhistle, 0.9);
    say("§7[SUNLAMP ONE] §fBomb away. Bomb away.");
  }],
  [228, () => cam(EYE(), props.get("bomb"))],
  [250, () => {
    sound(SND.cineCountdown, 1);
    say("§7[CONTROL] §fYield telemetry coming in...", 60);
  }],
  [300, () => {
    sound(SND.cineRadio, 1, 1.1);
    say("§c[HALE] §fThose numbers are wrong. That's three times the estimate. §lGet down!", 60);
  }],
  [FLASH, () => {
    drop("bomb");
    fade(1, 1, 1, 0.02, 5.2, 0.01);                                   // white, all at once
    sound(SND.cineFlash, 1);
    shake(0.9, 3.5);
    spawn("cloud", ENT.mushroomCloud, BURST);
    say(" ", 1);
  }],
  [346, scar],
  [352, () => sound(SND.ringing, 1)],
  [380, () => setFires(180)],
  [420, () => {
    fade(0, 0, 0, 1.4, 6.5, 1.6);                                     // white cools to black
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
    sound(SND.cineBoom, 1);                                           // the report, half a minute late
    shake(0.45, 4);
  }],
  [780, () => cam(v(D.x - 150, 70, D.z + 70), v(D.x, 150, D.z))],
  [782, () => cam(v(D.x - 120, 96, D.z + 118), v(D.x, 150, D.z), 7)],
  [800, () => title("", "§7as the fleet saw it, nine miles out", 80)],
  [930, () => {
    cam(v(D.x + 46, 118, D.z + 56), v(D.x, GROUND - 6, D.z));
    sound(SND.cineFire, 1);
    setFires(120);
  }],
  [932, () => cam(v(D.x - 34, 104, D.z + 50), v(D.x, GROUND - 4, D.z), 7)],
  [960, () => title("§fGround Zero", "§7the crater, and the island burning", 90)],
  [1080, () => {
    cam(v(D.x - 30, GROUND + 9, D.z + 48), v(D.x, GROUND + 4, D.z));
    sound(SND.cineFire, 0.9);
  }],
  [1082, () => cam(v(D.x + 6, GROUND + 12, D.z + 44), v(D.x - 4, GROUND + 3, D.z), 6)],
  [1190, () => {
    fade(0, 0, 0, 1.4, 4, 1.6);
    title("§l2026", "§7Sixty-nine years later", 90);
  }],
  [1225, () => {
    drop("cloud");
    try {
      world.setTimeOfDay(7000);
    } catch {
      /* ignore */
    }
    anchor(v(C.x, crashY + 56, C.z + 100));
  }],
  [1255, () => sound(SND.cineRotor, 1)],
  [H0, () => {
    const h = spawn("heli", ENT.helicopter, heliPath(H0));
    if (h) cam(v(C.x + 44, crashY + 36, C.z + 196), h);
    say("§7[OKAFOR] §fMeridian Four-One, island in sight. Coming in from the south, low.", 120);
  }],
  [1390, () => {
    sound(SND.cineRadio, 0.8);
    say("§7[OKAFOR] §fThat's the crater. Look at that. The water's green.", 110);
  }],
  [1490, () => say("§7[HALE] §fSmoke on the north-west shore. Somebody's living down there.", 100)],
  [1560, () => cam(v(C.x - 24, crashY + 6, C.z - 14), props.get("heli") ?? v(C.x, crashY + 24, C.z + 40))],
  [1572, () => muzzle(0)],
  [1584, () => muzzle(1)],
  [1594, () => {
    muzzle(2);
    sound("random.glass", 1, 0.9);
    sound(SND.cineRadio, 1, 1.15);
    say("§c[OKAFOR] §fTaking fire! Taking f—", 60);
  }],
  [1606, () => muzzle(0)],
  [1618, () => muzzle(1)],
  [1630, () => {
    say("§c[LINDQVIST] §fDan's hit! I have the controls! Brace, brace!", 80);
    cam(v(C.x + 40, crashY + 8, C.z + 24), props.get("heli") ?? v(C.x, crashY + 10, C.z));
  }],
  [1722, () => fade(0, 0, 0, 0.1, 4.5, 2.5)],
  [1730, () => {
    sound(SND.cineImpact, 1);
    shake(0.7, 1.4);
    drop("heli");
    say(" ", 1);
  }],
  [1790, () => finish()],
];

function muzzle(k: number): void {
  const at = v(C.x - 18 + k * 3, crashY + 3 + (k % 2), C.z - 10 - k * 2);
  const dim = world.getDimension("overworld");
  try {
    dim.spawnParticle("minecraft:basic_flame_particle", at);
    dim.spawnParticle("minecraft:basic_smoke_particle", at);
  } catch {
    /* ignore */
  }
  sound(SND.rifle, 0.9, 0.95 + k * 0.03);
}

function shotFrame(): void {
  tick++;
  for (const [at, fn] of STEPS) if (at === tick) safe(`cine.${at}`, fn);
  if (caption && tick < caption.until && tick % 30 === 0) each((p) => p.onScreenDisplay.setActionBar(caption!.text));
  // movers
  if (tick >= 100 && tick <= 440) move("bomber", bomberPath(tick), -90);
  if (tick > RELEASE && tick < FLASH) {
    const u = (tick - RELEASE) / (FLASH - RELEASE);
    move("bomb", bombPath(tick), -90, 10 + u * 70);
  }
  if (tick > FLASH && tick < 1225 && tick % 6 === 0) safe("cine.billow", () => billow((tick - FLASH) / 20));
  if (tick >= H0 && tick < 1630) move("heli", heliPath(tick), 180);
  if (tick >= 1630 && tick < 1730) {                                  // spinning in toward the beach
    const u = (tick - 1630) / 100;
    const a = HELI_TO();
    const p = v(a.x + (C.x - a.x) * u, a.y + (crashY + 2 - a.y) * u * u, a.z + (C.z - a.z) * u);
    move("heli", p, 180 + (tick - 1630) ** 1.35 * 2.2, 8 + u * 10);
  }
}

function startShot(): void {
  if (phase !== "prologue") return;
  phase = "shot";
  tick = 0;
  for (const p of watching()) {
    mark(p, undefined);
    enter(p, EYE());
  }
}

// ------------------------------------------------------------------------- the loop

function frame(): void {
  // per-player skip: hold Sneak for two seconds
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
  if (watching().length === 0 && (phase === "shot" ? tick > 2 : proTick > 2)) finish();
}

function spawnPoint(): Vector3 {
  return v(SPAWN_POINT.x + 0.5, SPAWN_POINT.y, SPAWN_POINT.z + 0.5);
}

function finish(): void {
  if (phase === "idle") return;
  phase = "idle";
  if (loop !== undefined) system.clearRun(loop);
  loop = undefined;
  for (const k of [...props.keys()]) drop(k);
  world.setDynamicProperty(DP.cine, 1);
  for (const p of watching()) {
    leave(p, spawnPoint());
    onFinish?.(p);
  }
  viewers = [];
}

/** Play the opening for these players; `then` runs for each one as they come out of it. */
export function playCinematic(players: Player[], then: (p: Player) => void): boolean {
  if (phase !== "idle") return false;
  phase = "prologue";
  tick = 0;
  proTick = 0;
  caption = undefined;
  onFinish = then;
  done.clear();
  skipped.clear();
  sneakTicks.clear();
  viewers = players.filter((p) => p.isValid);
  try {
    world.setTimeOfDay(1500);
  } catch {
    /* ignore */
  }
  for (const p of viewers) enterPrologue(p);
  loop = system.runInterval(() => safe("cinematic", frame), 1);
  return true;
}

/** Someone arriving during the morning of the shot joins it; later than that, they wait. */
export function joinCinematic(p: Player): boolean {
  if (phase !== "prologue" || !p.isValid) return false;
  viewers.push(p);
  enterPrologue(p);
  return true;
}

/** Test kit: skip the morning and go straight to the shot. */
export function skipToShot(): string {
  if (phase !== "prologue") return "the opening isn't in its first part";
  for (const [k] of TASKS) done.add(k);
  startShot();
  return "the shot";
}

/** Test kit: play it again for one operator (does not touch the story). */
export function replayCinematic(p: Player): string {
  if (phase !== "idle") return "the cinematic is already playing";
  playCinematic([p], () => undefined);
  return "playing the opening (hold Sneak to skip)";
}

export function startCinematic(): void {
  world.afterEvents.buttonPush.subscribe((ev) => safe("cine.button", () => {
    if (ev.source instanceof Player) onButton(ev.source, ev.block.location);
  }));
}

export function cinematicSummary(): string {
  return `cine: ${phase} pro=${proTick} shot=${tick} tasks=${TASKS.length - tasksLeft()}/${TASKS.length}`;
}
