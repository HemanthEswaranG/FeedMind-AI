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

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function PublicFormView({ shareLink, onFormNotFound }) {
  const [form, setForm] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otherAnswers, setOtherAnswers] = useState({});

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await apiClient.get(`/forms/share/${shareLink}`);
        if (res.data?.form) {
          setForm(res.data.form);
          // Initialize answers object
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

  const questionCount = form?.questions?.length || 0;
  const currentQuestion = form?.questions?.[currentQuestionIndex];
  const progress = questionCount ? Math.round(((currentQuestionIndex + 1) / questionCount) * 100) : 0;

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
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

    if (rawAnswer === OTHER_OPTION_VALUE) {
      return otherText ? `Other: ${otherText}` : OTHER_OPTION_LABEL;
    }

    return rawAnswer || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Check if email is required
      if (form.settings?.collectEmail === 'required' && !email) {
        setError('Email is required');
        setSubmitting(false);
        return;
      }

      // Format answers for submission
      const formattedAnswers = form.questions.map(q => ({
        questionId: q.id,
        questionText: q.text,
        answer: formatAnswerForSubmit(q),
        type: q.type
      }));

      const res = await apiClient.post('/responses/submit', {
        formId: form._id,
        answers: formattedAnswers,
        email: email || undefined,
        device: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
        completionTime: 0,
        completionRate: 100
      });

      if (res.data?.success) {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const isEmailRequired = form?.settings?.collectEmail === 'required';
  const isEmailOptional = form?.settings?.collectEmail === 'optional';

  if (loading) {
    return (
      <div className="public-form-page">
        <div className="public-form-orb public-form-orb-a" />
        <div className="public-form-orb public-form-orb-b" />
        <div className="public-form-state-card">
          <div className="public-form-state-icon">✦</div>
          <div className="public-form-state-title">Loading form...</div>
          <div className="public-form-state-subtitle">Preparing your public survey experience.</div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="public-form-page">
        <div className="public-form-orb public-form-orb-a" />
        <div className="public-form-orb public-form-orb-b" />
        <div className="public-form-state-card">
          <div className="public-form-state-icon public-form-state-icon-error">!</div>
          <div className="public-form-state-title">Form not found</div>
          <div className="public-form-state-subtitle">This form has expired or is no longer available.</div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="public-form-page">
        <div className="public-form-orb public-form-orb-a" />
        <div className="public-form-orb public-form-orb-b" />
        <div className="public-form-state-card public-form-success-card">
          <div className="public-form-state-icon public-form-state-icon-success">✓</div>
          <div className="public-form-state-title">Submission received</div>
          <div className="public-form-state-subtitle">
            {form.settings?.thankYouMessage || 'Thank you for your feedback! We really appreciate it.'}
          </div>
          {form.settings?.redirectUrl && (
            <button
              onClick={() => window.location.href = form.settings.redirectUrl}
              className="public-form-primary-btn"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="public-form-page">
        <div className="public-form-orb public-form-orb-a" />
        <div className="public-form-orb public-form-orb-b" />
        <div className="public-form-state-card">
          <div className="public-form-state-icon">?</div>
          <div className="public-form-state-title">This form is empty</div>
          <div className="public-form-state-subtitle">There are no questions to answer yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-page">
      <div className="public-form-orb public-form-orb-a" />
      <div className="public-form-orb public-form-orb-b" />

      <div className="public-form-shell">
        <aside className="public-form-hero">
          <div className="public-brand-row">
            <div className="public-brand-mark">✦</div>
            <div>
              <div className="public-brand-kicker">Public form</div>
              <div className="public-brand-title">FeedMind</div>
            </div>
          </div>

          <div className="public-hero-badge">Secure public link</div>
          <h1 className="public-hero-title">{form.title}</h1>
          {form.description && <p className="public-hero-copy">{form.description}</p>}

          <div className="public-hero-stats">
            <div className="public-hero-stat">
              <div className="public-hero-stat-value">{questionCount}</div>
              <div className="public-hero-stat-label">Questions</div>
            </div>
            <div className="public-hero-stat">
              <div className="public-hero-stat-value">{isEmailRequired ? 'Required' : isEmailOptional ? 'Optional' : 'Off'}</div>
              <div className="public-hero-stat-label">Email capture</div>
            </div>
            <div className="public-hero-stat">
              <div className="public-hero-stat-value">{formatDate(form.createdAt)}</div>
              <div className="public-hero-stat-label">Created</div>
            </div>
          </div>

          <div className="public-hero-note">
            {form.settings?.multipleResponses ? 'Multiple responses are allowed on this form.' : 'This form is limited to a single response.'}
          </div>
        </aside>

        <section className="public-form-card">
          <div className="public-form-card-top">
            <div className="public-form-card-heading">
              <div className="public-form-card-kicker">Question {currentQuestionIndex + 1} of {questionCount}</div>
              <div className="public-form-progress-label">{progress}% complete</div>
            </div>
            <div className="public-progress-track" aria-hidden="true">
              <div className="public-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="public-form-body">
            <div className="public-question-card">
              <div className="public-question-meta">
                <span className="public-question-type">{currentQuestion.type}</span>
                {currentQuestion.required && <span className="public-required-pill">Required</span>}
              </div>
              <label className="public-question-text">
                {currentQuestion.text}
              </label>

              {currentQuestion.type === 'Short Text' && (
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Type your answer"
                  className="public-form-input"
                />
              )}

              {currentQuestion.type === 'Long Text' && (
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Share as much detail as you want"
                  rows="5"
                  className="public-form-textarea"
                />
              )}

              {currentQuestion.type === 'Rating' && (
                <div className="public-rating-grid">
                  {[1, 2, 3, 4, 5].map(rating => {
                    const selected = answers[currentQuestion.id] === rating.toString();
                    return (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleAnswerChange(currentQuestion.id, rating.toString())}
                        className={`public-rating-btn${selected ? ' is-selected' : ''}`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'NPS' && (
                <div className="public-star-grid">
                  {[1, 2, 3, 4, 5].map(star => {
                    const selected = answers[currentQuestion.id] && parseInt(answers[currentQuestion.id], 10) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleAnswerChange(currentQuestion.id, star.toString())}
                        className={`public-star-btn${selected ? ' is-selected' : ''}`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'Multiple Choice' && (
                <div className="public-option-list">
                  {getChoiceOptions(currentQuestion).map((option, idx) => {
                    const optionValue = option === OTHER_OPTION_LABEL ? OTHER_OPTION_VALUE : option;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSingleChoiceSelect(currentQuestion, optionValue)}
                        className={`public-option-btn${answers[currentQuestion.id] === optionValue ? ' is-selected' : ''}`}
                      >
                        <span className="public-option-dot" />
                        <span className="public-option-text">{option}</span>
                      </button>
                    );
                  })}
                  {hasOtherOption(currentQuestion) && answers[currentQuestion.id] === OTHER_OPTION_VALUE && (
                    <input
                      type="text"
                      value={otherAnswers[currentQuestion.id] || ''}
                      onChange={(e) => handleOtherAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Please specify"
                      className="public-form-input"
                    />
                  )}
                </div>
              )}

              {currentQuestion.type === 'Checkbox' && (
                <div className="public-option-list">
                  {getChoiceOptions(currentQuestion).map((option, idx) => {
                    const optionValue = option === OTHER_OPTION_LABEL ? OTHER_OPTION_VALUE : option;
                    const selectedValues = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] : [];
                    const selected = selectedValues.includes(optionValue);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCheckboxToggle(currentQuestion, optionValue)}
                        className={`public-option-btn${selected ? ' is-selected' : ''}`}
                      >
                        <span className="public-option-dot" />
                        <span className="public-option-text">{option}</span>
                      </button>
                    );
                  })}
                  {hasOtherOption(currentQuestion) && (Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] : []).includes(OTHER_OPTION_VALUE) && (
                    <input
                      type="text"
                      value={otherAnswers[currentQuestion.id] || ''}
                      onChange={(e) => handleOtherAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Please specify"
                      className="public-form-input"
                    />
                  )}
                </div>
              )}

              {currentQuestion.type === 'Dropdown' && (
                <>
                  <select
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleSingleChoiceSelect(currentQuestion, e.target.value)}
                    className="public-form-select"
                  >
                    <option value="">Select an option</option>
                    {getChoiceOptions(currentQuestion).filter((option) => option !== OTHER_OPTION_LABEL).map((option, idx) => (
                      <option key={idx} value={option}>{option}</option>
                    ))}
                    {hasOtherOption(currentQuestion) && <option value={OTHER_OPTION_VALUE}>{OTHER_OPTION_LABEL}</option>}
                  </select>
                  {hasOtherOption(currentQuestion) && answers[currentQuestion.id] === OTHER_OPTION_VALUE && (
                    <input
                      type="text"
                      value={otherAnswers[currentQuestion.id] || ''}
                      onChange={(e) => handleOtherAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Please specify"
                      className="public-form-input"
                      style={{ marginTop: 12 }}
                    />
                  )}
                </>
              )}
            </div>

            {(isEmailRequired || isEmailOptional) && (
              <div className="public-question-card public-email-card">
                <div className="public-question-meta">
                  <span className="public-question-type">Email</span>
                  {isEmailRequired && <span className="public-required-pill">Required</span>}
                </div>
                <label className="public-question-text public-question-text-sm">Where should we send updates?</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="public-form-input"
                />
              </div>
            )}

            {error && <div className="public-error-banner">{error}</div>}

            <div className="public-nav-row">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="public-nav-btn public-nav-btn-secondary"
              >
                ← Back
              </button>

              <div className="public-nav-hint">Question {currentQuestionIndex + 1} of {questionCount}</div>

              {currentQuestionIndex < questionCount - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  className="public-nav-btn public-nav-btn-primary"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="public-nav-btn public-nav-btn-submit"
                >
                  {submitting ? 'Submitting...' : 'Submit response'}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
