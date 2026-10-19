import { Player } from "@minecraft/server";
import { ambient } from "../core/audio";
import { settings } from "../core/config";
import { SND } from "../core/ids";
import { add, chance, rand, yawDir } from "../core/math";
import { ctx, rt } from "../core/players";
import { everyPlayer } from "../core/scheduler";
import { hollowDay, hollowNight, isDarkHours, nightKey } from "../core/time";
import { dailyAdd, dailyCount } from "./daily";
import { hasEntry, unlock } from "./journal";

// AMBIENCE DIRECTOR: restrained, context-aware cues. Most evaluations play nothing. Distant cues
// are positioned 18-40 blocks away in a random direction so they read as "out there".
// Spacing rules live in core/audio.ts (>= 9 s between any two cues, longer per cue type).

function far(p: Player, lo = 18, hi = 40) {
  const d = yawDir(rand(0, 360));
  const r = rand(lo, hi);
  return add(p.location, { x: d.x * r, y: rand(0, 4), z: d.z * r });
}

function tick(p: Player): void {
  const c = ctx(p);
  if (!c.overworld) return;
  const night = isDarkHours();
  const busy = !!rt(p).encounter;
  if (busy) return; // silence during encounters makes them land

  if (c.underground) {
    if (chance(0.18)) ambient(p, SND.caveDrip, { at: far(p, 6, 18), cueGap: 300 });
    else if (chance(0.06)) ambient(p, SND.caveShift, { at: far(p, 16, 32), cueGap: 1800 });
    else if (chance(0.04) && settings().hollowed && hollowDay() >= settings().graceDays) {
      ambient(p, SND.caveBreath, { at: far(p, 20, 34), cueGap: 2400 });
    }
    return;
  }
  if (c.biome === "forest") {
    if (night) {
      if (chance(0.06) && hollowNight() >= 1) ambient(p, SND.farCall, { at: far(p, 40, 60), cueGap: 3600 });
      else if (chance(0.1)) ambient(p, SND.branchSnap, { at: far(p, 18, 34), cueGap: 900 });
      else if (chance(0.04) && hollowNight() >= 2) ambient(p, SND.farSteps, { at: far(p, 20, 30), cueGap: 3000 });
      else if (chance(0.12)) ambient(p, SND.windGust, { volume: 0.8, cueGap: 1200 });
    } else if (chance(0.1)) ambient(p, SND.windGust, { volume: 0.6, cueGap: 1600 });
    return;
  }
  if (c.biome === "swamp" || c.biome === "shore") {
    if (night && chance(0.14)) ambient(p, SND.swampGurgle, { at: far(p, 8, 20), cueGap: 900 });
    else if (chance(0.06)) ambient(p, SND.swampCreak, { at: far(p, 16, 30), cueGap: 1800 });
    if (night && c.biome === "swamp" && !hasEntry(p, "mirebound1") && hollowDay() >= 2 && chance(0.05)) {
      unlock(p, "mirebound1");
    }
    return;
  }
  if (night && chance(0.08)) ambient(p, SND.windGust, { volume: 0.6, cueGap: 1600 });
}

/** Rare, harmless, warned bedtime knocking (journal: "If you hear knocking from bed, stay in bed"). */
function bedtime(p: Player): void {
  const s = settings();
  if (!s.sleepDisturbance || !s.knocker || !p.isSleeping) return;
  if (hollowNight() < s.knockerNight) return;
  if (dailyCount(p, "bedknock") > 0) return;
  dailyAdd(p, "bedknock");
  // roughly one night in six
  if ((nightKey() + p.name.length) % 6 !== 0) return;
  ambient(p, SND.bedtimeKnock, { volume: 0.9, minGap: 0, cueGap: 0 });
}

export function startAmbience(): void {
  everyPlayer("ambience", 120, tick);
  everyPlayer("bedtime", 40, bedtime);
}
