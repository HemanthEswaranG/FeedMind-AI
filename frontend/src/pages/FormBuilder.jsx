import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/apiClient';
import ShareLinkModal from '../components/ShareLinkModal';

const qTypes = ['Short Text', 'Long Text', 'Multiple Choice', 'Checkbox', 'Rating', 'NPS', 'Dropdown', 'Date'];
const OTHER_OPTION_LABEL = 'Others';

const createQuestionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};

function TypeGlyph({ type }) {
  if (type === 'Short Text') return <span className="q-type-glyph q-type-glyph--text">T</span>;
  if (type === 'Long Text') {
    return (
      <span className="q-type-glyph q-type-glyph--long" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      </span>
    );
  }
  if (type === 'Multiple Choice') return <span className="q-type-glyph q-type-glyph--radio" aria-hidden />;
  if (type === 'Checkbox') return <span className="q-type-glyph q-type-glyph--check" aria-hidden />;
  if (type === 'Rating') {
    return (
      <span className="q-type-glyph q-type-glyph--star" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
        </svg>
      </span>
    );
  }
  if (type === 'NPS') return <span className="q-type-glyph q-type-glyph--nps">N</span>;
  if (type === 'Dropdown') {
    return (
      <span className="q-type-glyph q-type-glyph--caret" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    );
  }
  if (type === 'Date') {
    return (
      <span className="q-type-glyph q-type-glyph--date" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </span>
    );
  }
  return <span className="q-type-glyph">?</span>;
}

function IconDragHandle() {
  return (
    <svg className="q-drag-svg" width="14" height="18" viewBox="0 0 14 18" fill="none" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        return <circle key={i} cx={3 + col * 5} cy={3 + row * 5} r="1.5" fill="currentColor" />;
      })}
    </svg>
  );
}

function IconChevronDown({ open = false }) {
  return (
    <svg className={`q-chevron${open ? ' q-chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QuestionTypePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return undefined;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const panelWidth = Math.max(r.width, 220);
      let left = r.left;
      if (left + panelWidth > vw - 8) left = Math.max(8, vw - panelWidth - 8);
      setMenuStyle({
        position: 'fixed',
        top: `${r.bottom + 4}px`,
        left: `${left}px`,
        width: `${panelWidth}px`,
        zIndex: 10050,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`q-type-select-wrap q-type-trigger${open ? ' q-type-select-wrap--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Question type"
      >
        <TypeGlyph type={value} />
        <span className="q-type-label">{value}</span>
        <IconChevronDown open={open} />
      </button>
      {open
        && createPortal(
          <div
            ref={menuRef}
            className="q-type-dropdown-panel"
            style={menuStyle}
            role="listbox"
          >
            {qTypes.map((t) => (
              <button
                key={t}
                type="button"
                role="option"
                aria-selected={t === value}
                className={`q-type-dropdown-item${t === value ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
              >
                {t}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

function IconDuplicate() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const typeHints = {
  'Short Text': 'Collect one-line responses from users.',
  'Long Text': 'Allow detailed feedback in paragraph form.',
  'Multiple Choice': 'Users can select one option from the list.',
  Checkbox: 'Users can select multiple options.',
  Rating: 'Capture sentiment on a scale.',
  NPS: 'Measure recommendation intent.',
  Dropdown: 'Compact list selection.',
  Date: 'Capture a specific date from users.'
};

function QuestionCard({ question, index, onDelete, onDuplicate, onCycleType, onUpdate }) {
  const isChoice = ['Multiple Choice', 'Checkbox', 'Dropdown'].includes(question.type);
  const isRadioStyle = question.type === 'Multiple Choice' || question.type === 'Dropdown';
  const [toggled, setToggled] = useState(Boolean(question.required));
  const [newOption, setNewOption] = useState('');

  const addOption = () => {
    if (!newOption.trim()) return;
    const updated = { ...question, options: [...(question.options || []), newOption] };
    onUpdate(question.id, updated);
    setNewOption('');
  };

  const removeOption = (idx) => {
    const updated = { ...question, options: question.options.filter((_, i) => i !== idx) };
    onUpdate(question.id, updated);
  };

  const updateOption = (idx, value) => {
    const opts = [...question.options];
    opts[idx] = value;
    onUpdate(question.id, { ...question, options: opts });
  };

  const addOthers = () => {
    if (question.allowOther) return;
    onUpdate(question.id, { ...question, allowOther: true });
  };

  return (
    <div className="question-card">
      <div className="q-card-content">
        <div className="q-toolbar">
          <div className="q-toolbar-left">
            <span className="q-drag-handle" title="Drag to reorder">
              <IconDragHandle />
            </span>
            <QuestionTypePicker
              value={question.type}
              onChange={(t) => onCycleType(question.id, t)}
            />
            {isChoice && (
              <button type="button" className="q-add-others" onClick={addOthers}>
                + Add Others
              </button>
            )}
          </div>

          <div className="q-toolbar-right">
            <div className="q-required">
              <span className="q-required-label">Required</span>
              <button
                type="button"
                className={`q-toggle${toggled ? ' q-toggle--on' : ''}`}
                onClick={() => {
                  const next = !toggled;
                  setToggled(next);
                  onUpdate(question.id, { ...question, required: next });
                }}
                aria-pressed={toggled}
                aria-label="Required"
              />
            </div>
            <span className="q-toolbar-divider" aria-hidden />
            <div className="q-actions">
              <button type="button" className="q-action-btn" title="Duplicate" onClick={() => onDuplicate(question.id)}>
                <IconDuplicate />
              </button>
              <button type="button" className="q-action-btn" title="Delete" onClick={() => onDelete(question.id)}>
                <IconTrash />
              </button>
            </div>
          </div>
        </div>

        <div className="q-body">
          <span className="q-num">{index + 1}.</span>
          <input
            className="q-input"
            value={question.text}
            onChange={(e) => onUpdate(question.id, { ...question, text: e.target.value })}
            placeholder="Write a question..."
          />
        </div>

        {isChoice && (
          <div className="q-options-section">
            {(question.options || []).map((opt, idx) => (
              <div key={idx} className="q-option-item">
                <div className={isRadioStyle ? 'q-option-mark q-option-mark--radio' : 'q-option-mark q-option-mark--check'} />
                <input
                  className="q-option-input"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                />
                <button type="button" className="q-option-remove" onClick={() => removeOption(idx)} title="Remove option">
                  ×
                </button>
              </div>
            ))}
            <div className={`q-option-add${(question.options || []).length === 0 ? ' q-option-add--full' : ''}`}>
              <div className={isRadioStyle ? 'q-option-mark q-option-mark--radio' : 'q-option-mark q-option-mark--check'} />
              <input
                className="q-option-input"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addOption()}
                onBlur={addOption}
                placeholder="Add option..."
              />
            </div>
            {question.allowOther && (
              <div className="q-option-item q-option-item--locked">
                <div className={isRadioStyle ? 'q-option-mark q-option-mark--radio' : 'q-option-mark q-option-mark--check'} />
                <input
                  className="q-option-input q-option-input--locked"
                  value={OTHER_OPTION_LABEL}
                  readOnly
                  aria-label="Others option"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FormBuilder({ onBack, formId = null }) {
  const [questions, setQuestions] = useState([
    { id: 1, num: 1, type: 'Short Text', text: '', options: [], required: false },
    { id: 2, num: 2, type: 'Multiple Choice', text: '', options: [''], required: false }
  ]);
  const [counter, setCounter] = useState(2);
  const [activePanel, setActivePanel] = useState('ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiQuestionType, setAiQuestionType] = useState('Multiple Choice');
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [formTitle, setFormTitle] = useState('Untitled form');
  const [formDescription, setFormDescription] = useState('');
  const [formId_state, setFormId] = useState(formId);
  const [shareLink, setShareLink] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [publishedForm, setPublishedForm] = useState(null);

  const addQuestion = (type = 'Short Text', text = '', options = []) => {
    const num = counter + 1;
    setCounter(num);
    setQuestions(prev => [...prev, { id: createQuestionId(), num, type, text, options }]);
  };

  const deleteQuestion = (id) => setQuestions((prev) => prev.filter((q) => String(q.id) !== String(id)));

  const duplicateQuestion = (id) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => String(q.id) === String(id));
      if (idx < 0) return prev;
      const q = prev[idx];
      const copy = {
        ...q,
        id: createQuestionId(),
        options: Array.isArray(q.options) ? [...q.options] : [],
        allowOther: !!q.allowOther,
      };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  };

  const cycleType = (id, newType) => {
    setQuestions(prev => prev.map(q =>
      String(q.id) === String(id)
        ? {
            ...q,
            type: newType,
            allowOther: ['Multiple Choice', 'Checkbox', 'Dropdown'].includes(newType) ? !!q.allowOther : false,
          }
        : q
    ));
  };

  const updateQuestion = (id, updates) => {
    setQuestions(prev => prev.map(q =>
      String(q.id) === String(id) ? { ...q, ...updates } : q
    ));
  };

  const sendAIPrompt = async () => {
    const txt = aiPrompt.trim();
    if (!txt) return;

    const typeHints = {
      'Short Text': 'short answer',
      'Long Text': 'long answer',
      'Multiple Choice': 'mcq',
      'Checkbox': 'checkbox',
      Rating: 'rating scale',
      NPS: 'nps scale',
      Dropdown: 'dropdown',
      Date: 'date',
    };
    const safeCount = Math.min(25, Math.max(1, Number(aiQuestionCount) || 5));
    const typeHint = typeHints[aiQuestionType] || aiQuestionType;

    setGeneratingQuestions(true);
    try {
      const { data } = await apiClient.post('/ai/generate-questions', {
        selectedSuggestion: txt,
        requestedCount: safeCount,
        requestedType: typeHint,
      });

      if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach((q) => {
          const normalizedFieldType = String(q.fieldType || '').trim().toLowerCase();
          const fieldTypeMap = {
            'text': 'Short Text',
            'number': 'Short Text',
            'date': 'Date',
            'dropdown': 'Dropdown',
            'multiple choice': 'Multiple Choice',
            'multiple_choice': 'Multiple Choice',
            'multiple-choice': 'Multiple Choice',
            'checkbox': 'Checkbox',
            'checkboxes': 'Checkbox',
          };
          const formType = fieldTypeMap[normalizedFieldType] || 'Short Text';
          const finalType = aiQuestionType || formType;
          const label = q.label || q;
          const isChoiceType = ['Dropdown', 'Multiple Choice', 'Checkbox'].includes(finalType);
          const aiOptions = Array.isArray(q.options)
            ? q.options.map((opt) => String(opt).trim()).filter(Boolean)
            : [];
          addQuestion(finalType, label, isChoiceType ? aiOptions : []);
        });
        setAiPrompt('');
      }
    } catch (err) {
      console.error('Question generation failed:', err);

      const errorCode = err.response?.data?.code;
      const errorMsg = err.response?.data?.error;

      if (errorCode === 'NO_TRAINED_DATA' || errorCode === 'INSUFFICIENT_DATA' || errorCode === 'NO_RELEVANCE' || errorCode === 'NO_QUESTIONS_GENERATED') {
        const message = errorMsg || 'There is no information about the given topic in the prompt. It requires more information.';
        alert(`${message}\n\nPlease go to the Data Upload page to train more relevant data.`);
      } else {
        alert(errorMsg || 'Failed to generate questions. Please check your training data and try again.');
      }
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const saveForm = async () => {
    setSaving(true);
    try {
      // Format questions for API - remove 'num' field and ensure proper structure
      const formattedQuestions = questions.map((q, idx) => ({
        id: String(q.id),
        type: q.type,
        text: q.text || '',
        required: q.required || false,
        options: q.options || [],
        allowOther: !!q.allowOther,
        order: idx,
      }));

      const formData = {
        title: formTitle || 'Untitled form',
        description: formDescription,
        questions: formattedQuestions,
        status: 'draft',
        settings: {
          multipleResponses: true,
          collectEmail: 'none',
          showProgressBar: true,
          shuffleQuestions: false,
          restrictExtension: true,
          emailOnSubmission: true,
          slackWebhook: false,
          thankYouMessage: 'Thank you for your feedback! We really appreciate it.',
          redirectUrl: ''
        }
      };

      console.log('Saving form:', formData);

      if (formId_state) {
        // Update existing form
        const response = await apiClient.put(`/forms/${formId_state}`, formData);
        console.log('Update response:', response.data);
        alert('Form saved to drafts!');
      } else {
        // Create new form
        const response = await apiClient.post('/forms', formData);
        console.log('Create response:', response.data);
        setFormId(response.data.form._id);
        alert('Form saved to drafts!');
      }
    } catch (err) {
      console.error('Save failed - Full error:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save form. Please try again.';
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const publishForm = async () => {
    if (!formId_state) {
      alert('Please save the form first before publishing');
      return;
    }

    setPublishing(true);
    try {
      const { data } = await apiClient.patch(`/forms/${formId_state}/publish`);
      setIsPublished(true);
      setShareLink(data.form.shareLink);
      setPublishedForm(data.form);
      setShowShareModal(true);
    } catch (err) {
      console.error('Publish failed:', err);
      alert('Failed to publish form. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const [s1, setS1] = useState(true);
  const [s2, setS2] = useState(true);
  const [s3, setS3] = useState(false);
  const [s4, setS4] = useState(true);
  const [s5, setS5] = useState(true);
  const [s6, setS6] = useState(false);
  const [loadingForm, setLoadingForm] = useState(Boolean(formId));

  useEffect(() => {
    if (!formId) {
      setLoadingForm(false);
      return;
    }
    let cancelled = false;
    setLoadingForm(true);
    apiClient
      .get(`/forms/${formId}`)
      .then(({ data }) => {
        if (cancelled || !data?.form) return;
        const f = data.form;
        setFormTitle(f.title || 'Untitled form');
        setFormDescription(f.description || '');
        setFormId(f._id);
        setShareLink(f.shareLink || null);
        setIsPublished(f.status === 'published');
        const qs = (f.questions || []).map((q, i) => ({
          id: q.id || `q-${i}`,
          num: i + 1,
          type: q.type || 'Short Text',
          text: q.text || '',
          options: (q.options || []).filter((opt) => String(opt).trim().toLowerCase() !== OTHER_OPTION_LABEL.toLowerCase()),
          allowOther: !!q.allowOther || (q.options || []).some((opt) => String(opt).trim().toLowerCase() === OTHER_OPTION_LABEL.toLowerCase()),
          required: !!q.required,
        }));
        if (qs.length) {
          setQuestions(qs);
          setCounter(qs.length);
        } else {
          const id = createQuestionId();
          setQuestions([{ id, num: 1, type: 'Short Text', text: '', options: [], required: false }]);
          setCounter(1);
        }
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to load form.');
      })
      .finally(() => {
        if (!cancelled) setLoadingForm(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const handleViewResponses = () => {
    setShowShareModal(false);
    // Close builder and navigate to responses page
    onBack();
    // Trigger navigation after returning to main app
    setTimeout(() => {
      window.location.hash = '#responses';
      window.location.reload();
    }, 100);
  };

  if (loadingForm) {
    return (
      <div className="builder-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="forms-loading-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className="builder-wrapper">
      <div className="builder-header">
        <button className="builder-back" onClick={onBack}>&larr; My Forms</button>
        <input className="form-title-input" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
        <div className="builder-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={saveForm} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button className="btn btn-primary btn-sm" onClick={publishForm} disabled={publishing || !formId_state}>{publishing ? 'Publishing...' : 'Publish'}</button>
        </div>
      </div>

      <div className="builder-layout" style={{ height: 'calc(100vh - 56px)' }}>
        <div className="builder-canvas">
          <div className="builder-canvas-inner">
            <input className="builder-page-title" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Form title" />
            <input className="builder-page-desc" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Add a description (optional)..." />

            {questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={idx}
                onDelete={deleteQuestion}
                onDuplicate={duplicateQuestion}
                onCycleType={cycleType}
                onUpdate={updateQuestion}
              />
            ))}

            <div className="builder-add-wrap">
              <button className="add-q-btn" onClick={() => addQuestion()}>+ Add Question</button>
            </div>
          </div>
        </div>

        <div className="builder-panel">
          <div className="panel-headings">
            <button className={`panel-heading${activePanel === 'settings' ? ' active' : ''}`} onClick={() => setActivePanel('settings')}>
              <span className="panel-heading-icon">âœ¦</span>
              <span className="panel-heading-text">Form Settings</span>
            </button>
            <button className={`panel-heading${activePanel === 'ai' ? ' active' : ''}`} onClick={() => setActivePanel('ai')}>
              <span className="panel-heading-icon">âœ¦</span>
              <span className="panel-heading-text">AI Suggestion</span>
            </button>
          </div>

          {activePanel === 'settings' && (
            <div className="panel-body">
              <div className="setting-section">
                <div className="setting-label">Respondents</div>
                <div className="setting-row"><span className="setting-name">Multiple responses</span><div className={`toggle${s1 ? ' on' : ''}`} onClick={() => setS1(!s1)}></div></div>
                <div className="setting-row">
                  <span className="setting-name">Collect email</span>
                  <select className="setting-select"><option>Do not collect</option><option>Optional</option><option>Required</option></select>
                </div>
                <div className="setting-row"><span className="setting-name">Show progress bar</span><div className={`toggle${s2 ? ' on' : ''}`} onClick={() => setS2(!s2)}></div></div>
                <div className="setting-row"><span className="setting-name">Shuffle questions</span><div className={`toggle${s3 ? ' on' : ''}`} onClick={() => setS3(!s3)}></div></div>
              </div>
              <div className="setting-section">
                <div className="setting-label">Integrity and Spam</div>
                <div className="setting-row"><span className="setting-name">Restrict extension</span><div className={`toggle${s4 ? ' on' : ''}`} onClick={() => setS4(!s4)}></div></div>
              </div>
              <div className="setting-section">
                <div className="setting-label">Notifications</div>
                <div className="setting-row"><span className="setting-name">Email on submission</span><div className={`toggle${s5 ? ' on' : ''}`} onClick={() => setS5(!s5)}></div></div>
                <div className="setting-row"><span className="setting-name">Slack webhook</span><div className={`toggle${s6 ? ' on' : ''}`} onClick={() => setS6(!s6)}></div></div>
              </div>
              <div className="setting-section">
                <div className="setting-label">Appearance</div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>Thank you message</div>
                <textarea className="setting-textarea" defaultValue="Thank you for your feedback! We really appreciate it."></textarea>
                <div style={{ fontSize: 13, marginTop: 12, marginBottom: 4 }}>Redirect URL</div>
                <input className="setting-input" placeholder="https://yoursite.com/thanks" />
              </div>
            </div>
          )}

          {activePanel === 'ai' && (
            <div className="panel-body panel-body--ai">
              <div className="ai-panel">
                <div className="ai-bubble">Hi! I can help you generate questions based on your training data. Tell me what you need.</div>
                <div className="provider-row">
                  <div className="provider-label">Question Type</div>
                  <div className="ai-controls-row">
                    <select
                      className="setting-select ai-type-select"
                      value={aiQuestionType}
                      onChange={(e) => setAiQuestionType(e.target.value)}
                      disabled={generatingQuestions}
                    >
                      {qTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <input
                      className="setting-input ai-count-input"
                      type="number"
                      min="1"
                      max="25"
                      value={aiQuestionCount}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isFinite(next)) {
                          setAiQuestionCount('');
                          return;
                        }
                        setAiQuestionCount(Math.min(25, Math.max(1, next)));
                      }}
                      disabled={generatingQuestions}
                      aria-label="Number of questions"
                    />
                  </div>
                </div>
                <div className="ai-input-row">
                  <input
                    className="ai-input"
                    placeholder="e.g. Customer satisfaction, product quality feedback"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendAIPrompt()}
                    disabled={generatingQuestions}
                  />
                  <button
                    className="ai-send"
                    onClick={sendAIPrompt}
                    disabled={generatingQuestions}
                    style={{ opacity: generatingQuestions ? 0.6 : 1, cursor: generatingQuestions ? 'not-allowed' : 'pointer' }}
                  >
                    {generatingQuestions ? 'â³' : 'âž¤'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showShareModal && publishedForm && (
        <ShareLinkModal form={publishedForm} onClose={() => setShowShareModal(false)} onViewResponses={handleViewResponses} />
      )}
    </div>
  );
}


