import { useState } from 'react';

export default function ShareLinkModal({ form, onClose, onViewResponses }) {
  const [copied, setCopied] = useState(false);

  const shareLink = `${window.location.origin}/?form=${form.shareLink}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 32,
        maxWidth: 500,
        width: '90%',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10, color: 'var(--text1)' }}>
          Form Published!
        </h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
          Your form is now live. Share the link below with your audience.
        </p>

        <div style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <input
            type="text"
            value={shareLink}
            readOnly
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text1)',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'monospace'
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              padding: '8px 16px',
              background: copied ? 'var(--green)' : 'var(--purple)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => {
              handleCopy();
              window.location.href = shareLink;
            }}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: 'var(--cyan)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            Preview Form
          </button>
          <button
            onClick={() => onViewResponses?.()}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: 'var(--purple)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            View Responses
          </button>
        </div>
      </div>
    </div>
  );
}
