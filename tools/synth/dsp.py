"""Small DSP toolkit for procedurally synthesising DREAD sound effects (numpy + scipy).

Everything here is original synthesis: no samples, no third-party audio. Output is mono float arrays at SR.
"""
import numpy as np
from scipy import signal

SR = 44100


def rng(seed):
    return np.random.default_rng(seed)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def white(r, dur):
    return r.standard_normal(int(dur * SR))


def pink(r, dur):
    """Voss-style pink noise via filtering white noise (Paul Kellet's refined filter)."""
    x = white(r, dur)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    y = signal.lfilter(b, a, x)
    return y / (np.max(np.abs(y)) + 1e-9)


def bandpass(x, lo, hi, order=2):
    hi = min(hi, SR / 2 - 100)
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lowpass(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR / 2 - 100), btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def highpass(x, fc, order=2):
    sos = signal.butter(order, fc, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def resonator(x, fc, q=20.0):
    """Narrow peaking resonance (formant / wood body)."""
    b, a = signal.iirpeak(fc, q, fs=SR)
    return signal.lfilter(b, a, x)


def swept_bandpass(x, f0, f1, width=0.5, steps=24):
    """Bandpass whose centre glides f0->f1: `steps` fixed filters cross-faded over time."""
    n = len(x)
    pos = np.linspace(0, steps - 1, n)  # fractional filter index at each sample
    out = np.zeros(n)
    for i in range(steps):
        fc = f0 * (f1 / f0) ** (i / (steps - 1))
        w = np.clip(1 - np.abs(pos - i), 0, 1)
        out += bandpass(x, max(fc * (1 - width / 2), 20), fc * (1 + width / 2)) * w
    return out


def env_exp(n, decay_s, attack_s=0.002):
    t = np.arange(n) / SR
    e = np.exp(-t / max(decay_s, 1e-4))
    a = np.clip(t / max(attack_s, 1e-4), 0, 1)
    return e * a


def env_points(n, points):
    """Piecewise-linear envelope from [(time_s, level), ...]."""
    ts = np.array([p[0] for p in points])
    ls = np.array([p[1] for p in points])
    return np.interp(np.arange(n) / SR, ts, ls)


def smooth_random(r, n, rate_hz, depth=1.0):
    """Slowly wandering 0..1 control signal."""
    k = max(2, int(rate_hz * n / SR) + 2)
    pts = r.random(k)
    return np.clip(np.interp(np.linspace(0, k - 1, n), np.arange(k), pts) * depth, 0, 1)


def place(dst, src, at_s):
    i = int(at_s * SR)
    if i >= len(dst):
        return
    j = min(len(dst), i + len(src))
    dst[i:j] += src[: j - i]


def softclip(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


def finish(x, peak_db=-3.0, fade_ms=4, pad_ms=0, tail_trim_db=-60):
    """Trim silence, de-click edges, normalise to peak_db."""
    x = np.asarray(x, dtype=np.float64)
    x = x - np.mean(x)
    m = np.max(np.abs(x)) + 1e-12
    x = x / m
    thr = 10 ** (tail_trim_db / 20)
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx):
        x = x[max(0, idx[0] - int(0.01 * SR)) : idx[-1] + int(0.03 * SR)]
    f = int(fade_ms / 1000 * SR)
    if f > 1 and len(x) > 2 * f:
        x[:f] *= np.linspace(0, 1, f)
        x[-f:] *= np.linspace(1, 0, f)
    return x * 10 ** (peak_db / 20)


def write_wav(path, x):
    import wave

    y = np.clip(x, -1, 1)
    pcm = (y * 32767).astype("<i2").tobytes()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm)


# ---- building blocks for creature-ish sounds --------------------------------------------------

def formant_filter(x, formants, bw_ratio=0.12):
    """Sum of resonant bandpasses = crude vocal tract. formants: [(freq, gain), ...]."""
    out = np.zeros_like(x)
    for f, g in formants:
        out += g * bandpass(x, f * (1 - bw_ratio), f * (1 + bw_ratio), order=2)
    return out


def glottal(r, dur, f0_pts, jitter=0.02, shimmer=0.15):
    """Rough pulse-train voice source with pitch contour f0_pts [(t,f0),...], jitter and shimmer."""
    n = int(dur * SR)
    f0 = env_points(n, f0_pts)
    f0 = f0 * (1 + jitter * (smooth_random(r, n, 60) - 0.5) * 2)
    phase = np.cumsum(f0 / SR)
    saw = 2 * (phase % 1.0) - 1
    src = saw - np.roll(saw, 1)  # differentiate -> brighter, glottal-like
    src *= 1 + shimmer * (smooth_random(r, n, 70) - 0.5) * 2
    return src


def click(r, dur=0.02, f=3000, q=6.0, decay=0.004):
    n = int(dur * SR)
    x = white(r, dur)
    x = resonator(x, f, q) if f < SR / 2 - 100 else x
    return x * env_exp(n, decay, 0.0003)


def creak(r, dur, base=420, pulse_hz=(18, 60), q=25):
    """Stick-slip friction: irregular pulse train excites a wood-like resonance with a drifting pitch."""
    n = int(dur * SR)
    rate = np.linspace(pulse_hz[0], pulse_hz[1], n) * (0.7 + 0.6 * smooth_random(r, n, 8))
    phase = np.cumsum(rate / SR)
    pulses = ((phase % 1.0) < 0.12).astype(float) * (0.6 + 0.4 * r.random(n))
    pulses = lowpass(pulses, 4000)
    body = resonator(pulses + 0.02 * white(r, dur), base, q) + 0.6 * resonator(pulses, base * 2.3, q * 0.8)
    body *= env_points(n, [(0, 0), (dur * 0.15, 1), (dur * 0.7, 0.8), (dur, 0)])
    return body
