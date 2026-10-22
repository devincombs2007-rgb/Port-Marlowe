import { Player } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { PlayerPrefs, WorldSettings, isOperator, prefs, rawSettings, savePrefs, saveSettings } from "../core/config";
import { clearAllFog, notice } from "../core/fx";
import { showForm } from "../core/forms";

// Controller-friendly settings: every option is a toggle, dropdown or slider in a server form.

export async function openSettings(p: Player, op: boolean): Promise<void> {
  const menu = new ActionFormData()
    .title("§lSettings")
    .body("§7Comfort settings are yours alone. World rules affect everyone and need operator permission.\n\n" +
      "§8Brightness, render distance, graphics mode (Vibrant Visuals), the sound sliders " +
      "(Music, Ambient/Environment, Hostile Creatures) and Subtitles are in Minecraft's own Settings menu.")
    .button("My comfort settings", "textures/ui/hollow/settings");
  if (op) menu.button("World rules §8(operator)", "textures/ui/hollow/world");
  const r = await showForm(p, menu);
  if (!r || r.canceled || r.selection === undefined) return;
  if (r.selection === 0) return openPrefs(p);
  if (r.selection === 1 && isOperator(p)) return openWorld(p);
}

async function openPrefs(p: Player): Promise<void> {
  const cur = prefs(p);
  const f = new ModalFormData()
    .title("§lMy comfort settings")
    .slider("Ambience volume (script cues)", 0, 100, { defaultValue: cur.ambience, valueStep: 10 })
    .dropdown("Encounter accents (short stingers)", ["Off", "Subtle", "Full"], { defaultValueIndex: cur.accents })
    .toggle("Visual effects (fog shifts, soft fades)", { defaultValue: cur.visualFx })
    .toggle("Action-bar hints", { defaultValue: cur.hints })
    .toggle("Music (night, cave, shrine and boss tracks)", { defaultValue: cur.music })
    .toggle("Dread effects (heartbeat, breathing, closing fog, hallucinations)", { defaultValue: cur.dreadFx })
    .submitButton("Save");
  const r = await showForm(p, f);
  if (!r || r.canceled || !r.formValues) return;
  const v = r.formValues;
  const next: PlayerPrefs = {
    ambience: Number(v[0]),
    accents: Number(v[1]),
    visualFx: Boolean(v[2]),
    hints: Boolean(v[3]),
    music: Boolean(v[4]),
    dreadFx: v[5] === undefined ? cur.dreadFx : Boolean(v[5]),
  };
  savePrefs(p, next);
  if (!next.visualFx || !next.dreadFx) clearAllFog(p);
  notice(p, "§7Comfort settings saved.");
}

async function openWorld(p: Player): Promise<void> {
  const s = rawSettings();
  const f = new ModalFormData()
    .title("§lWorld rules")
    .dropdown("Horror intensity", ["Calm: rarer, no ambush strikes", "Standard", "Nightmare: frequent, bolder"], { defaultValueIndex: s.intensity })
    .slider("Encounter frequency (%)", 25, 200, { defaultValue: s.frequency, valueStep: 25 })
    .slider("Grace days before creatures hunt", 0, 10, { defaultValue: s.graceDays, valueStep: 1 })
    .slider("First night the Knocker may visit", 1, 20, { defaultValue: s.knockerNight, valueStep: 1 })
    .toggle("Creature: The Watcher", { defaultValue: s.watcher })
    .toggle("Creature: The Borrowed", { defaultValue: s.borrowed })
    .toggle("Creature: The Hollowed", { defaultValue: s.hollowed })
    .toggle("Creature: The Knocker", { defaultValue: s.knocker })
    .toggle("Creature: The Mirebound", { defaultValue: s.mirebound })
    .toggle("Destructive Knocker (may break wooden doors on Hard)", { defaultValue: s.destructive })
    .toggle("Rare bedtime knocking (harmless, never blocks sleep)", { defaultValue: s.sleepDisturbance })
    .toggle("Place cabins, camps, towers, lean-tos and the shrine", { defaultValue: s.sites })
    .toggle("Scale the Heart Below with player count", { defaultValue: s.bossScaling })
    .toggle("Rare one-off events (harmless, once per world)", { defaultValue: s.rareEvents })
    .toggle("Dread: fear, hallucinations, and fear drawing them closer", { defaultValue: s.dread })
    .toggle("Varrow Island: Trevor's death is permanent", { defaultValue: s.trevorPermadeath })
    .toggle("Varrow Island: the Children of the Second Sun (villages and night patrols)", { defaultValue: s.cult })
    .submitButton("Save");
  const r = await showForm(p, f);
  if (!r || r.canceled || !r.formValues || !isOperator(p)) return;
  // No labels/dividers in this form, so values map 1:1 to the controls above.
  const v = r.formValues;
  const next: WorldSettings = {
    intensity: Number(v[0]),
    frequency: Number(v[1]),
    graceDays: Number(v[2]),
    knockerNight: Number(v[3]),
    watcher: Boolean(v[4]),
    borrowed: Boolean(v[5]),
    hollowed: Boolean(v[6]),
    knocker: Boolean(v[7]),
    mirebound: Boolean(v[8]),
    destructive: Boolean(v[9]),
    sleepDisturbance: Boolean(v[10]),
    sites: Boolean(v[11]),
    bossScaling: Boolean(v[12]),
    rareEvents: Boolean(v[13]),
    dread: v[14] === undefined ? s.dread : Boolean(v[14]),
    trevorPermadeath: v[15] === undefined ? s.trevorPermadeath : Boolean(v[15]),
    cult: v[16] === undefined ? s.cult : Boolean(v[16]),
  };
  saveSettings(next);
  notice(p, "§7World rules saved.");
}
