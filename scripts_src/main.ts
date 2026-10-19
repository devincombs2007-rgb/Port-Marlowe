// THE HOLLOW: Survival Horror - behavior pack entry point.
// Target: Minecraft Bedrock 26.50+ (1.26.50), @minecraft/server 2.10.0, @minecraft/server-ui 2.2.0.

import { Entity, Player, system, world } from "@minecraft/server";
import { forgetAudio } from "./core/audio";
import { forgetPrefs, isOperator } from "./core/config";
import { clearAllFog } from "./core/fx";
import { ENT } from "./core/ids";
import { debug, setDebug, debugEnabled } from "./core/log";
import { forgetRuntime, rt } from "./core/players";
import { failureReport, later, safe } from "./core/scheduler";
import { hollowDay, now } from "./core/time";
import {
  borrowedCount, forgetBorrowedTarget, isBorrowedTracked, onBorrowedDied, onBorrowedHurt, onBorrowedSheared, startBorrowed, tryStartBorrowed,
} from "./creatures/borrowed";
import {
  hollowedCount, isHollowedTracked, isLureTracked, onHollowedDied, startHollowed, tryStartHollowed,
} from "./creatures/hollowed";
import {
  bossSummary, forgetBossPlayer, onBossHurt, onHeartDied, onShieldHit, onVeinDied, startHeart,
} from "./creatures/heart";
import { forgetKnockerTarget, isKnockerTracked, knockerActive, onKnockerDied, onKnockerHurt, startKnocker } from "./creatures/knocker";
import {
  forgetMireboundTarget, isMireboundTracked, mireboundCount, onMireboundDied, onMireboundHurt, startMirebound, tryStartMirebound,
} from "./creatures/mirebound";
import {
  forgetWatcherTarget, isWatcherTracked, onWatcherDied, onWatcherHurt, onWatcherStruck, startWatcher, tryStartWatcher, watcherCount,
} from "./creatures/watcher";
import { registerBlockComponents, startBlockSystems } from "./items/blocks";
import { registerItemComponents } from "./items/components";
import { startAmbience } from "./systems/ambience";
import { startCleanup, sweepLoaded, trackType } from "./systems/cleanup";
import { addStarter, startDirector } from "./systems/director";
import { ensureJournal, forgetJournal, openJournal, unlock } from "./systems/journal";
import { forgetNoise, startNoiseEvents } from "./systems/noise";
import { forceSite, forgetSites, startSites } from "./systems/sites";

system.beforeEvents.startup.subscribe((ev) => {
  registerItemComponents(ev);
  registerBlockComponents(ev);
});

let started = false;

function init(): void {
  if (started) return;
  started = true;
  hollowDay(); // records the day THE HOLLOW was first enabled in this world

  trackType(ENT.watcher, isWatcherTracked);
  trackType(ENT.borrowed, isBorrowedTracked);
  trackType(ENT.hollowed, isHollowedTracked);
  trackType(ENT.lure, isLureTracked);
  trackType(ENT.knocker, isKnockerTracked);
  trackType(ENT.mirebound, isMireboundTracked);
  // Major encounters (one at a time per player), in priority order; cave and flock spawns are independent.
  addStarter({ key: "mirebound", tryStart: tryStartMirebound });
  addStarter({ key: "watcher", tryStart: tryStartWatcher });
  addStarter({ key: "borrowed", tryStart: tryStartBorrowed, independent: true });
  addStarter({ key: "hollowed", tryStart: tryStartHollowed, independent: true });

  startCleanup();
  startNoiseEvents();
  startDirector();
  startAmbience();
  startBlockSystems();
  startSites();
  startWatcher();
  startBorrowed();
  startHollowed();
  startKnocker();
  startMirebound();
  startHeart();
  later("sweep", 40, sweepLoaded);
  console.warn(`[hollow] THE HOLLOW initialised (day ${hollowDay()}).`);
}

world.afterEvents.worldLoad.subscribe(() => safe("init", init));

// ------------------------------------------------------------------------------- players

world.afterEvents.playerSpawn.subscribe((ev) => safe("playerSpawn", () => {
  const p = ev.player;
  clearAllFog(p);
  if (ev.initialSpawn) {
    rt(p);
    later("welcome", 60, () => {
      if (!p.isValid) return;
      const fresh = unlock(p, "intro", true);
      unlock(p, "shelter", true);
      unlock(p, "craft_chime", true);
      unlock(p, "craft_ward", true);
      ensureJournal(p);
      if (fresh) p.sendMessage("§7You find a weathered §fField Journal§7 in your pack. Hold it and press §fUse§7 to read.");
    });
  } else {
    rt(p).diedAt = now();
    forgetEncounters(p.id);
    later("journalBack", 20, () => p.isValid && ensureJournal(p));
  }
}));

function forgetEncounters(playerId: string): void {
  forgetWatcherTarget(playerId);
  forgetBorrowedTarget(playerId);
  forgetMireboundTarget(playerId);
  forgetKnockerTarget(playerId);
}

world.beforeEvents.playerLeave.subscribe((ev) => {
  const id = ev.player.id;
  system.run(() => safe("playerLeave", () => {
    forgetEncounters(id);
    forgetRuntime(id);
    forgetAudio(id);
    forgetPrefs(id);
    forgetJournal(id);
    forgetNoise(id);
    forgetSites(id);
  }));
});

world.afterEvents.playerDimensionChange.subscribe((ev) => safe("dimChange", () => {
  forgetEncounters(ev.player.id);
  forgetBossPlayer(ev.player);
  clearAllFog(ev.player);
}));

// ------------------------------------------------------------------------------- combat

world.afterEvents.entityHurt.subscribe((ev) => safe("entityHurt", () => {
  const hurt = ev.hurtEntity;
  const by = ev.damageSource.damagingEntity;
  switch (hurt.typeId) {
    case ENT.watcher: onWatcherHurt(hurt, ev.damageSource.cause, by); break;
    case ENT.borrowed: onBorrowedHurt(hurt, by); break;
    case ENT.knocker: onKnockerHurt(hurt, by); break;
    case ENT.mirebound: onMireboundHurt(hurt, by); break;
  }
  if (hurt instanceof Player && by?.typeId === ENT.watcher) onWatcherStruck(by, hurt);
  if (hurt.typeId === ENT.heart || hurt.typeId === ENT.vein) onBossHurt(hurt, ev.damage, by);
}));

world.afterEvents.entityDie.subscribe((ev) => safe("entityDie", () => {
  const dead = ev.deadEntity;
  const killer = ev.damageSource.damagingEntity;
  switch (dead.typeId) {
    case ENT.watcher: onWatcherDied(dead.id, killer); break;
    case ENT.borrowed: onBorrowedDied(dead.id, killer); break;
    case ENT.hollowed: onHollowedDied(dead.id, killer); break;
    case ENT.knocker: onKnockerDied(dead.id, killer); break;
    case ENT.mirebound: onMireboundDied(dead.id, killer); break;
    case ENT.heart: onHeartDied(dead.id); break;
    case ENT.vein: onVeinDied(dead.id); break;
    case "minecraft:player": forgetEncounters(dead.id); break;
  }
}));

world.afterEvents.dataDrivenEntityTrigger.subscribe((ev) => safe("ddTrigger", () => {
  if (ev.eventId === "hollow:watcher_struck") onWatcherStruck(ev.entity, nearestPlayer(ev.entity, 5));
  else if (ev.eventId === "hollow:sheared") onBorrowedSheared(ev.entity, nearestPlayer(ev.entity, 6));
  else if (ev.eventId === "hollow:shield_hit") onShieldHit(ev.entity);
}), { entityTypes: [ENT.watcher, ENT.borrowed, ENT.heart] });

function nearestPlayer(e: Entity, r: number): Player | undefined {
  try {
    return e.dimension.getPlayers({ location: e.location, maxDistance: r, closest: 1 })[0];
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------------------------- script events
// /scriptevent hollow:journal            open the journal without the item
// /scriptevent hollow:status             encounter + failure summary (operators)
// /scriptevent hollow:debug              toggle debug logging (operators)
// /scriptevent hollow:site cabin|camp|shrine   place a site in front of you (operators, testing)

system.afterEvents.scriptEventReceive.subscribe((ev) => safe("scriptevent", () => {
  const p = ev.sourceEntity;
  if (!(p instanceof Player)) return;
  switch (ev.id) {
    case "hollow:journal":
      void openJournal(p);
      return;
    case "hollow:status":
      if (!isOperator(p)) return;
      p.sendMessage(
        `§7[hollow] day ${hollowDay()} · watcher ${watcherCount()} · borrowed ${borrowedCount()} · hollowed ${hollowedCount()} · ` +
        `mirebound ${mireboundCount()} · knocker ${knockerActive() ? 1 : 0} · heart ${bossSummary()} · failures: ${failureReport()}`,
      );
      return;
    case "hollow:debug":
      if (!isOperator(p)) return;
      setDebug(!debugEnabled());
      if (debugEnabled()) p.addTag("hollow_debug");
      else p.removeTag("hollow_debug");
      p.sendMessage(`§7[hollow] debug ${debugEnabled() ? "on" : "off"}`);
      return;
    case "hollow:site": {
      if (!isOperator(p)) return;
      const t = ev.message.trim() as "cabin" | "camp" | "shrine";
      if (t !== "cabin" && t !== "camp" && t !== "shrine") {
        p.sendMessage("§7usage: /scriptevent hollow:site cabin|camp|shrine");
        return;
      }
      p.sendMessage(`§7[hollow] ${forceSite(p, t)}`);
      debug(`forced site ${t}`);
      return;
    }
  }
}), { namespaces: ["hollow"] });
