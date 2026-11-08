"""Spot price feeds and a volatility estimator.

Kalshi settles these markets on CF Benchmarks real-time indices, which are built
from major USD spot exchanges. We approximate the index with the median of a few
public exchange prices, polled over REST.
"""

from __future__ import annotations

import logging
import math
import statistics
import threading
import time
from collections import deque
from datetime import datetime, timezone
from typing import Protocol

import requests

log = logging.getLogger(__name__)

SECONDS_PER_YEAR = 365.0 * 24 * 3600


class PriceSource(Protocol):
    name: str

    def fetch(self, symbols: list[str]) -> dict[str, float]: ...


class CoinbaseSource:
    name = "coinbase"
    base = "https://api.exchange.coinbase.com"

    def __init__(self, session: requests.Session | None = None, timeout: float = 3.0):
        self.session = session or requests.Session()
        self.timeout = timeout
        self._unsupported: set[str] = set()

    def fetch(self, symbols: list[str]) -> dict[str, float]:
        out: dict[str, float] = {}
        for sym in symbols:
            if sym in self._unsupported:
                continue
            try:
                r = self.session.get(f"{self.base}/products/{sym}-USD/ticker", timeout=self.timeout)
                if r.status_code == 404:
                    self._unsupported.add(sym)
                    continue
                r.raise_for_status()
                d = r.json()
                bid, ask = float(d.get("bid") or 0), float(d.get("ask") or 0)
                out[sym] = (bid + ask) / 2 if bid > 0 and ask > 0 else float(d["price"])
            except Exception as exc:  # noqa: BLE001 - one bad symbol must not stop the others
                log.debug("coinbase %s: %s", sym, exc)
        return out

    def candles(self, symbol: str, start_ts: float, end_ts: float) -> list[tuple[float, float]]:
        """1-minute closes [(minute_start_ts, close)] oldest first."""
        out: dict[float, float] = {}
        chunk = 300 * 60
        t = start_ts
        while t < end_ts:
            t2 = min(t + chunk, end_ts)
            r = self.session.get(
                f"{self.base}/products/{symbol}-USD/candles",
                params={
                    "granularity": 60,
                    "start": datetime.fromtimestamp(t, timezone.utc).isoformat(),
                    "end": datetime.fromtimestamp(t2, timezone.utc).isoformat(),
                },
                timeout=10,
            )
            r.raise_for_status()
            for row in r.json():
                out[float(row[0])] = float(row[4])
            t = t2
            time.sleep(0.15)
        return sorted(out.items())


class KrakenSource:
    name = "kraken"
    url = "https://api.kraken.com/0/public/Ticker"
    pairs = {"BTC": "XBTUSD", "ETH": "ETHUSD", "SOL": "SOLUSD", "DOGE": "XDGUSD", "XRP": "XRPUSD", "HYPE": "HYPEUSD"}

    def __init__(self, session: requests.Session | None = None, timeout: float = 3.0):
        self.session = session or requests.Session()
        self.timeout = timeout

    @staticmethod
    def _aliases(pair: str) -> set[str]:
        base = pair[:-3]
        return {pair, f"X{base}ZUSD"}

    def fetch(self, symbols: list[str]) -> dict[str, float]:
        wanted = {s: self.pairs[s] for s in symbols if s in self.pairs}
        if not wanted:
            return {}
        try:
            r = self.session.get(self.url, params={"pair": ",".join(wanted.values())}, timeout=self.timeout)
            r.raise_for_status()
            d = r.json()
            if d.get("error"):
                raise RuntimeError(d["error"])
            result = d.get("result") or {}
        except Exception as exc:  # noqa: BLE001
            log.debug("kraken: %s", exc)
            return {}
        out: dict[str, float] = {}
        for sym, pair in wanted.items():
            for key in self._aliases(pair):
                if key in result:
                    t = result[key]
                    out[sym] = (float(t["a"][0]) + float(t["b"][0])) / 2
                    break
        return out


class HyperliquidSource:
    """Hyperliquid mid prices (perpetuals). Useful for HYPE, which few spot venues list."""

    name = "hyperliquid"
    url = "https://api.hyperliquid.xyz/info"

    def __init__(self, session: requests.Session | None = None, timeout: float = 3.0):
        self.session = session or requests.Session()
        self.timeout = timeout

    def fetch(self, symbols: list[str]) -> dict[str, float]:
        try:
            r = self.session.post(self.url, json={"type": "allMids"}, timeout=self.timeout)
            r.raise_for_status()
            mids = r.json()
        except Exception as exc:  # noqa: BLE001
            log.debug("hyperliquid: %s", exc)
            return {}
        return {s: float(mids[s]) for s in symbols if s in mids}

    def candles(self, symbol: str, start_ts: float, end_ts: float) -> list[tuple[float, float]]:
        r = self.session.post(
            self.url,
            json={
                "type": "candleSnapshot",
                "req": {"coin": symbol, "interval": "1m", "startTime": int(start_ts * 1000), "endTime": int(end_ts * 1000)},
            },
            timeout=10,
        )
        r.raise_for_status()
        return sorted((c["t"] / 1000.0, float(c["c"])) for c in r.json())


SOURCES = {"coinbase": CoinbaseSource, "kraken": KrakenSource, "hyperliquid": HyperliquidSource}


def historical_minute_closes(symbol: str, start_ts: float, end_ts: float) -> list[tuple[float, float]]:
    """Best-effort 1-minute history: Coinbase first, Hyperliquid as a fallback."""
    for source in (CoinbaseSource(), HyperliquidSource()):
        try:
            closes = source.candles(symbol, start_ts, end_ts)
            if closes:
                return closes
        except Exception as exc:  # noqa: BLE001
            log.info("candles for %s from %s failed: %s", symbol, source.name, exc)
    return []


# --------------------------------------------------------------------- volatility


class VolEstimator:
    """EWMA variance of 1-minute log returns, per symbol."""

    def __init__(self, halflife_minutes: float = 60.0, floor_annual: float = 0.15, cap_annual: float = 4.0,
                 min_samples: int = 15):
        self.alpha = 1.0 - 0.5 ** (1.0 / halflife_minutes)
        self.floor = floor_annual / math.sqrt(SECONDS_PER_YEAR)
        self.cap = cap_annual / math.sqrt(SECONDS_PER_YEAR)
        self.min_samples = min_samples
        self._var: dict[str, float] = {}  # per-minute variance
        self._n: dict[str, int] = {}
        self._cur: dict[str, tuple[int, float]] = {}  # (minute, latest price in minute)
        self._prev: dict[str, tuple[int, float]] = {}  # (minute, close of last completed minute)
        self._lock = threading.Lock()

    def update(self, symbol: str, ts: float, price: float) -> None:
        if price <= 0:
            return
        minute = int(ts // 60)
        with self._lock:
            cur = self._cur.get(symbol)
            if cur is None or minute == cur[0]:
                self._cur[symbol] = (minute, price)
                return
            if minute < cur[0]:
                return
            prev = self._prev.get(symbol)
            if prev is not None:
                gap = max(1, cur[0] - prev[0])
                r = math.log(cur[1] / prev[1])
                sample = r * r / gap
                if symbol in self._var:
                    self._var[symbol] = (1 - self.alpha) * self._var[symbol] + self.alpha * sample
                else:
                    self._var[symbol] = sample
                self._n[symbol] = self._n.get(symbol, 0) + 1
            self._prev[symbol] = cur
            self._cur[symbol] = (minute, price)

    def seed(self, symbol: str, closes: list[tuple[float, float]]) -> None:
        for ts, price in closes:
            self.update(symbol, ts + 59.0, price)

    def ready(self, symbol: str) -> bool:
        return self._n.get(symbol, 0) >= self.min_samples

    def sigma(self, symbol: str) -> float | None:
        """Volatility of log price per sqrt(second)."""
        with self._lock:
            var = self._var.get(symbol)
        if var is None or not self.ready(symbol):
            return None
        return min(max(math.sqrt(var / 60.0), self.floor), self.cap)


# ---------------------------------------------------------------------- the feed


class SpotFeed:
    """Polls each source on its own thread; serves a median composite price."""

    def __init__(
        self,
        symbols: list[str],
        sources: list[PriceSource],
        poll_interval: float = 1.0,
        stale_after: float = 4.0,
        history_seconds: int = 1800,
        vol: VolEstimator | None = None,
    ):
        self.symbols = list(symbols)
        self.sources = sources
        self.poll_interval = poll_interval
        self.stale_after = stale_after
        self.vol = vol
        self._latest: dict[tuple[str, str], tuple[float, float]] = {}
        self._history: dict[str, deque[tuple[float, float]]] = {s: deque(maxlen=history_seconds) for s in symbols}
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []

    def start(self) -> None:
        for src in self.sources:
            t = threading.Thread(target=self._run, args=(src,), name=f"spot-{src.name}", daemon=True)
            t.start()
            self._threads.append(t)

    def stop(self) -> None:
        self._stop.set()

    def _run(self, src: PriceSource) -> None:
        empty_polls = 0
        while not self._stop.is_set():
            started = time.time()
            try:
                prices = src.fetch(self.symbols)
            except Exception as exc:  # noqa: BLE001
                log.debug("spot source %s failed: %s", src.name, exc)
                prices = {}
            empty_polls = 0 if prices else empty_polls + 1
            if empty_polls in (10, 300) or (empty_polls and empty_polls % 1800 == 0):
                log.warning("spot source %s has returned no prices for %d polls", src.name, empty_polls)
            now = time.time()
            for sym, px in prices.items():
                self.update(src.name, sym, px, now)
            self._stop.wait(max(0.0, self.poll_interval - (time.time() - started)))

    def update(self, source: str, symbol: str, price: float, ts: float) -> None:
        if not price or price <= 0 or not math.isfinite(price):
            return
        with self._lock:
            self._latest[(source, symbol)] = (price, ts)
            composite = self._composite_locked(symbol, ts)
            if composite is None:
                return
            hist = self._history.setdefault(symbol, deque(maxlen=1800))
            # Keep roughly one sample per second.
            if hist and int(hist[-1][0]) == int(ts):
                hist[-1] = (ts, composite)
            else:
                hist.append((ts, composite))
        if self.vol is not None:
            self.vol.update(symbol, ts, composite)

    def _composite_locked(self, symbol: str, now: float) -> float | None:
        fresh = [px for (src, sym), (px, ts) in self._latest.items() if sym == symbol and now - ts <= self.stale_after]
        if not fresh:
            return None
        return statistics.median(fresh)

    def price(self, symbol: str, now: float | None = None) -> float | None:
        now = time.time() if now is None else now
        with self._lock:
            return self._composite_locked(symbol, now)

    def sources_for(self, symbol: str, now: float | None = None) -> dict[str, float]:
        now = time.time() if now is None else now
        with self._lock:
            return {
                src: px for (src, sym), (px, ts) in self._latest.items() if sym == symbol and now - ts <= self.stale_after
            }

    def window_average(self, symbol: str, start_ts: float, end_ts: float) -> float | None:
        with self._lock:
            pts = [px for ts, px in self._history.get(symbol, ()) if start_ts <= ts <= end_ts]
        return sum(pts) / len(pts) if pts else None

    def price_at(self, symbol: str, ts: float) -> float | None:
        """Latest composite at or before ts."""
        with self._lock:
            best = None
            for t, px in self._history.get(symbol, ()):
                if t <= ts:
                    best = px
                else:
                    break
        return best

    def move_zscore(self, symbol: str, lookback: float, sigma: float, now: float | None = None) -> float:
        """|log return over the lookback| in units of expected standard deviation."""
        now = time.time() if now is None else now
        p_now = self.price(symbol, now)
        p_then = self.price_at(symbol, now - lookback)
        if not p_now or not p_then or sigma <= 0:
            return 0.0
        return abs(math.log(p_now / p_then)) / (sigma * math.sqrt(lookback))


def build_sources(names: list[str]) -> list[PriceSource]:
    unknown = set(names) - set(SOURCES)
    if unknown:
        raise ValueError(f"unknown spot sources: {sorted(unknown)}; choose from {sorted(SOURCES)}")
    return [SOURCES[n]() for n in names]
