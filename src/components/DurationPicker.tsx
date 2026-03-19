/**
 * DurationPicker — User selects how long the agent connection lasts.
 */

import React from 'react';
import { DurationPickerProps, DurationOption } from '../types';

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
  className = '',
}: DurationPickerProps) {
  return (
    <div className={`aa-duration-picker ${className}`}>
      <h3 className="aa-section-title">Connection Duration</h3>
      <p className="aa-section-desc">How long should your agent stay connected?</p>

      <div className="aa-duration-options">
        {options.map((opt, i) => {
          const isSelected = selectedSeconds === opt.seconds;
          return (
            <button
              key={i}
              onClick={() => onDurationChange(opt.seconds)}
              className={`aa-duration-option ${isSelected ? 'aa-duration-active' : ''}`}
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
  );
}
