"""The trading loop: find the live 15-minute window for each series, price it, and
keep one maker bid per side resting at the right price and size."""

from __future__ import annotations

import logging
import threading
import time
from typing import Any, Callable

import requests

from .broker import Broker, RestingOrder, resting_cost
from .config import Config, MarketSpec
from .kalshi_client import KalshiAPIError, KalshiClient, MarketInfo, parse_market, parse_orderbook
from .ledger import Ledger, et_date
from .model import fair_yes_probability
from .risk import RiskManager
from .spot import SpotFeed, VolEstimator
from .strategy import book_top, compute_quotes, should_replace

log = logging.getLogger(__name__)


class Engine:
    def __init__(
        self,
        cfg: Config,
        client: KalshiClient,
        broker: Broker,
        ledger: Ledger,
        feed: SpotFeed,
        vol: VolEstimator,
        risk: RiskManager,
        clock: Callable[[], float] = time.time,
    ):
        self.cfg = cfg
        self.client = client
        self.broker = broker
        self.ledger = ledger
        self.feed = feed
        self.vol = vol
        self.risk = risk
        self.clock = clock
        self.mode = broker.mode
        self._markets: dict[str, list[MarketInfo]] = {}
        self._markets_fetched: dict[str, float] = {}
        self._known_tickers: set[str] = set()
        self._shock_until: dict[str, float] = {}
        self._settle_checked: dict[str, float] = {}
        self._last_equity_record = 0.0
        self._last_stop_reason: str | None = None
        self._day: str | None = ledger.get_state(self.mode, "day")
        self._day_start: float | None = ledger.get_state(self.mode, "day_start_equity")
        self._peak: float | None = ledger.get_state(self.mode, "peak_equity")
        self._stop = threading.Event()
        self.market_status: dict[str, dict[str, Any]] = {}

    # ------------------------------------------------------------------ lifecycle

    def stop(self) -> None:
        self._stop.set()

    def startup(self, now: float | None = None) -> None:
        """Book anything that settled while we were down, then fix the equity baseline."""
        now = self.clock() if now is None else now
        self._settle(now, force=True)
        self.broker.set_baseline()

    def run(self) -> None:
        failures = 0
        try:
            self.startup()
            while not self._stop.is_set():
                started = self.clock()
                try:
                    self.tick()
                    failures = 0
                except Exception as exc:  # noqa: BLE001 - keep the loop alive, but pull quotes
                    failures += 1
                    if isinstance(exc, (requests.RequestException, KalshiAPIError)):
                        log.warning("tick failed (%d in a row): %s", failures, exc)
                    else:
                        log.exception("tick failed (%d in a row)", failures)
                    if failures >= 3:
                        self._safe_cancel_all()
                self._stop.wait(max(0.0, self.cfg.poll_interval_sec - (self.clock() - started)))
        finally:
            log.info("shutting down: cancelling resting orders")
            self._safe_cancel_all()

    def _safe_cancel_all(self) -> None:
        try:
            self.broker.cancel_all()
        except Exception:  # noqa: BLE001
            log.exception("cancel_all failed; check open orders on Kalshi manually")

    # ----------------------------------------------------------------------- tick

    def tick(self, now: float | None = None) -> None:
        now = self.clock() if now is None else now
        for f in self.broker.sync(now):
            log.info("FILL %s %s %d @ %dc", f.ticker, f.side.upper(), f.count, f.price)
        self._settle(now)

        equity = self.broker.equity_cents()
        self._update_day_state(now, equity)
        self._record_equity(now, equity)

        halted = self.ledger.get_state(self.mode, "halted")
        reason = self.risk.stop_reason(equity, self._day_start or equity, self._peak or equity, halted)
        if reason:
            if reason != self._last_stop_reason:
                log.warning("not quoting: %s", reason)
            if not halted and self.risk.is_persistent(reason):
                self.ledger.set_state(self.mode, "halted", reason)
            self._last_stop_reason = reason
            self.broker.cancel_all()
            self._publish_status(now, equity, reason)
            return
        if self._last_stop_reason:
            log.info("quoting resumed")
        self._last_stop_reason = None

        budget = self.cfg.strategy.max_places_per_tick
        active: set[str] = set()
        self.market_status = {}
        for spec in self.cfg.enabled_markets():
            if self._stop.is_set():
                break
            try:
                market = self._active_market(spec, now)
                if market is None:
                    continue
                active.add(market.ticker)
                budget = self._quote(spec, market, now, equity, budget)
            except Exception as exc:  # noqa: BLE001
                if isinstance(exc, (requests.RequestException, KalshiAPIError)):
                    log.warning("quoting %s failed (%s); pulling its orders", spec.series, exc)
                else:
                    log.exception("quoting %s failed; pulling its orders", spec.series)
                for o in self.broker.resting():
                    if o.ticker.startswith(spec.series):
                        self.broker.cancel(o)
        for o in self.broker.resting():
            if o.ticker not in active:
                self.broker.cancel(o)
        self._publish_status(now, equity, None)

    # -------------------------------------------------------------------- markets

    def _active_market(self, spec: MarketSpec, now: float) -> MarketInfo | None:
        def pick() -> MarketInfo | None:
            live = [
                m
                for m in self._markets.get(spec.series, [])
                if m.close_ts > now and (m.open_ts is None or m.open_ts <= now) and m.strike is not None
            ]
            return min(live, key=lambda m: m.close_ts) if live else None

        fetched = self._markets_fetched.get(spec.series, 0.0)
        market = pick()
        if (market is None and now - fetched > 3) or now - fetched > self.cfg.market_refresh_sec:
            data = self.client.get_markets(series_ticker=spec.series, status="open", limit=100)
            self._markets[spec.series] = [parse_market(m, spec.series) for m in data.get("markets") or []]
            self._markets_fetched[spec.series] = now
            market = pick()
            if market is None:
                log.debug("no open window for %s", spec.series)
        if market is not None and market.ticker not in self._known_tickers:
            self.ledger.upsert_market(market)
            self._known_tickers.add(market.ticker)
            log.info("tracking %s strike=%s closes in %.0fs", market.ticker, market.strike, market.close_ts - now)
        return market

    # -------------------------------------------------------------------- quoting

    def _pull(self, orders: list[RestingOrder], ticker: str, why: str, budget: int) -> int:
        for o in orders:
            self.broker.cancel(o)
        self.market_status[ticker] = {"quoting": False, "reason": why}
        return budget

    def _quote(self, spec: MarketSpec, m: MarketInfo, now: float, equity: float, budget: int) -> int:
        s = self.cfg.strategy
        ticker = m.ticker
        own = self.broker.resting(ticker)
        tau = m.close_ts - now
        if tau < s.min_seconds_to_close:
            return self._pull(own, ticker, f"{tau:.0f}s to close", budget)
        if m.open_ts is not None and now - m.open_ts < s.min_seconds_since_open:
            return self._pull(own, ticker, "window just opened", budget)

        spot = self.feed.price(spec.symbol, now)
        if spot is None:
            return self._pull(own, ticker, "spot price stale", budget)
        sigma = self.vol.sigma(spec.symbol)
        if sigma is None:
            return self._pull(own, ticker, "volatility warming up", budget)
        if now < self._shock_until.get(spec.symbol, 0.0):
            return self._pull(own, ticker, "cooling down after price shock", budget)
        z = self.feed.move_zscore(spec.symbol, s.shock_lookback_sec, sigma * s.vol_multiplier, now)
        if z > s.shock_sigma:
            self._shock_until[spec.symbol] = now + s.shock_cooldown_sec
            log.info("%s moved %.1f sd in %ds: pulling quotes", spec.symbol, z, s.shock_lookback_sec)
            return self._pull(own, ticker, "price shock", budget)

        window = s.settlement_window_sec
        realized = self.feed.window_average(spec.symbol, m.close_ts - window, now) if tau < window else None
        fair = fair_yes_probability(
            spot=spot,
            strike_type=m.strike_type,
            floor_strike=m.floor_strike,
            cap_strike=m.cap_strike,
            tau=tau,
            sigma=sigma,
            window=window,
            realized_avg=realized,
            vol_multiplier=s.vol_multiplier,
        )

        yes_levels, no_levels = parse_orderbook(self.client.get_orderbook(ticker))
        own_yes: dict[int, int] = {}
        own_no: dict[int, int] = {}
        for o in own:
            book = own_yes if o.side == "yes" else own_no
            book[o.price] = book.get(o.price, 0) + o.remaining
        top = book_top(yes_levels, no_levels, own_yes, own_no)
        pos = self.ledger.position(self.mode, ticker)
        targets = compute_quotes(fair, top, pos.net_yes, s)

        all_resting = self.broker.resting()
        exposure = sum(p.worst_case_loss for p in self.ledger.open_positions(self.mode).values())
        exposure += resting_cost(all_resting)
        cash = self.broker.cash_cents() - resting_cost(all_resting)
        expires = m.close_ts - s.min_seconds_to_close if self.cfg.use_order_expiration else None

        placed: dict[str, Any] = {}
        for side, target, levels, mine in (
            ("yes", targets.yes_price, yes_levels, own_yes),
            ("no", targets.no_price, no_levels, own_no),
        ):
            side_orders = [o for o in own if o.side == side]
            if target is None:
                for o in side_orders:
                    self.broker.cancel(o)
                continue
            side_cost = resting_cost(side_orders)
            count = self.risk.order_size(side, target, equity, pos, exposure - side_cost, cash + side_cost)
            keep: RestingOrder | None = None
            for o in side_orders:
                if keep is None and count > 0 and o.remaining <= count and not should_replace(
                    o.price, target, s.reprice_threshold_cents
                ):
                    keep = o
                else:
                    self.broker.cancel(o)
            if keep is not None:
                placed[side] = {"price": keep.price, "count": keep.remaining, "kept": True}
                continue
            if count <= 0 or budget <= 0:
                continue
            level_qty = next((q for p, q in levels if p == target), 0)
            queue_ahead = max(0, level_qty - mine.get(target, 0))
            order = self.broker.place(ticker, side, target, count, queue_ahead, now, expires)
            budget -= 1
            if order is not None:
                placed[side] = {"price": target, "count": count, "kept": False}
                log.debug("quote %s %s %d @ %dc (fair %.3f)", ticker, side, count, target, fair)

        self.market_status[ticker] = {
            "quoting": True,
            "series": spec.series,
            "spot": spot,
            "strike": m.strike,
            "tau": round(tau),
            "fair": round(fair, 4),
            "sigma_annual": round(sigma * (365 * 24 * 3600) ** 0.5, 3),
            "best_yes_bid": top.yes_bid,
            "best_no_bid": top.no_bid,
            "orders": placed,
            "note": targets.reason,
            "position": {"yes": pos.yes_count, "no": pos.no_count, "cost_cents": pos.cost},
        }
        return budget

    # ----------------------------------------------------------------- settlement

    def _settle(self, now: float, force: bool = False) -> None:
        for ticker in self.ledger.open_positions(self.mode):
            meta = self.ledger.market_meta(ticker) or {}
            close_ts = meta.get("close_ts")
            if close_ts is not None and now < close_ts + 5:
                continue
            if not force and now - self._settle_checked.get(ticker, 0.0) < 10:
                continue
            self._settle_checked[ticker] = now
            try:
                m = parse_market(self.client.get_market(ticker))
            except Exception as exc:  # noqa: BLE001
                log.warning("settlement lookup for %s failed: %s", ticker, exc)
                continue
            if not m.is_determined:
                continue
            s = self.ledger.settle(self.mode, ticker, m.result or "", m.close_ts or now, now)
            if s is not None:
                log.info(
                    "SETTLED %s -> %s | yes %d no %d | cost %.2f payout %.2f | P&L %+.2f USD",
                    ticker, s.result.upper(), s.yes_count, s.no_count, s.cost_cents / 100,
                    s.payout_cents / 100, s.pnl_cents / 100,
                )

    # ---------------------------------------------------------------- bookkeeping

    def _update_day_state(self, now: float, equity: float) -> None:
        today = et_date(now)
        if self._day != today or self._day_start is None:
            self._day, self._day_start = today, equity
            self.ledger.set_state(self.mode, "day", today)
            self.ledger.set_state(self.mode, "day_start_equity", equity)
        if self._peak is None or equity > self._peak:
            self._peak = equity
            self.ledger.set_state(self.mode, "peak_equity", equity)

    def _record_equity(self, now: float, equity: float) -> None:
        if now - self._last_equity_record >= 60:
            self.ledger.record_equity(self.mode, now, equity, self.broker.cash_cents())
            self._last_equity_record = now

    def _publish_status(self, now: float, equity: float, stop_reason: str | None) -> None:
        self.ledger.set_state(
            self.mode,
            "status",
            {
                "ts": now,
                "equity_cents": equity,
                "cash_cents": self.broker.cash_cents(),
                "day_start_equity_cents": self._day_start,
                "peak_equity_cents": self._peak,
                "stop_reason": stop_reason,
                "markets": self.market_status,
                "resting_orders": len(self.broker.resting()),
            },
        )
