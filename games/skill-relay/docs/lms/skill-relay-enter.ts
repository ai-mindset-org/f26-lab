/**
 * skill-relay-enter — вход участника лабы в эстафету skills.
 * Образец для aim-lms: netlify/functions/skill-relay-enter.ts, по образцу lab-compass.
 *
 * POST { lab: "f26" } с Authorization: Bearer <токен LMS>
 *   → проверяет токен и зачисление в лабу
 *   → просит у игры одноразовую ссылку: POST <SKILL_RELAY_URL>/api/mint, заголовок X-Mint-Secret
 *   → отдаёт { ok: true, auth_link } странице, та ставит ссылку адресом рамки
 *
 * Переменные: SKILL_RELAY_URL (адрес игры без слэша в конце), SKILL_RELAY_MINT_SECRET (тот же, что RELAY_MINT_SECRET игры).
 * Ссылка живёт 15 минут и срабатывает один раз. Секрет в браузер не попадает.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { resolveTokenUser } from './utils/resolve-token-user';
import { userHasLab } from '../../src/lib/lab-aliases';

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const json = (statusCode: number, body: unknown) => ({ statusCode, headers: jsonHeaders, body: JSON.stringify(body) });

const RELAY_LABS = new Set(['f26']);

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return json(401, { ok: false, error: 'unauthorized' });

  const auth = await resolveTokenUser(token);
  if (!auth.valid || !auth.user) return json(401, { ok: false, error: 'unauthorized' });
  const user = auth.user;

  let lab = '';
  try {
    lab = String((JSON.parse(event.body || '{}') as { lab?: unknown }).lab || '');
  } catch {
    return json(400, { ok: false, error: 'bad_json' });
  }
  if (!RELAY_LABS.has(lab)) return json(400, { ok: false, error: 'unknown_lab' });

  if (user.role !== 'admin' && !userHasLab(user.labs || [], lab)) {
    return json(403, { ok: false, error: 'not_in_lab' });
  }
  if (!user.tgId) return json(403, { ok: false, error: 'no_telegram_id' });

  const base = (process.env.SKILL_RELAY_URL || '').replace(/\/$/, '');
  const secret = process.env.SKILL_RELAY_MINT_SECRET;
  if (!base || !secret) return json(503, { ok: false, error: 'relay_not_configured' });

  const response = await fetch(`${base}/api/mint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Mint-Secret': secret },
    body: JSON.stringify({
      tg_id: String(user.tgId),
      username: (user.tgUsername || '').replace(/^@/, ''),
      display_name: user.displayName || user.tgName || '',
      source: 'lms',
    }),
  });
  const data = (await response.json().catch(() => ({}))) as { authorized?: boolean; auth_link?: string; reason?: string };
  if (!response.ok || !data.authorized || !data.auth_link) {
    return json(502, { ok: false, error: data.reason || 'relay_refused' });
  }
  return json(200, { ok: true, auth_link: data.auth_link });
};
