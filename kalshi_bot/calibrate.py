"""Does the fair-value model know anything the market doesn't?

For recently settled 15-minute markets, compute the model's probability at a few
checkpoints before close, using 1-minute spot candles, and compare it with
(a) the actual outcome and (b) the Kalshi order book's own mid price at the same
minute. A maker strategy that quotes around a model which is *worse* than the
market mid will mostly get filled when it is wrong (adverse selection).

Brier score = mean (p - outcome)^2. Lower is better; always guessing 0.5 scores 0.25.
"""

from __future__ import annotations

import bisect
import logging
import math
import time
from dataclasses import dataclass

from .kalshi_client import KalshiClient, get_cents, parse_market
from .model import fair_yes_probability
from .spot import SECONDS_PER_YEAR, historical_minute_closes

log = logging.getLogger(__name__)


@dataclass
class Sample:
    ticker: str
    checkpoint: int
    model_p: float
    market_p: float | None
    outcome: int
    ts: float = 0.0


def ewma_sigma_series(closes: list[tuple[float, float]], halflife_minutes: float, floor_annual: float = 0.15,
                      cap_annual: float = 4.0, min_samples: int = 30) -> list[float | None]:
    """sigma per sqrt(second) known at each candle's close, from that candle and earlier ones only."""
    alpha = 1.0 - 0.5 ** (1.0 / halflife_minutes)
    lo, hi = floor_annual / math.sqrt(SECONDS_PER_YEAR), cap_annual / math.sqrt(SECONDS_PER_YEAR)
    out: list[float | None] = [None]
    var = None
    n = 0
    for i in range(1, len(closes)):
        (t0, c0), (t1, c1) = closes[i - 1], closes[i]
        gap = max(1.0, (t1 - t0) / 60.0)
        sample = math.log(c1 / c0) ** 2 / gap
        var = sample if var is None else (1 - alpha) * var + alpha * sample
        n += 1
        out.append(min(max(math.sqrt(var / 60.0), lo), hi) if n >= min_samples else None)
    return out


def _market_mid(candles: list[dict], ts: float) -> float | None:
    best = None
    for c in candles:
        end = c.get("end_period_ts")
        if end is None or end > ts:
            continue
        bid = get_cents(c.get("yes_bid") or {}, "close")
        ask = get_cents(c.get("yes_ask") or {}, "close")
        if bid is not None and ask is not None and 0 < bid < ask < 100:
            best = (bid + ask) / 200.0
    return best


def run_calibration(
    client: KalshiClient,
    series: str,
    symbol: str,
    days: float = 3.0,
    checkpoints: tuple[int, ...] = (600, 300, 120),
    with_market: bool = True,
    vol_halflife_minutes: float = 60.0,
    vol_multiplier: float = 1.0,
    window: int = 60,
    request_pause: float = 0.35,
) -> list[Sample]:
    now = time.time()
    start = now - days * 86400
    markets = [
        parse_market(m, series)
        for m in client.iter_markets(series_ticker=series, status="settled", min_close_ts=int(start), max_close_ts=int(now))
    ]
    markets = [m for m in markets if m.is_determined and m.strike is not None]
    markets.sort(key=lambda m: m.close_ts)
    print(f"{series}: {len(markets)} settled markets in the last {days:g} days")
    if not markets:
        return []

    closes = historical_minute_closes(symbol, markets[0].close_ts - 15 * 60 - 6 * 3600, markets[-1].close_ts)
    if not closes:
        raise RuntimeError(f"no spot history for {symbol}")
    times = [t for t, _ in closes]
    sigmas = ewma_sigma_series(closes, vol_halflife_minutes)

    samples: list[Sample] = []
    for n, m in enumerate(markets, 1):
        candles: list[dict] = []
        if with_market:
            try:
                candles = client.get_market_candlesticks(
                    series, m.ticker, int(m.close_ts - 16 * 60), int(m.close_ts), period_interval=1
                )
            except Exception as exc:  # noqa: BLE001
                log.info("candles for %s failed: %s", m.ticker, exc)
            time.sleep(request_pause)
        for cp in checkpoints:
            t = m.close_ts - cp
            # Last 1-minute candle that has closed by t; no look-ahead.
            i = bisect.bisect_right(times, t - 60) - 1
            if i < 0:
                continue
            spot, sigma = closes[i][1], sigmas[i]
            if sigma is None:
                continue
            p = fair_yes_probability(
                spot=spot,
                strike_type=m.strike_type,
                floor_strike=m.floor_strike,
                cap_strike=m.cap_strike,
                tau=cp,
                sigma=sigma,
                window=window,
                vol_multiplier=vol_multiplier,
            )
            samples.append(Sample(m.ticker, cp, p, _market_mid(candles, t), int(m.result == "yes"), t))
        if n % 25 == 0:
            print(f"  ...{n}/{len(markets)}")
    return samples


def _brier(pairs: list[tuple[float, int]]) -> float:
    return sum((p - o) ** 2 for p, o in pairs) / len(pairs)


def _logloss(pairs: list[tuple[float, int]]) -> float:
    eps = 1e-4
    return -sum(o * math.log(max(p, eps)) + (1 - o) * math.log(max(1 - p, eps)) for p, o in pairs) / len(pairs)


def report(samples: list[Sample]) -> str:
    lines: list[str] = []
    for cp in sorted({s.checkpoint for s in samples}, reverse=True):
        ss = [s for s in samples if s.checkpoint == cp]
        model = [(s.model_p, s.outcome) for s in ss]
        lines.append(f"\n== {cp}s before close: {len(ss)} markets, YES rate {sum(s.outcome for s in ss) / len(ss):.1%}")
        lines.append(f"   model : Brier {_brier(model):.4f}  log-loss {_logloss(model):.4f}")
        both = [s for s in ss if s.market_p is not None]
        if both:
            mb = _brier([(s.model_p, s.outcome) for s in both])
            kb = _brier([(s.market_p, s.outcome) for s in both])  # type: ignore[misc]
            verdict = "model better" if mb < kb else "MARKET BETTER - the model has no edge here"
            lines.append(f"   head-to-head on {len(both)} markets: model {mb:.4f} vs market mid {kb:.4f} -> {verdict}")
            gaps = [abs(s.model_p - s.market_p) for s in both]  # type: ignore[operator]
            lines.append(f"   mean |model - market| = {sum(gaps) / len(gaps) * 100:.1f} cents")
        lines.append("   calibration (predicted -> realised):")
        buckets: dict[int, list[Sample]] = {}
        for s in ss:
            buckets.setdefault(min(int(s.model_p * 10), 9), []).append(s)
        for b in sorted(buckets):
            bs = buckets[b]
            pred = sum(s.model_p for s in bs) / len(bs)
            real = sum(s.outcome for s in bs) / len(bs)
            lines.append(f"     {b * 10:>3}-{b * 10 + 10:<3}%  n={len(bs):<4} predicted {pred:6.1%}  realised {real:6.1%}")
    return "\n".join(lines)
