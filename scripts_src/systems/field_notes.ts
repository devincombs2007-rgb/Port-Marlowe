import { Difficulty, GameMode, Player, world } from "@minecraft/server";
import { isTestMode, settings } from "../core/config";
import { ITEM } from "../core/ids";
import { ctx, isNewcomer, rt } from "../core/players";
import { hollowDay, now, tod } from "../core/time";
import { getCustomState, holdingLight, inLitArea } from "../core/world";
import { lanternNear, wardNear } from "../items/blocks";
import { noiseDescription } from "./noise";
import { dreadOf, dreadReasons, dreadStageName } from "./dread";

interface FieldNotes { body: string; recipe: string }

/** Only player-observable conditions and already-discovered recipes; never scans for monsters.
 * Evaluated when the form opens/refreshes, not on a background interval. */
export function fieldNotes(p: Player, has: (id: string) => boolean): FieldNotes {
  const c = ctx(p, 0);
  const s = settings();
  const t = tod();
  const phase = t < 12000 ? "daylight" : t < 13000 ? "dusk" : t < 23200 ? "night" : "dawn";
  const carried = new Set<string>();
  const inv = p.getComponent("minecraft:inventory")?.container;
  if (inv) for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i);
    if (item) carried.add(item.typeId);
  }
  const w = wardNear(p.dimension, p.location);
  const used = w ? getCustomState(w.permutation, "hollow:used") : undefined;
  const charges = typeof used === "number" ? Math.max(0, Math.min(4, 4 - used)) : 0;
  const grace = Math.max(0, s.graceDays - hollowDay());
  const gm = p.getGameMode();
  const pacing = world.getDifficulty() === Difficulty.Peaceful ? "Peaceful: regular hunts paused" :
    gm === GameMode.Creative || gm === GameMode.Spectator ? "Regular hunts paused in this game mode" :
    now() - rt(p).diedAt <= 1200 ? "Brief recovery period after respawn" :
    isNewcomer(p) && !isTestMode() ? "New arrival: settling-in period still active" :
    grace > 0 ? `World grace: regular hunts start on day ${s.graceDays + 1}` : "Regular encounter rules active";
  const terrain = !c.overworld ? "beyond the Overworld" : c.underground ? "underground" : c.inWater ? "in water" : c.roofed ? "roof overhead" : "open sky";
  const light = holdingLight(p) ? "carrying a light" : inLitArea(p) ? "placed light nearby" : "no shelter light detected";
  const ward = w ? `charged ward within 10 blocks (${charges}/4)` : "no charged ward detected";
  const protection = lanternNear(p.dimension, p.location) ? "Heartwood Lantern protection nearby" : ward;
  let recipe = "craft_chime";
  let next = "Build a roof and closed door. Carry a torch after dusk; a chime warns you of visitors.";
  if (has("after")) {
    recipe = "craft_lantern";
    next = carried.has(ITEM.lantern)
      ? "Place your Heartwood Lantern at home. Its registered protection reaches 24 blocks."
      : "Turn the Stilled Heart into a Heartwood Lantern for your home.";
  } else if (has("heart1") && has("craft_offering")) {
    recipe = "craft_offering";
    next = "Prepare the offering, food and equipment. Read your shrine notes before deciding to wake it.";
  } else if (has("craft_heartseeker")) {
    recipe = "craft_heartseeker";
    next = carried.has(ITEM.heartseeker)
      ? "Use your Heartseeker in the Overworld and follow its bearings."
      : "Craft a Heartseeker when you are ready to investigate farther.";
    if (!s.sites) next += " New shrine placement is disabled in World rules.";
  } else if (has("craft_lens")) {
    recipe = "craft_lens";
    next = carried.has(ITEM.lens)
      ? "Use your Seer's Glass to investigate fresh tracks and suspicious animals. Each look wears the glass."
      : "You have learned to make a Seer's Glass. Craft it to investigate tracks and suspicious animals.";
  } else if (has("watcher1")) {
    recipe = "craft_ward";
    next = "Read your discovered Watcher notes. Improve the shelter and learn its warnings before venturing out.";
  }
  if (settings().dread && dreadOf(p) >= 50) {
    next = "Your nerve is going. Get to light and a roof, find company, or drink Hearth Tea. " +
      "Frightened people draw them in, and see things that aren't there.";
    if (has("craft_tea") && !carried.has(ITEM.tea)) recipe = "craft_tea";
  }
  if (!has(recipe)) recipe = "";
  return {
    body: `§7Day ${hollowDay() + 1} · ${phase} · ${terrain}\n` +
      `§7Light: ${light}\n§7Equipment: ${protection}\n§7Movement: ${noiseDescription(p)}\n` +
      `§7Pacing: ${pacing}\n` +
      (settings().dread ? `§7Nerve: ${nerve(p)}\n` : "") +
      `\n§lNext step§r\n${next}\n\n§8Local checks are not a guarantee of safety. Refresh after moving.`,
    recipe,
  };
}

function nerve(p: Player): string {
  const name = dreadStageName(p);
  const colour = ["§a", "§e", "§6", "§c"][["Calm", "Uneasy", "Frightened", "Terrified"].indexOf(name)] ?? "§7";
  const why = dreadReasons(p).slice(0, 3).join(", ");
  return `${colour}${name}§7 (${Math.round(dreadOf(p))}/100)${why ? `§8 · ${why}` : ""}`;
}
