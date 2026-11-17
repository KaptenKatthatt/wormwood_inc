# tools/audio

Makes the game's own music and sound effects (see `public/audio/CREDITS.md`).

```bash
apt install fluidsynth fluid-soundfont-gm ffmpeg && pip install numpy mido
python3 tools/audio/compose.py OUT_DIR [name ...]        # music and effects (names in EFFECTS/MUSIC)
python3 tools/audio/compose.py --pitched OUT_DIR marimba # match-0..7 for cascades
python3 tools/audio/ambience.py SRC_DIR OUT_BASE          # sea loop from the CC0 recordings
python3 tools/audio/build_start.py SRC_DIR OUT_DIR [name] # hammer, saw and accordion
```

SRC_DIR holds the downloaded CC0 originals named in each script's docstring.
Jonas chose among the variants on a listening page (2026-11-17); only the
chosen ones are copied to `public/audio/`.
