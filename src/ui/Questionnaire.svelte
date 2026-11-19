<script lang="ts">
  /**
   * The questionnaire that stands in for the interview: the game's own
   * invitation, part 1, the debriefing, part 2 with the question about the
   * data, and the thanks. The answers stay on the device between visits.
   */
  import { tick } from 'svelte';
  import Modal from './Modal.svelte';
  import { MORE, PART1, answered, debrief, part2, pick, type Question } from '../lib/questionnaire';
  import { answerAsk, chooseContinue, closeQuestionnaire, finishDebrief, finishPart1, finishPart2, qOpen, qState, reached, setAnswer } from '../lib/state/questionnaire';
  import { playerId } from '../lib/state/game';
  import { testCode } from '../lib/testCode';

  const r = reached();
  const second = part2(r);
  const paragraphs = debrief(r);
  let mayUse = $state<boolean | null>(null);
  let top = $state<HTMLElement>();

  const stage = $derived($qState.stage);
  const part1Done = $derived(PART1.every((q) => answered(q, $qState.answers)));
  const part2Done = $derived(second.every((q) => answered(q, $qState.answers)) && mayUse !== null);

  const str = (id: string): string => { const a = $qState.answers[id]; return typeof a === 'string' ? a : ''; };
  const list = (id: string): string[] => { const a = $qState.answers[id]; return Array.isArray(a) ? a : []; };
  let moreOpen = $state<Record<string, boolean>>({});
  /** Each new step starts at its top, with the heading in focus for screen readers. */
  async function next(step: () => void) {
    step();
    await tick();
    top?.scrollTo({ top: 0 });
    top?.querySelector<HTMLElement>('h2')?.focus();
  }
</script>

{#snippet question(q: Question, n: number)}
  <fieldset>
    <legend>{n}. {q.text}</legend>
    {#if q.kind === 'scale'}
      <div class="scale">
        <div class="choices">
          {#each [1, 2, 3, 4, 5] as v}
            <label class="pill"><input type="radio" name={q.id} aria-label={`${v}${v === 1 ? `, ${q.low}` : v === 5 ? `, ${q.high}` : ''}`} checked={$qState.answers[q.id] === v} onchange={() => setAnswer(q.id, v)} /><span>{v}</span></label>
          {/each}
        </div>
        <div class="ends" aria-hidden="true"><span>1 = {q.low}</span><span>5 = {q.high}</span></div>
      </div>
    {:else if q.kind === 'single'}
      <div class="choices">
        {#each q.options as o}
          <label class="pill"><input type="radio" name={q.id} checked={$qState.answers[q.id] === o.id} onchange={() => setAnswer(q.id, o.id)} /><span>{o.label}</span></label>
        {/each}
      </div>
    {:else if q.kind === 'multi'}
      <div class="stack">
        {#each q.options as o}
          <label class="check"><input type="checkbox" checked={list(q.id).includes(o.id)} onchange={(e) => setAnswer(q.id, pick(q.options, list(q.id), o.id, e.currentTarget.checked))} /><span>{o.label}</span></label>
        {/each}
      </div>
    {/if}
    {#if q.kind !== 'scale'}
      {#if moreOpen[q.id] || str(`${q.id}More`)}
        <label class="more">{MORE}
          <textarea rows="2" maxlength="1000" value={str(`${q.id}More`)} oninput={(e) => setAnswer(`${q.id}More`, e.currentTarget.value)}></textarea>
        </label>
      {:else}
        <button class="link" onclick={() => (moreOpen[q.id] = true)}>{MORE}</button>
      {/if}
    {/if}
  </fieldset>
{/snippet}

{#if $qOpen === 'ask'}
  <Modal title="Tack för att du testar!">
    {#if stage === 'part1' || stage === 'choice'}
      <p>Vill du svara på några frågor om hur det har varit att spela? Det tar några minuter och hjälper examensarbetet mycket.</p>
    {:else}
      <p>Testet är snart slut. Jag har en sak att berätta och några sista frågor. Det tar några minuter.</p>
    {/if}
    <p class="fine">Frågorna finns också under Inställningar.</p>
    <div class="buttons">
      <button class="primary" onclick={() => answerAsk(true)}>Svara nu</button>
      <button class="ghost" onclick={() => answerAsk(false)}>Senare</button>
    </div>
  </Modal>
{:else if $qOpen === 'form'}
  <div class="form" role="dialog" aria-modal="true" aria-labelledby="q-title" bind:this={top}>
    {#if stage === 'part1'}
      <h2 id="q-title" tabindex="-1">Några frågor om spelet</h2>
      <p>Det finns inga rätta eller fel svar. Tryck på det som stämmer för dig.</p>
      {#each PART1 as q, i (q.id)}{@render question(q, i + 1)}{/each}
      {#if !part1Done}<p class="fine" id="q-why">Svara på alla frågor för att gå vidare.</p>{/if}
      <button class="primary" disabled={!part1Done} aria-describedby={part1Done ? undefined : 'q-why'} onclick={() => next(finishPart1)}>Vidare</button>
      <button class="ghost" onclick={closeQuestionnaire}>Fortsätt senare</button>
    {:else if stage === 'choice'}
      <h2 id="q-title" tabindex="-1">Tack för svaren!</h2>
      <p>De är sparade. Vill du fortsätta testa spelet?</p>
      <button class="primary" onclick={() => { chooseContinue(true); closeQuestionnaire(); }}>Ja, jag spelar vidare</button>
      <button class="ghost" onclick={() => next(() => chooseContinue(false))}>Nej, jag har testat klart</button>
      <p class="fine">Väljer du att sluta får du några sista frågor nu. Spelar du vidare kommer de senare, och du kan när som helst säga att du är klar under Inställningar.</p>
    {:else if stage === 'waiting'}
      <h2 id="q-title" tabindex="-1">Tack för svaren!</h2>
      <p>Spela vidare så länge du vill. När du inte vill testa mer: tryck på "Jag har testat klart" under Inställningar.</p>
      <button class="primary" onclick={closeQuestionnaire}>Stäng</button>
    {:else if stage === 'debrief'}
      <h2 id="q-title" tabindex="-1">Vad studien handlar om</h2>
      {#each paragraphs as p}<p class="story">{p}</p>{/each}
      <button class="primary" onclick={() => next(finishDebrief)}>Vidare till de sista frågorna</button>
    {:else if stage === 'part2'}
      <h2 id="q-title" tabindex="-1">De sista frågorna</h2>
      {#each second as q, i (q.id)}{@render question(q, PART1.length + i + 1)}{/each}
      <fieldset>
        <legend>{PART1.length + second.length + 1}. Får jag använda dina svar och det spelet har sparat i examensarbetet?</legend>
        <div class="stack">
          <label class="check"><input type="radio" name="mayUse" checked={mayUse === true} onchange={() => (mayUse = true)} /><span>Ja, det går bra</span></label>
          <label class="check"><input type="radio" name="mayUse" checked={mayUse === false} onchange={() => (mayUse = false)} /><span>Nej, radera mina uppgifter</span></label>
        </div>
        <p class="fine">Du kan ändra dig senare. Säg då din testkod <strong class="code">{testCode(playerId)}</strong> till Jonas.</p>
      </fieldset>
      {#if !part2Done}<p class="fine" id="q-why2">Svara på alla frågor för att skicka.</p>{/if}
      <button class="primary" disabled={!part2Done} aria-describedby={part2Done ? undefined : 'q-why2'} onclick={() => next(() => finishPart2(mayUse === true))}>Skicka svaren</button>
      <button class="ghost" onclick={closeQuestionnaire}>Fortsätt senare</button>
    {:else}
      <h2 id="q-title" tabindex="-1">Tack för hjälpen!</h2>
      {#if $qState.mayUse === false}
        <p>Jonas raderar dina uppgifter, och spelet skickar inget mer. Din testkod är <strong class="code">{testCode(playerId)}</strong> om du vill fråga om det.</p>
      {:else}
        <p>Dina svar är sparade. Vill du senare att dina uppgifter raderas, säg din testkod <strong class="code">{testCode(playerId)}</strong> till Jonas.</p>
      {/if}
      <p>Du får gärna fortsätta spela så länge du vill.</p>
      <button class="primary" onclick={closeQuestionnaire}>Stäng</button>
    {/if}
  </div>
{/if}

<style>
  .form { position: fixed; inset: 0; z-index: 20; background: var(--panel); color: var(--ink); overflow-y: auto; padding: calc(16px + env(safe-area-inset-top)) 16px calc(32px + env(safe-area-inset-bottom)); display: grid; gap: 14px; align-content: start; }
  .form > :global(*) { width: 100%; max-width: 560px; margin-inline: auto; }
  h2, p { margin: 0; }
  h2:focus { outline: none; }
  .fine { color: var(--muted); font-size: .9rem; }
  .story { font-size: 1.05rem; }
  fieldset { border: 2px solid var(--line); border-radius: 10px; padding: 12px; display: grid; gap: 10px; min-width: 0; }
  legend { font-weight: 800; padding: 0 4px; }
  .choices { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .scale { display: grid; gap: 4px; justify-content: start; }
  .ends { display: flex; justify-content: space-between; gap: 12px; font-size: .85rem; color: var(--muted); }
  .pill { position: relative; }
  .pill input { position: absolute; opacity: 0; inset: 0; }
  .pill span { display: grid; place-items: center; min-width: 48px; min-height: 48px; padding: 0 14px; border: 2px solid var(--muted); border-radius: 999px; font-weight: 700; }
  .pill input:checked + span { background: var(--falu); color: #fff6ee; border-color: var(--falu); }
  .pill input:focus-visible + span { outline: 3px solid var(--gold); outline-offset: 2px; }
  .stack { display: grid; gap: 4px; }
  .check { display: flex; gap: 10px; align-items: center; min-height: 48px; }
  .check input { width: 24px; height: 24px; accent-color: var(--falu); flex: none; }
  .more { display: grid; gap: 4px; font-size: .95rem; color: var(--muted); }
  .link { justify-self: start; background: none; border: 0; padding: 0 4px; min-height: 44px; font-weight: 600; color: var(--muted); text-decoration: underline; }
  textarea { font: inherit; width: 100%; border: 2px solid var(--muted); border-radius: 8px; padding: 8px 10px; background: #fffaf3; color: var(--ink); resize: vertical; }
  textarea:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
  .code { font-family: ui-monospace, monospace; letter-spacing: .08em; }
</style>
