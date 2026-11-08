from kalshi_bot.kalshi_client import get_cents, parse_fill, parse_market, parse_orderbook, parse_trade, parse_ts


def test_orderbook_cents_and_dollars():
    yes, no = parse_orderbook({"orderbook": {"yes": [[40, 5], [45, 2]], "no": None}})
    assert yes == [(45, 2), (40, 5)] and no == []
    yes, no = parse_orderbook({"orderbook_fp": {"yes_dollars": [["0.4500", "3.00"]], "no_dollars": [["0.5000", "1"]]}})
    assert yes == [(45, 3)] and no == [(50, 1)]


def test_market_parsing_and_strike_fallback():
    m = parse_market({
        "ticker": "KXBTC15M-26NOV081415-15", "event_ticker": "KXBTC15M-26NOV081415", "status": "active",
        "open_time": "2026-11-08T19:00:00Z", "close_time": "2026-11-08T19:15:00Z",
        "floor_strike": 101234.56, "strike_type": "greater_or_equal",
    })
    assert m.series == "KXBTC15M" and m.strike == 101234.56
    assert m.close_ts - m.open_ts == 900
    m2 = parse_market({"ticker": "X", "close_time": "2026-11-08T19:15:00Z", "yes_sub_title": "Target Price: $62,922.06"})
    assert m2.strike == 62922.06 and m2.strike_type == "greater_or_equal"
    m3 = parse_market({"ticker": "X", "close_time": "2026-11-08T19:15:00Z", "result": "yes", "floor_strike": 1})
    assert m3.is_determined


def test_fill_normalisation():
    f = parse_fill({"trade_id": "t1", "ticker": "T", "side": "yes", "action": "buy", "count": 3, "yes_price": 41,
                    "no_price": 59, "is_taker": False, "created_time": "2026-11-08T19:01:00.123456789Z"})
    assert (f.side, f.price, f.count) == ("yes", 41, 3)
    sell = parse_fill({"fill_id": "f2", "ticker": "T", "side": "yes", "action": "sell", "count": 2,
                       "yes_price_dollars": "0.6000", "created_time": "2026-11-08T19:01:00Z"})
    assert (sell.side, sell.price) == ("no", 40)


def test_trade_and_helpers():
    t = parse_trade({"trade_id": "x", "ticker": "T", "yes_price": 44, "count": 7, "taker_side": "no",
                     "created_time": "2026-11-08T19:01:00Z"})
    assert (t.yes_price, t.count, t.taker_side) == (44, 7, "no")
    assert get_cents({"a_dollars": "0.07"}, "a") == 7
    assert parse_ts(1_700_000_000_000) == 1_700_000_000.0
