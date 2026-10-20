import { Player, system } from "@minecraft/server";
import { FormCancelationReason, type FormResponse } from "@minecraft/server-ui";

// One journal/settings navigation session per player. Tokens also invalidate delayed retries
// when someone disconnects and rejoins before an old form promise settles.
const sessions = new Map<string, object>();

export function forgetForms(playerId: string): void {
  sessions.delete(playerId);
}

export async function formSession(p: Player, render: () => Promise<void>): Promise<void> {
  if (!p.isValid || sessions.has(p.id)) return;
  const token = {};
  sessions.set(p.id, token);
  try {
    await render();
  } finally {
    if (sessions.get(p.id) === token) sessions.delete(p.id);
  }
}

/** Chat and inventory may briefly keep the client busy. Retry only UserBusy, never a close.
 * Engine form errors (including a disconnect while a form is open) resolve as cancellation. */
export async function showForm<T extends FormResponse>(
  p: Player, form: { show(player: Player): Promise<T> }, retries = 6,
): Promise<T | undefined> {
  const token = sessions.get(p.id);
  const current = () => p.isValid && sessions.get(p.id) === token;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (!current()) return undefined;
    let r: T;
    try {
      r = await form.show(p);
    } catch {
      return undefined;
    }
    if (!current()) return undefined;
    if (!r.canceled || r.cancelationReason !== FormCancelationReason.UserBusy || attempt === retries) return r;
    await new Promise<void>((resolve) => system.runTimeout(resolve, 10));
  }
  return undefined;
}
