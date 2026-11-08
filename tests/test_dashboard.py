import json
import threading
import urllib.request
from datetime import datetime
from http.server import ThreadingHTTPServer

from kalshi_bot.dashboard.server import build_summary, make_handler
from kalshi_bot.kalshi_client import Fill, MarketInfo
from kalshi_bot.ledger import ET, Ledger


def seed(path):
    led = Ledger(path)
    for i, (day, result) in enumerate([(1, "no"), (2, "yes"), (2, "yes")]):
        close = datetime(2026, 11, day, 12, 15 * i, tzinfo=ET).timestamp()
        t = f"KXBTC15M-{i}"
        led.upsert_market(MarketInfo(t, "KXBTC15M", "settled", close - 900, close, "greater_or_equal", 1.0, None, result, {}))
        led.record_fill("dry_run", Fill(f"f{i}", None, t, "yes", 40, 10, False, close - 300), 0)
        led.settle("dry_run", t, result, close, close + 30)
    led.record_equity("dry_run", datetime(2026, 11, 2, tzinfo=ET).timestamp(), 10_000, 10_000)
    return led


def test_summary_calendar_and_totals(tmp_path):
    led = seed(str(tmp_path / "d.sqlite"))
    now = datetime(2026, 11, 3, tzinfo=ET).timestamp()
    s = build_summary(led, "dry_run", None, now)
    assert s["month"]["key"] == "2026-11"
    assert s["month"]["days"]["2026-11-01"]["pnl_cents"] == -400
    assert s["month"]["days"]["2026-11-02"]["pnl_cents"] == 1200
    assert (s["month"]["win_days"], s["month"]["loss_days"]) == (1, 1)
    assert s["totals"]["pnl_cents"] == 800 and s["totals"]["largest_loss_cents"] == -400
    assert s["pnl_curve"][-1][1] == 800
    assert "live" in s["modes"] and "dry_run" in s["modes"]
    assert build_summary(led, "dry_run", "2026-10", now)["month"]["days"] == {}


def test_http_endpoints(tmp_path):
    path = str(tmp_path / "d.sqlite")
    seed(path).close()
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(path))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}"
    try:
        html = urllib.request.urlopen(base + "/").read().decode()
        assert "Daily P&amp;L" in html
        data = json.loads(urllib.request.urlopen(base + "/api/summary?mode=dry_run&month=2026-11").read())
        assert data["month"]["total_cents"] == 800
    finally:
        httpd.shutdown()
