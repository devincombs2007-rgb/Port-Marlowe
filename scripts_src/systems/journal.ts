import { EntityInventoryComponent, ItemLockMode, ItemStack, Player, system } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";
import { Chapter, ENTRIES, ENTRY_BY_ID, LORE_PAGES, chaptersFor, entryVisible } from "../content/journal";
import { isIsland } from "../island/mode";
import { bandName, radState, rateAt } from "../island/radiation";
import { ui } from "../core/audio";
import { isOperator, settings } from "../core/config";
import { notice } from "../core/fx";
import { formSession, showForm } from "../core/forms";
import { DP, ITEM, SND } from "../core/ids";
import { readEntity, writeEntity } from "../core/store";
import { hollowDay, hollowNight } from "../core/time";
import { openSettings } from "./settings_ui";
import { fieldNotes } from "./field_notes";

interface JournalData {
  /** unlocked entry ids */
  u: string[];
  /** read entry ids */
  r: string[];
}

const cache = new Map<string, JournalData>();
const discoveries = new Map<string, { run: number; ids: Set<string> }>();

function data(p: Player): JournalData {
  let d = cache.get(p.id);
  if (!d) {
    const raw = readEntity<JournalData>(p, DP.journal, { u: [], r: [] });
    const valid = (v: unknown): v is string => typeof v === "string" && ENTRY_BY_ID.has(v);
    const u = [...new Set(Array.isArray(raw.u) ? raw.u.filter(valid) : [])];
    d = { u, r: [...new Set(Array.isArray(raw.r) ? raw.r.filter((id) => valid(id) && u.includes(id)) : [])] };
    cache.set(p.id, d);
  }
  return d;
}

function save(p: Player, d: JournalData): void {
  writeEntity(p, DP.journal, d);
}

export function forgetJournal(playerId: string): void {
  cancelJournalNotices(playerId);
  cache.delete(playerId);
}

export function cancelJournalNotices(playerId: string): void {
  const pending = discoveries.get(playerId);
  if (pending) system.clearRun(pending.run);
  discoveries.delete(playerId);
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
    const pending = discoveries.get(p.id);
    if (pending) pending.ids.add(id);
    else {
      const ids = new Set([id]);
      const run = system.runTimeout(() => {
        discoveries.delete(p.id);
        if (!p.isValid) return;
        const unread = [...ids].filter((entry) => !data(p).r.includes(entry));
        if (unread.length === 0) return;
        notice(p, unread.length === 1
          ? `§7New journal entry: §f${ENTRY_BY_ID.get(unread[0])!.title}`
          : `§7${unread.length} new journal entries. §fOpen your ${isIsland() ? "Research Log" : "Field Journal"} to read them.`);
        ui(p, SND.journalEntry, 0.8);
      }, 30);
      discoveries.set(p.id, { run, ids });
    }
  }
  return true;
}

/** Test kit: unlock every entry quietly. */
export function unlockAll(p: Player): number {
  let n = 0;
  for (const e of ENTRIES) if (unlock(p, e.id, true)) n++;
  return n;
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
  const s = new ItemStack(isIsland() ? ITEM.researchLog : ITEM.journal, 1);
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
        const id = c.getItem(i)?.typeId;
        if (id === ITEM.journal || id === ITEM.researchLog) return;
      }
    }
    const left = c.addItem(journalStack());
    if (left) p.dimension.spawnItem(left, p.location);
  } catch {
    /* inventory unavailable */
  }
}

// ---------------------------------------------------------------------------------- UI

function threatsAwake(): string {
  const s = settings();
  if (isIsland()) {
    return [
      "§7• Find shelter before dark. Something walks the island at night.",
      "§7• Mind your dose near Ground Zero. Never touch the green water.",
      "§7• Someone shot us down. Stay off the north-west shore.",
      "§7• Get to the relay tower on the north peak.",
    ].join("\n");
  }
  const day = hollowDay();
  const night = hollowNight();
  const hunting = day >= s.graceDays;
  const lines: string[] = [];
  if (s.watcher) lines.push(hunting ? "§7• In the woods after dusk, something watches." : "§7• The woods feel watched, but nothing hunts yet.");
  if (s.borrowed && hunting && day >= 1) lines.push("§7• Count the flocks.");
  if (s.hollowed && hunting) lines.push("§7• Deep tunnels click.");
  if (s.mirebound && hunting && day >= 2) lines.push("§7• The shallows are not empty.");
  if (s.knocker) lines.push(hunting && night >= s.knockerNight ? "§7• Keep your door closed at night." : "§7• Nights are quiet at the door, for now.");
  return lines.join("\n");
}

export async function openJournal(p: Player): Promise<void> {
  await formSession(p, () => openJournalMenu(p));
}

async function openJournalMenu(p: Player): Promise<void> {
  ui(p, SND.journalOpen, 0.9);
  const d = data(p);
  const island = isIsland();
  const chapters = chaptersFor(island);
  const total = ENTRIES.filter((e) => entryVisible(e, island)).length;
  const have = d.u.filter((id) => entryVisible(ENTRY_BY_ID.get(id)!, island)).length;
  const form = new ActionFormData()
    .title(island ? "§lResearch Log" : "§lField Journal")
    .body(
      `§7Day §f${hollowDay() + 1}§7 · Entries §f${have}/${total}\n\n` + threatsAwake(),
    );
  const shown = (e: (typeof ENTRIES)[number]) => entryVisible(e, island) && d.u.includes(e.id);
  const unreadIn = (ch: Chapter) => ENTRIES.some((e) => e.chapter === ch && shown(e) && !d.r.includes(e.id));
  for (const ch of chapters) {
    const count = ENTRIES.filter((e) => e.chapter === ch.id && shown(e)).length;
    form.button(`${ch.title}${unreadIn(ch.id) ? " §6(new)" : ""}\n§8${count} entries`, ch.icon);
  }
  form.button("Settings\n§8comfort & world rules", "textures/ui/hollow/settings");
  form.button("Field conditions & next steps\n§8your nerve, local checks and a suggested recipe", "textures/ui/hollow/journal/conditions");
  const r = await showForm(p, form);
  if (!r || r.canceled || r.selection === undefined) return;
  if (r.selection < chapters.length) await openChapter(p, chapters[r.selection].id);
  else if (r.selection === chapters.length) await openSettings(p, isOperator(p));
  else if (r.selection === chapters.length + 1) await openFieldNotes(p);
}

async function openFieldNotes(p: Player): Promise<void> {
  while (p.isValid) {
    const report = fieldNotes(p, (id) => hasEntry(p, id));
    let body = report.body;
    if (isIsland()) {
      const rs = radState(p);
      const rate = rateAt(p);
      body = `§lRadiation§r\n§7Here: §f${rate < 10 ? rate.toFixed(1) : Math.round(rate)} mSv/h§7 · your dose §f${Math.round(rs.dose)} mSv§7 (${bandName(rs.dose)})` +
        (rs.dose >= 300 ? "\n§cLeave contaminated ground and rest; take iodine before going back." : "") + "\n\n" + body;
    }
    const form = new ActionFormData().title("§lField Conditions").body(body);
    form.button("Refresh", "textures/ui/hollow/journal/refresh");
    if (report.recipe) form.button("Read suggested recipe", ENTRY_BY_ID.get(report.recipe)!.icon);
    form.button("§8Back", "textures/ui/hollow/back");
    const r = await showForm(p, form);
    if (!r || r.canceled || r.selection === undefined) return;
    if (r.selection === 0) continue;
    if (report.recipe && r.selection === 1) return openEntry(p, report.recipe, "craft");
    return openJournalMenu(p);
  }
}

async function openChapter(p: Player, ch: Chapter): Promise<void> {
  const d = data(p);
  const island = isIsland();
  const unlocked = ENTRIES.filter((e) => e.chapter === ch && entryVisible(e, island) && d.u.includes(e.id));
  const locked = ENTRIES.filter((e) => e.chapter === ch && entryVisible(e, island) && !d.u.includes(e.id)).length;
  const title = chaptersFor(island).find((c) => c.id === ch)?.title ?? "Notes";
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
  const r = await showForm(p, form);
  if (!r || r.canceled || r.selection === undefined) return;
  if (r.selection >= unlocked.length) return openJournalMenu(p);
  await openEntry(p, unlocked[r.selection].id, ch);
}

async function openEntry(p: Player, id: string, back: Chapter): Promise<void> {
  const e = ENTRY_BY_ID.get(id);
  if (!e) return;
  const d = data(p);
  ui(p, SND.journalOpen, 0.6, 1.15);
  const form = new ActionFormData().title(`§l${e.title}`).body(e.body).button("§8Back", "textures/ui/hollow/back");
  const r = await showForm(p, form);
  if (r && r.cancelationReason !== FormCancelationReason.UserBusy && !d.r.includes(id)) {
    d.r.push(id);
    save(p, d);
  }
  if (!r || r.canceled) return;
  await openChapter(p, back);
}
