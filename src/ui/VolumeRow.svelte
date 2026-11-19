<script lang="ts">
  /**
   * One sound setting: a switch and a volume slider (Jonas, 2026-11-19: volume
   * controls in the menu inside a challenge). Used there and in Settings, on
   * the same stored settings.
   */
  import { audioSettings } from '../lib/audio/sound';

  let { kind, label }: { kind: 'music' | 'sfx'; label: string } = $props();
  const volKey = $derived(kind === 'music' ? 'musicVol' : 'sfxVol');
  const on = $derived($audioSettings[kind]);
  const percent = $derived(Math.round($audioSettings[volKey] * 100));
</script>

<div class="volume">
  <label class="switch">
    <input type="checkbox" checked={on} onchange={(e) => audioSettings.update((a) => ({ ...a, [kind]: e.currentTarget.checked }))} />
    <strong>{label}</strong>
  </label>
  <input
    class="slider"
    type="range"
    min="0"
    max="100"
    step="5"
    value={percent}
    disabled={!on}
    aria-label={`Volym för ${label.toLowerCase()}`}
    aria-valuetext={`${percent} procent`}
    oninput={(e) => audioSettings.update((a) => ({ ...a, [volKey]: Number(e.currentTarget.value) / 100 }))}
  />
  <span class="value" aria-hidden="true">{on ? `${percent} %` : 'Av'}</span>
</div>

<style>
  .volume { display: grid; grid-template-columns: minmax(8.5rem, auto) 1fr 3.2rem; align-items: center; gap: 10px; min-height: 48px; }
  .switch { display: flex; align-items: center; gap: 10px; min-height: 48px; }
  .switch input { width: 22px; height: 22px; accent-color: var(--falu); }
  .slider { width: 100%; min-width: 0; height: 32px; accent-color: var(--falu); }
  .slider:disabled { opacity: 0.4; }
  .value { text-align: right; font-variant-numeric: tabular-nums; color: var(--muted); font-size: 0.9rem; }
</style>
