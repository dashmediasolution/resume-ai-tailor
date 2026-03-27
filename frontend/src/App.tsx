import React, { useState } from 'react';
import axios from 'axios';
import { Step0_Upload } from './components/Step0_Upload';
import { Step1_Audit } from './components/Step1_Audit';
import { Step2_Personalize } from './components/Step2_Personalize';
import { Step3_FinalPreview } from './components/Step3_FinalPreview';

// --- FIXED: Interface now matches the "Report Card" Backend Structure ---
interface AnalysisData {
  master_record: {
    personal: { name: string; email: string; phone: string; links: string[] };
    education: Array<{ inst: string; degree: string; year: string; details: string }>;
    projects: Array<{ title: string; tech: string; desc: string }>;
    experience_raw: Array<{ company: string; role: string; dates: string; bullets: string[] }>;
    certifications: string[];
    achievements: string[];
  };
  optimized_sections: {
    summary: { options: string[] };
    skills: {
      tech: { options: string[][] };
      soft: { options: string[][] };
    };
    experience: Array<{
      company: string;
      role: string;
      optimized_bullets: string[];
    }>;
  };
  // UPDATE THIS BLOCK:
  audit: {
    score: number;
    metrics: {
      keyword_score: number;
      impact_score: number;
      role_alignment: number
    };
    summary_critique: string;
    comparison_table: Array<{
      category: string;
      jd_requirement: string;
      user_status: string;
      gap: string
    }>;
    missing_keywords: string[];
    action_plan: string;
  };
}

const App: React.FC = () => {
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState<string>('');
  const [data, setData] = useState<AnalysisData | null>(null);

  // --- User Selections State ---
  const [selections, setSelections] = useState({
    summary: '',
    techSkills: [] as string[],
    softSkills: [] as string[]
  });

  const handleUpload = async () => {
    if (!file || !jd) return alert("Please provide both a resume and JD.");

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jd);

    try {
      const response = await axios.post<{ analysis: AnalysisData }>(
        'http://127.0.0.1:8000/analyze-resume',
        formData
      );

      console.log("DEBUG: Full Backend Response:", response.data.analysis);

      setData(response.data.analysis);
      setStep(1); // Move to Audit (Report Card)
    } catch (error) {
      console.error("Analysis Error:", error);
      alert("AI Chain failed. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setStep(0);
    setData(null);
    setFile(null);
    setJd('');
    setSelections({ summary: '', techSkills: [], softSkills: [] });
  };

  return (
    <div style={pageWrapper}>
      <header style={headerStyle}>
        <h1 style={logoStyle}>ResumeAI <span style={{ fontWeight: 300 }}>Pro</span></h1>
        {step > 0 && <button onClick={handleRestart} style={textBtn}>Restart</button>}
      </header>

      <div style={containerStyle}>
        {/* Progress Tracker UI */}
        <div style={progressContainer}>
          <div style={stepIndicator}>STEP {step + 1} OF 4</div>
          <div style={progressBarBase}>
            <div style={{ ...progressBarFill, width: `${((step + 1) / 4) * 100}%` }} />
          </div>
        </div>

        {/* --- STEP 0: UPLOAD --- */}
        {step === 0 && (
          <Step0_Upload
            file={file} setFile={setFile}
            jd={jd} setJd={setJd}
            onUpload={handleUpload} loading={loading}
          />
        )}

        {/* --- STEP 1: AUDIT (Report Card) --- */}
        {/* --- STEP 1: AUDIT --- */}
        {step === 1 && data && (
          <Step1_Audit
            auditData={{
              score: data.audit?.score ?? 0,

              // Map metrics safely to ensure the bars are not 0%
              metrics: {
                keyword_score: data.audit?.metrics?.keyword_score ?? 0,
                impact_score: data.audit?.metrics?.impact_score ?? 0,
                role_alignment: data.audit?.metrics?.role_alignment ?? 0
              },

              // Handle the case where AI might name it 'critique' instead of 'summary_critique'
              // We use 'as any' here briefly to bypass the strict check for the alternative key
              summary_critique: data.audit?.summary_critique || (data.audit as any)?.critique || "Analysis complete.",

              comparison_table: data.audit?.comparison_table || [],
              missing_keywords: data.audit?.missing_keywords || [],
              action_plan: data.audit?.action_plan || "Proceed to fix issues."
            }}
            onNext={() => setStep(2)}
          />
        )}

        {/* --- STEP 2: PERSONALIZE (Selection Screen) --- */}
        {step === 2 && data && (
          <Step2_Personalize
            data={data}
            selections={selections}
            setSelections={setSelections}
            onNext={() => setStep(3)}
          />
        )}

        {/* --- STEP 3: FINAL PREVIEW (PDF Generation) --- */}
        {step === 3 && data && (
          <Step3_FinalPreview
            data={data}
            selections={selections}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  );
};

// --- Styles ---
const pageWrapper: React.CSSProperties = { backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '20px 40px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' };
const logoStyle: React.CSSProperties = { margin: 0, fontSize: '22px', color: '#4f46e5', fontWeight: 800 };
const containerStyle: React.CSSProperties = { maxWidth: '850px', margin: '40px auto', padding: '0 20px' };
const progressContainer: React.CSSProperties = { marginBottom: '40px' };
const stepIndicator: React.CSSProperties = { fontSize: '12px', fontWeight: 800, marginBottom: '8px', color: '#64748b', letterSpacing: '1px' };
const progressBarBase: React.CSSProperties = { height: '6px', backgroundColor: '#e2e8f0', borderRadius: '10px' };
const progressBarFill: React.CSSProperties = { height: '100%', backgroundColor: '#4f46e5', borderRadius: '10px', transition: 'width 0.4s ease-in-out' };
const textBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600 };

export default App;