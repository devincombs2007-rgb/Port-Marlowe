"""Order execution: a live broker that talks to Kalshi, and a paper broker that
simulates maker fills from Kalshi's public trade tape."""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass
from typing import Protocol

from .config import FeesConfig, PaperConfig
from .kalshi_client import Fill, KalshiAPIError, KalshiClient, get_cents, get_count, parse_fill, parse_trade
from .ledger import Ledger, fee_cents

log = logging.getLogger(__name__)

CLIENT_ID_PREFIX = "kb-"


@dataclass
class RestingOrder:
    order_id: str
    ticker: str
    side: str
    price: int
    remaining: int
    created_ts: float
    queue_ahead: float = 0.0  # paper only: contracts ahead of us at our price


class Broker(Protocol):
    mode: str

    def sync(self, now: float) -> list[Fill]: ...
    def resting(self, ticker: str | None = None) -> list[RestingOrder]: ...
    def place(self, ticker: str, side: str, price: int, count: int, queue_ahead: int, now: float,
              expires_ts: float | None = None) -> RestingOrder | None: ...
    def cancel(self, order: RestingOrder) -> bool: ...
    def cancel_all(self) -> None: ...
    def set_baseline(self) -> None: ...
    def cash_cents(self) -> float: ...
    def equity_cents(self) -> float: ...


def resting_cost(orders: list[RestingOrder]) -> float:
    return float(sum(o.price * o.remaining for o in orders))


# --------------------------------------------------------------------------- live


class LiveBroker:
    """Real orders. Only touches orders whose client_order_id starts with CLIENT_ID_PREFIX."""

    def __init__(
        self,
        client: KalshiClient,
        ledger: Ledger,
        fees: FeesConfig,
        series: list[str],
        mode: str = "live",
        price_field: str = "cents",
    ):
        self.client = client
        self.ledger = ledger
        self.fees = fees
        self.series = tuple(series)
        self.mode = mode
        self.price_field = price_field
        self._orders: dict[str, RestingOrder] = {}
        self._balance: float = 0.0
        self._api_total: float | None = None
        # On a first run, ignore account history; after that, resume from the last fill we saw.
        self._last_fill_ts = ledger.last_fill_ts(mode) or time.time()
        self._baseline: float | None = None
        self._realized_at_baseline = 0.0

    def start(self) -> None:
        """Pick up fills since the last run and cancel orders it left behind."""
        self.sync(time.time())
        self.cancel_all()

    def set_baseline(self) -> None:
        """Fix the equity baseline. Call after positions that settled while we were down are booked.

        Equity is tracked at cost: cash + cost of open positions + P&L settled since now.
        That keeps it independent of how Kalshi's balance treats resting orders.
        """
        self._refresh_balance()
        self._realized_at_baseline = self.ledger.realized_pnl(self.mode)
        self._baseline = self._balance + self.ledger.open_cost(self.mode)
        log.info("live equity baseline %.2f USD (cash %.2f)", self._baseline / 100, self._balance / 100)

    def _refresh_balance(self) -> None:
        b = self.client.get_balance()
        self._balance = float(b.get("balance") or 0)
        pv = b.get("portfolio_value")
        self._api_total = self._balance + float(pv) if pv is not None else None

    def _ours(self, o: dict) -> bool:
        return str(o.get("client_order_id") or "").startswith(CLIENT_ID_PREFIX)

    def sync(self, now: float) -> list[Fill]:
        orders: dict[str, RestingOrder] = {}
        for o in self.client.get_orders(status="resting"):
            if not self._ours(o):
                continue
            side = o.get("side")
            price = get_cents(o, f"{side}_price")
            remaining = get_count(o, "remaining_count")
            if price is None or not remaining:
                continue
            orders[o["order_id"]] = RestingOrder(o["order_id"], o["ticker"], side, price, remaining, now)
        for oid, old in self._orders.items():
            if oid in orders:
                orders[oid].created_ts = old.created_ts
        self._orders = orders

        new: list[Fill] = []
        for raw in self.client.get_fills(min_ts=int(self._last_fill_ts) - 5):
            try:
                fill = parse_fill(raw)
            except (KeyError, ValueError) as exc:
                log.warning("unparseable fill %s: %s", raw, exc)
                continue
            if not fill.ticker.startswith(self.series) or fill.count <= 0:
                continue
            rate = self.fees.taker_rate if fill.is_taker else self.fees.maker_rate
            if self.ledger.record_fill(self.mode, fill, fee_cents(rate, fill.count, fill.price)):
                new.append(fill)
            self._last_fill_ts = max(self._last_fill_ts, fill.ts)
        self._refresh_balance()
        return new

    def resting(self, ticker: str | None = None) -> list[RestingOrder]:
        return [o for o in self._orders.values() if ticker is None or o.ticker == ticker]

    def place(self, ticker: str, side: str, price: int, count: int, queue_ahead: int, now: float,
              expires_ts: float | None = None) -> RestingOrder | None:
        coid = f"{CLIENT_ID_PREFIX}{uuid.uuid4().hex[:20]}"
        try:
            o = self.client.create_order(
                ticker, side, count, price, coid, post_only=True, price_field=self.price_field,
                expiration_ts=int(expires_ts) if expires_ts is not None else None,
            )
        except KalshiAPIError as exc:
            # Post-only orders that would cross are rejected; that is expected now and then.
            log.info("order rejected %s %s %d@%d: %s", ticker, side, count, price, exc.body[:200])
            return None
        oid = o.get("order_id")
        if not oid:
            return None
        status = (o.get("status") or "").lower()
        remaining = get_count(o, "remaining_count")
        if remaining is None:
            remaining = count
        order = RestingOrder(oid, ticker, side, price, remaining, now)
        if status == "resting" and remaining > 0:
            self._orders[oid] = order
        return order

    def cancel(self, order: RestingOrder) -> bool:
        try:
            self.client.cancel_order(order.order_id)
        except KalshiAPIError as exc:
            if exc.status != 404:
                log.warning("cancel %s failed: %s", order.order_id, exc)
                return False
        self._orders.pop(order.order_id, None)
        return True

    def cancel_all(self) -> None:
        for o in list(self._orders.values()):
            self.cancel(o)

    def cash_cents(self) -> float:
        return self._balance

    def equity_cents(self) -> float:
        if self._baseline is None:
            return self._balance + self.ledger.open_cost(self.mode)
        return self._baseline + self.ledger.realized_pnl(self.mode) - self._realized_at_baseline

    def api_total_cents(self) -> float | None:
        return self._api_total


# -------------------------------------------------------------------------- paper


class PaperBroker:
    """Simulated maker orders against the real public trade tape.

    A resting YES bid at p fills when a taker buys NO and the trade prints at a
    YES price at or below p (and symmetrically for NO bids). At our exact price
    we first wait out the size that was already queued ahead of us.
    """

    mode = "dry_run"

    def __init__(self, client: KalshiClient, ledger: Ledger, fees: FeesConfig, paper: PaperConfig):
        self.client = client
        self.ledger = ledger
        self.fees = fees
        self.paper = paper
        self._orders: dict[str, RestingOrder] = {}
        # Cancelled orders stay matchable for trades that printed before the cancel,
        # so fetching the tape every few seconds (Kalshi rate-limits it) loses nothing.
        self._cancelled: dict[str, tuple[RestingOrder, float]] = {}
        self._seen: dict[str, set[str]] = {}
        self._last_fetch: dict[str, float] = {}
        self._last_trade_ts: dict[str, float] = {}
        self._tape_interval = paper.trades_poll_sec  # adapts to Kalshi's rate limit
        self._now = 0.0

    def start(self) -> None:
        if self.ledger.get_state(self.mode, "paper_start_cents") is None:
            self.ledger.set_state(self.mode, "paper_start_cents", self.paper.starting_balance_usd * 100)

    def set_baseline(self) -> None:
        pass

    def _starting(self) -> float:
        v = self.ledger.get_state(self.mode, "paper_start_cents")
        return float(v if v is not None else self.paper.starting_balance_usd * 100)

    def _candidates(self) -> list[RestingOrder]:
        return list(self._orders.values()) + [o for o, _ in self._cancelled.values()]

    def sync(self, now: float) -> list[Fill]:
        self._now = now
        keep = self.paper.keep_cancelled_sec
        self._cancelled = {k: v for k, v in self._cancelled.items() if now - v[1] <= keep}
        new: list[Fill] = []
        candidates = self._candidates()
        tickers = sorted({o.ticker for o in candidates})
        for t in list(self._seen):
            if t not in tickers:
                del self._seen[t]
                self._last_trade_ts.pop(t, None)
        # One tape request per tick, oldest-fetched market first: spreads requests
        # evenly instead of bursting one per market.
        due = [t for t in tickers if now - self._last_fetch.get(t, 0.0) >= self._tape_interval]
        due.sort(key=lambda t: self._last_fetch.get(t, 0.0))
        for ticker in due[:1]:
            self._last_fetch[ticker] = now
            # Only trades newer than what we have already seen (minus a little overlap).
            since = min(o.created_ts for o in candidates if o.ticker == ticker)
            since = max(since, self._last_trade_ts.get(ticker, 0.0) - 2)
            try:
                raw = self._fetch_tape(ticker, int(since) - 1)
            except KalshiAPIError as exc:
                if exc.status == 429:
                    # Back off for every market (the limit is shared), recover slowly on success.
                    self._tape_interval = min(30.0, max(self._tape_interval, 1.0) * 1.5)
                    log.info("paper: trade tape rate-limited; polling each market every %.0fs", self._tape_interval)
                else:
                    log.info("paper: trades for %s failed (will retry): %s", ticker, exc)
                continue
            except Exception as exc:  # noqa: BLE001
                log.info("paper: trades for %s failed (will retry): %s", ticker, exc)
                continue
            self._tape_interval = max(self.paper.trades_poll_sec, self._tape_interval * 0.97)
            seen = self._seen.setdefault(ticker, set())
            trades = sorted((parse_trade(t) for t in raw), key=lambda t: t.ts)
            for tr in trades:
                self._last_trade_ts[ticker] = max(self._last_trade_ts.get(ticker, 0.0), tr.ts)
                if tr.trade_id in seen:
                    continue
                seen.add(tr.trade_id)
                new.extend(self.apply_trade(tr))
        return new

    def _fetch_tape(self, ticker: str, min_ts: int, limit: int = 1000) -> list[dict]:
        # A single request: following pages back-to-back bursts into the rate limit.
        data = self.client.get_trades(ticker, min_ts=min_ts, limit=limit, retries=0)
        trades = data.get("trades") or []
        if len(trades) >= limit:
            log.debug("paper: %s tape page full; older trades in this interval are skipped", ticker)
        return trades

    def apply_trade(self, tr) -> list[Fill]:
        if tr.taker_side == "no":
            hit_side, level = "yes", tr.yes_price
        elif tr.taker_side == "yes":
            hit_side, level = "no", 100 - tr.yes_price
        else:
            return []
        fills: list[Fill] = []
        for o in self._candidates():
            if o.ticker != tr.ticker or o.side != hit_side or tr.ts < o.created_ts or o.remaining <= 0:
                continue
            cancelled = self._cancelled.get(o.order_id)
            if cancelled is not None and tr.ts >= cancelled[1]:
                continue  # printed after we pulled the order
            qty = 0
            if o.price > level:
                qty = min(o.remaining, int(tr.count))
            elif o.price == level and self.paper.fill_at_touch:
                if tr.count <= o.queue_ahead:
                    o.queue_ahead -= tr.count
                else:
                    qty = min(o.remaining, int(tr.count - o.queue_ahead))
                    o.queue_ahead = 0.0
            if qty <= 0:
                continue
            fill = Fill(
                fill_key=f"paper-{tr.trade_id}-{o.order_id}",
                order_id=o.order_id,
                ticker=o.ticker,
                side=o.side,
                price=o.price,
                count=qty,
                is_taker=False,
                ts=tr.ts,
            )
            if self.ledger.record_fill(self.mode, fill, fee_cents(self.fees.maker_rate, qty, o.price)):
                fills.append(fill)
            o.remaining -= qty
            if o.remaining <= 0:
                self._orders.pop(o.order_id, None)
                self._cancelled.pop(o.order_id, None)
        return fills

    def resting(self, ticker: str | None = None) -> list[RestingOrder]:
        return [o for o in self._orders.values() if ticker is None or o.ticker == ticker]

    def place(self, ticker: str, side: str, price: int, count: int, queue_ahead: int, now: float,
              expires_ts: float | None = None) -> RestingOrder | None:
        if count <= 0:
            return None
        self._now = max(self._now, now)
        o = RestingOrder(f"paper-{uuid.uuid4().hex[:16]}", ticker, side, price, count, now, queue_ahead)
        self._orders[o.order_id] = o
        return o

    def cancel(self, order: RestingOrder) -> bool:
        o = self._orders.pop(order.order_id, None)
        if o is not None:
            self._cancelled[o.order_id] = (o, self._now)
        return True

    def cancel_all(self) -> None:
        for o in list(self._orders.values()):
            self.cancel(o)

    def cash_cents(self) -> float:
        return self._starting() + self.ledger.realized_pnl(self.mode) - self.ledger.open_cost(self.mode)

    def equity_cents(self) -> float:
        return self._starting() + self.ledger.realized_pnl(self.mode)
