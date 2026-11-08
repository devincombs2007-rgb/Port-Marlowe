from kalshi_bot.analyze import breakdown, report
from kalshi_bot.kalshi_client import Fill, MarketInfo
from kalshi_bot.ledger import Ledger

T0 = 1_800_000_000.0


def test_report_collapses_fills_per_market(tmp_path):
    led = Ledger(str(tmp_path / "a.sqlite"))
    for i, result in enumerate(["yes", "no", "yes"]):
        t = f"KXBTC15M-{i}"
        close = T0 + 900 * (i + 1)
        led.upsert_market(MarketInfo(t, "KXBTC15M", "settled", close - 900, close, "greater_or_equal", 1.0, None, result, {}))
        for j in range(5):  # five fills in the same market count as one observation
            led.record_fill("dry_run", Fill(f"{i}-{j}", None, t, "yes", 40, 2, False, close - 120), 0)
        led.settle("dry_run", t, result, close, close + 30)
    from kalshi_bot.analyze import settled_fills
    fills = settled_fills(led, "dry_run")
    rows = {r["bucket"]: r for r in breakdown(fills, lambda f: f["series"])}
    r = rows["KXBTC15M"]
    assert r["markets"] == 3 and r["contracts"] == 30
    assert r["pnl_cents"] == 10 * 60 * 2 - 10 * 40  # two winning markets, one losing
    text = report(led, "dry_run")
    assert "15 settled fills over 3 markets" in text and "under 3 min" in text
    assert report(led, "live").startswith("no settled fills")
