import React from 'react';

interface Props {
  auditData: {
    score: number;
    metrics: { keyword_score: number; impact_score: number; role_alignment: number };
    summary_critique: string;
    comparison_table: Array<{ 
      category: string; 
      jd_requirement: string; 
      user_status: string; 
      gap: string 
    }>;
    missing_keywords: string[];
    action_plan: string;
    roadmap?: string[];
    // NEW: Captures completeness check from the backend mapper
    validation?: {
      is_complete: boolean;
      missing_critical_fields: string[];
      suggestions: string[];
    };
  };
  onNext: () => void;
}

export const Step1_Audit: React.FC<Props> = ({ auditData, onNext }) => {
  const score = auditData?.score ?? 0;
  const validation = auditData?.validation;
  const roadmap = auditData?.roadmap || [
    "Refine your professional summary for role-specific impact.",
    "Select technical clusters that highlight your most relevant tools.",
    "Align soft skills with the company's cultural requirements."
  ];

  return (
    <div style={cardStyle}>
      {/* PROFILE HEALTH ALERT - Shows if critical data like phone/email is missing */}
      {validation && !validation.is_complete && (
        <div style={warningBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <h4 style={{ margin: 0, color: '#991b1b', fontSize: '13px' }}>Profile Completeness Warning</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#b91c1c' }}>
                Critical fields missing from original CV: 
                <b> {validation.missing_critical_fields.join(", ")}</b>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div style={headerSection}>
        <div style={mainScoreBox}>
          <h1 style={{ margin: 0, fontSize: '48px', color: '#4f46e5' }}>{score}%</h1>
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: '#64748b' }}>TOTAL MATCH</p>
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 5px 0' }}>Strategic Analysis</h2>
          <p style={actionPlanStyle}>"{auditData?.action_plan}"</p>
        </div>
      </div>

      {/* Metrics Breakdown */}
      <div style={metricsGrid}>
        <MetricBar label="Keywords" val={auditData?.metrics?.keyword_score} />
        <MetricBar label="Impact" val={auditData?.metrics?.impact_score} />
        <MetricBar label="Alignment" val={auditData?.metrics?.role_alignment} />
      </div>

      {/* Comparison Table */}
      <div style={tableWrapper}>
        <h4 style={sectionHeader}>Direct Comparison</h4>
        <table style={tableStyle}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: '11px', color: '#64748b' }}>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>JD Requirement</th>
              <th style={thStyle}>Your Status</th>
              <th style={thStyle}>The Gap</th>
            </tr>
          </thead>
          <tbody>
            {auditData?.comparison_table?.map((row: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>
                  {/* Category Icons for visual clarity */}
                  <span style={{ marginRight: '8px' }}>
                    {row.category?.toLowerCase() === 'skills' ? '🛠️' : 
                     row.category?.toLowerCase() === 'education' ? '🎓' : 
                     row.category?.toLowerCase() === 'experience' ? '💼' : '🔹'}
                  </span>
                  <b>{row.category || "General"}</b>
                </td>
                <td style={tdStyle}>{row.jd_requirement || "N/A"}</td>
                <td style={tdStyle}>{row.user_status || "Not Detected"}</td>
                <td style={{ ...tdStyle, color: '#dc2626', fontWeight: 600 }}>{row.gap || "Gap found"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Roadmap Section */}
      <div style={roadmapBox}>
        <h4 style={sectionHeader}>🚀 Next Steps: Optimization Strategy</h4>
        <div style={roadmapGrid}>
          {roadmap.map((step, i) => (
            <div key={i} style={roadmapItem}><b>{i + 1}.</b> {step}</div>
          ))}
        </div>
      </div>

      <button onClick={onNext} style={primaryBtn}>Fix These Gaps →</button>
    </div>
  );
};

const MetricBar = ({ label, val }: { label: string; val: number }) => (
  <div style={{ marginBottom: '10px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
      <span>{label}</span><b>{val}%</b>
    </div>
    <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '10px', marginTop: '4px' }}>
      <div style={{ height: '100%', width: `${val}%`, backgroundColor: '#4f46e5', borderRadius: '10px' }} />
    </div>
  </div>
);

// New Styles for the Warning Banner
const warningBanner: React.CSSProperties = { 
  backgroundColor: '#fef2f2', 
  border: '1px solid #fecaca', 
  padding: '12px', 
  borderRadius: '8px', 
  marginBottom: '20px' 
};

// Existing Styles
const cardStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' };
const headerSection: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' };
const mainScoreBox: React.CSSProperties = { textAlign: 'center', padding: '15px', borderRight: '1px solid #e2e8f0', minWidth: '120px' };
const actionPlanStyle: React.CSSProperties = { fontSize: '14px', color: '#475569', fontStyle: 'italic' };
const metricsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' };
const tableWrapper: React.CSSProperties = { marginBottom: '30px' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = { padding: '10px', borderBottom: '2px solid #e2e8f0' };
const tdStyle: React.CSSProperties = { padding: '10px', fontSize: '12px' };
const sectionHeader: React.CSSProperties = { fontSize: '10px', textTransform: 'uppercase', color: '#4f46e5', marginBottom: '10px', letterSpacing: '1px' };
const roadmapBox: React.CSSProperties = { padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '30px', border: '1px dashed #cbd5e1' };
const roadmapGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '10px' };
const roadmapItem: React.CSSProperties = { fontSize: '11px', color: '#475569', lineHeight: '1.4' };
const primaryBtn: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' };