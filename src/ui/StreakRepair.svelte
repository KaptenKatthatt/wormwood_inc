<script lang="ts">
  /** Streak protection: a streak that broke yesterday can be repaired today for gems. */
  import Modal from './Modal.svelte';
  import { answerRepair, purse, streakRepair } from '../lib/state/game';
  const o = $derived($streakRepair!);
</script>

<Modal title="Din svit är bruten!">
  <p class="big">🔥 {o.streak} dagar i rad</p>
  <p>Du klarade ingen utmaning i går, så sviten börjar om från 1. Laga den nu, så räknas i går som en klarad dag.</p>
  <p class="fine">Erbjudandet gäller bara i dag. Du har 💎 {$purse.gems}.</p>
  <div class="buttons">
    <button class="primary" onclick={() => answerRepair(true)}>Laga sviten för 💎 {o.price}</button>
    <button class="ghost" onclick={() => answerRepair(false)}>Låt den börja om</button>
  </div>
</Modal>

<style>
  .big { font-size: 1.4rem; font-weight: 800; text-align: center; }
  .fine { color: var(--muted); font-size: .9rem; }
</style>
