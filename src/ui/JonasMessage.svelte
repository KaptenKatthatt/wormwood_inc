<script lang="ts">
  /**
   * A message from Jonas, the one who makes the game. It is cool and plain on
   * purpose, unlike the game's own warm letters and offers, so that a tester
   * can tell Jonas from the game (Jonas, 2026-11-20).
   */
  import { dayText, type JonasMessage } from '../lib/reach';
  import { markRead, markShown } from '../lib/state/reach';
  import { toast } from '../lib/state/game';
  let { message }: { message: JonasMessage } = $props();
  $effect(() => markShown(message.id));
  function ok() {
    markRead(message.id);
    toast('Meddelandet ligger kvar under Inställningar.', 4500);
  }
</script>

<div class="backdrop">
  <div class="note" role="dialog" aria-modal="true" aria-labelledby="jm-title" aria-describedby="jm-text">
    <span class="tag">Från Jonas, som gör spelet</span>
    <h2 id="jm-title">{message.title}</h2>
    <p id="jm-text">{message.body}</p>
    <span class="date">{dayText(message.sentAt)}</span>
    <button class="primary" onclick={ok}>Okej</button>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .55); display: grid; place-items: start center; padding: var(--note-top) 16px 16px; z-index: 20; }
  .note { width: min(420px, 100%); max-height: calc(100dvh - var(--note-top) - 16px); overflow-y: auto; background: #e7f1f5; border: 2px solid #7fa9bd; color: #17384a; border-radius: 10px; padding: 18px 20px; display: grid; gap: 10px; }
  .tag { font-size: .8rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
  h2 { margin: 0; font-size: 1.3rem; line-height: 1.2; }
  p { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
  .date { font-size: .85rem; opacity: .8; }
</style>
