"""Fair value for a 15-minute "up or down" crypto contract.

The contract settles YES when the average of the reference index over the final
`window` seconds before close is at or above the strike (the same average taken
just before the window opened).

Model: over minutes the price is close to arithmetic Brownian motion with
volatility sigma * S per sqrt(second). For the average A of the last `w` seconds
with `tau` seconds to go:

* tau >= w: A = S + noise, Var = (sigma S)^2 * (tau - 2w/3)
* tau <  w: part of the average is already known. With R the average realised so
  far over (w - tau) seconds, E[A] = ((w - tau) R + tau S) / w and
  Var = (sigma S)^2 * tau^3 / (3 w^2)
"""

from __future__ import annotations

import math


def norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def average_distribution(
    spot: float,
    tau: float,
    sigma: float,
    window: float = 60.0,
    realized_avg: float | None = None,
) -> tuple[float, float]:
    """Mean and standard deviation of the settlement average, in price units."""
    sigma_abs = sigma * spot
    if tau <= 0:
        return (realized_avg if realized_avg is not None else spot), 0.0
    if window <= 0:
        return spot, sigma_abs * math.sqrt(tau)
    if tau >= window:
        return spot, sigma_abs * math.sqrt(tau - 2.0 * window / 3.0)
    known = realized_avg if realized_avg is not None else spot
    elapsed = window - tau
    mean = (elapsed * known + tau * spot) / window
    sd = sigma_abs * math.sqrt(tau**3 / (3.0 * window**2))
    return mean, sd


def prob_at_or_above(mean: float, sd: float, level: float) -> float:
    if sd <= 0:
        return 1.0 if mean >= level else 0.0
    return norm_cdf((mean - level) / sd)


def fair_yes_probability(
    *,
    spot: float,
    strike_type: str,
    floor_strike: float | None,
    cap_strike: float | None,
    tau: float,
    sigma: float,
    window: float = 60.0,
    realized_avg: float | None = None,
    vol_multiplier: float = 1.0,
    clamp: float = 0.001,
) -> float:
    """P(contract settles YES)."""
    mean, sd = average_distribution(spot, tau, sigma * vol_multiplier, window, realized_avg)
    st = strike_type.lower()
    if st in ("greater", "greater_or_equal", "above", "up"):
        if floor_strike is None:
            raise ValueError("strike_type needs floor_strike")
        p = prob_at_or_above(mean, sd, floor_strike)
    elif st in ("less", "less_or_equal", "below", "down"):
        level = cap_strike if cap_strike is not None else floor_strike
        if level is None:
            raise ValueError("strike_type needs cap_strike")
        p = 1.0 - prob_at_or_above(mean, sd, level)
    elif st == "between":
        if floor_strike is None or cap_strike is None:
            raise ValueError("between needs floor_strike and cap_strike")
        p = prob_at_or_above(mean, sd, floor_strike) - prob_at_or_above(mean, sd, cap_strike)
    else:
        raise ValueError(f"unsupported strike_type {strike_type!r}")
    return min(max(p, clamp), 1.0 - clamp)
