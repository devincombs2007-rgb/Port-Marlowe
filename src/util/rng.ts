/** Small seedable PRNG (mulberry32) so director/AI decisions are reproducible in tests. */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next(): number {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export const mathRng: Rng = { next: () => Math.random() };

export function range(rng: Rng, lo: number, hi: number): number {
  return lo + (hi - lo) * rng.next();
}

export function chance(rng: Rng, p: number): boolean {
  return rng.next() < p;
}

export function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T | undefined {
  let total = 0;
  const weights = items.map((i) => {
    const w = Math.max(0, weight(i));
    total += w;
    return w;
  });
  if (total <= 0) return undefined;
  let roll = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] as number;
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
