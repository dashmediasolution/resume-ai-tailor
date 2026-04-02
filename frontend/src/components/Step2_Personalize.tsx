import React, { useState, useMemo } from 'react';

export const Step2_Personalize: React.FC<any> = ({ data, selections, setSelections, onNext }) => {
  const [tab, setTab] = useState<'summary' | 'tech' | 'soft'>('summary');

  const intent = data.intent_suggestion || 'Strategic tailoring active.';

  // === EXTRACT SUMMARY OPTIONS ===
  const summaryOptions: string[] = useMemo(() => {
    if (Array.isArray(data.summary_options) && data.summary_options.length > 0) {
      return data.summary_options;
    }
    return [];
  }, [data]);

  // === EXTRACT SKILL DATA ===
  const {
    techOptions,
    softOptions,
    originalTechSet,
    originalSoftSet,
    originalTechCategories,
  } = useMemo(() => {
    const sd = data.skills_data || {};

    const origTechCats: Array<{ category: string; items: string[] }> =
      sd.original_tech_categories || [];
    const origSoftSkills: string[] = sd.original_soft_skills || [];

    // Build flat sets for checking "is original?"
    const techSet = new Set<string>();
    origTechCats.forEach((cat: any) => {
      (cat.items || []).forEach((item: string) =>
        techSet.add(item.toLowerCase().trim())
      );
    });

    const softSet = new Set<string>();
    origSoftSkills.forEach((s: string) =>
      softSet.add(s.toLowerCase().trim())
    );

    return {
      techOptions: sd.tech?.options || [],
      softOptions: sd.soft?.options || [],
      originalTechSet: techSet,
      originalSoftSet: softSet,
      originalTechCategories: origTechCats,
    };
  }, [data]);

  const hasSoftOptions = softOptions.length > 0;

  // === FILTER: Get only NEW skills for display ===
  const getNewTechCategories = (
    option: Array<{ category: string; items: string[] }>
  ) => {
    if (!Array.isArray(option)) return [];
    return option
      .map((cat: any) => ({
        category: cat.category,
        items: (cat.items || []).filter(
          (skill: string) => !originalTechSet.has(skill.toLowerCase().trim())
        ),
        isNewCategory: !originalTechCategories.some(
          (oc: any) =>
            oc.category.toLowerCase().trim() ===
            cat.category.toLowerCase().replace('(new)', '').trim()
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  };

  const getNewSoftSkills = (option: string[]) => {
    if (!Array.isArray(option)) return [];
    return option.filter(
      (skill: string) => !originalSoftSet.has(skill.toLowerCase().trim())
    );
  };

  // Count new skills in an option
  const countNewTech = (option: Array<{ category: string; items: string[] }>) => {
    const filtered = getNewTechCategories(option);
    return filtered.reduce((sum, cat) => sum + cat.items.length, 0);
  };

  const countNewSoft = (option: string[]) => {
    return getNewSoftSkills(option).length;
  };

  // === VALIDATION ===
  const isComplete =
    selections.summary &&
    selections.selectedTechSkills?.length > 0 &&
    (hasSoftOptions ? selections.selectedSoftSkills?.length > 0 : true);

  return (
    <div style={cardStyle}>
      {/* Career Strategy */}
      <div style={intentBox}>
        <h4 style={labelStyle}>🎯 CAREER STRATEGY</h4>
        <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: '1.4' }}>
          {intent}
        </p>
      </div>

      {/* Info banner */}
      <div style={infoBanner}>
        <span style={{ fontSize: '12px', color: '#475569' }}>
          💡 Your original resume skills are already locked in. Below are <strong>new skills</strong> suggested
          based on the job description. Pick one cluster per tab.
        </span>
      </div>

      {/* Tabs */}
      <div style={tabHeader}>
        <button
          style={tab === 'summary' ? activeTab : inactiveTab}
          onClick={() => setTab('summary')}
        >
          SUMMARY {selections.summary && '✅'}
        </button>
        <button
          style={tab === 'tech' ? activeTab : inactiveTab}
          onClick={() => setTab('tech')}
        >
          TECH SKILLS {selections.selectedTechSkills?.length > 0 && '✅'}
        </button>
        {hasSoftOptions && (
          <button
            style={tab === 'soft' ? activeTab : inactiveTab}
            onClick={() => setTab('soft')}
          >
            SOFT SKILLS {selections.selectedSoftSkills?.length > 0 && '✅'}
          </button>
        )}
      </div>

      <div style={{ marginTop: '20px', minHeight: '400px' }}>
        {/* ====== SUMMARY TAB ====== */}
        {tab === 'summary' && (
          <>
            <p style={tabDescription}>
              Choose a JD-tailored professional summary. Each variation highlights different
              strengths.
            </p>
            {summaryOptions.length > 0 ? (
              summaryOptions.map((s: string, i: number) => (
                <div
                  key={i}
                  onClick={() => setSelections({ ...selections, summary: s })}
                  style={{
                    ...optionCard,
                    border:
                      selections.summary === s
                        ? '2px solid #4f46e5'
                        : '1px solid #eee',
                    backgroundColor:
                      selections.summary === s ? '#f5f7ff' : '#fff',
                  }}
                >
                  <span style={badge}>Variation {i + 1}</span>
                  <p style={{ margin: '10px 0 0 0' }}>{s}</p>
                </div>
              ))
            ) : (
              <EmptyState message="No summary options were generated." />
            )}
          </>
        )}

        {/* ====== TECH SKILLS TAB ====== */}
        {tab === 'tech' && (
          <>
            <p style={tabDescription}>
              Each cluster adds new JD-relevant technical skills to your existing ones.
              Your original skills are automatically included.
            </p>
            {techOptions.length > 0 ? (
              techOptions.map(
                (option: Array<{ category: string; items: string[] }>, optIdx: number) => {
                  const isSelected =
                    JSON.stringify(selections.selectedTechSkills) ===
                    JSON.stringify(option);
                  const newCategories = getNewTechCategories(option);
                  const newCount = countNewTech(option);

                  return (
                    <div
                      key={optIdx}
                      onClick={() =>
                        setSelections({ ...selections, selectedTechSkills: option })
                      }
                      style={{
                        ...optionCard,
                        border: isSelected
                          ? '2px solid #4f46e5'
                          : '1px solid #eee',
                        backgroundColor: isSelected ? '#f5f7ff' : '#fff',
                        padding: '20px',
                      }}
                    >
                      <div style={clusterHeader}>
                        <span style={badge}>Cluster {optIdx + 1}</span>
                        <span style={newCountBadge}>+{newCount} new skills</span>
                      </div>

                      <div style={{ marginTop: '12px' }}>
                        {newCategories.length > 0 ? (
                          newCategories.map((cat, catIdx) => (
                            <div key={catIdx} style={categoryRow}>
                              <div style={categoryLabelContainer}>
                                <span
                                  style={{
                                    ...categoryLabel,
                                    backgroundColor: cat.isNewCategory
                                      ? '#fef3c7'
                                      : '#f1f5f9',
                                    color: cat.isNewCategory ? '#92400e' : '#334155',
                                  }}
                                >
                                  {cat.category}
                                  {cat.isNewCategory && ' 🆕'}
                                </span>
                              </div>
                              <div style={skillChipsContainer}>
                                {cat.items.map((skill: string, sIdx: number) => (
                                  <span key={sIdx} style={newSkillChip}>
                                    + {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                            No new skills in this cluster (keeps originals only)
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            ) : (
              <EmptyState message="No tech skill clusters were generated." />
            )}
          </>
        )}

        {/* ====== SOFT SKILLS TAB ====== */}
        {tab === 'soft' && (
          <>
            <p style={tabDescription}>
              Each cluster adds new JD-relevant soft skills to your existing ones.
              Your original soft skills are automatically included.
            </p>
            {softOptions.length > 0 ? (
              softOptions.map((option: string[], optIdx: number) => {
                const isSelected =
                  JSON.stringify(selections.selectedSoftSkills) ===
                  JSON.stringify(option);
                const newSkills = getNewSoftSkills(option);
                const newCount = countNewSoft(option);

                return (
                  <div
                    key={optIdx}
                    onClick={() =>
                      setSelections({ ...selections, selectedSoftSkills: option })
                    }
                    style={{
                      ...optionCard,
                      border: isSelected
                        ? '2px solid #4f46e5'
                        : '1px solid #eee',
                      backgroundColor: isSelected ? '#f5f7ff' : '#fff',
                      padding: '20px',
                    }}
                  >
                    <div style={clusterHeader}>
                      <span style={badge}>Cluster {optIdx + 1}</span>
                      <span style={newCountBadge}>+{newCount} new skills</span>
                    </div>

                    <div style={{ ...skillChipsContainer, marginTop: '12px' }}>
                      {newSkills.length > 0 ? (
                        newSkills.map((skill: string, sIdx: number) => (
                          <span key={sIdx} style={newSkillChip}>
                            + {skill}
                          </span>
                        ))
                      ) : (
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                          No new skills in this cluster
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState message="No soft skill clusters were generated." />
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <p style={{ fontSize: '11px', color: '#64748b' }}>
          Locked: Education, Experience, Projects, and all other sections preserved as-is.
        </p>
        <button
          onClick={onNext}
          style={isComplete ? primaryBtn : disabledBtn}
          disabled={!isComplete}
        >
          Final Preview →
        </button>
      </div>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div style={emptyState}>
    <p>⚠️ {message}</p>
  </div>
);

// --- Styles ---
const cardStyle: React.CSSProperties = {
  padding: '30px', backgroundColor: '#fff', borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
};
const intentBox: React.CSSProperties = {
  padding: '15px', backgroundColor: '#f8fafc', borderLeft: '4px solid #4f46e5',
  borderRadius: '4px', marginBottom: '10px',
};
const infoBanner: React.CSSProperties = {
  padding: '10px 15px', backgroundColor: '#fffbeb', border: '1px solid #fde68a',
  borderRadius: '8px', marginBottom: '20px',
};
const labelStyle: React.CSSProperties = {
  margin: '0 0 5px 0', fontSize: '10px', color: '#4f46e5', letterSpacing: '1px',
};
const tabHeader: React.CSSProperties = {
  display: 'flex', gap: '15px', borderBottom: '1px solid #eee',
};
const tabStyle: React.CSSProperties = {
  padding: '12px', cursor: 'pointer', background: 'none', border: 'none',
  fontWeight: 700, fontSize: '12px',
};
const activeTab: React.CSSProperties = {
  ...tabStyle, color: '#4f46e5', borderBottom: '2px solid #4f46e5',
};
const inactiveTab: React.CSSProperties = {
  ...tabStyle, color: '#94a3b8',
};
const tabDescription: React.CSSProperties = {
  fontSize: '12px', color: '#64748b', marginBottom: '15px', fontStyle: 'italic',
};
const optionCard: React.CSSProperties = {
  padding: '20px', borderRadius: '12px', cursor: 'pointer', marginBottom: '15px',
  fontSize: '13px', lineHeight: '1.6', transition: '0.2s all',
};
const badge: React.CSSProperties = {
  fontSize: '9px', fontWeight: 800, backgroundColor: '#e2e8f0', padding: '2px 8px',
  borderRadius: '10px', textTransform: 'uppercase',
};
const clusterHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
};
const newCountBadge: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: '#065f46',
  backgroundColor: '#d1fae5', padding: '2px 8px', borderRadius: '10px',
};
const categoryRow: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px',
};
const categoryLabelContainer: React.CSSProperties = {
  minWidth: '130px', flexShrink: 0, paddingTop: '2px',
};
const categoryLabel: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
  display: 'inline-block',
};
const skillChipsContainer: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: '5px', flex: 1,
};
const newSkillChip: React.CSSProperties = {
  padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
  backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7',
  whiteSpace: 'nowrap',
};
const footerStyle: React.CSSProperties = {
  marginTop: '30px', display: 'flex', justifyContent: 'space-between',
  alignItems: 'center',
};
const primaryBtn: React.CSSProperties = {
  padding: '15px 30px', backgroundColor: '#4f46e5', color: '#fff', border: 'none',
  borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
};
const disabledBtn: React.CSSProperties = {
  ...primaryBtn, backgroundColor: '#cbd5e1', cursor: 'not-allowed',
};
const emptyState: React.CSSProperties = {
  padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px',
  backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0',
};