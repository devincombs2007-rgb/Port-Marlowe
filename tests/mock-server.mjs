// Minimal stand-in for @minecraft/server, enough to exercise script logic in Node. NOT the real API.
const handlers = { scriptEvent: [], playerSpawn: [] };
const props = new Map();
export const messages = [];
export const played = [];
export class Player { constructor(name) { this.name = name; this.isValid = true; this.location = { x: 0, y: 64, z: 0 }; this.getViewDirection = () => ({ x: 0, y: 0, z: 1 }); this.playSound = (id, o) => played.push({ id, o }); this.onScreenDisplay = { setActionBar: (m) => messages.push(`[actionbar:${name}] ${m}`) }; } sendMessage(m) { messages.push(`[${this.name}] ${m}`); } }
export const world = {
  afterEvents: { playerSpawn: { subscribe: (f) => handlers.playerSpawn.push(f) } },
  getDynamicProperty: (k) => props.get(k),
  setDynamicProperty: (k, v) => (v === undefined ? props.delete(k) : props.set(k, v)),
  sendMessage: (m) => messages.push(`[world] ${m}`),
  getAllPlayers: () => [new Player("steve")],
};
export const system = {
  afterEvents: { scriptEventReceive: { subscribe: (f) => handlers.scriptEvent.push(f) } },
  runTimeout: (f) => f(),
};
export const __fire = {
  scriptEvent: (id, message = "", player) => handlers.scriptEvent.forEach((h) => h({ id, message, sourceEntity: player })),
  spawn: (player, initialSpawn = true) => handlers.playerSpawn.forEach((h) => h({ player, initialSpawn })),
};
