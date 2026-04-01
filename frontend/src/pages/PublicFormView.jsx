import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export default function PublicFormView({ shareLink, onFormNotFound }) {
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await apiClient.get(`/forms/share/${shareLink}`);
        if (res.data?.form) {
          setForm(res.data.form);
          // Initialize answers object
          const initialAnswers = {};
          res.data.form.questions.forEach(q => {
            initialAnswers[q.id] = '';
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
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
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
        answer: answers[q.id] || '',
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

  const currentQuestion = form?.questions[currentQuestionIndex];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}>
        <div style={{ color: '#fff', fontSize: 18 }}>Loading form...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Form Not Found</div>
          <div style={{ color: '#aaa' }}>This form has expired or is no longer available</div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}>
        <div style={{ textAlign: 'center', maxWidth: 500, padding: '40px 30px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>✓</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Thank You!</div>
          <div style={{ color: '#ccc', lineHeight: 1.6 }}>
            {form.settings?.thankYouMessage || 'Thank you for your feedback! We really appreciate it.'}
          </div>
          {form.settings?.redirectUrl && (
            <button
              onClick={() => window.location.href = form.settings.redirectUrl}
              style={{ marginTop: 20, padding: '12px 24px', background: '#7c6ef5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 700, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 32, color: '#7c6ef5', marginBottom: 10 }}>📋</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: '0 0 10px 0' }}>{form.title}</h1>
          {form.description && (
            <p style={{ fontSize: 16, color: '#aaa', margin: 0 }}>{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Card */}
          {currentQuestion && (
            <div style={{ padding: 24, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#fff', fontSize: 16, fontWeight: 600 }}>
                {currentQuestion.text}
                {currentQuestion.required && <span style={{ color: '#ef4444' }}>*</span>}
              </label>

              {/* Short Text */}
              {currentQuestion.type === 'Short Text' && (
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Your answer"
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14 }}
                />
              )}

              {/* Long Text */}
              {currentQuestion.type === 'Long Text' && (
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Please provide as much detail as possible"
                  rows="5"
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                />
              )}

              {/* Rating */}
              {currentQuestion.type === 'Rating' && (
                <div style={{ display: 'flex', gap: 12 }}>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleAnswerChange(currentQuestion.id, rating.toString())}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 8,
                        border: `2px solid ${answers[currentQuestion.id] === rating.toString() ? '#7c6ef5' : 'rgba(255,255,255,0.1)'}`,
                        background: answers[currentQuestion.id] === rating.toString() ? 'rgba(124,110,245,0.2)' : 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: 20,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              )}

              {/* Star Rating */}
              {currentQuestion.type === 'NPS' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleAnswerChange(currentQuestion.id, star.toString())}
                      style={{
                        fontSize: 32,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        opacity: answers[currentQuestion.id] && parseInt(answers[currentQuestion.id]) >= star ? 1 : 0.3,
                        transition: 'all 0.2s'
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}

              {/* Multiple Choice */}
              {currentQuestion.type === 'Multiple Choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {currentQuestion.options?.map((option, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', cursor: 'pointer', border: `1px solid ${answers[currentQuestion.id] === option ? '#7c6ef5' : 'rgba(255,255,255,0.1)'}` }}>
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={option}
                        checked={answers[currentQuestion.id] === option}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ color: '#fff', fontSize: 14 }}>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Dropdown */}
              {currentQuestion.type === 'Dropdown' && (
                <select
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14 }}
                >
                  <option value="">Select an option</option>
                  {currentQuestion.options?.map((option, idx) => (
                    <option key={idx} value={option} style={{ background: '#1a1a2e' }}>{option}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Email Field (if required or optional) */}
          {(form.settings?.collectEmail === 'required' || form.settings?.collectEmail === 'optional') && (
            <div style={{ padding: 24, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <label style={{ display: 'block', marginBottom: 10, color: '#fff', fontSize: 14, fontWeight: 600 }}>
                Email {form.settings?.collectEmail === 'required' && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14 }}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              style={{
                padding: '12px 24px',
                background: currentQuestionIndex === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(124,110,245,0.2)',
                color: currentQuestionIndex === 0 ? '#666' : '#7c6ef5',
                border: '1px solid rgba(124,110,245,0.3)',
                borderRadius: 8,
                cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              ← Back
            </button>

            {currentQuestionIndex < form.questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                style={{ padding: '12px 24px', background: '#7c6ef5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: '12px 24px', background: submitting ? 'rgba(34,197,94,0.5)' : '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>

          {/* Progress */}
          <div style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>
            Question {currentQuestionIndex + 1} of {form.questions.length}
          </div>
        </form>
      </div>
    </div>
  );
}
