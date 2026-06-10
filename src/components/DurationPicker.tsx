/**
 * DurationPicker — User selects how long the agent connection lasts.
 */

import React, { useRef } from 'react';
import { DurationPickerProps, DurationOption } from '../types';
import { AapRootContext, useStandaloneRoot } from '../hooks/useStandaloneRoot';

const DEFAULT_DURATIONS: DurationOption[] = [
  { label: '1 Hour', seconds: 3600 },
  { label: '24 Hours', seconds: 86400 },
  { label: '7 Days', seconds: 604800 },
  { label: '30 Days', seconds: 2592000 },
  { label: 'Until I Revoke', seconds: null },
];

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'No expiry — stays connected until you revoke';
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hour${seconds >= 7200 ? 's' : ''}`;
  return `${Math.round(seconds / 86400)} day${seconds >= 172800 ? 's' : ''}`;
}

function getDurationHint(seconds: number | null): string {
  if (seconds === null) return 'Best for automation and cron jobs. Your agent runs indefinitely. You stay in control and can disconnect anytime.';
  if (seconds <= 3600) return 'Good for one-time tasks. Agent loses access automatically.';
  if (seconds <= 86400) return 'Good for a day of active use.';
  if (seconds <= 604800) return 'Good for a short project or trial period.';
  return 'Good for ongoing monitoring or coaching.';
}

export function DurationPicker({
  options = DEFAULT_DURATIONS,
  selectedSeconds,
  onDurationChange,
  theme,
  className = '',
}: DurationPickerProps) {
  const rootClass = useStandaloneRoot(theme);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex(opt => opt.seconds === selectedSeconds);

  // Radio group keyboard pattern: arrow keys move selection + focus,
  // roving tabindex keeps the group a single tab stop.
  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1) % options.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onDurationChange(options[next].seconds);
      optionRefs.current[next]?.focus();
    }
  }

  return (
    <AapRootContext.Provider value={true}>
    <div className={`${rootClass} aa-duration-picker ${className}`.trim()}>
      <h3 className="aa-section-title">Connection Duration</h3>
      <p className="aa-section-desc">How long should your agent stay connected?</p>

      <div
        className="aa-duration-options"
        role="radiogroup"
        aria-label="Connection duration"
      >
        {options.map((opt, i) => {
          const isSelected = selectedSeconds === opt.seconds;
          // The selected option is the tab stop; if none selected, the first is.
          const isTabStop = isSelected || (selectedIndex === -1 && i === 0);
          return (
            <button
              key={i}
              ref={el => { optionRefs.current[i] = el; }}
              onClick={() => onDurationChange(opt.seconds)}
              onKeyDown={e => handleKeyDown(e, i)}
              tabIndex={isTabStop ? 0 : -1}
              className={`aa-duration-option ${isSelected ? 'aa-duration-active' : ''}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={opt.label}
            >
              <span className="aa-duration-label">{opt.label}</span>
              {isSelected && (
                <span className="aa-duration-hint">{getDurationHint(opt.seconds)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
    </AapRootContext.Provider>
  );
}
