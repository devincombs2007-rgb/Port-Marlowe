"""Push notifications: wins, losses, summaries and anything that needs attention.

Channels (configure any of them in .env; all configured channels get every message):
  ntfy      NTFY_TOPIC=<a long random name>   then subscribe to it in the free ntfy app
  Telegram  TELEGRAM_BOT_TOKEN=... and TELEGRAM_CHAT_ID=...
  Discord   DISCORD_WEBHOOK_URL=...

Messages are sent from a background thread, so a slow or failing channel never
holds up trading.
"""

from __future__ import annotations

import logging
import os
import queue
import threading
import time
from dataclasses import dataclass
from typing import Protocol

import requests

from .config import NotifyConfig as NotifySettings

log = logging.getLogger(__name__)


class Channel(Protocol):
    name: str

    def send(self, title: str, body: str, urgent: bool) -> None: ...


class NtfyChannel:
    name = "ntfy"

    def __init__(self, topic: str, server: str = "https://ntfy.sh", session: requests.Session | None = None):
        self.url = f"{server.rstrip('/')}/{topic}"
        self.session = session or requests.Session()

    def send(self, title: str, body: str, urgent: bool) -> None:
        r = self.session.post(
            self.url,
            data=body.encode(),
            headers={"Title": title.encode("ascii", "ignore").decode() or "Kalshi bot",
                     "Priority": "high" if urgent else "default"},
            timeout=10,
        )
        r.raise_for_status()


class TelegramChannel:
    name = "telegram"

    def __init__(self, token: str, chat_id: str, session: requests.Session | None = None):
        self.url = f"https://api.telegram.org/bot{token}/sendMessage"
        self.chat_id = chat_id
        self.session = session or requests.Session()

    def send(self, title: str, body: str, urgent: bool) -> None:
        r = self.session.post(self.url, json={"chat_id": self.chat_id, "text": f"{title}\n{body}",
                                              "disable_notification": not urgent}, timeout=10)
        r.raise_for_status()


class DiscordChannel:
    name = "discord"

    def __init__(self, webhook_url: str, session: requests.Session | None = None):
        self.url = webhook_url
        self.session = session or requests.Session()

    def send(self, title: str, body: str, urgent: bool) -> None:
        r = self.session.post(self.url, json={"content": f"**{title}**\n{body}"}, timeout=10)
        r.raise_for_status()


def channels_from_env() -> list[Channel]:
    out: list[Channel] = []
    if os.environ.get("NTFY_TOPIC"):
        out.append(NtfyChannel(os.environ["NTFY_TOPIC"], os.environ.get("NTFY_SERVER", "https://ntfy.sh")))
    if os.environ.get("TELEGRAM_BOT_TOKEN") and os.environ.get("TELEGRAM_CHAT_ID"):
        out.append(TelegramChannel(os.environ["TELEGRAM_BOT_TOKEN"], os.environ["TELEGRAM_CHAT_ID"]))
    if os.environ.get("DISCORD_WEBHOOK_URL"):
        out.append(DiscordChannel(os.environ["DISCORD_WEBHOOK_URL"]))
    return out


def usd(cents: float, sign: bool = True) -> str:
    v = cents / 100
    return f"{'+' if sign and v > 0 else '-' if v < 0 else ''}${abs(v):,.2f}"


@dataclass
class _Window:
    markets: int = 0
    wins: int = 0
    losses: int = 0
    pnl_cents: float = 0.0
    best: tuple[str, float] | None = None
    worst: tuple[str, float] | None = None


class Notifier:
    def __init__(self, channels: list[Channel], settings: NotifySettings | None = None, mode: str = "dry_run",
                 clock=time.time, background: bool = True):
        self.channels = channels
        self.s = settings or NotifySettings()
        self.mode = mode
        self.clock = clock
        self._window = _Window()
        self._window_started = clock()
        self._last_alert: dict[str, float] = {}
        self._q: queue.Queue[tuple[str, str, bool]] = queue.Queue(maxsize=200)
        self._background = background
        if background and channels:
            threading.Thread(target=self._worker, name="notify", daemon=True).start()

    @property
    def enabled(self) -> bool:
        return bool(self.channels)

    @property
    def _tag(self) -> str:
        return {"live": "LIVE", "demo": "DEMO", "dry_run": "PAPER"}.get(self.mode, self.mode.upper())

    # ------------------------------------------------------------- transport

    def send(self, title: str, body: str, urgent: bool = False) -> None:
        if not self.channels:
            return
        title = f"[{self._tag}] {title}"
        if not self._background:
            self._deliver(title, body, urgent)
            return
        try:
            self._q.put_nowait((title, body, urgent))
        except queue.Full:
            log.warning("notification queue full; dropping: %s", title)

    def _deliver(self, title: str, body: str, urgent: bool) -> None:
        for ch in self.channels:
            try:
                ch.send(title, body, urgent)
            except Exception as exc:  # noqa: BLE001 - never let a channel break the bot
                log.warning("notification via %s failed: %s", ch.name, exc)

    def _worker(self) -> None:
        while True:
            title, body, urgent = self._q.get()
            self._deliver(title, body, urgent)

    def flush(self, timeout: float = 10.0) -> None:
        end = time.time() + timeout
        while not self._q.empty() and time.time() < end:
            time.sleep(0.05)

    # ---------------------------------------------------------------- events

    def started(self, equity_cents: float, markets: list[str], learned: str) -> None:
        self.send("Bot started", f"Equity {usd(equity_cents, False)}. Trading {', '.join(markets)}. {learned}")

    def stopped(self, equity_cents: float, reason: str = "shut down") -> None:
        self.send("Bot stopped", f"{reason}. Equity {usd(equity_cents, False)}. All resting orders cancelled.",
                  urgent=True)
        self.flush()

    def settled(self, ticker: str, result: str, pnl_cents: float, equity_cents: float) -> None:
        coin = ticker.split("-")[0].replace("KX", "").replace("15M", "")
        w = self._window
        w.markets += 1
        w.pnl_cents += pnl_cents
        if pnl_cents > 0:
            w.wins += 1
        elif pnl_cents < 0:
            w.losses += 1
        if w.best is None or pnl_cents > w.best[1]:
            w.best = (coin, pnl_cents)
        if w.worst is None or pnl_cents < w.worst[1]:
            w.worst = (coin, pnl_cents)
        big = abs(pnl_cents) >= self.s.big_result_usd * 100
        if self.s.settlements == "each" or (big and self.s.settlements != "off"):
            word = "Won" if pnl_cents > 0 else "Lost" if pnl_cents < 0 else "Flat"
            self.send(f"{word} {usd(pnl_cents)} on {coin}",
                      f"{ticker} settled {result.upper()}. Equity now {usd(equity_cents, False)}.")

    def maybe_summary(self, equity_cents: float, day_pnl_cents: float) -> None:
        if self.s.settlements != "summary":
            return
        now = self.clock()
        if now - self._window_started < self.s.summary_every_min * 60:
            return
        w = self._window
        self._window, self._window_started = _Window(), now
        if w.markets == 0:
            return
        lines = [f"{w.markets} markets: {w.wins} won, {w.losses} lost, net {usd(w.pnl_cents)}."]
        if w.best and w.best[1] > 0:
            lines.append(f"Best: {w.best[0]} {usd(w.best[1])}.")
        if w.worst and w.worst[1] < 0:
            lines.append(f"Worst: {w.worst[0]} {usd(w.worst[1])}.")
        lines.append(f"Equity {usd(equity_cents, False)} (today {usd(day_pnl_cents)}).")
        self.send(f"{'Up' if w.pnl_cents >= 0 else 'Down'} {usd(w.pnl_cents)} in the last "
                  f"{self.s.summary_every_min:g} min", " ".join(lines))

    def daily(self, day: str, pnl_cents: float, markets: int, wins: int, losses: int, equity_cents: float) -> None:
        if not self.s.daily_summary:
            return
        self.send(f"Day {day}: {usd(pnl_cents)}",
                  f"{markets} markets, {wins} won, {losses} lost. Equity {usd(equity_cents, False)}.")

    def alert(self, key: str, title: str, body: str) -> None:
        if not self.s.alerts:
            return
        now = self.clock()
        if now - self._last_alert.get(key, -1e18) < self.s.min_alert_gap_sec:
            return
        self._last_alert[key] = now
        self.send(title, body, urgent=True)


def null_notifier(mode: str = "dry_run") -> Notifier:
    return Notifier([], mode=mode, background=False)
