from kalshi_bot.config import FeesConfig, PaperConfig
from kalshi_bot.ledger import Ledger
from kalshi_bot.broker import PaperBroker

from .fakes import FakeKalshi

T0 = 1_800_000_000.0


def setup(tmp_path, at_touch=True):
    k = FakeKalshi()
    led = Ledger(str(tmp_path / "p.sqlite"))
    b = PaperBroker(k, led, FeesConfig(), PaperConfig(starting_balance_usd=100, fill_at_touch=at_touch,
                                                      trades_poll_sec=0))
    b.start()
    return k, led, b


def test_trade_through_fills_and_same_side_taker_does_not(tmp_path):
    k, led, b = setup(tmp_path)
    o = b.place("T", "yes", 45, 10, queue_ahead=0, now=T0)
    k.add_trade("T", "a", 50, 5, "yes", T0 + 1)  # taker bought YES: hits NO bids, not ours
    k.add_trade("T", "b", 44, 4, "no", T0 + 2)  # taker sold through 45 -> we fill 4
    fills = b.sync(T0 + 3)
    assert [(f.side, f.price, f.count) for f in fills] == [("yes", 45, 4)]
    assert o.remaining == 6
    assert b.sync(T0 + 4) == []  # trades are only applied once
    assert led.position("dry_run", "T").yes_count == 4
    assert b.cash_cents() == 10_000 - 180
    assert b.equity_cents() == 10_000


def test_queue_at_touch(tmp_path):
    k, led, b = setup(tmp_path)
    b.place("T", "no", 52, 10, queue_ahead=6, now=T0)
    # A YES taker at yes_price 48 trades against NO bids at 52 (our level).
    k.add_trade("T", "a", 48, 4, "yes", T0 + 1)
    assert b.sync(T0 + 2) == []  # 2 still ahead of us
    k.add_trade("T", "b", 48, 5, "yes", T0 + 3)
    fills = b.sync(T0 + 4)
    assert [(f.side, f.price, f.count) for f in fills] == [("no", 52, 3)]


def test_conservative_mode_ignores_touch(tmp_path):
    k, led, b = setup(tmp_path, at_touch=False)
    b.place("T", "no", 52, 10, queue_ahead=0, now=T0)
    k.add_trade("T", "a", 48, 4, "yes", T0 + 1)
    assert b.sync(T0 + 2) == []


def test_trades_before_order_are_ignored(tmp_path):
    k, led, b = setup(tmp_path)
    k.add_trade("T", "old", 40, 50, "no", T0 - 0.5)
    b.place("T", "yes", 45, 10, queue_ahead=0, now=T0)
    assert b.sync(T0 + 1) == []


def test_full_fill_removes_order(tmp_path):
    k, led, b = setup(tmp_path)
    b.place("T", "yes", 45, 3, queue_ahead=0, now=T0)
    k.add_trade("T", "a", 40, 10, "no", T0 + 1)
    b.sync(T0 + 2)
    assert b.resting() == []


def test_cancelled_order_still_fills_on_trades_from_before_the_cancel(tmp_path):
    k, led, b = setup(tmp_path)
    b.sync(T0)
    o = b.place("T", "yes", 45, 10, queue_ahead=0, now=T0)
    k.add_trade("T", "before", 44, 3, "no", T0 + 1)  # printed while the order rested
    b.sync(T0 + 2)  # (pretend the tape was not fetched yet) - this fetch applies it
    assert led.position("dry_run", "T").yes_count == 3
    b.cancel(o)  # cancelled at T0 + 2
    k.add_trade("T", "after", 40, 5, "no", T0 + 3)  # after the cancel: must not fill
    b.sync(T0 + 4)
    assert led.position("dry_run", "T").yes_count == 3


def test_late_fetch_after_cancel_still_counts_earlier_trade(tmp_path):
    k = FakeKalshi()
    led = Ledger(str(tmp_path / "t.sqlite"))
    b = PaperBroker(k, led, FeesConfig(), PaperConfig(trades_poll_sec=6))
    b.start()
    o = b.place("T", "yes", 45, 10, queue_ahead=0, now=T0)
    b.sync(T0 + 0.5)  # first fetch: nothing yet
    k.add_trade("T", "x", 44, 4, "no", T0 + 1)  # sells through our bid while it rests
    b.sync(T0 + 2)  # throttled: tape not fetched
    b.cancel(o)  # pulled at T0 + 2, before we ever saw the trade
    fills = b.sync(T0 + 7)  # next fetch finds it
    assert [(f.side, f.price, f.count) for f in fills] == [("yes", 45, 4)]
    assert b.resting() == []


def test_tape_fetch_is_throttled(tmp_path):
    k = FakeKalshi()
    calls = []
    real = k.get_trades
    k.get_trades = lambda *a, **kw: (calls.append(1), real(*a, **kw))[1]
    led = Ledger(str(tmp_path / "t.sqlite"))
    b = PaperBroker(k, led, FeesConfig(), PaperConfig(trades_poll_sec=6))
    b.start()
    b.place("T", "yes", 45, 10, queue_ahead=0, now=T0)
    b.sync(T0 + 1)
    b.sync(T0 + 3)
    b.sync(T0 + 8)
    assert len(calls) == 2


def test_tape_is_fetched_incrementally(tmp_path):
    k = FakeKalshi()
    seen_min_ts = []
    real = k.get_trades
    k.get_trades = lambda ticker, min_ts=None, **kw: (seen_min_ts.append(min_ts), real(ticker, min_ts=min_ts, **kw))[1]
    led = Ledger(str(tmp_path / "t.sqlite"))
    b = PaperBroker(k, led, FeesConfig(), PaperConfig(trades_poll_sec=0))
    b.start()
    b.place("T", "yes", 30, 10, queue_ahead=0, now=T0)
    k.add_trade("T", "a", 50, 1, "no", T0 + 100)
    b.sync(T0 + 101)
    b.sync(T0 + 200)
    assert seen_min_ts[0] == int(T0) - 1
    assert seen_min_ts[1] == int(T0 + 100 - 2) - 1  # starts just before the last trade seen


def test_tape_interval_backs_off_on_rate_limit(tmp_path):
    from kalshi_bot.kalshi_client import KalshiAPIError

    k = FakeKalshi()
    fail = [True]
    real = k.get_trades

    def flaky(*a, **kw):
        if fail[0]:
            raise KalshiAPIError(429, "GET", "/markets/trades", "too many requests")
        return real(*a, **kw)

    k.get_trades = flaky
    led = Ledger(str(tmp_path / "t.sqlite"))
    b = PaperBroker(k, led, FeesConfig(), PaperConfig(trades_poll_sec=6, trades_poll_max_sec=30))
    b.start()
    b.place("T", "yes", 45, 10, queue_ahead=0, now=T0)
    b.sync(T0 + 1)
    assert b._tape_interval == 9.0
    b.sync(T0 + 11)
    assert b._tape_interval == 13.5
    fail[0] = False
    b.sync(T0 + 30)
    assert 6 < b._tape_interval < 13.5


def test_one_tape_request_per_sync_round_robin(tmp_path):
    k = FakeKalshi()
    asked = []
    real = k.get_trades
    k.get_trades = lambda ticker, **kw: (asked.append(ticker), real(ticker, **kw))[1]
    led = Ledger(str(tmp_path / "t.sqlite"))
    b = PaperBroker(k, led, FeesConfig(), PaperConfig(trades_poll_sec=0))
    b.start()
    b.place("A", "yes", 45, 1, queue_ahead=0, now=T0)
    b.place("B", "yes", 45, 1, queue_ahead=0, now=T0)
    b.sync(T0 + 1)
    b.sync(T0 + 2)
    b.sync(T0 + 3)
    assert asked == ["A", "B", "A"]
