import React, { useState } from 'react';

export const Step2_Personalize: React.FC<any> = ({ data, selections, setSelections, onNext }) => {
  const [tab, setTab] = useState<'summary' | 'tech' | 'soft'>('summary');
  
  // Safely access optimized sections
  const opt = data.optimized_sections || {};
  const intent = data.intent_suggestion || "Strategic tailoring active.";

  // Validation: Check if summary is picked and both skill sets have at least 1 item
  // Note: I relaxed the .length >= 6 check to .length > 0 to ensure the button unlocks 
  // once the user picks a cluster, even if the AI generates slightly fewer words.
  const isComplete = selections.summary && 
                     selections.techSkills?.length > 0 && 
                     selections.softSkills?.length > 0;

  return (
    <div style={cardStyle}>
      <div style={intentBox}>
        <h4 style={labelStyle}>🎯 CAREER STRATEGY</h4>
        <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: '1.4' }}>{intent}</p>
      </div>

      <div style={tabHeader}>
        <button style={tab === 'summary' ? activeTab : inactiveTab} onClick={() => setTab('summary')}>
          SUMMARY {selections.summary && '✅'}
        </button>
        <button style={tab === 'tech' ? activeTab : inactiveTab} onClick={() => setTab('tech')}>
          TECH {selections.techSkills?.length > 0 && '✅'}
        </button>
        <button style={tab === 'soft' ? activeTab : inactiveTab} onClick={() => setTab('soft')}>
          SOFT {selections.softSkills?.length > 0 && '✅'}
        </button>
      </div>

      <div style={{ marginTop: '20px', minHeight: '340px' }}>
        {/* 1. SUMMARY TAB */}
        {tab === 'summary' && opt.summary?.options?.map((s: string, i: number) => (
          <div key={i} onClick={() => setSelections({...selections, summary: s})} 
               style={{...optionCard, border: selections.summary === s ? '2px solid #4f46e5' : '1px solid #eee', backgroundColor: selections.summary === s ? '#f5f7ff' : '#fff'}}>
            <span style={badge}>Variation {i+1}</span>
            <p style={{ margin: '10px 0 0 0' }}>{s}</p>
          </div>
        ))}

        {/* 2. TECH SKILLS TAB */}
        {tab === 'tech' && opt.skills?.tech?.options?.map((list: string[], i: number) => (
          <div key={i} onClick={() => setSelections({...selections, techSkills: list})} 
               style={{...optionCard, border: JSON.stringify(selections.techSkills) === JSON.stringify(list) ? '2px solid #4f46e5' : '1px solid #eee', backgroundColor: JSON.stringify(selections.techSkills) === JSON.stringify(list) ? '#f5f7ff' : '#fff'}}>
            <span style={badge}>Cluster {i+1}</span>
            <p style={{ margin: '10px 0 0 0' }}>{Array.isArray(list) ? list.join(", ") : list}</p>
          </div>
        ))}

        {/* 3. SOFT SKILLS TAB (FIXED: Added missing mapping) */}
        {tab === 'soft' && opt.skills?.soft?.options?.map((list: string[], i: number) => (
          <div key={i} onClick={() => setSelections({...selections, softSkills: list})} 
               style={{...optionCard, border: JSON.stringify(selections.softSkills) === JSON.stringify(list) ? '2px solid #4f46e5' : '1px solid #eee', backgroundColor: JSON.stringify(selections.softSkills) === JSON.stringify(list) ? '#f5f7ff' : '#fff'}}>
            <span style={badge}>Cluster {i+1}</span>
            <p style={{ margin: '10px 0 0 0' }}>{Array.isArray(list) ? list.join(", ") : list}</p>
          </div>
        ))}
      </div>

      <div style={footerStyle}>
        <p style={{fontSize: '11px', color: '#64748b'}}>Locked: Education, Experience Titles, Projects, and Certificates.</p>
        <button onClick={onNext} style={isComplete ? primaryBtn : disabledBtn} disabled={!isComplete}>
          Final Preview →
        </button>
      </div>
    </div>
  );
};

// Styles (Unchanged)
const cardStyle: React.CSSProperties = { padding: '30px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' };
const intentBox: React.CSSProperties = { padding: '15px', backgroundColor: '#f8fafc', borderLeft: '4px solid #4f46e5', borderRadius: '4px', marginBottom: '25px' };
const labelStyle: React.CSSProperties = { margin: '0 0 5px 0', fontSize: '10px', color: '#4f46e5', letterSpacing: '1px' };
const tabHeader: React.CSSProperties = { display: 'flex', gap: '15px', borderBottom: '1px solid #eee' };
const tabStyle: React.CSSProperties = { padding: '12px', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 700, fontSize: '12px' };
const activeTab: React.CSSProperties = { ...tabStyle, color: '#4f46e5', borderBottom: '2px solid #4f46e5' };
const inactiveTab: React.CSSProperties = { ...tabStyle, color: '#94a3b8' };
const optionCard: React.CSSProperties = { padding: '20px', borderRadius: '12px', cursor: 'pointer', marginBottom: '15px', fontSize: '13px', lineHeight: '1.6', transition: '0.2s all' };
const badge: React.CSSProperties = { fontSize: '9px', fontWeight: 800, backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' };
const footerStyle: React.CSSProperties = { marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const primaryBtn: React.CSSProperties = { padding: '15px 30px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' };
const disabledBtn: React.CSSProperties = { ...primaryBtn, backgroundColor: '#cbd5e1', cursor: 'not-allowed' };