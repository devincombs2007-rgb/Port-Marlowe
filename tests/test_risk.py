from kalshi_bot.config import RiskConfig, SizingConfig
from kalshi_bot.ledger import Position
from kalshi_bot.risk import RiskManager


def rm(tmp_path, **sizing):
    return RiskManager(RiskConfig(kill_file=str(tmp_path / "KILL")), SizingConfig(**sizing))


def test_daily_loss_and_drawdown(tmp_path):
    r = rm(tmp_path)
    assert r.stop_reason(10_000, 10_000, 10_000) is None
    assert "daily loss" in r.stop_reason(8_900, 10_000, 10_000)
    reason = r.stop_reason(7_400, 7_500, 10_000)
    assert reason.startswith("max drawdown") and r.is_persistent(reason)
    assert "halted" in r.stop_reason(10_000, 10_000, 10_000, halted="x")


def test_kill_file(tmp_path):
    r = rm(tmp_path)
    (tmp_path / "KILL").write_text("")
    assert "kill file" in r.stop_reason(10_000, 10_000, 10_000)


def test_order_size_respects_fraction_and_caps(tmp_path):
    r = rm(tmp_path, order_fraction=0.02, max_contracts=100, max_market_loss_fraction=0.06,
           max_total_exposure_fraction=0.30)
    flat = Position("T")
    # $100 equity, 2% = $2 -> 4 contracts at 50c
    assert r.order_size("yes", 50, 10_000, flat, 0, 10_000) == 4
    # Already long 10 YES @50 (worst case -$5 of a $6 cap): only 2 more fit.
    long = flat.with_buy("yes", 50, 10)
    assert r.order_size("yes", 50, 10_000, long, long.worst_case_loss, 10_000) == 2
    # Buying NO reduces risk, so it is not blocked by the market cap.
    assert r.order_size("no", 45, 10_000, long, long.worst_case_loss, 10_000) == 4
    # Cash bounds the order.
    assert r.order_size("yes", 50, 10_000, flat, 0, 120) == 2
    # Total exposure cap.
    assert r.order_size("yes", 50, 10_000, flat, 2_950, 10_000) == 1
    assert r.order_size("yes", 50, 10_000, flat, 3_000, 10_000) == 0


def test_min_contracts_floor(tmp_path):
    r = rm(tmp_path, order_fraction=0.02, min_contracts=1)
    # $5 equity -> 2% is 10c, under one contract at 40c, but min_contracts=1 and caps allow 40c? 6% of 500 = 30c: no.
    assert r.order_size("yes", 40, 500, Position("T"), 0, 500) == 0
    assert r.order_size("yes", 20, 500, Position("T"), 0, 500) == 1
