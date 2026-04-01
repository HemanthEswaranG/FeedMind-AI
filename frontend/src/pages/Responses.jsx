import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';

export default function Responses() {
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    spam: 0,
    flagged: 0,
    positive: 0,
    negative: 0,
  });
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const fetchResponses = async () => {
      setLoading(true);
      setError('');
      try {
        const statusQuery = activeTab === 'all' ? '' : `?status=${activeTab}`;
        const { data } = await apiClient.get(`/responses${statusQuery}`);
        const list = data?.responses || [];
        setResponses(list);
        setStats(data?.stats || {
          total: 0,
          valid: 0,
          spam: 0,
          flagged: 0,
          positive: 0,
          negative: 0,
        });

        if (list.length > 0) {
          setSelectedId((prev) => (prev && list.some((item) => item._id === prev) ? prev : list[0]._id));
        } else {
          setSelectedId('');
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load responses.');
      } finally {
        setLoading(false);
      }
    };

    fetchResponses();
  }, [activeTab]);

  const selectedResponse = useMemo(
    () => responses.find((item) => item._id === selectedId) || null,
    [responses, selectedId]
  );

  const sentiments = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
    responses.forEach((item) => {
      const key = item?.sentiment || 'unknown';
      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] += 1;
      } else {
        counts.unknown += 1;
      }
    });
    return counts;
  }, [responses]);

  const totalForSentiment = Math.max(responses.length, 1);
  const pct = {
    positive: Math.round((sentiments.positive / totalForSentiment) * 100),
    neutral: Math.round((sentiments.neutral / totalForSentiment) * 100),
    negative: Math.round((sentiments.negative / totalForSentiment) * 100),
  };

  const sentimentTone = selectedResponse?.sentiment || 'unknown';
  const sentimentScore = typeof selectedResponse?.sentimentScore === 'number'
    ? selectedResponse.sentimentScore
    : 0;

  const sentimentLabel = {
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
    unknown: 'Unknown',
  }[sentimentTone] || 'Unknown';

  const scorePercent = Math.max(0, Math.min(100, Math.round((sentimentScore + 1) * 50)));

  const answerPreview = (selectedResponse?.answers || []).slice(0, 8);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>SUBMISSIONS</div>
          <div className="page-title">Responses</div>
          <div className="page-subtitle">{stats.total} total · {stats.valid} valid · {stats.spam} spam · live sentiment insights</div>
        </div>
        <button className="btn btn-ghost btn-sm" disabled>↓ Export CSV</button>
      </div>

      <div className="resp-stats">
        {[
          { label: 'Valid', val: stats.valid, color: 'color-cyan' },
          { label: 'Spam', val: stats.spam, color: 'color-yellow' },
          { label: 'Flagged', val: stats.flagged, color: 'color-red' },
          { label: 'Positive', val: stats.positive, color: 'color-green' },
          { label: 'Negative', val: stats.negative, color: 'color-red' },
        ].map((s, i) => (
          <div className="resp-stat" key={i}>
            <div className="resp-stat-label">{s.label}</div>
            <div className={`resp-stat-val ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {[['all', 'All'], ['valid', 'Valid'], ['spam', 'Spam'], ['flagged', 'Flagged']].map(([id, label]) => (
          <button key={id} className={`forms-tab${activeTab === id ? ' active' : ''}`} style={activeTab === id ? { border: '1px solid var(--purple)' } : {}} onClick={() => setActiveTab(id)}>
            {label}
          </button>
        ))}
        <div className="search-bar"><span style={{ fontSize: 12, color: 'var(--text3)' }}>Showing {responses.length} items</span></div>
      </div>

      {error && <div className="resp-error-banner">{error}</div>}

      <div className="resp-layout">
        <div className="resp-list">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{responses.length} Responses</div>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading responses...</div>
          ) : responses.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>No responses match this filter.</div>
          ) : (
            <div className="resp-list-items">
              {responses.map((item) => {
                const isSelected = selectedId === item._id;
                return (
                  <button
                    key={item._id}
                    type="button"
                    className={`resp-list-item${isSelected ? ' active' : ''}`}
                    onClick={() => setSelectedId(item._id)}
                  >
                    <div className="resp-item-top">
                      <span className="resp-item-form">{item?.form?.title || 'Untitled Form'}</span>
                      <span className={`resp-item-sentiment ${item?.sentiment || 'unknown'}`}>{item?.sentiment || 'unknown'}</span>
                    </div>
                    <div className="resp-item-meta">
                      <span>{item?.email || 'Anonymous'}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="resp-center sentiment-center">
          {!selectedResponse ? (
            <div>Select a response to view details.</div>
          ) : (
            <>
              <div className="sentiment-hero">
                <div className="sentiment-hero-head">
                  <div>
                    <div className="sentiment-title">Response Sentiment</div>
                    <div className="sentiment-sub">{selectedResponse?.form?.title || 'Untitled Form'} · {selectedResponse?.email || 'Anonymous user'}</div>
                  </div>
                  <span className={`sentiment-pill ${sentimentTone}`}>{sentimentLabel}</span>
                </div>

                <div className="sentiment-meter-wrap">
                  <div className="sentiment-meter-track">
                    <div
                      className="sentiment-meter-fill"
                      style={{ width: `${scorePercent}%` }}
                    ></div>
                  </div>
                  <div className="sentiment-meter-labels">
                    <span>Negative</span>
                    <span>Score: {sentimentScore.toFixed(2)}</span>
                    <span>Positive</span>
                  </div>
                </div>

                <div className="sentiment-mini-grid">
                  <div className="sent-mini-card positive">
                    <div className="sent-mini-label">Positive</div>
                    <div className="sent-mini-val">{pct.positive}%</div>
                  </div>
                  <div className="sent-mini-card neutral">
                    <div className="sent-mini-label">Neutral</div>
                    <div className="sent-mini-val">{pct.neutral}%</div>
                  </div>
                  <div className="sent-mini-card negative">
                    <div className="sent-mini-label">Negative</div>
                    <div className="sent-mini-val">{pct.negative}%</div>
                  </div>
                </div>
              </div>

              <div className="resp-answer-list">
                <div className="resp-answer-title">Answer Preview</div>
                {answerPreview.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>No answers captured for this response.</div>
                ) : (
                  answerPreview.map((ans, idx) => (
                    <div className="resp-answer-item" key={`${ans.questionId}-${idx}`}>
                      <div className="resp-answer-q">{ans.questionText || `Question ${idx + 1}`}</div>
                      <div className="resp-answer-a">{Array.isArray(ans.answer) ? ans.answer.join(', ') : String(ans.answer ?? '-')}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="resp-sidebar2">
          <div className="resp-side-card">
            <div className="resp-side-title">Sentiment Breakdown</div>
            <div className="responses-bar">
              <div className="responses-bar-label"><span>Positive</span><span>{pct.positive}%</span></div>
              <div className="device-track"><div className="device-fill" style={{ width: `${pct.positive}%`, background: 'var(--green)' }}></div></div>
            </div>
            <div className="responses-bar">
              <div className="responses-bar-label"><span>Neutral</span><span>{pct.neutral}%</span></div>
              <div className="device-track"><div className="device-fill" style={{ width: `${pct.neutral}%`, background: 'var(--purple)' }}></div></div>
            </div>
            <div className="responses-bar">
              <div className="responses-bar-label"><span>Negative</span><span>{pct.negative}%</span></div>
              <div className="device-track"><div className="device-fill" style={{ width: `${pct.negative}%`, background: 'var(--red)' }}></div></div>
            </div>
          </div>
          <div className="resp-side-card">
            <div className="resp-side-title">Responses By Form</div>
            {responses.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>No forms yet.</div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{[...new Set(responses.map((r) => r?.form?.title || 'Untitled Form'))].slice(0, 4).join(', ')}</div>
            )}
          </div>
          <div className="resp-side-card">
            <div className="resp-side-title">Quick Stats</div>
            <div className="resp-side-row"><span>Total responses</span><span>{stats.total}</span></div>
            <div className="resp-side-row"><span>Integrity alerts</span><span style={{ color: 'var(--yellow)' }}>⊙ {stats.flagged + stats.spam}</span></div>
            <div className="resp-side-row"><span>Filtered view</span><span>{responses.length}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
