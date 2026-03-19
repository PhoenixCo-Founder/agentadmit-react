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
        Copy this token and give it to your AI agent. The token expires in 15 minutes — use it before then.
      </p>

      {loading ? (
        <div className="aa-token-loading">Generating token...</div>
      ) : (
        <div className="aa-token-container">
          <div className="aa-token-value">
            <code className="aa-token-code">
              {visible ? token : `${token?.slice(0, 20)}${'•'.repeat(30)}`}
            </code>
          </div>

          <div className="aa-token-actions">
            <button onClick={() => setVisible(!visible)} className="aa-btn aa-btn-secondary">
              {visible ? '🙈 Hide' : '👁 Show'}
            </button>
            <button onClick={handleCopy} className="aa-btn aa-btn-primary">
              {copied ? '✅ Copied!' : '📋 Copy Token'}
            </button>
          </div>

          <p className="aa-token-warning">
            ⚠️ This token is shown once. If you close this page, you'll need to generate a new one.
          </p>

          {/* Next Step bridge */}
          <div className="aa-next-step">
            <p className="aa-next-step-text">
              <strong>Next step:</strong> Scroll down to choose a template that tells your agent exactly what you want.
              Personalize it, then send the template and this token together to your AI agent in one message.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
