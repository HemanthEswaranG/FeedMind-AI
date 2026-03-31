import { useState } from 'react';

const qTypes = ['Short Text', 'Long Text', 'Multiple Choice', 'Checkbox', 'Rating', 'NPS', 'Dropdown', 'Date'];
const typeIcons = { 'Short Text': 'T', 'Long Text': '¶', 'Multiple Choice': '◎', 'Checkbox': '☑', 'Rating': '★', 'NPS': '📊', 'Dropdown': '▾', 'Date': '📅' };
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
                  ✕
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

export default function FormBuilder({ onBack }) {
  const [questions, setQuestions] = useState([
    { id: 1, num: 1, type: 'Short Text', text: '', options: [], required: false },
    { id: 2, num: 2, type: 'Multiple Choice', text: '', options: [''], required: false }
  ]);
  const [counter, setCounter] = useState(2);
  const [activePanel, setActivePanel] = useState('ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [formTitle, setFormTitle] = useState('Untitled form');
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

  const sendAIPrompt = () => {
    const txt = aiPrompt.trim();
    if (!txt) return;
    addQuestion('Short Text', txt + '?');
    setAiPrompt('');
  };

  const [s1, setS1] = useState(true);
  const [s2, setS2] = useState(true);
  const [s3, setS3] = useState(false);
  const [s4, setS4] = useState(true);
  const [s5, setS5] = useState(true);
  const [s6, setS6] = useState(false);

  return (
    <div className="builder-wrapper">
      <div className="builder-header">
        <button className="builder-back" onClick={onBack}>&larr; Dashboard</button>
        <input className="form-title-input" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
        <div className="builder-header-actions">
          <button className="btn btn-ghost btn-sm">Save</button>
          <button className="btn btn-primary btn-sm">Publish</button>
        </div>
      </div>

      <div className="builder-layout" style={{ height: 'calc(100vh - 56px)' }}>
        <div className="builder-canvas">
          <div className="builder-canvas-inner">
            <input className="builder-page-title" defaultValue="Untitled form" />
            <input className="builder-page-desc" placeholder="Add a description (optional)..." />

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
              <span className="panel-heading-icon">✦</span>
              <span className="panel-heading-text">Form Settings</span>
            </button>
            <button className={`panel-heading${activePanel === 'ai' ? ' active' : ''}`} onClick={() => setActivePanel('ai')}>
              <span className="panel-heading-icon">✦</span>
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
                <div className="ai-bubble">Hi! I can help you generate questions. What is your survey about?</div>
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
                  <input className="ai-input" placeholder="e.g. Add a question about pricing." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendAIPrompt()} />
                  <button className="ai-send" onClick={sendAIPrompt}>➤</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
