from kalshi_bot.config import FeesConfig, PaperConfig
from kalshi_bot.ledger import Ledger
from kalshi_bot.broker import PaperBroker

from .fakes import FakeKalshi

T0 = 1_800_000_000.0


def setup(tmp_path, at_touch=True):
    k = FakeKalshi()
    led = Ledger(str(tmp_path / "p.sqlite"))
    b = PaperBroker(k, led, FeesConfig(), PaperConfig(starting_balance_usd=100, fill_at_touch=at_touch))
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
