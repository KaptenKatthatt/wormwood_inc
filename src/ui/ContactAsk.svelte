<script lang="ts">
  /**
   * The voluntary question after the consent (Jonas, 2026-11-20): may Jonas
   * get in touch by e-mail? Skipping weighs as much as saving, and the game
   * starts either way.
   */
  import { CONTACTS_END_TEXT, validEmail } from '../lib/reach';
  import { contact, saveContact, skipContact } from '../lib/state/reach';
  import { startTutorial, tutorialDone } from '../lib/tutorial';
  import { settings, toast } from '../lib/state/game';
  import { get } from 'svelte/store';

  // Straight after the consent the introduction follows; opened from Settings, nothing does.
  const afterConsent = !get(settings).contactAsked;

  let email = $state($contact);
  let error = $state('');
  let busy = $state(false);

  function done() {
    if (afterConsent && !tutorialDone()) startTutorial();
  }
  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!validEmail(v)) { error = 'Det där ser inte ut som en mejladress. Rätta den eller tryck Hoppa över.'; return; }
    busy = true;
    const ok = await saveContact(v);
    busy = false;
    if (!ok) { error = 'Adressen gick inte att spara just nu. Försök igen, eller tryck Hoppa över och lägg till den senare under Inställningar.'; return; }
    toast('Tack! Adressen är sparad. Du kan ta bort den under Inställningar.', 5000);
    done();
  }
  function skip() {
    skipContact();
    done();
  }
</script>

<div class="backdrop">
  <form class="card" novalidate onsubmit={submit} aria-labelledby="contact-title">
    <h2 id="contact-title">Får Jonas höra av sig?</h2>
    <p>Om du vill kan du lämna din mejladress. Jonas använder den bara för att ställa en följdfråga om spelet eller berätta hur det gick. Det är helt frivilligt.</p>
    <label class="field">Mejladress (frivilligt)
      <input id="contact-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="namn@exempel.se" bind:value={email} aria-describedby={error ? 'contact-error' : undefined} aria-invalid={error ? 'true' : undefined} />
    </label>
    {#if error}<p class="error" id="contact-error" role="alert">{error}</p>{/if}
    <ul class="fine">
      <li>Adressen sparas ihop med din testkod, så Jonas kan se vad just du har gjort i spelet när han frågar.</li>
      <li>Ingen reklam, och ingen annan än Jonas får den.</li>
      <li>Den raderas senast {CONTACTS_END_TEXT}. Du kan ta bort den själv under Inställningar.</li>
    </ul>
    <div class="buttons">
      <button class="primary" type="submit" disabled={busy}>Spara adressen</button>
      <button class="ghost" type="button" onclick={skip} disabled={busy}>Hoppa över</button>
    </div>
  </form>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .55); display: grid; place-items: start center; padding: var(--note-top) 16px 16px; z-index: 10; }
  .card { background: var(--panel); color: var(--ink); border-radius: 8px; padding: 20px; width: min(420px, 100%); max-height: calc(100dvh - var(--note-top) - 16px); overflow-y: auto; display: grid; gap: 10px; }
  h2 { margin: 0; }
  p { margin: 0; }
  ul { margin: 0; padding-left: 1.2em; display: grid; gap: 4px; }
  .fine { color: var(--muted); font-size: .9rem; }
  .field { display: grid; gap: 4px; font-weight: 700; }
  .field input { font: inherit; font-weight: 400; min-height: 48px; padding: 8px 12px; border: 2px solid var(--line); border-radius: 6px; background: #fff; color: var(--ink); width: 100%; }
  .error { color: var(--falu); font-weight: 700; font-size: .95rem; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .buttons button { flex: 1 1 140px; }
</style>
