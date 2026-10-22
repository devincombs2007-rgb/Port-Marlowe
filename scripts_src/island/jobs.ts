import { BlockPermutation, Dimension, Entity, ItemStack, Player, Vector3, system, world } from "@minecraft/server";
import { worldSound } from "../core/audio";
import { particle } from "../core/fx";
import { DP } from "../core/ids";
import { pick } from "../core/math";
import { safe } from "../core/scheduler";
import { readWorld, writeWorld } from "../core/store";
import { isDarkHours, isDay } from "../core/time";
import { findBlocks, groundNear } from "../core/world";
import { onFlareHook } from "./guns";
import { orderFollow, orderHold, say, setHome, trevorDown, trevorEntity } from "./trevor";

// TREVOR'S JOBS: one shared order queue, first come first served.
//
// Anyone can queue an order from his menu (or the field radio): he says whose order he is on and
// whose is next. Stance orders (follow, hold) take effect when they reach the front; jobs run
// until done, then he goes back to the last stance.
//
//   go there        walk to the spot and wait
//   make camp       a camp crate (trapped chest) where he stacks everything he brings back
//   chop trees      fells up to three whole trees near the spot and stacks the logs at camp
//   gather stone    mines exposed stone and gravel near the spot
//   gather food     picks berry bushes; if there are none, fishes from the nearest shore
//   build           a lean-to, a cabin, a watchtower or a stretch of palisade, from the camp stock
//   light a fire    a campfire at the spot
//   collect         picks up every dropped item around the spot
//   patrol camp     walks the camp edge after dark and calls out what he sees, until dawn
//
// Movement uses the game's own pathfinding: the script drops an invisible marker block
// (structure void) at the destination and his move_to_block goal walks him there. If he cannot
// get there in a sensible time he takes the long way round (a short teleport out of sight).

export type JobKind = "follow" | "hold" | "goto" | "camp" | "chop" | "stone" | "food" | "build" | "fire" | "collect" | "patrol";
export type Plan = "leanto" | "cabin" | "watchtower" | "wall";

interface Pos { x: number; y: number; z: number }
export interface Order {
  id: number;
  kind: JobKind;
  by: string;
  byName: string;
  at?: Pos;
  plan?: Plan;
  /** builder facing: 0 south, 1 west, 2 north, 3 east */
  facing?: number;
}

interface Active {
  order: Order;
  phase: string;
  /** absolute game time the phase began */
  since: number;
  n: number;
  target?: Pos;
  marker?: Pos;
  arrived?: boolean;
  queueBlocks?: [number, number, number, string, Record<string, string | number | boolean>?][];
}

interface JobState {
  queue: Order[];
  cur?: Active;
  camp?: Pos;
  carried: Record<string, number>;
  nextId: number;
  stats: { trees: number; stone: number; food: number; built: number };
  lastTopUp: number;
}

const DEFAULT: JobState = { queue: [], carried: {}, nextId: 1, stats: { trees: 0, stone: 0, food: 0, built: 0 }, lastTopUp: -1 };
let state: JobState | undefined;

function st(): JobState {
  if (!state) state = { ...DEFAULT, ...readWorld<JobState>(DP.jobs, DEFAULT) };
  return state;
}

function save(): void {
  writeWorld(DP.jobs, st());
}

const NAMES: Record<JobKind, string> = {
  follow: "follow", hold: "hold position", goto: "go there", camp: "make camp", chop: "chop trees",
  stone: "gather stone", food: "gather food", build: "build", fire: "light a fire", collect: "collect items",
  patrol: "patrol camp",
};
const PLAN_NAMES: Record<Plan, string> = { leanto: "a lean-to", cabin: "a cabin", watchtower: "a watchtower", wall: "a palisade wall" };

export function orderName(o: Order): string {
  return o.kind === "build" && o.plan ? `build ${PLAN_NAMES[o.plan]}` : NAMES[o.kind];
}

// ------------------------------------------------------------------------- the queue

export function enqueue(p: Player, kind: JobKind, at?: Pos, plan?: Plan, urgent = false): void {
  const s = st();
  if (s.queue.length >= 12) {
    say("Hang on, hang on. That's a dozen jobs already. Let me get through some of them.");
    return;
  }
  const facing = Math.round(((p.getRotation().y % 360) + 360) % 360 / 90) % 4;
  const o: Order = { id: s.nextId++, kind, by: p.id, byName: p.name, at, plan, facing };
  if (urgent) s.queue.unshift(o);
  else s.queue.push(o);
  save();
  if (urgent) return;
  const ahead = s.queue.length - 1 + (s.cur ? 1 : 0);
  if (ahead === 0) say(pick([`On it, ${p.name}.`, "Right away.", "Okay. Doing it now."]));
  else say(`Got it, ${p.name}: ${orderName(o)}. ${ahead} ${ahead === 1 ? "job" : "jobs"} ahead of it.`);
}

/** Cancel this player's queued orders (and the current one, if it is theirs). */
export function cancelMine(p: Player): number {
  const s = st();
  const before = s.queue.length;
  s.queue = s.queue.filter((o) => o.by !== p.id);
  let n = before - s.queue.length;
  if (s.cur && s.cur.order.by === p.id) {
    endJob(false);
    n++;
  }
  save();
  return n;
}

export function clearAll(): void {
  const s = st();
  s.queue = [];
  if (s.cur) endJob(false);
  save();
}

export function queueSummary(): string {
  const s = st();
  const lines: string[] = [];
  if (s.cur) lines.push(`§7Now: §f${orderName(s.cur.order)}§7 for ${s.cur.order.byName}`);
  if (s.queue.length) lines.push(`§7Next: ${s.queue.slice(0, 4).map((o) => `§f${orderName(o)}§7 (${o.byName})`).join(", ")}${s.queue.length > 4 ? "…" : ""}`);
  if (s.camp) {
    const stock = campStock();
    lines.push(`§7Camp crate: §f${stock.logs}§7 logs, §f${stock.stone}§7 stone, §f${stock.food}§7 food`);
  } else lines.push("§8No camp yet. Order \"Make camp here\".");
  return lines.join("\n");
}

export function busy(): boolean {
  return !!st().cur;
}

export function campPos(): Pos | undefined {
  return st().camp;
}

// ------------------------------------------------------------------------- moving him

function dim(): Dimension {
  return world.getDimension("overworld");
}

function dist(a: Vector3, b: Vector3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function clearMarker(a: Active): void {
  if (!a.marker) return;
  try {
    const b = dim().getBlock(a.marker);
    if (b?.typeId === "minecraft:structure_void") b.setType("minecraft:air");
  } catch {
    /* unloaded */
  }
  a.marker = undefined;
}

/** Start walking to a point (feet position). */
function travel(e: Entity, a: Active, to: Pos, phase: string): void {
  clearMarker(a);
  const g = groundNear(dim(), to.x, to.y, to.z, 6, 2) ?? to;
  const spot = { x: Math.floor(g.x), y: Math.floor(g.y), z: Math.floor(g.z) };
  a.target = spot;
  a.phase = phase;
  a.since = world.getAbsoluteTime();
  a.arrived = false;
  try {
    const b = dim().getBlock(spot);
    if (b && (b.isAir || b.typeId === "minecraft:short_grass" || b.typeId === "minecraft:tall_grass")) {
      b.setType("minecraft:structure_void");
      a.marker = spot;
    }
  } catch {
    /* unloaded */
  }
  // the game's pathfinder only searches 48 blocks: get him within range first
  const d = dist(e.location, spot);
  if (d > 44) {
    const k = 30 / d;
    const hop = groundNear(dim(), spot.x + (e.location.x - spot.x) * k, spot.y, spot.z + (e.location.z - spot.z) * k, 8);
    if (hop) e.teleport(hop);
  }
  e.triggerEvent("hollow:job_goto");
}

function arrived(e: Entity, a: Active): boolean {
  if (!a.target) return true;
  const d = Math.hypot(e.location.x - a.target.x - 0.5, e.location.z - a.target.z - 0.5);
  if (a.arrived || d < 2.4) return true;
  // stuck: take the long way round
  const elapsed = world.getAbsoluteTime() - a.since;
  if (elapsed > 100 + Math.min(600, d * 14)) {
    const g = groundNear(dim(), a.target.x, a.target.y, a.target.z, 6);
    if (g) e.teleport(g);
    return true;
  }
  return false;
}

function work(e: Entity): void {
  if (e.getProperty("hollow:state") !== "work") e.triggerEvent("hollow:job_work");
}

// ------------------------------------------------------------------------- camp and carrying

function carry(id: string, n: number): void {
  const c = st().carried;
  c[id] = (c[id] ?? 0) + n;
}

function carriedTotal(): number {
  return Object.values(st().carried).reduce((a, b) => a + b, 0);
}

function campContainer() {
  const s = st();
  if (!s.camp) return undefined;
  try {
    const b = dim().getBlock(s.camp);
    if (b?.typeId !== "minecraft:trapped_chest") return undefined;
    return b.getComponent("minecraft:inventory")?.container;
  } catch {
    return undefined;
  }
}

export function campStock(): { logs: number; stone: number; food: number } {
  const c = campContainer();
  const out = { logs: 0, stone: 0, food: 0 };
  if (!c) return out;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (!it) continue;
    if (it.typeId.endsWith("_log")) out.logs += it.amount;
    else if (it.typeId === "minecraft:cobblestone") out.stone += it.amount;
    else if (["minecraft:sweet_berries", "minecraft:cod", "minecraft:salmon", "minecraft:tropical_fish"].includes(it.typeId)) out.food += it.amount;
  }
  return out;
}

/** Take n of anything matching from the camp crate. Returns how many were taken. */
function takeFromCamp(match: (id: string) => boolean, n: number): number {
  const c = campContainer();
  if (!c) return 0;
  let got = 0;
  for (let i = 0; i < c.size && got < n; i++) {
    const it = c.getItem(i);
    if (!it || !match(it.typeId)) continue;
    const take = Math.min(it.amount, n - got);
    got += take;
    if (take >= it.amount) c.setItem(i, undefined);
    else {
      it.amount -= take;
      c.setItem(i, it);
    }
  }
  return got;
}

function deposit(): void {
  const s = st();
  const c = campContainer();
  for (const [id, n0] of Object.entries(s.carried)) {
    let n = n0;
    while (n > 0) {
      const amount = Math.min(64, n);
      n -= amount;
      const stack = new ItemStack(id, amount);
      const left = c ? c.addItem(stack) : stack;
      if (left) {
        const at = s.camp ?? trevorEntity()?.location;
        if (at) dim().spawnItem(left, { x: at.x + 0.5, y: at.y + 1, z: at.z + 0.5 });
      }
    }
  }
  s.carried = {};
}

function makeCamp(at: Pos): boolean {
  const s = st();
  try {
    const g = groundNear(dim(), at.x, at.y, at.z, 6, 2);
    if (!g) return false;
    const b = dim().getBlock(g);
    if (!b) return false;
    b.setPermutation(BlockPermutation.resolve("minecraft:trapped_chest", { "minecraft:cardinal_direction": "south" }));
    s.camp = { x: Math.floor(g.x), y: Math.floor(g.y), z: Math.floor(g.z) };
    setHome(s.camp);
    save();
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------- the work itself

const LOG = (id: string) => id.endsWith("_log") || id.endsWith("_wood") || id === "minecraft:mangrove_roots";
const LEAF = (id: string) => id.endsWith("_leaves") || id === "minecraft:vine";
const LOG_TYPES = ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "cherry", "pale_oak"].map((t) => `minecraft:${t}_log`);
const STONE_TYPES = ["minecraft:stone", "minecraft:cobblestone", "minecraft:andesite", "minecraft:diorite", "minecraft:granite",
  "minecraft:tuff", "minecraft:gravel", "minecraft:calcite", "minecraft:deepslate"];

function nearest(at: Vector3, list: Vector3[]): Vector3 | undefined {
  let best: Vector3 | undefined;
  let bd = 1e9;
  for (const v of list) {
    const d = dist(at, v);
    if (d < bd) {
      bd = d;
      best = v;
    }
  }
  return best;
}

/** Every log in the tree touching `start`, top first, and the leaves within three blocks of it. */
function treeBlocks(start: Vector3): Vector3[] {
  const d = dim();
  const seen = new Set<string>();
  const logs: Vector3[] = [];
  const stack = [start];
  while (stack.length && logs.length < 90) {
    const p = stack.pop()!;
    const k = `${p.x},${p.y},${p.z}`;
    if (seen.has(k)) continue;
    seen.add(k);
    let id: string | undefined;
    try {
      id = d.getBlock(p)?.typeId;
    } catch {
      id = undefined;
    }
    if (!id || !LOG(id)) continue;
    logs.push(p);
    for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      if (dx || dy || dz) stack.push({ x: p.x + dx, y: p.y + dy, z: p.z + dz });
    }
  }
  const leaves: Vector3[] = [];
  const lseen = new Set<string>();
  for (const l of logs) {
    for (const v of findBlocksBy(l, 3, LEAF)) {
      const k = `${v.x},${v.y},${v.z}`;
      if (!lseen.has(k)) {
        lseen.add(k);
        leaves.push(v);
      }
    }
  }
  logs.sort((a, b) => b.y - a.y);
  return [...leaves, ...logs];
}

function findBlocksBy(c: Vector3, r: number, test: (id: string) => boolean): Vector3[] {
  const out: Vector3[] = [];
  const d = dim();
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
    const p = { x: c.x + dx, y: c.y + dy, z: c.z + dz };
    try {
      const id = d.getBlock(p)?.typeId;
      if (id && test(id)) out.push(p);
    } catch {
      /* unloaded */
    }
  }
  return out;
}

function exposed(p: Vector3): boolean {
  try {
    return !!dim().getBlock({ x: p.x, y: p.y + 1, z: p.z })?.isAir;
  } catch {
    return false;
  }
}

/** Remove blocks a few per tick, crediting logs/stone to what he carries. */
function chew(e: Entity, a: Active, perTick: number): boolean {
  const list = a.queueBlocks as unknown as Vector3[] | undefined;
  if (!list || list.length === 0) return true;
  const d = dim();
  for (let i = 0; i < perTick && list.length; i++) {
    const p = list.shift()!;
    try {
      const b = d.getBlock(p);
      if (!b) continue;
      const id = b.typeId;
      if (LOG(id)) {
        carry(id === "minecraft:mangrove_roots" ? "minecraft:mangrove_roots" : id.replace("_wood", "_log"), 1);
        worldSound(d, "dig.wood", p, 0.8);
      } else if (LEAF(id)) {
        if (Math.random() < 0.04) carry("minecraft:stick", 1);
        if (Math.random() < 0.02 && id === "minecraft:oak_leaves") carry("minecraft:apple", 1);
      } else if (STONE_TYPES.includes(id)) {
        carry(id === "minecraft:gravel" ? "minecraft:gravel" : "minecraft:cobblestone", 1);
        worldSound(d, "dig.stone", p, 0.8);
      } else continue;
      particle(d, "minecraft:basic_smoke_particle", { x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 });
      b.setType("minecraft:air");
    } catch {
      /* unloaded */
    }
  }
  return list.length === 0;
}

// ------------------------------------------------------------------------- building

type BP = [number, number, number, string, Record<string, string | number | boolean>?];

function blueprint(plan: Plan): BP[] {
  const out: BP[] = [];
  const log = (x: number, y: number, z: number) => out.push([x, y, z, "minecraft:oak_log", { pillar_axis: "y" }]);
  const plank = (x: number, y: number, z: number) => out.push([x, y, z, "minecraft:oak_planks"]);
  if (plan === "leanto") {
    for (const x of [-2, 2]) {
      log(x, 0, -1); log(x, 1, -1); log(x, 2, -1);
      log(x, 0, 1);
    }
    for (let x = -2; x <= 2; x++) {
      out.push([x, 3, -1, "minecraft:oak_slab", { "minecraft:vertical_half": "bottom" }]);
      plank(x, 2, 0);
      out.push([x, 1, 1, "minecraft:oak_slab", { "minecraft:vertical_half": "top" }]);
    }
    out.push([0, 0, 2, "minecraft:campfire", { extinguished: false, "minecraft:cardinal_direction": "south" }]);
  } else if (plan === "cabin") {
    for (let y = 0; y < 4; y++) {
      for (let x = -3; x <= 3; x++) for (const z of [-3, 3]) {
        if (Math.abs(x) === 3 || y === 3) log(x, y, z);
        else if (!(z === 3 && x === 0 && y < 2) && !(y === 1 && Math.abs(x) === 2)) plank(x, y, z);
        else if (y === 1 && Math.abs(x) === 2) out.push([x, y, z, "minecraft:oak_fence"]);
      }
      for (let z = -2; z <= 2; z++) for (const x of [-3, 3]) {
        if (y === 3) log(x, y, z);
        else if (y === 1 && z === 0) out.push([x, y, z, "minecraft:oak_fence"]);
        else plank(x, y, z);
      }
    }
    out.push([0, 0, 3, "minecraft:wooden_door", { "minecraft:cardinal_direction": "south", door_hinge_bit: false, open_bit: false, upper_block_bit: false }]);
    out.push([0, 1, 3, "minecraft:wooden_door", { "minecraft:cardinal_direction": "south", door_hinge_bit: false, open_bit: false, upper_block_bit: true }]);
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
      const edge = Math.abs(x) === 4 || Math.abs(z) === 4;
      out.push([x, 4, z, edge ? "minecraft:oak_slab" : "minecraft:oak_planks", edge ? { "minecraft:vertical_half": "bottom" } : undefined]);
    }
    out.push([2, 3, 2, "minecraft:lantern", { hanging: true }]);
  } else if (plan === "watchtower") {
    for (const x of [-1, 1]) for (const z of [-1, 1]) for (let y = 0; y < 7; y++) log(x, y, z);
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
      if (!(x === 0 && z === 2)) plank(x, 7, z);
      if (Math.abs(x) === 2 || Math.abs(z) === 2) {
        if (!(x === 0 && z === 2)) out.push([x, 8, z, "minecraft:oak_fence"]);
      }
    }
    for (let y = 0; y < 8; y++) out.push([0, y, 2, "minecraft:ladder", { facing_direction: 3 }]);
    for (let y = 0; y < 7; y++) plank(0, y, 1);
    out.push([1, 8, 1, "minecraft:torch", { torch_facing_direction: "top" }]);
  } else {
    for (let x = -3; x <= 3; x++) {
      log(x, 0, 0); log(x, 1, 0); log(x, 2, 0);
      out.push([x, 3, 0, "minecraft:oak_fence"]);
    }
  }
  return out;
}

const COST: Record<Plan, { logs: number; stone: number }> = {
  leanto: { logs: 10, stone: 0 }, cabin: { logs: 40, stone: 0 }, watchtower: { logs: 30, stone: 0 }, wall: { logs: 8, stone: 0 },
};

function rotate(dx: number, dz: number, f: number): [number, number] {
  // facing 0 = south (+z), 1 = west, 2 = north, 3 = east; the blueprint's front (+z) faces the giver
  switch (f) {
    case 1: return [-dz, dx];
    case 2: return [-dx, -dz];
    case 3: return [dz, -dx];
    default: return [dx, dz];
  }
}

const SOFT = new Set(["minecraft:air", "minecraft:short_grass", "minecraft:tall_grass", "minecraft:fern", "minecraft:large_fern",
  "minecraft:deadbush", "minecraft:poppy", "minecraft:dandelion", "minecraft:oxeye_daisy", "minecraft:cornflower",
  "minecraft:azure_bluet", "minecraft:short_dry_grass", "minecraft:tall_dry_grass", "minecraft:leaf_litter", "minecraft:bush",
  "minecraft:structure_void", "minecraft:snow_layer"]);

function placeNext(a: Active, origin: Pos, facing: number): boolean {
  const list = a.queueBlocks;
  if (!list || list.length === 0) return true;
  const [dx, dy, dz, type, states] = list.shift()!;
  const [rx, rz] = rotate(dx, dz, (facing + 2) % 4);
  const p = { x: origin.x + rx, y: origin.y + dy, z: origin.z + rz };
  try {
    const b = dim().getBlock(p);
    if (b && SOFT.has(b.typeId)) {
      // posts and walls reach down to the ground
      if (dy === 0 && type.endsWith("_log")) {
        for (let k = 1; k <= 5; k++) {
          const below = dim().getBlock({ x: p.x, y: p.y - k, z: p.z });
          if (!below || !SOFT.has(below.typeId)) break;
          below.setPermutation(BlockPermutation.resolve(type, states));
        }
      }
      let perm: BlockPermutation;
      try {
        perm = BlockPermutation.resolve(type, states);
      } catch {
        perm = BlockPermutation.resolve(type);
      }
      b.setPermutation(perm);
      worldSound(dim(), "use.wood", p, 0.7);
    }
  } catch {
    /* unloaded */
  }
  return list.length === 0;
}

// ------------------------------------------------------------------------- the state machine

function begin(e: Entity, o: Order): void {
  const s = st();
  const a: Active = { order: o, phase: "start", since: world.getAbsoluteTime(), n: 0 };
  s.cur = a;
  save();
  const owner = world.getAllPlayers().find((p) => p.id === o.by);
  switch (o.kind) {
    case "follow":
      if (owner) orderFollow(owner);
      s.cur = undefined;
      break;
    case "hold":
      orderHold(owner);
      s.cur = undefined;
      break;
    case "camp":
    case "goto":
    case "chop":
    case "stone":
    case "food":
    case "fire":
    case "collect":
      if (o.at) travel(e, a, o.at, "to_site");
      else s.cur = undefined;
      if (o.kind === "chop") say(pick(["Right. Let's get some timber.", "Trees it is.", `Chopping, for ${o.byName}.`]), "job", 0);
      break;
    case "build": {
      const plan = o.plan ?? "leanto";
      const need = COST[plan];
      const stock = campStock();
      if (stock.logs < need.logs) {
        say(`I'll need ${need.logs} logs at camp for ${PLAN_NAMES[plan]}. We've got ${stock.logs}. Have me chop some first.`);
        s.cur = undefined;
        break;
      }
      if (s.camp) travel(e, a, s.camp, "to_camp_take");
      break;
    }
    case "patrol":
      if (!s.camp) {
        say("Patrol what? We don't have a camp yet.");
        s.cur = undefined;
      } else travel(e, a, s.camp, "patrol");
      break;
  }
  save();
}

function endJob(done: boolean): void {
  const s = st();
  const a = s.cur;
  if (!a) return;
  clearMarker(a);
  s.cur = undefined;
  save();
  const e = trevorEntity();
  if (e) e.triggerEvent("hollow:job_stop");
  if (done && s.queue.length === 0) {
    // back to the last stance: follow whoever gave the order if they're around
    const owner = world.getAllPlayers().find((p) => p.id === a.order.by);
    if (owner && a.order.kind !== "goto" && a.order.kind !== "camp") orderFollow(owner, true);
    else orderHold(undefined, true);
  }
}

function step(e: Entity): void {
  const s = st();
  const a = s.cur;
  if (!a) {
    const next = s.queue.shift();
    if (next) {
      save();
      begin(e, next);
    }
    return;
  }
  const o = a.order;
  const t = world.getAbsoluteTime();
  const phaseAge = t - a.since;
  const setPhase = (p: string) => {
    a.phase = p;
    a.since = t;
  };
  // walking somewhere
  if (a.phase.startsWith("to_") || a.phase === "patrol") {
    if (!arrived(e, a)) return;
    clearMarker(a);
  }
  switch (o.kind) {
    case "goto":
      say(pick(["Here.", "Made it. Waiting.", "I'm here. What now?"]), "arrive", 100);
      endJob(true);
      orderHold(undefined, true);
      return;
    case "camp":
      if (makeCamp(o.at ?? e.location)) say("Camp's here, then. Anything I bring back goes in the crate. And this is where I'll come home to.");
      else say("Can't set a crate down there. Pick somewhere flatter.");
      endJob(true);
      return;
    case "fire":
      try {
        const g = groundNear(dim(), e.location.x + 1, e.location.y, e.location.z, 4, 2);
        if (g) dim().getBlock(g)?.setPermutation(BlockPermutation.resolve("minecraft:campfire", { extinguished: false, "minecraft:cardinal_direction": "south" }));
        say(pick(["There. Warm, and the light keeps them honest.", "Fire's lit."]));
      } catch {
        /* ignore */
      }
      endJob(true);
      return;
    case "collect": {
      if (a.phase === "to_site") {
        let n = 0;
        for (const it of e.dimension.getEntities({ type: "minecraft:item", location: e.location, maxDistance: 12 })) {
          const stack = it.getComponent("minecraft:item")?.itemStack;
          if (!stack) continue;
          carry(stack.typeId, stack.amount);
          n += stack.amount;
          it.remove();
        }
        say(n ? `Picked up ${n} things. Taking them to camp.` : "Nothing here worth picking up.");
        if (n && s.camp) travel(e, a, s.camp, "to_camp");
        else endJob(true);
        return;
      }
      deposit();
      endJob(true);
      return;
    }
    case "chop":
    case "stone":
    case "food":
      return gatherStep(e, a, phaseAge, setPhase);
    case "build":
      return buildStep(e, a, phaseAge, setPhase);
    case "patrol":
      return patrolStep(e, a);
    default:
      endJob(true);
  }
}

function gatherStep(e: Entity, a: Active, phaseAge: number, setPhase: (p: string) => void): void {
  const s = st();
  const o = a.order;
  if (a.phase === "to_camp") {
    deposit();
    if (o.kind === "chop") s.stats.trees += a.n;
    else if (o.kind === "stone") s.stats.stone += a.n;
    else s.stats.food += a.n;
    save();
    const total = o.kind === "chop" ? s.stats.trees : 0;
    say(o.kind === "chop" ? (total >= 10 && total % 10 < a.n ? `That's ${total} trees I've cut on this island. My shoulders know it.` : "Logs are in the crate.")
      : o.kind === "stone" ? "Stone's in the crate." : "Food's in the crate.");
    endJob(true);
    return;
  }
  if (a.phase === "working") {
    work(e);
    if (o.kind === "food" && a.target && phaseAge < 160) return;       // fishing takes patience
    const done = chew(e, a, o.kind === "chop" ? 3 : 2);
    if (!done) return;
    a.n++;
    setPhase("search");
  }
  // find the next tree / stone / bush
  const limit = o.kind === "chop" ? 3 : 4;
  if (a.n >= limit || carriedTotal() >= 120) {
    if (s.camp) travel(e, a, s.camp, "to_camp");
    else {
      say("No camp to stack this at, so I'll leave it here. Have someone order \"Make camp\".");
      deposit();
      endJob(true);
    }
    return;
  }
  const here = e.location;
  if (o.kind === "chop") {
    const logs = findBlocks(e.dimension, here, LOG_TYPES, 18, 6, 18, 400).filter((p) => {
      try {
        const below = e.dimension.getBlock({ x: p.x, y: p.y - 1, z: p.z });
        return !!below && !LOG(below.typeId);
      } catch {
        return false;
      }
    });
    const base = nearest(here, logs);
    if (!base) return noMore(e, a, "No more trees close by.");
    if (dist(here, base) > 2.8 && a.phase !== "to_tree") {
      travel(e, a, { x: base.x + 1, y: base.y, z: base.z }, "to_tree");
      return;
    }
    a.queueBlocks = treeBlocks(base) as unknown as Active["queueBlocks"];
    setPhase("working");
    work(e);
  } else if (o.kind === "stone") {
    const stones = findBlocks(e.dimension, here, STONE_TYPES, 14, 5, 14, 400).filter(exposed);
    const at = nearest(here, stones);
    if (!at) return noMore(e, a, "There's no bare stone around here. Try a cliff or the riverbed.");
    if (dist(here, at) > 3.2 && a.phase !== "to_stone") {
      travel(e, a, { x: at.x, y: at.y + 1, z: at.z }, "to_stone");
      return;
    }
    a.queueBlocks = stones.filter((p) => dist(p, at) < 3).slice(0, 8) as unknown as Active["queueBlocks"];
    setPhase("working");
  } else {
    const bushes = findBlocks(e.dimension, here, ["minecraft:sweet_berry_bush"], 18, 5, 18, 100).filter((p) => {
      try {
        return Number(e.dimension.getBlock(p)?.permutation.getState("growth" as never) ?? 0) >= 2;
      } catch {
        return false;
      }
    });
    const bush = nearest(here, bushes);
    if (bush) {
      if (dist(here, bush) > 2.8 && a.phase !== "to_bush") {
        travel(e, a, { x: bush.x + 1, y: bush.y, z: bush.z }, "to_bush");
        return;
      }
      try {
        const b = e.dimension.getBlock(bush)!;
        b.setPermutation(b.permutation.withState("growth" as never, 1 as never));
        carry("minecraft:sweet_berries", 2 + Math.floor(Math.random() * 2));
      } catch {
        /* ignore */
      }
      a.queueBlocks = [];
      setPhase("working");
      a.target = undefined;
      return;
    }
    // no berries: fish from the nearest shore
    const water = findBlocks(e.dimension, here, ["minecraft:water"], 20, 4, 20, 300).filter(exposed);
    const shore = nearest(here, water);
    if (!shore) return noMore(e, a, "No berries and no water. We'll go hungry or go further.");
    if (dist(here, shore) > 3.5 && a.phase !== "to_water") {
      travel(e, a, { x: shore.x, y: shore.y + 1, z: shore.z }, "to_water");
      return;
    }
    carry(pick(["minecraft:cod", "minecraft:salmon", "minecraft:cod", "minecraft:tropical_fish"]), 1);
    a.queueBlocks = [];
    a.target = shore;
    setPhase("working");
    if (a.n === 0) say("No berries out here. I'll try for a fish.", "fish", 1200);
  }
}

function noMore(e: Entity, a: Active, msg: string): void {
  if (a.n === 0 && carriedTotal() === 0) {
    say(msg);
    endJob(true);
    return;
  }
  a.n = 99;
  gatherStep(e, a, 0, () => undefined);
}

function buildStep(e: Entity, a: Active, _phaseAge: number, setPhase: (p: string) => void): void {
  const o = a.order;
  const plan = o.plan ?? "leanto";
  if (a.phase === "to_camp_take") {
    const need = COST[plan];
    const got = takeFromCamp((id) => id.endsWith("_log"), need.logs);
    if (got < need.logs) {
      deposit();
      say("Someone's been in the crate. Not enough logs left.");
      endJob(true);
      return;
    }
    say(`Right. ${PLAN_NAMES[plan][0].toUpperCase()}${PLAN_NAMES[plan].slice(1)}, coming up.`);
    if (o.at) travel(e, a, o.at, "to_site");
    return;
  }
  if (a.phase === "to_site") {
    a.queueBlocks = blueprint(plan);
    setPhase("building");
    work(e);
    return;
  }
  if (a.phase === "building" && o.at) {
    const origin = { x: Math.floor(o.at.x), y: Math.floor(o.at.y), z: Math.floor(o.at.z) };
    let done = false;
    for (let i = 0; i < 2 && !done; i++) done = placeNext(a, origin, o.facing ?? 0);
    if (done) {
      st().stats.built++;
      save();
      say(pick([`Done. ${PLAN_NAMES[plan][0].toUpperCase()}${PLAN_NAMES[plan].slice(1)}. Not pretty, but it'll hold.`, "Finished. Somebody owes me a drink."]));
      endJob(true);
    }
  }
}

const PATROL_POINTS: [number, number][] = [[10, 0], [0, 10], [-10, 0], [0, -10]];

function patrolStep(e: Entity, a: Active): void {
  const s = st();
  if (!s.camp || isDay() || st().queue.length > 0) {
    say(isDay() ? "Sun's up. Patrol's over." : "Patrol's over.");
    endJob(true);
    return;
  }
  // look around at each corner
  try {
    const seen = e.dimension.getEntities({ families: ["monster"], location: e.location, maxDistance: 26, closest: 1 })[0];
    if (seen) {
      const dx = seen.location.x - e.location.x, dz = seen.location.z - e.location.z;
      const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? "east" : "west") : (dz > 0 ? "south" : "north");
      say(`§eMovement to the ${dir}!§r Something's out there.`, "patrol_seen", 600);
    }
  } catch {
    /* ignore */
  }
  a.n++;
  const [ox, oz] = PATROL_POINTS[a.n % PATROL_POINTS.length];
  travel(e, a, { x: s.camp.x + ox, y: s.camp.y, z: s.camp.z + oz }, "patrol");
}

// ------------------------------------------------------------------------- daily top-up

function topUp(): void {
  const s = st();
  const day = world.getDay();
  if (!s.camp || s.lastTopUp === day || isDarkHours()) return;
  const c = campContainer();
  if (!c) return;
  s.lastTopUp = day;
  c.addItem(new ItemStack("minecraft:sweet_berries", 3));
  if (day % 2 === 0) c.addItem(new ItemStack("minecraft:cooked_cod", 1));
  save();
}

// ------------------------------------------------------------------------- public

export function jobTick(): void {
  const e = trevorEntity();
  if (!e || trevorDown()) return;
  safe("jobs.step", () => step(e));
  if (!st().cur) safe("jobs.topup", topUp);
}

export function forgetJobsFor(_playerId: string): void {
  /* orders survive their giver leaving; the queue says who asked */
}

export function startJobs(): void {
  world.afterEvents.dataDrivenEntityTrigger.subscribe((ev) => safe("jobs.arrived", () => {
    if (ev.eventId !== "hollow:arrived") return;
    const a = st().cur;
    if (a) a.arrived = true;
  }), { entityTypes: ["hollow:trevor"] });
  system.runInterval(() => safe("jobs", jobTick), 4);
  // a flare is a call for help: he drops what he's doing (after the current job) and comes
  onFlareHook((p, at) => {
    const e = trevorEntity();
    if (!e?.isValid || trevorDown() || Math.hypot(e.location.x - at.x, e.location.z - at.z) > 220) return;
    enqueue(p, "goto", { x: Math.floor(at.x), y: Math.floor(at.y), z: Math.floor(at.z) }, undefined, true);
    say(pick(["I see your flare! Coming!", "Flare's up. On my way.", "Hold on, I'm coming to the flare!"]), "flare", 200);
  });
}

/** Where the player is looking (the block they aim at within 48), or their feet. */
export function lookTarget(p: Player): Pos {
  try {
    const hit = p.getBlockFromViewDirection({ maxDistance: 48 });
    if (hit) return { x: hit.block.location.x, y: hit.block.location.y + 1, z: hit.block.location.z };
  } catch {
    /* ignore */
  }
  return { x: Math.floor(p.location.x), y: Math.floor(p.location.y), z: Math.floor(p.location.z) };
}

export function jobSummary(): string {
  const s = st();
  return `jobs: cur=${s.cur ? orderName(s.cur.order) + "/" + s.cur.phase : "-"} queue=${s.queue.length} camp=${s.camp ? `${s.camp.x},${s.camp.y},${s.camp.z}` : "-"} trees=${s.stats.trees} built=${s.stats.built}`;
}
