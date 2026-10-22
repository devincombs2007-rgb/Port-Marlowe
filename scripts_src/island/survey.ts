import { BlockPermutation, Entity, ItemStack, Player, StartupEvent, Vector3, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { CONSOLES, CRATER_R, LOOT_CONTAINERS, POINTS, SITES, STATIONS } from "../content/island_layout";
import { ISLAND_ENTRIES } from "../content/island_journal";
import { ui } from "../core/audio";
import { notice, particle } from "../core/fx";
import { formSession, showForm } from "../core/forms";
import { DP, ENT, ITEM, SND } from "../core/ids";
import { compass } from "../core/math";
import { every, safe } from "../core/scheduler";
import { readWorld, writeWorld } from "../core/store";
import { giveOrDrop } from "../items/components";
import { unlock } from "../systems/journal";
import { isIsland } from "./mode";
import { addRadiationSource, inCraterLake, rateAt } from "./radiation";
import { say } from "./trevor";

// THE SURVEY: what the contract actually paid for.
//
//   Stations   six 1957 monitoring huts. Press the console button with a Geiger counter in your
//              inventory to log the 2026 reading next to the 1957 one.
//   Samples    a Sample Kit takes crater water, blast soil, scorched wood, or tissue from one of
//              the island's creatures. Use a sample to file it in the Research Log.
//   Film       reels of 1957 film are stored in station log barrels, bunker record rooms and one
//              other place. Use a reel to watch it.
//   Loot       every named container in the world is stocked the first time a player comes near.
//   The Heart  the thing under the crater lake. Its altar is set in the cavern below the lake the
//              first time someone climbs down the old instrument shaft.

interface SurveyState {
  stocked: string[];
  stations: string[];
  samples: string[];
  reels: number[];
  altar: boolean;
  heart: boolean;
  findings: boolean;
}

const DEFAULT: SurveyState = { stocked: [], stations: [], samples: [], reels: [], altar: false, heart: false, findings: false };
let state: SurveyState | undefined;

function st(): SurveyState {
  if (!state) state = { ...DEFAULT, ...readWorld<SurveyState>(DP.survey, DEFAULT) };
  return state;
}

function save(): void {
  writeWorld(DP.survey, st());
}

// ------------------------------------------------------------------------- loot

type Stack = [string, number] | [string, number, number];   // id, count, chance (0..1)
const REEL = (n: number): Stack => [`reel:${n}`, 1];

const LOOT: Record<string, Stack[]> = {
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
  landing_craft: [[ITEM.flareGun, 1], [ITEM.medkit, 1], [ITEM.shell, 8]],
};
const HUT: Stack[] = [["minecraft:bread", 3], ["minecraft:wheat", 6], [ITEM.rifleRound, 4, 0.5], [ITEM.wire, 1, 0.4], ["minecraft:carrot", 4, 0.6]];

function reelStack(n: number): ItemStack {
  const it = new ItemStack(ITEM.filmReel, 1);
  try {
    it.setDynamicProperty(DP.reel, n);
    it.setLore([`§7Reel ${n} of 10`, `§8${reelTitle(n)}`]);
  } catch {
    /* ignore */
  }
  return it;
}

function fill(key: string, at: Vector3): boolean {
  const dim = world.getDimension("overworld");
  try {
    if (!dim.isChunkLoaded(at)) return false;
    const c = dim.getBlock(at)?.getComponent("minecraft:inventory")?.container;
    if (!c) return false;
    const table = LOOT[key] ?? (key.startsWith("hut") ? HUT : []);
    for (const [id, n, chance] of table) {
      if (n <= 0 || (chance !== undefined && Math.random() > chance)) continue;
      if (id.startsWith("reel:")) c.addItem(reelStack(Number(id.slice(5))));
      else c.addItem(new ItemStack(id, n));
    }
    return true;
  } catch {
    return false;
  }
}

function stockNearby(): void {
  if (!isIsland()) return;
  const s = st();
  const players = world.getAllPlayers().filter((p) => p.isValid && p.dimension.id === "minecraft:overworld");
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
  if (changed) save();
}

// ------------------------------------------------------------------------- stations

const STATION_1957: Record<string, number> = {
  station1: 41, station2: 18, station3: 9.5, station4: 2.2, station5: 4.8, station6: 0.6,
};

function hasItem(p: Player, typeId: string): boolean {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return false;
  for (let i = 0; i < c.size; i++) if (c.getItem(i)?.typeId === typeId) return true;
  return false;
}

function nextStation(p: Player): string {
  const s = st();
  const left = Object.entries(STATIONS).filter(([k]) => !s.stations.includes(k));
  if (!left.length) return "§aAll six stations are logged.";
  left.sort((a, b) => Math.hypot(a[1].x - p.location.x, a[1].z - p.location.z) - Math.hypot(b[1].x - p.location.x, b[1].z - p.location.z));
  const [k, at] = left[0];
  const d = Math.round(Math.hypot(at.x - p.location.x, at.z - p.location.z));
  return `§7Nearest unlogged: §fStation ${k.slice(7)}§7, ${compass(p.location, { x: at.x, y: 0, z: at.z })}, ${d} m.`;
}

function logStation(p: Player, key: string): void {
  const s = st();
  unlock(p, "survey");
  if (!hasItem(p, ITEM.geiger)) {
    notice(p, "§7The station's 1957 dosimeter panel is dead. Bring a Geiger counter to log a reading here.");
    return;
  }
  const now = rateAt(p);
  const then = STATION_1957[key] ?? 1;
  ui(p, "random.click", 1, 0.8);
  if (s.stations.includes(key)) {
    notice(p, `§7Station ${key.slice(7)} already logged. Today: §f${now.toFixed(2)} mSv/h§7 (1957: ${then} mSv/h). ${nextStation(p)}`);
    return;
  }
  s.stations.push(key);
  save();
  unlock(p, key);
  notice(p, `§aStation ${key.slice(7)} logged§7: ${now.toFixed(2)} mSv/h today, ${then} mSv/h on 3 June 1957. §8(${s.stations.length}/6)`);
  notice(p, nextStation(p));
  if (s.stations.length === 1) say("First one. Six of these and we've earned our money. Assuming we live to invoice.", "station", 0);
  else if (s.stations.length === 6) say("That's all six. Whatever happens now, the readings exist. Somebody will have to look at them.", "station", 0);
  checkFindings();
}

// ------------------------------------------------------------------------- samples

const SAMPLE_OF: Record<string, string> = {
  water: ITEM.waterSample, soil: ITEM.soilSample, wood: ITEM.woodSample, tissue: ITEM.tissueSample,
};
const KIND_OF: Record<string, string> = Object.fromEntries(Object.entries(SAMPLE_OF).map(([k, v]) => [v, k]));
const SOIL = ["minecraft:dirt", "minecraft:coarse_dirt", "minecraft:gravel", "minecraft:sand", "minecraft:red_sand", "minecraft:podzol",
  "minecraft:grass_block", "minecraft:mud", "minecraft:tuff", "minecraft:green_stained_glass", "minecraft:lime_stained_glass", "minecraft:glass"];
const NO_TISSUE = new Set<string>([ENT.trevor, ENT.crewBody, ENT.bullet, ENT.cultRound, ENT.bomber, ENT.bomb, ENT.helicopter, ENT.mushroomCloud]);

function gzDist(at: Vector3): number {
  return Math.hypot(at.x - SITES.GZ.x, at.z - SITES.GZ.z);
}

function takeSample(p: Player): void {
  let kind: string | undefined;
  let note = "";
  // a creature right in front of you
  try {
    const hit = p.getEntitiesFromViewDirection({ maxDistance: 4 })[0]?.entity;
    if (hit && hit.typeId.startsWith("hollow:") && !NO_TISSUE.has(hit.typeId)) {
      if (!hit.matches({ families: ["cult"] })) {
        kind = "tissue";
        note = "You scrape a sliver of something that isn't quite skin into the vial. It moves.";
        try {
          hit.applyDamage(2);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  if (!kind) {
    let b;
    try {
      b = p.getBlockFromViewDirection({ maxDistance: 5, includeLiquidBlocks: true })?.block;
    } catch {
      b = undefined;
    }
    const id = b?.typeId ?? "";
    const near = b ? gzDist(b.location) : gzDist(p.location);
    if (inCraterLake(p) || ((id === "minecraft:water" || id === "minecraft:flowing_water") && near < CRATER_R + 8)) {
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
  giveOrDrop(p, new ItemStack(SAMPLE_OF[kind], 1));
  ui(p, "random.pop", 0.8, 1.2);
  notice(p, `§7${note} §8(use the sample to file it)`);
}

function consumeOne(p: Player, typeId: string): boolean {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return false;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it?.typeId !== typeId) continue;
    if (it.amount > 1) {
      it.amount -= 1;
      c.setItem(i, it);
    } else c.setItem(i, undefined);
    return true;
  }
  return false;
}

function fileSample(p: Player, typeId: string): void {
  const kind = KIND_OF[typeId];
  if (!kind) return;
  const s = st();
  if (!consumeOne(p, typeId)) return;
  const fresh = !s.samples.includes(kind);
  if (fresh) {
    s.samples.push(kind);
    save();
  }
  unlock(p, `sample_${kind}`);
  ui(p, "random.click", 1, 1.1);
  notice(p, fresh
    ? `§aSample filed§7: ${kind}. §8(${s.samples.length}/4 sample types)`
    : `§7Another ${kind} sample filed. More data never hurts.`);
  if (fresh && kind === "tissue") say("Don't put that one next to the food.", "tissue", 0);
  checkFindings();
}

/** Tissue also comes from a kill: the first creature a player kills while carrying a kit. */
function tissueFromKill(dead: Entity, killer?: Entity): void {
  if (!(killer instanceof Player) || !dead.typeId.startsWith("hollow:") || NO_TISSUE.has(dead.typeId)) return;
  if (st().samples.includes("tissue") || !hasItem(killer, ITEM.sampleKit)) return;
  try {
    if (!dead.matches({ families: ["monster"] })) return;
  } catch {
    return;
  }
  if (!consumeOne(killer, ITEM.sampleKit)) return;
  giveOrDrop(killer, new ItemStack(ITEM.tissueSample, 1));
  notice(killer, "§7You fill a vial from what's left of it. §8(use the sample to file it)");
}

function checkFindings(): void {
  const s = st();
  if (s.findings || s.stations.length < 6 || s.samples.length < 4) return;
  s.findings = true;
  save();
  for (const p of world.getAllPlayers()) {
    unlock(p, "findings");
    giveOrDrop(p, new ItemStack(ITEM.chelation, 1));
    try {
      p.onScreenDisplay.setTitle("§fSurvey complete", { subtitle: "§7the contract is fulfilled", fadeInDuration: 10, stayDuration: 60, fadeOutDuration: 20 });
    } catch {
      /* ignore */
    }
  }
  say("Six stations, four sample types. The survey's done. Now we just have to get it off the island.", "findings", 0);
}

// ------------------------------------------------------------------------- film

export function reelTitle(n: number): string {
  return ISLAND_ENTRIES.find((e) => e.id === `reel${n}`)?.title ?? "Unlabelled";
}

async function watchReel(p: Player, item: ItemStack | undefined): Promise<void> {
  const s = st();
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
    save();
  }
  unlock(p, `reel${n}`, true);
  const entry = ISLAND_ENTRIES.find((e) => e.id === `reel${n}`);
  if (!entry) return;
  ui(p, SND.cineCountdown, 0.6, 1.0);
  await formSession(p, async () => {
    const form = new ActionFormData().title(`§lReel ${n}: ${entry.title}`).body(entry.body);
    form.button("Rewind", "textures/ui/hollow/journal/item_film_reel");
    await showForm(p, form);
  });
}

// ------------------------------------------------------------------------- the Heart under the lake

const ARENA = (): Vector3 | undefined => (POINTS.heart_arena ?? [])[0];

function placeAltar(): void {
  const s = st();
  if (!isIsland() || s.altar) return;
  const a = ARENA();
  if (!a) return;
  const dim = world.getDimension("overworld");
  const near = world.getAllPlayers().some((p) => Math.hypot(p.location.x - a.x, p.location.z - a.z) < 44 && p.location.y < a.y + 30);
  if (!near) return;
  const at = { x: a.x, y: a.y, z: a.z - 9 };
  try {
    if (!dim.isChunkLoaded(at)) return;
    dim.getBlock(at)?.setPermutation(BlockPermutation.resolve("hollow:heart_altar"));
    s.altar = true;
    save();
  } catch {
    /* custom block not ready, try later */
  }
}

function onHeart(dead: Entity): void {
  if (dead.typeId !== ENT.heart || !isIsland()) return;
  const s = st();
  if (!s.heart) {
    s.heart = true;
    save();
  }
  for (const p of world.getAllPlayers()) unlock(p, "heart_island");
  say("Whatever that was, it was why the counters climbed going down. It's quiet now. Listen to it.", "heart", 0);
}

/** The Heartseeker on the island always points at the cavern under the crater. */
export function islandHeartTarget(): Vector3 | undefined {
  const a = ARENA();
  return a ? { x: a.x + 0.5, y: a.y, z: a.z + 0.5 } : undefined;
}

// ------------------------------------------------------------------------- public

export function surveyState(): Readonly<SurveyState> {
  return st();
}

export function surveySummary(): string {
  const s = st();
  return `survey: stations=${s.stations.length}/6 samples=${s.samples.join("+") || "-"} reels=${s.reels.length} stocked=${s.stocked.length}/${LOOT_CONTAINERS.length} heart=${s.heart}`;
}

export function registerSurveyComponents(ev: StartupEvent): void {
  const reg = ev.itemComponentRegistry;
  reg.registerCustomComponent("hollow:sample_kit", {
    onUse(e) {
      const p = e.source;
      system.run(() => safe("sample", () => p.isValid && takeSample(p)));
    },
  });
  reg.registerCustomComponent("hollow:sample", {
    onUse(e) {
      const p = e.source;
      const id = e.itemStack?.typeId;
      system.run(() => safe("sample.file", () => p.isValid && id && fileSample(p, id)));
    },
  });
  reg.registerCustomComponent("hollow:film_reel", {
    onUse(e) {
      const p = e.source;
      const item = e.itemStack;
      system.run(() => p.isValid && void watchReel(p, item));
    },
  });
  reg.registerCustomComponent("hollow:tower_part", {
    onUse(e) {
      const p = e.source;
      system.run(() => p.isValid && notice(p, "§7A spare for the 1957 relay transmitter. It goes in the cabinet in the hut under the tower on the north peak."));
    },
  });
}

/** Hot spots the ground-level model doesn't know about: the sealed labs, and the cavern under the lake. */
function hotSpots(p: Player): number {
  let extra = 0;
  for (const lab of POINTS.sealed_lab ?? []) {
    const d = Math.hypot(p.location.x - lab.x, p.location.y - lab.y, p.location.z - lab.z);
    if (d < 7) extra += 6 * (1 - d / 7);
  }
  const a = ARENA();
  if (a) {
    const d = Math.hypot(p.location.x - a.x, p.location.z - a.z);
    const below = a.y + 40 - p.location.y;          // stronger the deeper you go
    if (d < 40 && below > 0) extra += (st().heart ? 1.5 : 9) * Math.min(1, below / 40) * (1 - d / 40);
  }
  return extra;
}

export function startSurvey(): void {
  addRadiationSource(hotSpots);
  world.afterEvents.buttonPush.subscribe((ev) => safe("survey.button", () => {
    if (!isIsland() || !(ev.source instanceof Player)) return;
    const b = ev.block.location;
    for (const [key, c] of Object.entries(CONSOLES)) {
      if (c.x !== b.x || c.y !== b.y || c.z !== b.z) continue;
      if (key.startsWith("station")) logStation(ev.source, key);
      else consoleHook?.(ev.source, key);
      return;
    }
  }));
  world.afterEvents.entityDie.subscribe((ev) => safe("survey.die", () => {
    onHeart(ev.deadEntity);
    if (isIsland()) tissueFromKill(ev.deadEntity, ev.damageSource.damagingEntity);
  }));
  every("survey.stock", 60, stockNearby, 7);
  every("survey.altar", 100, placeAltar, 31);
  every("survey.glow", 200, () => {
    // the station masts blink while unlogged, so they can be found
    if (!isIsland()) return;
    const s = st();
    const dim = world.getDimension("overworld");
    for (const [k, c] of Object.entries(CONSOLES)) {
      if (!k.startsWith("station") || s.stations.includes(k)) continue;
      try {
        if (dim.isChunkLoaded(c)) particle(dim, "minecraft:redstone_ore_dust_particle", { x: c.x + 0.5, y: c.y + 6, z: c.z + 0.5 });
      } catch {
        /* ignore */
      }
    }
  }, 17);
}

let consoleHook: ((p: Player, key: string) => void) | undefined;
/** The tower module answers the tower and generator console buttons. */
export function onConsoleHook(fn: (p: Player, key: string) => void): void {
  consoleHook = fn;
}
