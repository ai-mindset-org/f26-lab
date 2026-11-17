/**
 * Skill relay of a lab: client side of netlify/functions/skill-relay-enter.
 * The game is a separate service shown in a frame; the LMS only checks who
 * comes in and asks the game for a one-time entry link.
 */

import { getAuthToken } from '../hooks/useAuth';

export const RELAY_ENDPOINT = '/.netlify/functions/skill-relay-enter';

/** Message the framed game posts so the frame grows with its content. */
export const RELAY_HEIGHT_MESSAGE = 'skill-relay:height';
export const RELAY_MIN_HEIGHT = 420;
export const RELAY_MAX_HEIGHT = 6000;

const STATUS_KEY = 'skill-relay:enabled';
const STATUS_TTL_MS = 10 * 60 * 1000;

export interface RelayEntry {
  authLink: string;
  origin: string;
}

export class RelayError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'RelayError';
  }
}

/** What to tell the person when the table did not open. */
export function relayErrorText(code: string): string {
  switch (code) {
    case 'relay_not_configured':
      return 'Игра пока не включена. Ведущий откроет стол к началу практики.';
    case 'not_in_lab':
    case 'not_on_roster':
      return 'Стол открыт участникам потока. Если это ошибка, напиши куратору.';
    case 'no_telegram_id':
      return 'В твоём аккаунте LMS нет Telegram: войди через бота и открой страницу снова.';
    case 'unauthorized':
      return 'Вход в LMS устарел. Войди заново и открой страницу снова.';
    default:
      return 'Стол сейчас не открылся. Обнови страницу, а если не помогло, напиши куратору.';
  }
}

/** Height from a frame message, or null when the message is not ours. */
export function relayFrameHeight(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const message = data as { type?: unknown; height?: unknown };
  if (message.type !== RELAY_HEIGHT_MESSAGE) return null;
  const height = Number(message.height);
  if (!Number.isFinite(height) || height <= 0) return null;
  return Math.min(RELAY_MAX_HEIGHT, Math.max(RELAY_MIN_HEIGHT, Math.round(height)));
}

/** One-time entry link for the frame. Throws RelayError with the server code. */
export async function requestRelayEntry(labId: string): Promise<RelayEntry> {
  const token = getAuthToken();
  if (!token) throw new RelayError('unauthorized');
  let response: Response;
  try {
    response = await fetch(RELAY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lab: labId }),
    });
  } catch {
    throw new RelayError('network');
  }
  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
    auth_link?: string;
    origin?: string;
    error?: string;
  } | null;
  if (!response.ok || !data?.ok || !data.auth_link || !data.origin) {
    throw new RelayError(data?.error || 'relay_failed');
  }
  return { authLink: data.auth_link, origin: data.origin };
}

/**
 * Is the game switched on for this lab. Asked once per ten minutes per tab:
 * the answer decides whether the entry card is drawn in the right rail.
 */
export async function isRelayEnabled(labId: string): Promise<boolean> {
  const key = `${STATUS_KEY}:${labId}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || 'null') as {
      at?: number;
      enabled?: boolean;
    } | null;
    if (cached && typeof cached.at === 'number' && Date.now() - cached.at < STATUS_TTL_MS) {
      return Boolean(cached.enabled);
    }
  } catch {
    // storage is a convenience: without it the status is simply asked again
  }
  const token = getAuthToken();
  if (!token) return false;
  let enabled = false;
  try {
    const response = await fetch(`${RELAY_ENDPOINT}?lab=${encodeURIComponent(labId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await response.json().catch(() => null)) as { enabled?: boolean } | null;
    enabled = response.ok && Boolean(data?.enabled);
  } catch {
    return false;
  }
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), enabled }));
  } catch {
    // see above
  }
  return enabled;
}
