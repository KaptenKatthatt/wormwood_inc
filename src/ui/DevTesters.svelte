<script lang="ts">
  /**
   * The testers' part of the dev menu (Jonas, 2026-11-20: at the top of the
   * settings): the admin key and messages (DevReach), then signups and
   * invitations (DevInvites).
   */
  import DevReach from './DevReach.svelte';
  import DevInvites from './DevInvites.svelte';
</script>

<section class="testers" aria-labelledby="testers-title">
  <h2 id="testers-title">Testarna</h2>
  <p class="fine">Bara i dev-versionen.</p>
  <DevReach />
  <DevInvites />
</section>

<style>
  .testers { margin-top: 8px; border: 2px dashed var(--line); border-radius: 8px; padding: 12px; display: grid; gap: 12px; }
  h2 { font-size: 1.15rem; margin: 0; }
  p { margin: 0; }
  .fine { color: var(--muted); font-size: .9rem; }
</style>
