import json

# Synonym Map to group diverse headers into standard keys
SECTION_MAP = {
    "personal": ["contact", "info", "identity", "links", "socials"],
    "summary": ["summary","professional summary", "objective", "profile", "introduction", "about me"],
    "education": ["education","academic background", "studies", "qualifications", "academics"],
    "experience": ["experience","work history", "employment", "professional background"],
    "internships": ["internships","trainee roles", "apprenticeships", "summer internship"],
    "projects": ["projects","personal builds", "technical projects", "portfolio"],
    "certifications": ["certifications","courses", "training", "nptel"],
    "achievements": ["achievements","awards", "honors", "milestones"]
}

def robust_cv_mapper(client, raw_text):
    map_instruction = json.dumps(SECTION_MAP, indent=2)

    mapping_prompt = f"TASK: Map Resume text into JSON. Perform a data completeness check.\nRESUME: {raw_text}\n" + """
    RETURN JSON SCHEMA:
    {
        "master_record": {
            "personal": { "name": "", "email": "", "phone": "", "links": [] },
            "summary": "",
            "education": [ { "inst": "", "degree": "", "year": "", "details": "" } ],
            "experience": [ { "company": "", "role": "", "dates": "", "bullets": [], "type": "job" } ],
            "internships": [ { "company": "", "role": "", "dates": "", "bullets": [], "type": "internship" } ],
            "projects": [ { "title": "", "desc": "", "tech_stack": [] } ],
            "certifications": [],
            "achievements": []
        },
        "validation_report": {
            "is_complete": true,
            "missing_critical_fields": [],
            "suggestions": []
        }
    }
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": mapping_prompt}],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Mapping/Validation Error: {e}")
        return None