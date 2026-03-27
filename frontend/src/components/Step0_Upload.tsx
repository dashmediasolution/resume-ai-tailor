import React from 'react';

interface Props {
  file: File | null;
  setFile: (file: File | null) => void;
  jd: string;
  setJd: (jd: string) => void;
  onUpload: () => void;
  loading: boolean;
}

export const Step0_Upload: React.FC<Props> = ({ file, setFile, jd, setJd, onUpload, loading }) => (
  <div style={cardStyle}>
    <h2 style={{ color: '#4f46e5' }}>1. Upload & Analyze</h2>
    <p style={{ color: '#666' }}>We'll start by auditing your current resume against the JD.</p>
    
    <div style={{ margin: '25px 0' }}>
      <label style={labelStyle}>Resume (PDF)</label>
      <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
    </div>

    <div style={{ marginBottom: '25px' }}>
      <label style={labelStyle}>Job Description</label>
      <textarea 
        style={textareaStyle} 
        value={jd} 
        onChange={(e) => setJd(e.target.value)} 
        placeholder="Paste the full job requirements here..."
      />
    </div>

    <button onClick={onUpload} disabled={loading || !file || !jd} style={loading ? disabledBtn : primaryBtn}>
      {loading ? "AI is auditing your data..." : "Begin Analysis ✨"}
    </button>
  </div>
);

const cardStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' };
const labelStyle: React.CSSProperties = { display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' };
const textareaStyle: React.CSSProperties = { width: '100%', height: '180px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' };
const primaryBtn: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' };
const disabledBtn: React.CSSProperties = { ...primaryBtn, backgroundColor: '#9ca3af', cursor: 'not-allowed' };