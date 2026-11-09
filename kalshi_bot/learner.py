"""Learning from results.

Two learners, both deliberately simple so their behaviour is easy to inspect:

ProbabilityLearner
    Every minute the engine records, for each live market, the pricing model's
    probability and the Kalshi order book's mid price. When the market settles
    those rows get the outcome. A small logistic regression then learns how to
    combine the two (and how that changes with time to close):

        logit(p) = w0 + w1*L_model + w2*L_market + w3*L_model*f + w4*L_market*f

    with L = logit(probability) and f = seconds_left / 900. It starts at
    "trust the model" (w1 = 1, the rest 0) and is pulled back toward that by an
    L2 penalty, so a little data moves it a little. It is only *used* once it
    beats the plain model on markets it was not trained on.

EdgeLearner (one per series)
    One minute after each fill it checks the book mid: did the market move
    toward or away from our price? That "markout" measures adverse selection
    long before settlement does. Consistently negative markouts widen the edge
    we demand; consistently good ones narrow it. A series whose settled P&L is
    clearly negative gets benched for a few hours.
"""

from __future__ import annotations

import logging
import math
import threading
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from typing import Any, Callable

from .kalshi_client import Fill
from .ledger import Ledger

log = logging.getLogger(__name__)

HORIZON_SEC = 900.0
PRIOR = [0.0, 1.0, 0.0, 0.0, 0.0]
FEATURE_NAMES = ["bias", "model", "market", "model x time-left", "market x time-left"]
SHARED = "shared"


def logit(p: float) -> float:
    p = min(max(p, 0.005), 0.995)
    return math.log(p / (1 - p))


def sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    e = math.exp(z)
    return e / (1.0 + e)


def features(p_model: float, p_market: float | None, tau: float) -> list[float]:
    lm = logit(p_model)
    lk = logit(p_market) if p_market is not None else lm
    f = min(max(tau / HORIZON_SEC, 0.0), 1.0)
    return [1.0, lm, lk, lm * f, lk * f]


def _solve(a: list[list[float]], b: list[float]) -> list[float]:
    """Gaussian elimination with partial pivoting (tiny systems only)."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[piv] = m[piv], m[col]
        if abs(m[col][col]) < 1e-12:
            raise ValueError("singular system")
        for r in range(col + 1, n):
            f = m[r][col] / m[col][col]
            for c in range(col, n + 1):
                m[r][c] -= f * m[col][c]
    x = [0.0] * n
    for r in range(n - 1, -1, -1):
        x[r] = (m[r][n] - sum(m[r][c] * x[c] for c in range(r + 1, n))) / m[r][r]
    return x


def fit_logistic(xs: list[list[float]], ys: list[int], prior: list[float], l2: float, iters: int = 30) -> list[float]:
    """Newton's method on log-loss + l2/2 * ||w - prior||^2."""
    k = len(prior)
    w = list(prior)
    for _ in range(iters):
        g = [l2 * (w[j] - prior[j]) for j in range(k)]
        h = [[l2 if i == j else 0.0 for j in range(k)] for i in range(k)]
        for x, y in zip(xs, ys):
            p = sigmoid(sum(wi * xi for wi, xi in zip(w, x)))
            r = p - y
            s = max(p * (1 - p), 1e-6)
            for i in range(k):
                g[i] += r * x[i]
                xi_s = s * x[i]
                hi = h[i]
                for j in range(i, k):
                    hi[j] += xi_s * x[j]
        for i in range(k):
            for j in range(i):
                h[i][j] = h[j][i]
        step = _solve(h, g)
        w = [wi - si for wi, si in zip(w, step)]
        if max(abs(s) for s in step) < 1e-7:
            break
    return w


def log_loss(ps: list[float], ys: list[int]) -> float:
    eps = 1e-4
    return -sum(y * math.log(max(p, eps)) + (1 - y) * math.log(max(1 - p, eps)) for p, y in zip(ps, ys)) / len(ys)


def brier(ps: list[float], ys: list[int]) -> float:
    return sum((p - y) ** 2 for p, y in zip(ps, ys)) / len(ys)


# ------------------------------------------------------------------ probability


@dataclass
class ProbModelState:
    weights: list[float] = field(default_factory=lambda: list(PRIOR))
    active: bool = False
    n_samples: int = 0
    n_markets: int = 0
    holdout: dict[str, Any] = field(default_factory=dict)
    fitted_at: float = 0.0
    labeled_markets_at_fit: int = 0


class ProbabilityLearner:
    def __init__(self, ledger: Ledger, l2: float = 20.0, min_markets: int = 40, refit_every_markets: int = 5,
                 sample_every_sec: float = 60.0, min_tau: float = 60.0, background: bool = False):
        self.ledger = ledger
        self.background = background
        self.on_event: Callable[[str], None] | None = None
        self._refitting = threading.Lock()
        self.l2 = l2
        self.min_markets = min_markets
        self.refit_every_markets = refit_every_markets
        self.sample_every_sec = sample_every_sec
        self.min_tau = min_tau
        self._last_sample: dict[str, float] = {}
        raw = ledger.get_state(SHARED, "prob_model")
        self.state = ProbModelState(**raw) if raw else ProbModelState()
        self._new_labels = 0

    def observe(self, ticker: str, series: str, now: float, tau: float, p_model: float, p_market: float | None) -> None:
        if tau < self.min_tau or now - self._last_sample.get(ticker, 0.0) < self.sample_every_sec:
            return
        self._last_sample[ticker] = now
        self.ledger.add_sample(ticker, series, now, tau, p_model, p_market)

    def predict(self, p_model: float, p_market: float | None, tau: float) -> tuple[float, str]:
        if not self.state.active:
            return p_model, "model"
        z = sum(w * x for w, x in zip(self.state.weights, features(p_model, p_market, tau)))
        return min(max(sigmoid(z), 0.001), 0.999), "learned"

    def on_labeled(self, n_markets: int = 1) -> None:
        self._new_labels += n_markets
        if self._new_labels < self.refit_every_markets:
            return
        self._new_labels = 0
        if not self.background:
            self.refit()
        elif not self._refitting.locked():
            # Fitting takes seconds; keep the trading loop responsive.
            threading.Thread(target=self._refit_bg, name="refit", daemon=True).start()

    def _refit_bg(self) -> None:
        with self._refitting:
            try:
                self.refit()
            except Exception:  # noqa: BLE001
                log.exception("probability model refit failed")

    def refit(self) -> ProbModelState:
        rows = self.ledger.labeled_samples()
        markets: dict[str, list[dict]] = {}
        for r in rows:
            markets.setdefault(r["ticker"], []).append(r)
        order = sorted(markets, key=lambda t: max(r["ts"] for r in markets[t]))
        st = ProbModelState(**asdict(self.state))
        st.n_samples, st.n_markets = len(rows), len(order)
        if len(order) < 10:
            self.state = st
            self._save()
            return st

        # Time-ordered split: learn on older markets, judge on newer ones.
        cut = int(len(order) * 0.7)
        train = [r for t in order[:cut] for r in markets[t]]
        test = [r for t in order[cut:] for r in markets[t]]
        w = fit_logistic([features(r["p_model"], r["p_market"], r["tau"]) for r in train],
                         [r["outcome"] for r in train], PRIOR, self.l2)
        ys = [r["outcome"] for r in test]
        p_model = [r["p_model"] for r in test]
        p_market = [r["p_market"] if r["p_market"] is not None else r["p_model"] for r in test]
        p_learned = [sigmoid(sum(a * b for a, b in zip(w, features(r["p_model"], r["p_market"], r["tau"]))))
                     for r in test]
        st.holdout = {
            "markets": len(order) - cut,
            "samples": len(test),
            "logloss": {"model": log_loss(p_model, ys), "market": log_loss(p_market, ys),
                        "learned": log_loss(p_learned, ys)},
            "brier": {"model": brier(p_model, ys), "market": brier(p_market, ys), "learned": brier(p_learned, ys)},
        }
        was_active = st.active
        st.active = len(order) >= self.min_markets and st.holdout["logloss"]["learned"] < st.holdout["logloss"]["model"]
        # Final weights use everything we have.
        st.weights = fit_logistic([features(r["p_model"], r["p_market"], r["tau"]) for r in rows],
                                  [r["outcome"] for r in rows], PRIOR, self.l2)
        st.fitted_at = time.time()
        st.labeled_markets_at_fit = len(order)
        self.state = st
        self._save()
        ll = st.holdout["logloss"]
        log.info("probability model refit on %d markets: holdout log-loss model %.4f / market %.4f / learned %.4f -> %s",
                 len(order), ll["model"], ll["market"], ll["learned"], "USING learned" if st.active else "using model")
        if st.active != was_active:
            add_event(self.ledger, SHARED, hook=self.on_event, text=f"probability model {'switched to learned blend' if st.active else 'back to plain model'}"
                      f" (holdout log-loss learned {ll['learned']:.4f} vs model {ll['model']:.4f}, market {ll['market']:.4f})")
        return st

    def _save(self) -> None:
        self.ledger.set_state(SHARED, "prob_model", asdict(self.state))

    def describe(self) -> dict[str, Any]:
        d = asdict(self.state)
        d["feature_names"] = FEATURE_NAMES
        d["counts"] = self.ledger.sample_counts()
        return d


# -------------------------------------------------------------------- edge


@dataclass
class SeriesStats:
    edge: float
    markouts: list[list[float]] = field(default_factory=list)  # [markout_cents, contracts, fill_ts]
    fills_measured: int = 0
    since_adjust: int = 0
    market_pnls: list[list[float]] = field(default_factory=list)  # [pnl_cents, contracts]
    benched_until: float = 0.0
    changed_at: int = 0  # fills_measured when the edge last changed


@dataclass
class PendingMarkout:
    fill_key: str
    series: str
    ticker: str
    side: str
    price: int
    count: int
    ts: float


class EdgeLearner:
    def __init__(self, ledger: Ledger, mode: str, base_edge: float, min_edge: float = 1.0, max_edge: float = 10.0,
                 horizon_sec: float = 60.0, adjust_every: int = 10, window: int = 40, widen_below: float = 0.5,
                 narrow_above: float = 2.5, narrow_min_span_sec: float = 600.0, bench_min_markets: int = 20,
                 bench_t: float = -2.0, bench_hours: float = 6.0):
        self.ledger = ledger
        self.mode = mode
        self.on_event: Callable[[str], None] | None = None
        self.base_edge = base_edge
        self.min_edge, self.max_edge = min_edge, max_edge
        self.horizon = horizon_sec
        self.adjust_every = adjust_every
        self.window = window
        self.widen_below, self.narrow_above = widen_below, narrow_above
        self.narrow_min_span = narrow_min_span_sec
        self.bench_min_markets, self.bench_t, self.bench_hours = bench_min_markets, bench_t, bench_hours
        raw = ledger.get_state(mode, "edge_learner") or {}
        self.series: dict[str, SeriesStats] = {k: SeriesStats(**v) for k, v in (raw.get("series") or {}).items()}
        self.pending: list[PendingMarkout] = [PendingMarkout(**p) for p in raw.get("pending") or []]

    def _get(self, series: str) -> SeriesStats:
        if series not in self.series:
            self.series[series] = SeriesStats(edge=self.base_edge)
        return self.series[series]

    def edge(self, series: str) -> float:
        return self._get(series).edge

    def benched(self, series: str, now: float) -> bool:
        return self._get(series).benched_until > now

    def on_fill(self, fill: Fill, series: str) -> None:
        self.pending.append(PendingMarkout(fill.fill_key, series, fill.ticker, fill.side, fill.price, fill.count, fill.ts))

    def update(self, now: float, mid_after: Callable[[str, float], float | None],
               outcome: Callable[[str], int | None]) -> None:
        """Resolve markouts whose horizon has passed."""
        keep: list[PendingMarkout] = []
        changed = False
        for p in self.pending:
            if now < p.ts + self.horizon:
                keep.append(p)
                continue
            mid = mid_after(p.ticker, p.ts + self.horizon)
            if mid is None:
                o = outcome(p.ticker)  # market closed before the horizon: use where it settled
                if o is not None:
                    mid = float(o)
                elif now - p.ts < 3600:
                    keep.append(p)
                    continue
                else:
                    continue  # give up on it
            yes_value = mid * 100.0
            value = yes_value if p.side == "yes" else 100.0 - yes_value
            self._record_markout(p.series, value - p.price, p.count, p.ts)
            changed = True
        self.pending = keep
        if changed:
            self._save()

    def _record_markout(self, series: str, markout: float, count: int, fill_ts: float) -> None:
        st = self._get(series)
        st.markouts.append([round(markout, 3), count, fill_ts])
        st.markouts = st.markouts[-200:]
        st.fills_measured += 1
        st.since_adjust += 1
        if st.since_adjust < self.adjust_every:
            return
        st.since_adjust = 0
        # Judge only fills made at the current edge; older ones would make the
        # controller keep reacting to a problem it already responded to.
        n_since_change = min(st.fills_measured - st.changed_at, self.window, len(st.markouts))
        recent = st.markouts[-n_since_change:] if n_since_change else []
        total = sum(r[1] for r in recent)
        avg = sum(r[0] * r[1] for r in recent) / total if total else 0.0
        stamps = [r[2] for r in recent if len(r) > 2]
        span = (max(stamps) - min(stamps)) if stamps else 0.0
        old = st.edge
        if st.edge >= self.max_edge and avg < self.widen_below and len(recent) >= 2 * self.adjust_every:
            # Already as careful as we go and still picked off: sit this one out.
            st.benched_until = max(st.benched_until, fill_ts + self.bench_hours * 3600)
            st.changed_at = st.fills_measured
            add_event(self.ledger, self.mode, hook=self.on_event, text=
                      f"{series}: benched for {self.bench_hours:g}h; still picked off at the {self.max_edge:g}c "
                      f"maximum edge (avg 1-min markout {avg:+.2f}c over {len(recent)} fills)")
            return
        # Quick to get careful, slow to get greedy: fills arrive in bursts during a
        # single price move, so narrowing needs good results spread over time.
        if avg < self.widen_below:
            st.edge = min(self.max_edge, st.edge + 1.0)
        elif avg > self.narrow_above and span >= self.narrow_min_span:
            st.edge = max(self.min_edge, st.edge - 0.5)
        if st.edge != old:
            st.changed_at = st.fills_measured
            add_event(self.ledger, self.mode, hook=self.on_event, text=
                      f"{series}: edge {old:g}c -> {st.edge:g}c (avg 1-min markout {avg:+.2f}c over the "
                      f"{len(recent)} fills since its last change)")

    def on_settled(self, series: str, pnl_cents: float, contracts: int, now: float) -> None:
        st = self._get(series)
        st.market_pnls.append([pnl_cents, contracts])
        st.market_pnls = st.market_pnls[-300:]
        pnls = [p for p, _ in st.market_pnls[-60:]]
        if len(pnls) >= self.bench_min_markets:
            mean = sum(pnls) / len(pnls)
            var = sum((p - mean) ** 2 for p in pnls) / (len(pnls) - 1)
            t = mean / math.sqrt(var / len(pnls)) if var > 0 else 0.0
            if t < self.bench_t and st.benched_until <= now:
                st.benched_until = now + self.bench_hours * 3600
                st.edge = min(self.max_edge, st.edge + 2.0)
                st.changed_at = st.fills_measured
                st.market_pnls = []
                add_event(self.ledger, self.mode, hook=self.on_event, text=
                          f"{series}: benched for {self.bench_hours:g}h; lost {-mean / 100:.2f} USD per market over "
                          f"{len(pnls)} markets (t={t:.1f}); edge raised to {st.edge:g}c for the comeback")
        self._save()

    def _save(self) -> None:
        self.ledger.set_state(self.mode, "edge_learner", {
            "series": {k: asdict(v) for k, v in self.series.items()},
            "pending": [asdict(p) for p in self.pending],
        })

    def describe(self, now: float) -> dict[str, Any]:
        out = {}
        for name, st in sorted(self.series.items()):
            recent = st.markouts[-self.window:]
            total = sum(r[1] for r in recent)
            pnl = [p for p, _ in st.market_pnls]
            out[name] = {
                "edge": st.edge,
                "fills_measured": st.fills_measured,
                "avg_markout_cents": (sum(r[0] * r[1] for r in recent) / total) if total else None,
                "markets": len(pnl),
                "pnl_cents": sum(pnl),
                "benched_until": st.benched_until if st.benched_until > now else None,
            }
        return out


# ------------------------------------------------------------------- facade


def add_event(ledger: Ledger, mode: str, text: str, hook: Callable[[str], None] | None = None) -> None:
    log.info("LEARNED: %s", text)
    if hook is not None:
        try:
            hook(text)
        except Exception:  # noqa: BLE001 - a notification problem must not break learning
            log.exception("learning event hook failed")
    events = ledger.get_state(mode, "learning_events") or []
    events.append([time.time(), text])
    ledger.set_state(mode, "learning_events", events[-100:])


class Learner:
    """What the engine talks to."""

    def __init__(self, ledger: Ledger, mode: str, base_edge: float):
        self.ledger = ledger
        self.mode = mode
        self.prob = ProbabilityLearner(ledger, background=True)
        self.edges = EdgeLearner(ledger, mode, base_edge)
        self._mids: dict[str, deque[tuple[float, float]]] = {}
        self._outcomes: dict[str, int] = {}

    # called every tick per market
    def observe(self, ticker: str, series: str, now: float, tau: float, p_model: float, p_mid: float | None) -> None:
        if p_mid is not None:
            self._mids.setdefault(ticker, deque(maxlen=900)).append((now, p_mid))
        self.prob.observe(ticker, series, now, tau, p_model, p_mid)

    def fair(self, p_model: float, p_mid: float | None, tau: float) -> tuple[float, str]:
        return self.prob.predict(p_model, p_mid, tau)

    def edge(self, series: str) -> float:
        return self.edges.edge(series)

    def set_event_hook(self, hook: Callable[[str], None] | None) -> None:
        self.prob.on_event = hook
        self.edges.on_event = hook

    def benched(self, series: str, now: float) -> bool:
        return self.edges.benched(series, now)

    def on_fill(self, fill: Fill, series: str) -> None:
        self.edges.on_fill(fill, series)

    def mid_after(self, ticker: str, ts: float) -> float | None:
        for t, mid in self._mids.get(ticker, ()):
            if t >= ts:
                return mid if t - ts <= 15 else None
        return None

    def update(self, now: float) -> None:
        self.edges.update(now, self.mid_after, self._outcomes.get)

    def on_market_result(self, ticker: str, result: str) -> None:
        o = 1 if result == "yes" else 0
        self._outcomes[ticker] = o
        if self.ledger.label_samples(ticker, o):
            self.prob.on_labeled()
        self._mids.pop(ticker, None)

    def on_settled(self, series: str, pnl_cents: float, contracts: int, now: float) -> None:
        self.edges.on_settled(series, pnl_cents, contracts, now)

    def describe(self, now: float) -> dict[str, Any]:
        events = (self.ledger.get_state(SHARED, "learning_events") or []) + \
                 (self.ledger.get_state(self.mode, "learning_events") or [])
        return {
            "probability": self.prob.describe(),
            "series": self.edges.describe(now),
            "events": sorted(events)[-30:],
        }


def describe_from_ledger(ledger: Ledger, mode: str, now: float) -> dict[str, Any]:
    """Dashboard view without a running engine."""
    return Learner(ledger, mode, base_edge=0.0).describe(now)
