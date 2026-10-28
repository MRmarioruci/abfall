#!/usr/bin/env python3
"""Synthesizes the film's 45-second music bed from scratch (standard library
only), so nothing in the mix needs a license.

A light, bouncy groove at 120 BPM in C major: marimba-ish plucks, a round
bass, soft kick, claps and a shaker. At 120 BPM one beat is exactly 15
frames at 30 fps, so scenes in src/timing.ts start on the beat.

  python3 scripts/make-music.py   # writes public/music.wav
"""
import math, random, struct, wave
from pathlib import Path

SR = 44100
BPM = 120
BEAT = 60 / BPM
LENGTH = 45.0
OUT = Path(__file__).resolve().parent.parent / "public" / "music.wav"
random.seed(11)

N = int(LENGTH * SR)
mix = [0.0] * N


def add(start, samples, gain=1.0):
    i0 = int(start * SR)
    for i, s in enumerate(samples):
        j = i0 + i
        if 0 <= j < N:
            mix[j] += s * gain


def note_hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def marimba(midi, dur=0.5):
    """Sine + soft overtone with a fast attack and exponential decay."""
    f = note_hz(midi)
    n = int(dur * SR)
    out = []
    for i in range(n):
        t = i / SR
        env = min(1, t / 0.004) * math.exp(-t * 7.5)
        s = math.sin(2 * math.pi * f * t) + 0.28 * math.sin(2 * math.pi * f * 3.98 * t) * math.exp(-t * 30)
        out.append(s * env)
    return out


def bass(midi, dur):
    f = note_hz(midi)
    n = int(dur * SR)
    out = []
    for i in range(n):
        t = i / SR
        env = min(1, t / 0.01) * (1 - min(1, max(0, (t - dur + 0.06) / 0.06))) * math.exp(-t * 1.6)
        s = math.sin(2 * math.pi * f * t) + 0.3 * math.sin(4 * math.pi * f * t)
        out.append(s * env)
    return out


def kick():
    n = int(0.35 * SR)
    out, ph = [], 0.0
    for i in range(n):
        t = i / SR
        f = 48 + 110 * math.exp(-t * 32)
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-t * 9))
    return out


def clap():
    n = int(0.22 * SR)
    out, y = [], 0.0
    for i in range(n):
        t = i / SR
        # three quick bursts, then a tail: the classic clap shape
        burst = sum(math.exp(-max(0, t - d) * 140) * (t >= d) for d in (0, 0.011, 0.022))
        env = burst * 0.6 + math.exp(-t * 22) * 0.5
        x = random.uniform(-1, 1)
        y += 0.55 * (x - y)  # gentle band-limit
        out.append((x - y) * env)
    return out


def shaker():
    n = int(0.07 * SR)
    out, y = [], 0.0
    for i in range(n):
        t = i / SR
        x = random.uniform(-1, 1)
        y += 0.9 * (x - y)
        out.append((x - y) * math.exp(-t * 60))
    return out


def pad(midis, dur):
    n = int(dur * SR)
    out = []
    fs = [note_hz(m) for m in midis]
    for i in range(n):
        t = i / SR
        env = min(1, t / 0.6) * min(1, (dur - t) / 0.8)
        s = sum(math.sin(2 * math.pi * f * t + k) + 0.2 * math.sin(4 * math.pi * f * t) for k, f in enumerate(fs))
        out.append(s * env / len(fs))
    return out


K, CL, SH = kick(), clap(), shaker()

# Chords per bar (2 s): C – Am – F – G, bright and simple.
CHORDS = [(60, 64, 67), (57, 60, 64), (53, 57, 60), (55, 59, 62)]
ROOTS = [36, 33, 29, 31]
# A hooky 8-step pluck pattern (offsets into the chord + octave jumps).
PATTERN = [0, 2, 1, 2, 0, 2, 1, 3]

bars = int(LENGTH / (4 * BEAT))
for bar in range(bars + 1):
    t0 = bar * 4 * BEAT
    if t0 >= LENGTH:
        break
    chord = CHORDS[bar % 4]
    root = ROOTS[bar % 4]
    intro = t0 < 4.0          # first two bars: plucks and pad only
    outro = t0 >= 41.0        # final ring-out
    if outro:
        add(t0, pad([m + 12 for m in chord] + [chord[0] + 24], LENGTH - t0), 0.32)
        add(t0, marimba(chord[0] + 24, 2.5), 0.5)
        add(t0, bass(root, 2.5), 0.5)
        break
    # plucks on eighths
    for step in range(8):
        idx = PATTERN[step]
        midi = chord[idx] + 12 if idx < 3 else chord[0] + 24
        add(t0 + step * BEAT / 2, marimba(midi, 0.45), 0.34 if not intro else 0.28)
    add(t0, pad(list(chord), 4 * BEAT), 0.16)
    if intro:
        continue
    # bass on beats 1 and 3, with a pickup on the "and" of 4
    add(t0, bass(root, BEAT * 1.4), 0.55)
    add(t0 + 2 * BEAT, bass(root + 7, BEAT * 1.2), 0.45)
    add(t0 + 3.5 * BEAT, bass(root + 12, BEAT * 0.45), 0.35)
    # drums
    for b in range(4):
        add(t0 + b * BEAT, K, 0.7 if b in (0, 2) else 0.0)
        if b in (1, 3):
            add(t0 + b * BEAT, CL, 0.28)
        for e in range(2):
            add(t0 + b * BEAT + e * BEAT / 2, SH, 0.09 if e else 0.06)

# fade the last half second, normalize, gentle soft-clip
for i in range(N):
    t = i / SR
    if t > LENGTH - 0.5:
        mix[i] *= max(0, (LENGTH - t) / 0.5)
peak = max(abs(s) for s in mix) or 1
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<h", int(math.tanh(s / peak * 1.1) / math.tanh(1.1) * 0.85 * 32767)) for s in mix))
print("wrote", OUT, f"{LENGTH:.1f}s")
