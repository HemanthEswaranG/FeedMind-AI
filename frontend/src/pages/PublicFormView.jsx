import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const OTHER_OPTION_LABEL = 'Others';
const OTHER_OPTION_VALUE = '__other__';

const isOthersOption = (value) => String(value || '').trim().toLowerCase() === OTHER_OPTION_LABEL.toLowerCase();

const hasOtherOption = (question) => {
  if (!question) return false;
  return !!question.allowOther || (question.options || []).some((opt) => isOthersOption(opt));
};

const getChoiceOptions = (question) => {
  const baseOptions = (question.options || []).filter((opt) => !isOthersOption(opt));
  if (hasOtherOption(question)) baseOptions.push(OTHER_OPTION_LABEL);
  return baseOptions;
};

export default function PublicFormView({ shareLink, onFormNotFound }) {
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otherAnswers, setOtherAnswers] = useState({});

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await apiClient.get(`/forms/share/${shareLink}`);
        if (res.data?.form) {
          setForm(res.data.form);
          const initialAnswers = {};
          res.data.form.questions.forEach(q => {
            initialAnswers[q.id] = q.type === 'Checkbox' ? [] : '';
          });
          setAnswers(initialAnswers);
        }
      } catch (err) {
        console.error('Failed to load form:', err);
        setError('Form not found or has expired');
        onFormNotFound?.();
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [shareLink]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleOtherAnswerChange = (questionId, value) => {
    setOtherAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSingleChoiceSelect = (question, value) => {
    if (value === OTHER_OPTION_VALUE) {
      handleAnswerChange(question.id, OTHER_OPTION_VALUE);
      return;
    }
    handleAnswerChange(question.id, value);
    setOtherAnswers((prev) => ({ ...prev, [question.id]: '' }));
  };

  const handleCheckboxToggle = (question, value) => {
    const currentValues = Array.isArray(answers[question.id]) ? answers[question.id] : [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    handleAnswerChange(question.id, nextValues);
    if (value !== OTHER_OPTION_VALUE || nextValues.includes(OTHER_OPTION_VALUE)) return;
    setOtherAnswers((prev) => ({ ...prev, [question.id]: '' }));
  };

  const formatAnswerForSubmit = (question) => {
    const rawAnswer = answers[question.id];
    const otherText = (otherAnswers[question.id] || '').trim();
    if (!hasOtherOption(question)) return rawAnswer || (question.type === 'Checkbox' ? [] : '');
    if (question.type === 'Checkbox') {
      const values = Array.isArray(rawAnswer) ? rawAnswer : [];
      return values.map((item) => {
        if (item !== OTHER_OPTION_VALUE) return item;
        return otherText ? `Other: ${otherText}` : OTHER_OPTION_LABEL;
      });
    }
    if (rawAnswer === OTHER_OPTION_VALUE) return otherText ? `Other: ${otherText}` : OTHER_OPTION_LABEL;
    return rawAnswer || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (form.settings?.collectEmail === 'required' && !email) {
        setError('Email is required');
        setSubmitting(false);
        return;
      }
      const formattedAnswers = form.questions.map(q => ({
        questionId: q.id,
        questionText: q.text,
        answer: formatAnswerForSubmit(q),
        type: q.type
      }));
      const res = await apiClient.post('/responses/submit', {
        formId: form._id,
        answers: formattedAnswers,
        name: name || undefined,
        email: email || undefined,
        device: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
        completionTime: 0,
        completionRate: 100
      });
      if (res.data?.success) setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="public-form-page">
      <div className="pf-bg-glow pf-glow-1" />
      <div className="pf-loader-wrap">
        <div className="pf-loader-ring" />
        <div className="pf-loader-text">Loading secure form...</div>
      </div>
    </div>
  );

  if (!form || error === 'Form not found or has expired') return (
    <div className="public-form-page">
      <div className="pf-error-card">
        <div className="pf-error-icon">𐄂</div>
        <h2 className="pf-error-title">Form Unavailable</h2>
        <p className="pf-error-msg">{error || 'This form does not exist or has been disabled.'}</p>
        <button className="pf-action-btn secondary" onClick={() => window.location.href = '/'}>Go Home</button>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="public-form-page">
      <div className="pf-success-wrap">
        <div className="pf-success-icon">✓</div>
        <h2 className="pf-success-title">Submission Successful</h2>
        <p className="pf-success-msg">{form.settings?.thankYouMessage || 'Thank you for your feedback!'}</p>
        <div className="pf-success-actions">
          {form.settings?.redirectUrl && <button onClick={() => window.location.href = form.settings.redirectUrl} className="pf-action-btn primary">Return to Site</button>}
          <button onClick={() => window.location.reload()} className="pf-action-btn secondary">Submit Another</button>
        </div>
      </div>
    </div>
  );

  const isEmailRequired = form?.settings?.collectEmail === 'required';
  const isEmailOptional = form?.settings?.collectEmail === 'optional';

  return (
    <div className="public-form-page pf-grid-mode">
      <div className="pf-bg-glow pf-glow-1" />
      <div className="pf-bg-glow pf-glow-2" />

      <div className="pf-container">
        <aside className="pf-sidebar">
          <div className="pf-brand">
            <span className="pf-brand-dot" />
            <span className="pf-brand-name">FeedMind AI</span>
          </div>
          
          <div className="pf-form-summary">
            <h1 className="pf-form-title">{form.title}</h1>
            {form.description && <p className="pf-form-desc">{form.description}</p>}
          </div>

          <div className="pf-respondent-box">
            <div className="pf-box-label">Your Information</div>
            <div className="pf-input-field">
              <label>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Type name..." />
            </div>
            <div className="pf-input-field">
              <label>Email Address {isEmailRequired && '*'}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Type email..." />
            </div>
          </div>

          <div className="pf-form-meta">
            <div className="pf-meta-pill">Questions: {form.questions.length}</div>
            <div className="pf-meta-pill">Secure Connection</div>
          </div>
        </aside>

        <main className="pf-questions-list">
          <form onSubmit={handleSubmit}>
            {form.questions.map((q, qIdx) => (
              <div key={q.id} className="pf-list-question">
                <div className="pf-q-head">
                  <span className="pf-q-num">Q{qIdx + 1}</span>
                  <div className="pf-q-type-pills">
                    <span className="pf-q-type-pill">{q.type}</span>
                    {q.required && <span className="pf-q-req-pill">Required</span>}
                  </div>
                </div>
                <h2 className="pf-q-title">{q.text}</h2>
                
                <div className="pf-q-input-wrap">
                  {q.type === 'Short Text' && (
                    <input className="pf-text-input" type="text" value={answers[q.id] || ''} onChange={(e) => handleAnswerChange(q.id, e.target.value)} placeholder="Enter answer..." />
                  )}
                  {q.type === 'Long Text' && (
                    <textarea className="pf-textarea" value={answers[q.id] || ''} onChange={(e) => handleAnswerChange(q.id, e.target.value)} placeholder="Enter detailed answer..." rows="3" />
                  )}
                  {q.type === 'Rating' && (
                    <div className="pf-rating-container">
                      {[1, 2, 3, 4, 5].map(v => <button key={v} type="button" className={`pf-rating-option${answers[q.id] === v.toString() ? ' active' : ''}`} onClick={() => handleAnswerChange(q.id, v.toString())}>{v}</button>)}
                    </div>
                  )}
                  {q.type === 'NPS' && (
                    <div className="pf-nps-container">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => <button key={v} type="button" className={`pf-nps-option${answers[q.id] === v.toString() ? ' active' : ''}`} onClick={() => handleAnswerChange(q.id, v.toString())}>{v}</button>)}
                    </div>
                  )}
                  {(q.type === 'Multiple Choice' || q.type === 'Checkbox') && (
                    <div className="pf-choice-list">
                      {getChoiceOptions(q).map((opt, idx) => {
                        const val = opt === OTHER_OPTION_LABEL ? OTHER_OPTION_VALUE : opt;
                        const sel = q.type === 'Checkbox' ? (answers[q.id] || []).includes(val) : answers[q.id] === val;
                        return (
                          <button key={idx} type="button" className={`pf-choice-option${sel ? ' active' : ''}`} onClick={() => q.type === 'Checkbox' ? handleCheckboxToggle(q, val) : handleSingleChoiceSelect(q, val)}>
                            <div className={`pf-choice-mark ${q.type === 'Checkbox' ? 'square' : 'circle'}`}>{sel && <div className="pf-choice-inner" />}</div>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                      {hasOtherOption(q) && (q.type === 'Checkbox' ? (answers[q.id] || []).includes(OTHER_OPTION_VALUE) : answers[q.id] === OTHER_OPTION_VALUE) && (
                        <input className="pf-text-input small" type="text" value={otherAnswers[q.id] || ''} onChange={(e) => handleOtherAnswerChange(q.id, e.target.value)} placeholder="Specify other..." />
                      )}
                    </div>
                  )}
                  {q.type === 'Dropdown' && (
                    <select className="pf-select" value={answers[q.id] || ''} onChange={(e) => handleSingleChoiceSelect(q, e.target.value)}>
                      <option value="" disabled>Select option...</option>
                      {getChoiceOptions(q).map((opt, idx) => <option key={idx} value={opt === OTHER_OPTION_LABEL ? OTHER_OPTION_VALUE : opt}>{opt}</option>)}
                    </select>
                  )}
                </div>
              </div>
            ))}
            
            {error && <div className="pf-form-error">{error}</div>}
            
            <footer className="pf-list-footer">
              <button type="submit" className="pf-submit-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Send Feedback'}
              </button>
            </footer>
          </form>
        </main>
      </div>
    </div>
  );
}
