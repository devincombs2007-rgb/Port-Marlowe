"""Where does the bot make and lose money?

Breaks settled fills down by coin, time left in the window, price paid and side.
Fills in the same market share one outcome, so they are not independent: the
t-statistic uses a cluster-robust standard error with one cluster per market.
A |t| below ~2 is indistinguishable from luck.
"""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Callable

from .ledger import Ledger


def _tau_bucket(seconds_left: float) -> str:
    for limit, name in ((780, "13-15 min left"), (600, "10-13 min"), (360, "6-10 min"), (180, "3-6 min")):
        if seconds_left > limit:
            return name
    return "under 3 min"


def _price_bucket(price: int) -> str:
    for limit, name in ((15, "1-15c"), (35, "16-35c"), (65, "36-65c"), (85, "66-85c")):
        if price <= limit:
            return name
    return "86-99c"


ORDER = {
    "time left": ["13-15 min left", "10-13 min", "6-10 min", "3-6 min", "under 3 min"],
    "price paid": ["1-15c", "16-35c", "36-65c", "66-85c", "86-99c"],
}


def settled_fills(ledger: Ledger, mode: str) -> list[dict]:
    rows = ledger._q(  # noqa: SLF001 - read-only report over the ledger's own tables
        "SELECT f.ticker, f.side, f.price, f.count, f.ts, s.result, m.close_ts, m.series "
        "FROM fills f JOIN settlements s ON s.mode = f.mode AND s.ticker = f.ticker "
        "LEFT JOIN markets m ON m.ticker = f.ticker WHERE f.mode = ?",
        (mode,),
    )
    out = []
    for r in rows:
        d = dict(r)
        d["value"] = (100 if d["side"] == d["result"] else 0) - d["price"]  # cents per contract
        d["series"] = d["series"] or d["ticker"].split("-")[0]
        out.append(d)
    return out


def breakdown(fills: list[dict], key: Callable[[dict], str]) -> list[dict]:
    per_market: dict[tuple[str, str], list[float]] = defaultdict(lambda: [0.0, 0.0])
    for f in fills:
        acc = per_market[(key(f), f["ticker"])]
        acc[0] += f["value"] * f["count"]
        acc[1] += f["count"]
    groups: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for (bucket, _ticker), (pnl, n) in per_market.items():
        groups[bucket].append((pnl, n))
    out = []
    for bucket, obs in groups.items():
        pnl = sum(p for p, _ in obs)
        contracts = sum(n for _, n in obs)
        mean = pnl / contracts if contracts else 0.0
        # Cluster-robust standard error of the per-contract mean, one cluster per market.
        k = len(obs)
        if k > 1 and contracts:
            ss = sum((p - n * mean) ** 2 for p, n in obs) * k / (k - 1)
            se = math.sqrt(ss) / contracts
            t = mean / se if se > 0 else 0.0
        else:
            t = 0.0
        out.append({"bucket": bucket, "markets": len(obs), "contracts": int(contracts), "pnl_cents": pnl,
                    "cents_per_contract": pnl / contracts if contracts else 0.0, "t": t})
    return out


def report(ledger: Ledger, mode: str) -> str:
    fills = settled_fills(ledger, mode)
    if not fills:
        return f"no settled fills in mode {mode!r} yet"
    n_markets = len({f["ticker"] for f in fills})
    lines = [f"{len(fills)} settled fills over {n_markets} markets ({mode})",
             "t is computed across markets; |t| < 2 is indistinguishable from luck."]
    dims: list[tuple[str, Callable[[dict], str]]] = [
        ("coin", lambda f: f["series"]),
        ("time left", lambda f: _tau_bucket((f["close_ts"] or f["ts"]) - f["ts"])),
        ("price paid", lambda f: _price_bucket(f["price"])),
        ("side", lambda f: f["side"].upper()),
    ]
    for name, key in dims:
        rows = breakdown(fills, key)
        order = ORDER.get(name)
        rows.sort(key=lambda r: order.index(r["bucket"]) if order and r["bucket"] in order else r["bucket"])
        lines.append(f"\nby {name}:")
        lines.append(f"  {'':<16}{'markets':>8}{'contracts':>11}{'P&L':>10}{'per contract':>14}{'t':>7}")
        for r in rows:
            flag = "  <- likely real" if abs(r["t"]) >= 2 and r["markets"] >= 20 else ""
            lines.append(f"  {r['bucket']:<16}{r['markets']:>8}{r['contracts']:>11}{r['pnl_cents'] / 100:>+10.2f}"
                         f"{r['cents_per_contract']:>+13.1f}c{r['t']:>+7.1f}{flag}")
    lines.append("\nA side (YES/NO) result mostly reflects which way prices trended while the bot ran, "
                 "not a repeatable edge.")
    return "\n".join(lines)
