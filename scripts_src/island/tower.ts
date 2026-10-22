import { BlockPermutation, Entity, Player, Vector3, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { POINTS, SITES } from "../content/island_layout";
import { ui, worldSound } from "../core/audio";
import { settings } from "../core/config";
import { notice, particle } from "../core/fx";
import { formSession, showForm } from "../core/forms";
import { DP, ENT, ITEM, SND } from "../core/ids";
import { compass, pick } from "../core/math";
import { every, safe } from "../core/scheduler";
import { readWorld, writeWorld } from "../core/store";
import { isDarkHours } from "../core/time";
import { unlock } from "../systems/journal";
import { enterScene, leave } from "./cinematic";
import { cultEndingState, sendWarband } from "./cult";
import { isIsland } from "./mode";
import { onConsoleHook, surveyState } from "./survey";
import { say, trevorEntity, trevorGone } from "./trevor";

// THE WAY OFF
//
// The 1957 relay on the north peak still stands. It needs:
//   the generator in the shed fuelled (8 coal or charcoal),
//   2 vacuum tubes   (the radio room in sealed Bunker 2; a spare under the Sunfall shrine),
//   4 copper wire    (the general store; crafted from copper; traded from the Faithful),
//   1 battery bank   (the boathouse at the dock; a spare in Bunker 3's generator room).
// Press the button in the hut to install parts and, when it's all in, transmit. The Coast Guard
// answers and sends a helicopter at first light. The lamp on the mast burns all night, and the
// Children of the Second Sun come for it (unless they call you kin). At dawn the helicopter sets
// down at the old dock. Stand by it to leave. The ending reflects what you did on the island; the
// world carries on afterwards for anyone who wants to stay.

type Phase = "idle" | "waiting" | "inbound" | "landed" | "gone";

interface TowerState {
  running: boolean;
  valves: number;
  wire: number;
  battery: number;
  phase: Phase;
  sawNight: boolean;
  waves: number;
  ending: string;
}

const NEED = { valves: 2, wire: 4, battery: 1 };
const DEFAULT: TowerState = { running: false, valves: 0, wire: 0, battery: 0, phase: "idle", sawNight: false, waves: 0, ending: "" };
let state: TowerState | undefined;

function st(): TowerState {
  if (!state) state = { ...DEFAULT, ...readWorld<TowerState>(DP.tower, DEFAULT) };
  return state;
}

function save(): void {
  writeWorld(DP.tower, st());
}

const FUEL = ["minecraft:coal", "minecraft:charcoal", "minecraft:coal_block"];

function count(p: Player, ids: string[]): number {
  const c = p.getComponent("minecraft:inventory")?.container;
  let n = 0;
  if (!c) return 0;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it && ids.includes(it.typeId)) n += it.typeId === "minecraft:coal_block" ? it.amount * 9 : it.amount;
  }
  return n;
}

function take(p: Player, ids: string[], want: number): number {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return 0;
  let got = 0;
  for (let i = 0; i < c.size && got < want; i++) {
    const it = c.getItem(i);
    if (!it || !ids.includes(it.typeId)) continue;
    const per = it.typeId === "minecraft:coal_block" ? 9 : 1;
    const use = Math.min(it.amount, Math.ceil((want - got) / per));
    got += use * per;
    if (use >= it.amount) c.setItem(i, undefined);
    else {
      it.amount -= use;
      c.setItem(i, it);
    }
  }
  return got;
}

// ------------------------------------------------------------------------- the generator

function generator(p: Player): void {
  const s = st();
  unlock(p, "tower_generator");
  if (s.running) {
    notice(p, "§7The generator thuds away. The cables to the mast are warm.");
    return;
  }
  if (count(p, FUEL) < 8) {
    notice(p, `§7A 1950s diesel-electric set, converted to burn anything. The hopper is empty: it needs §f8 coal or charcoal§7 (you have ${count(p, FUEL)}).`);
    return;
  }
  take(p, FUEL, 8);
  s.running = true;
  save();
  const g = (POINTS.generator ?? [])[0];
  if (g) {
    worldSound(p.dimension, "random.explode", g, 0.3, 1.8);
    particle(p.dimension, "minecraft:large_explosion", { x: g.x + 0.5, y: g.y + 2, z: g.z + 0.5 });
  }
  notice(p, "§aThe generator coughs, catches, and settles into a roar.§7 The hut lights flicker on.");
  say("Listen to that. Seventy years and it still runs. They built things to outlast the end of the world.", "gen", 0);
}

// ------------------------------------------------------------------------- the transmitter

function partsLine(): string {
  const s = st();
  const m = (have: number, need: number) => (have >= need ? `§a${have}/${need}` : `§c${have}/${need}`);
  return `§7Vacuum tubes ${m(s.valves, NEED.valves)}§7 · Copper wire ${m(s.wire, NEED.wire)}§7 · Battery bank ${m(s.battery, NEED.battery)}§7 · Generator ${s.running ? "§arunning" : "§ccold"}`;
}

function ready(): boolean {
  const s = st();
  return s.running && s.valves >= NEED.valves && s.wire >= NEED.wire && s.battery >= NEED.battery;
}

function install(p: Player): number {
  const s = st();
  let n = 0;
  const put = (key: "valves" | "wire" | "battery", id: string) => {
    const got = take(p, [id], NEED[key] - s[key]);
    s[key] += got;
    n += got;
  };
  put("valves", ITEM.valve);
  put("wire", ITEM.wire);
  put("battery", ITEM.battery);
  save();
  if (n) ui(p, "random.anvil_use", 0.4, 1.4);
  return n;
}

async function towerConsole(p: Player): Promise<void> {
  const s = st();
  unlock(p, "tower_parts");
  if (s.phase !== "idle") {
    notice(p, s.phase === "waiting"
      ? "§7The transmitter hums. Coast Guard Sector Honolulu: \"Helicopter at first light. Be at the old dock.\""
      : s.phase === "gone" ? "§7The relay is quiet now. The lamp on the mast still burns." : "§7The helicopter is here. Get to the dock.");
    return;
  }
  await formSession(p, async () => {
    const form = new ActionFormData()
      .title("§lRelay Transmitter, 1957")
      .body("A steel cabinet of valve sockets and cloth-wrapped wiring. Most of it is intact. What isn't, you can replace.\n\n" + partsLine());
    form.button("Install parts from my pack", "textures/ui/hollow/journal/item_vacuum_tube");
    form.button(ready() ? "§lTransmit§r" : "§8Transmit §7(not ready)", "textures/ui/hollow/journal/item_field_radio");
    form.button("§8Leave", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled) return;
    if (r.selection === 0) {
      const n = install(p);
      notice(p, n ? `§7You fit what you have. ${partsLine()}` : `§7Nothing in your pack fits. ${partsLine()}`);
      if (ready()) notice(p, "§aEverything is in. Press the button again to transmit.");
    } else if (r.selection === 1) {
      if (!ready()) {
        notice(p, `§7The transmitter won't warm up. ${partsLine()}`);
        return;
      }
      transmit(p);
    }
  });
}

function transmit(p: Player): void {
  const s = st();
  if (s.phase !== "idle") return;
  s.phase = "waiting";
  s.sawNight = isDarkHours();
  s.waves = 0;
  save();
  const dim = p.dimension;
  const lamp = (POINTS.tower_lamp ?? [])[0];
  if (lamp) {
    try {
      dim.getBlock(lamp)?.setPermutation(BlockPermutation.resolve("minecraft:sea_lantern"));
      dim.getBlock({ x: lamp.x, y: lamp.y + 1, z: lamp.z })?.setPermutation(BlockPermutation.resolve("minecraft:light_block_15"));
    } catch {
      /* unloaded */
    }
  }
  const lines: [number, string, string?][] = [
    [0, "§7You key the transmitter. Seventy-year-old valves warm to orange, one by one.", SND.cineRadio],
    [80, "§f\"Mayday, mayday, mayday. This is the Varrow Island survey party, contract one-one-four. Our helicopter was shot down. Two dead. We need extraction.\""],
    [180, "§8...static...", SND.cineRadio],
    [260, "§b\"Varrow party, Coast Guard Sector Honolulu. We hear you, faint but readable. A helicopter will launch at first light. Can you reach the old dock on the south-east shore?\""],
    [380, "§f\"We can reach it.\""],
    [430, "§b\"Hold on until dawn. And keep your heads down.\""],
  ];
  for (const [t, text, snd] of lines) {
    system.runTimeout(() => safe("tower.radio", () => {
      for (const q of world.getAllPlayers()) {
        notice(q, text);
        if (snd) ui(q, snd, 0.7, 1);
      }
    }), t);
  }
  system.runTimeout(() => safe("tower.after", () => {
    for (const q of world.getAllPlayers()) unlock(q, "transmit");
    const kin = cultEndingState().standing >= 70;
    say(kin
      ? "First light. One more night. And the lamp's lit; every soul on this island can see it. I hope your friends at Sunfall meant it."
      : "First light. One more night, then. That lamp's lit now; they'll all have seen it. They'll come for it.", "transmit", 0);
  }), 480);
}

// ------------------------------------------------------------------------- the last night

function lastNight(): void {
  const s = st();
  if (s.phase !== "waiting") return;
  if (isDarkHours()) {
    if (!s.sawNight) {
      s.sawNight = true;
      save();
    }
    // the Children come for the lamp
    const { standing, hierophantDead } = cultEndingState();
    if (!settings().cult || standing >= 70 || s.waves >= (hierophantDead ? 6 : 4)) return;
    const players = world.getAllPlayers().filter((p) => p.isValid && p.dimension.id === "minecraft:overworld");
    if (!players.length) return;
    const target = pick(players);
    const n = sendWarband(target.location, hierophantDead ? 4 : 3);
    if (n) {
      s.waves++;
      save();
      for (const p of players) notice(p, pick(["§cTorches in the trees.", "§cA bell rings at Sunfall. Then another.", "§cVoices, singing, getting closer."]));
    }
    return;
  }
  if (s.sawNight) startRescue();
}

// ------------------------------------------------------------------------- the rescue

const LANDING = (): Vector3 => {
  const d = (POINTS.dock_end ?? [])[0] ?? { x: SITES.DOCK.x, y: 64, z: SITES.DOCK.z + 30 };
  return { x: d.x + 0.5, y: d.y + 1, z: d.z - 4.5 };
};

let heli: Entity | undefined;
let flight: number | undefined;
const aboard = new Map<string, number>();

function spawnHeli(at: Vector3): Entity | undefined {
  try {
    heli = world.getDimension("overworld").spawnEntity(ENT.helicopter, at);
    return heli;
  } catch {
    return undefined;
  }
}

function fly(from: Vector3, to: Vector3, ticks: number, yaw: number, done: () => void): void {
  if (flight !== undefined) system.clearRun(flight);
  let t = 0;
  flight = system.runInterval(() => safe("tower.fly", () => {
    t++;
    const k = Math.min(1, t / ticks);
    const e = k * k * (3 - 2 * k);
    const at = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z: from.z + (to.z - from.z) * e };
    try {
      if (heli?.isValid) heli.teleport(at, { rotation: { x: 0, y: yaw } });
    } catch {
      /* chunk not loaded: it'll appear on arrival */
    }
    if (t % 20 === 0) worldSound(world.getDimension("overworld"), SND.cineRotor, at, 1.4);
    if (k >= 1) {
      if (flight !== undefined) system.clearRun(flight);
      flight = undefined;
      done();
    }
  }), 1);
}

function startRescue(): void {
  const s = st();
  s.phase = "inbound";
  save();
  const land = LANDING();
  const from = { x: land.x + 30, y: land.y + 45, z: land.z + 190 };
  spawnHeli(from);
  for (const p of world.getAllPlayers()) {
    notice(p, `§bRotor noise from the south.§7 Orange and white, low over the water: the Coast Guard. It's heading for the old dock (${compass(p.location, land)}).`);
    try {
      p.onScreenDisplay.setTitle("§fDawn", { subtitle: "§7get to the dock", fadeInDuration: 20, stayDuration: 60, fadeOutDuration: 30 });
    } catch {
      /* ignore */
    }
  }
  say("There! Go, go! The dock!", "rescue", 0);
  fly(from, { x: land.x, y: land.y + 1.5, z: land.z }, 420, 180, () => {
    st().phase = "landed";
    save();
    for (const p of world.getAllPlayers()) {
      unlock(p, "rescue");
      notice(p, "§7The helicopter settles beside the old dock, skids on the planks. A crewman waves you in.");
    }
  });
}

/** Keep the landed helicopter where it should be (it's a prop: reloads and cleanup remove it). */
function holdLanded(): void {
  const s = st();
  if (s.phase !== "landed" && s.phase !== "inbound") return;
  const land = LANDING();
  const dim = world.getDimension("overworld");
  if (!heli?.isValid) {
    if (s.phase === "inbound" && flight !== undefined) return;
    try {
      if (!dim.isChunkLoaded(land)) return;
    } catch {
      return;
    }
    if (s.phase === "inbound") {
      s.phase = "landed";
      save();
    }
    spawnHeli({ x: land.x, y: land.y + 1.5, z: land.z });
  }
  if (s.phase !== "landed" || !heli?.isValid) return;
  try {
    heli.teleport({ x: land.x, y: land.y + 1.5, z: land.z }, { rotation: { x: 0, y: 180 } });
  } catch {
    /* ignore */
  }
  // boarding: two seconds next to it
  const near = world.getAllPlayers().filter((p) => p.isValid && Math.hypot(p.location.x - land.x, p.location.z - land.z) < 7 && Math.abs(p.location.y - land.y) < 6);
  for (const p of world.getAllPlayers()) if (!near.includes(p)) aboard.delete(p.id);
  for (const p of near) {
    const n = (aboard.get(p.id) ?? 0) + 1;
    aboard.set(p.id, n);
    if (n === 1) notice(p, "§7You climb in...");
    if (n >= 4) {
      ending();
      return;
    }
  }
}

// ------------------------------------------------------------------------- the ending

function epilogue(): string[] {
  const out: string[] = [];
  const trevor = trevorEntity();
  if (trevorGone()) out.push("§lTrevor Hale§r is buried above Crash Beach, between Dan Okafor and Ruth Lindqvist. You carved the markers yourself.");
  else if (trevor?.isValid) out.push("§lTrevor Hale§r flew home with you, asleep before the island was out of sight. He kept the field radio.");
  else out.push("§lTrevor Hale§r was found on the beach by the second helicopter, sunburnt and furious. He kept the field radio.");
  const sv = surveyState();
  if (sv.findings) out.push("Your §lsurvey§r ran to two hundred and twelve pages. Varrow Island went back on the list of places nobody is allowed to go, with your readings attached.");
  else out.push(`Your §lsurvey§r was incomplete: ${sv.stations.length} of 6 stations, ${sv.samples.length} of 4 sample types. Federal Legacy Sites marked it \"inconclusive\" and never paid the invoice.`);
  if (sv.heart) out.push("Whatever lived under the crater lake is dead. Within a month the counters at the inner stations had fallen by a third.");
  else out.push("Something is still under the crater lake. On still nights, the fishing fleet says, you can hear it from the water.");
  const cult = cultEndingState();
  if (cult.hierophantDead) out.push("Without the Hierophant the Children of the Second Sun scattered into the mangroves. A Coast Guard landing party found eleven of them a year later. None would speak.");
  else if (cult.standing >= 60) out.push("The Children let you go. The Seer stood on the shore as you lifted off, her blind face turned to the sun.");
  else out.push("The Children of the Second Sun are still on Varrow. Nobody has been back.");
  return out;
}

let ended = false;

function ending(): void {
  const s = st();
  if (ended || s.phase !== "landed") return;
  ended = true;
  s.phase = "gone";
  const lines = epilogue();
  s.ending = lines.join("\n\n");
  save();
  aboard.clear();
  const land = LANDING();
  const players = world.getAllPlayers().filter((p) => p.isValid);
  const camAt = { x: land.x - 22, y: land.y + 9, z: land.z - 18 };
  // Trevor gets aboard too
  const t = trevorEntity();
  if (t?.isValid && !trevorGone()) {
    try {
      t.teleport({ x: land.x, y: land.y, z: land.z });
    } catch {
      /* ignore */
    }
  }
  for (const p of players) {
    try {
      p.camera.fade({ fadeColor: { red: 0, green: 0, blue: 0 }, fadeTime: { fadeInTime: 0.6, holdTime: 0.6, fadeOutTime: 1.2 } });
    } catch {
      /* ignore */
    }
  }
  system.runTimeout(() => safe("ending.cam", () => {
    for (const p of players) {
      if (!p.isValid) continue;
      enterScene(p, camAt);
      try {
        if (heli?.isValid) p.camera.setCamera("minecraft:free", { location: camAt, facingEntity: heli });
      } catch {
        /* ignore */
      }
    }
    const up = { x: land.x, y: land.y + 30, z: land.z + 20 };
    fly({ x: land.x, y: land.y + 1.5, z: land.z }, up, 160, 180, () => {
      fly(up, { x: land.x + 40, y: land.y + 60, z: land.z + 260 }, 260, 165, () => {
        try {
          heli?.remove();
        } catch {
          /* ignore */
        }
      });
    });
  }), 14);
  const titles: [number, string, string][] = [
    [80, "§fVarrow Island", "§7June 2026"],
    [200, "§7You were on the island", `§f${Math.max(1, world.getDay())} day(s)`],
  ];
  for (const [at, a, b] of titles) {
    system.runTimeout(() => safe("ending.title", () => {
      for (const p of players) {
        try {
          if (p.isValid) p.onScreenDisplay.setTitle(a, { subtitle: b, fadeInDuration: 20, stayDuration: 70, fadeOutDuration: 20 });
        } catch {
          /* ignore */
        }
      }
    }), at);
  }
  system.runTimeout(() => safe("ending.form", () => {
    for (const p of players) {
      if (!p.isValid) continue;
      leave(p, { x: land.x, y: land.y, z: land.z - 3 });
      unlock(p, "ending", true);
      void endingForm(p, lines);
    }
    ended = false;
  }), 440);
}

async function endingForm(p: Player, lines: string[]): Promise<void> {
  await formSession(p, async () => {
    const form = new ActionFormData()
      .title("§lVarrow Island")
      .body(lines.join("\n\n") + "\n\n§8THE HOLLOW 2.0. Thank you for playing.\n§8The island is still here, if you want to stay. The Research Log keeps this page under The Contract.");
    form.button("Stay on Varrow Island", "textures/ui/hollow/journal/place_tower");
    await showForm(p, form);
  });
  notice(p, "§7The helicopter is a speck in the south. The island is quiet. You're still here, somehow, and so is everything else.");
}

// ------------------------------------------------------------------------- public

export function towerSummary(): string {
  const s = st();
  return `tower: gen=${s.running} valves=${s.valves}/2 wire=${s.wire}/4 battery=${s.battery}/1 phase=${s.phase} waves=${s.waves}`;
}

export function endingText(): string {
  return st().ending;
}

/** Test hook: skip to the rescue at the dock. */
export function forceRescue(): string {
  const s = st();
  s.running = true;
  s.valves = NEED.valves;
  s.wire = NEED.wire;
  s.battery = NEED.battery;
  s.phase = "waiting";
  s.sawNight = true;
  save();
  startRescue();
  return "rescue inbound";
}

export function startTower(): void {
  onConsoleHook((p, key) => {
    if (key === "generator") generator(p);
    else if (key === "tower") void towerConsole(p);
  });
  every("tower.night", 900, () => isIsland() && lastNight(), 120);
  every("tower.heli", 10, () => isIsland() && holdLanded(), 5);
}
