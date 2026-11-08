import math

from kalshi_bot.broker import PaperBroker
from kalshi_bot.config import Config, MarketSpec, PaperConfig, RiskConfig
from kalshi_bot.engine import Engine
from kalshi_bot.ledger import Ledger
from kalshi_bot.risk import RiskManager

from .fakes import FakeFeed, FakeKalshi, FakeVol

SIG = 0.5 / math.sqrt(365 * 24 * 3600)
OPEN = 1_800_000_000.0  # window opens
CLOSE = OPEN + 900


def build(tmp_path, spot=100_000.0):
    cfg = Config(markets=[MarketSpec("KXBTC15M", "BTC")], db_path=str(tmp_path / "e.sqlite"))
    cfg.paper = PaperConfig(starting_balance_usd=100)
    cfg.risk = RiskConfig(kill_file=str(tmp_path / "KILL"))
    k = FakeKalshi()
    k.add_market("KXBTC15M-W1-00", OPEN, CLOSE, 100_000.0)
    k.books["KXBTC15M-W1-00"] = ([[40, 10], [44, 5]], [[42, 8], [45, 3]])
    led = Ledger(cfg.db_path)
    broker = PaperBroker(k, led, cfg.fees, cfg.paper)
    broker.start()
    feed = FakeFeed({"BTC": spot})
    eng = Engine(cfg, k, broker, led, feed, FakeVol(SIG), RiskManager(cfg.risk, cfg.sizing))
    return cfg, k, led, broker, feed, eng


def test_quotes_both_sides_inside_fair_value(tmp_path):
    cfg, k, led, broker, feed, eng = build(tmp_path)
    eng.tick(OPEN + 300)
    orders = {o.side: o for o in broker.resting()}
    assert set(orders) == {"yes", "no"}
    # fair = 50c at the money; edge 3c -> cap 47; best other bids 44 / 45 -> improve to 45 / 46
    assert orders["yes"].price == 45 and orders["no"].price == 46
    assert orders["yes"].price + orders["no"].price < 100
    status = led.get_state("dry_run", "status")
    assert status["markets"]["KXBTC15M-W1-00"]["fair"] == 0.5


def test_keeps_queue_position_when_nothing_changes(tmp_path):
    cfg, k, led, broker, feed, eng = build(tmp_path)
    eng.tick(OPEN + 300)
    first = {o.side: o.order_id for o in broker.resting()}
    # Our own orders now sit on the book; they must not make us outbid ourselves.
    k.books["KXBTC15M-W1-00"] = ([[40, 10], [44, 5], [45, 4]], [[42, 8], [45, 3], [46, 4]])
    eng.tick(OPEN + 302)
    assert {o.side: o.order_id for o in broker.resting()} == first


def test_pulls_quotes_when_spot_moves_against_them(tmp_path):
    cfg, k, led, broker, feed, eng = build(tmp_path)
    eng.tick(OPEN + 300)
    feed.prices["BTC"] = 99_900.0  # below strike: YES now worth roughly a third
    eng.tick(OPEN + 302)
    orders = {o.side: o for o in broker.resting()}
    fair = led.get_state("dry_run", "status")["markets"]["KXBTC15M-W1-00"]["fair"]
    assert 0.25 < fair < 0.40
    assert orders["yes"].price == math.floor(fair * 100 - 3)  # fair minus the 3c edge
    assert orders["no"].price == 46  # NO side still capped by the book, not by fair value
    feed.prices["BTC"] = 99_000.0  # deep out of the money: outside the quoting band
    eng.tick(OPEN + 304)
    assert broker.resting() == []


def test_stops_near_close_and_without_spot(tmp_path):
    cfg, k, led, broker, feed, eng = build(tmp_path)
    eng.tick(OPEN + 300)
    assert broker.resting()
    eng.tick(CLOSE - 60)
    assert broker.resting() == []
    eng.tick(OPEN + 400)
    feed.prices.pop("BTC")
    eng.tick(OPEN + 402)
    assert broker.resting() == []


def test_fill_then_settlement_updates_pnl(tmp_path):
    cfg, k, led, broker, feed, eng = build(tmp_path)
    eng.tick(OPEN + 300)
    k.add_trade("KXBTC15M-W1-00", "t1", 40, 2, "no", OPEN + 301)  # sells through our 45c YES bid
    eng.tick(OPEN + 303)
    assert led.position("dry_run", "KXBTC15M-W1-00").yes_count == 2
    k.markets["KXBTC15M-W1-00"].update(status="settled", result="yes")
    eng.tick(CLOSE + 30)
    assert led.realized_pnl("dry_run") == 2 * (100 - 45)
    assert broker.equity_cents() == 10_000 + 110


def test_kill_file_cancels_everything(tmp_path):
    cfg, k, led, broker, feed, eng = build(tmp_path)
    eng.tick(OPEN + 300)
    (tmp_path / "KILL").write_text("")
    eng.tick(OPEN + 302)
    assert broker.resting() == []
    assert "kill file" in led.get_state("dry_run", "status")["stop_reason"]


def test_learner_records_samples_sets_edge_and_benches(tmp_path):
    from kalshi_bot.learner import Learner

    cfg, k, led, broker, feed, eng = build(tmp_path)
    eng.learner = Learner(led, "dry_run", base_edge=3.0)
    eng.learner.edges._get("KXBTC15M").edge = 7.0
    eng.tick(OPEN + 300)
    orders = {o.side: o.price for o in broker.resting()}
    assert orders["yes"] == 43  # fair 50 - learned edge 7
    st = led.get_state("dry_run", "status")["markets"]["KXBTC15M-W1-00"]
    assert st["edge"] == 7.0 and st["p_market"] == (44 + 55) / 200  # mid of 44 bid / 55 ask
    assert led.unlabeled_tickers(CLOSE + 10) == ["KXBTC15M-W1-00"]

    # A fill feeds the edge learner; settlement labels the samples.
    k.add_trade("KXBTC15M-W1-00", "t1", 40, 2, "no", OPEN + 301)
    eng.tick(OPEN + 303)
    assert len(eng.learner.edges.pending) == 1
    k.markets["KXBTC15M-W1-00"].update(status="settled", result="no")
    eng.tick(CLOSE + 30)
    assert led.labeled_samples()[0]["outcome"] == 0
    eng.learner.update(CLOSE + 400)
    assert eng.learner.edges.series["KXBTC15M"].markouts == [[-43.0, 2, OPEN + 301]]

    eng.learner.edges._get("KXBTC15M").benched_until = CLOSE + 10_000
    k.add_market("KXBTC15M-W2-00", CLOSE, CLOSE + 900, 100_000.0)
    eng.tick(CLOSE + 300)
    assert broker.resting() == []
    assert "benched" in led.get_state("dry_run", "status")["markets"]["KXBTC15M-W2-00"]["reason"]
