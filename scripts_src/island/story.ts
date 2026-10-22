import { Entity, ItemStack, Player, Vector3, system, world } from "@minecraft/server";
import { CRASH_CONTAINERS, CREW_BODIES, CRATER_R, SITES, SPAWN_POINT } from "../content/island_layout";
import { ui } from "../core/audio";
import { prefs } from "../core/config";
import { notice } from "../core/fx";
import { DP, ENT, ITEM, SND } from "../core/ids";
import { everyPlayer, later, safe } from "../core/scheduler";
import { getNum, readWorld, setNum, writeWorld } from "../core/store";
import { groundNear } from "../core/world";
import { giveOrDrop } from "../items/components";
import { ensureJournal, unlock } from "../systems/journal";
import { pistolStack } from "./guns";
import { detectIsland, isIsland } from "./mode";
import { orderFollow, say, setHome, spawnTrevor, trevorEntity, trevorGone } from "./trevor";

// THE CRASH: how Varrow Island begins.
//
// The world file ships with the burning wreck, the supply barrels and the signal fires. On the
// first visit the script stocks the barrels with the crash supplies, lays the two crew where they
// fell and puts Trevor on his feet beside you. Every player wakes once: black, ringing ears, the
// title, a gasp; Trevor talking you round; your own Research Log, Geiger counter and pistol.
// Later arrivals get a shorter version ("you were further down the beach").
//
// (The 1957 flashback and the shoot-down itself are the cinematic, which plays before this.)

interface StoryState {
  setup: boolean;
  bodies: string[];
  searched: string[];
  intro: boolean;
}

const DEFAULT: StoryState = { setup: false, bodies: [], searched: [], intro: false };
let story: StoryState | undefined;

function st(): StoryState {
  if (!story) story = { ...DEFAULT, ...readWorld<StoryState>(DP.story, DEFAULT) };
  return story;
}

function save(): void {
  writeWorld(DP.story, st());
}

const SUPPLIES: [string, number][][] = [
  [[ITEM.ration, 4], [ITEM.medkit, 2], [ITEM.round, 14], [ITEM.iodine, 4]],
  [[ITEM.hatchet, 1], [ITEM.brokenRadio, 1], [ITEM.ration, 2], [ITEM.round, 7]],
  [[ITEM.medkit, 1], [ITEM.ration, 3], [ITEM.iodine, 2], [ITEM.round, 7]],
];

function stockCrates(): boolean {
  const dim = world.getDimension("overworld");
  let ok = true;
  CRASH_CONTAINERS.forEach((pos, i) => {
    try {
      if (!dim.isChunkLoaded(pos)) {
        ok = false;
        return;
      }
      const c = dim.getBlock(pos)?.getComponent("minecraft:inventory")?.container;
      if (!c) return;
      for (const [id, n] of SUPPLIES[i % SUPPLIES.length]) c.addItem(new ItemStack(id, n));
    } catch {
      ok = false;
    }
  });
  return ok;
}

function layBodies(): string[] {
  const dim = world.getDimension("overworld");
  const ids: string[] = [];
  CREW_BODIES.slice(0, 2).forEach((b, i) => {
    try {
      const e = dim.spawnEntity(ENT.crewBody, { x: b.x + 0.5, y: b.y, z: b.z + 0.5 });
      e.triggerEvent(i === 0 ? "hollow:pilot" : "hollow:copilot");
      e.setRotation({ x: 0, y: i === 0 ? 120 : -40 });
      ids.push(e.id);
    } catch {
      /* chunk not ready */
    }
  });
  return ids;
}

/** First visit: crates, crew, Trevor. Retries until the crash chunks are loaded. */
function setupWorld(): void {
  const s = st();
  if (s.setup) return;
  const dim = world.getDimension("overworld");
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
  save();
  const at = groundNear(dim, SPAWN_POINT.x + 2, SPAWN_POINT.y, SPAWN_POINT.z - 2, 8) ?? { x: SPAWN_POINT.x + 2, y: SPAWN_POINT.y, z: SPAWN_POINT.z - 2 };
  setHome(SPAWN_POINT);
  if (!trevorGone()) spawnTrevor(at);
}

function issueKit(p: Player): void {
  ensureJournal(p);
  const geiger = new ItemStack(ITEM.geiger, 1);
  geiger.keepOnDeath = true;
  giveOrDrop(p, geiger);
  giveOrDrop(p, pistolStack());
}

function face(p: Player, at: Vector3): void {
  try {
    p.teleport(p.location, { facingLocation: at });
  } catch {
    /* ignore */
  }
}

/** The long wake-up, for the people who were in the helicopter. */
function wakeUp(p: Player, first: boolean): void {
  const fx = prefs(p).visualFx;
  face(p, { x: SITES.CRASH.x, y: SPAWN_POINT.y + 1, z: SITES.CRASH.z });
  try {
    if (fx) p.camera.fade({ fadeColor: { red: 0, green: 0, blue: 0 }, fadeTime: { fadeInTime: 0, holdTime: first ? 6 : 2, fadeOutTime: first ? 5 : 3 } });
    p.addEffect("slowness", first ? 300 : 120, { amplifier: 2, showParticles: false });
    p.addEffect("nausea", first ? 220 : 80, { amplifier: 0, showParticles: false });
    if (fx) p.addEffect("darkness", first ? 200 : 60, { amplifier: 0, showParticles: false });
  } catch {
    /* ignore */
  }
  ui(p, SND.ringing, 0.9);
  const step = (ticks: number, fn: () => void) => later("story.wake", ticks, () => p.isValid && fn());
  if (first) {
    step(50, () => {
      ui(p, SND.titleHit, 0.9);
      p.onScreenDisplay.setTitle("§lVARROW ISLAND", {
        subtitle: "§7South Pacific  ·  2026", fadeInDuration: 30, stayDuration: 90, fadeOutDuration: 40,
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
    if (e && !st().intro) {
      st().intro = true;
      save();
      orderFollow(p, true);
    }
  });
}

/** Called for every spawn in the overworld (main.ts). */
export function onIslandSpawn(p: Player, initial: boolean): void {
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
  const first = !st().intro && world.getAllPlayers().length >= 1 && !anyoneAwake(p);
  later("story.wake", 20, () => p.isValid && wakeUp(p, first));
}

function anyoneAwake(except: Player): boolean {
  return world.getAllPlayers().some((q) => q.id !== except.id && getNum(q, DP.woke, 0) === 1);
}

// ------------------------------------------------------------------------- the dead

function searchBody(p: Player, body: Entity): void {
  const s = st();
  let variant = 0;
  try {
    variant = (body.getComponent("minecraft:variant")?.value ?? 0) as number;
  } catch {
    variant = 0;
  }
  const first = !s.searched.includes(body.id);
  if (variant === 0) {
    notice(p, "§7Dan Okafor, the pilot. §8His kneeboard is still clipped to his leg.");
    unlock(p, "okafor");
    if (first) giveOrDrop(p, new ItemStack(ITEM.round, 7));
  } else {
    notice(p, "§7Ruth Lindqvist, the co-pilot. §8A notebook in her vest, and a medkit she never got to open.");
    unlock(p, "lindqvist");
    if (first) giveOrDrop(p, new ItemStack(ITEM.medkit, 1));
  }
  if (first) {
    s.searched.push(body.id);
    save();
    say(variant === 0 ? "Dan had two kids. I'll write to them myself, if we get out." : "She got us down. Remember that. She got us down.", `body${variant}`, 6000);
  }
}

// ------------------------------------------------------------------------- places

function places(p: Player): void {
  if (p.dimension.id !== "minecraft:overworld") return;
  const d = (c: { x: number; z: number }) => Math.hypot(p.location.x - c.x, p.location.z - c.z);
  if (!isIsland()) {
    // safety net: a player standing at the wreck in a world not yet recognised as the island
    if (d(SITES.CRASH) < 48 && detectIsland(p.dimension)) onIslandSpawn(p, true);
    return;
  }
  if (d(SITES.CRASH) < 40) unlock(p, "place_crash", true);
  if (d(SITES.GZ) < CRATER_R + 70) {
    if (unlock(p, "place_crater")) say("That's Ground Zero. Keep your counter out and your visit short.", "gz", 12000);
  }
}

export function startStory(): void {
  world.afterEvents.playerInteractWithEntity.subscribe((ev) => safe("story.search", () => {
    if (ev.target.typeId === ENT.crewBody) searchBody(ev.player, ev.target);
  }));
  everyPlayer("story.places", 100, places);
  // the world may already be the island from an earlier session
  system.run(() => safe("story.resume", () => {
    if (isIsland()) setupWorld();
  }));
}

/** Test kit. */
export function storySummary(): string {
  const s = st();
  return `story: island=${isIsland()} setup=${s.setup} bodies=${s.bodies.length} searched=${s.searched.length} intro=${s.intro}`;
}

export function giveIslandKit(p: Player): void {
  issueKit(p);
}
