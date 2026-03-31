const chartHeights = [10,8,12,6,9,7,11,5,8,10,6,9,7,11,8,10,12,6,9,8,10,7,11,9,8,10,6,9,7,10];

export default function Dashboard({ user, onNavigate }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">

      <div className="section-label">OVERVIEW</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Forms</div>
          <div className="stat-icon" style={{ background: 'rgba(124,110,245,0.15)' }}>◫</div>
          <div className="stat-value">0</div>
          <div className="stat-sub color-purple">0 published · 0 draft</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Responses</div>
          <div className="stat-icon" style={{ background: 'rgba(0,229,201,0.15)' }}>◻</div>
          <div className="stat-value">0</div>
          <div className="stat-sub color-cyan">across all forms</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Per Form</div>
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)' }}>↗</div>
          <div className="stat-value">0</div>
          <div className="stat-sub color-text2">responses per form</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spam Blocked</div>
          <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.15)' }}>🛡</div>
          <div className="stat-value">0</div>
          <div className="stat-sub color-green">All clear</div>
        </div>
      </div>

      <div className="quick-actions">
        <div className="qa-card" onClick={() => onNavigate('builder')}>
          <div className="qa-icon" style={{ background: 'rgba(124,110,245,0.15)' }}>🤖</div>
          <div><div className="qa-title">AI Form Builder</div><div className="qa-sub">Describe & generate</div></div>
        </div>
        <div className="qa-card">
          <div className="qa-icon" style={{ background: 'rgba(0,229,201,0.1)' }}>⇗</div>
          <div><div className="qa-title">Share a Form</div><div className="qa-sub">Copy link or embed</div></div>
        </div>
        <div className="qa-card">
          <div className="qa-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>↓</div>
          <div><div className="qa-title">Export Responses</div><div className="qa-sub">CSV, JSON, PDF</div></div>
        </div>
        <div className="qa-card">
          <div className="qa-icon" style={{ background: 'rgba(249,115,22,0.1)' }}>#</div>
          <div><div className="qa-title">Connect Slack</div><div className="qa-sub">Real-time alerts</div></div>
        </div>
      </div>

      <div className="section-label">PERFORMANCE</div>
      <div className="perf-grid">
        <div className="perf-card">
          <div className="perf-title">Responses Over Time</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button className="time-tab active">30d</button>
            <button className="time-tab">7d</button>
            <button className="time-tab">90d</button>
          </div>
          <div className="chart-dots" style={{ height: 80 }}>
            {chartHeights.map((h, i) => (
              <div key={i} className="chart-dot" style={{ height: `${h}%` }}></div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11, color: 'var(--text2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block' }}></span>Responses</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)', display: 'inline-block' }}></span>Views</span>
          </div>
        </div>
        <div className="perf-card">
          <div className="perf-title">Response Funnel</div>
          <div className="perf-sub">Views → completions · avg all forms</div>
          {[
            { label: 'Form views', width: 100, val: 10, color: 'linear-gradient(90deg,var(--purple),var(--cyan))' },
            { label: 'Started', width: 70, val: 7, color: 'linear-gradient(90deg,var(--purple),var(--cyan))' },
            { label: 'Halfway', width: 50, val: 5, color: 'linear-gradient(90deg,var(--purple),var(--cyan))' },
            { label: 'Submitted', width: 5, val: 1, color: 'linear-gradient(90deg,var(--purple),var(--cyan))' },
            { label: 'Valid (no spam)', width: 3, val: 0, color: 'var(--green)' },
          ].map((row, i) => (
            <div className="funnel-row" key={i}>
              <div className="funnel-label">{row.label}</div>
              <div className="funnel-track">
                <div className="funnel-fill" style={{ width: `${row.width}%`, background: row.color }}>{row.val > 0 ? row.val : ''}</div>
              </div>
              <div className="funnel-val">{row.val}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text2)' }}>Overall conversion: <span className="color-red">0%</span></div>
        </div>
        <div className="perf-card">
          <div className="perf-title">Response Sentiment</div>
          <div className="perf-sub">AI-analysed · 0 responses</div>
          <div className="donut-wrap">
            <div className="donut">
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="35" fill="none" stroke="var(--bg4)" strokeWidth="10"/>
                <circle cx="45" cy="45" r="35" fill="none" stroke="var(--green)" strokeWidth="10" strokeDasharray="138 82" strokeLinecap="round"/>
                <circle cx="45" cy="45" r="35" fill="none" stroke="var(--purple)" strokeWidth="10" strokeDasharray="50 170" strokeDashoffset="-138" strokeLinecap="round"/>
                <circle cx="45" cy="45" r="35" fill="none" stroke="var(--red)" strokeWidth="10" strokeDasharray="29 191" strokeDashoffset="-188" strokeLinecap="round"/>
              </svg>
              <div className="donut-center"><div className="donut-pct">62%</div><div className="donut-lbl">Positive</div></div>
            </div>
            <div>
              <div className="legend-row"><div className="legend-dot" style={{ background: 'var(--green)' }}></div>Positive<div className="legend-pct color-green">62%</div></div>
              <div className="legend-row"><div className="legend-dot" style={{ background: 'var(--purple)' }}></div>Neutral<div className="legend-pct color-purple">24%</div></div>
              <div className="legend-row"><div className="legend-dot" style={{ background: 'var(--red)' }}></div>Negative<div className="legend-pct color-red">14%</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 20 }}>ACTIVITY & INTEGRITY</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="perf-title">Completion Rates</div>
          <div className="perf-sub">Per published form</div>
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>No forms published yet</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginTop: 8 }}><span>Avg completion</span><span className="color-cyan">0%</span></div>
        </div>
        <div className="card">
          <div className="perf-title">Activity Heatmap</div>
          <div className="perf-sub">Responses by day</div>
          <div className="hm-labels">
            {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="hm-day-label">{d}</div>)}
          </div>
          <div className="heatmap">
            {Array(28).fill(0).map((_, i) => <div key={i} className="hm-cell"></div>)}
          </div>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="perf-title">📋 Recent Forms</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -20, marginBottom: 12 }}><span style={{ fontSize: 12, color: 'var(--purple)', cursor: 'pointer' }} onClick={() => onNavigate('forms')}>View all forms →</span></div>
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 13 }}>No forms yet. Create your first form!</div>
        </div>
        <div className="card">
          <div className="perf-title">✦ AI Insights</div>
          <div className="perf-sub">Auto-generated · based on your data</div>
          <div className="ai-insight-card good-card">
            <div className="ai-insight-title">📈 Peak engagement detected</div>
            <div className="ai-insight-body">No responses yet — publish a form to start collecting. Schedule launches accordingly.</div>
            <div className="ai-insight-tag">⊙ Actionable signal</div>
          </div>
          <div className="ai-insight-card alert-card">
            <div className="ai-insight-title">⚠ Drop-off risk detected</div>
            <div className="ai-insight-body">Collect more responses to detect drop-off hotspots.</div>
            <div className="ai-insight-tag">⊙ Actionable signal</div>
          </div>
        </div>
      </div>
    </div>
  );
}
