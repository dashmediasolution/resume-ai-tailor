import json


def robust_cv_mapper(client, raw_text):
    """
    Dynamically maps ANY resume into structured JSON.
    Detects skill categories/subdivisions automatically.
    """

    mapping_prompt = f"""TASK: You are a precise resume parser. Extract ALL content from this resume into structured JSON.

CRITICAL RULES:
1. DETECT every section that exists in the resume. Do NOT skip ANY section.
2. Do NOT hardcode sections. Whatever sections exist in the resume, capture them.
3. Preserve ALL details exactly as written: full names, full locations, full dates, full descriptions.
4. The "personal" and "all_sections" keys are mandatory in output.

=== SKILL DETECTION (VERY IMPORTANT) ===
5. When you find a skills section, DETECT if it has subcategories/subdivisions.
   
   Example A - CATEGORIZED skills (common in tech, marketing, etc.):
   "Languages: JavaScript, Python, SQL
    Frameworks: React, Node.js
    Tools: Git, Docker"
   → type = "categorized_list", content = array of category objects
   
   Example B - FLAT skills (simple list):
   "Skills: Communication, Leadership, Project Management"
   → type = "list", content = array of strings

   Example C - Skills embedded in summary/header area:
   "Personal attributes include: Quantitative Analysis, Project Management, Financial Skills"
   → Create a separate skills section with these items

6. For CATEGORIZED skills, each category object must have:
   - "category": the exact category label from resume (e.g., "Languages", "Frameworks", "Clinical Skills")
   - "items": array of individual skills in that category

7. CAPTURE ALL skill categories. Do NOT merge or skip any.
   If the resume has 7 skill categories, output all 7.

=== OTHER SECTIONS ===
8. Each section in "all_sections" must have:
   - "section_id": lowercase snake_case key
   - "section_title": EXACT heading from resume
   - "type": one of ["text", "list", "entries", "categorized_list"]
   - "content": the actual data

9. For "entries" type, each entry must capture:
   title/role/degree, organization/company/institution, location (city, state), dates, bullets
   
10. Preserve ORIGINAL ORDER of sections.

RESUME TEXT:
---
{raw_text}
---

RETURN THIS EXACT JSON STRUCTURE:
{{
    "master_record": {{
        "personal": {{
            "name": "",
            "email": "",
            "phone": "",
            "links": []
        }},
        "all_sections": [
            {{
                "section_id": "summary",
                "section_title": "PROFESSIONAL SUMMARY",
                "type": "text",
                "content": "Full summary text..."
            }},
            {{
                "section_id": "skills",
                "section_title": "TECHNICAL SKILLS",
                "type": "categorized_list",
                "content": [
                    {{
                        "category": "Languages",
                        "items": ["JavaScript", "TypeScript", "Python"]
                    }},
                    {{
                        "category": "Frameworks",
                        "items": ["React", "Node.js", "Django"]
                    }},
                    {{
                        "category": "Soft Skills",
                        "items": ["Communication", "Leadership"]
                    }}
                ]
            }},
            {{
                "section_id": "experience",
                "section_title": "EXPERIENCE",
                "type": "entries",
                "content": [
                    {{
                        "title": "Software Engineer",
                        "organization": "Google",
                        "location": "Mountain View, CA",
                        "dates": "2020 - present",
                        "bullets": ["Built X", "Led Y"]
                    }}
                ]
            }},
            {{
                "section_id": "education",
                "section_title": "EDUCATION",
                "type": "entries",
                "content": [
                    {{
                        "title": "B.S. Computer Science",
                        "organization": "MIT",
                        "location": "Cambridge, MA",
                        "dates": "2020",
                        "bullets": []
                    }}
                ]
            }},
            {{
                "section_id": "certifications",
                "section_title": "CERTIFICATIONS",
                "type": "list",
                "content": ["AWS Certified", "Google Cloud"]
            }}
        ]
    }},
    "validation_report": {{
        "is_complete": true,
        "total_sections_found": 0,
        "section_names": [],
        "missing_critical_fields": [],
        "suggestions": []
    }}
}}

IMPORTANT:
- Examples above are FORMAT examples only. Detect actual sections from the resume.
- If skills have subcategories like "Languages:", "Frameworks:", etc. → use "categorized_list" type.
- If skills are just a flat list → use "list" type.
- Do NOT skip any skill category. If the resume has 7 categories, include all 7.
- Do NOT invent sections that do not exist.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": mapping_prompt}],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        result = json.loads(response.choices[0].message.content)

        master = result.get("master_record", {})

        if "personal" not in master:
            master["personal"] = {"name": "", "email": "", "phone": "", "links": []}

        if "all_sections" not in master or not isinstance(master["all_sections"], list):
            master["all_sections"] = []

        # Ensure each section has required keys
        for section in master["all_sections"]:
            if "section_id" not in section:
                section["section_id"] = section.get("section_title", "unknown").lower().replace(" ", "_")
            if "section_title" not in section:
                section["section_title"] = section.get("section_id", "UNKNOWN").upper()
            if "type" not in section:
                section["type"] = "text"
            if "content" not in section:
                section["content"] = "" if section["type"] == "text" else []

        result["master_record"] = master

        # Update validation report
        section_names = [s.get("section_title", "UNKNOWN") for s in master["all_sections"]]
        validation = result.get("validation_report", {})
        validation["total_sections_found"] = len(section_names)
        validation["section_names"] = section_names
        result["validation_report"] = validation

        # DEBUG
        print(f"DEBUG MAPPER: Found {len(section_names)} sections: {section_names}")
        for s in master["all_sections"]:
            if s.get("type") == "categorized_list":
                cats = s.get("content", [])
                if isinstance(cats, list):
                    cat_names = [c.get("category", "?") for c in cats if isinstance(c, dict)]
                    print(f"  -> Skills categories found: {cat_names}")
                    for c in cats:
                        if isinstance(c, dict):
                            print(f"     {c.get('category')}: {len(c.get('items', []))} items")

        return result

    except Exception as e:
        print(f"Mapping/Validation Error: {e}")
        import traceback
        traceback.print_exc()
        return None