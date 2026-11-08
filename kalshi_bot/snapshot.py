"""Carry what the bot has learned between machines and sessions.

A snapshot is a folder with:
  samples.csv.gz  every labelled (model probability, market price, outcome) row
  state.json      the fitted probability model, per-series edges, recent learning events

Importing is idempotent: samples are de-duplicated, and learned state only
replaces local state when the snapshot knows more.
"""

from __future__ import annotations

import csv
import gzip
import json
import logging
import time
from pathlib import Path
from typing import Any

from .ledger import Ledger

log = logging.getLogger(__name__)

SAMPLE_FIELDS = ["ticker", "series", "ts", "tau", "p_model", "p_market", "outcome", "source"]
SHARED = "shared"


def export_snapshot(ledger: Ledger, mode: str, folder: str | Path) -> dict[str, Any]:
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    rows = ledger.labeled_samples(limit=10_000_000)
    with gzip.open(folder / "samples.csv.gz", "wt", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(SAMPLE_FIELDS)
        for r in rows:
            w.writerow([
                r["ticker"], r["series"], f"{r['ts']:.3f}", f"{r['tau']:.1f}", f"{r['p_model']:.6f}",
                "" if r["p_market"] is None else f"{r['p_market']:.6f}", r["outcome"], r["source"],
            ])
    edge = ledger.get_state(mode, "edge_learner") or {}
    settled = ledger.settlements(mode)
    state = {
        "exported_at": time.time(),
        "mode": mode,
        "prob_model": ledger.get_state(SHARED, "prob_model"),
        "edge_learner": {"series": edge.get("series") or {}},
        "learning_events": {
            SHARED: ledger.get_state(SHARED, "learning_events") or [],
            mode: ledger.get_state(mode, "learning_events") or [],
        },
        "paper_results": {
            "markets": len(settled),
            "pnl_cents": sum(s["pnl_cents"] for s in settled),
            "wins": sum(1 for s in settled if s["pnl_cents"] > 0),
            "losses": sum(1 for s in settled if s["pnl_cents"] < 0),
            "first_close_ts": settled[0]["close_ts"] if settled else None,
            "last_close_ts": settled[-1]["close_ts"] if settled else None,
        },
    }
    (folder / "state.json").write_text(json.dumps(state, indent=1))
    markets = len({r["ticker"] for r in rows})
    return {"samples": len(rows), "markets": markets, "folder": str(folder)}


def import_snapshot(ledger: Ledger, mode: str, folder: str | Path) -> dict[str, Any]:
    folder = Path(folder)
    before = ledger.sample_counts()
    batch: list[tuple] = []
    with gzip.open(folder / "samples.csv.gz", "rt", newline="") as fh:
        for r in csv.DictReader(fh):
            batch.append((
                r["ticker"], r["series"], float(r["ts"]), float(r["tau"]), float(r["p_model"]),
                float(r["p_market"]) if r["p_market"] else None, int(r["outcome"]), r["source"],
            ))
            if len(batch) >= 5000:
                ledger.add_samples(batch)
                batch = []
    if batch:
        ledger.add_samples(batch)

    state = json.loads((folder / "state.json").read_text())
    local_pm = ledger.get_state(SHARED, "prob_model") or {}
    snap_pm = state.get("prob_model") or {}
    took_model = False
    if snap_pm and snap_pm.get("n_markets", 0) > local_pm.get("n_markets", 0):
        ledger.set_state(SHARED, "prob_model", snap_pm)
        took_model = True

    took_edges = False
    snap_series = (state.get("edge_learner") or {}).get("series") or {}
    local_edge = ledger.get_state(mode, "edge_learner") or {}
    if snap_series and not local_edge.get("series") and mode == state.get("mode"):
        # Edges learned on paper are only a starting point for the same mode.
        ledger.set_state(mode, "edge_learner", {"series": snap_series, "pending": []})
        took_edges = True

    for key_mode, events in (state.get("learning_events") or {}).items():
        target = SHARED if key_mode == SHARED else mode
        if key_mode != SHARED and key_mode != mode:
            continue
        mine = ledger.get_state(target, "learning_events") or []
        merged = sorted({(e[0], e[1]) for e in mine + events})
        ledger.set_state(target, "learning_events", [list(e) for e in merged][-100:])

    after = ledger.sample_counts()
    added = sum(after.get(k, 0) for k in after if k.endswith("_samples")) - \
        sum(before.get(k, 0) for k in before if k.endswith("_samples"))
    return {"samples_added": added, "took_model": took_model, "took_edges": took_edges}


def has_snapshot(folder: str | Path) -> bool:
    folder = Path(folder)
    return (folder / "samples.csv.gz").is_file() and (folder / "state.json").is_file()
