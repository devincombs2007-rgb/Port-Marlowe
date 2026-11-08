"""Quote construction: where to rest maker bids on YES and NO.

Kalshi books are bids only. Buying YES at y and buying NO at n are the two sides
of a market: a YES ask at p is the same thing as a NO bid at 100 - p. A
market maker therefore rests a YES bid below fair value and a NO bid below
(1 - fair value). If both fill, the pair pays exactly $1 at settlement whatever
happens, and the spread is locked in.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .config import StrategyConfig


@dataclass
class BookTop:
    """Best competing bids on each side, with our own resting size removed."""

    yes_bid: int | None
    no_bid: int | None

    @property
    def yes_ask(self) -> int | None:
        return None if self.no_bid is None else 100 - self.no_bid

    @property
    def no_ask(self) -> int | None:
        return None if self.yes_bid is None else 100 - self.yes_bid


def best_excluding_own(levels: list[tuple[int, int]], own: dict[int, int]) -> int | None:
    """Highest price with resting size from someone other than us."""
    for price, qty in sorted(levels, key=lambda lv: lv[0], reverse=True):
        if qty - own.get(price, 0) > 0:
            return price
    return None


def book_top(
    yes_levels: list[tuple[int, int]],
    no_levels: list[tuple[int, int]],
    own_yes: dict[int, int] | None = None,
    own_no: dict[int, int] | None = None,
) -> BookTop:
    return BookTop(
        yes_bid=best_excluding_own(yes_levels, own_yes or {}),
        no_bid=best_excluding_own(no_levels, own_no or {}),
    )


def _bid_price(max_price: float, best_bid: int | None, best_ask: int | None, improve: bool) -> int | None:
    px = math.floor(max_price + 1e-9)
    if improve and best_bid is not None:
        px = min(px, best_bid + 1)
    if best_ask is not None:
        px = min(px, best_ask - 1)  # post-only: never cross
    px = min(px, 99)
    return px if px >= 1 else None


@dataclass
class QuoteTargets:
    fair_yes: float
    reservation: float  # cents, after inventory skew
    yes_price: int | None
    no_price: int | None
    reason: str = ""


def compute_quotes(fair_yes: float, book: BookTop, net_yes_position: int, cfg: StrategyConfig) -> QuoteTargets:
    """Bid prices (cents) for YES and NO, or None for a side we should not quote.

    net_yes_position: YES contracts minus NO contracts held in this market.
    """
    if not cfg.min_fair <= fair_yes <= cfg.max_fair:
        return QuoteTargets(fair_yes, fair_yes * 100, None, None, "fair value outside quoting band")
    skew = max(-cfg.max_skew_cents, min(cfg.max_skew_cents, net_yes_position * cfg.inventory_skew_cents))
    reservation = fair_yes * 100.0 - skew
    yes_px = _bid_price(reservation - cfg.min_edge_cents, book.yes_bid, book.yes_ask, cfg.improve_best_bid)
    no_px = _bid_price(100.0 - reservation - cfg.min_edge_cents, book.no_bid, book.no_ask, cfg.improve_best_bid)
    return QuoteTargets(fair_yes, reservation, yes_px, no_px)


def should_replace(resting_price: int, target_price: int, threshold: int) -> bool:
    """Replace when resting is too aggressive (any amount) or too passive by >= threshold."""
    if resting_price > target_price:
        return True
    return target_price - resting_price >= threshold
