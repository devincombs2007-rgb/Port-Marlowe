from kalshi_bot.config import StrategyConfig
from kalshi_bot.strategy import BookTop, book_top, compute_quotes, should_replace


def cfg(**kw):
    return StrategyConfig(**kw)


def test_quotes_stay_inside_edge_and_never_cross():
    c = cfg(min_edge_cents=3, improve_best_bid=False)
    q = compute_quotes(0.60, BookTop(yes_bid=50, no_bid=30), 0, c)
    assert q.yes_price == 57  # 60 - 3
    assert q.no_price == 37  # 40 - 3
    assert q.yes_price + q.no_price < 100
    # YES ask is 100 - 30 = 70, fine. Now a NO bid at 45 means YES ask 55: we must stay below.
    q = compute_quotes(0.60, BookTop(yes_bid=50, no_bid=45), 0, c)
    assert q.yes_price == 54


def test_improve_best_bid_by_one_tick_only():
    c = cfg(min_edge_cents=3, improve_best_bid=True)
    q = compute_quotes(0.60, BookTop(yes_bid=50, no_bid=30), 0, c)
    assert q.yes_price == 51  # best 50 + 1, inside the 57 cap
    assert q.no_price == 31
    # Competing bid already above our cap: sit at the cap.
    q = compute_quotes(0.60, BookTop(yes_bid=58, no_bid=30), 0, c)
    assert q.yes_price == 57


def test_empty_book_quotes_at_cap():
    q = compute_quotes(0.5, BookTop(None, None), 0, cfg(min_edge_cents=4))
    assert (q.yes_price, q.no_price) == (46, 46)


def test_inventory_skew_leans_against_position():
    c = cfg(min_edge_cents=3, improve_best_bid=False, inventory_skew_cents=0.5, max_skew_cents=4)
    flat = compute_quotes(0.5, BookTop(None, None), 0, c)
    long_yes = compute_quotes(0.5, BookTop(None, None), 6, c)  # skew 3c
    assert long_yes.yes_price == flat.yes_price - 3
    assert long_yes.no_price == flat.no_price + 3
    capped = compute_quotes(0.5, BookTop(None, None), 100, c)
    assert capped.yes_price == flat.yes_price - 4


def test_no_quotes_in_the_tails():
    q = compute_quotes(0.95, BookTop(50, 40), 0, cfg(max_fair=0.92))
    assert q.yes_price is None and q.no_price is None


def test_own_orders_are_excluded_from_book_top():
    yes = [(52, 10), (50, 5)]
    no = [(40, 3)]
    top = book_top(yes, no, own_yes={52: 10})
    assert top.yes_bid == 50  # the 52 level is only us
    top = book_top(yes, no, own_yes={52: 4})
    assert top.yes_bid == 52  # someone else is also at 52


def test_should_replace_is_asymmetric():
    assert should_replace(50, 49, threshold=3)  # too aggressive: always
    assert not should_replace(48, 49, threshold=2)  # slightly passive: keep queue spot
    assert should_replace(47, 49, threshold=2)
