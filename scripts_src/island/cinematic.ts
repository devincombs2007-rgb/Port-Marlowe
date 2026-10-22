import {
  CameraShakeType, EasingType, Entity, GameMode, HudVisibility, InputPermissionCategory, Player, Vector3, system, world,
} from "@minecraft/server";
import { SITES, SPAWN_POINT } from "../content/island_layout";
import { DP, ENT, SND } from "../core/ids";
import { safe } from "../core/scheduler";
import { readEntity, writeEntity } from "../core/store";

// THE OPENING: 7 May 1957, then 2026. About a minute, played once per world for everyone online
// when the first survivor arrives. Built from the game's own camera, fade and title tools and four
// set-piece entities; the 1957 shots are filmed on a pristine copy of the test site the world file
// keeps far out at sea, so the real island can be shown burned and overgrown afterwards.
//
//   1  black, "7 May 1957"                        wind, gulls
//   2  wide over the atoll, ships standing off    radio countdown
//   3  the bomber crosses, camera pacing it       engines
//   4  bomb-bay doors, the drop                   a falling whistle
//   5  the airburst: the screen goes white        silence, then ringing
//   6  white cools to the fireball, mushroom cloud, the shock wave races over the water
//   7  the boom arrives late, the camera shakes   a long, deep roll
//   8  the island burning                         fire
//   9  black, "2026"                              rotors
//  10  the charter helicopter comes in from the south over the sea
//  11  muzzle flashes in the north-west treeline   rifle cracks, glass
//  12  it spins in toward the beach; cut to black  impact
//  13  you wake beside the wreck (story.ts)
//
// Hold Sneak for a second at any point to skip (the skip is per player).

interface Restore {
  gm: string;
  x: number;
  y: number;
  z: number;
}

const D = { x: SITES.DIORAMA.x, z: SITES.DIORAMA.z };
const GROUND = 66; // the diorama's ground level (tools/island/diorama.py CENTER_Y)
const BURST: Vector3 = { x: D.x, y: GROUND + 65, z: D.z };
const C = SITES.CRASH;

let running = false;
let tick = 0;
let crashY = SPAWN_POINT.y - 1;
let viewers: Player[] = [];
const sneakTicks = new Map<string, number>();
const skipped = new Set<string>();
const props = new Map<string, Entity>();
let onFinish: ((p: Player) => void) | undefined;

export function cinematicRunning(): boolean {
  return running;
}

export function cinematicDone(): boolean {
  return world.getDynamicProperty(DP.cine) === 1;
}

const v = (x: number, y: number, z: number): Vector3 => ({ x, y, z });

// ------------------------------------------------------------------------- players

/** Spectator, camera locked, HUD hidden; remembers how to put the player back (see leave). */
export function enterScene(p: Player, anchor: Vector3): void {
  enter(p, anchor);
}

function enter(p: Player, anchor: Vector3): void {
  const r: Restore = { gm: p.getGameMode(), x: p.location.x, y: p.location.y, z: p.location.z };
  writeEntity(p, DP.cineRestore, r);
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
  } catch {
    /* ignore */
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

function cam(location: Vector3, facing: Vector3 | Entity, ease = 0, type = EasingType.Linear): void {
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

function title(text: string, sub: string, stay = 70): void {
  each((p) => p.onScreenDisplay.setTitle(text, { subtitle: sub, fadeInDuration: 15, stayDuration: stay, fadeOutDuration: 25 }));
}

function line(text: string): void {
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

function setFires(): void {
  const dim = world.getDimension("overworld");
  let n = 0;
  for (let i = 0; i < 360 && n < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 58;
    const x = Math.floor(D.x + Math.cos(a) * r);
    const z = Math.floor(D.z + Math.sin(a) * r);
    try {
      const top = dim.getTopmostBlock({ x, z });
      if (!top || top.location.y < 62 || top.isLiquid) continue;
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

// ------------------------------------------------------------------------- the timeline

type Step = [number, () => void];

const bomberPath = (t: number): Vector3 => v(D.x - 130 + (t - 240) * 1.45, 172, D.z - 26);
const RELEASE = 300;
const bombPath = (t: number): Vector3 => {
  const u = Math.min(1, (t - RELEASE) / 120);
  const start = bomberPath(RELEASE);
  return v(start.x + (BURST.x - start.x) * (1 - (1 - u) ** 2), start.y - (start.y - BURST.y) * u * u, start.z + (BURST.z - start.z) * u);
};
const HELI_FROM = (): Vector3 => v(C.x + 26, crashY + 30, C.z + 175);
const HELI_TO = (): Vector3 => v(C.x + 6, crashY + 24, C.z + 38);
const heliPath = (t: number): Vector3 => {
  const u = Math.min(1, (t - 940) / 200);
  const a = HELI_FROM();
  const b = HELI_TO();
  return v(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
};

const STEPS: Step[] = [
  [1, () => {
    fade(0, 0, 0, 0, 4, 1.5);
    title("§l7 MAY 1957", "§7Operation SUNLAMP  ·  Varrow Island", 80);
    sound(SND.cineWind, 0.9);
  }],
  [80, () => cam(v(D.x + 110, 96, D.z + 95), v(D.x, GROUND + 10, D.z))],
  [82, () => cam(v(D.x + 72, 92, D.z + 112), v(D.x, GROUND + 14, D.z), 8, EasingType.InOutSine)],
  [100, () => {
    sound(SND.cineCountdown, 0.9);
    line("§7[RADIO] §fSunlamp, this is Control. H minus two minutes. All stations report.");
  }],
  [170, () => line("§7[RADIO] §fStation four, cameras running. Goggles down, all hands. Face away from the island.")],
  [240, () => {
    spawn("bomber", ENT.bomber, bomberPath(240));
    sound(SND.cineBomber, 1);
    const b = props.get("bomber");
    if (b) cam(v(D.x - 70, 150, D.z + 18), b);
    line("§7[RADIO] §fControl, Sunlamp One. Final run, bomb-bay doors coming open.");
  }],
  [262, () => {
    const b = props.get("bomber");
    if (b) cam(v(D.x - 10, 160, D.z + 24), b, 2.2, EasingType.InOutSine);
  }],
  [284, () => props.get("bomber")?.setProperty("hollow:open", true)],
  [288, () => {
    const b = props.get("bomber");
    if (b) cam(v(bomberPath(300).x - 10, 158, D.z - 14), b);
  }],
  [RELEASE, () => {
    spawn("bomb", ENT.bomb, bombPath(RELEASE));
    sound(SND.cineWhistle, 0.8);
    line("§7[RADIO] §fBomb away. Bomb away.");
  }],
  [326, () => {
    const bomb = props.get("bomb");
    if (bomb) cam(v(D.x - 34, 178, D.z + 34), bomb);
  }],
  [380, () => props.get("bomber")?.setProperty("hollow:open", false)],
  [405, () => {
    cam(v(D.x + 92, 104, D.z + 64), BURST);
    line(" ");
  }],
  [420, () => {
    drop("bomb");
    fade(1, 1, 1, 0.05, 3.2, 5.5);                       // the flash: white, held, slowly cooling
    sound(SND.ringing, 0.9);
    spawn("cloud", ENT.mushroomCloud, BURST);
    shake(0.08, 2);
  }],
  [430, setFires],
  [436, setFires],
  [450, () => drop("bomber")],
  [500, () => cam(v(D.x + 108, 106, D.z + 80), BURST, 9, EasingType.InOutSine)],
  [540, () => {                                          // the report arrives, six seconds late
    sound(SND.cineBoom, 1);
    shake(0.55, 4.5);
  }],
  [640, () => cam(v(D.x + 82, L_SEA + 6, D.z - 46), v(D.x, BURST.y + 20, D.z))],
  [642, () => cam(v(D.x + 70, L_SEA + 8, D.z - 54), v(D.x, BURST.y + 40, D.z), 6, EasingType.InOutSine)],
  [760, () => {
    cam(v(D.x - 26, GROUND + 9, D.z + 44), v(D.x, GROUND + 4, D.z));
    sound(SND.cineFire, 0.9);
  }],
  [762, () => cam(v(D.x + 6, GROUND + 12, D.z + 40), v(D.x - 4, GROUND + 3, D.z), 6, EasingType.InOutSine)],
  [880, () => {
    fade(0, 0, 0, 1.2, 3.5, 1.5);
    title("§l2026", "§7Sixty-nine years later", 70);
  }],
  [905, () => {
    drop("cloud");
    each((p) => p.teleport(v(C.x, crashY + 56, C.z + 100)));
  }],
  [930, () => sound(SND.cineRotor, 0.9)],
  [940, () => {
    const h = spawn("heli", ENT.helicopter, heliPath(940));
    if (h) cam(v(C.x + 44, crashY + 36, C.z + 196), h);
    line("§7[RADIO] §fMeridian Four-One, island in sight. Coming in from the south, low.");
  }],
  [1000, () => {
    sound(SND.cineRadio, 0.8);
    line("§7[OKAFOR] §fThat's the crater. Look at that... the water's green.");
  }],
  [1060, () => line("§7[HALE] §fSmoke on the north-west shore. Somebody's living down there.")],
  [1100, () => {
    cam(v(C.x - 24, crashY + 6, C.z - 14), props.get("heli") ?? v(C.x, crashY + 24, C.z + 40));
  }],
  [1112, () => muzzle(0)],
  [1122, () => muzzle(1)],
  [1130, () => {
    muzzle(2);
    sound("random.glass", 0.9, 0.9);
    sound(SND.cineRadio, 0.9, 1.15);
    line("§c[OKAFOR] §fTaking fire! Taking f—");
  }],
  [1140, () => muzzle(0)],
  [1152, () => muzzle(1)],
  [1165, () => line("§c[LINDQVIST] §fDan's hit! I have it, I have the controls! Brace!")],
  [1180, () => cam(v(C.x + 40, crashY + 8, C.z + 24), props.get("heli") ?? v(C.x, crashY + 10, C.z))],
  [1268, () => fade(0, 0, 0, 0.1, 4.5, 2.5)],
  [1276, () => {
    sound(SND.cineImpact, 1);
    shake(0.7, 1.4);
    drop("heli");
    line(" ");
  }],
  [1330, () => finish()],
];
const L_SEA = 62;

function muzzle(k: number): void {
  const at = v(C.x - 18 + k * 3, crashY + 3 + (k % 2), C.z - 10 - k * 2);
  const dim = world.getDimension("overworld");
  try {
    dim.spawnParticle("minecraft:basic_flame_particle", at);
    dim.spawnParticle("minecraft:basic_smoke_particle", at);
    dim.playSound(SND.pistol, at, { volume: 1, pitch: 0.72 });
  } catch {
    /* ignore */
  }
}

function frame(): void {
  tick++;
  for (const [at, fn] of STEPS) if (at === tick) safe(`cine.${at}`, fn);
  // movers
  if (tick >= 240 && tick <= 450) {
    move("bomber", bomberPath(tick), -90);
  }
  if (tick > RELEASE && tick < 420) {
    const u = (tick - RELEASE) / 120;
    move("bomb", bombPath(tick), -90, 10 + u * 70);
  }
  if (tick >= 940 && tick < 1180) move("heli", heliPath(tick), 180);
  if (tick >= 1180 && tick < 1276) {                     // spinning in toward the beach
    const u = (tick - 1180) / 96;
    const a = HELI_TO();
    const p = v(a.x + (C.x - a.x) * u, a.y + (crashY + 2 - a.y) * u * u, a.z + (C.z - a.z) * u);
    move("heli", p, 180 + (tick - 1180) ** 1.35 * 2.2, 8 + u * 10);
  }
  // per-player skip: hold sneak for a second
  for (const p of watching()) {
    if (tick < 40) continue;
    const n = p.isSneaking ? (sneakTicks.get(p.id) ?? 0) + 1 : 0;
    sneakTicks.set(p.id, n);
    if (n === 1 && tick % 200 < 2) p.onScreenDisplay.setActionBar("§8Hold Sneak to skip");
    if (n >= 20) {
      skipped.add(p.id);
      leave(p, spawnPoint());
      onFinish?.(p);
    }
  }
  if (watching().length === 0 && tick > 2) finish();
}

function spawnPoint(): Vector3 {
  return v(SPAWN_POINT.x + 0.5, SPAWN_POINT.y, SPAWN_POINT.z + 0.5);
}

let loop: number | undefined;

function finish(): void {
  if (!running) return;
  running = false;
  if (loop !== undefined) system.clearRun(loop);
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
  if (running) return false;
  running = true;
  tick = 0;
  onFinish = then;
  skipped.clear();
  sneakTicks.clear();
  viewers = players.filter((p) => p.isValid);
  for (const p of viewers) enter(p, v(D.x, 150, D.z + 40));
  loop = system.runInterval(() => safe("cinematic", frame), 1);
  return true;
}

/** Test kit: play it again for one operator (does not touch the story). */
export function replayCinematic(p: Player): string {
  if (running) return "the cinematic is already playing";
  playCinematic([p], () => undefined);
  return "playing the opening (hold Sneak to skip)";
}
