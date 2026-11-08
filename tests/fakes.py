"""In-memory stand-ins for Kalshi and the spot feed."""

from datetime import datetime, timezone


def iso(ts):
    return datetime.fromtimestamp(ts, timezone.utc).isoformat().replace("+00:00", "Z")


class FakeKalshi:
    def __init__(self):
        self.markets = {}  # ticker -> raw market dict
        self.books = {}  # ticker -> (yes_levels, no_levels) as [[price, qty]] ascending
        self.trades = {}  # ticker -> list of raw trades
        self.calls = []

    def add_market(self, ticker, open_ts, close_ts, strike, series="KXBTC15M"):
        self.markets[ticker] = {
            "ticker": ticker, "event_ticker": ticker.rsplit("-", 1)[0], "status": "active",
            "open_time": iso(open_ts), "close_time": iso(close_ts), "floor_strike": strike,
            "strike_type": "greater_or_equal", "series": series,
        }

    def get_markets(self, series_ticker=None, status=None, limit=100, **_):
        self.calls.append(("get_markets", series_ticker))
        ms = [m for m in self.markets.values() if m["ticker"].startswith(series_ticker or "")]
        if status == "open":
            ms = [m for m in ms if m["status"] == "active"]
        return {"markets": ms}

    def get_market(self, ticker):
        return self.markets[ticker]

    def get_orderbook(self, ticker, depth=None):
        yes, no = self.books.get(ticker, ([], []))
        return {"orderbook": {"yes": yes, "no": no}}

    def get_trades(self, ticker, min_ts=None, limit=1000, cursor=None):
        return {"trades": [t for t in self.trades.get(ticker, []) if min_ts is None or t["_ts"] >= min_ts]}

    def add_trade(self, ticker, trade_id, yes_price, count, taker_side, ts):
        self.trades.setdefault(ticker, []).append({
            "trade_id": trade_id, "ticker": ticker, "yes_price": yes_price, "no_price": 100 - yes_price,
            "count": count, "taker_side": taker_side, "created_time": iso(ts), "_ts": ts,
        })


class FakeFeed:
    def __init__(self, prices):
        self.prices = dict(prices)
        self.window = {}

    def price(self, symbol, now=None):
        return self.prices.get(symbol)

    def window_average(self, symbol, start, end):
        return self.window.get(symbol)

    def move_zscore(self, symbol, lookback, sigma, now=None):
        return 0.0


class FakeVol:
    def __init__(self, sigma):
        self.s = sigma

    def sigma(self, symbol):
        return self.s
