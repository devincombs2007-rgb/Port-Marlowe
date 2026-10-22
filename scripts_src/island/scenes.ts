import { EasingType, Entity, GameMode, Player, Vector3, system, world } from "@minecraft/server";
import { CRATER_R, POINTS, SITES } from "../content/island_layout";
import { DP } from "../core/ids";
import { safe } from "../core/scheduler";
import { getNum, readEntity, writeEntity } from "../core/store";
import { cinematicRunning, enterScene, leave, needsRestore } from "./cinematic";
import { isIsland } from "./mode";

// SHORT CUTSCENES
//
// The opening has its own module (cinematic.ts). These are the short scenes during play, all built
// the same way: the player goes into a locked camera for a few seconds (spectator, so nothing can
// hurt them), the camera dollies between shots, captions appear, and they're put back exactly
// where they were. Hold Sneak for a second to skip.
//
//   First sight (per player, once): the North Peak relay, Sunfall, Ground Zero.
//   Story beats (everyone): the transmission, the dawn helicopter, leaving the island.
//   The Hierophant's wrath (everyone close by).

export interface Shot {
  t: number;
  cam?: { at: Vector3; look: Vector3 | (() => Entity | undefined); ease?: number };
  title?: [string, string];
  bar?: string;
  sound?: [string, number?, number?];
  fade?: boolean;
  run?: () => void;
}

interface Scene {
  name: string;
  players: Player[];
  shots: Shot[];
  length: number;
  returnTo?: Vector3;
  onEnd?: (p: Player) => void;
}

let current: { scene: Scene; tick: number; loop: number; viewers: Player[]; sneak: Map<string, number> } | undefined;
const queue: Scene[] = [];

export function sceneRunning(): boolean {
  return !!current;
}

export function inScene(p: Player): boolean {
  return !!current?.viewers.some((v) => v.id === p.id);
}

function canWatch(p: Player): boolean {
  if (!p.isValid || needsRestore(p)) return false;
  try {
    const gm = p.getGameMode();
    return gm === GameMode.Survival || gm === GameMode.Adventure || gm === GameMode.Creative;
  } catch {
    return false;
  }
}

function seen(p: Player): string[] {
  return readEntity<string[]>(p, DP.scenes, []);
}

export function hasSeen(p: Player, name: string): boolean {
  return seen(p).includes(name);
}

function markSeen(p: Player, name: string): void {
  const s = seen(p);
  if (!s.includes(name)) writeEntity(p, DP.scenes, [...s, name]);
}

function camTo(p: Player, at: Vector3, look: Vector3 | Entity | undefined, ease: number): void {
  const easeOptions = ease > 0 ? { easeTime: ease, easeType: EasingType.InOutSine } : undefined;
  try {
    if (look instanceof Entity) {
      if (look.isValid) p.camera.setCamera("minecraft:free", { location: at, facingEntity: look, easeOptions });
    } else if (look) {
      p.camera.setCamera("minecraft:free", { location: at, facingLocation: look, easeOptions });
    }
  } catch {
    /* ignore */
  }
}

function step(): void {
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
          /* ignore */
        }
      }
    });
  }
  // hold Sneak for a second to skip (per player)
  for (const p of [...c.viewers]) {
    const n = p.isSneaking ? (c.sneak.get(p.id) ?? 0) + 1 : 0;
    c.sneak.set(p.id, n);
    if (n >= 20 && t > 10) {
      c.viewers = c.viewers.filter((v) => v.id !== p.id);
      out(p, c.scene);
    }
  }
  if (t >= c.scene.length || c.viewers.length === 0) end();
}

function out(p: Player, scene: Scene): void {
  leave(p, scene.returnTo);
  try {
    p.onScreenDisplay.setActionBar(" ");
  } catch {
    /* ignore */
  }
  safe(`scene.${scene.name}.end`, () => scene.onEnd?.(p));
}

function end(): void {
  const c = current;
  if (!c) return;
  system.clearRun(c.loop);
  current = undefined;
  for (const p of c.viewers) out(p, c.scene);
  // shots that change the world (a lamp lighting) still happen if everyone skipped
  for (const shot of c.scene.shots) if (shot.t > c.tick && shot.run) safe(`scene.${c.scene.name}.late`, shot.run);
  const next = queue.shift();
  if (next) system.runTimeout(() => start(next), 10);
}

function start(scene: Scene): boolean {
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
      /* ignore */
    }
  }
  current = { scene, tick: 0, viewers: players, sneak: new Map(), loop: system.runInterval(() => safe("scene", step), 1) };
  return true;
}

/** Play a scene for these players. If something else is playing, it waits its turn. */
export function playScene(name: string, players: Player[], shots: Shot[], length: number,
  opts: { returnTo?: Vector3; onEnd?: (p: Player) => void } = {}): boolean {
  return start({ name, players, shots, length, ...opts });
}

// ------------------------------------------------------------------------- first sight

const v = (x: number, y: number, z: number): Vector3 => ({ x, y, z });

function towerScene(): Shot[] {
  const t = SITES.TOWER;
  const hut = (POINTS.tower_hut ?? [])[0] ?? v(t.x, 163, t.z + 7);
  const top = (POINTS.tower_top ?? [])[0] ?? v(t.x, hut.y + 34, t.z);
  return [
    { t: 1, fade: true },
    { t: 8, cam: { at: v(t.x + 16, hut.y + 2, t.z + 18), look: v(t.x, hut.y + 6, t.z) } },
    { t: 12, cam: { at: v(t.x + 11, top.y + 3, t.z + 13), look: v(t.x, top.y - 2, t.z), ease: 6 } },
    { t: 30, title: ["§fThe North Peak Relay", "§7built 1957 · still standing"] },
    { t: 90, bar: "§7The hut at its foot holds the transmitter. The shed beside it, the generator." },
    { t: 128, cam: { at: v(t.x + 24, hut.y + 10, t.z + 26), look: v(t.x, hut.y + 1, t.z + 4), ease: 2.5 } },
    { t: 150, bar: "§6Press the buttons inside the hut and the shed to see what they need." },
  ];
}

function sunfallScene(): Shot[] {
  const g = (POINTS.cult_gate ?? [])[0] ?? v(SITES.SUNFALL.x, 75, SITES.SUNFALL.z + 34);
  const s = (POINTS.shrine ?? [])[0] ?? v(SITES.SUNFALL.x, 75, SITES.SUNFALL.z);
  return [
    { t: 1, fade: true },
    { t: 8, cam: { at: v(g.x + 16, g.y + 9, g.z + 24), look: v(s.x, s.y + 3, s.z) } },
    { t: 12, cam: { at: v(g.x - 14, g.y + 18, g.z + 2), look: v(s.x, s.y + 2, s.z), ease: 6.5 } },
    { t: 30, title: ["§fSunfall", "§7the Children of the Second Sun"] },
    { t: 95, bar: "§7Zealots guard the gate. The Faithful will only talk to you unarmed." },
    { t: 140, bar: "§6Gifts of food and offerings at their shrine earn their trust." },
  ];
}

function craterScene(): Shot[] {
  const g = SITES.GZ;
  const r = CRATER_R;
  return [
    { t: 1, fade: true },
    { t: 8, cam: { at: v(g.x - r - 18, 98, g.z + 34), look: v(g.x, 60, g.z) } },
    { t: 12, cam: { at: v(g.x + 24, 104, g.z + r + 20), look: v(g.x, 58, g.z), ease: 7 } },
    { t: 30, title: ["§aGround Zero", "§77 May 1957"] },
    { t: 95, bar: "§7The counter screams near the green water. Don't swim, don't drink." },
    { t: 140, bar: "§6A hazmat suit lets you work here. The bunkers had them." },
  ];
}

const FIRST_SIGHT: [string, (p: Player) => boolean, () => Shot[], number][] = [
  ["tower", (p) => Math.hypot(p.location.x - SITES.TOWER.x, p.location.z - SITES.TOWER.z) < 42, towerScene, 175],
  ["sunfall", (p) => Math.hypot(p.location.x - SITES.SUNFALL.x, p.location.z - SITES.SUNFALL.z) < 78, sunfallScene, 170],
  ["crater", (p) => Math.hypot(p.location.x - SITES.GZ.x, p.location.z - SITES.GZ.z) < CRATER_R + 46, craterScene, 170],
];

function calm(p: Player): boolean {
  try {
    if (p.dimension.getEntities({ location: p.location, maxDistance: 16, families: ["monster"] }).length) return false;
    if (p.dimension.getEntities({ location: p.location, maxDistance: 20, type: "hollow:zealot" }).length) return false;
    const hp = p.getComponent("minecraft:health");
    return !hp || hp.currentValue > 8;
  } catch {
    return true;
  }
}

function firstSight(): void {
  if (!isIsland() || current || cinematicRunning()) return;
  for (const p of world.getAllPlayers()) {
    if (!canWatch(p) || getNum(p, DP.woke, 0) !== 1 || p.dimension.id !== "minecraft:overworld") continue;
    for (const [name, near, shots, len] of FIRST_SIGHT) {
      if (hasSeen(p, name) || !near(p)) continue;
      if (!calm(p)) {
        markSeen(p, name);                                  // never pull someone out of a fight
        continue;
      }
      const company = world.getAllPlayers().filter((q) => q.id === p.id ||
        (!hasSeen(q, name) && canWatch(q) && Math.hypot(q.location.x - p.location.x, q.location.z - p.location.z) < 30 && calm(q)));
      playScene(name, company, shots(), len, { onEnd: (q) => sceneEndHook?.(q, name) });
      return;
    }
  }
}

let sceneEndHook: ((p: Player, name: string) => void) | undefined;
export function onSceneEnd(fn: (p: Player, name: string) => void): void {
  sceneEndHook = fn;
}

export function startScenes(): void {
  system.runInterval(() => safe("scenes.sight", firstSight), 20);
}
