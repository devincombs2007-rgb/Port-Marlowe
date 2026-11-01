// Physical constants and global tuning. SI units throughout (m, kg, s, Pa).

export const G = 9.81;                 // gravitational acceleration, m/s^2
export const RHO_SEA = 1025;           // surface seawater density, kg/m^3
export const RHO_AIR = 1.225;          // air density at sea level, kg/m^3
export const RHO_STEEL = 7850;         // mild steel, kg/m^3
export const P_ATM = 101325;           // standard atmosphere, Pa
export const SEA_COMPRESSIBILITY = 4.4e-10; // 1/Pa  (seawater bulk modulus ~2.3 GPa)

export const CELL = 0.5;               // ship structure grid resolution, m
export const CELL2 = CELL * CELL;

// Steel of the Olympic-class hulls (Hooper & Foecke tests on recovered plate):
// UTS ~ 420 MPa, yield ~ 270 MPa, ductile-brittle transition ~ +32 C (Charpy).
export const STEEL_UTS = 420e6;
export const STEEL_YIELD = 270e6;
export const STEEL_E = 200e9;

// Seawater density with depth (very small effect, but cheap and real).
export function seaDensityAtDepth(depth) {
  if (depth <= 0) return RHO_SEA;
  const p = RHO_SEA * G * depth;
  return RHO_SEA * (1 + SEA_COMPRESSIBILITY * p);
}

// Hydrostatic gauge pressure at depth (Pa) using mean density over the column.
export function gaugePressure(depth) {
  if (depth <= 0) return 0;
  const rhoMean = 0.5 * (RHO_SEA + seaDensityAtDepth(depth));
  return rhoMean * G * depth;
}

// Seawater temperature profile for the North Atlantic, April (deg C).
// Surface on 14 Apr 1912 was about -2 C (Labrador current); abyss ~2 C.
export function waterTemperature(depth, surfaceTemp = -2) {
  if (depth <= 0) return surfaceTemp;
  const thermocline = 2 + (surfaceTemp - 2) * Math.exp(-depth / 120);
  return thermocline;
}

export const KNOT = 0.514444;
