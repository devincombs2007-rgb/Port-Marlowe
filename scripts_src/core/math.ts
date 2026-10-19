import { Vector3 } from "@minecraft/server";

export const v3 = (x: number, y: number, z: number): Vector3 => ({ x, y, z });
export const add = (a: Vector3, b: Vector3): Vector3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vector3, b: Vector3): Vector3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vector3, s: number): Vector3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vector3, b: Vector3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const len = (a: Vector3): number => Math.sqrt(dot(a, a));
export const dist = (a: Vector3, b: Vector3): number => len(sub(a, b));
export const distSq = (a: Vector3, b: Vector3): number => {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
};
export const distXZ = (a: Vector3, b: Vector3): number => Math.hypot(a.x - b.x, a.z - b.z);
export const norm = (a: Vector3): Vector3 => {
  const l = len(a);
  return l > 1e-6 ? scale(a, 1 / l) : { x: 0, y: 0, z: 0 };
};
export const floor3 = (a: Vector3): Vector3 => ({ x: Math.floor(a.x), y: Math.floor(a.y), z: Math.floor(a.z) });
export const center = (a: Vector3): Vector3 => ({ x: Math.floor(a.x) + 0.5, y: Math.floor(a.y), z: Math.floor(a.z) + 0.5 });
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Angle in degrees between a view direction and the direction from `from` to `to`. */
export function angleTo(view: Vector3, from: Vector3, to: Vector3): number {
  const d = norm(sub(to, from));
  const c = clamp(dot(norm(view), d), -1, 1);
  return (Math.acos(c) * 180) / Math.PI;
}

/** Unit vector on the XZ plane for a yaw in degrees (Minecraft convention: 0 = +Z, 90 = -X). */
export function yawDir(yawDeg: number): Vector3 {
  const r = (yawDeg * Math.PI) / 180;
  return { x: -Math.sin(r), y: 0, z: Math.cos(r) };
}

export function yawOf(dir: Vector3): number {
  return (Math.atan2(-dir.x, dir.z) * 180) / Math.PI;
}

export function rotateXZ(dir: Vector3, deg: number): Vector3 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return { x: dir.x * c - dir.z * s, y: dir.y, z: dir.x * s + dir.z * c };
}

export const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
export const randInt = (lo: number, hi: number): number => Math.floor(rand(lo, hi + 1));
export const chance = (p: number): boolean => Math.random() < p;
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const fmt = (v: Vector3): string => `${Math.floor(v.x)}, ${Math.floor(v.y)}, ${Math.floor(v.z)}`;

/** 8-point compass label for a direction on the XZ plane (north = -Z). */
export function compass(from: Vector3, to: Vector3): string {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const ang = (Math.atan2(dx, -dz) * 180) / Math.PI; // 0 = north, 90 = east
  const names = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  return names[((Math.round(ang / 45) % 8) + 8) % 8];
}
