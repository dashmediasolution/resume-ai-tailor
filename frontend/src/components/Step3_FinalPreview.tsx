import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';

const sanitizeText = (text: any): string => {
  if (!text) return '';
  if (typeof text !== 'string') text = String(text);
  return text
    .replace(/\uFB00/g, 'ff').replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi').replace(/\uFB04/g, 'ffl').replace(/\uFB05/g, 'ft').replace(/\uFB06/g, 'st')
    .replace(/[\u2018\u2019\u0060\u00B4]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, '-').replace(/\u2014/g, '--').replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ').replace(/\u200B/g, '').replace(/\u00AD/g, '')
    .replace(/[^\x20-\x7E\n\r\t]/g, (char:string) => {
      const safe = 'aaaaaeeeeiiiioooouuuuyncc';
      return safe.includes(char) ? char : '';
    });
};

const sanitizeEntry = (entry: any): any => {
  if (!entry || typeof entry !== 'object') return entry;
  const cleaned: any = {};
  for (const key of Object.keys(entry)) {
    const val = entry[key];
    if (typeof val === 'string') cleaned[key] = sanitizeText(val);
    else if (Array.isArray(val)) cleaned[key] = val.map((item: any) => typeof item === 'string' ? sanitizeText(item) : item);
    else cleaned[key] = val;
  }
  return cleaned;
};

const isSkillsSection = (sectionId: string): boolean => {
  const lower = sectionId?.toLowerCase() || '';
  return lower.includes('skill') || ['competencies', 'proficiencies', 'core_competencies'].includes(lower);
};

const isSummarySection = (sectionId: string): boolean => {
  const ids = ['summary', 'professional_summary', 'objective', 'profile', 'about_me', 'introduction'];
  return ids.includes(sectionId?.toLowerCase());
};

// ✅ FIX: Skip contact/personal sections (already in header)
const isContactSection = (sectionId: string): boolean => {
  const ids = [
    'personal', 'contact', 'contact_info', 'contact_information',
    'personal_info', 'personal_information', 'identity', 'info',
    'links', 'socials', 'header', 'personal_details'
  ];
  return ids.includes(sectionId?.toLowerCase());
};

export const Step3_FinalPreview: React.FC<any> = ({ data, selections, onRestart }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const master = data.master_record || {};
  const audit = data.audit || {};
  const allSections: any[] = master.all_sections || [];

  const selectedTechSkills: Array<{ category: string; items: string[] }> =
    selections.selectedTechSkills || [];
  const selectedSoftSkills: string[] = selections.selectedSoftSkills || [];

  const generatePDFBlob = useCallback(
    (isDownload: boolean = false): string | URL | undefined => {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      let y = 20;
      const PAGE_HEIGHT = 287;
      const marginLeft = 20;
      const marginRight = 190;
      const contentWidth = marginRight - marginLeft;

      const getLineHeight = (fontSize: number): number => fontSize * 0.45;

      const checkPage = (needed: number = 15) => {
        if (y + needed > PAGE_HEIGHT - 15) { doc.addPage(); y = 20; }
      };

      const addSectionHeader = (title: string) => {
        checkPage(20);
        y += 3;
        doc.setFont('times', 'bold').setFontSize(13);
        doc.text(sanitizeText(title).toUpperCase(), marginLeft, y);
        doc.setLineWidth(0.4);
        doc.line(marginLeft, y + 1.5, marginRight, y + 1.5);
        y += 8;
      };

      const renderMultiLine = (text: string, x: number, maxWidth: number, fontSize: number, fontStyle: string = 'normal') => {
        const clean = sanitizeText(text);
        if (!clean) return;
        doc.setFont('times', fontStyle).setFontSize(fontSize);
        const lines = doc.splitTextToSize(clean, maxWidth);
        const lineH = getLineHeight(fontSize);
        lines.forEach((line: string) => {
          checkPage(lineH + 2);
          doc.text(line, x, y);
          y += lineH;
        });
      };

      const renderEntries = (entries: any[]) => {
        if (!Array.isArray(entries)) return;
        entries.forEach((rawEntry: any) => {
          const entry = sanitizeEntry(rawEntry);
          checkPage(25);

          const title = entry.title || entry.role || entry.degree || '';
          const org = entry.organization || entry.company || entry.inst || '';
          const location = entry.location || '';
          const dates = entry.dates || entry.year || '';
          const details = entry.details || entry.desc || entry.description || '';
          const headerText = org && title ? `${org} - ${title}` : title || org;

          if (headerText) {
            doc.setFont('times', 'bold').setFontSize(11);
            const headerLines = doc.splitTextToSize(headerText, contentWidth - (dates ? 45 : 0));
            const headerLineH = getLineHeight(11);
            headerLines.forEach((line: string, idx: number) => {
              checkPage(headerLineH + 2);
              doc.setFont('times', 'bold').setFontSize(11);
              doc.text(line, marginLeft, y);
              if (idx === 0 && dates) {
                doc.setFont('times', 'normal').setFontSize(10);
                doc.text(sanitizeText(dates), marginRight, y, { align: 'right' });
              }
              y += headerLineH;
            });
          }

          if (location) {
            checkPage(8);
            doc.setFont('times', 'normal').setFontSize(10);
            doc.text(sanitizeText(location), marginLeft, y);
            y += getLineHeight(10);
          }

          if (details) {
            y += 1;
            renderMultiLine(details, marginLeft, contentWidth, 10);
          }

          const bullets = entry.bullets || [];
          if (Array.isArray(bullets) && bullets.length > 0) {
            y += 1;
            const bulletLineH = getLineHeight(10);
            bullets.forEach((b: string) => {
              const cleanBullet = sanitizeText(b);
              if (!cleanBullet) return;
              doc.setFont('times', 'normal').setFontSize(10);
              const bLines = doc.splitTextToSize(`- ${cleanBullet}`, contentWidth - 8);
              bLines.forEach((line: string) => {
                checkPage(bulletLineH + 2);
                doc.text(line, marginLeft + 5, y);
                y += bulletLineH;
              });
              y += 1;
            });
          }

          const techStack = entry.tech_stack || [];
          if (Array.isArray(techStack) && techStack.length > 0) {
            checkPage(8);
            doc.setFont('times', 'italic').setFontSize(9);
            const techText = `Tech Stack: ${techStack.map(sanitizeText).join(', ')}`;
            const techLines = doc.splitTextToSize(techText, contentWidth - 8);
            techLines.forEach((line: string) => {
              checkPage(getLineHeight(9) + 2);
              doc.text(line, marginLeft + 5, y);
              y += getLineHeight(9);
            });
          }

          y += 5;
        });
      };

      const renderList = (content: any) => {
        if (!content) return;
        const items: any[] = Array.isArray(content) ? content : [content];
        const lineH = getLineHeight(10);
        items.forEach((item: any) => {
          let displayText = typeof item === 'string' ? item
            : typeof item === 'object' ? (item.title || item.name || item.label || JSON.stringify(item))
            : String(item);
          const cleanText = sanitizeText(displayText);
          if (!cleanText) return;
          doc.setFont('times', 'normal').setFontSize(10);
          const itemLines = doc.splitTextToSize(`- ${cleanText}`, contentWidth - 8);
          itemLines.forEach((line: string) => {
            checkPage(lineH + 2);
            doc.text(line, marginLeft + 5, y);
            y += lineH;
          });
          y += 1;
        });
        y += 2;
      };

      const renderTextBlock = (content: string) => {
        const clean = sanitizeText(content);
        if (!clean) return;
        renderMultiLine(clean, marginLeft, contentWidth, 11);
        y += 3;
      };

      const renderSkillRow = (label: string, skills: string[]) => {
        if (!skills || skills.length === 0) return;
        checkPage(12);

        const catLabel = sanitizeText(label) + ':';
        doc.setFont('times', 'bold').setFontSize(10);
        const labelWidth = doc.getTextWidth(catLabel);
        doc.text(catLabel, marginLeft + 5, y);

        const skillStartX = marginLeft + 5 + labelWidth + 3;
        const skillMaxWidth = marginRight - skillStartX;

        doc.setFont('times', 'normal').setFontSize(10);
        const skillText = skills.map(sanitizeText).join(', ');
        const skillLines = doc.splitTextToSize(skillText, Math.max(skillMaxWidth, 50));
        const lineH = getLineHeight(10);

        skillLines.forEach((line: string, idx: number) => {
          if (idx === 0) {
            doc.text(line, skillStartX, y);
          } else {
            y += lineH;
            checkPage(lineH + 2);
            doc.text(line, skillStartX, y);
          }
        });
        y += lineH + 2;
      };

      // ========================================
      // PDF GENERATION
      // ========================================

      // 1. HEADER
      const name = sanitizeText(master.personal?.name || 'RESUME').toUpperCase();
      doc.setFont('times', 'bold').setFontSize(22);
      doc.text(name, 105, y, { align: 'center' });
      y += 9;

      const contactParts: string[] = [];
      if (master.personal?.email) contactParts.push(sanitizeText(master.personal.email));
      if (master.personal?.phone) contactParts.push(sanitizeText(master.personal.phone));
      const links = master.personal?.links || [];
      if (Array.isArray(links)) {
        links.forEach((link: string) => {
          if (link && typeof link === 'string') contactParts.push(sanitizeText(link));
        });
      }
      if (contactParts.length > 0) {
        doc.setFont('times', 'normal').setFontSize(10);
        const contactLine = contactParts.join(' | ');
        const contactLines = doc.splitTextToSize(contactLine, contentWidth);
        contactLines.forEach((line: string) => {
          doc.text(line, 105, y, { align: 'center' });
          y += getLineHeight(10);
        });
        y += 6;
      } else {
        y += 6;
      }

      // 2. SUMMARY
      if (selections.summary) {
        addSectionHeader('PROFESSIONAL SUMMARY');
        renderTextBlock(selections.summary);
      }

      // 3. ALL SECTIONS
      let skillsRendered = false;

      allSections.forEach((section: any) => {
        if (!section || typeof section !== 'object') return;

        const sectionId = section.section_id?.toLowerCase() || '';
        const sectionTitle = section.section_title || sectionId.replace(/_/g, ' ').toUpperCase();
        const sectionType = section.type || 'text';
        const content = section.content;

        // Skip summary (already rendered from user selection)
        if (isSummarySection(sectionId)) return;

        // ✅ FIX: Skip contact/personal (already rendered in header)
        if (isContactSection(sectionId)) return;

        // SKILLS: Use Step 2 selections
        if (isSkillsSection(sectionId) && !skillsRendered) {
          skillsRendered = true;

          const hasTech = selectedTechSkills.length > 0;
          const hasSoft = selectedSoftSkills.length > 0;

          if (hasTech || hasSoft) {
            addSectionHeader(sectionTitle || 'SKILLS & COMPETENCIES');

            if (hasTech) {
              selectedTechSkills.forEach((cat: any) => {
                if (cat.category && Array.isArray(cat.items) && cat.items.length > 0) {
                  renderSkillRow(cat.category, cat.items);
                }
              });
            }

            if (hasSoft) {
              renderSkillRow('Soft Skills', selectedSoftSkills);
            }

            y += 3;
          }
          return;
        }

        if (isSkillsSection(sectionId) && skillsRendered) return;

        // ALL OTHER SECTIONS from ORIGINAL data
        addSectionHeader(sectionTitle);

        if (sectionType === 'entries') {
          renderEntries(Array.isArray(content) ? content : []);
        } else if (sectionType === 'categorized_list') {
          if (Array.isArray(content)) {
            content.forEach((cat: any) => {
              if (cat && cat.category && Array.isArray(cat.items)) {
                renderSkillRow(cat.category, cat.items);
              }
            });
          }
        } else if (sectionType === 'list') {
          renderList(content);
        } else {
          renderTextBlock(typeof content === 'string' ? content : JSON.stringify(content || ''));
        }
      });

      // 4. Fallback skills
      if (!skillsRendered) {
        const hasTech = selectedTechSkills.length > 0;
        const hasSoft = selectedSoftSkills.length > 0;
        if (hasTech || hasSoft) {
          addSectionHeader('SKILLS & COMPETENCIES');
          if (hasTech) {
            selectedTechSkills.forEach((cat: any) => {
              if (cat.category && Array.isArray(cat.items) && cat.items.length > 0) {
                renderSkillRow(cat.category, cat.items);
              }
            });
          }
          if (hasSoft) {
            renderSkillRow('Soft Skills', selectedSoftSkills);
          }
        }
      }

      // 5. OUTPUT
      if (isDownload) {
        const safeName = sanitizeText(master.personal?.name || 'Resume').replace(/\s+/g, '_');
        doc.save(`${safeName}_Tailored_CV.pdf`);
        return undefined;
      } else {
        return doc.output('bloburl');
      }
    },
    [master, selections, allSections, selectedTechSkills, selectedSoftSkills]
  );

  useEffect(() => {
    try {
      const url = generatePDFBlob(false) as unknown as string;
      setPdfUrl(url);
      return () => { if (url) URL.revokeObjectURL(url); };
    } catch (e) {
      console.error('PDF generation error:', e);
    }
  }, [generatePDFBlob]);

  const totalSections = allSections.filter(
    (s: any) => !isContactSection(s.section_id?.toLowerCase() || '')
  ).length;
  const totalTechCats = selectedTechSkills.length;
  const totalTechSkills = selectedTechSkills.reduce((sum, c) => sum + (c.items?.length || 0), 0);

  return (
    <div style={pageContainer}>
      <div style={reportCard}>
        <h2 style={{ margin: 0, color: '#1e1b4b' }}>Optimization Report</h2>
        <p style={narrativeText}>
          Your resume has been restructured with {totalSections} sections.
          Technical skills organized into {totalTechCats} categories ({totalTechSkills} keywords)
          plus {selectedSoftSkills.length} soft skills.
          Summary and skills are tailored to the JD. All other sections preserved as original.
        </p>

        <div style={statsGrid}>
          <StatCard label="Overall Match" value={`${audit?.score || 0}%`} color="#4f46e5" />
          <StatCard label="Keyword Match" value={`+${audit?.metrics?.keyword_score || 0}%`} color="#10b981" />
          <StatCard label="Role Alignment" value={`${audit?.metrics?.role_alignment || 0}%`} color="#6366f1" />
          <StatCard label="Impact Score" value={`${audit?.metrics?.impact_score || 0}%`} color="#f59e0b" />
        </div>

        <div style={changesSummary}>
          {allSections
            .filter((s: any) => !isContactSection(s.section_id?.toLowerCase() || ''))
            .map((s: any, i: number) => {
              const sId = s.section_id?.toLowerCase() || '';
              const isOpt = isSummarySection(sId) || isSkillsSection(sId);
              return (
                <div key={i} style={changeItem}>
                  <span style={isOpt ? changeBadgeOptimized : changeBadgeOriginal}>
                    {isOpt ? 'OPTIMIZED' : 'ORIGINAL'}
                  </span>
                  <span style={changeText}>
                    {s.section_title || s.section_id}
                    {isOpt ? ' -- tailored to JD' : ' -- preserved as-is'}
                  </span>
                </div>
              );
            })}
        </div>

        <div style={actionRow}>
          <button onClick={() => generatePDFBlob(true)} style={primaryBtn}>
            Download Tailored CV 📥
          </button>
          <button onClick={onRestart} style={secondaryBtn}>Reset Process</button>
        </div>
      </div>

      <div style={previewWrapper}>
        <h4 style={previewLabel}>FINAL DOCUMENT PREVIEW</h4>
        <div style={iframeContainer}>
          {pdfUrl ? (
            <iframe src={pdfUrl} style={iframeStyle} title="Resume Preview" />
          ) : (
            <div style={loadingBox}>Assembling Document...</div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => (
  <div style={{ ...statCardStyle, borderTop: `4px solid ${color}` }}>
    <span style={statLabel}>{label}</span>
    <h3 style={{ margin: '5px 0 0 0', color, fontSize: '24px' }}>{value}</h3>
  </div>
);

const pageContainer: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '30px', padding: '40px 20px', backgroundColor: '#f1f5f9', minHeight: '100vh' };
const reportCard: React.CSSProperties = { backgroundColor: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 25px rgba(0,0,0,0.05)', maxWidth: '1000px', margin: '0 auto', width: '100%' };
const narrativeText: React.CSSProperties = { fontSize: '15px', color: '#475569', lineHeight: '1.6', marginTop: '15px' };
const statsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '25px' };
const statCardStyle: React.CSSProperties = { backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center' };
const statLabel: React.CSSProperties = { fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 };
const changesSummary: React.CSSProperties = { marginTop: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' };
const changeItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px' };
const changeBadgeOptimized: React.CSSProperties = { fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#d1fae5', color: '#065f46', minWidth: '75px', textAlign: 'center' };
const changeBadgeOriginal: React.CSSProperties = { fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#e0e7ff', color: '#3730a3', minWidth: '75px', textAlign: 'center' };
const changeText: React.CSSProperties = { fontSize: '12px', color: '#475569' };
const actionRow: React.CSSProperties = { display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px', borderTop: '1px solid #f1f5f9', paddingTop: '25px' };
const previewWrapper: React.CSSProperties = { maxWidth: '1000px', margin: '0 auto', width: '100%', height: '1200px', display: 'flex', flexDirection: 'column' };
const iframeContainer: React.CSSProperties = { flex: 1, backgroundColor: '#525659', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' };
const iframeStyle: React.CSSProperties = { width: '100%', height: '100%', border: 'none' };
const previewLabel: React.CSSProperties = { fontSize: '11px', color: '#64748b', textAlign: 'center', marginBottom: '10px', fontWeight: 700, letterSpacing: '2px' };
const primaryBtn: React.CSSProperties = { padding: '14px 28px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' };
const secondaryBtn: React.CSSProperties = { padding: '14px 24px', backgroundColor: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' };
const loadingBox: React.CSSProperties = { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' };