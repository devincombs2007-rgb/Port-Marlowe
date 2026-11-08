import math

import pytest

from kalshi_bot.model import average_distribution, fair_yes_probability, norm_cdf

SIG = 0.5 / math.sqrt(365 * 24 * 3600)  # 50% annualised, per sqrt(second)


def p(spot, strike, tau, **kw):
    return fair_yes_probability(spot=spot, strike_type="greater_or_equal", floor_strike=strike, cap_strike=None,
                                tau=tau, sigma=SIG, **kw)


def test_at_the_money_is_half():
    assert p(100_000, 100_000, 600) == pytest.approx(0.5)


def test_monotonic_in_spot_and_time():
    assert p(100_100, 100_000, 600) > p(100_050, 100_000, 600) > 0.5
    # Same distance from strike is worth more with less time left.
    assert p(100_100, 100_000, 120) > p(100_100, 100_000, 600)
    assert p(99_900, 100_000, 600) == pytest.approx(1 - p(100_100, 100_000, 600), abs=1e-3)


def test_variance_of_window_average():
    # tau >= window: Var = sigma_abs^2 (tau - 2w/3)
    mean, sd = average_distribution(100.0, 600, 0.001, window=60)
    assert mean == 100.0
    assert sd == pytest.approx(0.1 * math.sqrt(600 - 40))
    # inside the window the realised part pins the mean and shrinks variance
    mean, sd = average_distribution(110.0, 30, 0.001, window=60, realized_avg=100.0)
    assert mean == pytest.approx(105.0)
    assert sd == pytest.approx(0.11 * math.sqrt(30**3 / (3 * 60**2)))
    # continuity at tau == window
    _, a = average_distribution(100.0, 60.0001, 0.001, window=60)
    _, b = average_distribution(100.0, 59.9999, 0.001, window=60)
    assert a == pytest.approx(b, rel=1e-3)


def test_realised_average_dominates_late():
    # Spot just ticked below strike, but 50s of the 60s average were well above.
    assert p(99_990, 100_000, 10, realized_avg=100_200) > 0.99


def test_expired_and_strike_types():
    assert p(100_001, 100_000, 0) == pytest.approx(0.999)
    assert p(99_999, 100_000, 0) == pytest.approx(0.001)
    below = fair_yes_probability(spot=100_100, strike_type="less", floor_strike=None, cap_strike=100_000,
                                 tau=600, sigma=SIG)
    assert below == pytest.approx(1 - p(100_100, 100_000, 600), abs=1e-9)
    between = fair_yes_probability(spot=100_000, strike_type="between", floor_strike=99_900, cap_strike=100_100,
                                   tau=600, sigma=SIG)
    assert 0 < between < 1
    with pytest.raises(ValueError):
        fair_yes_probability(spot=1, strike_type="weird", floor_strike=1, cap_strike=None, tau=1, sigma=SIG)


def test_vol_multiplier_pulls_toward_half():
    assert 0.5 < p(100_100, 100_000, 600, vol_multiplier=1.5) < p(100_100, 100_000, 600)


def test_norm_cdf():
    assert norm_cdf(0) == 0.5
    assert norm_cdf(1.96) == pytest.approx(0.975, abs=1e-3)
