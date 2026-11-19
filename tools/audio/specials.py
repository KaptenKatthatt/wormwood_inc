"""Sounds for the special tiles and the hard blocks (Jonas, 2026-11-19).

    python3 tools/audio/specials.py SOURCE_DIR OUT_DIR

Real recordings where the thing is real (Jonas, 2026-11-17: he hears a
synthesised tool at once), all CC0 by rubberduck on OpenGameArt. SOURCE_DIR
holds the three unpacked packs:
  100-CC0-SFX_0.zip                 "100 CC0 SFX"        explosion, shot_02, bell_01
  sfx_100_v2.zip                    "100 CC0 SFX #2"     sfx100v2_air_02, sfx100v2_wood_hit_02
  sfx_breaking_and_falling.zip      "75 CC0 breaking / falling / hit sfx"  bfh1_rock_hit_01, bfh1_rock_breaking_03
The rocket's rising whoosh is filtered noise made here and mixed with the
recorded air release. Needs numpy and ffmpeg only.
"""
from __future__ import annotations

import glob
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

RATE = 44100


def load(src: str, name: str) -> np.ndarray:
    path = glob.glob(os.path.join(src, "**", name), recursive=True)[0]
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def fade(x: np.ndarray, out: float = 0.05, into: float = 0.003) -> np.ndarray:
    x = x.copy()
    o, i = min(len(x), int(out * RATE)), min(len(x), int(into * RATE))
    x[-o:] *= np.linspace(1, 0, o)
    x[:i] *= np.linspace(0, 1, i)
    return x


def mix(parts: list[tuple[float, np.ndarray, float]]) -> np.ndarray:
    total = max(int(at * RATE) + len(p) for at, p, _ in parts)
    out = np.zeros(total, dtype=np.float32)
    for at, p, g in parts:
        i = int(at * RATE)
        out[i:i + len(p)] += p * g
    return out


def whoosh(seconds: float = 0.55) -> np.ndarray:
    """Noise through a band that sweeps upward: something flying past."""
    n = int(seconds * RATE)
    rng = np.random.default_rng(7)
    noise = rng.standard_normal(n).astype(np.float32)
    out = np.zeros(n, dtype=np.float32)
    # a state-variable band-pass whose centre rises from 300 Hz to 3.5 kHz
    low = band = 0.0
    for i in range(n):
        k = i / n
        f = 2 * np.sin(np.pi * (300 + 3200 * k * k) / RATE)
        low += f * band
        high = noise[i] - low - 0.35 * band
        band += f * high
        out[i] = band
    env = np.sin(np.pi * np.linspace(0, 1, n) ** 0.7) ** 1.5
    return (out * env).astype(np.float32)


def encode(x: np.ndarray, out_base: str, peak: float = 0.85) -> None:
    x = x * (peak / max(1e-9, np.abs(x).max()))
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "x.wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
        for fmt, codec in (("mp3", "libmp3lame"), ("ogg", "libvorbis")):
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", codec, "-q:a", "4", f"{out_base}.{fmt}"], check=True)


def main() -> None:
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    boom = load(src, "explosion.ogg")
    pop = load(src, "shot_02.ogg")
    air = fade(load(src, "sfx100v2_air_02.ogg")[: int(0.6 * RATE)], out=0.25)
    sounds = {
        # a rocket: whoosh and the hiss of air, then a small thud where it lands
        "rocket": mix([(0.0, whoosh(), 1.0), (0.0, air, 0.5), (0.42, fade(boom, out=0.2), 0.35)]),
        # fireworks: the bang, then the three small shells
        "fireworks": mix([(0.0, boom, 1.0), (0.2, pop, 0.4), (0.32, pop, 0.3), (0.45, pop, 0.35)]),
        # five in a row going off: a bell over a long whoosh
        "shine": mix([(0.0, load(src, "bell_01.ogg"), 0.9), (0.0, whoosh(0.8), 0.35)]),
        # a hard block takes a hit, and breaks
        "crack": load(src, "bfh1_rock_hit_01.ogg"),
        "break": load(src, "bfh1_rock_breaking_03.ogg"),
        # the hammer booster
        "hammer": mix([(0.0, load(src, "sfx100v2_wood_hit_02.ogg"), 1.0), (0.03, load(src, "bfh1_rock_hit_01.ogg"), 0.5)]),
    }
    for name, x in sounds.items():
        encode(fade(x), os.path.join(out, name))
        print(name, f"{len(x) / RATE:.2f}s")


if __name__ == "__main__":
    main()
