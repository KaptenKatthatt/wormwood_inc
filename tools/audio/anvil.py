"""The smith's hammer on the anvil (public/audio/sfx/anvil): a short bright
clink made of five decaying sine partials and a 30 ms noise click, the sound
Jonas approved on the review page on 2026-11-20. Needs numpy and ffmpeg.

    python3 tools/audio/anvil.py
"""
import subprocess, wave
from pathlib import Path
import numpy as np

RATE = 44100
OUT = Path(__file__).resolve().parents[2] / 'public' / 'audio' / 'sfx'
# frequency (Hz), level, time to fade (s)
PARTIALS = [(1870, 1.0, 0.32), (2790, 0.6, 0.24), (4130, 0.45, 0.16), (5480, 0.3, 0.10), (620, 0.35, 0.06)]


def clink() -> np.ndarray:
    n = int(RATE * 0.4)
    t = np.arange(n) / RATE
    out = np.zeros(n)
    for freq, level, fade in PARTIALS:
        # falls from level/2 to 0.0008 over the fade, like the page's exponential ramp
        env = (level * 0.5) * (0.0008 / (level * 0.5)) ** np.minimum(1, t / fade)
        out += np.sin(2 * np.pi * freq * t) * env * (t <= fade + 0.02)
    rng = np.random.default_rng(1870)
    k = int(RATE * 0.03)
    out[:k] += rng.uniform(-1, 1, k) * (1 - np.arange(k) / k) * 0.5
    out[-200:] *= np.linspace(1, 0, 200)
    return out / np.abs(out).max() * 0.5


def main() -> None:
    wav = OUT / 'anvil.wav'
    with wave.open(str(wav), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE)
        f.writeframes((clink() * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-c:a', 'libvorbis', '-q:a', '5', str(OUT / 'anvil.ogg')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-c:a', 'libmp3lame', '-q:a', '4', str(OUT / 'anvil.mp3')], check=True)
    wav.unlink()


if __name__ == '__main__':
    main()
