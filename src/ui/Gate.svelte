<script lang="ts">
  /**
   * What the playtest build shows until Jonas has let the player in
   * (src/lib/invite.ts): a sign, a box for the code, and the day the round opens.
   */
  import { onMount } from 'svelte';
  import { checkCode, codeInUrl, looksLikeCode, openDayText, storedInvite, type Invite } from '../lib/invite';

  let { playerId, onIn }: { playerId: string; onIn: () => void } = $props();

  type View = 'checking' | 'ask' | 'wait';
  let view = $state<View>('checking');
  let code = $state('');
  let error = $state('');
  let invite = $state<Invite | null>(storedInvite());
  let busy = $state(false);

  async function tryCode(c: string, quiet = false) {
    if (!looksLikeCode(c)) {
      error = 'En kod har sex tecken, till exempel K7M2QX.';
      view = 'ask';
      return;
    }
    busy = true;
    error = '';
    const r = await checkCode(c, playerId);
    busy = false;
    if (r.kind === 'ok') {
      invite = r.invite;
      if (r.invite.open) { onIn(); return; }
      view = 'wait';
      return;
    }
    if (r.kind === 'offline') {
      // Without a connection a known invitation still shows its day.
      if (invite) { view = 'wait'; return; }
      error = 'Spelet får ingen kontakt. Kontrollera internet och försök igen.';
    } else if (r.kind === 'taken') {
      error = 'Koden används redan på två andra telefoner. Hör av dig till Jonas.';
    } else if (!quiet) {
      error = 'Den koden finns inte. Kontrollera den i mejlet från Jonas.';
    }
    view = 'ask';
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    void tryCode(code);
  }

  onMount(() => {
    const first = codeInUrl() || invite?.code || '';
    if (first) void tryCode(first, !codeInUrl());
    else view = 'ask';
    // Back on the day the round opens: ask again when the game comes to the front.
    const again = () => { if (document.visibilityState === 'visible' && invite) void tryCode(invite.code, true); };
    document.addEventListener('visibilitychange', again);
    return () => document.removeEventListener('visibilitychange', again);
  });
</script>

<main class="gate">
  <h1 class="sign">Skärgårdsbyn</h1>
  {#if view === 'checking'}
    <p role="status">Ett ögonblick …</p>
  {:else if view === 'wait' && invite}
    {#if invite.opensAt}
      <p class="big">Välkommen! Din omgång börjar <strong>{openDayText(invite.opensAt)}</strong>.</p>
      <p class="small">Lägg gärna spelet på hemskärmen redan nu. Den dagen går det att spela.</p>
    {:else}
      <p class="big">Välkommen! Du är inbjuden.</p>
      <p class="small">Jonas hör av sig när din omgång börjar. Lägg gärna spelet på hemskärmen redan nu.</p>
    {/if}
    <p class="small">Din testkod: <span class="code">{invite.code}</span></p>
  {:else}
    <p class="big">Spelet testas just nu, och du behöver en inbjudan från Jonas för att spela.</p>
    <p class="small">Vill du vara med? Anmäl dig på jonasolson.se/exjobb.</p>
    <form class="codein" onsubmit={submit} novalidate>
      <label for="gate-code">Har du fått en kod?</label>
      <input id="gate-code" bind:value={code} maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="T.ex. K7M2QX" />
      <button class="light" type="submit" disabled={busy}>{busy ? 'Kontrollerar …' : 'Fortsätt'}</button>
      {#if error}<p class="err" role="alert">{error}</p>{/if}
    </form>
  {/if}
</main>

<style>
  .gate { min-height: 100%; box-sizing: border-box; background: var(--falu); color: #fff6ee; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; padding: calc(24px + env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); }
  .sign { margin: 0 0 8px; font-size: 2.4rem; font-weight: 800; line-height: 1; border: 3px solid #fff6ee; border-radius: 12px; padding: 12px 22px 6px; transform: rotate(-1.5deg); }
  p { margin: 0; max-width: 30ch; }
  .big { font-size: 1.15rem; }
  .small { font-size: .95rem; opacity: .9; }
  .code { font-family: ui-monospace, monospace; letter-spacing: .1em; font-weight: 700; }
  .codein { display: grid; gap: 8px; width: 100%; max-width: 260px; text-align: left; margin-top: 8px; }
  label { font-weight: 700; }
  input::placeholder { text-transform: none; letter-spacing: normal; font-family: "Baloo 2", system-ui, sans-serif; font-size: 1rem; }
  input { font: inherit; font-family: ui-monospace, monospace; font-size: 1.2rem; letter-spacing: .14em; text-transform: uppercase; padding: 8px 12px; min-height: 48px; border-radius: 6px; border: 2px solid #fff6ee; background: #fff6ee; color: var(--ink); width: 100%; box-sizing: border-box; }
  .light { background: #fff6ee; color: var(--falu); }
  .err { background: #fff6ee; color: var(--falu); border-radius: 6px; padding: 8px 10px; font-weight: 700; font-size: .95rem; }
</style>
