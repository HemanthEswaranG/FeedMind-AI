import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/apiClient';

const API_BASE = '/ocr';

export default function OcrUpload() {
  const fileInputRef = useRef(null);
  const stageTimerRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [trainingStage, setTrainingStage] = useState('idle');
  const [showTrainingFlow, setShowTrainingFlow] = useState(false);

  const clearStageTimer = () => {
    if (stageTimerRef.current) {
      clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    setError('');
    try {
      const { data } = await apiClient.get(`${API_BASE}/history`);
      setHistory(data.history || []);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load OCR history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    return () => {
      clearStageTimer();
    };
  }, []);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please choose a PDF or image file first.');
      return;
    }

    setUploading(true);
    setError('');
    setShowTrainingFlow(true);
    setTrainingStage('extracting');

    try {
      clearStageTimer();
      stageTimerRef.current = setTimeout(() => {
        setTrainingStage('training');
      }, 1400);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const { data } = await apiClient.post(`${API_BASE}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearStageTimer();
      setTrainingStage('success');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await fetchHistory();

      stageTimerRef.current = setTimeout(() => {
        setShowTrainingFlow(false);
        setTrainingStage('idle');
      }, 2800);
    } catch (err) {
      clearStageTimer();
      setShowTrainingFlow(false);
      setTrainingStage('idle');
      setError(err.response?.data?.message || err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const currentStageOrder = {
    idle: 0,
    extracting: 1,
    training: 2,
    success: 3,
  };

  const getStageState = (stepOrder) => {
    const current = currentStageOrder[trainingStage] || 0;
    if (current > stepOrder) return 'done';
    if (current === stepOrder) return 'active';
    return 'idle';
  };

  const handleDeleteItem = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this upload entry from the database?');
    if (!confirmed) return;

    setDeletingId(id);
    setError('');

    try {
      await apiClient.delete(`${API_BASE}/history/${id}`);
      setHistory((prev) => prev.filter((item) => item._id !== id));
      if (expandedId === id) {
        setExpandedId(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete OCR history item.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearHistory = async () => {
    const confirmed = window.confirm('This will permanently clear the complete OCR upload history data from the database. Do you want to continue?');
    if (!confirmed) return;

    setClearingHistory(true);
    setError('');

    try {
      await apiClient.delete(`${API_BASE}/history`);
      setHistory([]);
      setExpandedId(null);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to clear OCR history.');
    } finally {
      setClearingHistory(false);
    }
  };

  return (
    <div className="page">
      {/* Expanded Details Modal */}
      {expandedId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }} onClick={() => setExpandedId(null)}>
          {history.find(item => item._id === expandedId) && (
            <div style={{
              backgroundColor: 'var(--bg)',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease-out',
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: 'var(--text1)' }}>
                    {history.find(item => item._id === expandedId)?.fileName}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
                    {new Date(history.find(item => item._id === expandedId)?.createdAt).toLocaleString()} • {history.find(item => item._id === expandedId)?.pageCount} page(s)
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setExpandedId(null)}
                  style={{ padding: '8px 12px' }}
                >
                  ✕ Close
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text1)' }}>
                  Extracted Text
                </div>
                <div style={{
                  backgroundColor: 'var(--bg2)',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--text1)',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {history.find(item => item._id === expandedId)?.rawText}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text1)' }}>
                  AI Analysis
                </div>
                <div style={{
                  backgroundColor: 'var(--bg2)',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--text1)',
                }}>
                  {history.find(item => item._id === expandedId)?.aiAnalysis}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="page-title" style={{ marginBottom: 8 }}>Data Upload</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
        Upload images or PDFs to prepare training data and generate AI-assisted insights.
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="ocr-drop" onClick={openFilePicker}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          <div className="ocr-icon">📄</div>
          <div className="ocr-title">Upload PDF / Image for Data Training</div>
          <div className="ocr-sub">Click to browse and start model training preparation</div>
          <div className="ocr-formats">Supported formats: PDF, PNG, JPG, JPEG, GIF, BMP, WEBP, TIFF</div>
          {selectedFile && (
            <div className="ocr-selected-file">Selected: {selectedFile.name}</div>
          )}
          <div className="ocr-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={uploading}
            >
              {uploading ? 'Processing...' : 'Start Trainning'}
            </button>
          </div>
          {error && <div className="ocr-error">{error}</div>}
        </div>
      </div>

      {showTrainingFlow && (
        <div className="card training-flow-card" style={{ marginTop: 16 }}>
          <div className="training-flow-head">
            <div className="training-gif" aria-hidden="true">
              <div className="training-gif-ring"></div>
              <div className="training-gif-dot"></div>
            </div>
            <div>
              <div className="training-flow-title">Training Pipeline</div>
              <div className="training-flow-sub">Live status while your file is being processed.</div>
            </div>
          </div>

          <div className="training-steps">
            <div className={`training-step ${getStageState(1)}`}>
              <div className="training-step-icon">EX</div>
              <div>
                <div className="training-step-title">Extracting</div>
                <div className="training-step-desc">Extracting data to traine the model.</div>
              </div>
            </div>

            <div className={`training-step ${getStageState(2)}`}>
              <div className="training-step-icon">TR</div>
              <div>
                <div className="training-step-title">Trainning Model</div>
                <div className="training-step-desc">Building and refining model context from extracted data.</div>
              </div>
            </div>

            <div className={`training-step ${getStageState(3)}`}>
              <div className="training-step-icon">OK</div>
              <div>
                <div className="training-step-title">Trainning Successful</div>
                <div className="training-step-desc">Training output saved successfully and ready for use.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card ocr-history-card" style={{ marginTop: 16 }}>
        <div className="ocr-history-head">
          <div className="ocr-history-title">Trainned History</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleClearHistory}
              disabled={clearingHistory || loadingHistory || history.length === 0}
            >
              {clearingHistory ? 'Clearing...' : 'Clear Memory'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={fetchHistory} disabled={loadingHistory || clearingHistory}>
              {loadingHistory ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {loadingHistory ? (
          <div className="ocr-history-empty">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="ocr-history-empty">No OCR uploads yet.</div>
        ) : (
          <div className="ocr-history-list">
            {history.map((item) => (
              <div className="ocr-history-item" key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div className="ocr-history-file">{item.fileName}</div>
                  <div className="ocr-history-meta">
                    {new Date(item.createdAt).toLocaleString()} • {item.pageCount} page(s)
                  </div>
                  <div className="ocr-history-snippet">{item.aiAnalysis}</div>
                </div>
                <div style={{ marginLeft: '12px', display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn btn-open"
                    onClick={() => setExpandedId(item._id)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDeleteItem(item._id)}
                    disabled={deletingId === item._id || clearingHistory}
                  >
                    {deletingId === item._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
