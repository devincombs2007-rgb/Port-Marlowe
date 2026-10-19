"""Procedural sound-design primitives (numpy/scipy) and OGG export.

All sounds in THE HOLLOW are synthesised from scratch by these routines (no samples are used),
so the project can release them under CC0. Techniques: modal synthesis (wood knocks, bells),
stick-slip friction (creaks), granular crackle (leaves, twigs), Minnaert bubbles, formant
voices (bleats, breaths), filtered noise beds (wind, rumble) and convolution reverb.
"""
import os
import subprocess
import tempfile
import wave

import numpy as np
from scipy import signal

SR = 44100
RNG = np.random.default_rng(1234)


def seed(s):
    global RNG
    RNG = np.random.default_rng(s)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def silence(dur):
    return np.zeros(int(dur * SR))


# ------------------------------------------------------------------ noise sources
def white(dur):
    return RNG.standard_normal(int(dur * SR))


def pink(dur):
    n = int(dur * SR)
    w = RNG.standard_normal(n)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, w) * 3.5


def brown(dur):
    n = int(dur * SR)
    w = RNG.standard_normal(n)
    out = signal.lfilter([1.0], [1.0, -0.995], w)
    return out / (np.max(np.abs(out)) + 1e-9)


# ------------------------------------------------------------------ filters
def _sos(kind, freq, q=0.707, order=2):
    nyq = SR / 2
    if kind == "low":
        return signal.butter(order, min(freq / nyq, 0.99), "low", output="sos")
    if kind == "high":
        return signal.butter(order, max(freq / nyq, 1e-4), "high", output="sos")
    if kind == "band":
        lo, hi = freq
        return signal.butter(order, [max(lo / nyq, 1e-4), min(hi / nyq, 0.99)], "band", output="sos")
    raise ValueError(kind)


def lowpass(x, f, order=2):
    return signal.sosfilt(_sos("low", f, order=order), x)


def highpass(x, f, order=2):
    return signal.sosfilt(_sos("high", f, order=order), x)


def bandpass(x, lo, hi, order=2):
    return signal.sosfilt(_sos("band", (lo, hi), order=order), x)


def resonator(x, f, q):
    """Two-pole resonant bandpass (constant peak gain)."""
    w0 = 2 * np.pi * f / SR
    alpha = np.sin(w0) / (2 * q)
    b = [alpha, 0, -alpha]
    a = [1 + alpha, -2 * np.cos(w0), 1 - alpha]
    return signal.lfilter(b, a, x)


def sweep_lowpass(x, f_start, f_end, steps=64):
    """Time-varying lowpass via block processing with interpolated cutoffs."""
    n = len(x)
    out = np.zeros(n)
    edges = np.linspace(0, n, steps + 1).astype(int)
    freqs = np.geomspace(max(f_start, 20), max(f_end, 20), steps)
    zi = None
    for i in range(steps):
        sos = _sos("low", freqs[i])
        seg = x[edges[i]:edges[i + 1]]
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        y, zi = signal.sosfilt(sos, seg, zi=zi)
        out[edges[i]:edges[i + 1]] = y
    return out


# ------------------------------------------------------------------ envelopes
def env_ad(dur, attack, decay_curve=4.0):
    t = t_axis(dur)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.exp(-decay_curve * np.clip(t - attack, 0, None) / max(dur - attack, 1e-4))
    return a * d


def env_adsr(dur, a, d, s, r):
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.zeros(n)
    e = np.where(t < a, t / max(a, 1e-4), e)
    m = (t >= a) & (t < a + d)
    e[m] = 1 - (1 - s) * (t[m] - a) / max(d, 1e-4)
    m = (t >= a + d) & (t < dur - r)
    e[m] = s
    m = t >= dur - r
    e[m] = s * np.clip((dur - t[m]) / max(r, 1e-4), 0, 1)
    return e


def fade(x, fin=0.01, fout=0.05):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def smooth_noise_curve(dur, rate, lo, hi):
    """Slowly wandering control curve (for gusts, vibrato, pitch drift)."""
    n = int(dur * SR)
    pts = max(2, int(dur * rate) + 2)
    vals = RNG.uniform(lo, hi, pts)
    xs = np.linspace(0, n, pts)
    curve = np.interp(np.arange(n), xs, vals)
    k = max(1, int(SR / max(rate, 0.1) / 4))
    return np.convolve(curve, np.ones(k) / k, mode="same")


# ------------------------------------------------------------------ oscillators
def osc(freq, dur, kind="sine", phase=0.0):
    n = int(dur * SR)
    f = np.full(n, freq) if np.isscalar(freq) else np.asarray(freq)[:n]
    ph = phase + 2 * np.pi * np.cumsum(f) / SR
    if kind == "sine":
        return np.sin(ph)
    if kind == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1.0) - 1
    if kind == "tri":
        return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1.0) - 1) - 1
    raise ValueError(kind)


def glottal(freq_curve, jitter=0.01, shimmer=0.05):
    """Band-limited-ish glottal pulse train for voice-like sources."""
    f = np.asarray(freq_curve) * (1 + jitter * RNG.standard_normal(len(freq_curve)).cumsum() / 200)
    ph = np.cumsum(f) / SR
    frac = ph % 1.0
    pulse = np.where(frac < 0.6, np.sin(np.pi * frac / 0.6) ** 2, 0.0)
    pulse = np.diff(pulse, prepend=0) * 20
    amp = 1 + shimmer * smooth_noise_curve(len(f) / SR, 30, -1, 1)
    return lowpass(pulse * amp, 5000)


def formants(src, table, q=8.0):
    """table: list of (freq, gain) or callables of time for moving formants."""
    out = np.zeros_like(src)
    for f, g in table:
        out += g * resonator(src, f, q)
    return out


# ------------------------------------------------------------------ physical-ish models
def modal(dur, modes, excitation=None):
    """modes: list of (freq, decay_seconds, amp). Excited by a short noise click by default."""
    t = t_axis(dur)
    out = np.zeros(len(t))
    for f, dec, a in modes:
        out += a * np.sin(2 * np.pi * f * t + RNG.uniform(0, 6.28)) * np.exp(-t / dec)
    if excitation is not None:
        out = signal.fftconvolve(excitation, out)[: len(t)]
    return out


def wood_knock(dur=0.35, size=1.0, hardness=1.0):
    base = 180 / size
    ratios = [1.0, 2.31, 3.17, 4.62, 6.1, 7.9]
    modes = [(base * r * RNG.uniform(0.97, 1.03), 0.09 / (1 + i * 0.6), 1.0 / (1 + i)) for i, r in enumerate(ratios)]
    body = modal(dur, modes)
    click = highpass(white(0.006), 1200) * env_ad(0.006, 0.0005, 6)
    out = body * 0.8
    out[: len(click)] += click * 0.6 * hardness
    thump = osc(np.linspace(120 / size, 60 / size, int(dur * SR)), dur) * env_ad(dur, 0.002, 18)
    return out + thump * 0.5


def creak(dur, rate=(18, 40), body=(220, 480, 900), q=14, roughness=0.3):
    """Stick-slip friction: an irregular impulse train through wooden body resonances."""
    n = int(dur * SR)
    if rate[0] > rate[1]:  # a deliberate slow-down (e.g. a falling trunk)
        rc = np.linspace(rate[0], rate[1], n) * smooth_noise_curve(dur, 3, 0.8, 1.2)
    else:
        rc = smooth_noise_curve(dur, 3, rate[0], rate[1])
    ph = np.cumsum(rc / SR)
    imp = np.zeros(n)
    idx = np.nonzero(np.diff(np.floor(ph)) > 0)[0]
    imp[idx] = 1 + roughness * RNG.standard_normal(len(idx))
    exc = imp + 0.02 * white(dur)
    out = np.zeros(n)
    for i, f in enumerate(body):
        out += resonator(exc, f * RNG.uniform(0.95, 1.05), q) / (1 + 0.5 * i)
    return out


def crackle(dur, density=120, lo=1500, hi=7000, decay=0.004):
    """Granular crackle: dry leaves, twigs, splintering."""
    n = int(dur * SR)
    out = np.zeros(n)
    count = int(density * dur)
    grain = int(decay * SR * 5)
    g_env = np.exp(-np.arange(grain) / (decay * SR))
    for _ in range(count):
        p = RNG.integers(0, max(1, n - grain))
        out[p:p + grain] += RNG.standard_normal(grain) * g_env * RNG.uniform(0.2, 1.0)
    return bandpass(out, lo, hi)


def bubble(f0=600, dur=0.12, rise=1.8, decay=25):
    t = t_axis(dur)
    f = f0 * (1 + rise * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-decay * t)


def heartbeat_thump(dur=0.35, f0=58, f1=34):
    t = t_axis(dur)
    f = np.geomspace(f0, f1, len(t))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    skin = lowpass(white(dur), 220) * np.exp(-t * 40) * 0.35
    return body + skin


def bell(freq, dur, partials=((1, 1), (2.32, 0.6), (4.25, 0.35), (6.63, 0.2), (8.9, 0.1)), decay=2.0, detune=0.6):
    t = t_axis(dur)
    out = np.zeros(len(t))
    for r, a in partials:
        for d in (-detune, detune):
            out += a * 0.5 * np.sin(2 * np.pi * (freq * r + d) * t) * np.exp(-t * r / decay)
    strike = highpass(white(0.004), 3000) * 0.3
    out[: len(strike)] += strike
    return out


# ------------------------------------------------------------------ space
def impulse_response(rt60=1.2, predelay=0.012, damp=4000, early=6, size=1.0):
    dur = rt60 * 1.1
    n = int(dur * SR)
    t = np.arange(n) / SR
    tail = RNG.standard_normal(n) * np.exp(-6.9 * t / rt60)
    tail = lowpass(tail, damp)
    ir = np.zeros(n + int(predelay * SR))
    ir[int(predelay * SR):] = tail * 0.6
    for i in range(early):
        d = int(RNG.uniform(0.004, 0.06 * size) * SR)
        if d < len(ir):
            ir[d] += RNG.uniform(0.2, 0.6) * (1 if RNG.random() > 0.5 else -1)
    return ir / np.sqrt(np.sum(ir ** 2))


def reverb(x, wet=0.3, **kw):
    ir = impulse_response(**kw)
    y = signal.fftconvolve(x, ir)
    y = y[: len(x) + len(ir) // 2]
    dry = np.zeros(len(y))
    dry[: len(x)] = x
    return dry * (1 - wet) + y * wet * (np.max(np.abs(x)) / (np.max(np.abs(y)) + 1e-9))


def distance(x, metres=30.0):
    """Air absorption + level drop for 'heard far away' cues."""
    cutoff = max(900, 12000 / (1 + metres / 12))
    return lowpass(x, cutoff, order=2)


# ------------------------------------------------------------------ mix + export
def place(dst, src, at, gain=1.0):
    i = int(at * SR)
    end = min(len(dst), i + len(src))
    if i < len(dst):
        dst[i:end] += src[: end - i] * gain
    return dst


def concat(*parts):
    return np.concatenate(parts)


def normalize(x, peak_db=-1.0, rms_db=None):
    x = x - np.mean(x)
    if rms_db is not None:
        rms = np.sqrt(np.mean(x ** 2)) + 1e-12
        x = x * (10 ** (rms_db / 20) / rms)
    pk = np.max(np.abs(x)) + 1e-12
    limit = 10 ** (peak_db / 20)
    if pk > limit or rms_db is None:
        x = x * (limit / pk)
    return x


def soft_clip(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


def write_ogg(x, path, quality=4, peak_db=-1.0, rms_db=None, fade_out=0.03):
    x = fade(normalize(x, peak_db, rms_db), 0.002, fade_out)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = tmp.name
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path, "-c:a", "libvorbis",
                    "-q:a", str(quality), "-ac", "1", "-ar", str(SR), path], check=True)
    os.unlink(wav_path)
    return len(x) / SR


def mix(*parts):
    """Sum signals of different lengths (zero-padded)."""
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[: len(p)] += p
    return out
