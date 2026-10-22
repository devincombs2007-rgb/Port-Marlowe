import { EquipmentSlot, GameMode, Player, Vector3, system } from "@minecraft/server";
import { CRATER_R, SITES } from "../content/island_layout";
import { ui } from "../core/audio";
import { notice } from "../core/fx";
import { DP, ITEM, SND } from "../core/ids";
import { everyPlayer } from "../core/scheduler";
import { readEntity, writeEntity } from "../core/store";
import { now } from "../core/time";
import { isIsland } from "./mode";

// RADIATION (Varrow Island). A second meter beside Dread: a dose in millisieverts that builds
// while you stay somewhere contaminated and falls only slowly once you leave.
//
//   dose rate (mSv/h, as the Geiger counter reads it)
//     Ground Zero crater floor ~120, the rim ~90, falling off with distance to a background 0.1
//     the crater lake: four times the ground around it, and the water poisons
//     underground (rock overhead) blocks most of it
//   uptake: rate / 120 mSv per second of exposure (a minute on the rim ~ 45 mSv),
//     halved for five minutes by iodine tablets
//   recovery: 0.4 mSv per second whenever the local rate is below 1 mSv/h
//   effects:  100 hunger  ·  300 nausea spells  ·  600 weakness  ·  1000 radiation sickness
//             (recurring poison)  ·  1500 the body starts to fail (brief withering)

export interface RadState {
  dose: number;
  /** tick until which iodine halves uptake */
  iodine: number;
  /** highest dose band already explained to this player */
  told: number;
}

const DEFAULT: RadState = { dose: 0, iodine: 0, told: 0 };
const cache = new Map<string, RadState>();
const lastSave = new Map<string, number>();

export function radState(p: Player): RadState {
  let s = cache.get(p.id);
  if (!s) {
    const raw = readEntity<RadState>(p, DP.rad, DEFAULT);
    s = {
      dose: Number.isFinite(raw.dose) ? Math.max(0, Math.min(3000, raw.dose)) : 0,
      iodine: 0, // runtime ticks do not survive a restart; the tablets wear off
      told: Number.isFinite(raw.told) ? raw.told : 0,
    };
    cache.set(p.id, s);
  }
  return s;
}

function save(p: Player, s: RadState, force = false): void {
  const t = now();
  if (!force && t - (lastSave.get(p.id) ?? -9999) < 200) return;
  lastSave.set(p.id, t);
  writeEntity(p, DP.rad, { dose: Math.round(s.dose * 10) / 10, iodine: 0, told: s.told });
}

export function forgetRadiation(playerId: string): void {
  cache.delete(playerId);
  lastSave.delete(playerId);
}

const GZ = SITES.GZ;

/** Ground dose rate at a point, mSv/h (no shielding, no water). */
export function groundRate(at: Vector3): number {
  const d = Math.hypot(at.x - GZ.x, at.z - GZ.z);
  const core = 120 * Math.exp(-Math.max(0, d - 30) / 45);
  return Math.max(0.1, core);
}

export function inCraterLake(p: Player): boolean {
  const d = Math.hypot(p.location.x - GZ.x, p.location.z - GZ.z);
  return p.isInWater && d < CRATER_R + 6; // the lake edge is ragged (+-6 blocks)
}

function shielded(p: Player): boolean {
  try {
    const dim = p.dimension;
    const top = dim.getTopmostBlock({ x: p.location.x, z: p.location.z });
    return !!top && top.location.y > p.location.y + 6;
  } catch {
    return false;
  }
}

/** The rate this player is exposed to right now, mSv/h (before the hazmat suit). */
export function rateAt(p: Player): number {
  if (p.dimension.id !== "minecraft:overworld") return 0.1;
  let r = groundRate(p.location);
  if (inCraterLake(p)) r *= 4;
  if (shielded(p)) r *= 0.3;
  for (const extra of extraSources) r += extra(p);
  return Math.max(0.1, r);
}

/** Other sources (sealed bunker labs, cult shrines...) register here. */
const extraSources: ((p: Player) => number)[] = [];
export function addRadiationSource(fn: (p: Player) => number): void {
  extraSources.push(fn);
}

const HAZMAT: [EquipmentSlot, string, number][] = [
  [EquipmentSlot.Head, ITEM.hazmatHood, 0.25], [EquipmentSlot.Chest, ITEM.hazmatSuit, 0.35],
  [EquipmentSlot.Legs, ITEM.hazmatTrousers, 0.2], [EquipmentSlot.Feet, ITEM.hazmatBoots, 0.1],
];

/** Fraction of radiation the hazmat pieces worn keep out (0..0.9). */
export function suitProtection(p: Player): number {
  let k = 0;
  try {
    const eq = p.getComponent("minecraft:equippable");
    for (const [slot, id, v] of HAZMAT) if (eq?.getEquipment(slot)?.typeId === id) k += v;
  } catch {
    /* ignore */
  }
  return Math.min(0.9, k);
}

export function fullSuit(p: Player): boolean {
  return suitProtection(p) >= 0.89;
}

/** Chelation shot: pulls a third of the dose (and at least 120 mSv) out over the next minute. */
export function chelate(p: Player): void {
  const s = radState(p);
  const target = Math.max(0, s.dose - Math.max(120, s.dose / 3));
  const step = (s.dose - target) / 12;
  let n = 0;
  const run = system.runInterval(() => {
    if (!p.isValid || ++n > 12) {
      system.clearRun(run);
      return;
    }
    s.dose = Math.max(0, s.dose - step);
    if (n === 12) save(p, s, true);
  }, 100);
  notice(p, "§7The shot burns going in. §fYour dose will come down over the next minute.");
}

export function band(dose: number): number {
  return dose >= 1500 ? 5 : dose >= 1000 ? 4 : dose >= 600 ? 3 : dose >= 300 ? 2 : dose >= 100 ? 1 : 0;
}

export function bandName(dose: number): string {
  return ["none", "mild", "moderate", "serious", "severe", "critical"][band(dose)];
}

const BAND_TEXT = [
  "",
  "§eYour mouth tastes of metal. You've taken a real dose of radiation.",
  "§6Nausea rolls through you. The dose is building: get away from the crater.",
  "§cYour limbs feel heavy and weak. Radiation sickness is setting in.",
  "§cYou're sick, properly sick. Get out of the contaminated ground and take iodine.",
  "§4Your body is failing. Leave the zone now.",
];

function holdsGeiger(p: Player): boolean {
  try {
    const eq = p.getComponent("minecraft:equippable");
    return eq?.getEquipment(EquipmentSlot.Mainhand)?.typeId === ITEM.geiger ||
      eq?.getEquipment(EquipmentSlot.Offhand)?.typeId === ITEM.geiger;
  } catch {
    return false;
  }
}

export function geigerLevel(rate: number): number {
  return rate < 0.6 ? 0 : rate < 5 ? 1 : rate < 25 ? 2 : rate < 70 ? 3 : 4;
}

function fmt(n: number): string {
  return n < 10 ? n.toFixed(1) : String(Math.round(n));
}

function tick(p: Player): void {
  if (!isIsland()) return;
  const gm = p.getGameMode();
  if (gm === GameMode.Creative || gm === GameMode.Spectator) return;
  const hp = p.getComponent("minecraft:health");
  if (hp && hp.currentValue <= 0) return;
  const s = radState(p);
  const rate = rateAt(p);
  const t = now();
  const suit = suitProtection(p);
  if (suit >= 0.55) {
    // the rubber suit is heavy and hot
    try {
      p.addEffect("slowness", 40, { amplifier: 0, showParticles: false });
    } catch {
      /* ignore */
    }
  }
  if (rate >= 1) {
    const iodine = s.iodine > t ? 0.5 : 1;
    s.dose = Math.min(3000, s.dose + (rate / 120) * iodine * (1 - suit));
  } else {
    s.dose = Math.max(0, s.dose - 0.4);
  }
  // toxic crater water burns on contact (the full suit keeps it off your skin)
  if (inCraterLake(p) && suit < 0.89) {
    try {
      p.addEffect("poison", 50, { amplifier: 1, showParticles: false });
    } catch {
      /* ignore */
    }
    if (t % 100 < 20) notice(p, "§aThe water is warm, and it stings like acid. §7Get out.");
  }
  // effects by dose band (every second; durations overlap so they read as continuous)
  const b = band(s.dose);
  try {
    if (b >= 1 && t % 600 < 20) p.addEffect("hunger", 200, { amplifier: 0, showParticles: false });
    if (b >= 2 && t % 900 < 20) p.addEffect("nausea", 160, { amplifier: 0, showParticles: false });
    if (b >= 3) p.addEffect("weakness", 40, { amplifier: 0, showParticles: false });
    if (b >= 4 && t % 400 < 20) p.addEffect("poison", 60, { amplifier: 0, showParticles: false });
    if (b >= 5 && t % 600 < 20) p.addEffect("wither", 40, { amplifier: 0, showParticles: false });
  } catch {
    /* effect unavailable */
  }
  if (b > s.told) {
    s.told = b;
    notice(p, BAND_TEXT[b]);
    save(p, s, true);
  } else if (b < s.told - 1) {
    s.told = b; // recovered a band: warn again next time it climbs
  }
  // the counter in your hand ticks with the local rate and shows a running readout
  if (holdsGeiger(p)) {
    ui(p, SND.geiger[geigerLevel(rate)], 0.9);
    notice(p, `§a☢ §f${fmt(rate)} §7mSv/h${suit > 0 ? ` §8(suit -${Math.round(suit * 100)}%)` : ""}   §8·   §7dose §f${fmt(s.dose)} §7mSv §8(${bandName(s.dose)})`);
  }
  save(p, s);
}

/** Geiger "Take reading": rate, dose and which way the reading climbs. */
export function geigerReading(p: Player): string {
  const s = radState(p);
  const rate = rateAt(p);
  const dirs = [["N", 0, -1], ["NE", 1, -1], ["E", 1, 0], ["SE", 1, 1], ["S", 0, 1], ["SW", -1, 1], ["W", -1, 0], ["NW", -1, -1]] as const;
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
  return `§a☢ Reading: §f${fmt(rate)} mSv/h§7. ${trend}\n§7Your dose: §f${fmt(s.dose)} mSv §7(${bandName(s.dose)})${iod}`;
}

export function takeIodine(p: Player): void {
  const s = radState(p);
  s.iodine = now() + 6000;
  notice(p, "§7Iodine tablets: your thyroid is blocked. §fRadiation uptake halved for 5 minutes.");
}

/** Used by the test kit and by treatment items. */
export function setDose(p: Player, dose: number): void {
  const s = radState(p);
  s.dose = Math.max(0, Math.min(3000, dose));
  s.told = band(s.dose);
  save(p, s, true);
}

export function startRadiation(): void {
  everyPlayer("radiation", 20, tick);
}
