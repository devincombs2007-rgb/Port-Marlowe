import { frighten } from "../core/fear";
import { Block, Dimension, EntityDamageCause, Entity, EquipmentSlot, GameMode, ItemStack, Player, Vector3, world } from "@minecraft/server";
import { accent, worldSound } from "../core/audio";
import { settings } from "../core/config";
import { hint, notice, particle, popFog, pushFog } from "../core/fx";
import { BLOCK, DP, ENT, FOG, ITEM, PARTICLE, SND } from "../core/ids";
import { add, angleTo, distXZ, norm, rand, rotateXZ, scale, sub } from "../core/math";
import { every, later } from "../core/scheduler";
import { readWorld, writeWorld } from "../core/store";
import { hollowDay, now } from "../core/time";
import { block, clearLine, findBlocks, groundNear, withCustomState } from "../core/world";
import { giveOrDrop } from "../items/components";
import { unlock } from "../systems/journal";
import { shrine } from "../systems/sites";
import { spawnJuvenile } from "./hollowed";

// THE HEART BELOW
// Awakened deliberately: a Hush Offering placed in the shrine altar.
//  Phase 1 (100-60%): shielded until all four veins on the pillars are broken. Root bursts at
//    each player's feet (dust + rumble warn 1.2 s ahead) and a slow pulse ring you can jump.
//  Phase 2 (60-25%): shield returns, three veins regrow once, young Hollowed crawl out.
//  Phase 3 (<25%): it opens. Faster bursts, and a sweeping gaze blocked by the pillars.
// Scaling: health groups by player count at awakening (300/480/660/840), one burst per player,
// minions 2 + players (max 5), tougher veins with 3+ players.
// Rewards: every participant (dealt damage or present at the end) gets one Stilled Heart and
// XP, exactly once per kill; shared loot drops from the loot table. The altar then rests 3 days.
// If everyone leaves the arena for 60 s it goes dormant and returns the Offering.
// Persistence: the fight lives in a world dynamic property. Every boss entity carries the fight's
// token, so after a reload the heart and veins are re-bound by token (not by entity id), and any
// heart or vein from an older or abandoned fight is removed. A reload during the 6 s rise simply
// re-runs the rise; dormancy waits until the arena chunk is loaded so nothing is left behind.

interface Boss {
  active: boolean;
  dim: string;
  center: Vector3;
  heartId: string;
  veins: string[];
  phase: number;
  regrown: boolean;
  startedAt: number;
  restUntilDay: number;
  participants: Record<string, number>;
  /** identifies this fight's entities (entity dynamic property hollow:fight) */
  token: number;
  /** players counted at awakening, for scaling */
  scale: number;
}

const FIGHT = DP.fight;

const EMPTY: Boss = {
  active: false, dim: "minecraft:overworld", center: { x: 0, y: 0, z: 0 }, heartId: "", veins: [], phase: 1, regrown: false,
  startedAt: 0, restUntilDay: -1, participants: {}, token: 0, scale: 1,
};

let boss: Boss = EMPTY;
let loaded = false;
const minions = new Set<string>();
let nextBurst = 0, nextPulse = 0, nextGaze = 0, nextBeat = 0, nextDrone = 0, lastPresence = 0;
let rising = false;
let missingSince = -1;
const gazeHit = new Map<string, number>();

function load(): Boss {
  if (!loaded) {
    boss = { ...EMPTY, ...readWorld<Boss>(DP.boss, EMPTY) };
    loaded = true;
    lastPresence = now();
  }
  return boss;
}

function save(): void {
  writeWorld(DP.boss, boss);
}

export const bossActive = (): boolean => load().active;

/** True while a fight is on and this player is in its arena (used by the music director). */
export function inBossArena(p: Player): boolean {
  if (!load().active || p.dimension.id !== boss.dim) return false;
  const c = boss.center;
  return Math.hypot(p.location.x - c.x, p.location.z - c.z) <= 18 && Math.abs(p.location.y - c.y) < 9;
}
export const isBossEntity = (id: string): boolean => load().active && (id === boss.heartId || boss.veins.includes(id));

/** Cleanup rule for hearts and veins: keep only entities of the fight in progress. */
export function isCurrentFightEntity(e: Entity): boolean {
  if (!load().active || !boss.token) return false;
  try {
    return e.getDynamicProperty(FIGHT) === boss.token;
  } catch {
    return false;
  }
}

function arenaLoaded(dim: Dimension): boolean {
  try {
    return dim.isChunkLoaded(boss.center);
  } catch {
    return false;
  }
}

function dimOf(): Dimension | undefined {
  try {
    return world.getDimension(boss.dim);
  } catch {
    return undefined;
  }
}

function arenaPlayers(): Player[] {
  const dim = dimOf();
  if (!dim) return [];
  try {
    return dim.getPlayers({ location: boss.center, maxDistance: 18 }).filter((p) => Math.abs(p.location.y - boss.center.y) < 9);
  } catch {
    return [];
  }
}

function survival(p: Player): boolean {
  const gm = p.getGameMode();
  return gm === GameMode.Survival || gm === GameMode.Adventure;
}

// ------------------------------------------------------------------------------- awakening

function veinSpots(c: Vector3): Vector3[] {
  // pillars sit at +/-6 from the arena centre; veins face inward on each pillar's inner corner
  const out: Vector3[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out.push({ x: c.x + sx * 4.3, y: c.y + 1.5, z: c.z + sz * 4.3 });
    }
  }
  return out;
}

function setAltar(dim: Dimension, awake: boolean): Block | undefined {
  for (const loc of findBlocks(dim, boss.center, [BLOCK.altar], 13, 6, 13, 2)) {
    const b = block(dim, loc);
    if (!b) continue;
    try {
      b.setPermutation(withCustomState(b.permutation, "hollow:awake", awake ? 1 : 0));
    } catch {
      /* ignore */
    }
    return b;
  }
  return undefined;
}

export function useAltar(p: Player, altar: Block): void {
  load();
  const eq = p.getComponent("minecraft:equippable");
  const held = eq?.getEquipment(EquipmentSlot.Mainhand);
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
  const center = s && s.d === dim.id
    ? { x: s.x + Math.floor(s.sx / 2) + 0.5, y: s.y + 3, z: s.z + Math.floor(s.sz / 2) + 0.5 }
    : add(altar.location, { x: 0.5, y: 1, z: 9.5 });
  if (survival(p)) {
    if (held.amount > 1) {
      held.amount -= 1;
      eq!.setEquipment(EquipmentSlot.Mainhand, held);
    } else eq!.setEquipment(EquipmentSlot.Mainhand, undefined);
  }
  awaken(dim, center, altar);
}

function awaken(dim: Dimension, center: Vector3, altar: Block): void {
  boss = {
    ...EMPTY, active: true, dim: dim.id, center, startedAt: now(), restUntilDay: boss.restUntilDay, participants: {},
    token: 1 + Math.floor(Math.random() * 2_000_000_000), scale: 1,
  };
  const players = arenaPlayers();
  const n = Math.max(1, players.length);
  boss.scale = n;
  save();
  worldSound(dim, SND.altar, altar.center());
  worldSound(dim, SND.heartAwaken, center, 1.0);
  try {
    altar.setPermutation(withCustomState(altar.permutation, "hollow:awake", 1));
  } catch {
    /* ignore */
  }
  for (const p of players) {
    pushFog(p, FOG.heart, "hollow_heart");
    unlock(p, "heart1");
    unlock(p, "heart2");
    try {
      p.onScreenDisplay.setTitle("§4The Heart Below", { subtitle: "§7wakes", fadeInDuration: 20, stayDuration: 50, fadeOutDuration: 30 });
      frighten(p, 20);
    } catch {
      /* ignore */
    }
  }
  rising = true;
  later("heart.rise", 120, () => rise(dim));
}

/** The heart rises from the roots. Also re-run after a reload that interrupted the rise. */
function rise(dim: Dimension): void {
  rising = false;
  if (!boss.active || boss.heartId) return;
  const n = boss.scale;
  let heart: Entity;
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
      /* ignore */
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
  save();
}

function spawnVeins(dim: Dimension, count: number, players: number): void {
  const spots = veinSpots(boss.center).slice(0, count);
  for (const at of spots) {
    try {
      const v = dim.spawnEntity(ENT.vein, at);
      v.setDynamicProperty(FIGHT, boss.token);
      if (players >= 3) v.triggerEvent("hollow:tough");
      boss.veins.push(v.id);
      particle(dim, PARTICLE.veinMote, at);
    } catch {
      /* unloaded */
    }
  }
}

// ------------------------------------------------------------------------------- attacks

function hurt(p: Player, amount: number, heart: Entity | undefined): void {
  try {
    p.applyDamage(amount, heart ? { cause: EntityDamageCause.entityAttack, damagingEntity: heart } : { cause: EntityDamageCause.entityAttack });
  } catch {
    /* ignore */
  }
}

function rootBurst(dim: Dimension, heart: Entity, players: Player[]): void {
  for (const p of players.slice(0, 5)) {
    const g = groundNear(dim, p.location.x, p.location.y, p.location.z, 3, 2) ?? p.location;
    const at = { x: g.x, y: g.y, z: g.z };
    particle(dim, PARTICLE.rootWarn, at);
    worldSound(dim, SND.heartRootWarn, at, 0.9);
    later("heart.burst", 24, () => {
      if (!boss.active) return;
      worldSound(dim, SND.heartRootStrike, at, 1.0);
      try {
        dim.spawnEntity(ENT.rootSpike, at);
      } catch {
        /* ignore */
      }
      for (const q of dim.getPlayers({ location: at, maxDistance: 2.6 })) {
        if (distXZ(q.location, at) > 1.7 || Math.abs(q.location.y - at.y) > 2.5) continue;
        hurt(q, 6, heart.isValid ? heart : undefined);
        try {
          q.applyKnockback({ x: 0, z: 0 }, 0.55);
        } catch {
          /* ignore */
        }
      }
    });
  }
}

function pulse(dim: Dimension, heart: Entity, players: Player[]): void {
  worldSound(dim, SND.heartBeatFast, heart.location, 1.0);
  particle(dim, PARTICLE.spores, add(heart.location, { x: 0, y: 2.5, z: 0 }));
  later("heart.pulse", 20, () => {
    if (!boss.active) return;
    const origin = { x: boss.center.x, y: boss.center.y - 1.8, z: boss.center.z };
    worldSound(dim, SND.heartPulse, origin, 1.0);
    particle(dim, PARTICLE.pulseRing, add(origin, { x: 0, y: 0.15, z: 0 }));
    for (const p of players) {
      const d = distXZ(p.location, origin);
      if (d < 2 || d > 15) continue;
      const delay = Math.max(1, Math.round((d / 9) * 20));
      later("heart.pulse.hit", delay, () => {
        if (!boss.active || !p.isValid) return;
        const dNow = distXZ(p.location, origin);
        if (!p.isOnGround || Math.abs(dNow - d) > 2.2) return; // jumped it, or moved out of its path
        hurt(p, 5, heart.isValid ? heart : undefined);
        const out = norm(sub(p.location, origin));
        try {
          p.applyKnockback({ x: out.x * 0.7, z: out.z * 0.7 }, 0.25);
        } catch {
          /* ignore */
        }
      });
    }
  });
}

function gaze(dim: Dimension, heart: Entity, players: Player[]): void {
  if (players.length === 0) return;
  const target = players[Math.floor(Math.random() * players.length)];
  const core = add(heart.location, { x: 0, y: 1.3, z: 0 });
  worldSound(dim, SND.heartDrone, core, 1.0);
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
        if (!clearLine(dim, core, head)) continue; // behind a pillar: safe
        if ((gazeHit.get(p.id) ?? 0) > now()) continue;
        gazeHit.set(p.id, now() + 20);
        hurt(p, 3, heart);
        p.addEffect("slowness", 20, { amplifier: 1, showParticles: false });
      }
    });
  }
}

// ------------------------------------------------------------------------------- phases

function hpFraction(e: Entity): number {
  const h = e.getComponent("minecraft:health");
  return h ? h.currentValue / Math.max(1, h.effectiveMax) : 1;
}

function toPhase(dim: Dimension, heart: Entity, phase: number): void {
  boss.phase = phase;
  worldSound(dim, SND.heartPhase, heart.location, 1.0);
  const players = arenaPlayers();
  if (phase === 2) {
    try {
      heart.triggerEvent("hollow:phase_2");
      heart.triggerEvent("hollow:shield");
    } catch {
      /* ignore */
    }
    if (!boss.regrown) {
      boss.regrown = true;
      spawnVeins(dim, 3, players.length);
    }
    const count = Math.min(5, 2 + players.length);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 360 + rand(0, 40);
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
      /* ignore */
    }
    nextGaze = now() + 60;
    for (const p of players) {
      accent(p, SND.stingerLow, 2, true);
      hint(p, "§7It opens. Stay behind the pillars when it looks for you.");
    }
  }
  save();
}

// ------------------------------------------------------------------------------- loop

function update(): void {
  if (!load().active) return;
  const dim = dimOf();
  if (!dim) return;
  const t = now();
  // Nothing can be checked, removed or returned while the arena is unloaded: wait for it.
  if (!arenaLoaded(dim)) return;
  const players = arenaPlayers();
  if (players.length > 0) lastPresence = t;
  else if (t - lastPresence > 1200) {
    dormant(dim);
    return;
  }
  if (!boss.heartId) {
    if (!rising) rise(dim); // a reload interrupted the rise
    return;
  }
  const heart = findHeart(dim);
  if (!heart) {
    // Entities load a moment after their chunk; only give up after 10 s of a loaded, empty arena.
    if (missingSince < 0) missingSince = t;
    else if (t - missingSince > 200) {
      console.warn("[hollow] the Heart is gone without dying; returning the Offering");
      dormant(dim);
    }
    return;
  }
  missingSince = -1;
  for (const p of players) pushFog(p, FOG.heart, "hollow_heart");

  // the veins
  boss.veins = boss.veins.filter((id) => world.getEntity(id)?.isValid);
  if (boss.veins.length === 0 && heart.getProperty("hollow:shielded") === true) rebindVeins(dim);
  if (boss.veins.length === 0 && boss.phase < 3 && heart.getProperty("hollow:shielded") === true) {
    try {
      heart.triggerEvent("hollow:expose");
    } catch {
      /* ignore */
    }
    worldSound(dim, SND.heartVeinBreak, heart.location, 1.0);
    for (const p of players) notice(p, "§cThe Heart is exposed!");
  }
  const hp = hpFraction(heart);
  if (boss.phase === 1 && hp <= 0.6) toPhase(dim, heart, 2);
  else if (boss.phase === 2 && hp <= 0.25) toPhase(dim, heart, 3);

  // heartbeat identity + drone
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

/** The heart by id, or re-bound by fight token if the id no longer resolves (e.g. after a reload). */
function findHeart(dim: Dimension): Entity | undefined {
  const byId = world.getEntity(boss.heartId);
  if (byId?.isValid) return byId;
  try {
    for (const e of dim.getEntities({ type: ENT.heart, location: boss.center, maxDistance: 24 })) {
      if (e.getDynamicProperty(FIGHT) === boss.token) {
        boss.heartId = e.id;
        rebindVeins(dim);
        save();
        return e;
      }
    }
  } catch {
    /* unloaded */
  }
  return undefined;
}

function rebindVeins(dim: Dimension): void {
  try {
    const found = dim.getEntities({ type: ENT.vein, location: boss.center, maxDistance: 24 })
      .filter((e) => e.getDynamicProperty(FIGHT) === boss.token)
      .map((e) => e.id);
    if (found.length > 0) {
      boss.veins = found;
      save();
    }
  } catch {
    /* unloaded */
  }
}

function clearMinions(): void {
  for (const id of [...boss.veins, ...minions]) {
    const e = world.getEntity(id);
    if (e?.isValid) {
      try {
        e.remove();
      } catch {
        /* gone */
      }
    }
  }
  minions.clear();
}

function dormant(dim: Dimension): void {
  // Remove every entity of this fight (the arena is loaded: update() checks before calling us).
  try {
    for (const type of [ENT.heart, ENT.vein]) {
      for (const e of dim.getEntities({ type, location: boss.center, maxDistance: 24 })) {
        if (e.getDynamicProperty(FIGHT) === boss.token) e.remove();
      }
    }
  } catch {
    /* unloaded */
  }
  clearMinions();
  rising = false;
  missingSince = -1;
  const altar = setAltar(dim, false);
  if (altar) {
    try {
      dim.spawnItem(new ItemStack(ITEM.offering, 1), add(altar.location, { x: 0.5, y: 1.2, z: 0.5 }));
    } catch {
      /* ignore */
    }
  }
  boss = { ...EMPTY, restUntilDay: boss.restUntilDay };
  save();
}

// ------------------------------------------------------------------------------- events

export function onBossHurt(hurtEntity: Entity, amount: number, by?: Entity): void {
  if (!isBossEntity(hurtEntity.id) || !(by instanceof Player)) return;
  boss.participants[by.id] = (boss.participants[by.id] ?? 0) + amount;
}

export function onShieldHit(heart: Entity): void {
  worldSound(heart.dimension, SND.heartRootWarn, heart.location, 0.4);
  for (const p of arenaPlayers()) hint(p, "§7It's shielded. Break the glowing veins on the pillars first.");
}

export function onVeinDied(id: string): void {
  if (!load().active) return;
  boss.veins = boss.veins.filter((v) => v !== id);
  save();
}

export function onHeartDied(id: string): void {
  if (!load().active || id !== boss.heartId) return;
  const dim = dimOf();
  const winners = new Set(Object.keys(boss.participants));
  for (const p of arenaPlayers()) winners.add(p.id);
  for (const pid of winners) {
    const p = world.getEntity(pid) as Player | undefined;
    if (!p?.isValid) continue;
    giveOrDrop(p, new ItemStack(ITEM.stilledHeart, 1));
    p.addExperience(150);
    unlock(p, "after");
    unlock(p, "craft_lantern");
    popFog(p, "hollow_heart");
    try {
      p.onScreenDisplay.setTitle("§7The Heart is still.", { fadeInDuration: 20, stayDuration: 60, fadeOutDuration: 40 });
    } catch {
      /* ignore */
    }
  }
  clearMinions();
  if (dim) setAltar(dim, false);
  boss = { ...EMPTY, restUntilDay: hollowDay() + 3 };
  save();
}

export function forgetBossPlayer(p: Player): void {
  popFog(p, "hollow_heart");
}

/** Test kit: drop the active Heart's health to the threshold of phase 2 or 3. */
export function forceBossPhase(phase: number): string {
  if (!load().active || !boss.heartId) return "no Heart is awake (use the altar first)";
  const heart = world.getEntity(boss.heartId);
  const h = heart?.getComponent("minecraft:health");
  if (!heart || !h) return "the Heart is not loaded; stand in the arena";
  const set = (f: number) => h.setCurrentValue(Math.max(1, Math.floor(h.effectiveMax * f)));
  if (phase <= 2) set(0.55);
  else if (boss.phase < 2) {
    set(0.55);
    later("test.phase3", 20, () => {
      if (heart.isValid) set(0.2);
    });
  } else set(0.2);
  return `the Heart drops to phase ${phase}`;
}

export function isMinion(id: string): boolean {
  return minions.has(id);
}

export function startHeart(): void {
  load();
  every("heart.update", 5, update, 13);
}

/** One-line state for /scriptevent hollow:status. */
export function bossSummary(): string {
  if (!load().active) return boss.restUntilDay > hollowDay() ? `resting until day ${boss.restUntilDay + 1}` : "dormant";
  return `phase ${boss.phase}, veins ${boss.veins.length}, participants ${Object.keys(boss.participants).length}`;
}
