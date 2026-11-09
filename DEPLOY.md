# Run the bot 24/7 by itself

Once this is set up you don't touch it. It trades on its own, restarts itself after crashes and reboots, keeps learning, and messages your phone.

## What you need

1. **A computer that is always on.** The easiest option is a small cloud server for about $5–6 a month: a DigitalOcean "Basic Droplet", Hetzner CX22, Vultr or Linode, running Ubuntu 24.04 in a **US region**. An always-on home computer also works.
2. **The free ntfy app** on your phone (iPhone or Android), for notifications.
3. **For real money only:** a Kalshi account (US residents, ID-verified) with money deposited.

## 1. Set up the server

SSH into the server, then:

```bash
curl -fsSL https://get.docker.com | sh
git clone -b claude/modest-fermi-qag33f https://github.com/devincombs2007-rgb/Port-Marlowe
cd Port-Marlowe
cp .env.example .env
```

## 2. Turn on phone notifications

1. In the ntfy app, tap **+** and subscribe to a topic name nobody could guess, such as `kalshi-7f3k9q2m`.
2. On the server, run `nano .env` and set `NTFY_TOPIC=kalshi-7f3k9q2m` (your own name). Save with Ctrl-O, then Enter, then Ctrl-X.
3. Test it:
   ```bash
   docker compose run --rm bot notify-test
   ```
   Your phone should buzz. Telegram and Discord also work; see `.env.example`.

## 3. Start it (paper trading first)

```bash
docker compose up -d --build
```

That's it. It now paper-trades around the clock with fake money and real market data, and you'll get:

- **an hourly roll-up**: markets won and lost, net P&L, best and worst coin, equity
- **any single win or loss of $5 or more**, as soon as it happens
- **a daily summary** at midnight ET
- **an urgent alert** whenever it pauses for a loss limit, benches a coin, keeps hitting errors, or stops

To change how chatty it is, copy `config.example.yaml` to `config.yaml`, edit the `notify:` section, and run `docker compose up -d --build`. For example, `settlements: each` sends a message for every market.

To watch it work: `docker compose logs -f bot`.

To see the dashboard, run this on **your own computer**:

```bash
ssh -L 8050:localhost:8050 root@YOUR_SERVER_IP
```

Then open http://localhost:8050 in your browser.

## 4. Go live with real money (when you decide to)

1. On kalshi.com, go to **Account & security → API keys → Create key**. Copy the **key ID** and save the **private key**; Kalshi shows it only once.
2. On the server:
   ```bash
   mkdir -p secrets && nano secrets/kalshi.pem    # paste the private key, save
   chmod 600 secrets/kalshi.pem
   nano .env                                       # set KALSHI_API_KEY_ID=...
   ```
3. Prove that real orders work. This places one 1-contract bid at 1¢, checks that it shows up, and cancels it. It costs nothing unless someone sells to you at 1¢:
   ```bash
   docker compose run --rm bot check-orders
   ```
4. Start small. Run `cp config.example.yaml config.yaml`, then set `max_equity_usd: 50` under `sizing:`. The bot then sizes its bets as if the account held $50, even if you deposit more.
5. Switch to live. In `.env`, set `BOT_ARGS=--live --yes`, then run:
   ```bash
   docker compose up -d --build
   ```
   You'll get a "[LIVE] Bot started" notification.

## Controls

| To… | Run |
|---|---|
| stop everything (cancels all orders) | `docker compose down` |
| keep it running but stop trading | `touch data/KILL` (remove the file to resume) |
| see P&L | `docker compose run --rm bot status --live` |
| see which coins really make money | `docker compose run --rm bot analyze --live` |
| resume after a drawdown halt | `docker compose run --rm bot reset-halt --live` |
| update to the newest version | `git pull && docker compose up -d --build` |

## What it protects you from on its own

- **Daily loss limit.** After losing 10% in a day, it pauses until midnight ET and alerts you.
- **Drawdown halt.** After falling 25% from its peak, it stops until you run `reset-halt`, and alerts you.
- **Exposure caps.** At most 6% of equity at risk in any one 15-minute market, and 30% across all of them.
- **Benching.** A coin that keeps getting picked off, or keeps losing, sits out for 6 hours. You get an alert.
- **Dead-server protection.** Every live order expires on Kalshi's side before the last 90 seconds of its window, even if the server dies.
- **Error handling.** On repeated errors it cancels all orders and alerts you. Docker restarts the bot if it crashes.

What it can't do is guarantee a profit. The protections limit how much a bad stretch costs, not whether one happens.
