import { LocationWaypoint, Player, Vector3, WaypointTexture, world } from "@minecraft/server";
import { CONSOLES, LOOT_CONTAINERS, POINTS, SITES, STATIONS } from "../content/island_layout";
import { ui } from "../core/audio";
import { lastNoticeAt } from "../core/fx";
import { DP, ENT, ITEM } from "../core/ids";
import { compass } from "../core/math";
import { safe, every } from "../core/scheduler";
import { getNum, readWorld, writeWorld } from "../core/store";
import { isDarkHours, isDusk, now } from "../core/time";
import { setLogHeader } from "../systems/journal";
import { campPos } from "./jobs";
import { isIsland } from "./mode";
import { sceneRunning } from "./scenes";
import { surveyState } from "./survey";
import { towerProgress } from "./tower";
import { setObjectiveVoice, trevorEntity, trevorGone } from "./trevor";
import { cinematicRunning } from "./cinematic";

// THE OBJECTIVE TRACKER
//
// One main story objective at a time, shared by everyone, worked out from the state of the world
// (never a checklist you can get stuck on):
//
//   1  Talk to Trevor                         until anyone has spoken to him
//   2  Reach the radio tower on the north peak until anyone gets there
//   3  Repair the transmitter                 fuel, tubes, wire, battery: points at the nearest thing still missing
//   4  Transmit                               once everything is fitted
//   5  Survive until dawn                     after the mayday
//   6  Get to the old dock                    when the helicopter comes
//   7  Free roam                              the survey and the Heart, if they're unfinished
//
// It shows as a gold marker on the locator bar, a "New objective" title when it changes, a line in
// chat, a reminder on the action bar now and then, the top of the Research Log, and in what Trevor
// says when you talk to him. Unlogged survey stations get a small white marker of their own.

interface Goal {
  key: string;
  title: string;
  detail: string;
  target?: Vector3;
  trevor: string;
}

interface ObjState {
  talked: boolean;
  reachedTower: boolean;
  last: string;
}

const DEFAULT: ObjState = { talked: false, reachedTower: false, last: "" };
let state: ObjState | undefined;

function st(): ObjState {
  if (!state) state = { ...DEFAULT, ...readWorld<ObjState>(DP.objective, DEFAULT) };
  return state;
}

function save(): void {
  writeWorld(DP.objective, st());
}

const loot = (key: string): Vector3 | undefined => LOOT_CONTAINERS.find((c) => c.loot === key);
const point = (key: string): Vector3 | undefined => (POINTS[key] ?? [])[0];
const xz = (v: { x: number; z: number }, y = 70): Vector3 => ({ x: v.x, y, z: v.z });

function carried(id: string): number {
  let n = 0;
  for (const p of world.getAllPlayers()) {
    const c = p.getComponent("minecraft:inventory")?.container;
    if (!c) continue;
    for (let i = 0; i < c.size; i++) {
      const it = c.getItem(i);
      if (it?.typeId === id) n += it.amount;
    }
  }
  return n;
}

function fuelCarried(): number {
  return carried("minecraft:coal") + carried("minecraft:charcoal") + carried("minecraft:coal_block") * 9;
}

/** The parts still missing, each with where to find it. */
function missingParts(): { what: string; where: string; at?: Vector3 }[] {
  const t = towerProgress();
  const out: { what: string; where: string; at?: Vector3 }[] = [];
  if (!t.running && fuelCarried() < 8) out.push({ what: "8 coal or charcoal", where: "the station hut just below the tower keeps some; or burn logs into charcoal", at: loot("station6_log") });
  if (t.valves + carried(ITEM.valve) < 2) {
    out.push({ what: "2 vacuum tubes", where: "Bunker 2's radio room. Its door is sealed: go in by the sinkhole to its west", at: point("bunker2_sinkhole") });
  }
  if (t.wire + carried(ITEM.wire) < 4) out.push({ what: "4 copper wire", where: "the general store in the mock town (or craft it from copper ingots)", at: loot("store_wire") });
  if (t.battery + carried(ITEM.battery) < 1) out.push({ what: "a battery bank", where: "the boathouse at the old dock", at: loot("dock_battery") });
  return out;
}

function nearest<T extends { at?: Vector3 }>(p: Player, list: T[]): T | undefined {
  let best: T | undefined;
  let d = Infinity;
  for (const x of list) {
    if (!x.at) continue;
    const k = Math.hypot(x.at.x - p.location.x, x.at.z - p.location.z);
    if (k < d) {
      d = k;
      best = x;
    }
  }
  return best ?? list[0];
}

export function goalFor(p?: Player): Goal {
  const s = st();
  const t = towerProgress();
  if (t.phase === "gone") {
    const sv = surveyState();
    const left: string[] = [];
    if (!sv.findings) left.push(`the survey (${sv.stations.length}/6 stations, ${sv.samples.length}/4 samples)`);
    if (!sv.heart) left.push("the thing under the crater lake");
    return {
      key: "free", title: "Explore Varrow Island",
      detail: left.length ? `Still unfinished: ${left.join(" and ")}.` : "There's nothing left you have to do here.",
      trevor: "We made it. Anything else we do here, we do because we want to.",
    };
  }
  if (t.phase === "inbound" || t.phase === "landed") {
    return {
      key: "dock", title: "Get to the old dock", detail: "The helicopter is setting down there. Stand next to it to leave.",
      target: point("dock_end") ?? xz(SITES.DOCK), trevor: "The dock! Run!",
    };
  }
  if (t.phase === "waiting") {
    return {
      key: "night", title: "Survive until dawn", detail: "The lamp is lit. Hold out until morning, then go to the old dock on the south-east shore.",
      target: point("dock_end") ?? xz(SITES.DOCK),
      trevor: isDarkHours() ? "Stay close, keep your back to something. Dawn's coming." : "First light. Then the dock. Let's not be late.",
    };
  }
  if (!s.talked && !trevorGone()) {
    const e = trevorEntity();
    return {
      key: "talk", title: "Talk to Trevor", detail: "Walk up to him and press Use. Search the crates by the wreck and the crew for supplies.",
      target: e?.isValid ? e.location : xz(SITES.CRASH, 65), trevor: "",
    };
  }
  if (!s.reachedTower) {
    const camp = campPos();
    const night = (isDusk() || isDarkHours()) && !camp;
    return {
      key: "tower", title: "Reach the radio tower on the north peak",
      detail: night
        ? "It's getting dark. Ask Trevor to Make camp (then Build a lean-to), or keep to the fires at the wreck until morning."
        : "The 1957 relay mast on the grey ridge to the north. Follow the gold marker.",
      target: xz(SITES.TOWER, 160),
      trevor: night ? "It's getting dark. We should make camp and go north in the morning." : "North peak. That mast. If anything on this island can still talk to the mainland, it's that.",
    };
  }
  if (!t.ready) {
    const parts = missingParts();
    if (!parts.length) {
      return {
        key: "install", title: t.running ? "Fit the parts at the tower" : "Fuel the generator at the tower",
        detail: t.running ? "Press the button in the hut at the foot of the mast." : "Press the button by the generator in the shed next to the hut (8 coal or charcoal).",
        target: t.running ? CONSOLES.tower : CONSOLES.generator,
        trevor: "We've got everything. Back to the tower.",
      };
    }
    const next = p ? nearest(p, parts) : parts[0];
    return {
      key: `parts:${parts.map((x) => x.what).join(",")}`, title: "Repair the transmitter",
      detail: `Still needed: ${parts.map((x) => x.what).join(", ")}. Nearest: ${next?.what} — ${next?.where}.`,
      target: next?.at,
      trevor: `We still need ${next?.what}. ${next?.where[0].toUpperCase()}${next?.where.slice(1)}.`,
    };
  }
  return {
    key: "transmit", title: "Transmit from the tower", detail: "Everything is fitted. Press the button in the hut and choose Transmit.",
    target: CONSOLES.tower, trevor: "That's all of it. Let's make the call.",
  };
}

// ------------------------------------------------------------------------- display

const marks = new Map<string, { main?: LocationWaypoint; side?: LocationWaypoint; at?: Vector3; sideAt?: Vector3 }>();

function place(p: Player, which: "main" | "side", at: Vector3 | undefined): void {
  const m = marks.get(p.id) ?? {};
  marks.set(p.id, m);
  const old = which === "main" ? m.main : m.side;
  const oldAt = which === "main" ? m.at : m.sideAt;
  if (at && oldAt && Math.hypot(at.x - oldAt.x, at.z - oldAt.z) < 4 && old?.isValid) return;
  try {
    if (old?.isValid) p.locatorBar.removeWaypoint(old);
  } catch {
    /* ignore */
  }
  if (which === "main") {
    m.main = undefined;
    m.at = undefined;
  } else {
    m.side = undefined;
    m.sideAt = undefined;
  }
  if (!at) return;
  try {
    const wp = new LocationWaypoint(
      { dimension: world.getDimension("overworld"), x: at.x + 0.5, y: at.y, z: at.z + 0.5 },
      { textureBoundsList: [{ lowerBound: 0, texture: which === "main" ? WaypointTexture.Circle : WaypointTexture.SmallSquare }] },
      which === "main" ? { red: 1, green: 0.72, blue: 0.15 } : { red: 0.85, green: 0.9, blue: 1 },
    );
    p.locatorBar.addWaypoint(wp);
    if (which === "main") {
      m.main = wp;
      m.at = at;
    } else {
      m.side = wp;
      m.sideAt = at;
    }
  } catch {
    /* locator bar off */
  }
}

function nearestStation(p: Player): Vector3 | undefined {
  const done = surveyState().stations;
  let best: Vector3 | undefined;
  let d = Infinity;
  for (const [k, at] of Object.entries(STATIONS)) {
    if (done.includes(k)) continue;
    const c = CONSOLES[k] ?? xz(at);
    const k2 = Math.hypot(c.x - p.location.x, c.z - p.location.z);
    if (k2 < d) {
      d = k2;
      best = c;
    }
  }
  return best;
}

function where(p: Player, at?: Vector3): string {
  if (!at) return "";
  const d = Math.round(Math.hypot(at.x - p.location.x, at.z - p.location.z));
  return d < 8 ? " §7(here)" : ` §7(${d} m ${compass(p.location, at)})`;
}

const lastReminder = new Map<string, number>();

function refresh(): void {
  if (!isIsland() || cinematicRunning()) return;
  const s = st();
  // milestones the tracker watches for itself
  if (!s.reachedTower && world.getAllPlayers().some((p) => Math.hypot(p.location.x - SITES.TOWER.x, p.location.z - SITES.TOWER.z) < 40)) {
    s.reachedTower = true;
    save();
  }
  const announce = goalFor();
  const changed = announce.key !== s.last;
  if (changed) {
    const first = s.last === "";
    const prev = s.last;
    s.last = announce.key;
    save();
    const partsOnly = announce.key.startsWith("parts:") && prev.startsWith("parts:");
    if (!first || announce.key !== "talk") {
      for (const p of world.getAllPlayers()) {
        if (getNum(p, DP.woke, 0) !== 1) continue;
        const g = goalFor(p);
        if (partsOnly) {
          p.sendMessage(`§6Transmitter: §7${g.detail}`);
          ui(p, "random.orb", 0.5, 1.2);
          continue;
        }
        p.sendMessage(`§6Objective: §f${g.title}\n§7${g.detail}`);
        if (!sceneRunning()) {
          try {
            p.onScreenDisplay.setTitle("§6New objective", { subtitle: `§f${g.title}`, fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 20 });
          } catch {
            /* ignore */
          }
        }
        ui(p, "random.levelup", 0.4, 1.6);
      }
    }
  }
  for (const p of world.getAllPlayers()) {
    if (!p.isValid || getNum(p, DP.woke, 0) !== 1 || p.dimension.id !== "minecraft:overworld") continue;
    const g = goalFor(p);
    place(p, "main", g.target);
    place(p, "side", g.key === "free" || surveyState().stations.length < 6 ? nearestStation(p) : undefined);
    // a quiet reminder on the action bar every minute or so, when nothing else is being said
    const last = lastReminder.get(p.id) ?? 0;
    if (now() - last > 1300 && now() - lastNoticeAt(p) > 200 && !sceneRunning()) {
      lastReminder.set(p.id, now());
      try {
        p.onScreenDisplay.setActionBar(`§6▶ ${g.title}${where(p, g.target)}`);
      } catch {
        /* ignore */
      }
    }
  }
}

/** For the Research Log's front page. */
export function objectiveHeader(p: Player): string {
  if (!isIsland()) return "";
  const g = goalFor(p);
  return `§6Objective: §f${g.title}${where(p, g.target)}\n§7${g.detail}\n\n`;
}

export function objectiveSummary(): string {
  const g = goalFor();
  return `objective: ${g.key}`;
}

export function forgetObjectives(playerId: string): void {
  marks.delete(playerId);
  lastReminder.delete(playerId);
}

export function startObjectives(): void {
  world.afterEvents.playerInteractWithEntity.subscribe((ev) => safe("obj.talk", () => {
    if (ev.target.typeId === ENT.trevor && !st().talked) {
      st().talked = true;
      save();
    }
  }));
  setLogHeader(objectiveHeader);
  setObjectiveVoice((p) => {
    if (!isIsland()) return undefined;
    const g = goalFor(p);
    return g.trevor || undefined;
  });
  every("objectives", 40, refresh, 11);
}
