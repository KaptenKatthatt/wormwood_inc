"""Three fairground tunes for the wheel of fortune (proposals, 2026-11-20).

Written by hand as MIDI and rendered with FluidSynth and FluidR3_GM, the same
way as the rest of the game's music (tools/audio/midisynth.py in the repo).
Every melody is our own. Each tune is a seamless loop: the reverb tail after
the last bar is folded back over the first bar.
Run: python3 fair_tunes.py <path to repo>/tools/audio <out dir>
"""
import subprocess, sys
import numpy as np
sys.path.insert(0, sys.argv[1])
from midisynth import Song, n, write_wav, RATE

OUT = sys.argv[2]
CALLIOPE, REED_ORGAN, ACCORDION, TUBA, GLOCK, PICCOLO, XYLO, MUSIC_BOX = 82, 20, 21, 58, 9, 72, 13, 10
DRUMS = 9
SNARE, BASS_DRUM, CYMBAL, TAMB, TRIANGLE = 38, 36, 49, 54, 81
TRI = {"C": ["C4", "E4", "G4"], "C7": ["C4", "E4", "Bb4"], "F": ["C4", "F4", "A4"], "G7": ["B3", "F4", "G4"],
       "G": ["B3", "D4", "G4"], "D7": ["C4", "D4", "F#4"], "Bb": ["Bb3", "D4", "F4"]}
ROOT = {"C": "C2", "C7": "C2", "F": "F2", "G7": "G2", "G": "G2", "D7": "D2", "Bb": "Bb1"}
FIFTH = {"C": "G2", "C7": "G2", "F": "C2", "G7": "D2", "G": "D2", "D7": "A2", "Bb": "F2"}


def loop(s: Song, beats: float, name: str, gain=0.5):
    data = s.render(tail=3.0, gain=gain)
    L = int(round(s.seconds(beats) * RATE))
    body, tail = data[:L].copy(), data[L:L + int(2.5 * RATE)]
    body[:len(tail)] += tail
    body *= 0.5 / max(1e-6, np.abs(body).max())   # the same modest peak for all three
    wav = f"{OUT}/{name}.wav"; write_wav(wav, body)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libmp3lame", "-b:a", "112k", f"{OUT}/{name}.mp3"], check=True)
    print(name, round(L / RATE, 3), "s")


# ---------------------------------------------------------------- A: Karusellen, a carousel waltz in C
W = [[("E5", 1), ("G5", 1), ("C6", 1)], [("C6", 2), ("G5", 1)], [("D5", 1), ("G5", 1), ("B5", 1)], [("B5", 2), ("G5", 1)],
     [("F5", 1), ("A5", 1), ("D6", 1)], [("D6", 1), ("B5", 1), ("G5", 1)], [("E5", 1), ("G5", 1), ("C6", 1)], [("C6", 2), (None, 1)],
     [("E6", 1), ("D6", 1), ("C6", 1)], [("Bb5", 2), ("G5", 1)], [("A5", 1), ("C6", 1), ("F6", 1)], [("F6", 2), ("A5", 1)],
     [("B5", 1), ("D6", 1), ("F6", 1)], [("F6", 1), ("D6", 1), ("B5", 1)], [("C6", 1), ("G5", 1), ("E5", 1)], [("C6", 2), (None, 1)]]
WC = ["C", "C", "G7", "G7", "G7", "G7", "C", "C", "C", "C7", "F", "F", "G7", "G7", "C", "C"]


def karusellen():
    s = Song(bpm=174)
    s.instrument("lead", CALLIOPE, 0, volume=84, pan=60, reverb=60)
    s.instrument("glock", GLOCK, 1, volume=66, pan=84, reverb=65)
    s.instrument("organ", REED_ORGAN, 2, volume=62, pan=44, reverb=50)
    s.instrument("tuba", TUBA, 3, volume=92, pan=64, reverb=30)
    s.instrument("drums", 0, DRUMS, volume=58, reverb=30)
    for rep in range(2):
        for i, (bar, ch) in enumerate(zip(W, WC)):
            b = (rep * 16 + i) * 3
            s.seq("lead", b, bar, vel=92, legato=0.9)
            if rep == 1:
                s.seq("glock", b, [((n(p) + 12) if p else None, d) for p, d in bar], vel=72, legato=0.5)
            s.note("tuba", b, ROOT[ch] if i % 2 == 0 else FIFTH[ch], 0.8, 96)
            for k in (1, 2):
                for p in TRI[ch]:
                    s.note("organ", b + k, p, 0.4, 66)
            s.note("drums", b, TRIANGLE, 0.3, 58)
            if rep == 1:
                s.note("drums", b + 1, TAMB, 0.2, 44); s.note("drums", b + 2, TAMB, 0.2, 44)
    loop(s, 32 * 3, "tivoli-a-karusellen")


# ---------------------------------------------------------------- B: Positivet, a barrel-organ march in G
M = [[("D5", .5), ("G5", .5), ("B5", .5), ("G5", .5), ("D6", 1), ("B5", 1)], [("D6", .5), ("C6", .5), ("B5", .5), ("A5", .5), ("G5", 1), ("D5", 1)],
     [("F#5", .5), ("A5", .5), ("C6", .5), ("A5", .5), ("F#5", 1), ("A5", 1)], [("G5", .5), ("B5", .5), ("D6", .5), ("B5", .5), ("G5", 2)],
     [("E5", .5), ("G5", .5), ("C6", .5), ("G5", .5), ("E6", 1), ("C6", 1)], [("D6", .5), ("B5", .5), ("G5", .5), ("B5", .5), ("D6", 2)],
     [("C6", .5), ("A5", .5), ("F#5", .5), ("A5", .5), ("D6", 1), ("C6", 1)], [("B5", 1), ("G5", 1), ("G5", 1), (None, 1)]]
MC = ["G", "G", "D7", "G", "C", "G", "D7", "G"]


def positivet():
    s = Song(bpm=128)
    s.instrument("lead", REED_ORGAN, 0, volume=88, pan=58, reverb=50)
    s.instrument("picc", PICCOLO, 1, volume=64, pan=80, reverb=55)
    s.instrument("organ", ACCORDION, 2, volume=58, pan=44, reverb=45)
    s.instrument("tuba", TUBA, 3, volume=94, pan=64, reverb=30)
    s.instrument("drums", 0, DRUMS, volume=62, reverb=30)
    for rep in range(2):
        for i, (bar, ch) in enumerate(zip(M, MC)):
            b = (rep * 8 + i) * 4
            s.seq("lead", b, bar, vel=94, legato=0.8)
            if rep == 1:
                s.seq("picc", b, [((n(p) + 12) if p else None, d) for p, d in bar], vel=70, legato=0.7)
            for k in range(4):
                if k % 2 == 0:
                    s.note("tuba", b + k, ROOT[ch] if k == 0 else FIFTH[ch], 0.7, 98); s.note("drums", b + k, BASS_DRUM, 0.2, 62)
                else:
                    for p in TRI[ch]:
                        s.note("organ", b + k, p, 0.35, 68)
                    s.note("drums", b + k, SNARE, 0.2, 52)
            if i % 4 == 0 and rep == 1:
                s.note("drums", b, CYMBAL, 1.0, 50)
    loop(s, 16 * 4, "tivoli-b-positivet")


# ---------------------------------------------------------------- C: Galoppen, a quick galop in F with accordion and xylophone
G = [[("F5", .5), ("A5", .5), ("C6", .5), ("A5", .5), ("F5", .5), ("A5", .5), ("C6", 1)], [("D6", .5), ("C6", .5), ("A5", .5), ("C6", .5), ("F6", 1), ("C6", 1)],
     [("E5", .5), ("G5", .5), ("Bb5", .5), ("G5", .5), ("E5", .5), ("G5", .5), ("Bb5", 1)], [("A5", .5), ("G5", .5), ("F5", .5), ("A5", .5), ("C6", 2)],
     [("D6", .5), ("Bb5", .5), ("F5", .5), ("Bb5", .5), ("D6", 1), ("F6", 1)], [("C6", .5), ("A5", .5), ("F5", .5), ("A5", .5), ("C6", 2)],
     [("Bb5", .5), ("G5", .5), ("E5", .5), ("G5", .5), ("C6", .5), ("Bb5", .5), ("G5", 1)], [("F5", 1), ("A5", 1), ("F6", 1), (None, 1)]]
GC = ["F", "F", "C7", "F", "Bb", "F", "C7", "F"]


def galoppen():
    s = Song(bpm=150)
    s.instrument("lead", ACCORDION, 0, volume=90, pan=58, reverb=50)
    s.instrument("xylo", XYLO, 1, volume=74, pan=82, reverb=55)
    s.instrument("organ", REED_ORGAN, 2, volume=54, pan=44, reverb=45)
    s.instrument("tuba", TUBA, 3, volume=92, pan=64, reverb=30)
    s.instrument("drums", 0, DRUMS, volume=58, reverb=30)
    for rep in range(2):
        for i, (bar, ch) in enumerate(zip(G, GC)):
            b = (rep * 8 + i) * 4
            s.seq("lead" if rep == 0 else "xylo", b, [((n(p) + (12 if rep else 0)) if p else None, d) for p, d in bar], vel=96, legato=0.75)
            if rep == 1:
                s.seq("lead", b, bar, vel=74, legato=0.75)
            for k in range(4):
                s.note("tuba", b + k, ROOT[ch] if k % 2 == 0 else FIFTH[ch], 0.45, 96)
                for p in TRI[ch]:
                    s.note("organ", b + k + .5, p, 0.25, 64)
                s.note("drums", b + k + .5, TAMB, 0.2, 48)
            if rep == 1 and i % 2 == 0:
                s.note("drums", b, TRIANGLE, 0.3, 60)
    loop(s, 16 * 4, "tivoli-c-galoppen")


karusellen(); positivet(); galoppen()
