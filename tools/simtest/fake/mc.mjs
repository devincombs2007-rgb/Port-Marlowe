// A small, deterministic fake of the parts of @minecraft/server and @minecraft/server-ui that
// THE HOLLOW uses. It is NOT Minecraft: physics, pathfinding, AI goals and rendering are absent.
// It exists so the real bundled scripts can run headless: scheduling, events, persistence,
// state machines, caps, cooldowns, rewards and reload behaviour are exercised for real.
//
// World data (blocks, entities, dynamic properties, time) persists across "boots"; each boot gets
// a fresh System (tick counter restarts at 0, like a real server restart) and fresh event
// subscriptions, so reload bugs show up.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const BP = path.join(ROOT, "packs", "behavior");

// ----------------------------------------------------------------------------- pack data
const ENTITY_DEFS = new Map();
for (const f of fs.readdirSync(path.join(BP, "entities"))) {
  const d = JSON.parse(fs.readFileSync(path.join(BP, "entities", f), "utf8"))["minecraft:entity"];
  ENTITY_DEFS.set(d.description.identifier, d);
}
const BLOCK_DEFS = new Map();
for (const f of fs.readdirSync(path.join(BP, "blocks"))) {
  const d = JSON.parse(fs.readFileSync(path.join(BP, "blocks", f), "utf8"))["minecraft:block"];
  BLOCK_DEFS.set(d.description.identifier, d);
}
const ITEM_DEFS = new Map();
for (const f of fs.readdirSync(path.join(BP, "items"))) {
  const d = JSON.parse(fs.readFileSync(path.join(BP, "items", f), "utf8"))["minecraft:item"];
  ITEM_DEFS.set(d.description.identifier, d);
}

// music track lengths, from the built OGG files (sound_definitions -> file -> ffprobe duration)
const RP = path.join(ROOT, "packs", "resource");
const trackLen = new Map();
function trackTicks(track) {
  if (!trackLen.has(track)) {
    let ticks = 1200;
    try {
      const sd = JSON.parse(fs.readFileSync(path.join(RP, "sounds", "sound_definitions.json"), "utf8")).sound_definitions[track];
      const file = path.join(RP, `${sd.sounds[0].name ?? sd.sounds[0]}.ogg`);
      const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString();
      ticks = Math.round(parseFloat(out) * 20);
    } catch {
      /* unknown track: assume a minute */
    }
    trackLen.set(track, ticks);
  }
  return trackLen.get(track);
}

// ----------------------------------------------------------------------------- enums
export const GameMode = { Survival: "Survival", Creative: "Creative", Adventure: "Adventure", Spectator: "Spectator" };
export const Difficulty = { Peaceful: "Peaceful", Easy: "Easy", Normal: "Normal", Hard: "Hard" };
export const EquipmentSlot = { Mainhand: "Mainhand", Offhand: "Offhand", Head: "Head", Chest: "Chest", Legs: "Legs", Feet: "Feet" };
export const ItemLockMode = { inventory: "inventory", none: "none", slot: "slot" };
export const PlayerPermissionLevel = { Visitor: 0, Member: 1, Operator: 2, Custom: 3 };
export const StructureRotation = { None: "None", Rotate90: "Rotate90", Rotate180: "Rotate180", Rotate270: "Rotate270" };
const nameProxy = () => new Proxy({}, { get: (_, k) => String(k) });
export const EntityDamageCause = nameProxy();
export const WaypointTexture = nameProxy();
export const FormCancelationReason = { UserBusy: "UserBusy", UserClosed: "UserClosed" };

// ----------------------------------------------------------------------------- math
const v3 = (x, y, z) => ({ x, y, z });
const key = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// ----------------------------------------------------------------------------- events
class Signal {
  constructor(name, bus) {
    this.name = name;
    this.bus = bus;
    this.subs = [];
  }
  subscribe(cb, opts) {
    this.subs.push({ cb, opts });
    return cb;
  }
  unsubscribe(cb) {
    this.subs = this.subs.filter((s) => s.cb !== cb);
  }
  fire(ev) {
    for (const s of [...this.subs]) {
      if (!passes(this.name, ev, s.opts)) continue;
      this.bus.guard(this.name, () => s.cb(ev));
    }
  }
}

function passes(name, ev, opts) {
  if (!opts) return true;
  if (opts.entityTypes && ev.entity && !opts.entityTypes.includes(ev.entity.typeId)) return false;
  if (opts.namespaces && ev.id && !opts.namespaces.includes(ev.id.split(":")[0])) return false;
  if (opts.entityFilter?.type && ev.entity && ev.entity.typeId !== opts.entityFilter.type) return false;
  if (opts.itemFilter?.includeTypes && ev.items && !ev.items.some((i) => opts.itemFilter.includeTypes.includes(i.typeId))) return false;
  return true;
}

class Bus {
  constructor(sim) {
    this.sim = sim;
    this.signals = new Map();
  }
  get(name) {
    if (!this.signals.has(name)) this.signals.set(name, new Signal(name, this));
    return this.signals.get(name);
  }
  proxy() {
    return new Proxy({}, { get: (_, k) => this.get(String(k)) });
  }
  guard(label, fn) {
    try {
      fn();
    } catch (e) {
      this.sim.errors.push(`event ${label}: ${e?.stack ?? e}`);
    }
  }
}

// ----------------------------------------------------------------------------- items
export class ItemStack {
  constructor(typeId, amount = 1) {
    this.typeId = typeId.includes(":") ? typeId : `minecraft:${typeId}`;
    this.amount = amount;
    this.keepOnDeath = false;
    this.lockMode = "none";
    const def = ITEM_DEFS.get(this.typeId);
    const dur = def?.components?.["minecraft:durability"];
    this._dur = dur ? { damage: 0, maxDurability: dur.max_durability } : undefined;
  }
  getComponent(name) {
    if (name === "minecraft:durability") return this._dur;
    return undefined;
  }
  clone() {
    const c = new ItemStack(this.typeId, this.amount);
    c.keepOnDeath = this.keepOnDeath;
    c.lockMode = this.lockMode;
    if (this._dur) c._dur = { ...this._dur };
    return c;
  }
}

class Container {
  constructor(size) {
    this.size = size;
    this.slots = new Array(size).fill(undefined);
  }
  getItem(i) {
    return this.slots[i];
  }
  setItem(i, item) {
    this.slots[i] = item;
  }
  addItem(item) {
    for (let i = 0; i < this.size; i++) {
      const s = this.slots[i];
      if (s && s.typeId === item.typeId && !s._dur && s.amount + item.amount <= 64) {
        s.amount += item.amount;
        return undefined;
      }
    }
    for (let i = 0; i < this.size; i++) {
      if (!this.slots[i]) {
        this.slots[i] = item;
        return undefined;
      }
    }
    return item;
  }
  count(typeId) {
    return this.slots.reduce((n, s) => n + (s?.typeId === typeId ? s.amount : 0), 0);
  }
}

// ----------------------------------------------------------------------------- blocks
export class BlockPermutation {
  constructor(type, states = {}) {
    this.type = { id: type };
    this.states = { ...states };
  }
  static resolve(type, states = {}) {
    return new BlockPermutation(type, { ...defaultStates(type), ...states });
  }
  getState(name) {
    return this.states[name];
  }
  getAllStates() {
    return { ...this.states };
  }
  withState(name, value) {
    if (!(name in this.states)) throw new Error(`invalid state ${name} on ${this.type.id}`);
    return new BlockPermutation(this.type.id, { ...this.states, [name]: value });
  }
  matches(type) {
    return this.type.id === type;
  }
}

function defaultStates(type) {
  const def = BLOCK_DEFS.get(type);
  const out = {};
  for (const [k, v] of Object.entries(def?.description?.states ?? {})) {
    out[k] = Array.isArray(v) ? v[0] : v.values.min;
  }
  if (type.endsWith("_door")) out.open_bit = false;
  return out;
}

const PASSABLE = new Set(["minecraft:air", "minecraft:short_grass", "minecraft:tall_grass", "minecraft:fern", "minecraft:poppy", "minecraft:dandelion"]);
const LIQUID = new Set(["minecraft:water", "minecraft:flowing_water", "minecraft:lava", "minecraft:flowing_lava"]);
const CONTAINERS = new Set(["minecraft:chest", "minecraft:barrel", "minecraft:trapped_chest"]);

export class Block {
  constructor(dim, loc) {
    this.dimension = dim;
    this.location = v3(Math.floor(loc.x), Math.floor(loc.y), Math.floor(loc.z));
    this.x = this.location.x;
    this.y = this.location.y;
    this.z = this.location.z;
  }
  get _cell() {
    return this.dimension._cell(this.location);
  }
  get typeId() {
    return this._cell.perm.type.id;
  }
  get permutation() {
    return this._cell.perm;
  }
  get isAir() {
    return this.typeId === "minecraft:air";
  }
  get isLiquid() {
    return LIQUID.has(this.typeId);
  }
  get isValid() {
    return true;
  }
  setPermutation(p) {
    this.dimension._set(this.location, p);
  }
  setType(t) {
    this.dimension._set(this.location, BlockPermutation.resolve(t));
  }
  center() {
    return v3(this.x + 0.5, this.y + 0.5, this.z + 0.5);
  }
  getComponent(name) {
    const cell = this._cell;
    if (name === "minecraft:inventory" && CONTAINERS.has(cell.perm.type.id)) {
      cell.container ??= new Container(27);
      return { container: cell.container };
    }
    if (name === "minecraft:sign" && cell.perm.type.id.includes("sign")) {
      return { setText: (t) => (cell.text = t), getText: () => cell.text };
    }
    return undefined;
  }
}

export class BlockVolume {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
  *getBlockLocationIterator() {
    const [x0, x1] = [Math.min(this.from.x, this.to.x), Math.max(this.from.x, this.to.x)];
    const [y0, y1] = [Math.min(this.from.y, this.to.y), Math.max(this.from.y, this.to.y)];
    const [z0, z1] = [Math.min(this.from.z, this.to.z), Math.max(this.from.z, this.to.z)];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) yield v3(x, y, z);
  }
  contains(p) {
    const inR = (v, a, b) => v >= Math.min(a, b) && v <= Math.max(a, b);
    return inR(p.x, this.from.x, this.to.x) && inR(p.y, this.from.y, this.to.y) && inR(p.z, this.from.z, this.to.z);
  }
}

// ----------------------------------------------------------------------------- entities
let nextEntityId = 1;

export class Entity {
  constructor(sim, dim, typeId, loc) {
    this._sim = sim;
    this.id = String(-(nextEntityId++ * 4294967296 + 7));
    this.typeId = typeId;
    this.dimension = dim;
    this.location = { ...loc };
    this._valid = true;
    this._dp = new Map();
    this._props = {};
    this._groups = new Set();
    this._events = [];
    this._tags = new Set();
    this._effects = [];
    this._riders = [];
    this.ridingOn = undefined;
    const def = ENTITY_DEFS.get(typeId);
    this._def = def;
    for (const [k, v] of Object.entries(def?.description?.properties ?? {})) this._props[k] = v.default;
    const hp = def?.components?.["minecraft:health"];
    const max = hp ? (hp.max ?? hp.value) : 20;
    this._health = { currentValue: hp ? (hp.value ?? max) : max, effectiveMax: max };
    this._families = new Set(def?.components?.["minecraft:type_family"]?.family ?? []);
  }
  get isValid() {
    return this._valid;
  }
  getDynamicProperty(k) {
    return this._dp.get(k);
  }
  setDynamicProperty(k, v) {
    if (v === undefined) this._dp.delete(k);
    else this._dp.set(k, v);
  }
  getProperty(k) {
    return this._props[k];
  }
  setProperty(k, v) {
    this._props[k] = v;
  }
  triggerEvent(name) {
    if (!this._valid) throw new Error("entity invalid");
    this._events.push(name);
    const ev = this._def?.events?.[name];
    if (!ev) return;
    for (const g of ev.remove?.component_groups ?? []) this._groups.delete(g);
    for (const g of ev.add?.component_groups ?? []) {
      this._groups.add(g);
      const hp = this._def.component_groups?.[g]?.["minecraft:health"];
      if (hp) this._health = { currentValue: hp.value ?? hp.max, effectiveMax: hp.max ?? hp.value };
    }
    for (const [k, v] of Object.entries(ev.set_property ?? {})) {
      this._props[k] = typeof v === "string" && v.startsWith("query.") ? this._props[k] : v;
    }
  }
  getComponent(name) {
    if (name === "minecraft:health") {
      const h = this._health;
      return {
        get currentValue() { return h.currentValue; },
        get effectiveMax() { return h.effectiveMax; },
        setCurrentValue: (v) => { h.currentValue = v; },
      };
    }
    if (name === "minecraft:rideable") {
      return {
        addRider: (p) => {
          if (this._sim.refuseRiding) return false;
          p.ridingOn = this;
          this._riders.push(p);
          return true;
        },
        ejectRiders: () => {
          for (const r of this._riders) r.ridingOn = undefined;
          this._riders = [];
        },
      };
    }
    if (name === "minecraft:riding") return this.ridingOn ? { entityRidingOn: this.ridingOn } : undefined;
    return undefined;
  }
  matches(opts) {
    if (opts.families && !opts.families.every((f) => this._families.has(f))) return false;
    if (opts.type && opts.type !== this.typeId) return false;
    return true;
  }
  remove() {
    if (!this._valid) throw new Error("already removed");
    this._valid = false;
    this.dimension._entities.delete(this.id);
  }
  teleport(loc) {
    this.location = { ...loc };
  }
  addEffect(id, dur, opts) {
    this._effects.push({ id, dur, opts });
  }
  applyKnockback() {}
  addTag(t) {
    this._tags.add(t);
  }
  removeTag(t) {
    this._tags.delete(t);
  }
  hasTag(t) {
    return this._tags.has(t);
  }
  getHeadLocation() {
    return v3(this.location.x, this.location.y + 1.62, this.location.z);
  }
  getVelocity() {
    return this._velocity ?? v3(0, 0, 0);
  }
  getViewDirection() {
    return this._view ?? v3(0, 0, 1);
  }
  applyDamage(amount, opts = {}) {
    return this._sim.damage(this, amount, opts.damagingEntity, opts.cause ?? "entityAttack");
  }
}

class Screen {
  constructor(p) {
    this.p = p;
  }
  setActionBar(t) {
    this.p._log.push(`[actionbar] ${t}`);
  }
  setTitle(t, o) {
    this.p._log.push(`[title] ${t}${o?.subtitle ? " / " + o.subtitle : ""}`);
  }
}

export class Player extends Entity {
  constructor(sim, dim, name, loc) {
    super(sim, dim, "minecraft:player", loc);
    this.name = name;
    this._gm = GameMode.Survival;
    this._health = { currentValue: 20, effectiveMax: 20 };
    this._families = new Set(["player"]);
    this._inv = new Container(36);
    this.selectedSlotIndex = 0;
    this._offhand = undefined;
    this._view = v3(0, 0, 1);
    this.isSneaking = false;
    this.isSprinting = false;
    this.isJumping = false;
    this.isFalling = false;
    this.isOnGround = true;
    this.isInWater = false;
    this.isSleeping = false;
    this.playerPermissionLevel = PlayerPermissionLevel.Operator;
    this._log = [];
    this._sounds = [];
    this._fog = [];
    this._overrides = new Map();
    this._waypoints = [];
    this._xp = 0;
    this._ui = [];
    this.onScreenDisplay = new Screen(this);
    const self = this;
    this.fogSettings = {
      push(id, tag) { self._fog.push({ id, tag }); },
      remove(tag) { self._fog = self._fog.filter((f) => f.tag !== tag); },
    };
    this.camera = { fade() { self._log.push("[fade]"); } };
    this.locatorBar = {
      addWaypoint(w) { self._waypoints.push(w); },
      removeWaypoint(w) { self._waypoints = self._waypoints.filter((x) => x !== w); },
    };
  }
  getGameMode() {
    return this._gm;
  }
  setGameMode(m) {
    this._gm = m;
  }
  getViewDirection() {
    return this._view;
  }
  lookAt(target) {
    const h = this.getHeadLocation();
    const d = v3(target.x - h.x, target.y - h.y, target.z - h.z);
    const L = Math.hypot(d.x, d.y, d.z) || 1;
    this._view = v3(d.x / L, d.y / L, d.z / L);
  }
  getComponent(name) {
    if (name === "minecraft:inventory") return { container: this._inv };
    if (name === "minecraft:equippable") {
      return {
        getEquipment: (slot) => (slot === "Offhand" ? this._offhand : this._inv.getItem(this.selectedSlotIndex)),
        setEquipment: (slot, item) => {
          if (slot === "Offhand") this._offhand = item;
          else this._inv.setItem(this.selectedSlotIndex, item);
        },
      };
    }
    return super.getComponent(name);
  }
  hold(typeId, amount = 1) {
    this._inv.setItem(this.selectedSlotIndex, new ItemStack(typeId, amount));
  }
  playSound(id, o) {
    this._sounds.push(id);
  }
  playMusic(track, opts) {
    this._musicRaw = { track, ...opts, at: this._sim.absTime, len: trackTicks(track) };
    (this._musicLog ??= []).push(track);
  }
  /** What the client is playing now: one-shot tracks end after their real length. */
  get _music() {
    const m = this._musicRaw;
    if (!m) return undefined;
    if (!m.loop && this._sim.absTime - m.at > m.len) return undefined;
    return m;
  }
  set _music(v) {
    this._musicRaw = v;
  }
  queueMusic(track, opts) {
    this.playMusic(track, opts);
  }
  stopMusic() {
    this._musicRaw = undefined;
  }
  sendMessage(m) {
    this._log.push(`[chat] ${m}`);
  }
  spawnParticle() {}
  addExperience(n) {
    this._xp += n;
  }
  getSpawnPoint() {
    return this._spawnPoint;
  }
  setPropertyOverrideForEntity(e, k, v) {
    this._overrides.set(`${e.id}|${k}`, v);
  }
  removePropertyOverrideForEntity(e, k) {
    this._overrides.delete(`${e.id}|${k}`);
  }
  remove() {
    throw new Error("cannot remove a player");
  }
}

// ----------------------------------------------------------------------------- dimension
export class Dimension {
  constructor(sim, id) {
    this._sim = sim;
    this.id = id;
    this._blocks = new Map();
    this._entities = new Map();
    this.heightRange = { min: -64, max: 320 };
    this.groundY = 64; // terrain surface: blocks with y < groundY are solid by default
    this.biome = () => "minecraft:forest";
    this.loaded = () => true;
  }
  _terrain(y) {
    if (y < this.heightRange.min) return "minecraft:bedrock";
    if (y < this.groundY - 4) return "minecraft:stone";
    if (y < this.groundY - 1) return "minecraft:dirt";
    if (y < this.groundY) return "minecraft:grass_block";
    return "minecraft:air";
  }
  _cell(loc) {
    const k = key(loc.x, loc.y, loc.z);
    let c = this._blocks.get(k);
    if (!c) c = { perm: BlockPermutation.resolve(this._terrain(Math.floor(loc.y))), virtual: true };
    return c;
  }
  _set(loc, perm) {
    const k = key(loc.x, loc.y, loc.z);
    const old = this._blocks.get(k);
    this._blocks.set(k, { perm, container: old?.container, text: old?.text });
  }
  setBlock(loc, type, states) {
    this._set(loc, BlockPermutation.resolve(type, states));
    return new Block(this, loc);
  }
  getBlock(loc) {
    if (!this.loaded(loc)) throw new Error("LocationInUnloadedChunkError");
    return new Block(this, loc);
  }
  isChunkLoaded(loc) {
    return this.loaded(loc);
  }
  getBiome(loc) {
    return { id: this.biome(loc) };
  }
  _explicitIn(volume) {
    const out = [];
    for (const [k, c] of this._blocks) {
      const [x, y, z] = k.split(",").map(Number);
      if (volume.contains(v3(x, y, z))) out.push({ loc: v3(x, y, z), id: c.perm.type.id });
    }
    return out;
  }
  containsBlock(volume, filter) {
    return this.getBlocks(volume, filter).count > 0;
  }
  getBlocks(volume, filter) {
    const types = filter?.includeTypes;
    const hits = this._explicitIn(volume).filter((b) => !types || types.includes(b.id)).map((b) => b.loc);
    return { count: hits.length, *getBlockLocationIterator() { yield* hits; } };
  }
  getBlockFromRay(from, dir, opts = {}) {
    const max = opts.maxDistance ?? 64;
    for (let s = 0; s <= max; s += 0.1) {
      const p = v3(from.x + dir.x * s, from.y + dir.y * s, from.z + dir.z * s);
      const id = this._cell(p).perm.type.id;
      if (id === "minecraft:air") continue;
      if (!opts.includePassableBlocks && PASSABLE.has(id)) continue;
      if (!opts.includeLiquidBlocks && LIQUID.has(id)) continue;
      const b = new Block(this, p);
      return { block: b, faceLocation: v3(p.x - b.x, p.y - b.y, p.z - b.z) };
    }
    return undefined;
  }
  getTopmostBlock(loc) {
    let top = this.groundY - 1;
    for (const k of this._blocks.keys()) {
      const [x, y, z] = k.split(",").map(Number);
      if (x === Math.floor(loc.x) && z === Math.floor(loc.z) && y > top && this._blocks.get(k).perm.type.id !== "minecraft:air") top = y;
    }
    return new Block(this, v3(loc.x, top, loc.z));
  }
  getSkyLightLevel(loc) {
    const top = this.getTopmostBlock(loc);
    return top.y < Math.floor(loc.y) ? 15 : 0;
  }
  getLightLevel(loc) {
    return this.getSkyLightLevel(loc) > 0 ? 15 : 0;
  }
  getEntities(o = {}) {
    let list = [...this._entities.values()].filter((e) => e.isValid);
    if (o.type) list = list.filter((e) => e.typeId === o.type);
    if (o.families) list = list.filter((e) => o.families.every((f) => e._families.has(f)));
    if (o.excludeTypes) list = list.filter((e) => !o.excludeTypes.includes(e.typeId));
    if (o.location) {
      if (o.maxDistance !== undefined) list = list.filter((e) => dist(e.location, o.location) <= o.maxDistance);
      if (o.minDistance !== undefined) list = list.filter((e) => dist(e.location, o.location) >= o.minDistance);
      list.sort((a, b) => dist(a.location, o.location) - dist(b.location, o.location));
    }
    if (o.closest) list = list.slice(0, o.closest);
    return list;
  }
  getPlayers(o = {}) {
    return this.getEntities({ ...o, type: "minecraft:player" });
  }
  spawnEntity(typeId, loc, opts) {
    if (!this.loaded(loc)) throw new Error("LocationInUnloadedChunkError");
    if (!ENTITY_DEFS.has(typeId) && !typeId.startsWith("minecraft:")) throw new Error(`unknown entity ${typeId}`);
    const e = new Entity(this._sim, this, typeId, loc);
    this._entities.set(e.id, e);
    this._sim.spawnLog.push(typeId);
    if (e._def?.events?.["minecraft:entity_spawned"]) e.triggerEvent("minecraft:entity_spawned");
    return e;
  }
  spawnItem(stack, loc) {
    const e = new Entity(this._sim, this, "minecraft:item", loc);
    e.itemStack = stack;
    this._entities.set(e.id, e);
    return e;
  }
  spawnParticle() {}
  playSound(id, loc) {
    this._sim.worldSounds.push(id);
  }
  items(typeId) {
    return [...this._entities.values()].filter((e) => e.isValid && e.typeId === "minecraft:item" && (!typeId || e.itemStack.typeId === typeId));
  }
}

// ----------------------------------------------------------------------------- structures (LE NBT)
function readNbt(buf) {
  let o = 0;
  const u8 = () => buf.readUInt8(o++);
  const i16 = () => { const v = buf.readInt16LE(o); o += 2; return v; };
  const u16 = () => { const v = buf.readUInt16LE(o); o += 2; return v; };
  const i32 = () => { const v = buf.readInt32LE(o); o += 4; return v; };
  const str = () => { const n = u16(); const s = buf.toString("utf8", o, o + n); o += n; return s; };
  const payload = (t) => {
    switch (t) {
      case 1: { const v = buf.readInt8(o); o += 1; return v; }
      case 2: return i16();
      case 3: return i32();
      case 4: { const v = buf.readBigInt64LE(o); o += 8; return v; }
      case 5: { const v = buf.readFloatLE(o); o += 4; return v; }
      case 6: { const v = buf.readDoubleLE(o); o += 8; return v; }
      case 8: return str();
      case 9: { const et = u8(); const n = i32(); const a = []; for (let i = 0; i < n; i++) a.push(payload(et)); return a; }
      case 10: { const obj = {}; for (;;) { const tt = u8(); if (tt === 0) break; const name = str(); obj[name] = payload(tt); } return obj; }
      default: throw new Error(`nbt tag ${t}`);
    }
  };
  const t = u8();
  str();
  return payload(t);
}

const structureCache = new Map();
function loadStructure(id) {
  if (!structureCache.has(id)) {
    const [ns, name] = id.split(":");
    const file = path.join(BP, "structures", ns, `${name}.mcstructure`);
    structureCache.set(id, readNbt(fs.readFileSync(file)));
  }
  return structureCache.get(id);
}

// ----------------------------------------------------------------------------- loot
function loot(table) {
  const out = [];
  for (const pool of table.pools ?? []) {
    const rolls = typeof pool.rolls === "number" ? pool.rolls : pool.rolls.min;
    for (let r = 0; r < rolls; r++) {
      const total = pool.entries.reduce((n, e) => n + (e.weight ?? 1), 0);
      let pickW = Math.random() * total;
      for (const e of pool.entries) {
        pickW -= e.weight ?? 1;
        if (pickW > 0) continue;
        if (e.type === "item") {
          const c = e.functions?.find((f) => f.function === "set_count")?.count;
          out.push(new ItemStack(e.name, typeof c === "number" ? c : c ? c.min : 1));
        }
        break;
      }
    }
  }
  return out;
}

// ----------------------------------------------------------------------------- system + world
class System {
  constructor(sim) {
    this.sim = sim;
    this.currentTick = 0;
    this.jobs = new Map();
    this.nextId = 1;
    this.afterEvents = sim.bus.proxy();
    this.beforeEvents = sim.bus.proxy();
  }
  run(fn) {
    return this.runTimeout(fn, 1);
  }
  runTimeout(fn, ticks = 1) {
    const id = this.nextId++;
    this.jobs.set(id, { fn, at: this.currentTick + Math.max(1, ticks), every: 0 });
    return id;
  }
  runInterval(fn, ticks = 1) {
    const id = this.nextId++;
    this.jobs.set(id, { fn, at: this.currentTick + Math.max(1, ticks), every: Math.max(1, ticks) });
    return id;
  }
  clearRun(id) {
    this.jobs.delete(id);
  }
  tick() {
    this.currentTick++;
    for (const [id, j] of [...this.jobs]) {
      if (!this.jobs.has(id) || j.at > this.currentTick) continue;
      if (j.every) j.at += j.every;
      else this.jobs.delete(id);
      try {
        j.fn();
      } catch (e) {
        this.sim.errors.push(`job: ${e?.stack ?? e}`);
      }
    }
  }
}

class World {
  constructor(sim) {
    this.sim = sim;
    this.afterEvents = sim.bus.proxy();
    this.beforeEvents = sim.bus.proxy();
    const self = this;
    this.structureManager = {
      place(id, dim, loc, opts) { self.sim.placeStructure(id, dim, loc, opts); },
    };
  }
  getDynamicProperty(k) {
    return this.sim.dp.get(k);
  }
  setDynamicProperty(k, v) {
    if (v === undefined) this.sim.dp.delete(k);
    else this.sim.dp.set(k, v);
  }
  getDimension(id) {
    const full = id.includes(":") ? id : `minecraft:${id}`;
    const d = this.sim.dims.get(full);
    if (!d) throw new Error(`no dimension ${id}`);
    return d;
  }
  getAllPlayers() {
    return this.sim.players.filter((p) => p.online);
  }
  getPlayers() {
    return this.getAllPlayers();
  }
  getEntity(id) {
    for (const d of this.sim.dims.values()) {
      const e = d._entities.get(id);
      if (e && e.isValid && d.loaded(e.location)) return e;
    }
    return undefined;
  }
  getTimeOfDay() {
    return this.sim.absTime % 24000;
  }
  getDay() {
    return Math.floor(this.sim.absTime / 24000);
  }
  setTimeOfDay(t) {
    this.sim.absTime = this.getDay() * 24000 + (t % 24000);
  }
  getAbsoluteTime() {
    return this.sim.absTime;
  }
  getDifficulty() {
    return this.sim.difficulty;
  }
  getDefaultSpawnLocation() {
    return v3(0, 64, 0);
  }
  getLootTableManager() {
    return {
      getLootTable(p) {
        const f = path.join(BP, "loot_tables", `${p}.json`);
        return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : undefined;
      },
      generateLootFromTable(t) {
        return loot(t);
      },
    };
  }
}

// ----------------------------------------------------------------------------- server-ui
class FormBase {
  constructor(kind) {
    this.kind = kind;
    this.controls = [];
    this._title = "";
    this._body = "";
  }
  title(t) { this._title = t; return this; }
  body(t) { this._body = t; return this; }
  button(text, icon) { this.controls.push({ type: "button", text, icon }); return this; }
  slider(label, min, max, o) { this.controls.push({ type: "slider", label, min, max, o }); return this; }
  dropdown(label, opts, o) { this.controls.push({ type: "dropdown", label, opts, o }); return this; }
  toggle(label, o) { this.controls.push({ type: "toggle", label, o }); return this; }
  submitButton() { return this; }
  show(player) {
    const next = player._ui.shift();
    player._shownForms = (player._shownForms ?? []).concat([this]);
    if (!next) return Promise.resolve({ canceled: true, cancelationReason: "UserClosed" });
    return Promise.resolve(typeof next === "function" ? next(this) : next);
  }
}
export class ActionFormData extends FormBase {
  constructor() { super("action"); }
}
export class ModalFormData extends FormBase {
  constructor() { super("modal"); }
}

// ----------------------------------------------------------------------------- the simulation
export class Sim {
  constructor() {
    this.dp = new Map();
    this.dims = new Map();
    this.players = [];
    this.absTime = 1000; // morning of day 0
    this.difficulty = Difficulty.Normal;
    this.errors = [];
    this.warnings = [];
    this.spawnLog = [];
    this.worldSounds = [];
    this.refuseRiding = false;
    for (const id of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) this.dims.set(id, new Dimension(this, id));
    this.boot();
  }
  get overworld() {
    return this.dims.get("minecraft:overworld");
  }
  /** Start (or restart) the server: fresh scheduler and subscriptions, same world data. */
  boot() {
    this.bus = new Bus(this);
    this.system = new System(this);
    this.world = new World(this);
    this.components = { item: new Map(), block: new Map() };
  }
  /** Values exposed to the bundle as @minecraft/server. */
  exports() {
    return {
      world: this.world, system: this.system, ItemStack, BlockPermutation, BlockVolume, Block, Entity, Player, Dimension,
      GameMode, Difficulty, EquipmentSlot, ItemLockMode, PlayerPermissionLevel, StructureRotation, EntityDamageCause,
      WaypointTexture, MolangVariableMap: class { setFloat() {} },
      LocationWaypoint: class { constructor(loc) { this.location = loc; this.isValid = true; } },
      ActionFormData, ModalFormData, FormCancelationReason,
    };
  }
  fireStartup() {
    const comps = this.components;
    const ev = {
      itemComponentRegistry: { registerCustomComponent: (n, impl) => comps.item.set(n, impl) },
      blockComponentRegistry: { registerCustomComponent: (n, impl) => comps.block.set(n, impl) },
    };
    this.bus.get("startup").fire(ev);
  }
  fire(name, ev) {
    this.bus.get(name).fire(ev);
  }
  tick(n = 1) {
    for (let i = 0; i < n; i++) {
      this.absTime++;
      this.system.tick();
      for (const p of this.players) if (p.online) p._playTicks = (p._playTicks ?? 0) + 1;
    }
  }
  /** Advance to a given time of day (0..23999), moving forward. */
  tickUntilTime(t) {
    while (this.world.getTimeOfDay() !== t) this.tick();
  }
  addPlayer(name, loc = v3(0.5, 64, 0.5), { initial = true, playTicks = 0 } = {}) {
    let p = this.players.find((x) => x.name === name);
    if (!p) {
      p = new Player(this, this.overworld, name, loc);
      if (playTicks) p._dp.set("hollow:play_ticks", playTicks);
      this.players.push(p);
    }
    p.online = true;
    p._valid = true;
    p.location = { ...loc };
    p.dimension._entities.set(p.id, p);
    this.fire("playerJoin", { playerId: p.id, playerName: p.name });
    this.fire("playerSpawn", { player: p, initialSpawn: initial });
    return p;
  }
  removePlayer(p) {
    this.fire("playerLeave", { player: p, playerId: p.id, playerName: p.name });
    p.online = false;
    p._valid = false;
    p.dimension._entities.delete(p.id);
  }
  damage(target, amount, by, cause = "entityAttack") {
    if (!target.isValid) return false;
    if (target.getProperty("hollow:shielded") === true) {
      this.fire("dataDrivenEntityTrigger", { entity: target, eventId: "hollow:shield_hit" });
      return false;
    }
    const h = target._health;
    h.currentValue = Math.max(0, h.currentValue - amount);
    this.fire("entityHurt", { hurtEntity: target, damage: amount, damageSource: { cause, damagingEntity: by } });
    if (h.currentValue <= 0) {
      this.fire("entityDie", { deadEntity: target, damageSource: { cause, damagingEntity: by } });
      if (!(target instanceof Player)) {
        target._valid = false;
        target.dimension._entities.delete(target.id);
      }
    }
    return true;
  }
  placeStructure(id, dim, loc, opts = {}) {
    const s = loadStructure(id);
    const [sx, sy, sz] = s.size;
    const idx = s.structure.block_indices[0];
    const pal = s.structure.palette.default.block_palette;
    const rot = opts.rotation ?? "None";
    let i = 0;
    for (let x = 0; x < sx; x++) {
      for (let y = 0; y < sy; y++) {
        for (let z = 0; z < sz; z++, i++) {
          const pi = idx[i];
          if (pi < 0) continue;
          let rx = x, rz = z;
          if (rot === "Rotate90") [rx, rz] = [sz - 1 - z, x];
          else if (rot === "Rotate180") [rx, rz] = [sx - 1 - x, sz - 1 - z];
          else if (rot === "Rotate270") [rx, rz] = [z, sx - 1 - x];
          const b = pal[pi];
          dim._set(v3(loc.x + rx, loc.y + y, loc.z + rz), new BlockPermutation(b.name, { ...b.states }));
        }
      }
    }
  }
  /** Simulate a chunk (re)load of an entity: fires entityLoad like the engine does. */
  loadEntity(e) {
    this.fire("entityLoad", { entity: e });
  }
  /** Use a block's custom component the way the engine would. */
  interactBlock(p, b) {
    const def = BLOCK_DEFS.get(b.typeId);
    for (const name of Object.keys(def?.components ?? {})) {
      const c = this.components.block.get(name);
      c?.onPlayerInteract?.({ block: b, player: p, dimension: b.dimension });
    }
  }
  placeBlock(p, loc, type) {
    const b = this.overworld.setBlock(loc, type);
    const def = BLOCK_DEFS.get(type);
    for (const name of Object.keys(def?.components ?? {})) this.components.block.get(name)?.onPlace?.({ block: b, dimension: b.dimension });
    return b;
  }
  breakBlock(p, b) {
    const perm = b.permutation;
    const def = BLOCK_DEFS.get(b.typeId);
    b.dimension._set(b.location, BlockPermutation.resolve("minecraft:air"));
    for (const name of Object.keys(def?.components ?? {})) {
      this.components.block.get(name)?.onPlayerBreak?.({ block: b, player: p, dimension: b.dimension, brokenBlockPermutation: perm });
    }
  }
  useItem(p) {
    const item = p.getComponent("minecraft:equippable").getEquipment("Mainhand");
    const def = ITEM_DEFS.get(item?.typeId);
    for (const name of Object.keys(def?.components ?? {})) this.components.item.get(name)?.onUse?.({ source: p, itemStack: item });
  }
}
