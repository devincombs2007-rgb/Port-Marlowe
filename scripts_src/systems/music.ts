import { Player } from "@minecraft/server";
import { prefs } from "../core/config";
import { SND } from "../core/ids";
import { ctx, rt } from "../core/players";
import { everyPlayer } from "../core/scheduler";
import { distXZ, chance } from "../core/math";
import { isNight, nightKey, now, tod } from "../core/time";
import { inBossArena } from "../creatures/heart";
import { shrineCenter } from "./sites";

// MUSIC DIRECTOR
// THE HOLLOW's CC0 tracks, per player, through Player.playMusic (Minecraft's Music slider applies).
// Music is rare on purpose - silence is part of the horror:
//  * Boss arena: the boss track loops for the fight.   * Near the shrine: the shrine track loops.
//  * Night in the wild: at most one track per night, never while something is hunting you.
//  * Deep caves: an occasional track, at most every 20 minutes.
//  * Dawn after a night in which something came for you: one quiet track of relief.
// Every player can switch it off (Journal -> Settings -> My comfort settings -> Music).

type Cue = "boss" | "shrine" | "night" | "cave" | "dawn";

interface MusicState {
  cue?: Cue;
  startedAt: number;
  lastAny: number;
  lastCave: number;
  nightPlayed: number;
  nightHadEncounter: number;
  dawnPlayed: number;
  nextNight: number;
}

const LOOPING: Cue[] = ["boss", "shrine"];
const state = new Map<string, MusicState>();

function st(p: Player): MusicState {
  let s = state.get(p.id);
  if (!s) {
    s = { startedAt: -1, lastAny: -99999, lastCave: -99999, nightPlayed: -1, nightHadEncounter: -1, dawnPlayed: -1, nextNight: 0 };
    state.set(p.id, s);
  }
  return s;
}

export function forgetMusic(playerId: string): void {
  state.delete(playerId);
}

function play(p: Player, s: MusicState, cue: Cue, track: string): void {
  try {
    p.playMusic(track, { fade: cue === "boss" ? 1.0 : 3.0, loop: LOOPING.includes(cue), volume: 0.8 });
  } catch {
    return; // track missing or player left
  }
  s.cue = cue;
  s.startedAt = now();
  s.lastAny = now();
}

function stop(p: Player, s: MusicState): void {
  if (!s.cue) return;
  try {
    p.stopMusic();
  } catch {
    /* player left */
  }
  s.cue = undefined;
}

function nearShrine(p: Player): boolean {
  const c = shrineCenter();
  return !!c && p.dimension.id === "minecraft:overworld" && distXZ(p.location, c) < 28 && Math.abs(p.location.y - c.y) < 16;
}

function tick(p: Player): void {
  const fresh = !state.has(p.id);
  const s = st(p);
  if (fresh) {
    // After a script reload the client may still be playing a looping track this session
    // never started; clear it once so nothing loops forever.
    try {
      p.stopMusic();
    } catch {
      /* player left */
    }
  }
  if (!prefs(p).music) {
    stop(p, s);
    return;
  }
  const t = now();
  const night = isNight();
  const key = nightKey();
  if (night && rt(p).encounter) s.nightHadEncounter = key;

  // looping places win, and end as soon as the player leaves them
  if (inBossArena(p)) {
    if (s.cue !== "boss") play(p, s, "boss", SND.musicBoss);
    return;
  }
  if (s.cue === "boss") stop(p, s);
  if (nearShrine(p)) {
    if (s.cue !== "shrine") play(p, s, "shrine", SND.musicShrine);
    return;
  }
  if (s.cue === "shrine") stop(p, s);

  // something is hunting this player: let the silence do the work
  if (rt(p).encounter && (s.cue === "night" || s.cue === "cave")) {
    stop(p, s);
    return;
  }
  // one-shot cues are over after their length (tracks are 48-104 s); clear the marker
  if (s.cue && !LOOPING.includes(s.cue) && t - s.startedAt > 2400) s.cue = undefined;
  if (s.cue) return;
  if (t - s.lastAny < 6000) return; // at least 5 minutes of quiet between tracks

  const c = ctx(p);
  if (!c.overworld) return;
  // dawn after a hard night (the night key changes at sunset, so the previous night is key - 1)
  const tm = tod();
  if (!night && tm < 2500 && s.nightHadEncounter === key - 1 && s.dawnPlayed !== key) {
    s.dawnPlayed = key;
    play(p, s, "dawn", SND.musicDawn);
    return;
  }
  if (night && !c.underground && !c.roofed && !rt(p).encounter && s.nightPlayed !== key && tm > 13500) {
    if (t >= s.nextNight && chance(0.25)) {
      s.nightPlayed = key;
      play(p, s, "night", SND.musicNight[(key >> 1) % SND.musicNight.length]);
    } else s.nextNight = t + 600;
    return;
  }
  if (c.underground && t - s.lastCave > 24000 && !rt(p).encounter && chance(0.15)) {
    s.lastCave = t;
    play(p, s, "cave", SND.musicCave);
  }
}

export function startMusic(): void {
  everyPlayer("music", 200, tick);
}
