/**
 * TokenDisplay — Shows the generated connection token with copy button.
 */

import React, { useState } from 'react';
import { TokenDisplayProps } from '../types';

export function TokenDisplay({
  token,
  loading = false,
  onCopy,
  className = '',
}: TokenDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = token;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!token && !loading) return null;

  return (
    <div className={`aa-token-display ${className}`}>
      <h3 className="aa-section-title">Your Connection Token</h3>
      <p className="aa-section-desc">
        Copy this token and give it to your AI agent. The token expires in 15 minutes, so use it before then.
        Works with agents that have HTTP access, such as Claude Code, Codex, or custom agents.
      </p>

      {loading ? (
        <div className="aa-token-loading" aria-live="polite">Generating token...</div>
      ) : (
        <div className="aa-token-container" aria-live="polite">
          <div className="aa-token-value">
            <code className="aa-token-code">
              {visible ? token : `${token?.slice(0, 20)}${'•'.repeat(30)}`}
            </code>
          </div>

          <div className="aa-token-actions">
            <button
              onClick={() => setVisible(!visible)}
              className="aa-btn aa-btn-secondary"
              aria-label={visible ? 'Hide token' : 'Show token'}
              aria-pressed={visible}
            >
              {visible ? '🙈 Hide' : '👁 Show'}
            </button>
            <button
              onClick={handleCopy}
              className="aa-btn aa-btn-primary"
              aria-label={copied ? 'Token copied to clipboard' : 'Copy token to clipboard'}
            >
              {copied ? '✅ Copied!' : '📋 Copy Token'}
            </button>
          </div>

          <p className="aa-token-warning">
            <span role="img" aria-label="warning">⚠️</span> This token is shown once. If you close this page, you'll need to generate a new one.
          </p>
        </div>
      )}
    </div>
  );
}
