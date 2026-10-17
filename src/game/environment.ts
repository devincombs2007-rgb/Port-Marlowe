import { EntityComponentTypes, EquipmentSlot, Player } from "@minecraft/server";
import { safe } from "./helpers";

const LIGHT_BLOCK = /^minecraft:(torch|soul_torch|lantern|soul_lantern|campfire|soul_campfire|glowstone|sea_lantern|shroomlight|lit_pumpkin|lit_redstone_lamp|end_rod|beacon|ochre_froglight|verdant_froglight|pearlescent_froglight|lava|fire|soul_fire|underwater_torch|copper_torch)$/;
const HELD_LIGHT = /^minecraft:(torch|soul_torch|lantern|soul_lantern|glow_stick|lit_pumpkin|end_rod|copper_torch)$/;
const HOME_BLOCK = /(_bed$|^minecraft:bed$|^minecraft:campfire$|^minecraft:soul_campfire$|^minecraft:respawn_anchor$)/;

export interface Surroundings {
  /** A real light source is held, or within a few blocks. */
  lit: boolean;
  /** A bed or campfire is close by. */
  nearHome: boolean;
  skyVisible: boolean;
}

/**
 * Bounded scan: radius 4 horizontally, -1..+2 vertically (~320 block reads). Called at most every few seconds
 * per player, so the cost stays small even with several players.
 */
export function scanSurroundings(p: Player): Surroundings {
  return safe(() => {
    const d = p.dimension;
    const loc = p.location;
    const cx = Math.floor(loc.x), cy = Math.floor(loc.y), cz = Math.floor(loc.z);
    let lit = heldLight(p);
    let home = false;
    for (let dx = -4; dx <= 4 && !(lit && home); dx++) {
      for (let dz = -4; dz <= 4 && !(lit && home); dz++) {
        for (let dy = -1; dy <= 2; dy++) {
          const b = d.getBlock({ x: cx + dx, y: cy + dy, z: cz + dz });
          if (!b || b.isAir) continue;
          const id = b.typeId;
          if (!lit && LIGHT_BLOCK.test(id)) lit = true;
          if (!home && HOME_BLOCK.test(id)) home = true;
        }
      }
    }
    const top = d.getTopmostBlock({ x: cx, z: cz });
    const skyVisible = top ? top.location.y <= cy + 1 : true;
    return { lit, nearHome: home, skyVisible };
  }, { lit: false, nearHome: false, skyVisible: true });
}

function heldLight(p: Player): boolean {
  return safe(() => {
    const inv = p.getComponent(EntityComponentTypes.Inventory);
    const main = inv?.container?.getItem(p.selectedSlotIndex)?.typeId;
    if (main && HELD_LIGHT.test(main)) return true;
    const eq = p.getComponent(EntityComponentTypes.Equippable);
    const off = eq?.getEquipment(EquipmentSlot.Offhand)?.typeId;
    return !!off && HELD_LIGHT.test(off);
  }, false);
}
