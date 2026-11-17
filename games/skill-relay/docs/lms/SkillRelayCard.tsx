/**
 * SkillRelayCard – entry to the skill relay in the right rail, under the lab
 * Compass. A static drawing: skills as lanes, versions as dots, the red dot
 * is the skill someone holds right now, the ring is a skill free to take.
 * The card is drawn only while the game is switched on for the lab.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Repeat } from 'lucide-react';
import { isRelayEnabled } from '../lib/skill-relay';

interface SkillRelayCardProps {
  labId: string;
  className?: string;
}

const LANE_X0 = 18;
const LANE_X1 = 182;
const STEP = 16;

/** Versions already handed over on each lane; `held` – someone works on it now. */
const LANES = [
  { y: 22, done: 6, held: false },
  { y: 44, done: 3, held: true },
  { y: 66, done: 8, held: false },
  { y: 88, done: 4, held: true },
  { y: 110, done: 2, held: false },
];

export default function SkillRelayCard({ labId, className = '' }: SkillRelayCardProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    void isRelayEnabled(labId).then((value) => {
      if (alive) setEnabled(value);
    });
    return () => {
      alive = false;
    };
  }, [labId]);

  if (!enabled) return null;

  return (
    <Link
      to={`/${labId}/relay`}
      aria-label="эстафета skills – взять skill, изменить по одному правилу и передать дальше"
      className={`group block rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow transition-all duration-200 bg-white ${className}`}
    >
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-gray-100">
        <Repeat size={12} className="text-aim-red" strokeWidth={2} />
        <span className="text-xs font-medium text-gray-700 font-mono">эстафета skills</span>
      </div>

      <svg viewBox="0 0 200 132" className="block w-full" aria-hidden="true">
        {LANES.map((lane) => {
          const headX = LANE_X0 + lane.done * STEP;
          return (
            <g key={lane.y}>
              <line x1={LANE_X0} y1={lane.y} x2={LANE_X1} y2={lane.y} stroke="#f3f4f6" />
              <line
                x1={LANE_X0}
                y1={lane.y}
                x2={headX}
                y2={lane.y}
                stroke="#d1d5db"
                strokeWidth="0.75"
              />
              {Array.from({ length: lane.done }, (_, index) => (
                <circle
                  key={index}
                  cx={LANE_X0 + index * STEP}
                  cy={lane.y}
                  r="2.5"
                  fill="#9ca3af"
                />
              ))}
              {lane.held ? (
                <>
                  <circle cx={headX} cy={lane.y} r="9" fill="#DC2626" fillOpacity="0.12" />
                  <circle
                    cx={headX}
                    cy={lane.y}
                    r="4.5"
                    fill="#DC2626"
                    className="origin-center transition-transform duration-200 group-hover:scale-125"
                    style={{ transformBox: 'fill-box' }}
                  />
                </>
              ) : (
                <>
                  <circle
                    cx={headX}
                    cy={lane.y}
                    r="6"
                    fill="#fff"
                    stroke="#111827"
                    strokeWidth="1.5"
                  />
                  <circle cx={headX} cy={lane.y} r="2" fill="#111827" />
                </>
              )}
            </g>
          );
        })}
      </svg>

      <div className="px-3 pb-2">
        <p className="text-xs text-gray-600 leading-snug">
          возьми skill и выбери одно правило: модель внесёт правку, ты проверишь и передашь
          следующему. на всё пять минут
        </p>
      </div>

      <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-end">
        <span className="text-[10px] text-aim-red font-mono">взять skill →</span>
      </div>
    </Link>
  );
}
