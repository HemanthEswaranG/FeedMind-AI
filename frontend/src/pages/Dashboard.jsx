import { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, CartesianGrid, XAxis, YAxis, Area } from 'recharts';
import apiClient from '../api/apiClient';

const chartHeights = [10,8,12,6,9,7,11,5,8,10,6,9,7,11,8,10,12,6,9,8,10,7,11,9,8,10,6,9,7,10];

export default function Dashboard({ user, onNavigate }) {
  const [timePeriod, setTimePeriod] = useState('30d');
  const [selectedForm, setSelectedForm] = useState('overall');
  const [openTimeDropdown, setOpenTimeDropdown] = useState(false);
  const [openFormDropdown, setOpenFormDropdown] = useState(false);
  const [heatmapHover, setHeatmapHover] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState({ totalForms: 0, publishedForms: 0, draftForms: 0, totalResponses: 0, avgPerForm: 0, spamBlocked: 0 });
  const [recentForms, setRecentForms] = useState([]);
  const [sentimentBreakdown, setSentimentBreakdown] = useState({ positive: 0, neutral: 0, negative: 0, unknown: 0 });
  const [insights, setInsights] = useState([]);
  const [forms, setForms] = useState([
    { id: 'overall', name: 'Overall', icon: '📊' },
    { id: 'form1', name: 'Customer Feedback', icon: '💬' },
    { id: 'form2', name: 'Product Survey', icon: '🎯' },
    { id: 'form3', name: 'Registration Form', icon: '📋' }
  ]);
  const timeDropdownRef = useRef(null);
  const formDropdownRef = useRef(null);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  const getFormStatus = (status) => {
    if (status === 'published') return { label: 'live', color: 'var(--green)', bg: 'rgba(34,197,94,0.14)' };
    if (status === 'archived') return { label: 'deleted', color: 'var(--red)', bg: 'rgba(239,68,68,0.14)' };
    return { label: 'draft', color: 'var(--yellow)', bg: 'rgba(245,158,11,0.14)' };
  };

  const timePeriods = [
    { id: '7d', label: '7 Days' },
    { id: '15d', label: '15 Days' },
    { id: '30d', label: '30 Days' },
    { id: '60d', label: '60 Days' },
    { id: '90d', label: '90 Days' }
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target)) {
        setOpenTimeDropdown(false);
      }
      if (formDropdownRef.current && !formDropdownRef.current.contains(e.target)) {
        setOpenFormDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [timePeriod, selectedForm]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [formsRes, overviewRes] = await Promise.all([
          apiClient.get('/forms'),
          apiClient.get('/analytics/overview', {
            params: {
              period: timePeriod,
              ...(selectedForm !== 'overall' ? { formId: selectedForm } : {}),
            },
          })
        ]);

        console.log('Forms Response:', formsRes.data);
        console.log('Analytics Response:', overviewRes.data);

        if (formsRes.data?.forms) {
          const formsData = formsRes.data.forms;
          setRecentForms(formsData);
          const formsList = [
            { id: 'overall', name: 'Overall', icon: '📊' },
            ...formsData.map(f => ({ id: f._id, name: f.title, icon: '📝' }))
          ];
          setForms(formsList);
        }

        if (overviewRes.data?.data) {
          const data = overviewRes.data.data;
          console.log('Setting stats:', data);
          setStats({
            totalForms: data.forms.total,
            publishedForms: data.forms.published,
            draftForms: data.forms.drafts,
            totalResponses: data.responses.total,
            avgPerForm: data.avgPerForm,
            spamBlocked: data.responses.spam
          });
          setSentimentBreakdown({
            positive: data.sentiment?.positive || 0,
            neutral: data.sentiment?.neutral || 0,
            negative: data.sentiment?.negative || 0,
            unknown: data.sentiment?.unknown || 0,
          });
          setInsights(Array.isArray(data.insights) ? data.insights : []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };

    fetchData();
  }, []);

  const trendData = [
    { date: 'Jan 1', responses: 40, views: 60 },
    { date: 'Jan 5', responses: 55, views: 75 },
    { date: 'Jan 10', responses: 65, views: 85 },
    { date: 'Jan 15', responses: 48, views: 70 },
    { date: 'Jan 20', responses: 75, views: 95 },
    { date: 'Jan 25', responses: 88, views: 110 },
    { date: 'Jan 30', responses: 95, views: 125 }
  ];

  const sentimentTotal = Math.max(
    sentimentBreakdown.positive + sentimentBreakdown.neutral + sentimentBreakdown.negative,
    1
  );
  const sentimentPct = {
    positive: Math.round((sentimentBreakdown.positive / sentimentTotal) * 100),
    neutral: Math.round((sentimentBreakdown.neutral / sentimentTotal) * 100),
    negative: Math.round((sentimentBreakdown.negative / sentimentTotal) * 100),
  };

  const insightCards = insights.length > 0 ? insights : [{
    id: 'fallback',
    tone: 'info',
    title: 'Insights loading',
    body: 'Connect some responses to generate live dashboard insights.',
    tag: 'Waiting on data',
  }];

  return (
    <div className="page">

      <div className="section-label">OVERVIEW</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Forms</div>
          <div className="stat-icon" style={{ background: 'rgba(124,110,245,0.15)' }}>◫</div>
          <div className="stat-value">{stats.totalForms}</div>
          <div className="stat-sub color-purple">{stats.publishedForms} published · {stats.draftForms} draft</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Responses</div>
          <div className="stat-icon" style={{ background: 'rgba(0,229,201,0.15)' }}>◻</div>
          <div className="stat-value">{stats.totalResponses}</div>
          <div className="stat-sub color-cyan">across all forms</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Per Form</div>
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)' }}>↗</div>
          <div className="stat-value">{stats.avgPerForm}</div>
          <div className="stat-sub color-text2">responses per form</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spam Blocked</div>
          <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.15)' }}>🛡</div>
          <div className="stat-value">{stats.spamBlocked}</div>
          <div className="stat-sub color-green">All clear</div>
        </div>
      </div>

      
      <div className="section-label">PERFORMANCE</div>
      <div className="perf-grid">
        <div className="perf-card">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 20 }}>
            <div className="perf-title">Responses Over Time</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text2)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block' }}></span>Responses</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)', display: 'inline-block' }}></span>Views</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <div ref={timeDropdownRef} style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setOpenTimeDropdown(!openTimeDropdown); setOpenFormDropdown(false); }} style={{ padding: '5px 10px', background: 'var(--bg3)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {timePeriods.find(t => t.id === timePeriod)?.label}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform 0.2s' }}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openTimeDropdown && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, minWidth: 120, boxShadow: '0 8px 20px rgba(0,0,0,0.3)', zIndex: 1000 }}>
                    {timePeriods.map(period => (
                      <button key={period.id} onClick={(e) => { e.stopPropagation(); setTimePeriod(period.id); setOpenTimeDropdown(false); }} style={{ width: '100%', padding: '7px 12px', background: timePeriod === period.id ? 'rgba(124, 110, 245, 0.15)' : 'transparent', color: timePeriod === period.id ? 'var(--purple)' : 'var(--text)', border: 'none', borderRadius: 0, fontSize: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }} onMouseEnter={(e) => e.target.style.background = timePeriod === period.id ? 'rgba(124, 110, 245, 0.15)' : 'var(--bg3)'} onMouseLeave={(e) => e.target.style.background = timePeriod === period.id ? 'rgba(124, 110, 245, 0.15)' : 'transparent'}>
                        {period.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div ref={formDropdownRef} style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setOpenFormDropdown(!openFormDropdown); setOpenTimeDropdown(false); }} style={{ padding: '5px 10px', background: 'var(--bg3)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {forms.find(f => f.id === selectedForm)?.name}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform 0.2s' }}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openFormDropdown && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, minWidth: 160, boxShadow: '0 8px 20px rgba(0,0,0,0.3)', zIndex: 1000, maxHeight: 250, overflowY: 'auto' }}>
                    {forms.map(form => (
                      <button key={form.id} onClick={(e) => { e.stopPropagation(); setSelectedForm(form.id); setOpenFormDropdown(false); }} style={{ width: '100%', padding: '7px 12px', background: selectedForm === form.id ? 'rgba(124, 110, 245, 0.15)' : 'transparent', color: selectedForm === form.id ? 'var(--purple)' : 'var(--text)', border: 'none', borderRadius: 0, fontSize: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', borderBottom: '1px solid rgba(255,255,255,0.03)' }} onMouseEnter={(e) => e.target.style.background = selectedForm === form.id ? 'rgba(124, 110, 245, 0.15)' : 'var(--bg3)'} onMouseLeave={(e) => e.target.style.background = selectedForm === form.id ? 'rgba(124, 110, 245, 0.15)' : 'transparent'}>
                        {form.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5c9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e5c9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
              <Area type="monotone" dataKey="responses" name="Responses" stroke="var(--cyan)" strokeWidth={2} fill="url(#colorResponses)" />
              <Area type="monotone" dataKey="views" name="Views" stroke="var(--purple)" strokeWidth={2} fill="url(#colorViews)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="perf-card">
          <div className="perf-title">Response Sentiment</div>
          <div className="perf-sub">AI-analysed · {stats.totalResponses} response{stats.totalResponses === 1 ? '' : 's'}</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="legend-row" style={{ fontSize: 14, fontWeight: 600 }}><div className="legend-dot" style={{ background: 'var(--green)' }}></div>Positive<div className="legend-pct color-green">{sentimentPct.positive}%</div></div>
              <div className="legend-row" style={{ fontSize: 14, fontWeight: 600 }}><div className="legend-dot" style={{ background: 'var(--purple)' }}></div>Neutral<div className="legend-pct color-purple">{sentimentPct.neutral}%</div></div>
              <div className="legend-row" style={{ fontSize: 14, fontWeight: 600 }}><div className="legend-dot" style={{ background: 'var(--red)' }}></div>Negative<div className="legend-pct color-red">{sentimentPct.negative}%</div></div>
            </div>
            <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Positive', value: sentimentPct.positive, color: '#22c55e' },
                      { name: 'Neutral', value: sentimentPct.neutral, color: '#a855f7' },
                      { name: 'Negative', value: sentimentPct.negative, color: '#ef4444' }
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value"
                  >
                    {[
                      { name: 'Positive', value: sentimentPct.positive, color: '#22c55e' },
                      { name: 'Neutral', value: sentimentPct.neutral, color: '#a855f7' },
                      { name: 'Negative', value: sentimentPct.negative, color: '#ef4444' }
                    ].map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{sentimentPct.positive}%</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Positive</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 20 }}>ACTIVITY & INTEGRITY</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ position: 'relative' }}>
          <div className="perf-title">Activity Heatmap</div>
          <div className="perf-sub">Responses by day</div>
          <div className="hm-labels">
            {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="hm-day-label">{d}</div>)}
          </div>
          <div className="heatmap">
            {Array(35).fill(0).map((_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (35 - i));
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
              return (
                <div
                  key={i}
                  className="hm-cell"
                  onMouseEnter={(e) => {
                    setHeatmapHover({ index: i, date: dateStr });
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHeatmapHover(null)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </div>
          {heatmapHover && (
            <div style={{
              position: 'fixed',
              left: `${tooltipPos.x + 10}px`,
              top: `${tooltipPos.y + 10}px`,
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              color: 'var(--text)',
              pointerEvents: 'none',
              zIndex: 10000,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              {heatmapHover.date}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: 'var(--text3)' }}>
            <span>Less</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0.15, 0.3, 0.55, 0.8, 1].map((op, i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(0,229,201,${op})` }}></div>
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
        <div className="card">
          <div className="perf-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--red)' }}>🛡</span> Integrity Center</div>
          <div className="perf-sub">Spam & quality monitoring</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[{ val: 0, label: 'Spam blocked', color: 'var(--red)' }, { val: 0, label: 'Suspicious', color: 'var(--yellow)' }, { val: 0, label: 'Verified', color: 'var(--green)' }].map((item, i) => (
              <div key={i} style={{ background: 'var(--bg4)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.val}</div>
                <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: 10, textAlign: 'center', fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✓ All forms are clean</div>
        </div>
        <div className="card">
          <div className="perf-title">✦ AI Insights</div>
          <div className="perf-sub">Auto-generated · based on your data</div>
          {insightCards.map((card) => (
            <div
              key={card.id}
              className={`ai-insight-card ${card.tone === 'alert' ? 'alert-card' : 'good-card'}`}
            >
              <div className="ai-insight-title">{card.tone === 'alert' ? '⚠' : '✦'} {card.title}</div>
              <div className="ai-insight-body">{card.body}</div>
              <div className="ai-insight-tag">⊙ {card.tag}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div className="card">
          <div className="perf-title">📋 Recent Forms</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -20, marginBottom: 12 }}><span style={{ fontSize: 12, color: 'var(--purple)', cursor: 'pointer' }} onClick={() => onNavigate('forms')}>View all forms →</span></div>
          {recentForms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 13 }}>No forms yet. Create your first form!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) 92px 110px 120px 130px', gap: 12, padding: '0 12px', color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <div>Form</div>
                <div>Status</div>
                <div style={{ textAlign: 'center' }}>Responses</div>
                <div>Created At</div>
                <div>Last Modified</div>
              </div>
              {recentForms.map((form) => (
                <div key={form._id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) 92px 110px 120px 130px', gap: 12, alignItems: 'center', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px', minWidth: 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--text1)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.title || 'Untitled form'}</div>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 700, color: getFormStatus(form.status).color, background: getFormStatus(form.status).bg, textTransform: 'capitalize', width: 'fit-content' }}>
                    {getFormStatus(form.status).label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', fontSize: 12, color: 'var(--cyan)', fontWeight: 600, textAlign: 'center' }}>{form.responseCount || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(form.createdAt)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(form.updatedAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
