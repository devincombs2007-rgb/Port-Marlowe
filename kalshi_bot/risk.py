"""Account-level circuit breakers and per-order sizing."""

from __future__ import annotations

import math
import os

from .config import RiskConfig, SizingConfig
from .ledger import Position


class RiskManager:
    def __init__(self, risk: RiskConfig, sizing: SizingConfig):
        self.risk = risk
        self.sizing = sizing

    def stop_reason(
        self, equity: float, day_start_equity: float, peak_equity: float, halted: str | None = None
    ) -> str | None:
        """Why we must not quote right now, or None if trading is allowed."""
        if self.risk.kill_file and os.path.exists(self.risk.kill_file):
            return f"kill file {self.risk.kill_file!r} present"
        if halted:
            return f"halted: {halted}"
        if equity <= 0:
            return "no equity"
        if day_start_equity > 0 and equity - day_start_equity <= -self.risk.daily_loss_limit_fraction * day_start_equity:
            return (
                f"daily loss limit hit ({(equity - day_start_equity) / 100:+.2f} USD vs start "
                f"{day_start_equity / 100:.2f}); resumes next ET day"
            )
        if peak_equity > 0 and equity <= peak_equity * (1 - self.risk.max_drawdown_fraction):
            return f"max drawdown hit (equity {equity / 100:.2f} vs peak {peak_equity / 100:.2f})"
        return None

    @staticmethod
    def is_persistent(reason: str) -> bool:
        return reason.startswith("max drawdown")

    def order_size(
        self,
        side: str,
        price: int,
        equity: float,
        position: Position,
        total_exposure: float,
        available_cash: float,
    ) -> int:
        """Contracts to bid, after every cap. 0 means do not quote this side."""
        if price <= 0 or equity <= 0:
            return 0
        s = self.sizing
        n = math.floor(equity * s.order_fraction / price)
        n = max(s.min_contracts, min(s.max_contracts, n))
        market_cap = equity * s.max_market_loss_fraction
        total_cap = equity * s.max_total_exposure_fraction
        current = position.worst_case_loss
        while n > 0:
            after = position.with_buy(side, price, n).worst_case_loss
            fits_market = after <= market_cap or after <= current  # trades that reduce risk are always fine
            fits_total = total_exposure - current + after <= total_cap or after <= current
            fits_cash = n * price <= available_cash
            if fits_market and fits_total and fits_cash:
                return n
            n -= 1
        return 0
