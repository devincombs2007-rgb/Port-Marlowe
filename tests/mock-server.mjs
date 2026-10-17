// Stand-in for @minecraft/server, rich enough to run the director and Lurker adapters in Node. NOT the real API:
// it only models what DREAD calls. Behavioural differences from the real game are possible and untested.
export const GameMode = { Survival: "Survival", Creative: "Creative", Adventure: "Adventure", Spectator: "Spectator" };
export const Difficulty = { Peaceful: "Peaceful", Easy: "Easy", Normal: "Normal", Hard: "Hard" };
export const EntityComponentTypes = { Health: "minecraft:health", Inventory: "minecraft:inventory", Equippable: "minecraft:equippable" };
export const EquipmentSlot = { Offhand: "Offhand", Mainhand: "Mainhand" };

export const messages = [];
export const played = [];
export const log = { events: [], particles: [], spawned: [], removed: [] };
export const terrain = { underground: false, extraBlocks: new Map(), opaqueWall: null };

function emitter() {
  const subs = [];
  return { subscribe: (f) => (subs.push(f), f), unsubscribe: () => {}, fire: (e) => subs.forEach((f) => f(e)) };
}
const ev = {
  playerSpawn: emitter(), playerLeave: emitter(), entityHurt: emitter(), entityDie: emitter(), worldLoad: emitter(),
};

let nextId = 1;
export class Entity {
  constructor(typeId, location, dimension) {
    this.id = `e${nextId++}`; this.typeId = typeId; this.location = { ...location }; this.dimension = dimension;
    this.tags = new Set(); this.props = { "dread:action": "none", "dread:state": "observe" }; this.isValid = true;
    this.isInWater = false; this.isSleeping = false; this.hp = { currentValue: 36, effectiveMax: 36 };
  }
  getComponent(t) { return t === EntityComponentTypes.Health ? this.hp : undefined; }
  addTag(t) { this.tags.add(t); return true; } hasTag(t) { return this.tags.has(t); }
  triggerEvent(name) { log.events.push({ id: this.id, name }); if (name === "dread:clear_action") this.props["dread:action"] = "none"; }
  setProperty(k, v) { this.props[k] = v; } getProperty(k) { return this.props[k]; }
  teleport(loc) { this.location = { ...loc }; }
  remove() { this.isValid = false; log.removed.push(this.id); this.dimension.entities = this.dimension.entities.filter((e) => e !== this); }
  getViewDirection() { return this.view ?? { x: 0, y: 0, z: 1 }; }
  getHeadLocation() { return { x: this.location.x, y: this.location.y + 1.62, z: this.location.z }; }
}
export class Player extends Entity {
  constructor(name, loc, dim) {
    super("minecraft:player", loc, dim); this.name = name; this.mode = GameMode.Survival; this.hp = { currentValue: 20, effectiveMax: 20 };
    this.selectedSlotIndex = 0; this.onScreenDisplay = { setActionBar: (m) => messages.push(`[actionbar:${name}] ${m}`) };
    this.inventory = [];
  }
  getGameMode() { return this.mode; }
  sendMessage(m) { messages.push(`[${this.name}] ${m}`); }
  playSound(id, o) { played.push({ id, o, player: this.name }); }
  getComponent(t) {
    if (t === EntityComponentTypes.Inventory) return { container: { getItem: (i) => this.inventory[i] } };
    if (t === EntityComponentTypes.Equippable) return { getEquipment: () => undefined };
    return super.getComponent(t);
  }
}
export class Block {
  constructor(typeId, x, y, z) { this.typeId = typeId; this.location = { x, y, z }; this.isAir = typeId === "minecraft:air"; this.isLiquid = false; }
}
export class Dimension {
  constructor(id) { this.id = id; this.entities = []; }
  _type(x, y, z) {
    const k = `${x},${y},${z}`;
    if (terrain.extraBlocks.has(k)) return terrain.extraBlocks.get(k);
    if (terrain.opaqueWall && terrain.opaqueWall(x, y, z)) return "minecraft:stone";
    if (y < 63) return "minecraft:stone";
    if (y === 63) return "minecraft:grass_block";
    if (terrain.underground && y === 80) return "minecraft:stone";
    return "minecraft:air";
  }
  getBlock(l) { return new Block(this._type(Math.floor(l.x), Math.floor(l.y), Math.floor(l.z)), Math.floor(l.x), Math.floor(l.y), Math.floor(l.z)); }
  getTopmostBlock(l) { const y = terrain.underground ? 80 : 63; return this.getBlock({ x: l.x, y, z: l.z }); }
  getBlockFromRay(origin, dir, o) {
    const max = o?.maxDistance ?? 16;
    for (let d = 1; d < max; d += 1) {
      const p = { x: origin.x + dir.x * d, y: origin.y + dir.y * d, z: origin.z + dir.z * d };
      const b = this.getBlock(p);
      if (!b.isAir && b.typeId !== "minecraft:short_grass") return { block: b };
    }
    return undefined;
  }
  spawnEntity(type, loc) { const e = new Entity(type, loc, this); this.entities.push(e); log.spawned.push(e); return e; }
  spawnParticle(name, loc) { log.particles.push({ name, loc }); }
  getEntities(o) { return this.entities.filter((e) => !o?.type || e.typeId === o.type); }
}
const dims = { overworld: new Dimension("minecraft:overworld"), nether: new Dimension("minecraft:nether"), the_end: new Dimension("minecraft:the_end") };
const players = [];
const props = new Map();
let absTicks = 0;
export const sim = {
  timeOfDay: 18000, difficulty: Difficulty.Normal,
  addPlayer(name, loc = { x: 0, y: 64, z: 0 }) { const p = new Player(name, loc, dims.overworld); players.push(p); dims.overworld.entities.push(p); return p; },
  players, dims, props,
};
export const world = {
  afterEvents: ev, beforeEvents: {},
  getAllPlayers: () => players.filter((p) => p.isValid),
  getDimension: (id) => dims[id.replace("minecraft:", "")] ?? dims.overworld,
  getAbsoluteTime: () => absTicks, getTimeOfDay: () => sim.timeOfDay, getDifficulty: () => sim.difficulty,
  getDynamicProperty: (k) => props.get(k),
  setDynamicProperty: (k, v) => (v === undefined ? props.delete(k) : props.set(k, v)),
  sendMessage: (m) => messages.push(`[world] ${m}`),
};
const timers = [];
export const system = {
  currentTick: 0,
  afterEvents: { scriptEventReceive: emitter() },
  runInterval: (f, n) => { timers.push({ f, n, at: n, repeat: true }); },
  runTimeout: (f, n) => { timers.push({ f, n, at: system.currentTick + n, repeat: false }); },
};
// fix interval scheduling to use absolute ticks
system.runInterval = (f, n) => { timers.push({ f, n, at: system.currentTick + n, repeat: true }); };
export const __fire = {
  scriptEvent: (id, message = "", sourceEntity) => system.afterEvents.scriptEventReceive.fire({ id, message, sourceEntity }),
  spawn: (player, initialSpawn = true) => ev.playerSpawn.fire({ player, initialSpawn }),
  leave: (player) => ev.playerLeave.fire({ playerId: player.id, playerName: player.name }),
  hurt: (hurtEntity, damagingEntity) => ev.entityHurt.fire({ hurtEntity, damage: 2, damageSource: { damagingEntity, cause: "entityAttack" } }),
  die: (deadEntity) => ev.entityDie.fire({ deadEntity, damageSource: {} }),
};
/** Advance the fake clock, running timers in order. */
export function tick(n = 1, perTick) {
  for (let i = 0; i < n; i++) {
    system.currentTick++; absTicks++;
    perTick?.(system.currentTick);
    for (const t of [...timers]) {
      if (t.at <= system.currentTick) {
        t.f();
        if (t.repeat) t.at += t.n; else timers.splice(timers.indexOf(t), 1);
      }
    }
  }
}
