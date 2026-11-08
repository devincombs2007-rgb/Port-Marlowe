"""Configuration: dataclasses loaded from YAML, secrets from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass, field, fields, is_dataclass
from pathlib import Path
from typing import Any, get_type_hints

import yaml

PROD_BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"
DEMO_BASE_URL = "https://demo-api.kalshi.co/trade-api/v2"


@dataclass
class MarketSpec:
    """One Kalshi series to trade and the spot symbol that drives it."""

    series: str
    symbol: str
    enabled: bool = True


def _default_markets() -> list[MarketSpec]:
    # Series tickers for Kalshi's 15-minute "up or down" crypto markets.
    # Run `python -m kalshi_bot check` to confirm which ones currently list markets.
    return [
        MarketSpec("KXBTC15M", "BTC"),
        MarketSpec("KXETH15M", "ETH"),
        MarketSpec("KXSOL15M", "SOL"),
        MarketSpec("KXDOGE15M", "DOGE"),
        MarketSpec("KXHYPE15M", "HYPE"),
    ]


@dataclass
class StrategyConfig:
    # Minimum edge (cents) between our fair value and the price we bid.
    min_edge_cents: float = 3.0
    # Bid one cent above the best competing bid when that is still inside our edge,
    # instead of always sitting at fair - edge.
    improve_best_bid: bool = True
    # Reprice a resting order upward only when the target moved by at least this much.
    # Orders that became too aggressive are always pulled immediately.
    reprice_threshold_cents: int = 1
    # Stop quoting (and pull orders) this many seconds before the window closes.
    min_seconds_to_close: int = 90
    # Do not quote until this many seconds of the window have passed (strike settles in).
    min_seconds_since_open: int = 15
    # Only quote when fair value is inside this band; the tails are where one loss
    # wipes out many small wins.
    min_fair: float = 0.08
    max_fair: float = 0.92
    # Shift our reservation price by this many cents per contract of net inventory.
    inventory_skew_cents: float = 0.25
    max_skew_cents: float = 5.0
    # Inflate the volatility estimate for conservatism.
    vol_multiplier: float = 1.15
    # Settlement uses the average of the index over the final N seconds.
    settlement_window_sec: int = 60
    # Pull quotes if the spot price is older than this.
    stale_spot_seconds: float = 4.0
    # Pull quotes for `shock_cooldown_sec` if spot moved more than `shock_sigma`
    # standard deviations within `shock_lookback_sec`.
    shock_sigma: float = 3.0
    shock_lookback_sec: int = 5
    shock_cooldown_sec: int = 15
    # Max order placements per engine tick (Kalshi enforces write rate limits).
    max_places_per_tick: int = 8


@dataclass
class SizingConfig:
    # Cost of a single order as a fraction of equity.
    order_fraction: float = 0.02
    min_contracts: int = 1
    max_contracts: int = 100
    # Worst-case loss allowed in any one market, as a fraction of equity.
    max_market_loss_fraction: float = 0.06
    # Worst-case loss across all open markets plus resting orders.
    max_total_exposure_fraction: float = 0.30


@dataclass
class RiskConfig:
    # Stop quoting for the rest of the ET day after losing this fraction of the
    # day's starting equity.
    daily_loss_limit_fraction: float = 0.10
    # Halt (until `reset-halt`) after falling this far from peak equity.
    max_drawdown_fraction: float = 0.25
    # If this file exists, cancel everything and stop quoting.
    kill_file: str = "KILL"


@dataclass
class FeesConfig:
    # Kalshi fee = ceil(rate * contracts * P * (1 - P)) dollars, P in dollars.
    # The 15-minute crypto markets have charged no maker fee; check the current
    # fee schedule and update this if that changes.
    maker_rate: float = 0.0
    taker_rate: float = 0.07


@dataclass
class PaperConfig:
    starting_balance_usd: float = 50.0
    # Model queue position at our price level. When False, only trades that print
    # strictly through our price fill us (more conservative).
    fill_at_touch: bool = True


@dataclass
class DashboardConfig:
    host: str = "127.0.0.1"
    port: int = 8050


@dataclass
class Config:
    markets: list[MarketSpec] = field(default_factory=_default_markets)
    strategy: StrategyConfig = field(default_factory=StrategyConfig)
    sizing: SizingConfig = field(default_factory=SizingConfig)
    risk: RiskConfig = field(default_factory=RiskConfig)
    fees: FeesConfig = field(default_factory=FeesConfig)
    paper: PaperConfig = field(default_factory=PaperConfig)
    dashboard: DashboardConfig = field(default_factory=DashboardConfig)
    poll_interval_sec: float = 2.0
    spot_poll_interval_sec: float = 1.0
    market_refresh_sec: float = 20.0
    spot_sources: list[str] = field(default_factory=lambda: ["coinbase", "kraken", "hyperliquid"])
    vol_halflife_minutes: float = 60.0
    db_path: str = "data/bot.sqlite"
    log_path: str = "data/bot.log"
    # "cents" sends yes_price/no_price as integers; "dollars" sends yes_price_dollars strings.
    order_price_field: str = "cents"
    # Give live orders an exchange-side expiry at (close - min_seconds_to_close), so
    # quotes cannot sit into the final minutes even if the bot crashes.
    use_order_expiration: bool = True

    # Filled from the environment, never from YAML.
    api_key_id: str | None = None
    private_key_path: str | None = None
    private_key_pem: str | None = None

    def enabled_markets(self) -> list[MarketSpec]:
        return [m for m in self.markets if m.enabled]


_SECRET_FIELDS = {"api_key_id", "private_key_path", "private_key_pem"}


def _build(cls: type, data: Any) -> Any:
    """Recursively build a dataclass from a dict, rejecting unknown keys."""
    if not is_dataclass(cls):
        return data
    if data is None:
        return cls()
    if not isinstance(data, dict):
        raise ValueError(f"expected a mapping for {cls.__name__}, got {type(data).__name__}")
    hints = get_type_hints(cls)
    known = {f.name for f in fields(cls)}
    unknown = set(data) - known
    if unknown:
        raise ValueError(f"unknown config keys for {cls.__name__}: {sorted(unknown)}")
    kwargs: dict[str, Any] = {}
    for f in fields(cls):
        if f.name not in data:
            continue
        hint = hints[f.name]
        value = data[f.name]
        if is_dataclass(hint):
            kwargs[f.name] = _build(hint, value)
        elif f.name == "markets":
            kwargs[f.name] = [_build(MarketSpec, m) for m in value]
        else:
            kwargs[f.name] = value
    return cls(**kwargs)


def load_dotenv(path: str | os.PathLike = ".env") -> None:
    """Minimal .env loader: KEY=VALUE lines, never overrides the real environment."""
    p = Path(path)
    if not p.is_file():
        return
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def load_config(path: str | os.PathLike | None = None) -> Config:
    load_dotenv()
    data: dict[str, Any] = {}
    if path is not None:
        with open(path) as fh:
            data = yaml.safe_load(fh) or {}
    leaked = _SECRET_FIELDS & set(data)
    if leaked:
        raise ValueError(f"put {sorted(leaked)} in the environment or .env, not in the config file")
    cfg: Config = _build(Config, data)
    cfg.api_key_id = os.environ.get("KALSHI_API_KEY_ID") or None
    cfg.private_key_path = os.environ.get("KALSHI_PRIVATE_KEY_PATH") or None
    cfg.private_key_pem = os.environ.get("KALSHI_PRIVATE_KEY") or None
    _validate(cfg)
    return cfg


def _validate(cfg: Config) -> None:
    s = cfg.strategy
    if not 0 < s.min_fair < s.max_fair < 1:
        raise ValueError("strategy.min_fair/max_fair must satisfy 0 < min < max < 1")
    if s.min_edge_cents < 1:
        raise ValueError("strategy.min_edge_cents must be at least 1")
    if cfg.order_price_field not in ("cents", "dollars"):
        raise ValueError("order_price_field must be 'cents' or 'dollars'")
    if cfg.sizing.min_contracts < 1 or cfg.sizing.max_contracts < cfg.sizing.min_contracts:
        raise ValueError("sizing.min_contracts/max_contracts are inconsistent")
    if not cfg.enabled_markets():
        raise ValueError("no markets enabled")
