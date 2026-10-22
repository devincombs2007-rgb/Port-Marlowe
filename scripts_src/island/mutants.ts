import { Entity, Player, world } from "@minecraft/server";
import { notice } from "../core/fx";
import { safe } from "../core/scheduler";
import { now } from "../core/time";
import { unlock } from "../systems/journal";
import { isIsland } from "./mode";
import { radState, setDose } from "./radiation";

// THE ISLAND'S ANIMALS AND MONSTERS
//
// Their look comes from the island-only resource pack (packs/varrow_mutations): every vanilla mob
// repainted with sores, tumours, bald patches and glowing pustules. Here, the rest of it:
//   - the island's hostile mobs are tougher and faster than the mainland's (permanent Speed and
//     Strength, no particles), because seventy years of this made them so;
//   - meat from the island is hot: eating it adds to your radiation dose (raw more than cooked).

const HOSTILE = new Set([
  "minecraft:zombie", "minecraft:husk", "minecraft:drowned", "minecraft:skeleton", "minecraft:stray", "minecraft:bogged",
  "minecraft:spider", "minecraft:cave_spider", "minecraft:creeper", "minecraft:witch", "minecraft:slime", "minecraft:zombie_villager",
]);
const MEAT: Record<string, number> = {
  "minecraft:beef": 45, "minecraft:porkchop": 45, "minecraft:mutton": 45, "minecraft:chicken": 50, "minecraft:rabbit": 45,
  "minecraft:cooked_beef": 18, "minecraft:cooked_porkchop": 18, "minecraft:cooked_mutton": 18, "minecraft:cooked_chicken": 20,
  "minecraft:cooked_rabbit": 18, "minecraft:rabbit_stew": 14, "minecraft:rotten_flesh": 60,
};
const LONG = 20 * 60 * 60 * 24 * 7;
const warned = new Map<string, number>();

function harden(e: Entity): void {
  try {
    e.addEffect("speed", LONG, { amplifier: 0, showParticles: false });
    e.addEffect("strength", LONG, { amplifier: 0, showParticles: false });
    if (Math.random() < 0.25) e.addEffect("resistance", LONG, { amplifier: 0, showParticles: false });
  } catch {
    /* gone */
  }
}

function ate(p: Player, id: string): void {
  const dose = MEAT[id];
  if (!dose) return;
  const s = radState(p);
  setDose(p, s.dose + dose);
  const last = warned.get(p.id) ?? -99999;
  if (now() - last > 20 * 60 * 5) {
    warned.set(p.id, now());
    notice(p, id.includes("cooked") || id.includes("stew")
      ? `§eThe counter ticks faster as you eat. §7Island meat is hot, even cooked. (+${dose} mSv)`
      : `§cRaw island meat. §7The counter chatters. Cook it, or eat rations. (+${dose} mSv)`);
  }
  unlock(p, "mutants");
}

export function startMutants(): void {
  world.afterEvents.entitySpawn.subscribe((ev) => safe("mutants.spawn", () => {
    if (!isIsland() || !ev.entity.isValid || !HOSTILE.has(ev.entity.typeId)) return;
    harden(ev.entity);
  }));
  world.afterEvents.itemCompleteUse.subscribe((ev) => safe("mutants.eat", () => {
    if (!isIsland() || !(ev.source instanceof Player)) return;
    ate(ev.source, ev.itemStack.typeId);
  }));
  world.afterEvents.entityDie.subscribe((ev) => safe("mutants.kill", () => {
    if (!isIsland() || !(ev.damageSource.damagingEntity instanceof Player)) return;
    if (ev.deadEntity.typeId.startsWith("minecraft:")) unlock(ev.damageSource.damagingEntity, "mutants");
  }));
}
