import { Entity, EntityTameableComponent, Player, Vector3, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { SITES } from "../content/island_layout";
import { ui, worldSound } from "../core/audio";
import { isOperator, settings } from "../core/config";
import { notice, particle } from "../core/fx";
import { formSession, showForm } from "../core/forms";
import { ENT, SND, DP } from "../core/ids";
import { pick } from "../core/math";
import { every, safe } from "../core/scheduler";
import { readWorld, writeWorld } from "../core/store";
import { isDarkHours, nightKey, now, tod } from "../core/time";
import { groundNear } from "../core/world";
import { unlock } from "../systems/journal";
import { emitNoise } from "../systems/noise";
import { isIsland } from "./mode";
import { Plan, cancelMine, clearAll, enqueue, lookTarget, queueSummary } from "./jobs";
import { rateAt } from "./radiation";

// TREVOR HALE: one companion shared by everyone in the world.
//
// Anyone can talk to him (Use on him) and tell him to follow them or hold a spot; the last order
// wins and he says whose order he is on. He fights anything hostile with his service pistol,
// shares his medkits with whoever is badly hurt, won't walk into the crater without a suit,
// and talks about what is around him. (The shared job queue - chopping, gathering, building -
// arrives with the next phase; its orders are already listed in his menu as "soon".)
//
// When he would die he goes down instead. Anyone can help him up within 60 seconds by standing
// beside him (start with Use). If nobody does: with permanent death off (the default) he limps
// back into camp at the next dawn; with it on, he is gone, and the ending remembers.

interface TrevorState {
  id?: string;
  mode: "follow" | "hold";
  leader?: string;
  leaderName?: string;
  /** absolute game time he went down (0 = standing) */
  downAt: number;
  /** limping back: returns on the first dawn after this day */
  awayDay: number;
  gone: boolean;
  medkits: number;
  medkitDay: number;
  home: { x: number; y: number; z: number };
  lastNight: number;
  deaths: number;
  /** waiting at the crater's edge for this player to come back out */
  waitingFor?: string;
  /** what he has seen killed, by creature type, for remarks like "that's the third one" */
  kills?: Record<string, number>;
}

const DEFAULT: TrevorState = {
  mode: "follow", downAt: 0, awayDay: -1, gone: false, medkits: 3, medkitDay: 0,
  home: { x: SITES.SPAWN.x, y: 66, z: SITES.SPAWN.z }, lastNight: -1, deaths: 0,
};
const DOWN_TICKS = 1200;
const MEMORY: Record<string, [string, string]> = {
  [ENT.watcher]: ["of those tall ones", "It just stood there, watching us."],
  [ENT.borrowed]: ["sheep that isn't a sheep", "That was not a sheep. That was never a sheep."],
  [ENT.hollowed]: ["clicker", "No eyes. It found us by sound."],
  [ENT.knocker]: ["of the things at the door", "It knocked. It actually knocked."],
  [ENT.mirebound]: ["of the things in the water", "It came up out of the water like a log with teeth."],
};
const REVIVE_TICKS = 60;

let state: TrevorState | undefined;
const lineCooldown = new Map<string, number>();
const reviving = new Map<string, number>(); // player id -> ticks of help so far

function st(): TrevorState {
  if (!state) state = { ...DEFAULT, ...readWorld<TrevorState>(DP.trevor, DEFAULT) };
  return state;
}

function saveState(): void {
  writeWorld(DP.trevor, st());
}

export function trevorEntity(): Entity | undefined {
  const s = st();
  if (s.id) {
    try {
      const e = world.getEntity(s.id);
      if (e?.isValid) return e;
    } catch {
      /* unloaded */
    }
  }
  try {
    const found = world.getDimension("overworld").getEntities({ type: ENT.trevor });
    if (found.length > 0) {
      // more than one should never happen; keep the first and quietly remove extras
      for (const extra of found.slice(1)) extra.triggerEvent("hollow:despawn");
      s.id = found[0].id;
      saveState();
      return found[0];
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function trevorExists(): boolean {
  return !!st().id && !st().gone;
}

export function trevorGone(): boolean {
  return st().gone;
}

/** Say a line to everyone near him (or everyone, if he is not loaded). */
export function say(text: string, key?: string, cooldownTicks = 0): boolean {
  if (key) {
    const last = lineCooldown.get(key) ?? -999999;
    if (now() - last < cooldownTicks) return false;
    lineCooldown.set(key, now());
  }
  const e = trevorEntity();
  const msg = `§2Trevor:§r ${text}`;
  for (const p of world.getAllPlayers()) {
    if (!p.isValid) continue;
    if (e && p.dimension.id === e.dimension.id) {
      const d = Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z);
      if (d > 64) continue;
    }
    p.sendMessage(msg);
  }
  return true;
}

export function spawnTrevor(at: Vector3): Entity | undefined {
  const s = st();
  if (s.gone) return undefined;
  const existing = trevorEntity();
  if (existing) return existing;
  try {
    const e = world.getDimension("overworld").spawnEntity(ENT.trevor, at);
    e.nameTag = "Trevor";
    s.id = e.id;
    s.downAt = 0;
    saveState();
    return e;
  } catch {
    return undefined;
  }
}

function setStateProp(e: Entity, mode: "follow" | "hold"): void {
  e.triggerEvent(mode === "follow" ? "hollow:follow" : "hollow:hold");
}

/** Make him follow this player: release the old owner, then tame to the new one. */
export function orderFollow(p: Player, quiet = false): void {
  const s = st();
  const e = trevorEntity();
  s.mode = "follow";
  s.leader = p.id;
  s.leaderName = p.name;
  saveState();
  if (!e || isDown()) return;
  e.triggerEvent("hollow:release");
  system.run(() => safe("trevor.tame", () => {
    if (!e.isValid || !p.isValid) return;
    const tame = e.getComponent("minecraft:tameable") as EntityTameableComponent | undefined;
    let ok = false;
    try {
      ok = !!tame?.tame(p);
    } catch {
      ok = false;
    }
    if (!ok) setStateProp(e, "follow"); // tame refused: follow anyway; the script leash keeps him close
  }));
  if (!quiet) say(pick([`Right behind you, ${p.name}.`, "Lead on.", `On you, ${p.name}.`, "I've got your back."]));
}

export function orderHold(p?: Player, quiet = false): void {
  const s = st();
  const e = trevorEntity();
  s.mode = "hold";
  if (p) {
    s.leader = p.id;
    s.leaderName = p.name;
  }
  saveState();
  if (!e || isDown()) return;
  setStateProp(e, "hold");
  if (!quiet) say(pick(["I'll hold here.", "Holding. Shout if you need me.", "Fine. I'll keep watch on this spot."]));
}

function isDown(): boolean {
  return st().downAt > 0;
}

export function trevorDown(): boolean {
  return isDown();
}

function leader(): Player | undefined {
  const s = st();
  return world.getAllPlayers().find((p) => p.id === s.leader && p.isValid);
}

// ------------------------------------------------------------------------- going down, help up

function onDown(e: Entity): void {
  const s = st();
  if (s.downAt > 0) return;
  s.downAt = world.getAbsoluteTime();
  saveState();
  worldSound(e.dimension, "hollow.trevor.hurt", e.location, 1, 0.8);
  say("§cI'm hit... I'm down! §7Somebody... get me up.");
  for (const p of world.getAllPlayers()) {
    notice(p, "§cTrevor is down. §7Go to him and press Use on him to help him up (60 s).");
  }
}

function helpUp(e: Entity, by?: Player): void {
  const s = st();
  s.downAt = 0;
  saveState();
  e.triggerEvent("hollow:revive");
  try {
    const hp = e.getComponent("minecraft:health");
    hp?.setCurrentValue(Math.max(hp.currentValue, 22));
  } catch {
    /* ignore */
  }
  system.run(() => {
    if (!e.isValid) return;
    const l = leader();
    if (s.mode === "follow" && l) orderFollow(l, true);
    else setStateProp(e, "hold");
  });
  say(by ? pick([`Thanks, ${by.name}. I owe you one.`, "Ugh. That was close. Thank you.", "Okay... okay. I'm good. Let's move."]) : "On my feet again.");
  if (by) unlock(by, "trevor_down", true);
}

/** Nobody came in time. */
function fallFor(e: Entity | undefined): void {
  const s = st();
  s.downAt = 0;
  s.deaths += 1;
  if (settings().trevorPermadeath) {
    s.gone = true;
    s.id = undefined;
    saveState();
    if (e?.isValid) {
      try {
        e.kill();
      } catch {
        e.triggerEvent("hollow:despawn");
      }
    }
    for (const p of world.getAllPlayers()) {
      p.sendMessage("§8Trevor Hale is dead. Nobody reached him in time.");
      notice(p, "§8Trevor is gone.");
    }
    return;
  }
  s.awayDay = world.getDay();
  s.id = undefined;
  saveState();
  if (e?.isValid) e.triggerEvent("hollow:despawn");
  for (const p of world.getAllPlayers()) {
    p.sendMessage("§7Trevor crawled off into the brush. §8He'll find his way back to camp at dawn, if he can.");
  }
}

function tickDowned(e: Entity): void {
  const s = st();
  const left = DOWN_TICKS - (world.getAbsoluteTime() - s.downAt);
  if (left <= 0) {
    fallFor(e);
    return;
  }
  // anyone who started helping and stays beside him brings him round
  for (const p of world.getAllPlayers()) {
    const n = reviving.get(p.id);
    if (n === undefined) continue;
    const d = Math.hypot(p.location.x - e.location.x, p.location.y - e.location.y, p.location.z - e.location.z);
    if (!p.isValid || p.dimension.id !== e.dimension.id || d > 3.2) {
      reviving.delete(p.id);
      notice(p, "§7You moved away. §8Press Use on him again to help him up.");
      continue;
    }
    const next = n + 10;
    reviving.set(p.id, next);
    const bars = Math.round((next / REVIVE_TICKS) * 10);
    notice(p, `§7Helping Trevor up  §a${"█".repeat(bars)}§8${"█".repeat(10 - bars)}`);
    if (next >= REVIVE_TICKS) {
      reviving.clear();
      helpUp(e, p);
      return;
    }
  }
  if (left % 200 < 10) {
    for (const p of world.getAllPlayers()) {
      if (!reviving.has(p.id)) notice(p, `§cTrevor is down §7(${Math.ceil(left / 20)} s left).`);
    }
  }
}

// ------------------------------------------------------------------------- talking

function statusLine(e: Entity | undefined): string {
  const s = st();
  if (s.gone) return "§8Trevor is dead.";
  if (!e) return s.awayDay >= 0 ? "§7Trevor is somewhere out there, making his way back to camp." : "§7Trevor isn't nearby.";
  const hp = e.getComponent("minecraft:health");
  const pct = hp ? Math.round((hp.currentValue / hp.effectiveMax) * 100) : 100;
  const order = s.mode === "follow" ? `following §f${s.leaderName ?? "the group"}` : "holding his position";
  return `§7Health §f${pct}%§7 · ${order}§7 · medkits §f${s.medkits}`;
}

function advice(p: Player): string {
  const rate = rateAt(p);
  if (rate > 40) return "That counter of yours is going mad. Whatever we're doing here, let's do it fast.";
  if (isDarkHours()) return pick([
    "Stay in the light tonight. Something's been circling us since the sun went down.",
    "Sleep in shifts if you can. I'll take first watch.",
    "If you hear clicking, freeze. Don't run. Trust me on that.",
  ]);
  const dCrash = Math.hypot(p.location.x - SITES.CRASH.x, p.location.z - SITES.CRASH.z);
  if (dCrash < 60) return pick([
    "Shelter first. Walls, a roof, a door that shuts. Then we worry about getting off this rock.",
    "The crates had rations and rounds. Don't leave anything in that wreck.",
    "Dan had a flight bag. Check him, if you can stomach it. I couldn't.",
  ]);
  return pick([
    "The survey map put six monitoring stations on this island. If they're still standing, they'll have logs.",
    "There's a relay tower on the north peak. If it has any power left, that's our phone home.",
    "Those shots came from the north-west treeline. Whoever they were, they knew how to shoot.",
    "Keep your dose low. Radiation doesn't hurt until it's far too late.",
    "Seventy years since the test. Nothing here should still be this... alive.",
  ]);
}

async function talk(p: Player, e: Entity): Promise<void> {
  if (isDown()) {
    if (!reviving.has(p.id)) {
      reviving.set(p.id, 0);
      notice(p, "§7Stay beside him...");
      ui(p, "random.click", 0.4, 0.6);
    }
    return;
  }
  await formSession(p, () => trevorMenu(p, e, false));
  unlock(p, "trevor1");
}

/** The order menu: beside him (Use on him) or from anywhere with the field radio. */
export async function trevorMenu(p: Player, e: Entity | undefined, remote: boolean): Promise<void> {
  const s = st();
  const there = lookTarget(p);
  const near = !!e && Math.hypot(e.location.x - p.location.x, e.location.z - p.location.z) < 8;
  const actions: [string, string, () => void | Promise<void>][] = [
    ["Follow me", "textures/ui/hollow/journal/trevor", () => {
      if (rateAt(p) > 60) say("Not in there. Not without a suit. Come back out and I'll follow you anywhere else.");
      else enqueue(p, "follow");
    }],
    ["Hold here", "textures/ui/hollow/world", () => enqueue(p, "hold")],
    ["Go there\n§8where you're looking", "textures/ui/hollow/journal/conditions", () => enqueue(p, "goto", there)],
    ["Make camp here\n§8a crate he fills with what he gathers", "textures/ui/hollow/journal/place_camp", () => enqueue(p, "camp", there)],
    ["Chop trees there", "textures/ui/hollow/journal/item_survival_hatchet", () => enqueue(p, "chop", there)],
    ["Gather stone there", "textures/ui/hollow/journal/shelter", () => enqueue(p, "stone", there)],
    ["Gather food there\n§8berries, or fish from the shore", "textures/ui/hollow/journal/item_ration_pack", () => enqueue(p, "food", there)],
    ["Build...\n§8from the logs in the camp crate", "textures/ui/hollow/journal/place_leanto", () => buildMenu(p, there)],
    ["Light a fire there", "textures/ui/hollow/journal/event_lantern", () => enqueue(p, "fire", there)],
    ["Collect items there", "textures/ui/hollow/journal/recipe", () => enqueue(p, "collect", there)],
    ["Patrol camp tonight", "textures/ui/hollow/journal/watcher", () => enqueue(p, "patrol")],
  ];
  if (near && !remote) actions.push([s.medkits > 0 ? "Patch me up\n§8uses one of his medkits" : "Patch me up\n§8he's out of medkits", "textures/ui/hollow/journal/item_medkit", () => patchUp(p)]);
  actions.push(["Cancel my orders", "textures/ui/hollow/back", () => {
    const n = cancelMine(p);
    say(n ? `Dropping your ${n === 1 ? "order" : `${n} orders`}, ${p.name}.` : "You haven't asked me for anything.");
  }]);
  if (isOperator(p)) actions.push(["§8Clear every order (operator)", "textures/ui/hollow/settings", () => {
    clearAll();
    say("Clean slate.");
  }]);
  const form = new ActionFormData()
    .title(remote ? "§lField radio: Trevor" : "§lTrevor Hale")
    .body(`${statusLine(e)}\n${queueSummary()}\n\n§o"${remote ? "Go ahead, I'm listening." : advice(p)}"`);
  for (const [label, icon] of actions) form.button(label, icon);
  form.button("§8Close", "textures/ui/hollow/back");
  const r = await showForm(p, form);
  if (!r || r.canceled || r.selection === undefined || r.selection >= actions.length) return;
  await actions[r.selection][2]();
}

async function buildMenu(p: Player, there: { x: number; y: number; z: number }): Promise<void> {
  const plans: [Plan, string][] = [["leanto", "Lean-to\n§810 logs"], ["cabin", "Cabin\n§840 logs"], ["watchtower", "Watchtower\n§830 logs"], ["wall", "Palisade wall\n§88 logs"]];
  const form = new ActionFormData().title("§lBuild").body("§7He builds where you're looking, facing you, from the logs in the camp crate.");
  for (const [, label] of plans) form.button(label, "textures/ui/hollow/journal/place_leanto");
  form.button("§8Back", "textures/ui/hollow/back");
  const r = await showForm(p, form);
  if (!r || r.canceled || r.selection === undefined || r.selection >= plans.length) return;
  enqueue(p, "build", there, plans[r.selection][0]);
}

function patchUp(p: Player): void {
  const s = st();
  const hp = p.getComponent("minecraft:health");
  if (!hp) return;
  if (hp.currentValue >= hp.effectiveMax - 1) {
    say(`You're fine, ${p.name}. I'm saving these.`);
    return;
  }
  if (s.medkits <= 0) {
    say("I'm out. Bring me anything you find in the bunkers and I'll make it stretch.");
    return;
  }
  s.medkits -= 1;
  saveState();
  try {
    p.addEffect("instant_health", 1, { amplifier: 0, showParticles: false });
    p.addEffect("regeneration", 120, { amplifier: 1 });
  } catch {
    /* ignore */
  }
  say(pick(["Hold still. This'll sting.", "Pressure on it. There. You'll live.", "Clean, dressed. Try not to do that again."]));
}

// ------------------------------------------------------------------------- awareness

let beats = 0;

function awareness(e: Entity): void {
  const s = st();
  beats++;
  // slow recovery between fights (1 health every 10 s)
  if (beats % 20 === 0) {
    try {
      const hp = e.getComponent("minecraft:health");
      if (hp && hp.currentValue < hp.effectiveMax) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + 1));
    } catch {
      /* ignore */
    }
  }
  // one medkit back each new day (he scrounges)
  if (world.getDay() > s.medkitDay && s.medkits < 3) {
    s.medkits += 1;
    s.medkitDay = world.getDay();
    saveState();
  }
  const near = world.getAllPlayers().filter((p) => p.isValid && p.dimension.id === e.dimension.id &&
    Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z) < 24);
  // badly hurt players get patched up without asking
  for (const p of near) {
    const hp = p.getComponent("minecraft:health");
    if (!hp || hp.currentValue <= 0 || hp.currentValue > 6 || s.medkits <= 0) continue;
    if (Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z) > 8) continue;
    const key = `medkit:${p.id}`;
    if (now() - (lineCooldown.get(key) ?? -99999) < 1800) continue;
    lineCooldown.set(key, now());
    patchUp(p);
  }
  // won't follow into the crater
  const l = leader();
  if (s.mode === "follow" && l && rateAt(l) > 60 && Math.hypot(l.location.x - e.location.x, l.location.z - e.location.z) < 40) {
    s.mode = "hold";
    saveState();
    setStateProp(e, "hold");
    say("§eNo. Not in there without a suit. §rI'll wait right here. Don't be long.");
    s.waitingFor = l.id;
  }
  const waiting = s.waitingFor;
  if (s.mode === "hold" && waiting && l && l.id === waiting && rateAt(l) < 20 &&
      Math.hypot(l.location.x - e.location.x, l.location.z - e.location.z) < 12) {
    s.waitingFor = undefined;
    orderFollow(l, true);
    say("Good. Let's get away from that hole.");
  }
  // the script leash: if the vanilla follow lost him, bring him along
  if (s.mode === "follow" && l && l.dimension.id === e.dimension.id) {
    const d = Math.hypot(l.location.x - e.location.x, l.location.z - e.location.z);
    if (d > 40) {
      const back = l.getViewDirection();
      const g = groundNear(l.dimension, l.location.x - back.x * 4, l.location.y, l.location.z - back.z * 4, 6);
      if (g) e.teleport(g);
    }
  }
  // things he notices
  if (isDarkHours() && s.lastNight !== nightKey()) {
    s.lastNight = nightKey();
    saveState();
    say(pick(["Sun's going down. Stay close, stay in the light.", "Here comes the dark. Weapons where you can reach them.", "Night. Listen more than you look."]));
  }
  try {
    const clickers = e.dimension.getEntities({ type: ENT.hollowed, location: e.location, maxDistance: 22 });
    if (clickers.length > 0) say("§7(whispering)§r Hear that clicking? Don't move. Don't make a sound.", "hollowed", 3600);
    const watcher = e.dimension.getEntities({ type: ENT.watcher, location: e.location, maxDistance: 40 });
    if (watcher.length > 0) say("There's... someone standing in the trees. Don't take your eyes off it.", "watcher", 4800);
  } catch {
    /* ignore */
  }
  // dawn after a bad night
  if (tod() < 400 && s.lastNight >= 0) say(pick(["Made it to morning.", "Sun's up. We live another day."]), "dawn", 12000);
}

function tick(): void {
  if (!isIsland()) return;
  const s = st();
  if (s.gone) return;
  const e = trevorEntity();
  if (!e) {
    // limping back: returns at the first dawn after the night he fell
    if (s.awayDay >= 0 && world.getDay() > s.awayDay && tod() < 3000) {
      const home = s.home;
      const dim = world.getDimension("overworld");
      let at: Vector3 | undefined;
      try {
        if (dim.isChunkLoaded(home)) at = groundNear(dim, home.x, home.y, home.z, 12) ?? home;
      } catch {
        at = undefined;
      }
      if (!at) {
        const p = world.getAllPlayers().find((x) => x.dimension.id === "minecraft:overworld");
        if (p) at = groundNear(dim, p.location.x + 6, p.location.y, p.location.z + 6, 8);
      }
      if (at) {
        s.awayDay = -1;
        saveState();
        const back = spawnTrevor(at);
        if (back) {
          const hp = back.getComponent("minecraft:health");
          try {
            hp?.setCurrentValue(20);
          } catch {
            /* ignore */
          }
          s.medkits = Math.max(0, s.medkits - 1);
          saveState();
          say("§7(limping)§r Took me all night to find you. Lost a medkit on the way. Don't ask.");
          const l = leader();
          if (l) orderFollow(l, true);
        }
      }
    }
    // went down while unloaded / across a restart: resolve once the time has run out
    if (s.downAt > 0 && world.getAbsoluteTime() - s.downAt > DOWN_TICKS) fallFor(undefined);
    return;
  }
  if (isDown()) {
    tickDowned(e);
    return;
  }
  awareness(e);
}

export function forgetTrevorPlayer(playerId: string): void {
  reviving.delete(playerId);
}

export function trevorSummary(): string {
  const s = st();
  const e = trevorEntity();
  return `trevor: ${e ? "loaded" : "absent"} mode=${s.mode} leader=${s.leaderName ?? "-"} down=${s.downAt > 0} gone=${s.gone} away=${s.awayDay} medkits=${s.medkits} falls=${s.deaths}`;
}

/** Test kit: knock him down / bring him back. */
export function forceDown(): string {
  const e = trevorEntity();
  if (!e) return "Trevor is not loaded";
  e.triggerEvent("hollow:down");
  onDown(e);
  return "Trevor is down";
}

export function setHome(at: Vector3): void {
  st().home = { x: Math.floor(at.x), y: Math.floor(at.y), z: Math.floor(at.z) };
  saveState();
}

export function startTrevor(): void {
  world.afterEvents.playerInteractWithEntity.subscribe((ev) => safe("trevor.interact", () => {
    if (ev.target.typeId !== ENT.trevor) return;
    void talk(ev.player, ev.target);
  }));
  world.afterEvents.dataDrivenEntityTrigger.subscribe((ev) => safe("trevor.trigger", () => {
    if (ev.eventId === "hollow:down") onDown(ev.entity);
  }), { entityTypes: [ENT.trevor] });
  world.afterEvents.entityDie.subscribe((ev) => safe("trevor.die", () => {
    if (ev.deadEntity.typeId !== ENT.trevor) return;
    if (st().gone) return;
    fallFor(undefined);
  }), { entityTypes: [ENT.trevor] });
  // he remembers what you've killed together
  world.afterEvents.entityDie.subscribe((ev) => safe("trevor.memory", () => {
    const dead = ev.deadEntity;
    const name = MEMORY[dead.typeId];
    if (!name || !isIsland()) return;
    const e = trevorEntity();
    if (!e || e.dimension.id !== dead.dimension.id) return;
    if (Math.hypot(e.location.x - dead.location.x, e.location.z - dead.location.z) > 40) return;
    const s = st();
    s.kills ??= {};
    const n = (s.kills[dead.typeId] = (s.kills[dead.typeId] ?? 0) + 1);
    saveState();
    const ord = ["", "first", "second", "third", "fourth", "fifth", "sixth"][n] ?? `${n}th`;
    if (n === 1) say(`What in God's name was that? ${name[1]}`, `mem:${dead.typeId}`, 200);
    else say(`That's the ${ord} ${name[0]}. ${n >= 3 ? "There's more of them than there should be." : "Keep count. I am."}`, `mem:${dead.typeId}`, 200);
  }));
  // his shots: the report, a muzzle flash, and the noise that carries across the island
  world.afterEvents.entitySpawn.subscribe((ev) => safe("trevor.shot", () => {
    const b = ev.entity;
    if (!b.isValid || b.typeId !== ENT.bullet) return;
    worldSound(b.dimension, SND.pistol, b.location, 1, 0.92 + Math.random() * 0.1);
    particle(b.dimension, "minecraft:basic_smoke_particle", b.location);
    emitNoise({ dim: b.dimension, at: b.location, radius: 48, kind: "gunshot" });
    say(pick(["Contact!", "Get behind me!", "Shooting!", "Down, down!"]), "contact", 600);
  }));
  every("trevor", 10, tick, 7);
}
