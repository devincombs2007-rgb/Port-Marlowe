import {
  EntityDamageCause, EquipmentSlot, GameMode, ItemStack, Player, StartupEvent, Vector3, system,
} from "@minecraft/server";
import { ui, worldSound } from "../core/audio";
import { hint, notice, particle } from "../core/fx";
import { DP, ENT, ITEM, SND } from "../core/ids";
import { emitNoise } from "../systems/noise";
import { unlock } from "../systems/journal";
import { geigerReading, takeIodine } from "./radiation";
import { isIsland } from "./mode";

// GEAR from the crash: the service pistol, the Geiger counter, medkits, rations, iodine and the
// cracked satellite radio.
//
// The pistol fires instantly along your aim (a hitscan, so it plays the same with a controller):
// up to 48 blocks, stopped by blocks, 7 damage falling to 4 at long range, headshots x1.6.
// Seven rounds in the magazine, saved on the gun itself; sneak + Use reloads from 9mm rounds in
// your inventory. Every shot is loud: the Hollowed hear it from 48 blocks.

export const MAG_SIZE = 7;
const RANGE = 48;
const reloading = new Map<string, number>();

function survivalish(p: Player): boolean {
  const gm = p.getGameMode();
  return gm === GameMode.Survival || gm === GameMode.Adventure;
}

export function magOf(item: ItemStack | undefined): number {
  if (!item) return 0;
  const v = item.getDynamicProperty(DP.mag);
  return typeof v === "number" ? Math.max(0, Math.min(MAG_SIZE, Math.round(v))) : MAG_SIZE;
}

function setMag(item: ItemStack, n: number): void {
  item.setDynamicProperty(DP.mag, n);
  item.setLore([`§7Magazine: §f${n}§7/${MAG_SIZE}`, "§8Sneak + Use to reload"]);
}

/** A loaded pistol, as issued from the crash. */
export function pistolStack(rounds = MAG_SIZE): ItemStack {
  const s = new ItemStack(ITEM.pistol, 1);
  setMag(s, rounds);
  return s;
}

function heldPistol(p: Player): ItemStack | undefined {
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot.Mainhand);
  return item?.typeId === ITEM.pistol ? item : undefined;
}

function putBack(p: Player, item: ItemStack): void {
  p.getComponent("minecraft:equippable")?.setEquipment(EquipmentSlot.Mainhand, item);
}

function countRounds(p: Player): number {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return 0;
  let n = 0;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it?.typeId === ITEM.round) n += it.amount;
  }
  return n;
}

function takeRounds(p: Player, want: number): number {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return 0;
  let got = 0;
  for (let i = 0; i < c.size && got < want; i++) {
    const it = c.getItem(i);
    if (it?.typeId !== ITEM.round) continue;
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
  const item = heldPistol(p);
  if (!item) return;
  const mag = magOf(item);
  if (mag >= MAG_SIZE) {
    hint(p, "§7The magazine is full.");
    return;
  }
  const creative = !survivalish(p);
  if (!creative && countRounds(p) === 0) {
    ui(p, SND.dryFire, 0.8);
    notice(p, "§7No 9mm rounds left. §8Check the crash crates, bunkers and the dead.");
    return;
  }
  const until = system.currentTick + 26;
  reloading.set(p.id, until);
  worldSound(p.dimension, SND.reload, p.location, 0.9);
  system.runTimeout(() => {
    if (!p.isValid || reloading.get(p.id) !== until) return;
    reloading.delete(p.id);
    const now = heldPistol(p);
    if (!now) return;
    const need = MAG_SIZE - magOf(now);
    const got = creative ? need : takeRounds(p, need);
    setMag(now, magOf(now) + got);
    putBack(p, now);
    hint(p, `§7Reloaded: §f${magOf(now)}§7/${MAG_SIZE}  §8(${creative ? "∞" : countRounds(p)} spare)`);
  }, 26);
}

function add(a: Vector3, b: Vector3, k = 1): Vector3 {
  return { x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k };
}

function fire(p: Player): void {
  const item = heldPistol(p);
  if (!item) return;
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
  const dir = p.getViewDirection();
  const muzzle = add(eye, dir, 0.9);
  worldSound(dim, SND.pistol, eye, 1.0, 0.95 + Math.random() * 0.1);
  particle(dim, "minecraft:basic_flame_particle", muzzle);
  particle(dim, "minecraft:basic_smoke_particle", muzzle);
  try {
    p.runCommand("camerashake add @s 0.22 0.12 rotational");
  } catch {
    /* command unavailable */
  }
  emitNoise({ dim, at: p.location, radius: 48, kind: "gunshot", source: p });

  let hitAt: Vector3 | undefined;
  let target;
  let distance = RANGE;
  try {
    const hits = p.getEntitiesFromViewDirection({
      maxDistance: RANGE,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb", ENT.crewBody, ENT.bullet, ENT.trevor, ENT.lure, ENT.phantom],
      excludeFamilies: ["inanimate"],
    });
    for (const h of hits) {
      if (h.entity.id === p.id || h.entity.typeId === "minecraft:player") continue;
      target = h.entity;
      distance = h.distance;
      break;
    }
  } catch {
    /* ray failed */
  }
  if (target) {
    hitAt = add(eye, dir, distance);
    const falloff = distance <= 20 ? 1 : Math.max(0.57, 1 - (distance - 20) / 65);
    let dmg = 7 * falloff;
    try {
      if (hitAt.y >= target.getHeadLocation().y - 0.35) dmg *= 1.6;
    } catch {
      /* no head */
    }
    try {
      target.applyDamage(Math.round(dmg), { cause: EntityDamageCause.entityAttack, damagingEntity: p });
    } catch {
      /* invulnerable or gone */
    }
    worldSound(dim, SND.bulletHit, hitAt, 0.9);
    particle(dim, "minecraft:critical_hit_emitter", hitAt);
  } else {
    try {
      const b = p.getBlockFromViewDirection({ maxDistance: RANGE });
      if (b) {
        hitAt = add(b.block.location, b.faceLocation);
        particle(dim, "minecraft:basic_smoke_particle", hitAt);
        worldSound(dim, SND.bulletHit, hitAt, 0.5, 1.3);
      }
    } catch {
      /* nothing in range */
    }
  }
  if (mag - 1 === 0) hint(p, "§7Last round. §8Sneak + Use to reload.");
  unlock(p, "gear_pistol", true);
}

export function forgetGuns(playerId: string): void {
  reloading.delete(playerId);
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
  reg.registerCustomComponent("hollow:pistol", {
    onUse(e) {
      const p = e.source;
      system.run(() => p.isValid && fire(p));
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
  reg.registerCustomComponent("hollow:broken_radio", {
    onUse(e) {
      const p = e.source;
      system.run(() => {
        if (!p.isValid) return;
        ui(p, "random.click", 0.6, 0.8);
        notice(p, "§7Static. The board is cracked clean through and the battery is swollen.\n" +
          "§fIt will never call the mainland. §7Something bigger might: the old relay on the north peak.");
        unlock(p, "tower_hint");
      });
    },
  });
}
