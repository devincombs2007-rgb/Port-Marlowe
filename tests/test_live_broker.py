from kalshi_bot.broker import LiveBroker
from kalshi_bot.config import Config, FeesConfig, MarketSpec, RiskConfig
from kalshi_bot.engine import Engine
from kalshi_bot.kalshi_client import Fill, MarketInfo
from kalshi_bot.ledger import Ledger
from kalshi_bot.risk import RiskManager

from .fakes import FakeFeed, FakeVol, iso

NOW = 1_800_000_000.0


class FakeAccount:
    def __init__(self):
        self.balance = 10_000
        self.orders = []
        self.fills = []
        self.markets = {}
        self.created = []
        self.cancelled = []

    def get_balance(self):
        return {"balance": self.balance}

    def get_orders(self, **_):
        return list(self.orders)

    def get_fills(self, min_ts=None, **_):
        return list(self.fills)

    def get_market(self, ticker):
        return self.markets[ticker]

    def create_order(self, ticker, side, count, price, coid, **kw):
        self.created.append((ticker, side, count, price, coid, kw))
        o = {"order_id": f"o{len(self.created)}", "client_order_id": coid, "ticker": ticker, "side": side,
             "status": "resting", "remaining_count": count, f"{side}_price": price}
        self.orders.append(o)
        return o

    def cancel_order(self, oid):
        self.cancelled.append(oid)
        self.orders = [o for o in self.orders if o["order_id"] != oid]
        return {}


def test_only_manages_own_orders_and_filters_fills(tmp_path):
    acct = FakeAccount()
    acct.orders = [
        {"order_id": "mine", "client_order_id": "kb-1", "ticker": "KXBTC15M-A", "side": "yes", "yes_price": 40,
         "remaining_count": 3},
        {"order_id": "manual", "client_order_id": "", "ticker": "KXBTC15M-A", "side": "no", "no_price": 30,
         "remaining_count": 3},
    ]
    acct.fills = [
        {"trade_id": "f1", "ticker": "KXBTC15M-A", "side": "no", "action": "sell", "count": 2, "yes_price": 55,
         "is_taker": True, "created_time": iso(NOW + 10)},
        {"trade_id": "f2", "ticker": "OTHER-X", "side": "yes", "action": "buy", "count": 9, "yes_price": 10,
         "created_time": iso(NOW + 11)},
    ]
    led = Ledger(str(tmp_path / "l.sqlite"))
    b = LiveBroker(acct, led, FeesConfig(), ["KXBTC15M"])
    b._last_fill_ts = NOW
    new = b.sync(NOW + 20)
    assert [(f.ticker, f.side, f.price, f.count) for f in new] == [("KXBTC15M-A", "yes", 55, 2)]
    assert led.fill_stats("live")["fees_cents"] == 4  # taker fee: ceil(0.07 * 2 * 55 * 45 / 100) cents
    assert [o.order_id for o in b.resting()] == ["mine"]
    b.cancel_all()
    assert acct.cancelled == ["mine"]


def test_restart_books_offline_settlements_before_baseline(tmp_path):
    acct = FakeAccount()
    led = Ledger(str(tmp_path / "l.sqlite"))
    close = NOW - 600
    led.upsert_market(MarketInfo("KXBTC15M-A", "KXBTC15M", "settled", close - 900, close, "greater_or_equal", 1.0,
                                 None, None, {}))
    led.record_fill("live", Fill("old", None, "KXBTC15M-A", "yes", 40, 10, False, close - 300), 0)
    acct.markets["KXBTC15M-A"] = {"ticker": "KXBTC15M-A", "close_time": iso(close), "status": "settled",
                                  "result": "yes", "floor_strike": 1.0}
    acct.balance = 10_000  # already includes the $10 payout received while the bot was down

    cfg = Config(markets=[MarketSpec("KXBTC15M", "BTC")], db_path=str(tmp_path / "l.sqlite"))
    cfg.risk = RiskConfig(kill_file=str(tmp_path / "KILL"))
    broker = LiveBroker(acct, led, cfg.fees, ["KXBTC15M"])
    broker.start()
    eng = Engine(cfg, acct, broker, led, FakeFeed({}), FakeVol(None), RiskManager(cfg.risk, cfg.sizing),
                 clock=lambda: NOW)
    eng.startup(NOW)
    assert led.realized_pnl("live") == 600
    assert broker.equity_cents() == 10_000  # not double counted

    # A new 5 x 50c YES fill: cash drops, equity (at cost) does not.
    acct.fills = [{"trade_id": "n1", "ticker": "KXBTC15M-B", "side": "yes", "action": "buy", "count": 5,
                   "yes_price": 50, "created_time": iso(NOW + 5)}]
    acct.balance -= 250
    broker.sync(NOW + 6)
    assert broker.cash_cents() == 9_750
    assert broker.equity_cents() == 10_000
