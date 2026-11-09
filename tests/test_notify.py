from kalshi_bot.config import NotifyConfig
from kalshi_bot.notify import DiscordChannel, Notifier, NtfyChannel, TelegramChannel, channels_from_env


class Capture:
    name = "capture"

    def __init__(self):
        self.msgs = []

    def send(self, title, body, urgent):
        self.msgs.append((title, body, urgent))


class Clock:
    def __init__(self, t=0.0):
        self.t = t

    def __call__(self):
        return self.t


def make(**cfg):
    ch, clock = Capture(), Clock(1000.0)
    n = Notifier([ch], NotifyConfig(**cfg), mode="live", clock=clock, background=False)
    return n, ch, clock


def test_each_settlement_is_sent():
    n, ch, _ = make(settlements="each")
    n.settled("KXBTC15M-26NOV090115-15", "yes", 340, 10_340)
    n.settled("KXSOL15M-26NOV090115-15", "no", -120, 10_220)
    assert ch.msgs[0][0] == "[LIVE] Won +$3.40 on BTC"
    assert ch.msgs[1][0] == "[LIVE] Lost -$1.20 on SOL" and "Equity now $102.20" in ch.msgs[1][1]


def test_summary_rolls_up_and_big_results_go_out_at_once():
    n, ch, clock = make(settlements="summary", summary_every_min=60, big_result_usd=5)
    n.settled("KXBTC15M-A", "yes", 200, 10_200)
    n.settled("KXETH15M-A", "no", -50, 10_150)
    n.settled("KXDOGE15M-A", "yes", 900, 11_050)  # big: sent immediately
    assert [m[0] for m in ch.msgs] == ["[LIVE] Won +$9.00 on DOGE"]
    clock.t += 30 * 60
    n.maybe_summary(11_050, 1_050)
    assert len(ch.msgs) == 1  # not an hour yet
    clock.t += 31 * 60
    n.maybe_summary(11_050, 1_050)
    title, body, _ = ch.msgs[-1]
    assert title == "[LIVE] Up +$10.50 in the last 60 min"
    assert "3 markets: 2 won, 1 lost" in body and "Best: DOGE +$9.00" in body and "Worst: ETH -$0.50" in body
    clock.t += 61 * 60
    n.maybe_summary(11_050, 1_050)  # nothing settled since: no message
    assert len(ch.msgs) == 2


def test_alerts_are_urgent_and_deduplicated():
    n, ch, clock = make(min_alert_gap_sec=600)
    n.alert("stop:daily", "Trading paused", "daily loss limit")
    n.alert("stop:daily", "Trading paused", "daily loss limit")
    assert len(ch.msgs) == 1 and ch.msgs[0][2] is True
    clock.t += 601
    n.alert("stop:daily", "Trading paused", "daily loss limit")
    assert len(ch.msgs) == 2


def test_off_and_no_channels():
    n, ch, _ = make(settlements="off", big_result_usd=1)
    n.settled("KXBTC15M-A", "yes", 5_000, 15_000)
    assert ch.msgs == []
    silent = Notifier([], mode="live", background=False)
    silent.settled("KXBTC15M-A", "yes", 5_000, 15_000)  # no error without channels
    assert not silent.enabled


def test_failing_channel_does_not_raise():
    class Boom:
        name = "boom"

        def send(self, *a):
            raise RuntimeError("network down")

    ok = Capture()
    n = Notifier([Boom(), ok], mode="live", background=False)
    n.send("hi", "there")
    assert ok.msgs == [("[LIVE] hi", "there", False)]


def test_channels_from_env(monkeypatch):
    for k in ("NTFY_TOPIC", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "DISCORD_WEBHOOK_URL"):
        monkeypatch.delenv(k, raising=False)
    assert channels_from_env() == []
    monkeypatch.setenv("NTFY_TOPIC", "kalshi-abc123")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "t")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "1")
    monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://discord.example/hook")
    kinds = [type(c) for c in channels_from_env()]
    assert kinds == [NtfyChannel, TelegramChannel, DiscordChannel]


def test_ntfy_request_shape():
    sent = {}

    class Sess:
        def post(self, url, data=None, headers=None, timeout=None, json=None):
            sent.update(url=url, data=data, headers=headers)

            class R:
                def raise_for_status(self):
                    pass
            return R()

    NtfyChannel("my-topic", session=Sess()).send("[LIVE] Won +$3.40 on BTC", "body", urgent=True)
    assert sent["url"] == "https://ntfy.sh/my-topic" and sent["data"] == b"body"
    assert sent["headers"]["Priority"] == "high"
