import os
import json
import fitz
import docx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv
from utils import robust_cv_mapper
import traceback

load_dotenv()
app = FastAPI()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def sanitize_extracted_text(text: str) -> str:
    if not text:
        return ""
    replacements = {
        '\ufb00': 'ff', '\ufb01': 'fi', '\ufb02': 'fl',
        '\ufb03': 'ffi', '\ufb04': 'ffl', '\ufb05': 'ft', '\ufb06': 'st',
        '\u2018': "'", '\u2019': "'", '\u201a': "'",
        '\u201c': '"', '\u201d': '"', '\u201e': '"',
        '\u0060': "'", '\u00b4': "'",
        '\u2013': '-', '\u2014': '--', '\u2012': '-', '\u2015': '--',
        '\u00a0': ' ', '\u200b': '', '\u200c': '', '\u200d': '',
        '\u2060': '', '\ufeff': '', '\u00ad': '',
        '\u2026': '...', '\u2022': '-', '\u2023': '-',
        '\u25cf': '-', '\u25cb': '-', '\u2027': '-', '\u00b7': '-',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def sanitize_deep(obj):
    if isinstance(obj, str):
        return sanitize_extracted_text(obj)
    elif isinstance(obj, list):
        return [sanitize_deep(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: sanitize_deep(v) for k, v in obj.items()}
    return obj


def extract_text_from_file(file_path):
    extension = os.path.splitext(file_path)[1].lower()
    text = ""
    try:
        if extension == ".pdf":
            with fitz.open(file_path) as doc:
                for page in doc:
                    text += page.get_text()
        elif extension == ".docx":
            doc = docx.Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
        elif extension == ".doc":
            raise Exception("Legacy .doc format not supported. Please save as .docx or .pdf.")
        else:
            raise Exception(f"Unsupported file extension: {extension}")
    except Exception as e:
        print(f"Extraction Error: {e}")
        raise e
    text = sanitize_extracted_text(text)
    return text


def extract_skill_categories_from_master(all_sections):
    """
    Splits skills into professional/technical categories and soft skills.
    Works for any domain: tech, psychology, marketing, finance, etc.
    """
    tech_categories = []
    soft_skills = []

    for section in all_sections:
        sid = section.get("section_id", "").lower()
        stype = section.get("type", "")
        content = section.get("content", [])

        is_skills = (
            "skill" in sid or
            sid in ["competencies", "proficiencies", "core_competencies",
                     "skills_competencies", "skills_&_competencies"]
        )
        if not is_skills:
            continue

        if stype == "categorized_list" and isinstance(content, list):
            for cat in content:
                if not isinstance(cat, dict) or "category" not in cat:
                    continue
                cat_name_lower = cat["category"].lower()
                items = cat.get("items", [])

                soft_keywords = ["soft", "interpersonal", "personal attribute",
                                 "personal skill", "people skill"]
                if any(kw in cat_name_lower for kw in soft_keywords):
                    soft_skills.extend(items)
                else:
                    tech_categories.append({
                        "category": cat["category"],
                        "items": items
                    })

        elif stype == "list" and isinstance(content, list):
            if content:
                tech_categories.append({
                    "category": "Professional Skills",
                    "items": content
                })

    return tech_categories, soft_skills


@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...), job_description: str = Form(...)):
    if not os.path.exists("uploads"):
        os.makedirs("uploads")

    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as f:
        f.write(file.file.read())

    try:
        resume_raw_text = extract_text_from_file(file_location)

        # --- STEP 1: DYNAMIC FACTUAL MAPPING ---
        mapping_data = robust_cv_mapper(client, resume_raw_text)
        print("DEBUG: Mapping data received:", "YES" if mapping_data else "NO")

        if not mapping_data:
            raise Exception("Failed to extract structured data from the document.")

        master_record = mapping_data.get("master_record", {})
        validation_report = mapping_data.get("validation_report", {})
        master_record = sanitize_deep(master_record)
        all_sections = master_record.get("all_sections", [])

        # Extract original skill categories (split tech/soft)
        original_tech_categories, original_soft_skills = extract_skill_categories_from_master(all_sections)

        section_summary = []
        for section in all_sections:
            section_summary.append({
                "section_id": section.get("section_id"),
                "section_title": section.get("section_title"),
                "type": section.get("type")
            })

        print(f"DEBUG: Sections detected: {json.dumps(section_summary, indent=2)}")
        print(f"DEBUG: Original tech categories: {len(original_tech_categories)}")
        for tc in original_tech_categories:
            print(f"  {tc['category']}: {len(tc['items'])} items")
        print(f"DEBUG: Original soft skills: {original_soft_skills}")

        # Build context strings for prompt
        tech_cats_str = json.dumps(original_tech_categories, indent=2)
        soft_skills_str = json.dumps(original_soft_skills, indent=2)

        # --- STEP 2: AUDIT & STRATEGIC TAILORING ---
        r2_prompt = f"""JD (Job Description):
{job_description}

MASTER RECORD (all extracted resume data):
{json.dumps(master_record, indent=2)}

SECTIONS FOUND IN RESUME:
{json.dumps(section_summary, indent=2)}

ORIGINAL PROFESSIONAL/TECHNICAL SKILL CATEGORIES (from resume):
{tech_cats_str}

ORIGINAL SOFT SKILLS (from resume):
{soft_skills_str}

TASK: Audit the resume against the JD and generate optimized content.

=== PART A: AUDIT ===
Analyze the gap between the resume and the JD.

=== PART B: SUMMARY OPTIONS ===
Generate exactly 3 professional summary variations (4-5 lines each).
Each must be tailored to the JD while truthful to the candidate's background.

=== PART C: SKILLS OPTIMIZATION (TECH vs SOFT separated) ===

PROFESSIONAL/TECHNICAL SKILLS:
1. PRESERVE every original category name exactly (Languages, Frameworks, Clinical, etc.)
2. PRESERVE every original skill within each category - do NOT remove any
3. ADD new JD-relevant skills to the appropriate existing categories
4. You MAY add entirely new categories if the JD requires skills that dont fit existing ones
   - Mark new categories by adding "(New)" at the end of the category name
5. Generate exactly 3 variation options
6. Each option = array of category objects, each with "category" and "items"
7. Original skills MUST appear in EVERY option. Only the NEW additions differ between options
8. The category names must be domain-appropriate:
   - Tech/Dev: Languages, Frameworks, Frontend, Backend, DevOps, GenAI, etc.
   - Psychology: Clinical Skills, Assessment, Research Methods, etc.
   - Marketing: Digital Marketing, Analytics, Content Strategy, etc.
   - Whatever the resume domain uses, keep those names

SOFT SKILLS:
1. PRESERVE all original soft skills - do NOT remove any
2. ADD new JD-relevant interpersonal/soft skills
3. Generate exactly 3 variation options
4. Each option = flat array of skill strings (not categorized)
5. Each option MUST have at least 6 skills total
6. If the original resume has NO soft skills, generate appropriate ones from JD context
7. Original soft skills MUST appear in EVERY option. Only NEW additions differ

=== PART D: ALL OTHER SECTIONS ===
Include ALL sections from master record in optimized_sections.
Keep all factual data EXACTLY as original. Do NOT drop ANY section.

RETURN THIS EXACT JSON:
{{
    "intent_suggestion": "Advancing/Pivoting - explanation",
    "audit": {{
        "score": 0,
        "metrics": {{ "keyword_score": 0, "impact_score": 0, "role_alignment": 0 }},
        "summary_critique": "",
        "comparison_table": [
            {{ "category": "", "jd_requirement": "", "user_status": "", "gap": "" }}
        ],
        "action_plan": "",
        "roadmap": ["Step 1", "Step 2", "Step 3"]
    }},
    "summary_options": [
        "Summary variation 1 (4-5 lines)...",
        "Summary variation 2 (4-5 lines)...",
        "Summary variation 3 (4-5 lines)..."
    ],
    "skills_data": {{
        "original_tech_categories": {tech_cats_str},
        "original_soft_skills": {soft_skills_str},
        "tech": {{
            "options": [
                [
                    {{ "category": "CategoryName", "items": ["orig1", "orig2", "NEW1", "NEW2"] }},
                    {{ "category": "AnotherCat", "items": ["orig1", "NEW1"] }},
                    {{ "category": "NewCat (New)", "items": ["NEW1", "NEW2", "NEW3"] }}
                ],
                [
                    {{ "category": "CategoryName", "items": ["orig1", "orig2", "DIFF_NEW1"] }},
                    {{ "category": "AnotherCat", "items": ["orig1", "DIFF_NEW1"] }}
                ],
                [
                    {{ "category": "CategoryName", "items": ["orig1", "orig2", "ALT_NEW1"] }},
                    {{ "category": "AnotherCat", "items": ["orig1", "ALT_NEW1"] }}
                ]
            ]
        }},
        "soft": {{
            "options": [
                ["orig_soft1", "orig_soft2", "NEW_soft1", "NEW_soft2", "NEW_soft3", "NEW_soft4"],
                ["orig_soft1", "orig_soft2", "DIFF_soft1", "DIFF_soft2", "DIFF_soft3", "DIFF_soft4"],
                ["orig_soft1", "orig_soft2", "ALT_soft1", "ALT_soft2", "ALT_soft3", "ALT_soft4"]
            ]
        }}
    }},
    "optimized_sections": [
        {{
            "section_id": "experience",
            "section_title": "EXPERIENCE",
            "type": "entries",
            "content": [
                {{
                    "title": "Role as original",
                    "organization": "Company as original",
                    "location": "City, State as original",
                    "dates": "dates as original",
                    "optimized_bullets": ["bullet1", "bullet2"]
                }}
            ]
        }}
    ]
}}

CRITICAL:
- skills_data.tech.options MUST have exactly 3 options.
- skills_data.soft.options MUST have exactly 3 options.
- Each tech option = array of category objects with "category" and "items".
- Each soft option = flat array of strings.
- EVERY original skill must appear in EVERY option.
- optimized_sections MUST contain ALL sections from the resume.
- Use only plain ASCII. No smart quotes or special Unicode.
"""

        r2 = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": r2_prompt}],
            response_format={"type": "json_object"},
            temperature=0.4
        )

        res2_content = r2.choices[0].message.content
        res2_content = sanitize_extracted_text(res2_content)
        res2 = json.loads(res2_content)

        # --- POST-PROCESSING ---
        optimized_sections = res2.get("optimized_sections", [])

        if isinstance(optimized_sections, dict):
            converted = []
            for key, value in optimized_sections.items():
                if isinstance(value, dict):
                    value["section_id"] = value.get("section_id", key)
                    converted.append(value)
            optimized_sections = converted if converted else []

        # Restore dropped sections
        optimized_ids = set()
        for s in optimized_sections:
            if isinstance(s, dict):
                optimized_ids.add(s.get("section_id"))

        original_sections = master_record.get("all_sections", [])
        for orig_section in original_sections:
            orig_id = orig_section.get("section_id")
            if orig_id and orig_id not in optimized_ids:
                print(f"DEBUG: Restoring dropped section: '{orig_section.get('section_title')}'")
                restored = {
                    "section_id": orig_id,
                    "section_title": orig_section.get("section_title", ""),
                    "type": orig_section.get("type", "text"),
                }
                content = orig_section.get("content", "")
                section_type = orig_section.get("type", "text")

                if section_type == "entries":
                    if isinstance(content, list):
                        for entry in content:
                            if isinstance(entry, dict) and "bullets" in entry:
                                entry["optimized_bullets"] = entry.get("bullets", [])
                    restored["content"] = content if isinstance(content, list) else []
                elif section_type in ["list", "categorized_list"]:
                    restored["content"] = content if isinstance(content, list) else []
                else:
                    restored["content"] = content
                optimized_sections.append(restored)

        # Restore missing locations/orgs
        for opt_section in optimized_sections:
            if not isinstance(opt_section, dict) or opt_section.get("type") != "entries":
                continue
            opt_id = opt_section.get("section_id")
            opt_content = opt_section.get("content", [])
            if not isinstance(opt_content, list):
                continue

            orig_match = None
            for orig_s in original_sections:
                if orig_s.get("section_id") == opt_id:
                    orig_match = orig_s
                    break
            if not orig_match:
                continue

            orig_content = orig_match.get("content", [])
            if not isinstance(orig_content, list):
                continue

            for i, opt_entry in enumerate(opt_content):
                if not isinstance(opt_entry, dict) or i >= len(orig_content):
                    continue
                orig_entry = orig_content[i]
                if not isinstance(orig_entry, dict):
                    continue
                if not opt_entry.get("location") and orig_entry.get("location"):
                    opt_entry["location"] = orig_entry["location"]
                if not opt_entry.get("organization") and orig_entry.get("organization"):
                    opt_entry["organization"] = orig_entry["organization"]
                if not opt_entry.get("dates") and orig_entry.get("dates"):
                    opt_entry["dates"] = orig_entry["dates"]

        optimized_sections = sanitize_deep(optimized_sections)
        res2["optimized_sections"] = optimized_sections

        # Validate skills_data
        skills_data = res2.get("skills_data", {})

        # Ensure original categories are preserved
        if not skills_data.get("original_tech_categories"):
            skills_data["original_tech_categories"] = original_tech_categories
        if not skills_data.get("original_soft_skills"):
            skills_data["original_soft_skills"] = original_soft_skills

        # Validate tech options
        tech_opts = skills_data.get("tech", {}).get("options", [])
        if not isinstance(tech_opts, list) or len(tech_opts) == 0:
            skills_data.setdefault("tech", {})["options"] = [original_tech_categories] if original_tech_categories else []
        else:
            valid = []
            for opt in tech_opts:
                if isinstance(opt, list):
                    cats = [c for c in opt if isinstance(c, dict) and "category" in c and "items" in c]
                    if cats:
                        valid.append(cats)
            skills_data["tech"]["options"] = valid if valid else ([original_tech_categories] if original_tech_categories else [])

        # Validate soft options
        soft_opts = skills_data.get("soft", {}).get("options", [])
        if not isinstance(soft_opts, list) or len(soft_opts) == 0:
            skills_data.setdefault("soft", {})["options"] = [original_soft_skills] if original_soft_skills else []
        else:
            valid = []
            for opt in soft_opts:
                if isinstance(opt, list):
                    valid.append([s for s in opt if isinstance(s, str)])
            skills_data["soft"]["options"] = valid if valid else ([original_soft_skills] if original_soft_skills else [])

        skills_data = sanitize_deep(skills_data)
        res2["skills_data"] = skills_data

        # Sanitize summary
        summary_options = res2.get("summary_options", [])
        if isinstance(summary_options, list):
            summary_options = [sanitize_extracted_text(s) if isinstance(s, str) else s for s in summary_options]
        res2["summary_options"] = summary_options

        res2["audit"] = sanitize_deep(res2.get("audit", {}))

        # Debug
        final_sections = [s.get("section_title", "?") for s in optimized_sections if isinstance(s, dict)]
        print(f"DEBUG: Final sections ({len(final_sections)}): {final_sections}")
        print(f"DEBUG: Summary options: {len(res2.get('summary_options', []))}")
        print(f"DEBUG: Tech skill options: {len(skills_data.get('tech', {}).get('options', []))}")
        print(f"DEBUG: Soft skill options: {len(skills_data.get('soft', {}).get('options', []))}")

        if os.path.exists(file_location):
            os.remove(file_location)

        return {
            "analysis": {
                "master_record": master_record,
                "intent_suggestion": sanitize_extracted_text(
                    res2.get("intent_suggestion", "Strategic tailoring applied.")
                ),
                "summary_options": res2.get("summary_options", []),
                "skills_data": res2.get("skills_data", {}),
                "optimized_sections": res2.get("optimized_sections", []),
                "audit": res2.get("audit", {}),
                "validation": validation_report
            }
        }

    except Exception as e:
        if os.path.exists(file_location):
            os.remove(file_location)
        print(f"--- BACKEND CRASH: {str(e)} ---")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)