"""SQLite ledger: fills, settlements, equity snapshots, and the numbers the dashboard shows.

Every row is tagged with a mode ("live", "demo" or "dry_run") so paper and real
results never mix.
"""

from __future__ import annotations

import json
import math
import sqlite3
import threading
from dataclasses import dataclass, replace
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from .kalshi_client import Fill, MarketInfo

ET = ZoneInfo("America/New_York")

SCHEMA = """
CREATE TABLE IF NOT EXISTS fills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL,
    fill_key TEXT NOT NULL,
    order_id TEXT,
    ticker TEXT NOT NULL,
    side TEXT NOT NULL,
    price INTEGER NOT NULL,
    count INTEGER NOT NULL,
    fee_cents REAL NOT NULL DEFAULT 0,
    is_taker INTEGER NOT NULL DEFAULT 0,
    ts REAL NOT NULL,
    UNIQUE(mode, fill_key)
);
CREATE INDEX IF NOT EXISTS fills_mode_ticker ON fills(mode, ticker);
CREATE TABLE IF NOT EXISTS settlements (
    mode TEXT NOT NULL,
    ticker TEXT NOT NULL,
    series TEXT,
    result TEXT NOT NULL,
    yes_count INTEGER NOT NULL,
    no_count INTEGER NOT NULL,
    cost_cents INTEGER NOT NULL,
    fees_cents REAL NOT NULL,
    payout_cents INTEGER NOT NULL,
    pnl_cents REAL NOT NULL,
    close_ts REAL NOT NULL,
    settled_ts REAL NOT NULL,
    PRIMARY KEY(mode, ticker)
);
CREATE INDEX IF NOT EXISTS settlements_close ON settlements(mode, close_ts);
CREATE TABLE IF NOT EXISTS markets (
    ticker TEXT PRIMARY KEY,
    series TEXT,
    close_ts REAL,
    strike REAL,
    strike_type TEXT
);
CREATE TABLE IF NOT EXISTS equity (
    mode TEXT NOT NULL,
    ts REAL NOT NULL,
    equity_cents REAL NOT NULL,
    cash_cents REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS equity_mode_ts ON equity(mode, ts);
CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    series TEXT,
    ts REAL NOT NULL,
    tau REAL NOT NULL,
    p_model REAL NOT NULL,
    p_market REAL,
    outcome INTEGER,
    source TEXT NOT NULL DEFAULT 'live',
    UNIQUE(ticker, ts, source)
);
CREATE INDEX IF NOT EXISTS samples_ticker ON samples(ticker);
CREATE INDEX IF NOT EXISTS samples_outcome ON samples(outcome, ts);
CREATE TABLE IF NOT EXISTS state (
    mode TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY(mode, key)
);
"""


def fee_cents(rate: float, count: int, price_cents: int) -> int:
    """Kalshi fee: round up to the cent of rate * C * P * (1 - P), P in dollars."""
    if rate <= 0 or count <= 0:
        return 0
    raw = rate * count * price_cents * (100 - price_cents) / 100.0
    return int(math.ceil(raw - 1e-9))


@dataclass(frozen=True)
class Position:
    ticker: str
    yes_count: int = 0
    yes_cost: int = 0
    no_count: int = 0
    no_cost: int = 0
    fees: float = 0.0

    @property
    def net_yes(self) -> int:
        return self.yes_count - self.no_count

    @property
    def cost(self) -> int:
        return self.yes_cost + self.no_cost

    @property
    def is_flat(self) -> bool:
        return self.yes_count == 0 and self.no_count == 0

    def pnl_if(self, result: str) -> float:
        payout = 100 * (self.yes_count if result == "yes" else self.no_count)
        return payout - self.cost - self.fees

    @property
    def worst_case_loss(self) -> float:
        if self.is_flat:
            return 0.0
        return max(0.0, -min(self.pnl_if("yes"), self.pnl_if("no")))

    def with_buy(self, side: str, price: int, count: int, fee: float = 0.0) -> "Position":
        if side == "yes":
            return replace(self, yes_count=self.yes_count + count, yes_cost=self.yes_cost + price * count,
                           fees=self.fees + fee)
        return replace(self, no_count=self.no_count + count, no_cost=self.no_cost + price * count,
                       fees=self.fees + fee)


@dataclass(frozen=True)
class Settlement:
    ticker: str
    result: str
    yes_count: int
    no_count: int
    cost_cents: int
    fees_cents: float
    payout_cents: int
    pnl_cents: float
    close_ts: float


def et_date(ts: float) -> str:
    return datetime.fromtimestamp(ts, ET).date().isoformat()


class Ledger:
    def __init__(self, path: str):
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None, timeout=30)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.RLock()
        with self._lock:
            if path != ":memory:":
                self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.executescript(SCHEMA)

    def close(self) -> None:
        self._conn.close()

    def _q(self, sql: str, args: tuple = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self._conn.execute(sql, args).fetchall()

    def _x(self, sql: str, args: tuple = ()) -> int:
        with self._lock:
            return self._conn.execute(sql, args).rowcount

    # -- markets

    def upsert_market(self, m: MarketInfo) -> None:
        self._x(
            "INSERT INTO markets(ticker, series, close_ts, strike, strike_type) VALUES (?,?,?,?,?) "
            "ON CONFLICT(ticker) DO UPDATE SET close_ts=excluded.close_ts, strike=excluded.strike, "
            "strike_type=excluded.strike_type",
            (m.ticker, m.series, m.close_ts, m.strike, m.strike_type),
        )

    def market_meta(self, ticker: str) -> dict[str, Any] | None:
        rows = self._q("SELECT * FROM markets WHERE ticker=?", (ticker,))
        return dict(rows[0]) if rows else None

    # -- fills and positions

    def record_fill(self, mode: str, fill: Fill, fee: float) -> bool:
        """Insert a fill; returns False if we had already seen it."""
        n = self._x(
            "INSERT OR IGNORE INTO fills(mode, fill_key, order_id, ticker, side, price, count, fee_cents, is_taker, ts) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (mode, fill.fill_key, fill.order_id, fill.ticker, fill.side, fill.price, fill.count, fee,
             int(fill.is_taker), fill.ts),
        )
        return n > 0

    def last_fill_ts(self, mode: str) -> float | None:
        rows = self._q("SELECT MAX(ts) AS t FROM fills WHERE mode=?", (mode,))
        return rows[0]["t"] if rows and rows[0]["t"] is not None else None

    def _position_from_rows(self, ticker: str, rows: list[sqlite3.Row]) -> Position:
        pos = Position(ticker)
        for r in rows:
            pos = pos.with_buy(r["side"], r["price"], r["count"], r["fee_cents"])
        return pos

    def is_settled(self, mode: str, ticker: str) -> bool:
        return bool(self._q("SELECT 1 FROM settlements WHERE mode=? AND ticker=?", (mode, ticker)))

    def position(self, mode: str, ticker: str) -> Position:
        if self.is_settled(mode, ticker):
            return Position(ticker)
        rows = self._q("SELECT side, price, count, fee_cents FROM fills WHERE mode=? AND ticker=?", (mode, ticker))
        return self._position_from_rows(ticker, rows)

    def open_positions(self, mode: str) -> dict[str, Position]:
        rows = self._q(
            "SELECT f.ticker, f.side, f.price, f.count, f.fee_cents FROM fills f "
            "LEFT JOIN settlements s ON s.mode=f.mode AND s.ticker=f.ticker "
            "WHERE f.mode=? AND s.ticker IS NULL ORDER BY f.ticker",
            (mode,),
        )
        grouped: dict[str, list[sqlite3.Row]] = {}
        for r in rows:
            grouped.setdefault(r["ticker"], []).append(r)
        return {t: self._position_from_rows(t, rs) for t, rs in grouped.items()}

    def open_cost(self, mode: str) -> float:
        return sum(p.cost + p.fees for p in self.open_positions(mode).values())

    # -- settlement

    def settle(self, mode: str, ticker: str, result: str, close_ts: float, settled_ts: float) -> Settlement | None:
        if result not in ("yes", "no"):
            raise ValueError(result)
        if self.is_settled(mode, ticker):
            return None
        pos = self.position(mode, ticker)
        if pos.is_flat:
            return None
        payout = 100 * (pos.yes_count if result == "yes" else pos.no_count)
        meta = self.market_meta(ticker) or {}
        s = Settlement(ticker, result, pos.yes_count, pos.no_count, pos.cost, pos.fees, payout,
                       payout - pos.cost - pos.fees, close_ts)
        self._x(
            "INSERT OR IGNORE INTO settlements(mode, ticker, series, result, yes_count, no_count, cost_cents, "
            "fees_cents, payout_cents, pnl_cents, close_ts, settled_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (mode, ticker, meta.get("series"), result, s.yes_count, s.no_count, s.cost_cents, s.fees_cents,
             s.payout_cents, s.pnl_cents, close_ts, settled_ts),
        )
        return s

    def realized_pnl(self, mode: str, since_ts: float | None = None) -> float:
        rows = self._q(
            "SELECT COALESCE(SUM(pnl_cents), 0) AS p FROM settlements WHERE mode=? AND close_ts >= ?",
            (mode, since_ts if since_ts is not None else 0.0),
        )
        return float(rows[0]["p"])

    def settlements(self, mode: str, since_ts: float = 0.0, until_ts: float = 1e12) -> list[dict[str, Any]]:
        rows = self._q(
            "SELECT * FROM settlements WHERE mode=? AND close_ts >= ? AND close_ts < ? ORDER BY close_ts",
            (mode, since_ts, until_ts),
        )
        return [dict(r) for r in rows]

    def daily_pnl(self, mode: str, since_ts: float = 0.0, until_ts: float = 1e12) -> dict[str, dict[str, float]]:
        """Realised P&L per ET calendar day, keyed by the market's close time."""
        days: dict[str, dict[str, float]] = {}
        for s in self.settlements(mode, since_ts, until_ts):
            d = days.setdefault(et_date(s["close_ts"]), {"pnl_cents": 0.0, "markets": 0, "wins": 0})
            d["pnl_cents"] += s["pnl_cents"]
            d["markets"] += 1
            d["wins"] += int(s["pnl_cents"] > 0)
        return days

    # -- equity

    def record_equity(self, mode: str, ts: float, equity_cents: float, cash_cents: float) -> None:
        self._x("INSERT INTO equity(mode, ts, equity_cents, cash_cents) VALUES (?,?,?,?)",
                (mode, ts, equity_cents, cash_cents))

    def equity_curve(self, mode: str, since_ts: float = 0.0, max_points: int = 2000) -> list[tuple[float, float]]:
        rows = self._q("SELECT ts, equity_cents FROM equity WHERE mode=? AND ts >= ? ORDER BY ts", (mode, since_ts))
        pts = [(r["ts"], r["equity_cents"]) for r in rows]
        if len(pts) > max_points:
            step = len(pts) / max_points
            pts = [pts[int(i * step)] for i in range(max_points)] + [pts[-1]]
        return pts

    # -- learning samples (shared by every mode: they describe markets, not our trades)

    def add_sample(self, ticker: str, series: str, ts: float, tau: float, p_model: float,
                   p_market: float | None, outcome: int | None = None, source: str = "live") -> None:
        self._x(
            "INSERT OR IGNORE INTO samples(ticker, series, ts, tau, p_model, p_market, outcome, source) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (ticker, series, ts, tau, p_model, p_market, outcome, source),
        )

    def add_samples(self, rows: list[tuple]) -> None:
        with self._lock:
            self._conn.execute("BEGIN")
            self._conn.executemany(
                "INSERT OR IGNORE INTO samples(ticker, series, ts, tau, p_model, p_market, outcome, source) "
                "VALUES (?,?,?,?,?,?,?,?)",
                rows,
            )
            self._conn.execute("COMMIT")

    def unlabeled_tickers(self, closed_before: float) -> list[str]:
        rows = self._q(
            "SELECT DISTINCT s.ticker FROM samples s LEFT JOIN markets m ON m.ticker = s.ticker "
            "WHERE s.outcome IS NULL AND (m.close_ts IS NULL OR m.close_ts < ?)",
            (closed_before,),
        )
        return [r["ticker"] for r in rows]

    def label_samples(self, ticker: str, outcome: int) -> int:
        return self._x("UPDATE samples SET outcome=? WHERE ticker=? AND outcome IS NULL", (outcome, ticker))

    def labeled_samples(self, limit: int = 40000) -> list[dict[str, Any]]:
        rows = self._q(
            "SELECT * FROM (SELECT * FROM samples WHERE outcome IS NOT NULL ORDER BY ts DESC LIMIT ?) ORDER BY ts",
            (limit,),
        )
        return [dict(r) for r in rows]

    def sample_counts(self) -> dict[str, int]:
        rows = self._q(
            "SELECT source, COUNT(*) AS n, COUNT(DISTINCT ticker) AS m FROM samples WHERE outcome IS NOT NULL "
            "GROUP BY source"
        )
        out: dict[str, int] = {}
        for r in rows:
            out[f"{r['source']}_samples"] = r["n"]
            out[f"{r['source']}_markets"] = r["m"]
        return out

    # -- key/value state

    def get_state(self, mode: str, key: str, default: Any = None) -> Any:
        rows = self._q("SELECT value FROM state WHERE mode=? AND key=?", (mode, key))
        return json.loads(rows[0]["value"]) if rows else default

    def set_state(self, mode: str, key: str, value: Any) -> None:
        self._x(
            "INSERT INTO state(mode, key, value) VALUES (?,?,?) ON CONFLICT(mode, key) DO UPDATE SET value=excluded.value",
            (mode, key, json.dumps(value)),
        )

    def modes(self) -> list[str]:
        rows = self._q("SELECT DISTINCT mode FROM fills UNION SELECT DISTINCT mode FROM equity")
        return sorted(r["mode"] for r in rows)

    def fill_stats(self, mode: str, since_ts: float = 0.0) -> dict[str, float]:
        rows = self._q(
            "SELECT COUNT(*) AS n, COALESCE(SUM(count), 0) AS contracts, COALESCE(SUM(price * count), 0) AS volume, "
            "COALESCE(SUM(fee_cents), 0) AS fees FROM fills WHERE mode=? AND ts >= ?",
            (mode, since_ts),
        )
        r = rows[0]
        return {"fills": r["n"], "contracts": r["contracts"], "volume_cents": r["volume"], "fees_cents": r["fees"]}
