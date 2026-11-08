# Port-Marlowe

A trading bot for Kalshi's 15-minute crypto "up or down" markets (BTC, ETH, SOL, DOGE, HYPE). It only places maker (post-only) orders, runs on its own, has risk limits, and includes a local dashboard with a daily P&L calendar, an equity curve and a Live / Dry-run toggle.

It rebuilds the setup described in a Reddit post ("Promising Results – Update #1", r/ai_trading). That post described an automated bot for Kalshi's 15-minute crypto markets that uses maker orders to avoid fees, runs 24/7, and scales with the account. The author did **not** share the strategy. The strategy here is my own choice, explained below.

> **Read before using real money.** Nothing here has been shown to make money. The bot can lose your whole balance. It defaults to dry-run (paper trading on real market data) and needs `--live` to send orders. Run it in dry-run and run `calibrate` (below) before you risk a dollar.

## What the bot does

Each 15-minute market settles YES if the 60-second average of the CF Benchmarks index just before close is at or above the same average taken just before the window opened. That opening average is the market's `floor_strike`.

Every 2 seconds, for each series:

1. **Find the open window** (the market whose open/close times contain now).
2. **Price it.** Spot price is the median of Coinbase, Kraken and Hyperliquid, approximating the CF index. Volatility is an EWMA of 1-minute returns, seeded from 6 hours of candles. Fair value is the probability that the *60-second settlement average* ends at or above the strike. Once inside the final minute, it uses the part of the average already realised (`kalshi_bot/model.py`).
3. **Quote both sides with maker bids.** A YES bid at most `fair − edge`, and a NO bid at most `(1 − fair) − edge`. If both fill, the pair pays $1 whatever happens. Each bid steps one cent above the best competing bid when that is still inside the edge. Orders are post-only, so they never cross the book and never pay a taker fee.
4. **Lean against inventory.** Holding net YES lowers the YES bid and raises the NO bid, and vice versa.
5. **Pull quotes when it is dangerous:**
   - in the last 90 seconds (the settlement-averaging window, where informed flow dominates)
   - when the spot price is stale
   - for 15 seconds after a 3-sigma price jump
   - when fair value is outside 8–92% (lopsided markets risk a large loss to earn a small gain)
6. **Size from equity.** Each order is about 2% of equity. The worst case in any one market is capped at 6% of equity, and total worst-case exposure at 30%. Contract counts grow as the account grows.
7. **Book it.** Fills and settlements go into a SQLite ledger. The dashboard reads from it.

### Risk controls

| Control | Default | Effect |
|---|---|---|
| Daily loss limit | 10% of the day's starting equity | stop quoting until midnight ET |
| Max drawdown | 25% from peak equity | halt until `reset-halt` |
| Kill file | `touch KILL` | cancel everything, stop quoting |
| Exchange-side expiry | close − 90s | live orders expire even if the bot crashes |
| Shutdown / repeated errors | — | cancel all resting orders |
| Order ownership | `kb-` client IDs | never touches orders you placed by hand |

## Is there an edge? (the honest part)

The Reddit post shows about $1.7k profit over 7 days, from one account, with no way to verify it. The author says themselves that "a single loss can erase numerous winning trades." Survivorship bias also applies: people with losing bots don't post updates.

The main risk for any maker strategy is **adverse selection**. Your resting bid fills exactly when someone knows the price is moving against you. This bot polls REST every 1–2 seconds. Professional market makers on these markets react to exchange websocket feeds in milliseconds. If your fair value is slower or worse than the market's own price, you will mostly get filled when you are wrong.

So before trading live, run:

```bash
python -m kalshi_bot calibrate --days 7
```

For recently settled markets, this scores the model's probability (Brier score) at 10, 5 and 2 minutes before close. It scores the Kalshi order book's own mid price at the same moments too. **If the market mid beats the model, the model has no informational edge.** Any profit would then have to come purely from earning the spread off uninformed traders, and dry-run is the only honest way to measure that.

Also keep in mind:
- **Dry-run fills are optimistic.** A paper bid fills when a real public trade prints at or through its price, after the size queued ahead of it. Real queues and cancels are messier, and your own orders would change what other traders do.
- **Fees.** The post relies on maker orders paying no fee on these markets. Check Kalshi's current fee schedule and set `fees.maker_rate` if that changes. Taker fees are about `0.07 × C × P × (1−P)`.
- **Settlement basis.** Settlement uses CF Benchmarks indices, not Coinbase. Small basis differences matter most near the strike.

## Quick start

Requires Python 3.10+.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest                                   # 41 tests

cp config.example.yaml config.yaml       # optional; defaults are the same
python -m kalshi_bot check               # connectivity + how Kalshi's responses parse
python -m kalshi_bot calibrate --days 7  # does the model beat the market?
python -m kalshi_bot run                 # dry-run: real data, simulated fills, $50 paper balance
python -m kalshi_bot dashboard           # http://127.0.0.1:8050
```

Run the dry-run for at least a week or two. Look at the calendar's losing days and the largest-loss tile, not only the total.

### Going live

1. Create an API key on Kalshi (Account & security → API keys). Save the private key `.pem` outside this repo.
2. `cp .env.example .env` and fill in `KALSHI_API_KEY_ID` and `KALSHI_PRIVATE_KEY_PATH`.
3. Rehearse on Kalshi's demo exchange: `python -m kalshi_bot run --live --demo`
4. Real money: `python -m kalshi_bot run --live`. It counts down for 10 seconds before starting.

Use a dedicated account, or don't trade these series by hand while the bot runs. The bot counts every fill in its series as its own.

Run it under something that restarts it (systemd, `tmux`, a small VPS) if you want it running 24/7. On restart it cancels its old orders and picks up from the ledger.

## Commands

| Command | What it does |
|---|---|
| `run [--live] [--demo] [-v]` | run the bot (dry-run unless `--live`) |
| `dashboard [--port N]` | daily P&L calendar, equity curve, live quotes, open positions |
| `check [--raw]` | exchange status, open windows per series, parsed strike/book, spot sources, balance |
| `calibrate [--series S] [--days N]` | model vs. outcome vs. market mid |
| `status [--live]` | P&L summary in the terminal |
| `cancel-all [--demo] [--everything]` | cancel the bot's resting orders (or all of them) |
| `reset-halt [--live]` | clear a drawdown halt; also resets peak equity (use after a withdrawal) |

Every setting is listed with comments in `config.example.yaml`.

## Things to confirm on first run

I wrote this without access to Kalshi's API (the build environment's network blocked it). The code follows Kalshi's v2 REST API and reads both integer-cent and `*_dollars` price fields. It was tested end to end only against a local mock exchange. Run `python -m kalshi_bot check --raw` first and confirm:

- **Series tickers.** `KXDOGE15M` and `KXHYPE15M` are guesses based on the post. Disable any series that lists no markets.
- **Strike field.** The strike should come back as `floor_strike`, with a sensible `strike_type`.
- **Order fields.** If live orders are rejected for their fields, try `order_price_field: dollars`, or `use_order_expiration: false`.

## Layout

```
kalshi_bot/
  kalshi_client.py   RSA-PSS signing, REST calls, response parsing
  spot.py            exchange price feeds, composite price, EWMA volatility
  model.py           fair value of the 60-second settlement average
  strategy.py        where to bid (edge, book improvement, inventory skew)
  risk.py            circuit breakers and order sizing
  broker.py          LiveBroker (Kalshi) and PaperBroker (simulated fills from the public trade tape)
  engine.py          the loop
  ledger.py          SQLite: fills, settlements, equity, daily P&L
  calibrate.py       model vs. market scoring
  dashboard/         stdlib HTTP server + single-page dashboard
tests/               unit tests and engine integration tests with fake exchange/feeds
```

Not financial advice. Prediction-market trading carries real risk of loss, may be restricted where you live, and is taxable.
