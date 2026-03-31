import React from 'react';

interface Props {
  file: File | null;
  setFile: (file: File | null) => void;
  jd: string;
  setJd: (jd: string) => void;
  onUpload: () => void;
  loading: boolean;
}

export const Step0_Upload: React.FC<Props> = ({ file, setFile, jd, setJd, onUpload, loading }) => {
  
  // ADD THE VALIDATION FUNCTION HERE
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]; // Access the first file
    if (selectedFile) {
      const validTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      // Validation Check
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.docx')) {
        setFile(selectedFile);
      } else {
        alert("Please upload a PDF or Word Document (.docx)");
        e.target.value = ""; // Clear the input if invalid
        setFile(null);
      }
    }
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ color: '#4f46e5' }}>1. Upload & Analyze</h2>
      <p style={{ color: '#666' }}>We'll audit your resume against the job requirements.</p>
      
      <div style={{ margin: '25px 0' }}>
        <label style={labelStyle}>Resume (PDF or DOCX)</label>
        {/* ATTACH THE FUNCTION TO ONCHANGE */}
        <input 
          type="file" 
          accept=".pdf,.docx" 
          onChange={handleFileChange} 
        />
        {file && (
          <p style={{ fontSize: '12px', color: '#10b981', marginTop: '5px' }}>
            📄 Ready: {file.name}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '25px' }}>
        <label style={labelStyle}>Job Description</label>
        <textarea 
          style={textareaStyle} 
          value={jd} 
          onChange={(e) => setJd(e.target.value)} 
          placeholder="Paste requirements here..."
        />
      </div>

      <button 
        onClick={onUpload} 
        disabled={loading || !file || !jd} 
        style={loading ? disabledBtn : (file && jd ? primaryBtn : inactiveBtn)}
      >
        {loading ? "AI is auditing your data..." : "Begin Analysis ✨"}
      </button>
    </div>
  );
};

// --- STYLES (Kept consistent with your previous layout) ---
const cardStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' };
const labelStyle: React.CSSProperties = { display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' };
const textareaStyle: React.CSSProperties = { width: '100%', height: '180px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' };
const primaryBtn: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' };
const inactiveBtn: React.CSSProperties = { ...primaryBtn, backgroundColor: '#c7d2fe', cursor: 'not-allowed' };
const disabledBtn: React.CSSProperties = { ...primaryBtn, backgroundColor: '#9ca3af', cursor: 'not-allowed' };