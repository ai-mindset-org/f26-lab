/**
 * SkillRelayCard — вход в эстафету skills из правой колонки, под карточкой компаса.
 * Образец для aim-lms: src/components/SkillRelayCard.tsx. Размеры и классы взяты у LabCompassCard.
 * Рисунок статичный: дорожки skills, серые точки версий, красная точка у skill, который сейчас правят.
 */

import { Link } from 'react-router-dom';
import { Repeat } from 'lucide-react';

interface SkillRelayCardProps {
  labId: string;
  className?: string;
}

/** Дорожки: y и число сданных версий; у дорожки с run сейчас идёт изменение. */
const LANES = [
  { y: 24, laps: 3 },
  { y: 44, laps: 5, run: true },
  { y: 64, laps: 2 },
  { y: 84, laps: 4 },
];

const X0 = 24;
const STEP = 17;

export default function SkillRelayCard({ labId, className = '' }: SkillRelayCardProps) {
  return (
    <Link
      to={`/${labId}/relay`}
      aria-label="эстафета skills – взять skill и внести одно изменение"
      className={`group block rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow transition-all duration-200 bg-white ${className}`}
    >
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-gray-100">
        <Repeat size={12} className="text-aim-red" strokeWidth={2} />
        <span className="text-xs font-medium text-gray-700 font-mono">эстафета skills</span>
      </div>

      <svg viewBox="0 0 200 108" className="block w-full" aria-hidden="true">
        {LANES.map((lane) => {
          const end = X0 + lane.laps * STEP;
          return (
            <g key={lane.y}>
              <line x1="16" y1={lane.y} x2="184" y2={lane.y} stroke="#f3f4f6" />
              <line
                x1={X0}
                y1={lane.y}
                x2={end}
                y2={lane.y}
                stroke={lane.run ? '#DC2626' : '#d1d5db'}
                strokeWidth={lane.run ? 1 : 0.5}
                strokeOpacity={lane.run ? 0.7 : 1}
              />
              {Array.from({ length: lane.laps }, (_, i) => (
                <circle key={i} cx={X0 + i * STEP} cy={lane.y} r="2.5" fill="#9ca3af" />
              ))}
              {lane.run ? (
                <>
                  <circle cx={end} cy={lane.y} r="9" fill="#DC2626" fillOpacity="0.12" />
                  <circle
                    cx={end}
                    cy={lane.y}
                    r="4.5"
                    fill="#DC2626"
                    className="origin-center transition-transform duration-200 group-hover:scale-125"
                    style={{ transformBox: 'fill-box' }}
                  />
                </>
              ) : (
                <>
                  <circle cx={end} cy={lane.y} r="4.5" fill="#fff" stroke="#111827" strokeWidth="1.5" />
                  <circle cx={end} cy={lane.y} r="1.5" fill="#111827" />
                </>
              )}
            </g>
          );
        })}
      </svg>

      <div className="px-3 pb-2">
        <p className="text-xs text-gray-600 leading-snug">
          skill растёт по одному изменению: возьми, примени одно правило, передай дальше
        </p>
      </div>

      <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-end">
        <span className="text-[10px] text-aim-red font-mono">взять skill →</span>
      </div>
    </Link>
  );
}
