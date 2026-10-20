import { Player, system } from "@minecraft/server";
import { ActionFormData, FormCancelationReason, ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import { PlayerPrefs, WorldSettings, isOperator, prefs, savePrefs, saveSettings, settings } from "../core/config";
import { clearAllFog, notice } from "../core/fx";

// Controller-friendly settings: every option is a toggle, dropdown or slider in a server form.

function showModal(p: Player, f: ModalFormData, retries = 6): Promise<ModalFormResponse | undefined> {
  return f.show(p).then((r) => {
    if (r.canceled && r.cancelationReason === FormCancelationReason.UserBusy && retries > 0) {
      return new Promise<ModalFormResponse | undefined>((res) => system.runTimeout(() => showModal(p, f, retries - 1).then(res), 10));
    }
    return r;
  });
}

export async function openSettings(p: Player, op: boolean): Promise<void> {
  const menu = new ActionFormData()
    .title("§lSettings")
    .body("§7Comfort settings are yours alone. World rules affect everyone and need operator permission.\n\n" +
      "§8Brightness, render distance, graphics mode (Vibrant Visuals), the sound sliders " +
      "(Music, Ambient/Environment, Hostile Creatures) and Subtitles are in Minecraft's own Settings menu.")
    .button("My comfort settings", "textures/ui/hollow/settings");
  if (op) menu.button("World rules §8(operator)", "textures/ui/hollow/world");
  const r = await menu.show(p);
  if (r.canceled || r.selection === undefined) return;
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
    .submitButton("Save");
  const r = await showModal(p, f);
  if (!r || r.canceled || !r.formValues) return;
  const v = r.formValues;
  const next: PlayerPrefs = {
    ambience: Number(v[0]),
    accents: Number(v[1]),
    visualFx: Boolean(v[2]),
    hints: Boolean(v[3]),
    music: Boolean(v[4]),
  };
  savePrefs(p, next);
  if (!next.visualFx) clearAllFog(p);
  notice(p, "§7Comfort settings saved.");
}

async function openWorld(p: Player): Promise<void> {
  const s = settings();
  const f = new ModalFormData()
    .title("§lWorld rules")
    .dropdown("Horror intensity", ["Calm: rarer, no ambush strikes", "Standard", "Nightmare: frequent, bolder"], { defaultValueIndex: s.intensity })
    .slider("Encounter frequency (%)", 25, 200, { defaultValue: s.frequency, valueStep: 25 })
    .slider("Grace days before creatures hunt", 0, 5, { defaultValue: s.graceDays, valueStep: 1 })
    .slider("First night the Knocker may visit", 2, 10, { defaultValue: Math.max(2, Math.min(10, s.knockerNight)), valueStep: 1 })
    .toggle("Creature: The Watcher", { defaultValue: s.watcher })
    .toggle("Creature: The Borrowed", { defaultValue: s.borrowed })
    .toggle("Creature: The Hollowed", { defaultValue: s.hollowed })
    .toggle("Creature: The Knocker", { defaultValue: s.knocker })
    .toggle("Creature: The Mirebound", { defaultValue: s.mirebound })
    .toggle("Destructive Knocker (may break wooden doors on Hard)", { defaultValue: s.destructive })
    .toggle("Rare bedtime knocking (harmless, never blocks sleep)", { defaultValue: s.sleepDisturbance })
    .toggle("Place cabins, campsites and the shrine", { defaultValue: s.sites })
    .toggle("Scale the Heart Below with player count", { defaultValue: s.bossScaling })
    .submitButton("Save");
  const r = await showModal(p, f);
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
  };
  saveSettings(next);
  notice(p, "§7World rules saved.");
}
