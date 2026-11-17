/**
 * Netlify Function: Skill Relay entry
 *
 * The skill relay is a separate game service with its own table, log and
 * reviews. A lab page shows it in a frame, and this function is the only way
 * in: it verifies the LMS user and the lab membership, asks the game for a
 * one-time entry link and hands that link to the page, which uses it as the
 * frame address. The game then keeps its own session cookie.
 *
 * GET  ?lab=f26        → { ok, enabled }            is the game switched on (card visibility)
 * POST { lab: 'f26' }  → { ok, auth_link, origin }  one-time link, valid for minutes
 *
 * Env: SKILL_RELAY_URL – public address of the game, the same origin that
 * frame-src allows; SKILL_RELAY_MINT_SECRET – shared secret of the game's
 * /api/mint (its RELAY_MINT_SECRET). Without either one the function answers
 * enabled:false / 503 and the rest of the LMS is untouched.
 *
 * The secret never reaches the browser. The person is identified to the game
 * by Telegram id, username and display name taken from the LMS account.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { resolveTokenUser } from './utils/resolve-token-user';
import type { AuthUser } from './utils/auth-types';
import { createLogger } from './utils/logger';
import { userHasLab } from '../../src/lib/lab-aliases';

const log = createLogger('skill-relay-enter');

/** Labs that play the relay and have an LMS page for it. */
const RELAY_LABS = new Set(['f26']);

const MINT_TIMEOUT_MS = 10_000;
/** The game accepts only a plain positive Telegram id. */
const TG_ID = /^[1-9][0-9]{4,15}$/;
/** Refusals of the game that are safe to show to the person as they are. */
const KNOWN_REFUSALS = new Set(['not_on_roster']);

const jsonHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://learn.aimindset.org',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store',
};

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: jsonHeaders, body: JSON.stringify(body) };
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isRelayLab(lab: string): boolean {
  return RELAY_LABS.has(lab);
}

export interface RelayConfig {
  base: string;
  origin: string;
  secret: string;
}

/** Address and secret of the game, or null while the game is not switched on. */
export function relayConfig(env: NodeJS.ProcessEnv = process.env): RelayConfig | null {
  const base = (env.SKILL_RELAY_URL || '').trim().replace(/\/+$/, '');
  const secret = (env.SKILL_RELAY_MINT_SECRET || '').trim();
  if (!base || !secret) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return null;
    }
    return { base, origin: url.origin, secret };
  } catch {
    return null;
  }
}

/** What the game learns about the person: the same fields its roster keeps. */
export type RelayViewer = Pick<AuthUser, 'tgId' | 'tgUsername' | 'displayName' | 'tgName'>;

export function mintPayload(user: RelayViewer) {
  return {
    tg_id: String(user.tgId),
    username: (user.tgUsername || '').replace(/^@/, '').toLowerCase(),
    display_name: (user.displayName || user.tgName || '').trim().slice(0, 80),
    source: 'lms',
  };
}

interface MintAnswer {
  authorized?: unknown;
  auth_link?: unknown;
  reason?: unknown;
}

async function enter(config: RelayConfig, user: RelayViewer, lab: string) {
  let status = 0;
  let data: MintAnswer = {};
  try {
    const response = await fetch(`${config.base}/api/mint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Mint-Secret': config.secret },
      body: JSON.stringify(mintPayload(user)),
      redirect: 'manual',
      signal: AbortSignal.timeout(MINT_TIMEOUT_MS),
    });
    status = response.status;
    data = ((await response.json().catch(() => null)) as MintAnswer | null) || {};
  } catch (error) {
    log.error('relay-unreachable', {
      lab,
      error: error instanceof Error ? error.message : String(error),
    });
    return json(502, { ok: false, error: 'relay_unreachable' });
  }

  if (status === 200 && data.authorized === false) {
    const reason = str(data.reason);
    return json(403, { ok: false, error: KNOWN_REFUSALS.has(reason) ? reason : 'relay_refused' });
  }

  const link = str(data.auth_link);
  let linkOrigin = '';
  try {
    linkOrigin = new URL(link).origin;
  } catch {
    linkOrigin = '';
  }
  // The frame may only open the game itself: a link to another origin is a
  // misconfigured game (its public address differs from SKILL_RELAY_URL).
  if (status !== 200 || data.authorized !== true || linkOrigin !== config.origin) {
    log.error('relay-bad-answer', { lab, status, sameOrigin: linkOrigin === config.origin });
    return json(502, { ok: false, error: 'relay_failed' });
  }
  return json(200, { ok: true, auth_link: link, origin: config.origin });
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: jsonHeaders, body: '' };
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return json(401, { ok: false, error: 'unauthorized' });

  const auth = await resolveTokenUser(token);
  if (!auth.valid || !auth.user) return json(401, { ok: false, error: 'unauthorized' });
  const user = auth.user;

  let lab = '';
  if (event.httpMethod === 'GET') {
    lab = str(event.queryStringParameters?.lab);
  } else {
    try {
      const parsed: unknown = JSON.parse(event.body || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape');
      lab = str((parsed as Record<string, unknown>).lab);
    } catch {
      return json(400, { ok: false, error: 'bad_json' });
    }
  }
  if (!isRelayLab(lab)) return json(400, { ok: false, error: 'unknown_lab' });

  if (user.role !== 'admin' && !userHasLab(user.labs || [], lab)) {
    return json(403, { ok: false, error: 'not_in_lab' });
  }

  const config = relayConfig();
  if (event.httpMethod === 'GET') return json(200, { ok: true, enabled: Boolean(config) });

  if (!config) return json(503, { ok: false, error: 'relay_not_configured' });
  if (!TG_ID.test(String(user.tgId || '')))
    return json(403, { ok: false, error: 'no_telegram_id' });

  return enter(config, user, lab);
};
