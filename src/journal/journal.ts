import { EntityComponentTypes, ItemStack, Player, system, world } from "@minecraft/server";
import { ActionFormData, FormCancelationReason, ModalFormData } from "@minecraft/server-ui";
import { readConfig, setConfigValue, type EffectsLevel } from "../core/config";
import { ADDON_VERSION } from "../core/constants";
import { safe } from "../game/helpers";
import { PAGES } from "./pages";

/**
 * The Field Journal: the add-on's only UI. Opening it (use the item) shows lore pages the player has earned,
 * the survival lessons those pages taught, and a touch/controller-friendly settings screen, so nobody needs cheats
 * or chat commands to configure DREAD on a phone or console.
 */
export const JOURNAL_ITEM = "dread:journal";
const PAGES_KEY = "dread:pages";
const GIVEN_KEY = "dread:journal_given";
const OWNER_KEY = "dread:settings_owner";
const OPEN_KEY = "dread:settings_open";

export function unlockedPages(p: Player): Set<string> {
  const raw = safe(() => p.getDynamicProperty(PAGES_KEY), undefined);
  return new Set(typeof raw === "string" && raw.length ? raw.split(",").filter((id) => PAGES.some((pg) => pg.id === id)) : []);
}

/** Unlocks a page once; returns true if it was new. Quietly tells the player. */
export function unlockPage(p: Player, id: string): boolean {
  if (!PAGES.some((pg) => pg.id === id)) return false;
  const have = unlockedPages(p);
  if (have.has(id)) return false;
  have.add(id);
  safe(() => p.setDynamicProperty(PAGES_KEY, [...have].join(",")), undefined);
  const page = PAGES.find((pg) => pg.id === id);
  system.runTimeout(() => {
    if (!p.isValid) return;
    safe(() => p.onScreenDisplay.setActionBar(`§7§oA new page in your journal: ${page?.title ?? ""}`), undefined);
    safe(() => p.playSound("item.book.page_turn", { volume: 0.8 }), undefined);
  }, 60);
  return true;
}

function giveJournal(p: Player): void {
  safe(() => {
    const inv = p.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inv) return;
    const left = inv.addItem(new ItemStack(JOURNAL_ITEM, 1));
    if (left) p.dimension.spawnItem(left, p.location); // full inventory: drop at their feet
    p.setDynamicProperty(GIVEN_KEY, true);
  }, undefined);
}

export function initJournal(): void {
  world.afterEvents.playerSpawn.subscribe((e) => {
    if (!e.initialSpawn) return;
    const p = e.player;
    system.runTimeout(() => {
      if (!p.isValid) return;
      if (safe(() => p.getDynamicProperty(GIVEN_KEY), undefined) !== true) {
        giveJournal(p);
        unlockPage(p, "first");
      }
    }, 120);
  });
  world.afterEvents.itemUse.subscribe((e) => {
    if (e.itemStack.typeId === JOURNAL_ITEM) void openJournal(e.source);
  });
}

// ---------------------------------------------------------------------------------------------
async function openJournal(p: Player): Promise<void> {
  const have = unlockedPages(p);
  const pages = PAGES.filter((pg) => have.has(pg.id));
  const form = new ActionFormData()
    .title("Field Journal")
    .body(`§7Pages recovered: ${pages.length} of ${PAGES.length}\n§8Water-stained. Several hands.`);
  const actions: (() => Promise<void>)[] = [];
  form.button("§lRead the pages");
  actions.push(() => openPageList(p, pages));
  form.button("§lWhat I know");
  actions.push(() => openLessons(p, pages));
  form.button("§lSettings");
  actions.push(() => openSettings(p));
  form.button("About DREAD");
  actions.push(() => openAbout(p));

  const res = await form.show(p);
  if (res.cancelationReason === FormCancelationReason.UserBusy) {
    system.runTimeout(() => void openJournal(p), 20);
    return;
  }
  if (res.canceled || res.selection === undefined) return;
  await actions[res.selection]?.();
}

async function openPageList(p: Player, pages: readonly (typeof PAGES)[number][]): Promise<void> {
  if (pages.length === 0) return;
  const form = new ActionFormData().title("Pages");
  for (const pg of pages) form.button(pg.title);
  const res = await form.show(p);
  if (res.canceled || res.selection === undefined) return openJournal(p);
  const pg = pages[res.selection];
  if (!pg) return;
  const view = await new ActionFormData().title(pg.title).body(pg.text).button("Back").show(p);
  if (!view.canceled) return openPageList(p, pages);
}

async function openLessons(p: Player, pages: readonly (typeof PAGES)[number][]): Promise<void> {
  const lessons = pages.filter((pg) => pg.lesson).map((pg) => `§f- ${pg.lesson}`);
  const body = lessons.length ? lessons.join("\n\n") : "§7Nothing yet. Keep your eyes open, and your lantern lit.";
  const res = await new ActionFormData().title("What I know").body(body).button("Back").show(p);
  if (!res.canceled) return openJournal(p);
}

async function openAbout(p: Player): Promise<void> {
  const res = await new ActionFormData()
    .title("DREAD")
    .body(
      `§fDREAD — Something Is Watching§r\n§7v${ADDON_VERSION}\n\n` +
        "A psychological horror add-on. The world stays ordinary until it doesn't. Encounters respond to darkness, " +
        "isolation and what you have already lived through, and every danger has a counter written somewhere in " +
        "this journal.\n\nIf anything feels unfair or too intense, turn Intensity or Jumpscare intensity down in Settings.",
    )
    .button("Back")
    .show(p);
  if (!res.canceled) return openJournal(p);
}

/** In multiplayer, only the first player to save settings may change them, unless they open settings to everyone. */
function canEditSettings(p: Player): boolean {
  if (world.getAllPlayers().length <= 1) return true;
  if (world.getDynamicProperty(OPEN_KEY) === true) return true;
  const owner = world.getDynamicProperty(OWNER_KEY);
  return owner === undefined || owner === p.id;
}

const EFFECTS: EffectsLevel[] = ["performance", "balanced", "cinematic"];
const EFFECT_LABELS = ["Performance (no fog or camera shake)", "Balanced", "Cinematic (stronger effects)"];

async function openSettings(p: Player): Promise<void> {
  const c = readConfig();
  if (!canEditSettings(p)) {
    const ro = await new ActionFormData()
      .title("Settings")
      .body(`§7Settings are managed by the world's DREAD owner.\n\n§fIntensity ${c.intensity}\nSound ${c.soundIntensity}\nJumpscares ${c.jumpscareIntensity}\nEffects ${c.effects}`)
      .button("Back")
      .show(p);
    if (!ro.canceled) return openJournal(p);
    return;
  }
  const form = new ModalFormData()
    .title("DREAD Settings")
    .toggle("Horror enabled", { defaultValue: c.enabled, tooltip: "Turn the whole add-on off without removing it." })
    .slider("Intensity (how often things happen)", 0, 100, { defaultValue: c.intensity, valueStep: 5, tooltip: "Below 35 the Lurker is gentler: shorter chases, fewer hits." })
    .slider("Sound volume (DREAD sounds only)", 0, 100, { defaultValue: c.soundIntensity, valueStep: 5 })
    .slider("Jumpscare intensity", 0, 100, { defaultValue: c.jumpscareIntensity, valueStep: 5, tooltip: "Scales sudden/close sounds and camera shake. 0 removes camera shake." })
    .dropdown("Visual effects", EFFECT_LABELS, { defaultValueIndex: Math.max(0, EFFECTS.indexOf(c.effects)) })
    .toggle("Let every player change settings", { defaultValue: world.getDynamicProperty(OPEN_KEY) === true })
    .toggle("Debug messages", { defaultValue: c.debug })
    .submitButton("Save");
  const res = await form.show(p);
  if (res.canceled || !res.formValues) return openJournal(p);
  const [enabled, intensity, sound, jump, effectIdx, open, dbg] = res.formValues;
  setConfigValue("enabled", String(enabled === true));
  setConfigValue("intensity", String(Number(intensity)));
  setConfigValue("soundIntensity", String(Number(sound)));
  setConfigValue("jumpscareIntensity", String(Number(jump)));
  setConfigValue("effects", EFFECTS[Number(effectIdx)] ?? "balanced");
  setConfigValue("debug", String(dbg === true));
  world.setDynamicProperty(OPEN_KEY, open === true);
  if (world.getDynamicProperty(OWNER_KEY) === undefined) world.setDynamicProperty(OWNER_KEY, p.id);
  safe(() => p.onScreenDisplay.setActionBar("§7DREAD settings saved."), undefined);
}
