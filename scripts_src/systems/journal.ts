import { EntityInventoryComponent, ItemLockMode, ItemStack, Player, system } from "@minecraft/server";
import { ActionFormData, ActionFormResponse, FormCancelationReason } from "@minecraft/server-ui";
import { CHAPTERS, Chapter, ENTRIES, ENTRY_BY_ID, LORE_PAGES } from "../content/journal";
import { ui } from "../core/audio";
import { isOperator, settings } from "../core/config";
import { notice } from "../core/fx";
import { DP, ITEM, SND } from "../core/ids";
import { readEntity, writeEntity } from "../core/store";
import { hollowDay, hollowNight } from "../core/time";
import { openSettings } from "./settings_ui";

interface JournalData {
  /** unlocked entry ids */
  u: string[];
  /** read entry ids */
  r: string[];
}

const cache = new Map<string, JournalData>();

function data(p: Player): JournalData {
  let d = cache.get(p.id);
  if (!d) {
    const raw = readEntity<JournalData>(p, DP.journal, { u: [], r: [] });
    d = { u: Array.isArray(raw.u) ? raw.u : [], r: Array.isArray(raw.r) ? raw.r : [] };
    cache.set(p.id, d);
  }
  return d;
}

function save(p: Player, d: JournalData): void {
  writeEntity(p, DP.journal, d);
}

export function forgetJournal(playerId: string): void {
  cache.delete(playerId);
}

export function hasEntry(p: Player, id: string): boolean {
  return data(p).u.includes(id);
}

/** Unlock an entry for one player. Returns true if it was new. */
export function unlock(p: Player, id: string, quiet = false): boolean {
  if (!ENTRY_BY_ID.has(id) || !p.isValid) return false;
  const d = data(p);
  if (d.u.includes(id)) return false;
  d.u.push(id);
  save(p, d);
  if (!quiet) {
    const e = ENTRY_BY_ID.get(id)!;
    system.runTimeout(() => {
      if (!p.isValid) return;
      notice(p, `§7New journal entry: §f${e.title}`);
      ui(p, SND.journalEntry, 0.8);
    }, 30);
  }
  return true;
}

/** Unlock for every player within range (shared discoveries in multiplayer). */
export function unlockNear(players: Player[], id: string): void {
  for (const p of players) unlock(p, id);
}

/** Torn Page: unlock the next lore page in order. Returns the entry title or undefined. */
export function unlockNextLore(p: Player): string | undefined {
  for (const e of LORE_PAGES) {
    if (!hasEntry(p, e.id)) {
      unlock(p, e.id);
      return e.title;
    }
  }
  return undefined;
}

export function journalStack(): ItemStack {
  const s = new ItemStack(ITEM.journal, 1);
  s.keepOnDeath = true;
  s.lockMode = ItemLockMode.inventory;
  return s;
}

/** Make sure the player owns a journal (first join, or after it was lost some other way). */
export function ensureJournal(p: Player, force = false): void {
  try {
    const inv = p.getComponent("minecraft:inventory") as EntityInventoryComponent | undefined;
    const c = inv?.container;
    if (!c) return;
    if (!force) {
      for (let i = 0; i < c.size; i++) {
        if (c.getItem(i)?.typeId === ITEM.journal) return;
      }
    }
    const left = c.addItem(journalStack());
    if (left) p.dimension.spawnItem(left, p.location);
  } catch {
    /* inventory unavailable */
  }
}

// ---------------------------------------------------------------------------------- UI

function show(p: Player, form: ActionFormData, retries = 6): Promise<ActionFormResponse | undefined> {
  return form.show(p).then((r) => {
    if (r.canceled && r.cancelationReason === FormCancelationReason.UserBusy && retries > 0) {
      return new Promise<ActionFormResponse | undefined>((res) =>
        system.runTimeout(() => show(p, form, retries - 1).then(res), 10),
      );
    }
    return r;
  });
}

function threatsAwake(): string {
  const s = settings();
  const day = hollowDay();
  const night = hollowNight();
  const hunting = day >= s.graceDays;
  const lines: string[] = [];
  if (s.watcher) lines.push(hunting ? "§7• In the woods after dusk, something watches." : "§7• The woods feel watched, but nothing hunts yet.");
  if (s.borrowed && day >= 1) lines.push("§7• Count the flocks.");
  if (s.hollowed && hunting) lines.push("§7• Deep tunnels click.");
  if (s.mirebound && day >= 2) lines.push("§7• The shallows are not empty.");
  if (s.knocker) lines.push(night >= s.knockerNight ? "§7• Keep your door closed at night." : "§7• Nights are quiet at the door, for now.");
  return lines.join("\n");
}

export async function openJournal(p: Player): Promise<void> {
  ui(p, SND.journalOpen, 0.9);
  const d = data(p);
  const total = ENTRIES.length;
  const form = new ActionFormData()
    .title("§lField Journal")
    .body(
      `§7Day §f${hollowDay() + 1}§7 · Entries §f${d.u.length}/${total}\n\n` + threatsAwake(),
    );
  const unreadIn = (ch: Chapter) => ENTRIES.some((e) => e.chapter === ch && d.u.includes(e.id) && !d.r.includes(e.id));
  for (const ch of CHAPTERS) {
    const count = ENTRIES.filter((e) => e.chapter === ch.id && d.u.includes(e.id)).length;
    form.button(`${ch.title}${unreadIn(ch.id) ? " §6(new)" : ""}\n§8${count} entries`, ch.icon);
  }
  form.button("Settings\n§8comfort & world rules", "textures/ui/hollow/settings");
  const r = await show(p, form);
  if (!r || r.canceled || r.selection === undefined) return;
  if (r.selection < CHAPTERS.length) await openChapter(p, CHAPTERS[r.selection].id);
  else await openSettings(p, isOperator(p));
}

async function openChapter(p: Player, ch: Chapter): Promise<void> {
  const d = data(p);
  const unlocked = ENTRIES.filter((e) => e.chapter === ch && d.u.includes(e.id));
  const locked = ENTRIES.filter((e) => e.chapter === ch && !d.u.includes(e.id)).length;
  const title = CHAPTERS.find((c) => c.id === ch)!.title;
  const form = new ActionFormData().title(`§l${title}`);
  form.body(
    unlocked.length === 0
      ? "§7Nothing written here yet."
      : locked > 0
        ? `§7${locked} ${locked === 1 ? "page is" : "pages are"} still blank.`
        : "§7Complete.",
  );
  for (const e of unlocked) {
    form.button(`${d.r.includes(e.id) ? "" : "§6• §r"}${e.title}`, e.icon);
  }
  form.button("§8Back", "textures/ui/hollow/back");
  const r = await show(p, form);
  if (!r || r.canceled || r.selection === undefined) return;
  if (r.selection >= unlocked.length) return openJournal(p);
  await openEntry(p, unlocked[r.selection].id, ch);
}

async function openEntry(p: Player, id: string, back: Chapter): Promise<void> {
  const e = ENTRY_BY_ID.get(id);
  if (!e) return;
  const d = data(p);
  if (!d.r.includes(id)) {
    d.r.push(id);
    save(p, d);
  }
  ui(p, SND.journalOpen, 0.6, 1.15);
  const form = new ActionFormData().title(`§l${e.title}`).body(e.body).button("§8Back", "textures/ui/hollow/back");
  const r = await show(p, form);
  if (!r || r.canceled) return;
  await openChapter(p, back);
}
