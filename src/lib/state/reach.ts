/**
 * The device's side of reaching the testers: the inbox of messages from
 * Jonas and the e-mail address the tester may have left. See src/lib/reach.ts.
 */
import { derived, get, writable } from 'svelte/store';
import { CONTACT_ASK } from '../config/flags';
import { log } from '../log/logger';
import { CONTACTS_END, emptyInbox, mergeInbox, nextUnread, type Inbox, type JonasMessage } from '../reach';
import { playerId, settings } from './game';
import { load, save } from './storage';

async function post<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- messages

export const inbox = writable<Inbox>({ ...emptyInbox(), ...load<Partial<Inbox>>('inbox', {}) });
inbox.subscribe((i) => save('inbox', i));

/** The message that waits to come up by itself. */
export const pendingMessage = derived(inbox, nextUnread);

export async function fetchInbox(): Promise<void> {
  const r = await post<{ messages: JonasMessage[] }>('/api/messages/inbox', { playerId });
  if (r && Array.isArray(r.messages)) inbox.update((i) => mergeInbox(i, r.messages));
}

/** The server only hears who has seen what from a player who said yes to the log. */
function tell(id: string, kind: 'shown' | 'read'): void {
  log(`message_${kind}`, { id });
  if (get(settings).logging === true) void post('/api/messages/seen', { playerId, id, kind });
}

export function markShown(id: string): void {
  if (get(inbox).shown.includes(id)) return;
  inbox.update((i) => ({ ...i, shown: [...i.shown, id] }));
  tell(id, 'shown');
}

export function markRead(id: string): void {
  if (get(inbox).read.includes(id)) return;
  inbox.update((i) => ({ ...i, read: [...i.read, id], shown: i.shown.includes(id) ? i.shown : [...i.shown, id] }));
  tell(id, 'read');
}

/** Asks for new messages when the game opens and each time it comes back into view. */
export function initReach(): void {
  void fetchInbox();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void fetchInbox();
  });
}

// ------------------------------------------------------------------ e-mail

/** The address this device has left with Jonas, or ''. */
export const contact = writable<string>(load('contactEmail', ''));
contact.subscribe((c) => save('contactEmail', c));

/** Opened from Settings to add an address later. */
export const contactOpen = writable(false);

/** False in a build without the question, and for everyone once the addresses have been deleted. */
export const contactsOpen = (): boolean => CONTACT_ASK && Date.now() < CONTACTS_END;

/** True while the question after the consent has not been answered. */
export const contactDue = derived(settings, (s) => s.logging !== null && !s.contactAsked && contactsOpen());

function asked(): void {
  settings.update((s) => ({ ...s, contactAsked: true }));
  contactOpen.set(false);
}

export async function saveContact(email: string): Promise<boolean> {
  const ok = (await post<{ ok: boolean }>('/api/contact/save', { playerId, email })) !== null;
  if (!ok) return false;
  contact.set(email);
  // The log says that an address was left, never the address itself.
  log('contact_saved', {});
  asked();
  return true;
}

export function skipContact(): void {
  if (!get(settings).contactAsked) log('contact_skipped', {});
  asked();
}

export async function removeContact(): Promise<boolean> {
  const ok = (await post<{ ok: boolean }>('/api/contact/remove', { playerId })) !== null;
  if (!ok) return false;
  contact.set('');
  log('contact_removed', {});
  return true;
}
