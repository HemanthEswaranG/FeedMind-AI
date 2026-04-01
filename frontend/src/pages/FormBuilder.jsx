import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import ShareLinkModal from '../components/ShareLinkModal';

const qTypes = ['Short Text', 'Long Text', 'Multiple Choice', 'Checkbox', 'Rating', 'NPS', 'Dropdown', 'Date'];
const typeIcons = { 'Short Text': 'T', 'Long Text': 'Â¶', 'Multiple Choice': 'â—Ž', 'Checkbox': 'â˜‘', 'Rating': 'â˜…', 'NPS': 'ðŸ“Š', 'Dropdown': 'â–¾', 'Date': 'ðŸ“…' };
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

function QuestionCard({ question, index, onDelete, onCycleType, onUpdate }) {
  const isChoice = ['Multiple Choice', 'Checkbox', 'Dropdown'].includes(question.type);
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

  return (
    <div className="question-card" data-number={`${index + 1}.`}>
      <div className="q-card-content">
        <div className="q-toolbar">
          <div className="q-toolbar-left">
            <span className="q-drag-handle">::</span>
            <select
              value={question.type}
              onChange={(e) => onCycleType(question.id, e.target.value)}
              className="q-type-select"
            >
              {qTypes.map(t => <option key={t} value={t}>{typeIcons[t]} {t}</option>)}
            </select>
            {isChoice && <span className="q-add-others">+ Add Others</span>}
          </div>

          <div className="q-toolbar-right">
            <div className="q-required">
              Required
              <div
                className={`toggle${toggled ? ' on' : ''}`}
                onClick={() => {
                  const next = !toggled;
                  setToggled(next);
                  onUpdate(question.id, { ...question, required: next });
                }}
              ></div>
            </div>
            <div className="q-actions">
              <button className="q-action-btn" title="Duplicate">+</button>
              <button className="q-action-btn" onClick={() => onDelete(question.id)} title="Delete">x</button>
            </div>
          </div>
        </div>

        <div className="q-body">
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
                <div className="q-option-circle"></div>
                <input
                  className="q-option-input"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                />
                <button
                  className="q-option-remove"
                  onClick={() => removeOption(idx)}
                  title="Delete"
                >
                  âœ•
                </button>
              </div>
            ))}
            <div className="q-option-add">
              <div className="q-option-circle"></div>
              <input
                className="q-option-input"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addOption()}
                onBlur={addOption}
                placeholder="Add option..."
              />
            </div>
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

  const quickPrompts = [
    { key: 'NPS', label: 'Add NPS question' },
    { key: 'wait', label: 'Ask about wait time' },
    { key: 'email', label: 'Add email follow-up' },
    { key: 'more', label: 'Generate 5 more questions' }
  ];

  const addQuestion = (type = 'Short Text', text = '') => {
    const num = counter + 1;
    setCounter(num);
    setQuestions(prev => [...prev, { id: Date.now(), num, type, text, options: [] }]);
  };

  const deleteQuestion = (id) => setQuestions(prev => prev.filter(q => q.id !== id));

  const cycleType = (id, newType) => {
    setQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, type: newType } : q
    ));
  };

  const updateQuestion = (id, updates) => {
    setQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const addAIQuestion = (type) => {
    const presets = {
      NPS: { t: 'Multiple Choice', q: 'How likely are you to recommend us to a friend or colleague?' },
      wait: { t: 'Rating', q: 'How would you rate your wait time experience?' },
      email: { t: 'Short Text', q: 'What is your email address so we can follow up?' },
    };
    if (type === 'more') {
      ['How satisfied are you with our service?', 'What could we improve?', 'Would you use our product again?', 'How did you hear about us?', 'Any additional comments?']
        .forEach(q => addQuestion('Short Text', q));
      return;
    }
    const p = presets[type];
    if (p) addQuestion(p.t, p.q);
  };

  const sendAIPrompt = async () => {
    const txt = aiPrompt.trim();
    if (!txt) return;

    setGeneratingQuestions(true);
    try {
      const { data } = await apiClient.post('/ai/generate-questions', {
        selectedSuggestion: txt
      });

      if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach((q) => {
          const fieldTypeMap = {
            'text': 'Short Text',
            'number': 'Short Text',
            'date': 'Date',
            'dropdown': 'Dropdown',
          };
          const formType = fieldTypeMap[q.fieldType] || 'Short Text';
          const label = q.label || q;
          addQuestion(formType, label);
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
        alert('Failed to generate questions. Please check your training data and try again.');
      }
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const saveForm = async () => {
    setSaving(true);
    try {
      // Format questions for API - remove 'num' field and ensure proper structure
      const formattedQuestions = questions.map(q => ({
        id: String(q.id),
        type: q.type,
        text: q.text || '',
        required: q.required || false,
        options: q.options || [],
        order: q.num - 1
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
              <QuestionCard key={q.id} question={q} index={idx} onDelete={deleteQuestion} onCycleType={cycleType} onUpdate={updateQuestion} />
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
            <div className="panel-body">
              <div className="ai-panel">
                <div className="ai-bubble">Hi! I can help you generate questions based on your training data. Select data and tell me what you need.</div>
                <div className="provider-row">
                  <div className="provider-label">Provider</div>
                  <select className="setting-select" style={{ width: '100%' }}>
                    <option>Gemini</option>
                    <option>Grok</option>
                    <option>Claude</option>
                  </select>
                </div>
                <div className="quick-prompts-label">Quick Prompts</div>
                <div className="quick-prompts">
                  {quickPrompts.map((prompt) => (
                    <button key={prompt.key} className="qp-btn" onClick={() => addAIQuestion(prompt.key)}>
                      {prompt.label}
                    </button>
                  ))}
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


