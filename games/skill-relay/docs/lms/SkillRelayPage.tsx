/**
 * SkillRelayPage — эстафета skills внутри лабы. Образец для aim-lms: src/pages/SkillRelayPage.tsx.
 * Маршрут: /f26/relay, под ProtectedRoute tier="user" labId="f26", как у компаса.
 *
 * Страница просит у функции LMS одноразовую ссылку входа и ставит её адресом рамки.
 * Игра открывает узкую версию /lms/ и сообщает высоту содержимого: рамка растёт без своей прокрутки.
 * В CSP LMS нужен адрес игры в frame-src.
 */

import { useEffect, useState } from 'react';
import { getAuthToken } from '../hooks/useAuth';

const ENTER_ENDPOINT = '/.netlify/functions/skill-relay-enter';
/** Адрес игры: тот же, что в frame-src и в SKILL_RELAY_URL функции входа. */
const RELAY_ORIGIN = import.meta.env.VITE_SKILL_RELAY_URL as string;

interface SkillRelayPageProps {
  labId: string;
}

export default function SkillRelayPage({ labId }: SkillRelayPageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [height, setHeight] = useState(720);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = getAuthToken();
        if (!token) throw new Error('unauthorized');
        const response = await fetch(ENTER_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lab: labId }),
        });
        const data = (await response.json()) as { ok?: boolean; auth_link?: string; error?: string };
        if (!response.ok || !data.auth_link) throw new Error(data.error || 'enter_failed');
        if (alive) setSrc(data.auth_link);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'enter_failed');
      }
    })();
    return () => {
      alive = false;
    };
  }, [labId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== RELAY_ORIGIN) return;
      const data = event.data as { type?: string; height?: number } | null;
      if (data?.type === 'skill-relay:height' && Number(data.height) > 0) {
        setHeight(Math.max(420, Math.round(Number(data.height))));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">эстафета skills</h1>
      <p className="mt-2 mb-6 text-gray-600 max-w-2xl">
        Skill растёт по одному изменению. Возьми skill со стола, примени одно правило и отдай новой
        версией следующему.
      </p>

      {error && (
        <p className="text-sm text-gray-600">
          Стол сейчас не открылся ({error}). Обнови страницу или напиши куратору.
        </p>
      )}

      {src && (
        <iframe
          src={src}
          title="эстафета skills"
          className="block w-full border-0"
          style={{ height }}
        />
      )}
    </div>
  );
}
