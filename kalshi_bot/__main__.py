"""Command line entry point: python -m kalshi_bot <command>."""

from __future__ import annotations

import argparse
import logging
import os
import signal
import sys
import time
from pathlib import Path

from .config import DEMO_BASE_URL, PROD_BASE_URL, Config, load_config
from .kalshi_client import KalshiAuth, KalshiClient, parse_market, parse_orderbook
from .ledger import Ledger


def _setup_logging(cfg: Config, verbose: bool) -> None:
    Path(cfg.log_path).parent.mkdir(parents=True, exist_ok=True)
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s %(levelname)-7s %(name)s: %(message)s"
    logging.basicConfig(level=level, format=fmt, handlers=[logging.StreamHandler(), logging.FileHandler(cfg.log_path)])
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def _auth(cfg: Config, required: bool) -> KalshiAuth | None:
    if cfg.api_key_id and (cfg.private_key_path or cfg.private_key_pem):
        if cfg.private_key_pem:
            return KalshiAuth.from_pem(cfg.api_key_id, cfg.private_key_pem.replace("\\n", "\n"))
        return KalshiAuth.from_file(cfg.api_key_id, cfg.private_key_path)  # type: ignore[arg-type]
    if required:
        sys.exit("set KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY_PATH (see .env.example)")
    return None


def _client(cfg: Config, demo: bool, auth_required: bool) -> KalshiClient:
    base = os.environ.get("KALSHI_BASE_URL") or (DEMO_BASE_URL if demo else PROD_BASE_URL)
    return KalshiClient(base, auth=_auth(cfg, auth_required), max_requests_per_sec=cfg.kalshi_max_requests_per_sec)


def cmd_run(args: argparse.Namespace, cfg: Config) -> None:
    from .broker import LiveBroker, PaperBroker
    from .engine import Engine
    from .risk import RiskManager
    from .spot import SpotFeed, VolEstimator, build_sources, historical_minute_closes

    _setup_logging(cfg, args.verbose)
    log = logging.getLogger("kalshi_bot")
    live = args.live
    ledger = Ledger(cfg.db_path)
    series = [m.series for m in cfg.enabled_markets()]
    symbols = sorted({m.symbol for m in cfg.enabled_markets()})

    if live:
        client = _client(cfg, args.demo, auth_required=True)
        mode = "demo" if args.demo else "live"
        broker = LiveBroker(client, ledger, cfg.fees, series, mode=mode, price_field=cfg.order_price_field)
        if not args.demo and not args.yes:
            print("LIVE TRADING with real money on Kalshi. Starting in 10 seconds; Ctrl-C to abort.")
            time.sleep(10)
    else:
        # Dry run reads real production market data; it never sends an order.
        client = _client(cfg, False, auth_required=False)
        broker = PaperBroker(client, ledger, cfg.fees, cfg.paper)

    vol = VolEstimator(halflife_minutes=cfg.vol_halflife_minutes)
    for sym in symbols:
        closes = historical_minute_closes(sym, time.time() - 6 * 3600, time.time())
        vol.seed(sym, closes)
        sigma = vol.sigma(sym)
        log.info("%s: seeded vol from %d candles -> %s", sym, len(closes),
                 f"{sigma * (365 * 24 * 3600) ** 0.5:.0%} annualised" if sigma else "not ready (will warm up live)")

    feed = SpotFeed(symbols, build_sources(cfg.spot_sources), cfg.spot_poll_interval_sec,
                    cfg.strategy.stale_spot_seconds, vol=vol, fallback=build_sources(cfg.spot_fallback_sources))
    feed.start()
    broker.start()
    learner = None
    if cfg.learning:
        from .learner import Learner
        from .snapshot import has_snapshot, import_snapshot

        if not ledger.sample_counts() and has_snapshot(cfg.learned_dir):
            res = import_snapshot(ledger, broker.mode, cfg.learned_dir)
            log.info("seeded learning from %s/: %d samples, model %s, edges %s", cfg.learned_dir,
                     res["samples_added"], "imported" if res["took_model"] else "kept",
                     "imported" if res["took_edges"] else "kept")

        learner = Learner(ledger, broker.mode, cfg.strategy.min_edge_cents)
        st = learner.prob.state
        log.info("learning on: probability model %s (%d labelled markets)",
                 "uses learned blend" if st.active else "uses plain model", st.n_markets)
    engine = Engine(cfg, client, broker, ledger, feed, vol, RiskManager(cfg.risk, cfg.sizing), learner=learner)

    def _stop(signum: int, _frame: object) -> None:
        log.info("signal %d received", signum)
        engine.stop()

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)
    log.info("running in %s mode on %s", broker.mode, ", ".join(series))
    try:
        engine.run()
    finally:
        feed.stop()
        ledger.close()


def cmd_dashboard(args: argparse.Namespace, cfg: Config) -> None:
    from .dashboard.server import serve

    serve(cfg.db_path, args.host or cfg.dashboard.host, args.port or cfg.dashboard.port)


def cmd_check(args: argparse.Namespace, cfg: Config) -> None:
    """Smoke-test connectivity and show how Kalshi's responses parse."""
    from .spot import build_sources

    client = _client(cfg, args.demo, auth_required=False)
    try:
        print("exchange status:", client.get_exchange_status())
    except Exception as exc:  # noqa: BLE001
        sys.exit(f"cannot reach Kalshi at {client.base_url}: {exc}")
    now = time.time()
    for spec in cfg.markets:
        try:
            data = client.get_markets(series_ticker=spec.series, status="open", limit=10)
        except Exception as exc:  # noqa: BLE001
            print(f"\n{spec.series}: request failed: {exc}")
            continue
        markets = data.get("markets") or []
        print(f"\n{spec.series} ({spec.symbol}): {len(markets)} open market(s)")
        for raw in markets[:3]:
            m = parse_market(raw, spec.series)
            print(f"  {m.ticker} status={m.status} strike_type={m.strike_type} strike={m.strike} "
                  f"closes_in={m.close_ts - now:.0f}s")
            yes, no = parse_orderbook(client.get_orderbook(m.ticker))
            print(f"    best YES bid {yes[0] if yes else None}  best NO bid {no[0] if no else None}")
        if markets and args.raw:
            import json

            print(json.dumps(markets[0], indent=2)[:3000])
        if not markets:
            print("  (none - check the series ticker, or disable it in config)")
    print("\nspot sources:")
    symbols = sorted({m.symbol for m in cfg.markets})
    for src in build_sources(cfg.spot_sources + cfg.spot_fallback_sources):
        print(f"  {src.name}: {src.fetch(symbols)}")
    auth = _auth(cfg, required=False)
    if auth:
        print("\nbalance:", client.get_balance())
    else:
        print("\nno API credentials configured (fine for dry-run)")


def cmd_calibrate(args: argparse.Namespace, cfg: Config) -> None:
    from .calibrate import report, run_calibration

    logging.basicConfig(level=logging.WARNING)
    client = _client(cfg, False, auth_required=False)
    specs = [m for m in cfg.enabled_markets() if args.series in (None, m.series)]
    for spec in specs:
        samples = run_calibration(
            client, spec.series, spec.symbol, days=args.days,
            checkpoints=tuple(int(x) for x in args.checkpoints.split(",")),
            with_market=not args.no_market, vol_halflife_minutes=cfg.vol_halflife_minutes,
            vol_multiplier=cfg.strategy.vol_multiplier, window=cfg.strategy.settlement_window_sec,
        )
        if samples:
            print(report(samples))


def cmd_learn(args: argparse.Namespace, cfg: Config) -> None:
    """Pre-train the probability learner on recently settled markets."""
    from .calibrate import run_calibration
    from .learner import ProbabilityLearner

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    client = _client(cfg, False, auth_required=False)
    client.max_retries = 6  # background job: wait out rate limits rather than fail
    ledger = Ledger(cfg.db_path)
    checkpoints = tuple(range(840, 59, -60))
    specs = [m for m in cfg.enabled_markets() if args.series in (None, m.series)]
    for spec in specs:
        samples = run_calibration(
            client, spec.series, spec.symbol, days=args.days, checkpoints=checkpoints, with_market=True,
            vol_halflife_minutes=cfg.vol_halflife_minutes, vol_multiplier=cfg.strategy.vol_multiplier,
            window=cfg.strategy.settlement_window_sec, request_pause=args.pause,
        )
        ledger.add_samples([(s.ticker, spec.series, s.ts, float(s.checkpoint), s.model_p, s.market_p, s.outcome,
                             "history") for s in samples])
        print(f"  stored {len(samples)} samples")
    st = ProbabilityLearner(ledger).refit()
    h = st.holdout
    print(f"\ntrained on {st.n_markets} markets / {st.n_samples} samples")
    if h:
        print(f"held-out test on the newest {h['markets']} markets ({h['samples']} samples), lower is better:")
        for k in ("model", "market", "learned"):
            print(f"  {k:<8} log-loss {h['logloss'][k]:.4f}   Brier {h['brier'][k]:.4f}")
    print("weights:", ", ".join(f"{n}={w:+.3f}" for n, w in zip(
        ["bias", "model", "market", "model*t", "market*t"], st.weights)))
    print("the bot will", "USE the learned blend" if st.active else "keep the plain model (learned blend did not beat it)")


def cmd_export_learning(args: argparse.Namespace, cfg: Config) -> None:
    from .snapshot import export_snapshot

    res = export_snapshot(Ledger(cfg.db_path), _mode(args), args.dir or cfg.learned_dir)
    print(f"exported {res['samples']} samples from {res['markets']} markets to {res['folder']}/")


def cmd_import_learning(args: argparse.Namespace, cfg: Config) -> None:
    from .snapshot import import_snapshot

    res = import_snapshot(Ledger(cfg.db_path), _mode(args), args.dir or cfg.learned_dir)
    print(f"added {res['samples_added']} samples; probability model {'imported' if res['took_model'] else 'kept local'}; "
          f"edges {'imported' if res['took_edges'] else 'kept local'}")
    print("the bot refits on these the next time a market settles while it runs")


def _mode(args: argparse.Namespace) -> str:
    return "live" if getattr(args, "live", False) else ("demo" if getattr(args, "demo", False) else "dry_run")


def cmd_analyze(args: argparse.Namespace, cfg: Config) -> None:
    from .analyze import report

    print(report(Ledger(cfg.db_path), _mode(args)))


def cmd_status(args: argparse.Namespace, cfg: Config) -> None:
    from .dashboard.server import build_summary

    ledger = Ledger(cfg.db_path)
    mode = "live" if args.live else ("demo" if args.demo else "dry_run")
    s = build_summary(ledger, mode)
    st = s["status"]
    print(f"mode {mode}")
    if st:
        print(f"  last tick {time.time() - st['ts']:.0f}s ago | equity {st['equity_cents'] / 100:.2f} USD | "
              f"cash {st['cash_cents'] / 100:.2f} | stop: {st.get('stop_reason')}")
    if s["halted"]:
        print(f"  HALTED: {s['halted']}  (python -m kalshi_bot reset-halt)")
    t = s["totals"]
    print(f"  all-time P&L {t['pnl_cents'] / 100:+.2f} over {t['markets']} markets, fees {t['fees_cents'] / 100:.2f}")
    print(f"  7-day P&L {s['week']['pnl_cents'] / 100:+.2f} over {s['week']['markets']} markets")
    for day, d in sorted(s["month"]["days"].items()):
        print(f"    {day}  {d['pnl_cents'] / 100:+9.2f}  ({d['markets']} markets)")
    for p in s["open_positions"]:
        print(f"  open {p['ticker']}: {p['yes']} YES / {p['no']} NO, cost {p['cost_cents'] / 100:.2f}")


def cmd_cancel_all(args: argparse.Namespace, cfg: Config) -> None:
    from .broker import CLIENT_ID_PREFIX

    client = _client(cfg, args.demo, auth_required=True)
    n = 0
    for o in client.get_orders(status="resting"):
        if args.everything or str(o.get("client_order_id") or "").startswith(CLIENT_ID_PREFIX):
            client.cancel_order(o["order_id"])
            n += 1
    print(f"cancelled {n} order(s)")


def cmd_reset_halt(args: argparse.Namespace, cfg: Config) -> None:
    ledger = Ledger(cfg.db_path)
    mode = "live" if args.live else ("demo" if args.demo else "dry_run")
    ledger.set_state(mode, "halted", None)
    ledger.set_state(mode, "peak_equity", None)
    ledger.set_state(mode, "day_start_equity", None)
    print(f"cleared halt, peak and day-start equity for {mode}")


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="kalshi_bot", description="Maker bot for Kalshi 15-minute crypto markets")
    p.add_argument("-c", "--config", help="YAML config file (default: config.yaml if present)")
    sub = p.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run", help="run the bot (dry-run unless --live)")
    r.add_argument("--live", action="store_true", help="send real orders")
    r.add_argument("--demo", action="store_true", help="with --live: use Kalshi's demo exchange")
    r.add_argument("--yes", action="store_true", help="skip the 10-second live-trading countdown")
    r.add_argument("-v", "--verbose", action="store_true")
    r.set_defaults(func=cmd_run)

    d = sub.add_parser("dashboard", help="serve the P&L dashboard")
    d.add_argument("--host")
    d.add_argument("--port", type=int)
    d.set_defaults(func=cmd_dashboard)

    c = sub.add_parser("check", help="test connectivity and parsing")
    c.add_argument("--demo", action="store_true")
    c.add_argument("--raw", action="store_true", help="print one raw market object")
    c.set_defaults(func=cmd_check)

    k = sub.add_parser("calibrate", help="score the pricing model against settled markets")
    k.add_argument("--series", help="one series ticker (default: all enabled)")
    k.add_argument("--days", type=float, default=3.0)
    k.add_argument("--checkpoints", default="600,300,120", help="seconds before close, comma-separated")
    k.add_argument("--no-market", action="store_true", help="skip fetching Kalshi price history")
    k.set_defaults(func=cmd_calibrate)

    ln = sub.add_parser("learn", help="pre-train the probability learner on settled markets")
    ln.add_argument("--series", help="one series ticker (default: all enabled)")
    ln.add_argument("--days", type=float, default=7.0)
    ln.add_argument("--pause", type=float, default=0.8, help="seconds between Kalshi requests (rate limits)")
    ln.set_defaults(func=cmd_learn)

    for name, func, helptext in (
        ("export-learning", cmd_export_learning, "write what the bot learned to a folder (default: learned/)"),
        ("import-learning", cmd_import_learning, "load a learned/ snapshot into the local database"),
    ):
        e = sub.add_parser(name, help=helptext)
        e.add_argument("--dir", help="snapshot folder (default: learned_dir from config)")
        e.add_argument("--live", action="store_true")
        e.add_argument("--demo", action="store_true")
        e.set_defaults(func=func)

    a = sub.add_parser("analyze", help="where the bot makes and loses money (by coin, time left, price, side)")
    a.add_argument("--live", action="store_true")
    a.add_argument("--demo", action="store_true")
    a.set_defaults(func=cmd_analyze)

    s = sub.add_parser("status", help="print P&L summary from the local ledger")
    s.add_argument("--live", action="store_true")
    s.add_argument("--demo", action="store_true")
    s.set_defaults(func=cmd_status)

    x = sub.add_parser("cancel-all", help="cancel the bot's resting orders on Kalshi")
    x.add_argument("--demo", action="store_true")
    x.add_argument("--everything", action="store_true", help="also cancel orders the bot did not place")
    x.set_defaults(func=cmd_cancel_all)

    h = sub.add_parser("reset-halt", help="clear a drawdown halt and reset peak equity")
    h.add_argument("--live", action="store_true")
    h.add_argument("--demo", action="store_true")
    h.set_defaults(func=cmd_reset_halt)

    args = p.parse_args(argv)
    config_path = args.config or ("config.yaml" if Path("config.yaml").exists() else None)
    cfg = load_config(config_path)
    args.func(args, cfg)


if __name__ == "__main__":
    main()
