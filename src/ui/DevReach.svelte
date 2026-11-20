<script lang="ts">
  /**
   * Jonas's side of reaching the testers (dev menu only): write a message to
   * the testers, see who has read it, and get the e-mail addresses out. The
   * server wants the admin key for all of it.
   */
  import { CONTACTS_END_TEXT, dayText } from '../lib/reach';
  import { playerId } from '../lib/state/game';
  import { fetchInbox } from '../lib/state/reach';
  import { load, save } from '../lib/state/storage';
  import { myCode } from '../lib/invite';

  interface Sent { id: string; title: string; body: string; sentAt: number; to: string; push: boolean; recipients: number; shown: number; read: number }
  interface Contact { code: string; email: string; site: 'test' | 'dev'; savedAt: number }
  interface Overview { players: { test: number; dev: number }; messages: Sent[]; contacts: Contact[] }

  let key = $state(load('adminKey', ''));
  let data = $state<Overview | null>(null);
  let status = $state('');
  let title = $state('');
  let body = $state('');
  let to = $state<'test' | 'dev' | 'code'>('dev');
  let code = $state('');
  let push = $state(true);
  let sendStatus = $state('');
  let copyStatus = $state('');
  let wipeAsk = $state(false);
  let addresses: HTMLElement | undefined = $state();

  async function call(path: string, extra: Record<string, unknown> = {}): Promise<{ status: number; json: any }> {
    try {
      const r = await fetch(`/api/admin/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: key.trim(), ...extra }) });
      return { status: r.status, json: await r.json().catch(() => ({})) };
    } catch {
      return { status: 0, json: {} };
    }
  }
  const failure = (s: number) => (s === 403 ? 'Fel nyckel.' : s === 0 ? 'Servern svarar inte.' : `Det gick inte (${s}).`);

  async function open(e?: SubmitEvent) {
    e?.preventDefault();
    status = 'Hämtar …';
    const r = await call('overview');
    if (r.status !== 200) { data = null; status = failure(r.status); return; }
    save('adminKey', key.trim());
    data = r.json;
    status = '';
  }
  // A key that is already saved opens the lists at once.
  $effect(() => { if (load('adminKey', '')) void open(); });

  async function send(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { sendStatus = 'Skriv både rubrik och text.'; return; }
    if (to === 'code' && !code.trim()) { sendStatus = 'Skriv testkoden.'; return; }
    sendStatus = 'Skickar …';
    const r = await call('send', { title, body, to: to === 'code' ? code : to, push });
    if (r.status === 404) { sendStatus = 'Ingen testare har den testkoden.'; return; }
    if (r.status !== 200) { sendStatus = failure(r.status); return; }
    data = r.json;
    sendStatus = `Skickat till ${r.json.recipients} spelare${push ? `, ${r.json.pushed} fick notis` : ', utan notis'}.`;
    title = '';
    body = '';
    void fetchInbox();
  }

  const allMail = $derived((data?.contacts ?? []).map((c) => c.email).join(', '));
  async function copy() {
    try {
      await navigator.clipboard.writeText(allMail);
      copyStatus = 'Kopierat. Klistra in som hemlig kopia i din mejl.';
    } catch {
      if (addresses) {
        const range = document.createRange();
        range.selectNodeContents(addresses);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      copyStatus = 'Adresserna är markerade. Kopiera dem själv.';
    }
  }
  async function wipe() {
    const r = await call('wipe-contacts');
    wipeAsk = false;
    if (r.status !== 200) { copyStatus = failure(r.status); return; }
    data = r.json;
    copyStatus = `${r.json.removed} adresser raderade från servern.`;
  }
</script>

<fieldset>
  <legend>Testarna: meddelanden och mejladresser</legend>
  {#if !data}
    <form class="stack" onsubmit={open}>
      <label class="field">Nyckel (fås en gång från servern, sparas sedan här)
        <input type="password" autocomplete="off" bind:value={key} />
      </label>
      <button class="ghost" type="submit" disabled={!key.trim()}>Öppna</button>
      {#if status}<p class="fine" role="status">{status}</p>{/if}
    </form>
  {:else}
    <p class="fine">{data.players.test} testare och {data.players.dev} i dev-versionen har öppnat spelet sedan den här funktionen kom. Din egen testkod här: <strong class="code">{myCode(playerId)}</strong>.</p>

    <form class="stack" novalidate onsubmit={send}>
      <strong>Skriv till testarna</strong>
      <label class="field">Rubrik
        <input maxlength="40" bind:value={title} />
      </label>
      <label class="field">Text (högst 300 tecken, {body.length} nu)
        <textarea maxlength="300" rows="4" bind:value={body}></textarea>
      </label>
      <label class="field">Till
        <select bind:value={to}>
          <option value="dev">Bara dev-versionen, för att prova ({data.players.dev})</option>
          <option value="test">Alla testare ({data.players.test})</option>
          <option value="code">En enda testkod</option>
        </select>
      </label>
      {#if to === 'code'}
        <label class="field">Testkod
          <input maxlength="12" autocapitalize="characters" autocomplete="off" bind:value={code} />
        </label>
      {/if}
      <label class="row">
        <input type="checkbox" bind:checked={push} />
        <span><strong>Skicka också som notis</strong>. Utan notis visas meddelandet nästa gång spelet öppnas.</span>
      </label>
      <button class="primary" type="submit">Skicka</button>
      {#if sendStatus}<p class="fine" role="status">{sendStatus}</p>{/if}
    </form>

    {#if data.messages.length}
      <strong>Skickade meddelanden</strong>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Dag</th><th>Rubrik</th><th>Till</th><th>Fick</th><th>Visat</th><th>Läst</th></tr></thead>
          <tbody>
            {#each data.messages as m (m.id)}
              <tr><td>{dayText(m.sentAt)}</td><td>{m.title}</td><td>{m.to}</td><td>{m.recipients}</td><td>{m.shown}</td><td>{m.read}</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="fine">Visat och Läst räknar bara dem som har sagt ja till testdata.</p>
    {/if}

    <strong>Mejladresser ({data.contacts.length})</strong>
    {#if data.contacts.length}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Testkod</th><th>Mejladress</th><th>Version</th></tr></thead>
          <tbody>
            {#each data.contacts as c (c.code)}
              <tr><td class="code">{c.code}</td><td>{c.email}</td><td>{c.site}</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="all" bind:this={addresses}>{allMail}</p>
      <div class="buttons">
        <button class="primary" onclick={copy}>Kopiera alla adresser</button>
        {#if wipeAsk}
          <button class="ghost" onclick={wipe}>Ja, radera alla</button>
          <button class="ghost" onclick={() => (wipeAsk = false)}>Avbryt</button>
        {:else}
          <button class="ghost" onclick={() => (wipeAsk = true)}>Radera alla adresser</button>
        {/if}
      </div>
    {:else}
      <p class="fine">Ingen har lämnat någon adress än.</p>
    {/if}
    {#if copyStatus}<p class="fine" role="status">{copyStatus}</p>{/if}
    <p class="fine">Adresserna ligger i en egen fil på servern, inte i loggen, och raderas av sig själva efter {CONTACTS_END_TEXT}.</p>
    <div class="buttons"><button class="ghost" onclick={() => open()}>Uppdatera</button></div>
  {/if}
</fieldset>

<style>
  fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 8px; min-width: 0; }
  legend { font-weight: 700; margin-bottom: 4px; }
  p { margin: 0; }
  .fine { color: var(--muted); font-size: .9rem; }
  .stack { display: grid; gap: 8px; }
  .field { display: grid; gap: 4px; font-weight: 600; font-size: .95rem; }
  .field input, .field textarea, .field select { font: inherit; font-weight: 400; min-height: 44px; padding: 8px 10px; border: 2px solid var(--line); border-radius: 6px; background: #fff; color: var(--ink); width: 100%; }
  .row { display: flex; gap: 10px; align-items: flex-start; min-height: 44px; }
  .row input { width: 22px; height: 22px; margin-top: 2px; accent-color: var(--falu); flex: none; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: .9rem; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 4px 10px 4px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  .code { font-family: ui-monospace, monospace; letter-spacing: .06em; }
  .all { font-family: ui-monospace, monospace; font-size: .85rem; background: #fff; border: 1px solid var(--line); border-radius: 6px; padding: 8px; overflow-wrap: anywhere; user-select: all; }
</style>
