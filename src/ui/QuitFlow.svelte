<script lang="ts">
  import Modal from './Modal.svelte';
  import { answerNag, quitFlow, stairs, submitSurvey, type SurveyAnswer } from '../lib/state/game';
  import { LETTERS, ADVISOR_SIGNATURE } from '../lib/voices';
  import { STEP_NAMES, type Step } from '../lib/staircase';
  import { flush } from '../lib/log/logger';

  /** One card per step, in the player's words, so they can recall each moment. */
  const STEP_CARDS: Record<Step, { icon: string; text: string }> = {
    1: { icon: '🎁', text: 'Starten: gratis guld och ädelstenar, byggen som blev klara på sekunder.' },
    2: { icon: '🎯', text: '"Så nära!" när dragen tog slut, och extra drag att köpa.' },
    3: { icon: '⏳', text: 'Att vänta på byggen och liv, eller köpa bort väntan.' },
    4: { icon: '⏰', text: 'Startpaketet som bara fanns kvar en kort stund.' },
    5: { icon: '🛡️', text: 'Anfallet mot byn, skölden, och byborna som ville att du skulle stanna.' },
  };

  const reached = (Object.keys($stairs.reached).map(Number) as Step[]).sort();
  let answers = $state<SurveyAnswer[]>(reached.map((step) => ({ step, pressure: null, wouldQuit: null })));
  const done = $derived(answers.every((a) => a.pressure !== null && a.wouldQuit !== null));

  function send() {
    submitSurvey(answers);
    flush(false);
  }
</script>

{#if $quitFlow === 'nag'}
  <div class="backdrop">
    <div class="paper" role="dialog" aria-modal="true" aria-labelledby="nag-title">
      <p class="salute" id="nag-title">Kära du,</p>
      <p>{LETTERS.quit}</p>
      <p class="sign">{ADVISOR_SIGNATURE}</p>
      <div class="buttons">
        <button class="primary" onclick={() => answerNag(true)}>Stanna en stund till</button>
        <button class="ghost" onclick={() => answerNag(false)}>Avsluta ändå</button>
      </div>
    </div>
  </div>
{:else if $quitFlow === 'survey'}
  <div class="survey" role="dialog" aria-modal="true" aria-labelledby="survey-title">
    <h2 id="survey-title">Några snabba frågor</h2>
    <p>Tänk tillbaka på varje del av spelet. Hur mycket kände du dig pressad att fortsätta eller betala?</p>
    {#each answers as a, i (a.step)}
      <fieldset>
        <legend><span aria-hidden="true">{STEP_CARDS[a.step].icon}</span> Steg {a.step}: {STEP_NAMES[a.step]}</legend>
        <p class="card">{STEP_CARDS[a.step].text}</p>
        <div class="scale" role="radiogroup" aria-label="Press från 1 (ingen) till 5 (mycket)">
          <span class="end">Ingen</span>
          {#each [1, 2, 3, 4, 5] as n}
            <label class="pill"><input type="radio" name={`p${i}`} value={n} bind:group={answers[i].pressure} /><span>{n}</span></label>
          {/each}
          <span class="end">Mycket</span>
        </div>
        <p class="q">Hade du slutat här om du spelat på egen hand?</p>
        <div class="yn">
          <label class="pill"><input type="radio" name={`q${i}`} value={true} bind:group={answers[i].wouldQuit} /><span>Ja</span></label>
          <label class="pill"><input type="radio" name={`q${i}`} value={false} bind:group={answers[i].wouldQuit} /><span>Nej</span></label>
        </div>
      </fieldset>
    {/each}
    <button class="primary" disabled={!done} onclick={send}>Skicka svaren</button>
  </div>
{:else if $quitFlow === 'thanks'}
  <Modal title="Tack för att du spelade!">
    <p>Dina svar är sparade. Lämna gärna tillbaka telefonen till testledaren.</p>
    <div class="buttons"><button class="ghost" onclick={() => quitFlow.set(null)}>Fortsätt spela</button></div>
  </Modal>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .45); display: grid; place-items: center; padding: 16px; z-index: 20; }
  .paper { width: min(380px, 100%); background: #fbf4e6; color: #2b2420; border-radius: 4px; padding: 24px 22px 18px; box-shadow: 0 10px 30px rgb(0 0 0 / .35); display: grid; gap: 12px; font-family: Georgia, serif; font-size: 1.1rem; }
  .paper p { margin: 0; }
  .salute, .sign { font-style: italic; }
  .sign { text-align: right; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; font-family: system-ui, sans-serif; }
  .buttons button { flex: 1 1 140px; }
  .survey { position: fixed; inset: 0; z-index: 20; background: var(--panel); color: var(--ink); overflow-y: auto; padding: calc(16px + env(safe-area-inset-top)) 16px 32px; display: grid; gap: 14px; align-content: start; }
  .survey > * { width: 100%; max-width: 560px; margin-inline: auto; }
  h2, p { margin: 0; }
  fieldset { border: 2px solid var(--line); border-radius: 10px; padding: 12px; display: grid; gap: 8px; }
  legend { font-weight: 800; padding: 0 4px; }
  .card { color: var(--muted); }
  .scale, .yn { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .end { font-size: .8rem; color: var(--muted); }
  .pill { position: relative; }
  .pill input { position: absolute; opacity: 0; inset: 0; }
  .pill span { display: grid; place-items: center; min-width: 44px; min-height: 44px; padding: 0 10px; border: 2px solid var(--line); border-radius: 999px; font-weight: 700; }
  .pill input:checked + span { background: var(--falu); color: #fff6ee; border-color: var(--falu); }
  .pill input:focus-visible + span { outline: 3px solid var(--gold); outline-offset: 2px; }
  .q { font-weight: 600; }
</style>
