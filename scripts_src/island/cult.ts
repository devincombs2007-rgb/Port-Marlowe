import { BlockPermutation, Entity, ItemStack, Player, Vector3, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { LOOT_CONTAINERS, POINTS, SITES } from "../content/island_layout";
import { worldSound } from "../core/audio";
import { settings } from "../core/config";
import { notice, particle } from "../core/fx";
import { formSession, showForm } from "../core/forms";
import { DP, ENT, ITEM, SND } from "../core/ids";
import { pick } from "../core/math";
import { every, safe } from "../core/scheduler";
import { readWorld, writeWorld } from "../core/store";
import { hollowNight, isDarkHours, isDay } from "../core/time";
import { groundNear, heldItem } from "../core/world";
import { giveOrDrop } from "../items/components";
import { unlock } from "../systems/journal";
import { emitNoise } from "../systems/noise";
import { GUNS, onGunshotHook, onShrineKeyHook } from "./guns";
import { isIsland } from "./mode";
import { playScene } from "./scenes";
import { say } from "./trevor";

// THE CHILDREN OF THE SECOND SUN
//
// Descendants of the 1960s settlers. They live in Sunfall (north-west) and a stilt camp in the
// mangroves, keep gardens and flocks, pray to the flash, and shoot outsiders with the rifles their
// parents brought. The island's creatures leave them alone, and they leave the creatures alone.
//
//   Zealots     hostile riflemen: guard the villages, and from the second night patrol in twos and
//               threes after dark. They melt back into the trees at dawn.
//   Faithful    neutral villagers: tend gardens, flee from anyone with a weapon drawn, and call the
//               Zealots when attacked. With good standing they trade copper wire for medicine.
//   The Seer    rare, at Sunfall: talks to you if you come unarmed; lore, trades, and (with standing)
//               the back way into Bunker 2.
//   The Hierophant  their leader, at the shrine. Neutral until attacked; then a boss. Kill him and
//               the Children will never forgive you.
//
// STANDING (-100..100, shared by the whole group): killing Faithful -25, the Seer -40, a Zealot -3,
// gunfire near a village -2; gifts of food to the Faithful +4, offerings left in the shrine barrel
// +1..+15, every quiet day +2. Low standing means more and bolder patrols; at 20+ the Faithful
// trade; at 40+ the Seer shows you the way into Bunker 2. Standing never makes the Zealots friendly.

interface CultState {
  standing: number;
  hierophantDead: boolean;
  villageDay: Record<string, number>;
  seerDay: number;
  violentDay: number;
  quietDay: number;
  gifts: Record<string, number>;
  offeredDay: number;
  offeredToday: number;
  vaultOpen: boolean;
  wrathSummoned: boolean;
}

const DEFAULT: CultState = {
  standing: 0, hierophantDead: false, villageDay: {}, seerDay: -1, violentDay: -1, quietDay: -1, gifts: {},
  offeredDay: -1, offeredToday: 0, vaultOpen: false, wrathSummoned: false,
};
let state: CultState | undefined;

function st(): CultState {
  if (!state) state = { ...DEFAULT, ...readWorld<CultState>(DP.cult, DEFAULT) };
  return state;
}

function save(): void {
  writeWorld(DP.cult, st());
}

export function standing(): number {
  return st().standing;
}

export function changeStanding(delta: number, why?: string): void {
  const s = st();
  const before = s.standing;
  s.standing = Math.max(-100, Math.min(100, s.standing + delta));
  if (delta < 0) s.violentDay = world.getDay();
  save();
  if (why && Math.abs(s.standing - before) >= 1) {
    for (const p of world.getAllPlayers()) {
      if (p.isValid) notice(p, `${delta > 0 ? "§a" : "§c"}${why} §8(the Children ${standingWord()})`);
    }
  }
}

export function standingWord(): string {
  const v = st().standing;
  return v <= -60 ? "want you dead" : v <= -25 ? "hate you" : v < 10 ? "distrust you" : v < 40 ? "tolerate you" : v < 70 ? "accept you" : "call you kin";
}

const CULT = [ENT.zealot, ENT.faithful, ENT.seer, ENT.hierophant];
const NAMES = ["Brother Amos", "Sister Ruth", "Brother Eli", "Sister Hope", "Brother Jory", "Sister Mae", "Brother Cal",
  "Sister June", "Brother Walt", "Sister Dot", "Brother Abel", "Sister Nell", "Brother Hiram", "Sister Clare"];

// ------------------------------------------------------------------------- the villages

interface Village { key: string; center: { x: number; z: number }; homes: Vector3[]; posts: Vector3[]; faithful: number; zealots: number }

function villages(): Village[] {
  const homes = POINTS.cult_home ?? [];
  const posts = POINTS.cult_post ?? [];
  const near = (c: { x: number; z: number }, r: number) => (v: Vector3) => Math.hypot(v.x - c.x, v.z - c.z) < r;
  const sun = SITES.SUNFALL, mg = SITES.MANGROVES;
  return [
    { key: "sunfall", center: sun, homes: homes.filter(near(sun, 40)), posts: posts.filter(near(sun, 40)), faithful: 6, zealots: 3 },
    { key: "mangroves", center: mg, homes: homes.filter(near(mg, 40)), posts: posts.filter(near(mg, 40)), faithful: 2, zealots: 2 },
  ];
}

function spawnAt(type: string, at: Vector3, resident = true): Entity | undefined {
  try {
    const e = world.getDimension("overworld").spawnEntity(type, { x: at.x + 0.5, y: at.y, z: at.z + 0.5 });
    if (type === ENT.zealot && resident) e.triggerEvent("hollow:resident");
    if (type === ENT.faithful || type === ENT.seer) e.nameTag = pick(NAMES);
    if (type === ENT.hierophant) e.nameTag = "The Hierophant";
    return e;
  } catch {
    return undefined;
  }
}

/** Once a day, when someone is near and the village is loaded, bring it back up to strength. */
function census(): void {
  if (!isIsland() || !settings().cult) return;
  const s = st();
  const day = world.getDay();
  const dim = world.getDimension("overworld");
  for (const v of villages()) {
    if (s.villageDay[v.key] === day) continue;
    const c = { x: v.center.x, y: 70, z: v.center.z };
    const someone = world.getAllPlayers().some((p) => p.dimension.id === dim.id && Math.hypot(p.location.x - c.x, p.location.z - c.z) < 96);
    if (!someone) continue;
    try {
      if (!dim.isChunkLoaded(c)) continue;
    } catch {
      continue;
    }
    s.villageDay[v.key] = day;
    const here = dim.getEntities({ location: c, maxDistance: 48 }).filter((e) => CULT.includes(e.typeId as never));
    const count = (t: string) => here.filter((e) => e.typeId === t).length;
    const hostile = s.hierophantDead || s.standing <= -60;
    for (let i = count(ENT.faithful); i < (hostile ? Math.ceil(v.faithful / 2) : v.faithful); i++) {
      const h = v.homes[i % Math.max(1, v.homes.length)];
      if (h) spawnAt(ENT.faithful, h);
    }
    for (let i = count(ENT.zealot); i < v.zealots + (hostile ? 2 : 0); i++) {
      const p = v.posts[i % Math.max(1, v.posts.length)] ?? v.homes[0];
      if (p) spawnAt(ENT.zealot, p);
    }
    if (v.key === "sunfall") {
      const shrine = (POINTS.hierophant ?? [])[0];
      if (shrine && !s.hierophantDead && count(ENT.hierophant) === 0) spawnAt(ENT.hierophant, shrine);
      if (count(ENT.seer) === 0 && s.standing > -40 && Math.random() < 0.65) {
        const h = (POINTS.shrine ?? [])[0];
        if (h) spawnAt(ENT.seer, { x: h.x + 3, y: h.y, z: h.z - 3 });
      }
    }
    save();
  }
}

// ------------------------------------------------------------------------- night patrols

// Patrol members carry a tag, so they are still known after a reload (and still leave at dawn).
const PATROL_TAG = "hollow_patrol";
const patrol = {
  add(id: string): void {
    world.getEntity(id)?.addTag(PATROL_TAG);
  },
  delete(_id: string): void {
    /* the tag dies with the entity */
  },
  list(): Entity[] {
    try {
      return world.getDimension("overworld").getEntities({ tags: [PATROL_TAG] });
    } catch {
      return [];
    }
  },
  get size(): number {
    return this.list().length;
  },
};
const wrathful = new Set<string>();

function patrols(): void {
  if (!isIsland() || !settings().cult) return;
  const s = st();
  const dim = world.getDimension("overworld");
  for (const e of patrol.list()) {
    if (!e.isValid) continue;
    // at dawn they melt back into the trees
    if (isDay() && !isDarkHours()) {
      const seen = world.getAllPlayers().some((p) => Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z) < 20);
      if (!seen) {
        e.triggerEvent("hollow:despawn");
      }
    }
  }
  if (!isDarkHours()) return;
  const hostile = s.hierophantDead || s.standing <= -30;
  if (hollowNight() < 2 && !hostile) return;                     // the first night they only watch
  if (patrol.size >= (hostile ? 6 : 4)) return;
  const chance = (hostile ? 0.35 : 0.14) * [0.6, 1, 1.5][settings().intensity] * (s.standing >= 40 ? 0.4 : 1);
  for (const p of world.getAllPlayers()) {
    if (!p.isValid || p.dimension.id !== dim.id || Math.random() > chance) continue;
    const near = villages().some((v) => Math.hypot(p.location.x - v.center.x, p.location.z - v.center.z) < 60);
    if (near) continue;                                          // the guards deal with that
    const a = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 16;
    const at = groundNear(dim, p.location.x + Math.cos(a) * r, p.location.y, p.location.z + Math.sin(a) * r, 10);
    if (!at) continue;
    const n = hostile ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const e = spawnAt(ENT.zealot, { x: at.x + k * 1.5, y: at.y, z: at.z }, false);
      if (e) patrol.add(e.id);
    }
    worldSound(dim, SND.distantShot, at, 0.6);
    if (Math.random() < 0.5) say("§7(low)§r Lights in the trees. Torches. That's them, the ones who shot us down.", "patrol", 2400);
    break;
  }
}

// ------------------------------------------------------------------------- talking to them

function armed(p: Player): boolean {
  const id = heldItem(p);
  return !!id && (!!GUNS[id] || id.endsWith("_sword") || id.endsWith("_axe") || id === ITEM.hatchet || id === "minecraft:bow" || id === "minecraft:crossbow");
}

const FAITHFUL_LINES = [
  "The second sun opened its eye over this island. We were not afraid to look.",
  "My grandmother came here in sixty-two. She said the air tasted of pennies. She lived to ninety.",
  "You carry the mainland on you. It smells of fear.",
  "The sickness is only the sun getting in. It hurts, and then you belong to it.",
  "The things in the woods do not touch us. They know whose island it is.",
  "Do not walk the north-west shore after dark. The Zealots do not ask questions.",
];

const FOOD = ["minecraft:bread", "minecraft:cooked_beef", "minecraft:cooked_cod", "minecraft:cooked_salmon", "minecraft:apple",
  "minecraft:baked_potato", "minecraft:cooked_chicken", "minecraft:cooked_mutton", "minecraft:sweet_berries", ITEM.ration];

async function talkFaithful(p: Player, e: Entity): Promise<void> {
  const s = st();
  unlock(p, "cult1");
  unlock(p, "cult_faithful");
  if (s.hierophantDead || s.standing <= -40) {
    notice(p, `§7${e.nameTag || "The Faithful"} backs away from you, eyes white and wide.`);
    return;
  }
  if (armed(p)) {
    notice(p, `§7${e.nameTag || "The Faithful"}: §f"Put that away, outsider. Then speak."`);
    return;
  }
  const held = heldItem(p);
  if (held && FOOD.includes(held)) {
    const key = `${e.id}:${world.getDay()}`;
    if (!s.gifts[key]) {
      s.gifts[key] = 1;
      takeOne(p, held);
      changeStanding(4, "A gift, gratefully taken.");
      notice(p, `§7${e.nameTag || "The Faithful"}: §f"The sun sees this. So do I."`);
      return;
    }
  }
  await formSession(p, async () => {
    const form = new ActionFormData()
      .title(`§l${e.nameTag || "Faithful"}`)
      .body(`§o"${pick(FAITHFUL_LINES)}"\n\n§r§8The Children ${standingWord()}.`);
    const trade = s.standing >= 20;
    form.button(trade ? "Trade: copper wire for a medkit" : "§8Trade §7(they don't trust you yet)", "textures/ui/hollow/journal/item_copper_wire");
    form.button(trade ? "Trade: copper wire for iodine tablets" : "§8 ", "textures/ui/hollow/journal/item_iodine_tablets");
    form.button("§8Leave", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled || r.selection === undefined || !trade) return;
    const pay = r.selection === 0 ? ITEM.medkit : r.selection === 1 ? ITEM.iodine : undefined;
    if (!pay) return;
    if (!takeOne(p, pay)) {
      notice(p, "§7You don't have one to give.");
      return;
    }
    giveOrDrop(p, new ItemStack(ITEM.wire, r.selection === 0 ? 3 : 2));
    notice(p, `§7${e.nameTag || "The Faithful"} unwinds a coil of old copper from the tower steel. §f"For the sickness."`);
    changeStanding(2);
  });
}

function takeOne(p: Player, typeId: string): boolean {
  const c = p.getComponent("minecraft:inventory")?.container;
  if (!c) return false;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it?.typeId !== typeId) continue;
    if (it.amount > 1) {
      it.amount -= 1;
      c.setItem(i, it);
    } else c.setItem(i, undefined);
    return true;
  }
  return false;
}

async function talkSeer(p: Player, e: Entity): Promise<void> {
  const s = st();
  unlock(p, "cult1");
  unlock(p, "cult_seer");
  if (armed(p)) {
    notice(p, "§7The Seer turns her blindfolded face toward you. §f\"Put it away. Then we talk.\"");
    return;
  }
  await formSession(p, async () => {
    const options: [string, () => void][] = [
      ["Who are you?", () => {
        unlock(p, "seer_story");
        notice(p, "§7The Seer: §f\"We came in nineteen sixty-two on a supply boat that never went back. The flash had been gone five years. The light was still in everything.\"");
      }],
      ["Who shot down our helicopter?", () => {
        unlock(p, "seer_shot");
        notice(p, "§7The Seer: §f\"The Hierophant says the sky belongs to the sun. The Zealots keep it clean. Your pilot was not the first. He will not be the last.\"");
      }],
      ["Trade: a medkit for a Hush Offering", () => {
        if (!takeOne(p, ITEM.medkit)) return notice(p, "§7The Seer waits. You have no medicine.");
        giveOrDrop(p, new ItemStack(ITEM.offering, 1));
        changeStanding(3);
        notice(p, "§7The Seer presses something cold into your hand. §f\"For the thing under the lake. When you are ready.\"");
      }],
      ["Trade: a battery bank for the bunker maps", () => {
        if (!takeOne(p, ITEM.battery)) return notice(p, "§7The Seer: §f\"Bring me stored lightning. The black boxes from the boathouse.\"");
        unlock(p, "seer_maps");
        changeStanding(5);
        notice(p, "§7The Seer draws three squares in the dirt with her staff. Your Research Log fills in. §f\"Three holes in the ground. Do not open the doors that are already closed.\"");
      }],
    ];
    if (s.standing >= 40) {
      options.push(["Is there another way into the sealed bunker?", () => {
        unlock(p, "seer_way");
        notice(p, "§7The Seer: §f\"The machine-house under the western hill is closed. But the rock has a throat. Walk west from its door, a hundred paces, where the ground falls in. Climb down.\"");
      }]);
    }
    const form = new ActionFormData().title("§lThe Seer").body(`§o"You smell of the mainland, and of the dead man you carried."\n\n§r§8The Children ${standingWord()}.`);
    for (const [label] of options) form.button(label, "textures/ui/hollow/journal/seer");
    form.button("§8Leave", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled || r.selection === undefined || r.selection >= options.length) return;
    options[r.selection][1]();
  });
}

async function talkHierophant(p: Player, e: Entity): Promise<void> {
  const s = st();
  unlock(p, "cult1");
  unlock(p, "cult_hierophant");
  if (wrathful.has(e.id)) return;
  await formSession(p, async () => {
    const welcome = s.standing >= 60;
    const form = new ActionFormData()
      .title("§lThe Hierophant")
      .body(welcome
        ? "§o\"You have fed my children and left our dead in peace. The sun has seen you. Take this, and open what lies under the sun's feet.\""
        : "§o\"You fell out of the sky like ash. The sun let you live, for now. Leave my island, mainlander, or kneel to the light.\"");
    form.button(welcome ? "Take what he offers" : "Leave", "textures/ui/hollow/journal/hierophant");
    form.button("§8Say nothing", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled || r.selection !== 0 || !welcome) return;
    if (!s.vaultOpen) {
      giveOrDrop(p, new ItemStack(ITEM.shrineKey, 1));
      notice(p, "§7The Hierophant gives you a heavy key with a sun for a bow.");
    }
  });
}

// ------------------------------------------------------------------------- violence and its price

function onDeath(dead: Entity, killer?: Entity): void {
  if (!CULT.includes(dead.typeId as never)) return;
  const byPlayer = killer?.typeId === "minecraft:player" || killer?.typeId === ENT.trevor;
  patrol.delete(dead.id);
  if (!byPlayer) return;
  const s = st();
  if (dead.typeId === ENT.faithful) {
    changeStanding(-25, "You killed one of the Faithful.");
    callZealots(dead.location);
  } else if (dead.typeId === ENT.seer) {
    changeStanding(-40, "You killed the Seer.");
    callZealots(dead.location);
  } else if (dead.typeId === ENT.zealot) {
    changeStanding(-3);
  } else if (dead.typeId === ENT.hierophant) {
    s.hierophantDead = true;
    s.standing = -100;
    save();
    for (const p of world.getAllPlayers()) {
      notice(p, "§4The Hierophant is dead. §7The Children of the Second Sun will never forgive you.");
      unlock(p, "hierophant_dead");
    }
    say("It's done. Now every one of them will come for us. Every night.", "hiero", 0);
  }
}

function callZealots(at: Vector3): void {
  const dim = world.getDimension("overworld");
  for (let k = 0; k < 2; k++) {
    const g = groundNear(dim, at.x + 18 + k * 2, at.y, at.z - 14, 10);
    if (!g) continue;
    const e = spawnAt(ENT.zealot, g, false);
    if (e) patrol.add(e.id);
  }
  worldSound(dim, "bell.use" as never, at, 1.0);
}

function onHurt(hurt: Entity, by?: Entity): void {
  if (hurt.typeId === ENT.hierophant && by && (by.typeId === "minecraft:player" || by.typeId === ENT.trevor)) {
    const s = st();
    if (!wrathful.has(hurt.id)) {
      wrathful.add(hurt.id);
      try {
        hurt.triggerEvent("hollow:wrath");
      } catch {
        /* ignore */
      }
      const near = world.getAllPlayers().filter((p) => Math.hypot(p.location.x - hurt.location.x, p.location.z - hurt.location.z) < 40);
      const h = hurt.location;
      const yaw = Math.random() * Math.PI * 2;
      playScene("hierophant", near, [
        { t: 1, cam: { at: { x: h.x + Math.cos(yaw) * 5, y: h.y + 2.2, z: h.z + Math.sin(yaw) * 5 }, look: () => hurt } },
        { t: 4, cam: { at: { x: h.x + Math.cos(yaw) * 3, y: h.y + 1.9, z: h.z + Math.sin(yaw) * 3 }, look: () => hurt, ease: 2.5 } },
        { t: 10, title: ["§4The Hierophant", "§c\"You raise your hand against the sun?\""], sound: ["mob.evocation_illager.prepare_attack", 1, 0.7] },
      ], 70);
    }
    const hp = hurt.getComponent("minecraft:health");
    if (hp && hp.currentValue < hp.effectiveMax * 0.5 && !s.wrathSummoned) {
      s.wrathSummoned = true;
      save();
      for (let k = 0; k < 3; k++) {
        const g = groundNear(hurt.dimension, hurt.location.x + (k - 1) * 4, hurt.location.y, hurt.location.z + 6, 6);
        if (g) {
          const e = spawnAt(ENT.zealot, g, false);
          if (e) patrol.add(e.id);
        }
      }
    }
  }
  if (hurt.typeId === ENT.faithful && by?.typeId === "minecraft:player" && (hurt.getComponent("minecraft:health")?.currentValue ?? 0) > 0) {
    callZealots(hurt.location);
    changeStanding(-5);
  }
}

// ------------------------------------------------------------------------- offerings and the vault

function offerings(): void {
  if (!isIsland()) return;
  const s = st();
  const barrel = LOOT_CONTAINERS.find((c) => c.loot === "shrine_offerings");
  if (!barrel) return;
  const dim = world.getDimension("overworld");
  try {
    if (!dim.isChunkLoaded(barrel)) return;
    const c = dim.getBlock(barrel)?.getComponent("minecraft:inventory")?.container;
    if (!c) return;
    if (s.offeredDay !== world.getDay()) {
      s.offeredDay = world.getDay();
      s.offeredToday = 0;
    }
    let gained = 0;
    for (let i = 0; i < c.size; i++) {
      const it = c.getItem(i);
      if (!it) continue;
      const v = it.typeId === ITEM.offering ? 15 : it.typeId === ITEM.medkit || it.typeId === ITEM.iodine ? 5 : FOOD.includes(it.typeId) ? 1 : 0;
      if (!v) continue;
      gained += v * it.amount;
      c.setItem(i, undefined);
    }
    if (gained > 0) {
      const room = Math.max(0, 20 - s.offeredToday);
      const g = Math.min(room, gained);
      s.offeredToday += g;
      save();
      if (g > 0) changeStanding(g, "The Children take your offering to the shrine.");
      particle(dim, "minecraft:basic_flame_particle", { x: barrel.x + 0.5, y: barrel.y + 1.2, z: barrel.z + 0.5 });
    }
  } catch {
    /* unloaded */
  }
}

/** Shrine key: used near the Sunfall shrine, opens the vault under the sun's feet. */
export function useShrineKey(p: Player): void {
  const s = st();
  const shrine = (POINTS.shrine ?? [])[0];
  if (!shrine || Math.hypot(p.location.x - shrine.x, p.location.z - shrine.z) > 7) {
    notice(p, "§7A heavy key with a sun for a bow. It belongs to the shrine at Sunfall.");
    return;
  }
  if (s.vaultOpen) {
    notice(p, "§7The vault under the shrine already stands open.");
    return;
  }
  if (!openVault(p.dimension)) {
    notice(p, "§7The key turns, but nothing moves. (Come closer.)");
    return;
  }
  takeOne(p, ITEM.shrineKey);
  notice(p, "§7Stone grinds. A shaft opens in front of the altar, a ladder down into the dark.");
  unlock(p, "ledger");
}

/** Clears the sealed shaft in front of the altar and hangs a ladder in it. */
export function openVault(dim = world.getDimension("overworld")): boolean {
  const s = st();
  const shaft = (POINTS.vault_shaft ?? [])[0];
  if (!shaft) return false;
  try {
    for (let y = shaft.y; y < shaft.y + 4; y++) {
      const b = dim.getBlock({ x: shaft.x, y, z: shaft.z });
      if (!b) return false;
      b.setPermutation(BlockPermutation.resolve("minecraft:ladder", { facing_direction: 3 }));
    }
    s.vaultOpen = true;
    save();
    worldSound(dim, "random.door_open", shaft, 1, 0.5);
    particle(dim, "minecraft:large_explosion", { x: shaft.x + 0.5, y: shaft.y + 4, z: shaft.z + 0.5 });
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------- their shots

function onRound(e: Entity): void {
  const dim = e.dimension;
  const nearest = world.getAllPlayers().reduce((d, p) => Math.min(d, Math.hypot(p.location.x - e.location.x, p.location.z - e.location.z)), 1e9);
  if (nearest < 40) worldSound(dim, SND.rifle, e.location, 1.0, 0.95 + Math.random() * 0.1);
  else worldSound(dim, SND.distantShot, e.location, 0.9);
  particle(dim, "minecraft:basic_smoke_particle", e.location);
  emitNoise({ dim, at: e.location, radius: 48, kind: "gunshot" });
}

// ------------------------------------------------------------------------- public

/** A war party of Zealots somewhere out of sight of a point (the tower lamp brings them). */
export function sendWarband(near: Vector3, n: number): number {
  if (!settings().cult) return 0;
  const dim = world.getDimension("overworld");
  let made = 0;
  const a = Math.random() * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const r = 28 + Math.random() * 8;
    const g = groundNear(dim, near.x + Math.cos(a + k * 0.25) * r, near.y, near.z + Math.sin(a + k * 0.25) * r, 12);
    if (!g) continue;
    const e = spawnAt(ENT.zealot, g, false);
    if (e) {
      patrol.add(e.id);
      made++;
    }
  }
  if (made) worldSound(dim, SND.distantShot, near, 0.8);
  return made;
}

export function cultEndingState(): { standing: number; hierophantDead: boolean } {
  const s = st();
  return { standing: s.standing, hierophantDead: s.hierophantDead };
}

export function cultSummary(): string {
  const s = st();
  return `cult: standing=${s.standing} (${standingWord()}) hierophant=${s.hierophantDead ? "dead" : "alive"} patrol=${patrol.size} vault=${s.vaultOpen}`;
}

export function setStanding(v: number): string {
  st().standing = Math.max(-100, Math.min(100, v));
  save();
  return `standing ${st().standing} (${standingWord()})`;
}

export function startCult(): void {
  world.afterEvents.playerInteractWithEntity.subscribe((ev) => safe("cult.talk", () => {
    const t = ev.target;
    if (t.typeId === ENT.faithful) void talkFaithful(ev.player, t);
    else if (t.typeId === ENT.seer) void talkSeer(ev.player, t);
    else if (t.typeId === ENT.hierophant) void talkHierophant(ev.player, t);
  }));
  world.afterEvents.entityDie.subscribe((ev) => safe("cult.die", () => onDeath(ev.deadEntity, ev.damageSource.damagingEntity)));
  world.afterEvents.entityHurt.subscribe((ev) => safe("cult.hurt", () => onHurt(ev.hurtEntity, ev.damageSource.damagingEntity)));
  world.afterEvents.entitySpawn.subscribe((ev) => safe("cult.round", () => {
    if (ev.entity.isValid && ev.entity.typeId === ENT.cultRound) onRound(ev.entity);
  }));
  onShrineKeyHook(useShrineKey);
  onGunshotHook((p, radius) => {
    if (!isIsland()) return;
    for (const v of villages()) {
      if (Math.hypot(p.location.x - v.center.x, p.location.z - v.center.z) < radius + 20) {
        changeStanding(-2);
        break;
      }
    }
  });
  // first sight of them goes in the Research Log
  every("cult.sight", 100, () => {
    if (!isIsland()) return;
    for (const p of world.getAllPlayers()) {
      try {
        const seen = p.dimension.getEntities({ location: p.location, maxDistance: 28, families: ["cult"] })[0];
        if (!seen) continue;
        unlock(p, "cult1");
        if (seen.typeId === ENT.zealot) unlock(p, "cult_zealot");
      } catch {
        /* ignore */
      }
    }
  });
  every("cult.census", 400, census, 50);
  every("cult.patrol", 1200, patrols, 90);
  every("cult.offerings", 200, offerings, 13);
  every("cult.quiet", 2400, () => {
    const s = st();
    const day = world.getDay();
    if (s.quietDay !== day && s.violentDay !== day && day > 0 && isDay()) {
      s.quietDay = day;
      save();
      if (!s.hierophantDead) changeStanding(2);
    }
  }, 200);
}
