import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';

export const Step3_FinalPreview: React.FC<any> = ({ data, selections, onRestart }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const master = data.master_record;
  const optimized = data.optimized_sections;
  const audit = data.audit;

  const generatePDFBlob = (isDownload: boolean = false): string | URL | undefined => {
    const doc = new jsPDF();
    let y = 20;

    // Helper to manage page overflow and headers
    const addSectionHeader = (title: string) => {
      if (y > 260) { 
        doc.addPage(); 
        y = 20; 
      }
      doc.setFont("times", "bold").setFontSize(14).text(title, 20, y);
      doc.line(20, y + 1, 190, y + 1);
      y += 8;
    };

    // 1. HEADER - Standardized Format
    doc.setFont("times", "bold").setFontSize(22).text(master.personal?.name?.toUpperCase() || "RESUME", 105, y, { align: 'center' });
    y += 10;
    doc.setFont("times", "normal").setFontSize(10).text(`${master.personal?.email} | ${master.personal?.phone}`, 105, y, { align: 'center' });
    y += 15;

    // 2. SUMMARY (4-5 lines as requested)
    addSectionHeader("PROFESSIONAL SUMMARY");
    doc.setFont("times", "normal").setFontSize(11);
    const sLines = doc.splitTextToSize(selections.summary || "", 170);
    doc.text(sLines, 20, y);
    y += (sLines.length * 5) + 10;

    // 3. EDUCATION (NCU BCA | 8.90 CGPA)
    addSectionHeader("EDUCATION");
    master.education?.forEach((edu: any) => {
      doc.setFont("times", "bold").text(edu.degree, 20, y);
      doc.setFont("times", "normal").text(edu.year || "", 190, y, { align: 'right' });
      y += 5;
      doc.text(`${edu.inst} | ${edu.details || ""}`, 20, y);
      y += 8;
    });
    y += 4;

    // 4. SKILLS SECTION (Technical & Soft)
    addSectionHeader("SKILLS & COMPETENCIES");
    
    // Technical Skills
    doc.setFont("times", "bold").setFontSize(11).text("Technical Skills: ", 20, y);
    doc.setFont("times", "normal");
    const techText = selections.techSkills?.join(", ") || "";
    const techLines = doc.splitTextToSize(techText, 140);
    doc.text(techLines, 50, y);
    y += (techLines.length * 5) + 5;

    // Soft Skills - FIXED: Added back to the PDF mapping
    if (y > 275) { doc.addPage(); y = 20; }
    doc.setFont("times", "bold").text("Soft Skills: ", 20, y);
    doc.setFont("times", "normal");
    const softText = selections.softSkills?.join(", ") || "";
    const softLines = doc.splitTextToSize(softText, 140);
    doc.text(softLines, 50, y);
    y += (softLines.length * 5) + 10;

    // 5. EXPERIENCE & INTERNSHIPS (Combined for flow)
    const allExp = [...(optimized.experience || []), ...(master.internships || [])];
    if (allExp.length > 0) {
      addSectionHeader("PROFESSIONAL EXPERIENCE");
      allExp.forEach((job: any) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFont("times", "bold").text(`${job.company} - ${job.role}`, 20, y); y += 6;
        doc.setFont("times", "normal");
        const bullets = job.optimized_bullets || job.bullets || [];
        bullets.forEach((b: string) => {
          if (y > 275) { doc.addPage(); y = 20; }
          const bLines = doc.splitTextToSize(`• ${b}`, 165);
          doc.text(bLines, 25, y); y += (bLines.length * 5);
        });
        y += 5;
      });
    }

    // 6. PROJECTS (Ensuring these likely fall on Page 2)
    if (master.projects?.length > 0) {
      addSectionHeader("PROJECTS");
      master.projects.forEach((p: any) => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont("times", "bold").text(p.title, 20, y); y += 5;
        doc.setFont("times", "normal");
        const pLines = doc.splitTextToSize(p.desc || p.description || "", 170);
        doc.text(pLines, 20, y); y += (pLines.length * 5) + 6;
      });
    }

    // 7. ACHIEVEMENTS & CERTIFICATIONS (NPTEL, IIT Goa, Coding Ninjas)
    if ((master.achievements?.length || 0) + (master.certifications?.length || 0) > 0) {
        addSectionHeader("ADDITIONAL CREDENTIALS");
        const extras = [...(master.achievements || []), ...(master.certifications || [])];
        extras.forEach(item => {
            if (y > 280) { doc.addPage(); y = 20; }
            const itemLines = doc.splitTextToSize(`• ${item}`, 165);
            doc.text(itemLines, 25, y); y += (itemLines.length * 6);
        });
    }

    if (isDownload) {
      doc.save(`${master.personal?.name}_Tailored_CV.pdf`);
      return undefined;
    } else {
      return doc.output('bloburl');
    }
  };

  useEffect(() => {
    const url = generatePDFBlob(false) as unknown as string;
    setPdfUrl(url);
    return () => { if(url) URL.revokeObjectURL(url); };
  }, [selections]);

  return (
    <div style={pageContainer}>
      <div style={reportCard}>
        <h2 style={{ margin: 0, color: '#1e1b4b' }}>Optimization Success Report</h2>
        <p style={narrativeText}>
          Your resume has been expanded into a two-page professional format to ensure 
          high-readability for your technical projects and academic background. 
          By clustering your skills and optimizing your work history bullets, 
          we've increased your keyword density for ATS systems.
        </p>
        
        <div style={statsGrid}>
           <StatCard label="Overall Match" value={`${audit.score}%`} color="#4f46e5" />
           <StatCard label="Keyword Match" value={`+${audit.metrics?.keyword_score}%`} color="#10b981" />
           <StatCard label="Role Alignment" value={`${audit.metrics?.role_alignment}%`} color="#6366f1" />
           <StatCard label="Impact Score" value={`${audit.metrics?.impact_score}%`} color="#f59e0b" />
        </div>

        <div style={actionRow}>
           <button onClick={() => generatePDFBlob(true)} style={primaryBtn}>Download 2-Page CV 📥</button>
           <button onClick={onRestart} style={secondaryBtn}>Reset Process</button>
        </div>
      </div>

      <div style={previewWrapper}>
        <h4 style={labelStyle}>FINAL DOCUMENT PREVIEW (2 PAGES)</h4>
        <div style={iframeContainer}>
          {pdfUrl ? (
            <iframe src={pdfUrl} style={iframeStyle} title="Resume Preview" />
          ) : (
            <div style={loadingBox}>Assembling 2-Page Document...</div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => (
    <div style={{ ...statCardStyle, borderTop: `4px solid ${color}` }}>
      <span style={statLabel}>{label}</span>
      <h3 style={{ margin: '5px 0 0 0', color: color, fontSize: '24px' }}>{value}</h3>
    </div>
);
  
const pageContainer: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '30px', padding: '40px 20px', backgroundColor: '#f1f5f9', minHeight: '100vh' };
const reportCard: React.CSSProperties = { backgroundColor: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 25px rgba(0,0,0,0.05)', maxWidth: '1000px', margin: '0 auto', width: '100%' };
const narrativeText: React.CSSProperties = { fontSize: '15px', color: '#475569', lineHeight: '1.6', marginTop: '15px' };
const statsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '25px' };
const statCardStyle: React.CSSProperties = { backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center' };
const statLabel: React.CSSProperties = { fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 };
const actionRow: React.CSSProperties = { display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '25px' };
const previewWrapper: React.CSSProperties = { maxWidth: '1000px', margin: '0 auto', width: '100%', height: '1200px', display: 'flex', flexDirection: 'column' };
const iframeContainer: React.CSSProperties = { flex: 1, backgroundColor: '#525659', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' };
const iframeStyle: React.CSSProperties = { width: '100%', height: '100%', border: 'none' };
const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#64748b', textAlign: 'center', marginBottom: '10px', fontWeight: 700, letterSpacing: '2px' };
const primaryBtn: React.CSSProperties = { padding: '14px 28px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' };
const secondaryBtn: React.CSSProperties = { padding: '14px 24px', backgroundColor: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' };
const loadingBox: React.CSSProperties = { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' };