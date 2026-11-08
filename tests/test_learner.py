import math
import random

from kalshi_bot.kalshi_client import Fill
from kalshi_bot.learner import (
    PRIOR, EdgeLearner, Learner, ProbabilityLearner, fit_logistic, logit, sigmoid,
)
from kalshi_bot.ledger import Ledger

T0 = 1_800_000_000.0


def synthetic(ledger, n_markets, truth, seed=1, per_market=10):
    """Markets where the outcome follows `truth(p_model, p_market, tau)`."""
    rnd = random.Random(seed)
    rows = []
    for m in range(n_markets):
        for k in range(per_market):
            tau = 840 - 60 * k
            p_true = rnd.uniform(0.05, 0.95)
            p_market = min(max(p_true + rnd.gauss(0, 0.03), 0.02), 0.98)
            p_model = min(max(0.5 + (p_true - 0.5) * 0.6 + rnd.gauss(0, 0.08), 0.02), 0.98)  # underconfident + noisy
            y = int(rnd.random() < truth(p_true))
            rows.append((f"M{m}", "KXBTC15M", T0 + m * 900 + k * 60, float(tau), p_model, p_market, y, "history"))
    ledger.add_samples(rows)


def test_fit_logistic_recovers_weights():
    rnd = random.Random(0)
    xs, ys = [], []
    for _ in range(4000):
        x = rnd.uniform(-3, 3)
        xs.append([1.0, x])
        ys.append(int(rnd.random() < sigmoid(0.4 + 1.7 * x)))
    w = fit_logistic(xs, ys, [0.0, 1.0], l2=1e-6)
    assert abs(w[0] - 0.4) < 0.15 and abs(w[1] - 1.7) < 0.15


def test_learns_to_lean_on_the_better_signal(tmp_path):
    led = Ledger(str(tmp_path / "l.sqlite"))
    synthetic(led, 120, truth=lambda p: p)
    pl = ProbabilityLearner(led, min_markets=40)
    st = pl.refit()
    ll = st.holdout["logloss"]
    assert ll["learned"] < ll["model"]
    assert st.active
    assert st.weights[2] + st.weights[4] > st.weights[1] + st.weights[3]  # market weighted above model
    p, src = pl.predict(0.55, 0.80, 300)
    assert src == "learned" and p > 0.7


def test_little_data_stays_inactive_and_near_prior(tmp_path):
    led = Ledger(str(tmp_path / "l.sqlite"))
    synthetic(led, 12, truth=lambda p: p)
    pl = ProbabilityLearner(led, min_markets=40)
    st = pl.refit()
    assert not st.active
    assert pl.predict(0.6, 0.9, 300) == (0.6, "model")


def test_state_persists(tmp_path):
    led = Ledger(str(tmp_path / "l.sqlite"))
    synthetic(led, 80, truth=lambda p: p)
    ProbabilityLearner(led, min_markets=40).refit()
    again = ProbabilityLearner(led)
    assert again.state.active and again.state.weights != PRIOR


def fill(i, side="yes", price=50, count=2, ts=T0, ticker="KXETH15M-A"):
    return Fill(f"f{i}", None, ticker, side, price, count, False, ts)


def test_edge_widens_after_adverse_markouts_and_narrows_after_good_ones(tmp_path):
    led = Ledger(str(tmp_path / "l.sqlite"))
    el = EdgeLearner(led, "dry_run", base_edge=3.0, adjust_every=10)
    for i in range(10):
        el.on_fill(fill(i, price=50, ts=T0 + i), "KXETH15M")
    el.update(T0 + 100, mid_after=lambda t, ts: 0.47, outcome=lambda t: None)  # YES bought at 50, now worth 47
    assert el.edge("KXETH15M") == 4.0
    for i in range(10, 20):
        el.on_fill(fill(i, side="no", price=40, ts=T0 + 200 + 70 * i), "KXETH15M")  # spread over 10+ minutes
    el.update(T0 + 2000, mid_after=lambda t, ts: 0.50, outcome=lambda t: None)  # NO bought at 40, worth 50
    # only the 10 fills since the change count (+10c each), not the earlier -3c ones -> narrow
    assert el.edge("KXETH15M") == 3.5
    reloaded = EdgeLearner(led, "dry_run", base_edge=3.0)
    assert reloaded.edge("KXETH15M") == 3.5
    events = led.get_state("dry_run", "learning_events")
    assert any("edge 3c -> 4c" in e[1] for e in events)


def test_edge_does_not_overreact_to_fills_from_before_a_change(tmp_path):
    led = Ledger(str(tmp_path / "l.sqlite"))
    el = EdgeLearner(led, "dry_run", base_edge=3.0, adjust_every=10, window=40)
    for i in range(10):
        el.on_fill(fill(i, price=50, ts=T0 + i), "KXSOL15M")
    el.update(T0 + 100, mid_after=lambda t, ts: 0.40, outcome=lambda t: None)  # -10c each
    assert el.edge("KXSOL15M") == 4.0
    # After widening, fills are fine (+1.5c): no further widening despite the bad history.
    for i in range(10, 20):
        el.on_fill(fill(i, price=50, ts=T0 + 200 + i), "KXSOL15M")
    el.update(T0 + 400, mid_after=lambda t, ts: 0.515, outcome=lambda t: None)
    assert el.edge("KXSOL15M") == 4.0


def test_narrowing_needs_results_spread_over_time(tmp_path):
    led = Ledger(str(tmp_path / "l.sqlite"))
    el = EdgeLearner(led, "dry_run", base_edge=3.0, adjust_every=10, narrow_min_span_sec=600)
    for i in range(10):  # one burst: 10 great fills within 10 seconds
        el.on_fill(fill(i, side="no", price=40, ts=T0 + i), "KXETH15M")
    el.update(T0 + 100, mid_after=lambda t, ts: 0.50, outcome=lambda t: None)
    assert el.edge("KXETH15M") == 3.0
    for i in range(10, 20):  # more good fills, now spanning > 10 minutes in total
        el.on_fill(fill(i, side="no", price=40, ts=T0 + 700 + i), "KXETH15M")
    el.update(T0 + 900, mid_after=lambda t, ts: 0.50, outcome=lambda t: None)
    assert el.edge("KXETH15M") == 2.5


def test_markout_falls_back_to_settlement(tmp_path):
    led = Ledger(str(tmp_path / "l.sqlite"))
    el = EdgeLearner(led, "dry_run", base_edge=3.0)
    el.on_fill(fill(1, side="yes", price=60), "KXETH15M")
    el.update(T0 + 30, mid_after=lambda t, ts: None, outcome=lambda t: None)
    assert len(el.pending) == 1  # not due yet
    el.update(T0 + 120, mid_after=lambda t, ts: None, outcome=lambda t: 0)
    assert el.pending == [] and el.series["KXETH15M"].markouts == [[-60.0, 2, T0]]


def test_bench_after_clear_losses(tmp_path):
    led = Ledger(str(tmp_path / "l.sqlite"))
    el = EdgeLearner(led, "dry_run", base_edge=3.0, bench_min_markets=20, bench_hours=6)
    rnd = random.Random(2)
    for _ in range(25):
        el.on_settled("KXSOL15M", -100 + rnd.gauss(0, 30), 5, T0)
    assert el.benched("KXSOL15M", T0 + 3600)
    assert not el.benched("KXSOL15M", T0 + 7 * 3600)
    assert el.edge("KXSOL15M") == 5.0


def test_learner_mid_lookup_and_labelling(tmp_path):
    led = Ledger(str(tmp_path / "l.sqlite"))
    ln = Learner(led, "dry_run", base_edge=3.0)
    ln.observe("KXBTC15M-A", "KXBTC15M", T0, 600, 0.5, 0.52)
    ln.observe("KXBTC15M-A", "KXBTC15M", T0 + 30, 570, 0.5, 0.55)  # within 60s: no new sample row
    ln.observe("KXBTC15M-A", "KXBTC15M", T0 + 61, 539, 0.5, 0.58)
    assert ln.mid_after("KXBTC15M-A", T0 + 20) == 0.55
    assert ln.mid_after("KXBTC15M-A", T0 + 200) is None
    assert led.unlabeled_tickers(T0 + 10_000) == ["KXBTC15M-A"]
    ln.on_market_result("KXBTC15M-A", "yes")
    rows = led.labeled_samples()
    assert len(rows) == 2 and all(r["outcome"] == 1 for r in rows)
    assert logit(0.5) == 0 and math.isclose(sigmoid(logit(0.8)), 0.8)


def test_background_refit_swaps_in_new_state(tmp_path):
    import time as _time

    led = Ledger(str(tmp_path / "l.sqlite"))
    synthetic(led, 80, truth=lambda p: p)
    pl = ProbabilityLearner(led, min_markets=40, refit_every_markets=1, background=True)
    assert not pl.state.active
    pl.on_labeled()
    deadline = _time.time() + 20
    while not pl.state.active and _time.time() < deadline:
        _time.sleep(0.05)
    assert pl.state.active and pl.state.n_markets == 80
