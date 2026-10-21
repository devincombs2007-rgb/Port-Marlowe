import { Player } from "@minecraft/server";

// A tiny, dependency-free bridge between the creature modules and the Dread system
// (systems/dread.ts). Creatures report frights; Dread consumes them on its next update and
// reports each player's level back so encounter chances can respond to fear.

const pending = new Map<string, number>();
let reader: (p: Player) => number = () => 0;

/** A creature frightened this player (amount in Dread points, 0..100 scale). */
export function frighten(p: Player | undefined, amount: number): void {
  if (!p || !p.isValid || amount <= 0) return;
  pending.set(p.id, Math.min(60, (pending.get(p.id) ?? 0) + amount));
}

export function takeFright(playerId: string): number {
  const v = pending.get(playerId) ?? 0;
  pending.delete(playerId);
  return v;
}

export function forgetFright(playerId: string): void {
  pending.delete(playerId);
}

export function setDreadReader(fn: (p: Player) => number): void {
  reader = fn;
}

export function dreadLevel(p: Player): number {
  return reader(p);
}

/** They are drawn to fear: encounter chances rise once a player is properly frightened.
 * A calm, lit, sheltered player is never penalised below the normal rules. */
export function dreadChance(p: Player): number {
  const d = reader(p);
  return d <= 40 ? 1 : 1 + (Math.min(100, d) - 40) / 150;
}
