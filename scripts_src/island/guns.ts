import {
  Entity, EntityDamageCause, EquipmentSlot, GameMode, ItemStack, Player, StartupEvent, Vector3, system,
} from "@minecraft/server";
import { ui, worldSound } from "../core/audio";
import { hint, notice, particle } from "../core/fx";
import { DP, ENT, ITEM, SND } from "../core/ids";
import { emitNoise } from "../systems/noise";
import { unlock } from "../systems/journal";
import { chelate, geigerReading, takeIodine } from "./radiation";
import { isIsland } from "./mode";
import { trevorEntity, trevorGone, trevorMenu } from "./trevor";
import { formSession } from "../core/forms";

// GEAR: the service pistol, the bolt-action rifle and the pump shotgun, the flare gun, the Geiger
// counter, medkits, rations, iodine, chelation shots and the radios.
//
// Guns fire instantly along your aim (a hitscan, so they play the same with a controller), are
// stopped by blocks, weaken at long range and hit harder to the head. The magazine is saved on
// the gun itself; sneak + Use reloads from the right ammunition in your inventory. Every shot is
// loud: the Hollowed hear it, and the island's other inhabitants hear it too.
//
//              rounds  damage        range  cycle  notes
//   pistol      7      7             48     0.3 s  9mm, quick reload
//   rifle       5      15            90     1.25 s .30 rounds, slow reload, deadly at range
//   shotgun     4      7 x 3 pellets 22     0.9 s  shells, a wide spread, devastating close up

interface Gun {
  item: string;
  ammo: string;
  ammoName: string;
  mag: number;
  damage: number;
  pellets: number;
  spread: number;
  range: number;
  falloffFrom: number;
  reloadTicks: number;
  sound: string;
  pitch: number;
  noise: number;
  shake: number;
  journal: string;
}

export const GUNS: Record<string, Gun> = {
  [ITEM.pistol]: { item: ITEM.pistol, ammo: ITEM.round, ammoName: "9mm rounds", mag: 7, damage: 7, pellets: 1, spread: 0, range: 48,
    falloffFrom: 20, reloadTicks: 26, sound: SND.pistol, pitch: 1.0, noise: 48, shake: 0.22, journal: "gear_pistol" },
  [ITEM.rifle]: { item: ITEM.rifle, ammo: ITEM.rifleRound, ammoName: ".30 rifle rounds", mag: 5, damage: 15, pellets: 1, spread: 0,
    range: 90, falloffFrom: 60, reloadTicks: 48, sound: SND.pistol, pitch: 0.7, noise: 64, shake: 0.4, journal: "gear_rifle" },
  [ITEM.shotgun]: { item: ITEM.shotgun, ammo: ITEM.shell, ammoName: "shotgun shells", mag: 4, damage: 3, pellets: 7, spread: 5.5,
    range: 22, falloffFrom: 8, reloadTicks: 40, sound: SND.pistol, pitch: 0.55, noise: 56, shake: 0.45, journal: "gear_shotgun" },
};
export const MAG_SIZE = 7;
const reloading = new Map<string, number>();

function survivalish(p: Player): boolean {
  const gm = p.getGameMode();
  return gm === GameMode.Survival || gm === GameMode.Adventure;
}

export function magOf(item: ItemStack | undefined): number {
  if (!item) return 0;
  const g = GUNS[item.typeId];
  const max = g?.mag ?? MAG_SIZE;
  const v = item.getDynamicProperty(DP.mag);
  return typeof v === "number" ? Math.max(0, Math.min(max, Math.round(v))) : max;
}

function setMag(item: ItemStack, n: number): void {
  const g = GUNS[item.typeId];
  item.setDynamicProperty(DP.mag, n);
  item.setLore([`§7Loaded: §f${n}§7/${g?.mag ?? MAG_SIZE}`, "§8Sneak + Use to reload"]);
}

/** A loaded gun, as issued or found. */
export function gunStack(typeId: string, rounds?: number): ItemStack {
  const s = new ItemStack(typeId, 1);
  setMag(s, rounds ?? GUNS[typeId]?.mag ?? MAG_SIZE);
  return s;
}

export function pistolStack(rounds = MAG_SIZE): ItemStack {
  return gunStack(ITEM.pistol, rounds);
}

function heldGun(p: Player): [ItemStack, Gun] | undefined {
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot.Mainhand);
  const g = item ? GUNS[item.typeId] : undefined;
  return item && g ? [item, g] : undefined;
}

function putBack(p: Player, item: ItemStack): void {
  p.getComponent("minecraft:equippable")?.setEquipment(EquipmentSlot.Mainhand, item);
}

function countAmmo(p: Player, ammo: string): number {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return 0;
  let n = 0;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it?.typeId === ammo) n += it.amount;
  }
  return n;
}

function takeAmmo(p: Player, ammo: string, want: number): number {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return 0;
  let got = 0;
  for (let i = 0; i < c.size && got < want; i++) {
    const it = c.getItem(i);
    if (it?.typeId !== ammo) continue;
    const take = Math.min(it.amount, want - got);
    got += take;
    if (take >= it.amount) c.setItem(i, undefined);
    else {
      it.amount -= take;
      c.setItem(i, it);
    }
  }
  return got;
}

function reload(p: Player): void {
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
  const until = system.currentTick + g.reloadTicks;
  reloading.set(p.id, until);
  worldSound(p.dimension, SND.reload, p.location, 0.9, g.item === ITEM.pistol ? 1 : 0.85);
  system.runTimeout(() => {
    if (!p.isValid || reloading.get(p.id) !== until) return;
    reloading.delete(p.id);
    const now = heldGun(p);
    if (!now || now[1] !== g) return;
    const need = g.mag - magOf(now[0]);
    const got = creative ? need : takeAmmo(p, g.ammo, need);
    setMag(now[0], magOf(now[0]) + got);
    putBack(p, now[0]);
    hint(p, `§7Reloaded: §f${magOf(now[0])}§7/${g.mag}  §8(${creative ? "∞" : countAmmo(p, g.ammo)} spare)`);
  }, g.reloadTicks);
}

function add(a: Vector3, b: Vector3, k = 1): Vector3 {
  return { x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k };
}

function jitter(d: Vector3, deg: number): Vector3 {
  if (deg <= 0) return d;
  const r = (deg * Math.PI) / 180;
  const v = { x: d.x + (Math.random() - 0.5) * 2 * r, y: d.y + (Math.random() - 0.5) * 2 * r, z: d.z + (Math.random() - 0.5) * 2 * r };
  const L = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / L, y: v.y / L, z: v.z / L };
}

const NO_HIT = ["minecraft:item", "minecraft:xp_orb", ENT.crewBody, ENT.bullet, ENT.trevor, ENT.lure, ENT.phantom, ENT.cultRound];

function fire(p: Player): void {
  const held = heldGun(p);
  if (!held) return;
  const [item, g] = held;
  if ((reloading.get(p.id) ?? 0) > system.currentTick) return;
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
  const view = p.getViewDirection();
  const muzzle = add(eye, view, 0.9);
  worldSound(dim, g.sound, eye, 1.0, g.pitch * (0.95 + Math.random() * 0.1));
  particle(dim, "minecraft:basic_flame_particle", muzzle);
  particle(dim, "minecraft:basic_smoke_particle", muzzle);
  try {
    p.runCommand(`camerashake add @s ${g.shake} 0.12 rotational`);
  } catch {
    /* command unavailable */
  }
  emitNoise({ dim, at: p.location, radius: g.noise, kind: "gunshot", source: p });
  onGunshot(p, g.noise);

  const damage = new Map<string, { e: Entity; dmg: number; at: Vector3 }>();
  for (let k = 0; k < g.pellets; k++) {
    const dir = jitter(view, g.spread);
    let target: Entity | undefined;
    let distance = g.range;
    try {
      const hits = g.pellets === 1
        ? p.getEntitiesFromViewDirection({ maxDistance: g.range, excludeTypes: NO_HIT, excludeFamilies: ["inanimate"] })
        : dim.getEntitiesFromRay(eye, dir, { maxDistance: g.range, excludeTypes: NO_HIT, excludeFamilies: ["inanimate"] });
      for (const h of hits) {
        if (h.entity.id === p.id || h.entity.typeId === "minecraft:player") continue;
        target = h.entity;
        distance = h.distance;
        break;
      }
    } catch {
      /* ray failed */
    }
    if (!target) {
      if (k === 0) {
        try {
          const b = dim.getBlockFromRay(eye, dir, { maxDistance: g.range });
          if (b) {
            const at = add(b.block.location, b.faceLocation);
            particle(dim, "minecraft:basic_smoke_particle", at);
            worldSound(dim, SND.bulletHit, at, 0.5, 1.3);
          }
        } catch {
          /* nothing in range */
        }
      }
      continue;
    }
    const hitAt = add(eye, dir, distance);
    const falloff = distance <= g.falloffFrom ? 1 : Math.max(0.5, 1 - (distance - g.falloffFrom) / (g.range * 1.2));
    let dmg = g.damage * falloff;
    try {
      if (hitAt.y >= target.getHeadLocation().y - 0.35) dmg *= 1.6;
    } catch {
      /* no head */
    }
    const cur = damage.get(target.id);
    damage.set(target.id, { e: target, dmg: (cur?.dmg ?? 0) + dmg, at: hitAt });
  }
  for (const { e, dmg, at } of damage.values()) {
    try {
      e.applyDamage(Math.max(1, Math.round(dmg)), { cause: EntityDamageCause.entityAttack, damagingEntity: p });
    } catch {
      /* invulnerable or gone */
    }
    worldSound(dim, SND.bulletHit, at, 0.9);
    particle(dim, "minecraft:critical_hit_emitter", at);
  }
  if (mag - 1 === 0) hint(p, "§7Empty. §8Sneak + Use to reload.");
  unlock(p, g.journal, true);
}

/** Gunshots carry: the cult hears them (island/cult.ts listens through this hook). */
let gunshotHook: ((p: Player, radius: number) => void) | undefined;
export function onGunshotHook(fn: (p: Player, radius: number) => void): void {
  gunshotHook = fn;
}
function onGunshot(p: Player, radius: number): void {
  gunshotHook?.(p, radius);
}

// ------------------------------------------------------------------------- the flare gun

function fireFlare(p: Player): void {
  const dim = p.dimension;
  const eye = p.getHeadLocation();
  const dir = p.getViewDirection();
  worldSound(dim, SND.pistol, eye, 0.6, 1.6);
  let at = add(eye, dir, 24);
  try {
    const hit = dim.getBlockFromRay(eye, dir, { maxDistance: 24 });
    if (hit) at = add(hit.block.location, hit.faceLocation);
  } catch {
    /* open sky */
  }
  // a hanging light for 30 s and a red burn you can see from across the island
  const lights: Vector3[] = [];
  for (const off of [{ x: 0, y: 0, z: 0 }, { x: 0, y: 2, z: 0 }]) {
    const pos = { x: Math.floor(at.x + off.x), y: Math.floor(at.y + off.y), z: Math.floor(at.z + off.z) };
    try {
      const b = dim.getBlock(pos);
      if (b?.isAir) {
        b.setType("minecraft:light_block_15");
        lights.push(pos);
      }
    } catch {
      /* unloaded */
    }
  }
  let n = 0;
  const run = system.runInterval(() => {
    n++;
    particle(dim, "minecraft:basic_flame_particle", { x: at.x, y: at.y + 0.5, z: at.z });
    particle(dim, "minecraft:lava_particle", { x: at.x, y: at.y + 0.5, z: at.z });
    if (n >= 60) {
      system.clearRun(run);
      for (const pos of lights) {
        try {
          const b = dim.getBlock(pos);
          if (b?.typeId === "minecraft:light_block_15") b.setType("minecraft:air");
        } catch {
          /* unloaded */
        }
      }
    }
  }, 10);
  flareHook?.(p, at);
  unlock(p, "gear_flare", true);
}

let flareHook: ((p: Player, at: Vector3) => void) | undefined;
let shrineKeyHook: ((p: Player) => void) | undefined;
export function onShrineKeyHook(fn: (p: Player) => void): void {
  shrineKeyHook = fn;
}
export function onFlareHook(fn: (p: Player, at: Vector3) => void): void {
  flareHook = fn;
}

export function forgetGuns(playerId: string): void {
  reloading.delete(playerId);
}

function wear(p: Player, typeId: string): void {
  if (!survivalish(p)) return;
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot.Mainhand);
  if (!eq || !item || item.typeId !== typeId) return;
  const dur = item.getComponent("minecraft:durability");
  if (!dur) return;
  if (dur.damage + 1 >= dur.maxDurability) {
    eq.setEquipment(EquipmentSlot.Mainhand, undefined);
    p.playSound("random.break");
    return;
  }
  dur.damage += 1;
  eq.setEquipment(EquipmentSlot.Mainhand, item);
}

function heal(p: Player): void {
  try {
    p.addEffect("instant_health", 1, { amplifier: 0, showParticles: false });
    p.addEffect("regeneration", 120, { amplifier: 1, showParticles: true });
  } catch {
    /* ignore */
  }
  notice(p, "§7You clean and dress the wounds.");
}

export function registerGearComponents(ev: StartupEvent): void {
  const reg = ev.itemComponentRegistry;
  const gun = {
    onUse(e: { source: Player }) {
      const p = e.source;
      system.run(() => p.isValid && fire(p));
    },
  };
  reg.registerCustomComponent("hollow:pistol", gun);
  reg.registerCustomComponent("hollow:gun", gun);
  reg.registerCustomComponent("hollow:flare_gun", {
    onUse(e) {
      const p = e.source;
      system.run(() => {
        if (!p.isValid) return;
        fireFlare(p);
        wear(p, ITEM.flareGun);
      });
    },
  });
  reg.registerCustomComponent("hollow:chelation", {
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player) system.run(() => p.isValid && chelate(p));
    },
  });
  reg.registerCustomComponent("hollow:geiger", {
    onUse(e) {
      const p = e.source;
      system.run(() => {
        if (!p.isValid) return;
        if (!isIsland()) {
          notice(p, "§7The needle barely moves. Background radiation only.");
          return;
        }
        notice(p, geigerReading(p));
        unlock(p, "radiation1");
      });
    },
  });
  reg.registerCustomComponent("hollow:medkit", {
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player) system.run(() => p.isValid && heal(p));
    },
  });
  reg.registerCustomComponent("hollow:iodine", {
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player) system.run(() => p.isValid && takeIodine(p));
    },
  });
  reg.registerCustomComponent("hollow:ration", {
    onConsume(e) {
      const p = e.source;
      if (p instanceof Player) system.run(() => p.isValid && hint(p, "§7Beef stew and crackers, cold. It's the best thing you've ever eaten."));
    },
  });
  reg.registerCustomComponent("hollow:field_radio", {
    onUse(e) {
      const p = e.source;
      system.run(() => {
        if (!p.isValid) return;
        ui(p, "random.click", 0.7, 1.2);
        if (trevorGone()) {
          notice(p, "§8Static. Nobody answers on Trevor's channel any more.");
          return;
        }
        void formSession(p, () => trevorMenu(p, trevorEntity(), true));
      });
    },
  });
  reg.registerCustomComponent("hollow:shrine_key", {
    onUse(e) {
      const p = e.source;
      system.run(() => p.isValid && shrineKeyHook?.(p));
    },
  });
  reg.registerCustomComponent("hollow:broken_radio", {
    onUse(e) {
      const p = e.source;
      system.run(() => {
        if (!p.isValid) return;
        ui(p, "random.click", 0.6, 0.8);
        notice(p, "§7Static. The board is cracked clean through and the battery is swollen.\n" +
          "§fIt will never call the mainland. §7Something bigger might: the old relay on the north peak.\n" +
          "§8With two copper ingots and some redstone it could still reach Trevor (crafting table).");
        unlock(p, "tower_hint");
      });
    },
  });
}
