/**
 * SkillRelayPage – the skill relay of a lab inside the LMS.
 *
 * The relay is a separate game service: a table of skills, each grows by one
 * change at a time and goes on to the next person as a new version. The page
 * asks the skill-relay-enter function for a one-time entry link and uses it as
 * the frame address; the game opens its narrow LMS version and reports the
 * height of its content, so the frame grows without a scrollbar of its own.
 *
 * Route: /f26/relay. Entry: the relay card in the right rail of /f26 pages
 * (SkillRelayCard); absent from the left menu and search.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Button, PageTransition } from '../components/ui';
import {
  RELAY_MIN_HEIGHT,
  RelayError,
  relayErrorText,
  relayFrameHeight,
  requestRelayEntry,
  type RelayEntry,
} from '../lib/skill-relay';

interface SkillRelayPageProps {
  labId: string;
  labTitle: string;
}

export default function SkillRelayPage({ labId, labTitle }: SkillRelayPageProps) {
  const [entry, setEntry] = useState<RelayEntry | null>(null);
  const [height, setHeight] = useState(720);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setEntry(null);
    setErrorCode(null);
    requestRelayEntry(labId)
      .then((value) => {
        if (alive) setEntry(value);
      })
      .catch((error: unknown) => {
        if (alive) setErrorCode(error instanceof RelayError ? error.code : 'relay_failed');
      });
    return () => {
      alive = false;
    };
  }, [labId, attempt]);

  useEffect(() => {
    if (!entry) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== entry.origin) return;
      const next = relayFrameHeight(event.data);
      if (next !== null) setHeight(next);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [entry]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <PageHeader
          kicker={`${labTitle} · эстафета`}
          title="Эстафета skills"
          subtitle="Возьми skill со стола, выбери одно правило и передай новой версией следующему. На всё пять минут."
          actions={
            entry ? (
              <a
                href={entry.origin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-aim-gray-500 hover:text-aim-red"
              >
                на весь экран
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : undefined
          }
        />

        {errorCode && (
          <div className="rounded-lg border border-dashed border-aim-gray-300 px-5 py-8 text-center text-sm text-aim-gray-500">
            <p className="mb-4">{relayErrorText(errorCode)}</p>
            {errorCode !== 'relay_not_configured' && (
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={retry}
              >
                попробовать ещё раз
              </Button>
            )}
          </div>
        )}

        {!entry && !errorCode && (
          <div
            className="rounded-lg bg-aim-gray-100 animate-pulse"
            style={{ height: RELAY_MIN_HEIGHT }}
            aria-busy="true"
          />
        )}

        {entry && (
          <iframe
            src={entry.authLink}
            title="эстафета skills"
            className="block w-full border-0"
            style={{ height }}
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </PageTransition>
  );
}
