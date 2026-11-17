"""Tiny helper for writing MIDI by hand and rendering it with FluidSynth.

The music and most of the sound effects in the game are composed in code
(tools/audio/compose.py) and rendered with the FluidR3_GM sound font
(MIT licence, Frank Wen), so every note is our own and no licence beyond
the sound font's applies. See public/audio/CREDITS.md.

Requires: python3 with numpy and mido, fluidsynth, ffmpeg and
/usr/share/sounds/sf2/FluidR3_GM.sf2 (Debian/Ubuntu: apt install fluidsynth
fluid-soundfont-gm ffmpeg; pip install numpy mido).
"""
from __future__ import annotations

import os
import subprocess
import tempfile
import wave

import mido
import numpy as np

SF2 = os.environ.get("SF2", "/usr/share/sounds/sf2/FluidR3_GM.sf2")
RATE = 44100
TPB = 480  # ticks per beat

NOTE_NAMES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def n(name: str) -> int:
    """'F#4' -> MIDI number 66. Middle C is C4 = 60."""
    letter = name[0]
    rest = name[1:]
    acc = 0
    while rest and rest[0] in "#b":
        acc += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return 12 * (int(rest) + 1) + NOTE_NAMES[letter] + acc


class Song:
    def __init__(self, bpm: float):
        self.bpm = bpm
        self.events: list[tuple[int, int, mido.Message]] = []  # (tick, order, msg)
        self.channels: dict[str, int] = {}

    def instrument(self, name: str, program: int, channel: int, volume: int = 100,
                   pan: int = 64, reverb: int = 50, chorus: int = 0) -> str:
        self.channels[name] = channel
        if channel != 9:
            self.events.append((0, 0, mido.Message("program_change", channel=channel, program=program)))
        for cc, val in ((7, volume), (10, pan), (91, reverb), (93, chorus)):
            self.events.append((0, 0, mido.Message("control_change", channel=channel, control=cc, value=val)))
        return name

    def note(self, inst: str, beat: float, pitch: int | str, dur: float, vel: int = 90) -> None:
        ch = self.channels[inst]
        p = n(pitch) if isinstance(pitch, str) else pitch
        t0 = int(round(beat * TPB))
        t1 = int(round((beat + dur) * TPB))
        self.events.append((t0, 2, mido.Message("note_on", channel=ch, note=p, velocity=max(1, min(127, vel)))))
        self.events.append((t1, 1, mido.Message("note_off", channel=ch, note=p, velocity=0)))

    def seq(self, inst: str, beat: float, notes: list, vel: int = 90, legato: float = 0.95) -> float:
        """notes: list of (pitch or None for rest, beats). Returns the end beat."""
        for pitch, dur in notes:
            if pitch is not None:
                if isinstance(pitch, (list, tuple)):
                    for p in pitch:
                        self.note(inst, beat, p, dur * legato, vel)
                else:
                    self.note(inst, beat, pitch, dur * legato, vel)
            beat += dur
        return beat

    def cc(self, inst: str, beat: float, control: int, value: int) -> None:
        ch = self.channels[inst]
        self.events.append((int(round(beat * TPB)), 0, mido.Message("control_change", channel=ch, control=control, value=value)))

    def bend(self, inst: str, beat: float, value: int) -> None:
        ch = self.channels[inst]
        self.events.append((int(round(beat * TPB)), 0, mido.Message("pitchwheel", channel=ch, pitch=value)))

    def seconds(self, beats: float) -> float:
        return beats * 60.0 / self.bpm

    def to_midi(self, path: str) -> None:
        mid = mido.MidiFile(ticks_per_beat=TPB)
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(self.bpm), time=0))
        last = 0
        for tick, _, msg in sorted(self.events, key=lambda e: (e[0], e[1])):
            tr.append(msg.copy(time=tick - last))
            last = tick
        mid.save(path)

    def render(self, tail: float = 3.0, gain: float = 0.6) -> np.ndarray:
        """Render to a float32 stereo array (frames, 2)."""
        with tempfile.TemporaryDirectory() as tmp:
            mid = os.path.join(tmp, "song.mid")
            wav = os.path.join(tmp, "song.wav")
            # A silent note at the end keeps FluidSynth rendering the tail.
            end = max(t for t, _, _ in self.events) / TPB
            ch = next(iter(self.channels.values()))
            self.events.append((int((end + tail * self.bpm / 60) * TPB), 0,
                                mido.Message("control_change", channel=ch, control=110, value=0)))
            self.to_midi(mid)
            subprocess.run(["fluidsynth", "-ni", "-g", str(gain), "-r", str(RATE),
                            "-o", "synth.reverb.active=1", "-o", "synth.chorus.active=1",
                            "-F", wav, SF2, mid], check=True, capture_output=True)
            return read_wav(wav)


def read_wav(path: str) -> np.ndarray:
    with wave.open(path) as w:
        frames = w.readframes(w.getnframes())
        ch = w.getnchannels()
        data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        return data.reshape(-1, ch)


def write_wav(path: str, data: np.ndarray) -> None:
    data = np.clip(data, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(data.shape[1])
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((data * 32767).astype(np.int16).tobytes())


def trim(data: np.ndarray, threshold: float = 0.0005) -> np.ndarray:
    """Drop silence at the start and fade out the quiet end."""
    env = np.abs(data).max(axis=1)
    idx = np.where(env > threshold)[0]
    if len(idx) == 0:
        return data
    start = max(0, idx[0] - int(0.002 * RATE))
    end = min(len(data), idx[-1] + int(0.05 * RATE))
    out = data[start:end].copy()
    fade = min(len(out), int(0.05 * RATE))
    out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return out


def loop_bake(data: np.ndarray, loop_seconds: float) -> np.ndarray:
    """Fold everything rendered after the loop point (reverb tails, ringing
    notes) back onto the start, so the file loops without a seam."""
    n_loop = int(round(loop_seconds * RATE))
    out = data[:n_loop].copy()
    tail = data[n_loop:]
    k = min(len(tail), n_loop)
    out[:k] += tail[:k]
    return out


def normalize(data: np.ndarray, peak: float = 0.89) -> np.ndarray:
    m = np.abs(data).max()
    return data * (peak / m) if m > 0 else data


def encode(data: np.ndarray, out_base: str, formats=("mp3", "ogg"), mono: bool = False) -> list[str]:
    """Write out_base.mp3 / .ogg. Mono for short effects keeps files small."""
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "x.wav")
        write_wav(wav, data)
        outs = []
        for fmt in formats:
            path = f"{out_base}.{fmt}"
            args = ["ffmpeg", "-y", "-loglevel", "error", "-i", wav]
            if mono:
                args += ["-ac", "1"]
            if fmt == "mp3":
                args += ["-c:a", "libmp3lame", "-q:a", "4"]
            elif fmt == "ogg":
                args += ["-c:a", "libvorbis", "-q:a", "4"]
            subprocess.run(args + [path], check=True)
            outs.append(path)
        return outs
