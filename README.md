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

### How it learns

With `learning: true` (the default) the bot gets better at its own job from the results it sees. It does not invent new strategies. See `kalshi_bot/learner.py`.

- **What a contract is worth.** Every minute it records its model's probability next to Kalshi's mid price for each live market. When the market settles, those rows get the outcome. A small logistic regression then learns how much to trust each signal, and how that changes as the window runs down. It starts from "trust my model" and moves only as far as the data justifies. It switches to the learned blend only after the blend beats the plain model on markets it wasn't trained on, and it refits every few settled markets.
- **How much edge to demand, per coin.** One minute after each fill it checks Kalshi's mid. Negative "markouts" mean it was picked off by someone who knew more. Those widen that coin's edge by 1¢; consistently good markouts narrow it by 0.5¢ (range 1–10¢).
- **When to sit out.** A coin is benched for 6 hours in either of two cases. It is still being picked off at the 10¢ maximum edge, or its settled P&L is clearly negative (t-stat below −2 over at least 20 markets). It comes back with a wider edge.
- **Growing.** Order sizes are a fraction of equity, so wins compound and losses shrink the next bets.

All of it is visible on the dashboard's "What the bot has learned" panel, including every change it made and why.

**It doesn't start from zero.** The `learned/` folder holds a snapshot of everything learned so far: about 27,000 labelled market samples, the fitted model and each coin's edge. A fresh database loads it automatically on first `run`. To save a new snapshot after letting it run, use `python -m kalshi_bot export-learning`. To merge someone else's snapshot, use `import-learning --dir <folder>`. To rebuild from scratch, use `python -m kalshi_bot learn --days 7`.

**First paper session (Nov 8 2026, about 3 hours, $50 start):** +$75 over 59 markets on paper. That's too short to mean anything, and paper fills are optimistic. The learned blend predicted unseen markets better than both the original model and Kalshi's price (log-loss 0.444 vs 0.462 / 0.458). The edge learner found that BTC, ETH and HYPE fills hold their value at 4.5–8¢ of edge. DOGE and SOL kept getting picked off even at 8–10¢.

What it can't do: learning only works if there is something to learn. If Kalshi's own price already contains everything the model knows, the blend converges toward the market price and the profit source shrinks to the spread. On thin data it mostly learns noise, which is why the guards above are deliberately slow.

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
pytest                                   # 58 tests

cp config.example.yaml config.yaml       # optional; defaults are the same
python -m kalshi_bot check               # connectivity + how Kalshi's responses parse
python -m kalshi_bot calibrate --days 7  # does the model beat the market?
python -m kalshi_bot learn --days 7      # optional: the learned/ snapshot already seeds the learner
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
| `learn [--days N]` | pre-train the probability learner on settled markets (slow on purpose: Kalshi rate-limits) |
| `export-learning` / `import-learning [--dir D]` | save or load what the bot has learned (default folder `learned/`) |
| `status [--live]` | P&L summary in the terminal |
| `cancel-all [--demo] [--everything]` | cancel the bot's resting orders (or all of them) |
| `reset-halt [--live]` | clear a drawdown halt; also resets peak equity (use after a withdrawal) |

Every setting is listed with comments in `config.example.yaml`.

## Checked against the real API (Nov 2026)

`python -m kalshi_bot check --raw` against production confirmed:
- All five series list a market every 15 minutes, with `floor_strike` and `strike_type: greater_or_equal`.
- Prices are dollar strings (`yes_bid_dollars`), and trade sizes can be fractional. The parser handles both.
- Rules: YES if the 60-second BRTI average before close is at least the 60-second average before open.
- The BTC book is typically 1¢ wide with thousands of contracts per level. A bot demanding 3¢ of edge sits behind that and mostly fills when the price runs through it, which is exactly what the edge learner watches for.

Not yet checked, because they need API keys: the order-placement fields. If live orders are rejected for their fields, try `order_price_field: cents` or `use_order_expiration: false`.

Unauthenticated market data is rate-limited. The bot alone stays under the limit, and `learn` paces itself to share it.

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
  calibrate.py       model vs. market scoring, history sampling for `learn`
  learner.py         probability blend + per-series edge learning
  snapshot.py        export/import of learned state (the learned/ folder)
  dashboard/         stdlib HTTP server + single-page dashboard
tests/               unit tests and engine integration tests with fake exchange/feeds
```

Not financial advice. Prediction-market trading carries real risk of loss, may be restricted where you live, and is taxable.
