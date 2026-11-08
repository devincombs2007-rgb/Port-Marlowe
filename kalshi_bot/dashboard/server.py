"""Read-only dashboard: daily P&L calendar, equity curve, live quoting status.

Serves on 127.0.0.1 by default. It has no authentication, so do not expose it
to the internet.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from ..ledger import ET, Ledger, et_date

log = logging.getLogger(__name__)
STATIC = Path(__file__).parent / "static"


def _month_bounds(month: str | None, now: float) -> tuple[int, int, float, float]:
    if month:
        year, mon = (int(x) for x in month.split("-"))
    else:
        d = datetime.fromtimestamp(now, ET)
        year, mon = d.year, d.month
    start = datetime(year, mon, 1, tzinfo=ET)
    end = datetime(year + (mon == 12), mon % 12 + 1, 1, tzinfo=ET)
    return year, mon, start.timestamp(), end.timestamp()


def build_summary(ledger: Ledger, mode: str, month: str | None = None, now: float | None = None) -> dict[str, Any]:
    now = time.time() if now is None else now
    year, mon, m_start, m_end = _month_bounds(month, now)
    days = ledger.daily_pnl(mode, m_start, m_end)
    day_pnls = [d["pnl_cents"] for d in days.values()]

    settled = ledger.settlements(mode)
    cum, curve = 0.0, []
    for s in settled:
        cum += s["pnl_cents"]
        curve.append([s["close_ts"], round(cum, 2)])
    pnls = [s["pnl_cents"] for s in settled]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]

    week_ago = now - 7 * 86400
    week_settled = [s for s in settled if s["close_ts"] >= week_ago]
    week_curve, wcum = [], 0.0
    for s in week_settled:
        wcum += s["pnl_cents"]
        week_curve.append([s["close_ts"], round(wcum, 2)])

    first_month = et_date(settled[0]["close_ts"])[:7] if settled else f"{year:04d}-{mon:02d}"
    status = ledger.get_state(mode, "status") or {}
    open_pos = [
        {"ticker": t, "yes": p.yes_count, "no": p.no_count, "cost_cents": p.cost,
         "worst_case_cents": p.worst_case_loss}
        for t, p in ledger.open_positions(mode).items()
    ]
    return {
        "mode": mode,
        "modes": sorted(set(ledger.modes()) | {"live", "dry_run"}),
        "now": now,
        "status": status,
        "halted": ledger.get_state(mode, "halted"),
        "month": {
            "key": f"{year:04d}-{mon:02d}",
            "first": first_month,
            "days": days,
            "total_cents": sum(day_pnls),
            "win_days": sum(1 for p in day_pnls if p > 0),
            "loss_days": sum(1 for p in day_pnls if p < 0),
        },
        "pnl_curve": curve,
        "equity_curve": [[ts, eq] for ts, eq in ledger.equity_curve(mode)],
        "week": {
            "pnl_cents": sum(s["pnl_cents"] for s in week_settled),
            "markets": len(week_settled),
            "curve": week_curve,
            **ledger.fill_stats(mode, week_ago),
        },
        "totals": {
            "pnl_cents": sum(pnls),
            "markets": len(pnls),
            "win_rate": (len(wins) / len(pnls)) if pnls else None,
            "avg_win_cents": (sum(wins) / len(wins)) if wins else None,
            "avg_loss_cents": (sum(losses) / len(losses)) if losses else None,
            "largest_loss_cents": min(losses) if losses else None,
            **ledger.fill_stats(mode),
        },
        "open_positions": open_pos,
    }


def make_handler(db_path: str) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt: str, *args: Any) -> None:  # quiet
            log.debug(fmt, *args)

        def _send(self, code: int, body: bytes, ctype: str) -> None:
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self) -> None:  # noqa: N802
            url = urlparse(self.path)
            if url.path in ("/", "/index.html"):
                self._send(200, (STATIC / "index.html").read_bytes(), "text/html; charset=utf-8")
                return
            if url.path == "/api/summary":
                q = parse_qs(url.query)
                mode = (q.get("mode") or ["dry_run"])[0]
                month = (q.get("month") or [None])[0]
                ledger = Ledger(db_path)
                try:
                    data = build_summary(ledger, mode, month)
                except ValueError as exc:
                    self._send(400, json.dumps({"error": str(exc)}).encode(), "application/json")
                    return
                finally:
                    ledger.close()
                self._send(200, json.dumps(data).encode(), "application/json")
                return
            self._send(404, b"not found", "text/plain")

    return Handler


def serve(db_path: str, host: str = "127.0.0.1", port: int = 8050) -> None:
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    Ledger(db_path).close()  # create the schema if the bot has not run yet
    httpd = ThreadingHTTPServer((host, port), make_handler(db_path))
    print(f"dashboard on http://{host}:{port}  (Ctrl-C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

