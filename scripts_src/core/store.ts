import { Entity, world } from "@minecraft/server";

// Small JSON stores on top of dynamic properties. All reads are defensive: a corrupted or
// missing value falls back to the provided default so a bad save can never break the add-on.

export function readWorld<T>(key: string, fallback: T): T {
  try {
    const raw = world.getDynamicProperty(key);
    if (typeof raw !== "string" || raw.length === 0) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

export function readWorldArray<T>(key: string): T[] {
  try {
    const raw = world.getDynamicProperty(key);
    if (typeof raw !== "string" || raw.length === 0) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export function writeWorld(key: string, value: unknown): void {
  try {
    world.setDynamicProperty(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[hollow] failed to save ${key}: ${e}`);
  }
}

export function readEntity<T>(entity: Entity, key: string, fallback: T): T {
  try {
    const raw = entity.getDynamicProperty(key);
    if (typeof raw !== "string" || raw.length === 0) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
    return { ...fallback, ...(parsed as T) };
  } catch {
    return fallback;
  }
}

export function writeEntity(entity: Entity, key: string, value: unknown): void {
  try {
    if (entity.isValid) entity.setDynamicProperty(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[hollow] failed to save ${key} on ${entity.typeId}: ${e}`);
  }
}

export function getNum(entity: Entity | undefined, key: string, fallback = 0): number {
  if (!entity) {
    const v = world.getDynamicProperty(key);
    return typeof v === "number" ? v : fallback;
  }
  try {
    const v = entity.getDynamicProperty(key);
    return typeof v === "number" ? v : fallback;
  } catch {
    return fallback;
  }
}

export function setNum(entity: Entity | undefined, key: string, value: number): void {
  try {
    if (!entity) world.setDynamicProperty(key, value);
    else if (entity.isValid) entity.setDynamicProperty(key, value);
  } catch {
    /* entity unloaded */
  }
}
