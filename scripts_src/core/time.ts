import { system, world } from "@minecraft/server";
import { DP } from "./ids";

// Bedrock time of day: 0 = sunrise, 6000 = noon, 12000 = sunset, 18000 = midnight.
export const tod = (): number => world.getTimeOfDay();
export const isDusk = (): boolean => {
  const t = tod();
  return t >= 11800 && t < 13000;
};
export const isNight = (): boolean => {
  const t = tod();
  return t >= 13000 && t < 23200;
};
export const isDarkHours = (): boolean => {
  const t = tod();
  return t >= 12400 && t < 23400;
};
export const isDay = (): boolean => !isDarkHours();
export const now = (): number => system.currentTick;

/**
 * Days since THE HOLLOW was first enabled in this world, so threats ramp up gently even when the
 * add-on is added to an old world. Day 0 is the first day.
 */
export function hollowDay(): number {
  let start = world.getDynamicProperty(DP.startDay);
  if (typeof start !== "number") {
    start = world.getDay();
    world.setDynamicProperty(DP.startDay, start);
  }
  return Math.max(0, world.getDay() - start);
}

/** Night number since the add-on was enabled: the evening of day 0 is night 1. */
export function hollowNight(): number {
  return hollowDay() + (tod() >= 12000 ? 1 : 0);
}

/** A stable identifier for "this night" (changes at sunset). */
export function nightKey(): number {
  return world.getDay() * 2 + (tod() >= 12000 ? 1 : 0);
}

export const seconds = (s: number): number => Math.round(s * 20);
export const minutes = (m: number): number => Math.round(m * 1200);
