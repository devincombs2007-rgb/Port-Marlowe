"""Kalshi Trade API v2 client: RSA-PSS request signing, REST calls, response parsing.

Kalshi has been moving price fields from integer cents (``yes_bid``) to fixed-point
dollar strings (``yes_bid_dollars``). The parsing helpers here accept either form.
"""

from __future__ import annotations

import base64
import logging
import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterator
from urllib.parse import urlparse

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

log = logging.getLogger(__name__)


class KalshiAPIError(Exception):
    def __init__(self, status: int, method: str, path: str, body: str):
        super().__init__(f"{method} {path} -> HTTP {status}: {body[:500]}")
        self.status = status
        self.method = method
        self.path = path
        self.body = body


# --------------------------------------------------------------------------- auth


class KalshiAuth:
    """Signs requests: base64(RSA-PSS-SHA256(timestamp_ms + METHOD + path))."""

    def __init__(self, key_id: str, private_key: rsa.RSAPrivateKey):
        self.key_id = key_id
        self._key = private_key

    @classmethod
    def from_pem(cls, key_id: str, pem: bytes | str) -> "KalshiAuth":
        if isinstance(pem, str):
            pem = pem.encode()
        key = serialization.load_pem_private_key(pem, password=None)
        if not isinstance(key, rsa.RSAPrivateKey):
            raise ValueError("Kalshi API keys are RSA keys")
        return cls(key_id, key)

    @classmethod
    def from_file(cls, key_id: str, path: str) -> "KalshiAuth":
        with open(path, "rb") as fh:
            return cls.from_pem(key_id, fh.read())

    def sign(self, message: str) -> str:
        sig = self._key.sign(
            message.encode(),
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.DIGEST_LENGTH),
            hashes.SHA256(),
        )
        return base64.b64encode(sig).decode()

    def headers(self, method: str, path: str, timestamp_ms: int | None = None) -> dict[str, str]:
        ts = str(timestamp_ms if timestamp_ms is not None else int(time.time() * 1000))
        path_only = path.split("?", 1)[0]
        return {
            "KALSHI-ACCESS-KEY": self.key_id,
            "KALSHI-ACCESS-TIMESTAMP": ts,
            "KALSHI-ACCESS-SIGNATURE": self.sign(ts + method.upper() + path_only),
        }


# ------------------------------------------------------------------------ parsing


def parse_ts(value: Any) -> float | None:
    """ISO-8601 string or epoch number -> epoch seconds."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value) / 1000.0 if value > 1e12 else float(value)
    s = str(value).replace("Z", "+00:00")
    # Python < 3.11 cannot parse more than 6 fractional digits.
    s = re.sub(r"(\.\d{6})\d+", r"\1", s)
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


def get_cents(obj: dict, key: str) -> int | None:
    """Read a price as integer cents from `key` or `key_dollars`."""
    v = obj.get(key)
    if v is not None and v != "":
        return int(round(float(v)))
    v = obj.get(f"{key}_dollars")
    if v is not None and v != "":
        return int(round(float(v) * 100))
    return None


def get_count(obj: dict, key: str = "count") -> int | None:
    v = obj.get(key)
    if v is None or v == "":
        v = obj.get(f"{key}_fp")
    if v is None or v == "":
        return None
    return int(round(float(v)))


def _float_count(obj: dict, key: str = "count") -> float:
    for k in (key, f"{key}_fp"):
        v = obj.get(k)
        if v is not None and v != "":
            return float(v)
    return 0.0


def _levels(raw: Any, dollars: bool) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    for level in raw or []:
        price, qty = level[0], level[1]
        cents = int(round(float(price) * 100)) if dollars else int(round(float(price)))
        q = int(round(float(qty)))
        if q > 0 and 1 <= cents <= 99:
            out.append((cents, q))
    out.sort(key=lambda lv: lv[0], reverse=True)
    return out


def parse_orderbook(resp: dict) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    """Return (yes_bids, no_bids) as [(price_cents, qty)], best price first.

    Kalshi books only list bids: a YES ask at p is a NO bid at 100 - p.
    """
    book = resp.get("orderbook") or resp.get("orderbook_fp") or {}
    sides = []
    for side in ("yes", "no"):
        if book.get(side) is not None:
            sides.append(_levels(book[side], dollars=False))
        elif book.get(f"{side}_dollars") is not None:
            sides.append(_levels(book[f"{side}_dollars"], dollars=True))
        else:
            sides.append([])
    return sides[0], sides[1]


_PRICE_RE = re.compile(r"\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)")


@dataclass
class MarketInfo:
    ticker: str
    series: str
    status: str
    open_ts: float | None
    close_ts: float
    strike_type: str
    floor_strike: float | None
    cap_strike: float | None
    result: str | None
    raw: dict

    @property
    def strike(self) -> float | None:
        return self.floor_strike if self.floor_strike is not None else self.cap_strike

    @property
    def is_determined(self) -> bool:
        return self.result in ("yes", "no")


def parse_market(m: dict, series: str = "") -> MarketInfo:
    floor = m.get("floor_strike")
    cap = m.get("cap_strike")
    strike_type = (m.get("strike_type") or "").lower()
    if floor is None and cap is None:
        # Fall back to the "$62,922.06 target" text on the market.
        for key in ("yes_sub_title", "subtitle", "title"):
            match = _PRICE_RE.search(m.get(key) or "")
            if match:
                floor = float(match.group(1).replace(",", ""))
                break
    if not strike_type:
        strike_type = "greater_or_equal"
    result = (m.get("result") or "").lower() or None
    return MarketInfo(
        ticker=m["ticker"],
        series=series or m.get("series_ticker") or m.get("event_ticker", "").split("-")[0],
        status=(m.get("status") or "").lower(),
        open_ts=parse_ts(m.get("open_time")),
        close_ts=parse_ts(m.get("close_time")) or 0.0,
        strike_type=strike_type,
        floor_strike=float(floor) if floor is not None else None,
        cap_strike=float(cap) if cap is not None else None,
        result=result,
        raw=m,
    )


@dataclass
class Fill:
    fill_key: str
    order_id: str | None
    ticker: str
    side: str  # side we are long after the fill: "yes" or "no"
    price: int  # cents paid per contract for that side
    count: int
    is_taker: bool
    ts: float


def parse_fill(f: dict) -> Fill:
    """Normalise a fill so it is always a *buy* of yes or no.

    Selling YES at p is economically buying NO at 100 - p (Kalshi nets positions).
    """
    side = (f.get("side") or "").lower()
    action = (f.get("action") or "buy").lower()
    yes_price = get_cents(f, "yes_price")
    no_price = get_cents(f, "no_price")
    if yes_price is None and no_price is not None:
        yes_price = 100 - no_price
    if no_price is None and yes_price is not None:
        no_price = 100 - yes_price
    if yes_price is None:
        raise ValueError(f"fill without price: {f}")
    price = yes_price if side == "yes" else no_price
    if action == "sell":
        side = "no" if side == "yes" else "yes"
        price = 100 - price
    return Fill(
        fill_key=str(f.get("fill_id") or f.get("trade_id") or f"{f.get('order_id')}-{f.get('created_time')}"),
        order_id=f.get("order_id"),
        ticker=f["ticker"],
        side=side,
        price=int(price),
        count=get_count(f) or 0,
        is_taker=bool(f.get("is_taker")),
        ts=parse_ts(f.get("created_time")) or time.time(),
    )


@dataclass
class PublicTrade:
    trade_id: str
    ticker: str
    yes_price: int
    count: float  # Kalshi allows fractional contracts on the tape
    taker_side: str  # "yes": taker bought YES (hit NO bids); "no": taker bought NO (hit YES bids)
    ts: float


def parse_trade(t: dict) -> PublicTrade:
    yes_price = get_cents(t, "yes_price")
    if yes_price is None:
        no_price = get_cents(t, "no_price")
        yes_price = 100 - (no_price or 0)
    return PublicTrade(
        trade_id=str(t.get("trade_id")),
        ticker=t["ticker"],
        yes_price=yes_price,
        count=_float_count(t),
        taker_side=(t.get("taker_side") or "").lower(),
        ts=parse_ts(t.get("created_time")) or 0.0,
    )


# ------------------------------------------------------------------------- client


class RateLimiter:
    """Token bucket shared by every thread using one client."""

    def __init__(self, rate: float, burst: float | None = None, clock=time.monotonic, sleep=time.sleep):
        self.rate = rate
        self.capacity = burst if burst is not None else max(1.0, rate)
        self.tokens = self.capacity
        self._clock, self._sleep = clock, sleep
        self._t = clock()
        self._lock = threading.Lock()

    def acquire(self) -> None:
        while True:
            with self._lock:
                now = self._clock()
                self.tokens = min(self.capacity, self.tokens + (now - self._t) * self.rate)
                self._t = now
                if self.tokens >= 1:
                    self.tokens -= 1
                    return
                wait = (1 - self.tokens) / self.rate
            self._sleep(wait)


class KalshiClient:
    def __init__(
        self,
        base_url: str,
        auth: KalshiAuth | None = None,
        session: requests.Session | None = None,
        timeout: float = 8.0,
        max_retries: int = 2,
        max_requests_per_sec: float | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self._path_prefix = urlparse(self.base_url).path
        self.auth = auth
        self.session = session or requests.Session()
        self.timeout = timeout
        self.max_retries = max_retries
        self.limiter = RateLimiter(max_requests_per_sec) if max_requests_per_sec else None

    # -- transport

    def _request(
        self,
        method: str,
        endpoint: str,
        *,
        params: dict | None = None,
        body: dict | None = None,
        signed: bool = False,
    ) -> dict:
        if signed and self.auth is None:
            raise RuntimeError("this endpoint needs API credentials (KALSHI_API_KEY_ID / KALSHI_PRIVATE_KEY_PATH)")
        url = self.base_url + endpoint
        params = {k: v for k, v in (params or {}).items() if v is not None}
        last_err: Exception | None = None
        for attempt in range(self.max_retries + 1):
            headers = {"Accept": "application/json"}
            if self.auth is not None:
                headers.update(self.auth.headers(method, self._path_prefix + endpoint))
            if self.limiter is not None:
                self.limiter.acquire()
            try:
                resp = self.session.request(
                    method, url, params=params or None, json=body, headers=headers, timeout=self.timeout
                )
            except (requests.ConnectionError, requests.Timeout) as exc:
                last_err = exc
                time.sleep(min(0.25 * 2**attempt, 2.0))
                continue
            if resp.status_code == 429 or resp.status_code >= 500:
                last_err = KalshiAPIError(resp.status_code, method, endpoint, resp.text)
                # Rate limited: back off for real (1s, 2s, ...); server errors: retry quickly.
                time.sleep(min(2.0**attempt, 8.0) if resp.status_code == 429 else min(0.25 * 2**attempt, 2.0))
                continue
            if resp.status_code >= 400:
                raise KalshiAPIError(resp.status_code, method, endpoint, resp.text)
            return resp.json() if resp.content else {}
        assert last_err is not None
        raise last_err

    # -- public market data

    def get_exchange_status(self) -> dict:
        return self._request("GET", "/exchange/status")

    def get_markets(self, **params: Any) -> dict:
        return self._request("GET", "/markets", params=params)

    def iter_markets(self, **params: Any) -> Iterator[dict]:
        params.setdefault("limit", 200)
        cursor = None
        while True:
            data = self.get_markets(cursor=cursor, **params)
            yield from data.get("markets") or []
            cursor = data.get("cursor")
            if not cursor:
                return

    def get_market(self, ticker: str) -> dict:
        return self._request("GET", f"/markets/{ticker}").get("market", {})

    def get_orderbook(self, ticker: str, depth: int | None = None) -> dict:
        return self._request("GET", f"/markets/{ticker}/orderbook", params={"depth": depth})

    def get_trades(self, ticker: str, min_ts: int | None = None, limit: int = 1000, cursor: str | None = None) -> dict:
        return self._request(
            "GET", "/markets/trades", params={"ticker": ticker, "min_ts": min_ts, "limit": limit, "cursor": cursor}
        )

    def get_market_candlesticks(
        self, series: str, ticker: str, start_ts: int, end_ts: int, period_interval: int = 1
    ) -> list[dict]:
        data = self._request(
            "GET",
            f"/series/{series}/markets/{ticker}/candlesticks",
            params={"start_ts": start_ts, "end_ts": end_ts, "period_interval": period_interval},
        )
        return data.get("candlesticks") or []

    # -- portfolio (signed)

    def get_balance(self) -> dict:
        return self._request("GET", "/portfolio/balance", signed=True)

    def get_positions(self, **params: Any) -> dict:
        return self._request("GET", "/portfolio/positions", params=params, signed=True)

    def get_orders(self, **params: Any) -> list[dict]:
        orders: list[dict] = []
        cursor = None
        while True:
            data = self._request("GET", "/portfolio/orders", params={**params, "cursor": cursor}, signed=True)
            orders.extend(data.get("orders") or [])
            cursor = data.get("cursor")
            if not cursor:
                return orders

    def get_fills(self, min_ts: int | None = None, ticker: str | None = None, limit: int = 200) -> list[dict]:
        fills: list[dict] = []
        cursor = None
        while True:
            data = self._request(
                "GET",
                "/portfolio/fills",
                params={"min_ts": min_ts, "ticker": ticker, "limit": limit, "cursor": cursor},
                signed=True,
            )
            fills.extend(data.get("fills") or [])
            cursor = data.get("cursor")
            if not cursor:
                return fills

    def create_order(
        self,
        ticker: str,
        side: str,
        count: int,
        price_cents: int,
        client_order_id: str,
        *,
        action: str = "buy",
        post_only: bool = True,
        price_field: str = "cents",
        expiration_ts: int | None = None,
    ) -> dict:
        if side not in ("yes", "no"):
            raise ValueError(side)
        if not 1 <= price_cents <= 99:
            raise ValueError(f"price out of range: {price_cents}")
        body: dict[str, Any] = {
            "ticker": ticker,
            "action": action,
            "side": side,
            "count": int(count),
            "type": "limit",
            "client_order_id": client_order_id,
            "post_only": post_only,
        }
        if price_field == "dollars":
            body[f"{side}_price_dollars"] = f"{price_cents / 100:.4f}"
        else:
            body[f"{side}_price"] = int(price_cents)
        if expiration_ts is not None:
            body["expiration_ts"] = int(expiration_ts)
        return self._request("POST", "/portfolio/orders", body=body, signed=True).get("order", {})

    def cancel_order(self, order_id: str) -> dict:
        return self._request("DELETE", f"/portfolio/orders/{order_id}", signed=True)
