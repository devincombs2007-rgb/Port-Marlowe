import {
  BlockVolume, Dimension, ItemStack, LocationWaypoint, Player, StructureRotation, Vector3, WaypointTexture, world,
} from "@minecraft/server";
import { ui, worldSound } from "../core/audio";
import { settings } from "../core/config";
import { notice, particle } from "../core/fx";
import { DP, ITEM, PARTICLE, SND } from "../core/ids";
import { chance, compass, dist, distXZ, pick, rand, randInt, yawDir, yawOf } from "../core/math";
import { ctx } from "../core/players";
import { every, everyPlayer, later } from "../core/scheduler";
import { readWorldArray, writeWorld } from "../core/store";
import { BUILT_BLOCKS, LOGS, block, findBlocks, groundNear, hasBlockNear, isOverworld } from "../core/world";
import { unlock } from "./journal";

// SITES: the ranger cabin, the ruined campsite and the underground shrine.
//
// Placement uses world.structureManager with .mcstructure files shipped in the behavior pack.
// Surface sites are placed lazily near exploring players (56-80 blocks away, behind them) so they
// appear in new AND existing worlds without world generation, terrain scans or chunk loading.
// Every placement is checked first: loaded chunks, flat dry ground, no tree trunks, and no
// player-built blocks anywhere near the footprint. Existing builds are never overwritten.

export type SiteType = "cabin" | "camp" | "tower" | "leanto" | "shrine";

export interface Site {
  t: SiteType;
  d: string;
  x: number;
  y: number;
  z: number;
  /** footprint size */
  sx: number;
  sz: number;
  sy: number;
}

interface Def {
  /** structure variants; one is picked at random per placement */
  structures: string[];
  size: [number, number, number];
  /** blocks below the origin the foundation reaches */
  sink: number;
  spacing: number;
  cap: number;
  /** loot table for containers inside the structure (empty = none) */
  lootTable: string;
  journal: string;
}

const DEFS: Record<SiteType, Def> = {
  cabin: { structures: ["hollow:cabin", "hollow:cabin_collapsed"], size: [11, 9, 11], sink: 1, spacing: 320, cap: 8, lootTable: "hollow/sites/cabin", journal: "place_cabin" },
  camp: { structures: ["hollow:campsite"], size: [13, 6, 13], sink: 1, spacing: 256, cap: 10, lootTable: "hollow/sites/campsite", journal: "place_camp" },
  tower: { structures: ["hollow:watchtower"], size: [7, 15, 7], sink: 1, spacing: 480, cap: 4, lootTable: "hollow/sites/tower", journal: "place_tower" },
  leanto: { structures: ["hollow:leanto"], size: [7, 5, 7], sink: 1, spacing: 220, cap: 8, lootTable: "hollow/sites/leanto", journal: "place_leanto" },
  shrine: { structures: ["hollow:shrine"], size: [25, 13, 25], sink: 0, spacing: 0, cap: 1, lootTable: "", journal: "place_shrine" },
};

let sites: Site[] | undefined;

export function allSites(): Site[] {
  if (!sites) sites = readWorldArray<Site>(DP.sites).filter((s) => s && typeof s.x === "number" && DEFS[s.t]);
  return sites;
}

function saveSites(): void {
  writeWorld(DP.sites, allSites());
}

const siteCenter = (s: Site): Vector3 => ({ x: s.x + s.sx / 2, y: s.y + 1, z: s.z + s.sz / 2 });

export function shrine(): Site | undefined {
  return allSites().find((s) => s.t === "shrine");
}

export function shrineCenter(): Vector3 | undefined {
  const s = shrine();
  return s ? siteCenter(s) : undefined;
}

// ------------------------------------------------------------------------------ checks

function loadedBox(dim: Dimension, o: Vector3, size: [number, number, number]): boolean {
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

function surfaceOk(dim: Dimension, o: Vector3, def: Def): boolean {
  const [sx, sy, sz] = def.size;
  if (!loadedBox(dim, o, def.size)) return false;
  // Flatness: the ground at the corners and centre must sit within 2 blocks of the origin.
  const pts = [[1, 1], [sx - 2, 1], [1, sz - 2], [sx - 2, sz - 2], [Math.floor(sx / 2), Math.floor(sz / 2)]];
  for (const [dx, dz] of pts) {
    const g = groundNear(dim, o.x + dx, o.y, o.z + dz, 3, 2);
    if (!g || Math.abs(g.y - o.y) > 2) return false;
    const below = block(dim, { x: g.x, y: g.y - 1, z: g.z });
    if (!below || below.isLiquid) return false;
  }
  const vol = new BlockVolume({ x: o.x - 4, y: o.y - def.sink, z: o.z - 4 }, { x: o.x + sx + 3, y: o.y + sy, z: o.z + sz + 3 });
  try {
    if (dim.containsBlock(vol, { includeTypes: BUILT_BLOCKS }, false)) return false; // never near player builds
    const inner = new BlockVolume({ x: o.x, y: o.y, z: o.z }, { x: o.x + sx - 1, y: o.y + sy - 1, z: o.z + sz - 1 });
    if (dim.containsBlock(inner, { includeTypes: LOGS }, false)) return false; // don't cut trees in half
    if (dim.containsBlock(inner, { includeTypes: ["minecraft:water", "minecraft:flowing_water", "minecraft:lava", "minecraft:flowing_lava"] }, false)) return false;
  } catch {
    return false;
  }
  return true;
}

function farFromOthers(dim: Dimension, at: Vector3, t: SiteType, spacing: number): boolean {
  for (const s of allSites()) {
    if (s.d !== dim.id) continue;
    const min = s.t === t ? spacing : 96;
    if (distXZ(siteCenter(s), at) < min) return false;
  }
  return true;
}

// ------------------------------------------------------------------------------ placement

function place(dim: Dimension, t: SiteType, origin: Vector3): Site | undefined {
  const def = DEFS[t];
  const rot = pick([StructureRotation.None, StructureRotation.Rotate90, StructureRotation.Rotate180, StructureRotation.Rotate270]);
  const o = { x: Math.floor(origin.x), y: Math.floor(origin.y) - def.sink, z: Math.floor(origin.z) };
  try {
    world.structureManager.place(pick(def.structures), dim, o, { rotation: rot, includeEntities: false, waterlogged: false });
  } catch (e) {
    console.warn(`[hollow] could not place ${def.structures[0]}: ${e}`);
    return undefined;
  }
  const site: Site = { t, d: dim.id, x: o.x, y: o.y + def.sink, z: o.z, sx: def.size[0], sy: def.size[1], sz: def.size[2] };
  allSites().push(site);
  saveSites();
  if (def.lootTable) later("sites.fill", 2, () => fill(dim, site));
  return site;
}

// A creature switched off in World Rules can't drop its Offering component, so every site chest
// carries that component instead. Boss progression never depends on a disabled creature.
const DISABLED_SUPPLY: [keyof ReturnType<typeof settings>, string, number][] = [
  ["watcher", ITEM.paleResin, 1],
  ["borrowed", ITEM.borrowedHide, 1],
  ["hollowed", ITEM.hollowFang, 2],
  ["knocker", ITEM.knockerNail, 1],
  ["mirebound", ITEM.mirePearl, 1],
];

const SIGNS: Partial<Record<SiteType, string>> = {
  cabin: "§lMISSING§r\nRanger E. Marlowe\nLast seen: the\neast woods",
  camp: "DON'T\nANSWER\nTHE\nDOOR",
  tower: "FIRE WATCH 3\nlights in the\ntrees again.\nnot ours.",
  leanto: "went to check\nthe noise.\nback by dark",
};

/** Fill containers from the site's loot table and write the cabin's notice board. */
function fill(dim: Dimension, s: Site): void {
  const def = DEFS[s.t];
  const c = { x: s.x + Math.floor(s.sx / 2), y: s.y + 2, z: s.z + Math.floor(s.sz / 2) };
  const r = Math.max(s.sx, s.sz);
  const containers = findBlocks(dim, c, ["minecraft:chest", "minecraft:barrel"], Math.ceil(r / 2), s.sy, Math.ceil(r / 2), 4);
  const mgr = world.getLootTableManager();
  const table = mgr.getLootTable(def.lootTable);
  for (const loc of containers) {
    const b = block(dim, loc);
    const inv = b?.getComponent("minecraft:inventory")?.container;
    if (!inv) continue;
    const loot = table ? mgr.generateLootFromTable(table) ?? [] : [];
    for (const [rule, id, n] of DISABLED_SUPPLY) {
      if (!settings()[rule]) loot.push(new ItemStack(id, n));
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
        SIGNS[s.t] ?? "",
      );
    } catch {
      /* sign not ready */
    }
  }
}

function trySurfaceSite(p: Player): void {
  const s = settings();
  if (!s.sites) return;
  const c = ctx(p);
  if (!c.overworld || c.underground || c.inWater || c.roofed) return;
  if (!chance(0.3)) return;
  const dim = p.dimension;
  const spawn = world.getDefaultSpawnLocation();
  if (distXZ(p.location, spawn) < 96) return;
  const bed = p.getSpawnPoint();
  if (c.biome !== "forest" && c.biome !== "open") return;
  const r = Math.random();
  const t: SiteType = c.biome === "forest"
    ? (r < 0.45 ? "cabin" : r < 0.65 ? "camp" : r < 0.82 ? "tower" : "leanto")
    : (r < 0.65 ? "camp" : "leanto");
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

// ------------------------------------------------------------------------------ shrine

function makeShrine(p: Player): Site | undefined {
  const dim = p.dimension;
  const def = DEFS.shrine;
  const minY = dim.heightRange.min;
  for (let k = 0; k < 10; k++) {
    const dir = yawDir(rand(0, 360));
    // 32-48 blocks keeps the whole 25x25 footprint inside a 4-chunk simulation distance (Realms default)
    const r = rand(32, 48);
    const cx = Math.floor(p.location.x + dir.x * r);
    const cz = Math.floor(p.location.z + dir.z * r);
    const y = Math.max(minY + 8, Math.min(-12, Math.floor(p.location.y) - 40) - randInt(0, 12));
    const o = { x: cx - Math.floor(def.size[0] / 2), y, z: cz - Math.floor(def.size[2] / 2) };
    if (!loadedBox(dim, o, def.size)) continue;
    try {
      const vol = new BlockVolume({ x: o.x - 1, y: o.y - 1, z: o.z - 1 }, { x: o.x + def.size[0], y: o.y + def.size[1], z: o.z + def.size[2] });
      if (dim.containsBlock(vol, { includeTypes: ["minecraft:lava", "minecraft:flowing_lava", "minecraft:water", "minecraft:flowing_water"] }, false)) continue;
      if (dim.containsBlock(vol, { includeTypes: BUILT_BLOCKS }, false)) continue;
    } catch {
      continue;
    }
    return place(dim, "shrine", o);
  }
  return undefined;
}

const waypoints = new Map<string, { player: Player; point: LocationWaypoint }>();

export function useHeartseeker(p: Player): void {
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
  ui(p, SND.heartseeker, 1, d < 32 ? 1.3 : d < 96 ? 1.0 : 0.8);
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
      { red: 0.85, green: 0.25, blue: 0.2 },
    );
    p.locatorBar.addWaypoint(wp);
    waypoints.set(p.id, { player: p, point: wp });
  } catch {
    /* locator bar disabled by game rule */
  }
}

export function forgetSites(playerId: string): void {
  const old = waypoints.get(playerId);
  try {
    if (old?.player.isValid && old.point.isValid) old.player.locatorBar.removeWaypoint(old.point);
  } catch { /* player left or locator bar unavailable */ }
  waypoints.delete(playerId);
}

// ------------------------------------------------------------------------------ proximity

function discover(p: Player): void {
  if (!isOverworld(p.dimension)) return;
  for (const s of allSites()) {
    if (s.d !== p.dimension.id) continue;
    const r = s.t === "shrine" ? 22 : 16;
    if (dist(siteCenter(s), p.location) <= r) unlock(p, DEFS[s.t].journal);
  }
}

export function startSites(): void {
  everyPlayer("sites.place", 1200, trySurfaceSite);
  everyPlayer("sites.discover", 100, discover);
  every("sites.validate", 6000, () => {
    // drop records whose structure was removed (e.g. by /fill) once a player is nearby
    for (const s of [...allSites()]) {
      let dim: Dimension;
      try {
        dim = world.getDimension(s.d);
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

/** Admin/debug helper: place a site right now near a player (used by /scriptevent). */
export function forceSite(p: Player, t: SiteType): string {
  if (t === "shrine") {
    const s = shrine() ?? makeShrine(p);
    return s ? `shrine at ${s.x} ${s.y} ${s.z}` : "no valid shrine location";
  }
  const def = DEFS[t];
  const dir = yawDir(yawOf(p.getViewDirection()));
  const g = groundNear(p.dimension, p.location.x + dir.x * 20, p.location.y, p.location.z + dir.z * 20, 10, 4);
  if (!g) return "no ground";
  const o = { x: Math.floor(g.x - def.size[0] / 2), y: g.y, z: Math.floor(g.z - def.size[2] / 2) };
  const s = place(p.dimension, t, o);
  return s ? `${t} at ${s.x} ${s.y} ${s.z}` : "placement failed";
}
