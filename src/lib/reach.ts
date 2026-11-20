/**
 * Reaching the testers (Jonas, 2026-11-20): messages from Jonas shown in the
 * game, and an e-mail address a tester may leave after the consent. The
 * server side is server/reach.mjs; this file holds what the two share and
 * what can be tested without a browser.
 */
export interface JonasMessage {
  id: string;
  title: string;
  body: string;
  /** When Jonas sent it, in real milliseconds. */
  sentAt: number;
}

export interface Inbox {
  messages: JonasMessage[];
  /** Ids of messages that have come up on the screen. */
  shown: string[];
  /** Ids of messages the player has pressed Okej on, or opened under Settings. */
  read: string[];
}

export const emptyInbox = (): Inbox => ({ messages: [], shown: [], read: [] });

/** The addresses are deleted when this moment has passed (end of 31 January 2027, Swedish time). */
export const CONTACTS_END = Date.parse('2027-02-01T00:00:00+01:00');
export const CONTACTS_END_TEXT = '31 januari 2027';

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;.]{2,}$/;
export const validEmail = (v: string): boolean => v.length <= 254 && EMAIL_RE.test(v);

/** What the server sent, laid over what the device remembers; oldest first. */
export function mergeInbox(old: Inbox, fromServer: JonasMessage[]): Inbox {
  const byId = new Map(old.messages.map((m) => [m.id, m]));
  for (const m of fromServer) {
    if (typeof m?.id === 'string' && typeof m.title === 'string' && typeof m.body === 'string' && typeof m.sentAt === 'number') byId.set(m.id, { id: m.id, title: m.title, body: m.body, sentAt: m.sentAt });
  }
  return { ...old, messages: [...byId.values()].sort((a, b) => a.sentAt - b.sentAt) };
}

/** The message that comes up by itself: the oldest one not yet read. */
export const nextUnread = (inbox: Inbox): JonasMessage | null => inbox.messages.find((m) => !inbox.read.includes(m.id)) ?? null;

const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
/** "27 november", in Swedish time. */
export function dayText(ms: number): string {
  const [, m, d] = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}
