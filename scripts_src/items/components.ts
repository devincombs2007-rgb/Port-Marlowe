import { EquipmentSlot, GameMode, ItemStack, Player, StartupEvent, system, world } from "@minecraft/server";
import { ui } from "../core/audio";
import { notice } from "../core/fx";
import { ENT, FAMILY, ITEM, PROP, SND } from "../core/ids";
import { compass, dist } from "../core/math";
import { hasEntry, openJournal, unlock, unlockNextLore } from "../systems/journal";
import { noiseDescription } from "../systems/noise";
import { useHeartseeker } from "../systems/sites";
import { tracksNear } from "../systems/tracks";

// Custom item behaviours (Custom Components V2, @minecraft/server 2.x).

const CREATURE_NAMES: Record<string, [string, string]> = {
  [ENT.watcher]: ["watcher1", "the Watcher"],
  [ENT.borrowed]: ["borrowed1", "a Borrowed"],
  [ENT.hollowed]: ["hollowed1", "a Hollowed"],
  [ENT.knocker]: ["knocker1", "the Knocker"],
  [ENT.mirebound]: ["mirebound1", "a Mirebound"],
  [ENT.heart]: ["heart1", "the Heart Below"],
};

function survivalish(p: Player): boolean {
  const gm = p.getGameMode();
  return gm === GameMode.Survival || gm === GameMode.Adventure;
}

/** Damage the held lens by one use; breaks it at max durability. */
function wearHeld(p: Player, typeId: string): void {
  if (!survivalish(p)) return;
  const eq = p.getComponent("minecraft:equippable");
  if (!eq) return;
  const item = eq.getEquipment(EquipmentSlot.Mainhand);
  if (!item || item.typeId !== typeId) return;
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

function consumeHeld(p: Player, typeId: string): void {
  if (!survivalish(p)) return;
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot.Mainhand);
  if (!eq || !item || item.typeId !== typeId) return;
  if (item.amount > 1) {
    item.amount -= 1;
    eq.setEquipment(EquipmentSlot.Mainhand, item);
  } else eq.setEquipment(EquipmentSlot.Mainhand, undefined);
}

const revealTimers = new Map<string, number>();

function useLens(p: Player): void {
  ui(p, SND.lens, 1);
  const dim = p.dimension;
  const head = p.getHeadLocation();
  const lines: string[] = [];

  // 1. Borrowed within 24 blocks lose their disguise - for this player only.
  const borrowed = dim.getEntities({ type: ENT.borrowed, location: p.location, maxDistance: 24 });
  for (const b of borrowed) {
    try {
      p.setPropertyOverrideForEntity(b, PROP.revealed, true);
      p.spawnParticle("hollow:lens_reveal", { x: b.location.x, y: b.location.y + 1.2, z: b.location.z });
      const key = `${p.id}|${b.id}`;
      const old = revealTimers.get(key);
      if (old !== undefined) system.clearRun(old);
      revealTimers.set(key, system.runTimeout(() => {
        revealTimers.delete(key);
        try {
          if (p.isValid && b.isValid) p.removePropertyOverrideForEntity(b, PROP.revealed);
        } catch {
          /* gone */
        }
      }, 200));
    } catch {
      /* entity unloaded */
    }
  }
  if (borrowed.length > 0) {
    unlock(p, "borrowed1");
    unlock(p, "borrowed2");
    lines.push(`§c${borrowed.length === 1 ? "One animal here is not" : `${borrowed.length} animals here are not`} what it seems.`);
  }

  // 2. Nearest creature within 48 blocks.
  const near = dim.getEntities({ families: [FAMILY.creature], location: p.location, maxDistance: 48, closest: 1 });
  if (near.length > 0) {
    const e = near[0];
    const info = CREATURE_NAMES[e.typeId];
    const name = info && hasEntry(p, info[0]) ? info[1] : "something";
    const d = Math.round(dist(head, e.location));
    const dy = e.location.y - p.location.y;
    const vert = dy > 6 ? ", above you" : dy < -6 ? ", below you" : "";
    lines.push(`§7The lens clouds: ${name}, ${compass(p.location, e.location)}, ~${d} blocks${vert}.`);
  } else if (borrowed.length === 0) {
    lines.push("§7The lens stays clear. Nothing of theirs within 48 blocks.");
  }

  // 3. Fresh tracks nearby.
  const prints = tracksNear(dim, p.location, 8);
  if (prints.length > 0) {
    const names = ["the Watcher", "the Knocker", "something dragged from the water", "a Borrowed"];
    lines.push(`§7Fresh tracks here: ${prints.map((k) => names[k]).join(", ")}.`);
  }

  // 4. How loud you are to the Hollowed.
  lines.push(`§8Your noise: ${noiseDescription(p)}`);
  notice(p, lines.join("\n"));
  wearHeld(p, ITEM.lens);
}

export function registerItemComponents(ev: StartupEvent): void {
  ev.itemComponentRegistry.registerCustomComponent("hollow:journal", {
    onUse(e) {
      const p = e.source;
      system.run(() => void openJournal(p));
    },
  });

  ev.itemComponentRegistry.registerCustomComponent("hollow:torn_page", {
    onUse(e) {
      const p = e.source;
      system.run(() => {
        const title = unlockNextLore(p);
        if (title) {
          consumeHeld(p, ITEM.page);
          notice(p, `§7You smooth out the page and copy it into your journal: §f${title}`);
        } else {
          notice(p, "§7This page repeats what you already have.");
        }
      });
    },
  });

  ev.itemComponentRegistry.registerCustomComponent("hollow:lens", {
    onUse(e) {
      const p = e.source;
      system.run(() => useLens(p));
    },
  });

  ev.itemComponentRegistry.registerCustomComponent("hollow:heartseeker", {
    onUse(e) {
      const p = e.source;
      system.run(() => useHeartseeker(p));
    },
  });

  ev.itemComponentRegistry.registerCustomComponent("hollow:material", {
    // Crafting materials: using one re-reads its hint (pickup teaches the recipe, see below).
    onUse(e) {
      const p = e.source;
      const id = e.itemStack?.typeId;
      system.run(() => describeMaterial(p, id));
    },
  });
}

const MATERIAL_HINTS: Record<string, [string, string]> = {
  [ITEM.paleResin]: ["craft_lens", "§7Pale Resin: sticky, faintly warm. A lens could be set with it."],
  [ITEM.hollowFang]: ["craft_heartseeker", "§7Hollow Fang: it hums, faintly, toward the ground."],
  [ITEM.borrowedHide]: ["craft_offering", "§7Borrowed Hide: it is still slightly warm, and it isn't wool."],
  [ITEM.knockerNail]: ["craft_offering", "§7Knocker's Nail: cold iron, bent like a beckoning finger."],
  [ITEM.mirePearl]: ["craft_offering", "§7Mire Pearl: something in it turns over when you look away."],
  [ITEM.stilledHeart]: ["craft_lantern", "§7Stilled Heart: it does not beat. Set it in a lantern."],
};

function describeMaterial(p: Player, id: string | undefined): void {
  if (!id) return;
  const h = MATERIAL_HINTS[id];
  if (!h) return;
  unlock(p, h[0]);
  notice(p, h[1]);
}

/** Picking up a creature material the first time teaches the recipe that uses it. */
export function startMaterialPickups(): void {
  world.afterEvents.entityItemPickup.subscribe((ev) => {
    const p = ev.entity;
    if (!(p instanceof Player)) return;
    for (const stack of ev.items) {
      const h = MATERIAL_HINTS[stack.typeId];
      if (h && !hasEntry(p, h[0])) describeMaterial(p, stack.typeId);
    }
  }, { entityFilter: { type: "minecraft:player" }, itemFilter: { includeTypes: Object.keys(MATERIAL_HINTS) } });
}

export function giveOrDrop(p: Player, stack: ItemStack): void {
  const inv = p.getComponent("minecraft:inventory");
  const left = inv?.container?.addItem(stack);
  if (left) p.dimension.spawnItem(left, p.location);
}
