<script lang="ts">
  /**
   * Jonas's side of letting the testers in (dev menu only, server/invites.mjs):
   * the signups from jonasolson.se/exjobb, a personal link per tester in a
   * round, the day each round opens, and how far each tester has come.
   * Uses the same admin key as the messages (DevReach).
   */
  import { load } from '../lib/state/storage';
  import { playerId } from '../lib/state/game';
  import { enablePush } from '../lib/push/push';
  import { ROUND_NAMES, openDayText, type Round } from '../lib/invite';

  interface Signup { id: string; at: number; name: string; email: string; phone: 'android' | 'iphone'; where: 'plats' | 'distans'; note: string; kind: 'omgang' | 'egen' }
  interface Inv { code: string; round: Round; name: string; createdAt: number; phones: number; firstSeen: number | null; lastSeen: number | null; day: number | null; email: string }
  interface RoundRow { round: Round; opensAt: number | null; open: boolean; invited: number }
  interface Overview { rounds: RoundRow[]; signups: Signup[]; invites: Inv[]; notifyHere?: boolean }

  const TEST_SITE = `${location.protocol}//${location.host.replace(/^dev\./, '')}`;
  const linkFor = (code: string) => `${TEST_SITE}/?kod=${code}`;
  const dateText = (ms: number) => new Date(ms).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', timeZone: 'Europe/Stockholm' });
  const toInput = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' }) : '');
  /** The start of a day in Sweden (winter time, which lasts the whole study). */
  const fromInput = (d: string) => (d ? Date.parse(`${d}T00:00:00+01:00`) : null);

  let data = $state<Overview | null>(null);
  let status = $state('');
  let dates = $state<Record<string, string>>({});
  let shown = $state<Inv | null>(null);
  let copyStatus = $state('');
  let askRemove = $state('');
  let freeName = $state('');
  let freeRound = $state<Round>('pilot');
  let mailBox: HTMLElement | undefined = $state();

  async function call(path: string, extra: Record<string, unknown> = {}) {
    const key = load('adminKey', '');
    if (!key) { status = 'Fyll först i nyckeln under Testarna ovanför.'; return null; }
    try {
      const r = await fetch(`/api/admin/invites/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, playerId, ...extra }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 403) { status = 'Fel nyckel.'; return null; }
      if (!r.ok) { status = j.error ? `Det gick inte: ${j.error}.` : `Det gick inte (${r.status}).`; return null; }
      status = '';
      return j;
    } catch {
      status = 'Servern svarar inte.';
      return null;
    }
  }
  function take(j: any) {
    if (!j) return;
    data = j;
    dates = Object.fromEntries((j as Overview).rounds.map((r) => [r.round, toInput(r.opensAt)]));
  }
  async function refresh() { take(await call('overview')); }
  $effect(() => { if (load('adminKey', '')) void refresh(); });

  async function invite(extra: Record<string, unknown>) {
    const j = await call('create', extra);
    if (!j) return;
    take(j);
    shown = (j as Overview).invites.find((i) => i.code === j.code) ?? null;
    copyStatus = '';
    freeName = '';
  }
  async function saveDate(r: Round) {
    take(await call('round', { round: r, opensAt: fromInput(dates[r] ?? '') }));
  }
  async function remove(extra: Record<string, unknown>) {
    askRemove = '';
    take(await call('remove', extra));
    if (shown && extra.code === shown.code) shown = null;
  }

  let notifyStatus = $state('');
  async function setNotify(on: boolean) {
    notifyStatus = '';
    if (on) {
      const r = await enablePush(playerId);
      if (r !== 'ok') {
        notifyStatus = r === 'denied' ? 'Notiser är avstängda för sidan. Slå på dem i webbläsarens inställningar och försök igen.' : 'Telefonen kunde inte slå på notiser just nu. Försök igen.';
        return;
      }
    }
    const j = await call('notify', { on });
    if (!j) return;
    take(j);
    notifyStatus = on ? 'Klart. Den här telefonen får en notis för varje ny anmälan.' : 'Avstängt på den här telefonen.';
  }

  const roundOf = (r: Round) => data?.rounds.find((x) => x.round === r);
  function mailText(i: Inv): string {
    const r = roundOf(i.round);
    const what = i.round === 'pilot' ? 'piloten' : `omgång ${i.round}`;
    const when = r?.opensAt ? `, som börjar ${openDayText(r.opensAt)}. Öppna den här länken på din mobil då:` : '. Öppna den här länken på din mobil:';
    const intro = i.round === 'egen'
      ? 'Du börjar när det passar dig. Testet varar en vecka från den dag du öppnar spelet första gången, och sedan får du spela vidare så mycket du vill. Öppna den här länken på din mobil:'
      : i.round === 'jonas' ? 'Öppna den här länken på din mobil:' : `Du är med i ${what}${when}`;
    return `Hej ${i.name}!\n\nTack för att du vill testa Skärgårdsbyn. ${intro}\n${linkFor(i.code)}\n\nDin kod är ${i.code}, om spelet frågar efter den. Spela i Chrome på Android eller Safari på iPhone.\n\nHälsningar,\nJonas`;
  }
  async function copy(i: Inv) {
    try {
      await navigator.clipboard.writeText(mailText(i));
      copyStatus = `Kopierat. Klistra in i ett mejl${i.email ? ` till ${i.email}` : ''}.`;
    } catch {
      if (mailBox) {
        const range = document.createRange();
        range.selectNodeContents(mailBox);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      copyStatus = 'Texten är markerad. Kopiera den själv.';
    }
  }
  function statusOf(i: Inv): { text: string; kind: string } {
    if (!i.firstSeen) return { text: 'Inbjuden', kind: 'inv' };
    return { text: `Spelar, dag ${i.day}`, kind: 'play' };
  }
</script>

<fieldset>
  <legend>Testarna: anmälningar och inbjudningar</legend>
  {#if !data}
    <div class="buttons"><button class="ghost" onclick={refresh}>Visa anmälningar och inbjudningar</button></div>
    {#if status}<p class="fine" role="status">{status}</p>{/if}
  {:else}
    <label class="notify"><input type="checkbox" checked={data.notifyHere === true} onchange={(e) => setNotify(e.currentTarget.checked)} /> Notis till den här telefonen vid ny anmälan</label>
    {#if notifyStatus}<p class="fine" role="status">{notifyStatus}</p>{/if}
    <strong>Omgångar</strong>
    <p class="fine">En omgång går att spela från sin dag. Utan dag ser de inbjudna bara att du hör av dig.</p>
    {#each data.rounds.filter((r) => r.round !== 'jonas' && r.round !== 'egen') as r (r.round)}
      <div class="round">
        <label class="field">{ROUND_NAMES[r.round]} ({r.invited} inbjudna) {r.open ? '· öppen' : r.opensAt ? `· öppnar ${openDayText(r.opensAt)}` : '· ingen dag än'}
          <input type="date" bind:value={dates[r.round]} />
        </label>
        <button class="ghost" onclick={() => saveDate(r.round)}>Spara dag</button>
      </div>
    {/each}

    {#if shown}
      <div class="shown">
        <strong>{shown.name}, {ROUND_NAMES[shown.round]}</strong>
        <p class="link">{linkFor(shown.code)}</p>
        <p class="mail" bind:this={mailBox}>{mailText(shown)}</p>
        <div class="buttons">
          <button class="primary" onclick={() => shown && copy(shown)}>Kopiera mejltexten</button>
          <button class="ghost" onclick={() => (shown = null)}>Stäng</button>
        </div>
        {#if copyStatus}<p class="fine" role="status">{copyStatus}</p>{/if}
      </div>
    {/if}

    <strong>Anmälningar ({data.signups.length})</strong>
    {#if data.signups.length}
      {#each data.signups as s (s.id)}
        <div class="person">
          <div class="top"><b>{s.name}</b><span class="pill">{s.kind === 'egen' ? 'Egen start, anmäld' : 'Anmäld'} {dateText(s.at)}</span></div>
          <span class="fine">{s.email} · {s.phone === 'iphone' ? 'iPhone' : 'Android'} · {s.where === 'plats' ? 'kan ses i Skåne' : 'på distans'}</span>
          {#if s.note}<span class="fine">"{s.note}"</span>{/if}
          <div class="buttons">
            {#if s.kind === 'egen'}
              <button class="primary" onclick={() => invite({ signupId: s.id, round: 'egen' })}>Bjud in</button>
            {:else}
              <button class="primary" onclick={() => invite({ signupId: s.id, round: 'pilot' })}>Piloten</button>
              <button class="primary" onclick={() => invite({ signupId: s.id, round: '1' })}>Omgång 1</button>
              <button class="primary" onclick={() => invite({ signupId: s.id, round: '2' })}>Omgång 2</button>
            {/if}
            {#if askRemove === s.id}
              <button class="ghost" onclick={() => remove({ signupId: s.id })}>Ja, ta bort</button>
              <button class="ghost" onclick={() => (askRemove = '')}>Avbryt</button>
            {:else}
              <button class="ghost" onclick={() => (askRemove = s.id)}>Ta bort</button>
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <p class="fine">Ingen ny anmälan.</p>
    {/if}

    <strong>Bjud in någon som inte har anmält sig</strong>
    <div class="free">
      <label class="field">Namn
        <input maxlength="60" bind:value={freeName} />
      </label>
      <label class="field">Omgång
        <select bind:value={freeRound}>
          <option value="pilot">Piloten</option>
          <option value="1">Omgång 1</option>
          <option value="2">Omgång 2</option>
          <option value="egen">Egen start (en egen vecka)</option>
          <option value="jonas">Jonas själv (alltid öppen)</option>
        </select>
      </label>
      <button class="primary" disabled={!freeName.trim()} onclick={() => invite({ name: freeName, round: freeRound })}>Skapa länk</button>
    </div>

    <strong>Inbjudna ({data.invites.length})</strong>
    {#if data.invites.length}
      {#each data.invites as i (i.code)}
        <div class="person">
          <div class="top"><b>{i.name || 'Utan namn'}</b><span class="pill {statusOf(i).kind}">{statusOf(i).text}</span></div>
          <span class="fine">{ROUND_NAMES[i.round]} · <span class="code">{i.code}</span>{i.lastSeen ? ` · senast ${dateText(i.lastSeen)}` : ' · har inte öppnat än'}{i.phones > 1 ? ' · två telefoner' : ''}</span>
          <div class="buttons">
            <button class="ghost" onclick={() => { shown = i; copyStatus = ''; }}>Visa länk</button>
            {#if askRemove === i.code}
              <button class="ghost" onclick={() => remove({ code: i.code })}>Ja, ta tillbaka</button>
              <button class="ghost" onclick={() => (askRemove = '')}>Avbryt</button>
            {:else}
              <button class="ghost" onclick={() => (askRemove = i.code)}>Ta tillbaka</button>
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <p class="fine">Ingen inbjuden än.</p>
    {/if}
    {#if status}<p class="fine" role="status">{status}</p>{/if}
    <p class="fine">Namn och mejladresser ligger i en egen fil på servern, inte i loggen, och raderas efter 31 januari 2027. Tar du tillbaka en inbjudan låses spelet för den personen nästa gång hen öppnar det.</p>
    <div class="buttons"><button class="ghost" onclick={refresh}>Uppdatera</button></div>
  {/if}
</fieldset>

<style>
  fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 8px; min-width: 0; }
  legend { font-weight: 700; margin-bottom: 4px; }
  .notify { display: flex; gap: 10px; align-items: flex-start; min-height: 44px; font-weight: 600; }
  .notify input { width: 24px; height: 24px; margin-top: 2px; accent-color: var(--falu); flex: none; }
  p { margin: 0; }
  .fine { color: var(--muted); font-size: .9rem; }
  .field { display: grid; gap: 4px; font-weight: 600; font-size: .95rem; }
  .field input, .field select { font: inherit; font-weight: 400; min-height: 44px; padding: 8px 10px; border: 2px solid var(--line); border-radius: 6px; background: #fff; color: var(--ink); width: 100%; box-sizing: border-box; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .buttons button { min-height: 40px; padding: 4px 12px; }
  .round, .free { display: grid; gap: 6px; }
  .person { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; display: grid; gap: 6px; min-width: 0; }
  .top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; flex-wrap: wrap; }
  .pill { font-size: .78rem; font-weight: 700; padding: 0 8px; border-radius: 99px; background: var(--line); color: var(--ink); white-space: nowrap; }
  .pill.inv { background: var(--gold); color: #3a2a05; }
  .pill.play { background: var(--green); color: #fff6ee; }
  .shown { background: #fff; border: 2px solid var(--gold); border-radius: 8px; padding: 10px; display: grid; gap: 8px; min-width: 0; }
  .link { font-family: ui-monospace, monospace; font-size: .85rem; overflow-wrap: anywhere; }
  .mail { white-space: pre-line; font-size: .9rem; background: var(--panel); border-radius: 6px; padding: 8px; overflow-wrap: anywhere; user-select: all; }
  .code { font-family: ui-monospace, monospace; letter-spacing: .06em; }
</style>
