from datetime import datetime

import pytest

from kalshi_bot.kalshi_client import Fill, MarketInfo
from kalshi_bot.ledger import ET, Ledger, Position, fee_cents


def mk_fill(key, ticker, side, price, count, ts=1_000.0):
    return Fill(key, None, ticker, side, price, count, False, ts)


def market(ticker, close_ts):
    return MarketInfo(ticker, "KXBTC15M", "open", close_ts - 900, close_ts, "greater_or_equal", 100.0, None, None, {})


def test_fee_formula():
    assert fee_cents(0.07, 1, 50) == 2  # 1.75c rounds up
    assert fee_cents(0.07, 100, 50) == 175
    assert fee_cents(0.0, 100, 50) == 0


def test_position_worst_case():
    p = Position("T").with_buy("yes", 40, 10).with_buy("no", 55, 4)
    assert p.pnl_if("yes") == 1000 - 620
    assert p.pnl_if("no") == 400 - 620
    assert p.worst_case_loss == 220
    hedged = Position("T").with_buy("yes", 45, 5).with_buy("no", 50, 5)
    assert hedged.worst_case_loss == 0 and hedged.pnl_if("yes") == hedged.pnl_if("no") == 25


def test_fills_settle_and_bucket_by_et_day(tmp_path):
    led = Ledger(str(tmp_path / "t.sqlite"))
    close = datetime(2026, 11, 2, 23, 30, tzinfo=ET).timestamp()
    led.upsert_market(market("A", close))
    assert led.record_fill("dry_run", mk_fill("f1", "A", "yes", 40, 10), 0)
    assert not led.record_fill("dry_run", mk_fill("f1", "A", "yes", 40, 10), 0)  # dedupe
    led.record_fill("dry_run", mk_fill("f2", "A", "no", 52, 10), 0)
    led.record_fill("live", mk_fill("f1", "A", "yes", 40, 1), 0)  # other mode, separate
    assert led.position("dry_run", "A").net_yes == 0
    assert led.open_cost("dry_run") == 920

    s = led.settle("dry_run", "A", "no", close, close + 60)
    assert s.pnl_cents == 1000 - 920
    assert led.settle("dry_run", "A", "no", close, close + 60) is None
    assert led.open_positions("dry_run") == {}
    assert led.realized_pnl("dry_run") == 80
    assert led.daily_pnl("dry_run") == {"2026-11-02": {"pnl_cents": 80.0, "markets": 1, "wins": 1}}
    assert "A" in led.open_positions("live")


def test_state_roundtrip(tmp_path):
    led = Ledger(str(tmp_path / "t.sqlite"))
    assert led.get_state("dry_run", "x", 5) == 5
    led.set_state("dry_run", "x", {"a": 1})
    assert led.get_state("dry_run", "x") == {"a": 1}
    with pytest.raises(ValueError):
        led.settle("dry_run", "A", "maybe", 0, 0)
