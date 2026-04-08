import { useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../api/apiClient';
import { generateDetailedPDF } from '../utils/pdfGenerator';

const AI_ANALYSIS_TIMEOUT_MS = Number(import.meta.env.VITE_AI_TIMEOUT_MS) || 60000;

export default function Responses() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedForm, setSelectedForm] = useState('overall');
  const [forms, setForms] = useState([{ id: 'overall', title: 'Overall' }]);
  const [openFormDropdown, setOpenFormDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responses, setResponses] = useState([]);
  const [baseResponses, setBaseResponses] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    spam: 0,
    flagged: 0,
    positive: 0,
    negative: 0,
  });
  const [selectedId, setSelectedId] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiHistory, setAiHistory] = useState([]);
  const [aiSummaryCache, setAiSummaryCache] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const formDropdownRef = useRef(null);
  const aiChatRef = useRef(null);

  const getSummaryPrompt = (formId) => {
    const formLabel = forms.find((form) => form.id === formId)?.title || 'Overall';
    return `Analyze the ${formLabel.toLowerCase()} responses and provide a comprehensive structured report with the following sections:

POSITIVE FEEDBACK:
- List 3-5 key positive points from the responses

NEGATIVE FEEDBACK:
- List 3-5 key areas that need improvement

AREAS FOR IMPROVEMENT:
- Specific suggestions to address the negative points with reasons

AI SUGGESTIONS & RECOMMENDATIONS:
- 3-5 actionable recommendations from the AI based on patterns

PRIORITIES & ACTION ITEMS:
- List top 3 priorities ranked by impact with reasoning for each

Format each section clearly with numbered points. Be concise and data-driven. Do not add intro or conclusion.`;
  };

  const loadAiSummary = async (formId = selectedForm, force = false) => {
    const cacheKey = String(formId || 'overall');
    const cachedSummary = aiSummaryCache[cacheKey];
    const isLegacyCollapsedSummary = (text) => {
      const body = String(text || '');
      return /\b\d+\s+response\(s\)\s+were\s+positive\b/i.test(body)
        && !/POSITIVE FEEDBACK:/i.test(body)
        && !/AREAS FOR IMPROVEMENT:/i.test(body);
    };

    if (!force && cachedSummary && !isLegacyCollapsedSummary(cachedSummary)) {
      setAiHistory([{ role: 'ai', text: cachedSummary }]);
      return cachedSummary;
    }

    setSummaryLoading(true);
    try {
      const res = await apiClient.post('/ai/analyze-responses', {
        formId: cacheKey === 'overall' ? undefined : cacheKey,
        question: getSummaryPrompt(cacheKey),
      }, {
        timeout: AI_ANALYSIS_TIMEOUT_MS,
      });

      const summaryText = res.data?.answer || 'Positive:\n1. None';
      setAiSummaryCache((prev) => ({ ...prev, [cacheKey]: summaryText }));
      setAiHistory([{ role: 'ai', text: summaryText }]);
      return summaryText;
    } catch (err) {
      console.error('Failed to preload AI summary:', err);
      const isTimeout = err?.code === 'ECONNABORTED';
      const backendMessage = isTimeout
        ? `request timed out after ${Math.round(AI_ANALYSIS_TIMEOUT_MS / 1000)}s`
        : (err?.response?.data?.error || err?.message);
      const fallbackText = backendMessage
        ? `AI summary is unavailable right now: ${backendMessage}`
        : 'AI summary is unavailable right now.';
      setAiHistory([{ role: 'ai', text: fallbackText }]);
      return fallbackText;
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiHistory]);

  useEffect(() => {
    setAiHistory([]);
    if (!forms.length) return;
    loadAiSummary(selectedForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForm, forms.length]);

  useEffect(() => {
    if (!isAiModalOpen) return undefined;

    const onEscape = (event) => {
      if (event.key === 'Escape') setIsAiModalOpen(false);
    };

    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [isAiModalOpen]);

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    const userMsg = aiQuery.trim();
    setAiHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiQuery('');
    setAiLoading(true);

    try {
      // Simulate/Trigger AI Analysis
      const res = await apiClient.post('/ai/analyze-responses', {
        formId: selectedForm === 'overall' ? undefined : selectedForm,
        question: userMsg
      }, {
        timeout: AI_ANALYSIS_TIMEOUT_MS,
      });
      
      setAiHistory(prev => [...prev, { role: 'ai', text: res.data?.answer || "I couldn't analyze the data at this moment." }]);
    } catch (err) {
      console.error('AI Analysis failed:', err);
      const isTimeout = err?.code === 'ECONNABORTED';
      const backendMessage = isTimeout
        ? `request timed out after ${Math.round(AI_ANALYSIS_TIMEOUT_MS / 1000)}s`
        : (err?.response?.data?.error || err?.message);
      setAiHistory(prev => [...prev, {
        role: 'ai',
        text: backendMessage
          ? `AI analysis is unavailable right now: ${backendMessage}`
          : "Sorry, I'm having trouble connecting to the analysis engine."
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      // Get summary from cache or history
      const cacheKey = String(selectedForm || 'overall');
      let summaryText = aiSummaryCache[cacheKey] || aiHistory[0]?.text;

      const hasStructuredSections = (text) => {
        const body = String(text || '').toLowerCase();
        return (
          body.includes('positive') &&
          body.includes('negative') &&
          (body.includes('improvement') || body.includes('changes')) &&
          (body.includes('suggestion') || body.includes('recommendation')) &&
          (body.includes('priorit') || body.includes('action item') || body.includes('next steps'))
        );
      };

      // If cached summary is old/incomplete, refresh once using the latest prompt template.
      if (!hasStructuredSections(summaryText)) {
        summaryText = await loadAiSummary(selectedForm, true);
      }
      
      if (!summaryText || summaryText.trim() === '') {
        console.warn('No summary text available');
        alert('No summary available to download. Please wait for the AI to generate a summary first.');
        setIsDownloading(false);
        return;
      }
      
      // Get form title
      const formTitle = forms.find((form) => form.id === selectedForm)?.title || 'Overall';
      
      console.log('Generating PDF...', { formTitle, summaryLength: summaryText.length, cacheKey });
      
      // Generate PDF
      await generateDetailedPDF(formTitle, summaryText);
      
      console.log('PDF generated and downloaded successfully');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });
      alert(`Failed to download PDF: ${error?.message || 'Unknown error'}. Please check the browser console for details.`);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formDropdownRef.current && !formDropdownRef.current.contains(event.target)) {
        setOpenFormDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const { data } = await apiClient.get('/forms');
        const formsData = data?.forms || [];
        setForms([
          { id: 'overall', title: 'Overall' },
          ...formsData.map((form) => ({ id: form._id, title: form.title || 'Untitled form' })),
        ]);
      } catch (err) {
        console.error('Failed to load response form list:', err);
      }
    };

    fetchForms();
  }, []);

  useEffect(() => {
    const fetchBaseResponses = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedForm && selectedForm !== 'overall') {
          params.set('formId', String(selectedForm));
        }
        const query = params.toString();
        const { data } = await apiClient.get(`/responses${query ? `?${query}` : ''}`);
        setBaseResponses(data?.responses || []);
      } catch (err) {
        console.error('Failed to load base responses for tab counters:', err);
        setBaseResponses([]);
      }
    };

    fetchBaseResponses();
  }, [selectedForm]);

  useEffect(() => {
    const fetchResponses = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (activeTab === 'flagged') {
          params.set('status', 'flagged');
        } else if (activeTab === 'positive' || activeTab === 'negative') {
          params.set('sentiment', activeTab);
        }

        if (selectedForm && selectedForm !== 'overall') {
          params.set('formId', String(selectedForm));
        }

        const query = params.toString();

        const { data } = await apiClient.get(`/responses${query ? `?${query}` : ''}`);
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
  }, [activeTab, selectedForm]);

  const filteredResponses = useMemo(() => {
    if (!selectedForm || selectedForm === 'overall') return responses;
    const selectedFormId = String(selectedForm);
    return responses.filter((item) => String(item?.form?._id || item?.form || '') === selectedFormId);
  }, [responses, selectedForm]);

  useEffect(() => {
    if (filteredResponses.length === 0) {
      setSelectedId('');
      return;
    }
    if (!filteredResponses.some((item) => item._id === selectedId)) {
      setSelectedId(filteredResponses[0]._id);
    }
  }, [filteredResponses, selectedId]);

  const selectedResponse = useMemo(
    () => filteredResponses.find((item) => item._id === selectedId) || null,
    [filteredResponses, selectedId]
  );

  const sentiments = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
    filteredResponses.forEach((item) => {
      const key = item?.sentiment || 'unknown';
      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] += 1;
      } else {
        counts.unknown += 1;
      }
    });
    return counts;
  }, [filteredResponses]);

  const totalForSentiment = Math.max(filteredResponses.length, 1);
  const tabStats = useMemo(() => {
    const counts = {
      total: baseResponses.length,
      positive: 0,
      negative: 0,
      flagged: 0,
    };

    baseResponses.forEach((item) => {
      if (item?.sentiment === 'positive') counts.positive += 1;
      if (item?.sentiment === 'negative') counts.negative += 1;
      if (item?.status === 'flagged') counts.flagged += 1;
    });

    return counts;
  }, [baseResponses]);

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

  const answerPreview = (selectedResponse?.answers || []);

  return (
    <div className="page">
      <div className="page-header"></div>

      <div className="fm-header-tabs resp-filter-row" style={{ marginBottom: 16 }}>
        <div className="fm-tabs-shell">
          <div className="fm-tabs" role="tablist" aria-label="Response filters">
            {[
              ['all', 'All', tabStats.total],
              ['positive', 'Positive', tabStats.positive],
              ['negative', 'Negative', tabStats.negative],
              ['flagged', 'Flagged', tabStats.flagged],
            ].map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                className={`fm-tab${activeTab === id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(id)}
                role="tab"
                aria-selected={activeTab === id}
              >
                {label}
                <span className="fm-tab-count">{count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="resp-top-actions">
          <button
            type="button"
            className="fm-bin resp-ai-launch-btn"
            onClick={async () => {
              setIsAiModalOpen(true);
              if (!aiSummaryCache[String(selectedForm || 'overall')]) {
                await loadAiSummary(selectedForm, true);
              }
            }}
          >
            <span className="resp-ai-launch-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="5" />
                <path d="M9 12h6M12 9v6" />
              </svg>
            </span>
            AI Insights
          </button>

          <div ref={formDropdownRef} className="resp-form-picker-wrap">
            <button
              type="button"
              className={`fm-bin resp-form-picker${openFormDropdown ? ' is-active' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                setOpenFormDropdown((value) => !value);
              }}
            >
              <span className="resp-form-picker-label">{forms.find((form) => form.id === selectedForm)?.title || 'Overall'}</span>
              <span style={{ marginLeft: 8, opacity: 0.7 }}>▾</span>
            </button>
            {openFormDropdown && (
              <div className="resp-form-picker-menu" onClick={(event) => event.stopPropagation()}>
                {forms.map((form) => (
                  <button
                    key={form.id}
                    type="button"
                    className={`resp-form-picker-item${selectedForm === form.id ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelectedForm(form.id);
                      setOpenFormDropdown(false);
                    }}
                  >
                    {form.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="resp-error-banner">{error}</div>}

      <div className="resp-layout">
        <div className="resp-list">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}> Responses</div>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading responses...</div>
          ) : filteredResponses.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>No responses match this filter.</div>
          ) : (
            <div className="resp-list-items">
              {filteredResponses.map((item) => {
                const isSelected = selectedId === item._id;
                const displayName = item?.email || item?.name || 'Anonymous';
                return (
                  <button
                    key={item._id}
                    type="button"
                    className={`resp-list-item${isSelected ? ' active' : ''}`}
                    onClick={() => setSelectedId(item._id)}
                  >
                    <div className="resp-item-header">
                      <span className="resp-item-form">{item?.form?.title || 'Untitled Form'}</span>
                      <span className={`resp-item-sentiment ${item?.sentiment || 'unknown'}`}>{item?.sentiment || 'unknown'}</span>
                    </div>
                    <div className="resp-item-footer">
                      <span className="resp-item-respondent">{displayName}</span>
                      <span className="resp-item-date">{new Date(item.createdAt).toLocaleDateString()}</span>
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
            <>              <div className="resp-detail-header-card">
                <div className="resp-detail-info">
                  <div className="resp-detail-name-row">
                    <span className="resp-detail-name">{selectedResponse?.name || 'Anonymous User'}</span>
                    <div className="resp-detail-badges">
                      <span className={`resp-detail-badge sentiment ${selectedResponse?.sentiment || 'unknown'}`}>
                        {selectedResponse?.sentiment || 'unknown'} {typeof selectedResponse?.sentimentScore === 'number' ? `(${selectedResponse.sentimentScore.toFixed(2)})` : ''}
                      </span>
                      <span className={`resp-detail-badge status ${selectedResponse?.status || 'valid'}`}>
                        {selectedResponse?.status || 'valid'}
                      </span>
                    </div>
                  </div>
                  <div className="resp-detail-sub-row">
                    <span className="resp-detail-email">{selectedResponse?.email || 'No email provided'}</span>
                    <div className="resp-detail-extras">
                      <span title="Completion Rate" className="resp-detail-extra">
                        <span className="extra-icon">⊙</span> {Math.round(selectedResponse?.completionRate || 100)}%
                      </span>
                      <span title="Time to complete" className="resp-detail-extra">
                        <span className="extra-icon">◷</span> {Math.floor((selectedResponse?.completionTime || 0) / 60)}m {(selectedResponse?.completionTime || 0) % 60}s
                      </span>
                      <span title="Device" className="resp-detail-extra" style={{ textTransform: 'capitalize' }}>
                        <span className="extra-icon">⎙</span> {selectedResponse?.device || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="resp-detail-meta">
                  <div className="resp-detail-time-label">Submitted On</div>
                  <div className="resp-detail-time-val">{new Date(selectedResponse?.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
              </div>

              <div className="resp-answer-list">
                <div className="resp-answer-title">Response Details</div>
                {answerPreview.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>No answers captured for this response.</div>
                ) : (
                  <div className="resp-table-container">
                    <table className="resp-answer-table">
                      <thead>
                        <tr>
                          <th>Question</th>
                          <th>Response</th>
                        </tr>
                      </thead>
                      <tbody>
                        {answerPreview.map((ans, idx) => (
                          <tr key={`${ans.questionId}-${idx}`}>
                            <td className="resp-q-cell">{ans.questionText || `Question ${idx + 1}`}</td>
                            <td className="resp-a-cell">{Array.isArray(ans.answer) ? ans.answer.join(', ') : String(ans.answer ?? '-')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
        </div>
      </div>

      {isAiModalOpen && (
        <div className="ai-modal-overlay" onClick={() => setIsAiModalOpen(false)} role="presentation">
          <div className="ai-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="AI Insight Analyst">
            <div className="ai-modal-head">
              <div className="resp-side-title ai-title ai-title-modal">
                <span className="ai-status-dot"></span>
                <span className="ai-title-text">AI Insight Analyst</span>
              </div>
              <div className="ai-modal-actions">
                <button 
                  type="button" 
                  className="ai-modal-download-btn"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading || aiHistory.length === 0}
                  title="Download summary as PDF"
                  aria-label="Download summary as PDF"
                >
                  {isDownloading ? '⟳' : '⬇'}
                </button>
                <button type="button" className="ai-modal-close" onClick={() => setIsAiModalOpen(false)} aria-label="Close AI insights popup">
                  ×
                </button>
              </div>
            </div>

            <div className="resp-ai-chat resp-ai-chat--modal" ref={aiChatRef}>
              {summaryLoading && aiHistory.length === 0 ? (
                <div className="ai-msg ai loading">
                  <div className="ai-msg-bubble">Preparing summary...</div>
                </div>
              ) : (
                aiHistory.map((msg, i) => (
                  <div key={`modal-${i}`} className={`ai-msg ${msg.role}`}>
                    <div className="ai-msg-bubble">{msg.text}</div>
                  </div>
                ))
              )}
              {aiLoading && (
                <div className="ai-msg ai loading">
                  <div className="ai-msg-bubble">Analyzing data...</div>
                </div>
              )}
            </div>

            <form onSubmit={handleAskAI} className="resp-ai-input-wrap resp-ai-input-wrap--modal">
              <input
                type="text"
                placeholder="Ask about these responses..."
                className="resp-ai-input"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                disabled={aiLoading}
              />
              <button type="submit" className="resp-ai-send" disabled={aiLoading || !aiQuery.trim()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
