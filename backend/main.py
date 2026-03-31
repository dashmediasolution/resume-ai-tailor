import os
import json
import fitz  # PyMuPDF for PDFs
import docx  # python-docx for DOCX
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

def extract_text_from_file(file_path):
    """
    Universally extracts text from PDF and DOCX files.
    """
    # ✅ FIX 1: os.path.splitext returns a tuple — index [1] to get extension
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
    return text

@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...), job_description: str = Form(...)):
    if not os.path.exists("uploads"):
        os.makedirs("uploads")

    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as f:
        f.write(file.file.read())

    try:
        # Use the universal extractor
        resume_raw_text = extract_text_from_file(file_location)

        # --- STEP 1: ROBUST FACTUAL MAPPING & VALIDATION ---
        mapping_data = robust_cv_mapper(client, resume_raw_text)
        print("DEBUG: Mapping data received:", "YES" if mapping_data else "NO")

        if not mapping_data:
            raise Exception("Failed to extract structured data from the document.")

        master_record = mapping_data.get("master_record", {})
        validation_report = mapping_data.get("validation_report", {})

        # --- STEP 2: AUDIT & STRATEGIC TAILORING ---
        r2_prompt = f"JD: {job_description}\nMASTER: {json.dumps(master_record)}\n" + """
        TASK: Audit and optimize CV content based on the provided Master Record.
        
        STRICT CONSTRAINTS:
        1. SUMMARY: Generate 3 variations (4-5 lines each).
        2. SKILLS: Each option MUST contain at least 6 high-impact keywords.
        3. COMPARISON: Use keys: "category", "jd_requirement", "user_status", "gap".
        4. INTENT: Explain if user is 'Advancing' or 'Pivoting'.

        RETURN JSON SCHEMA:
        {
            "intent_suggestion": "",
            "audit": {
                "score": 0,
                "metrics": { "keyword_score": 0, "impact_score": 0, "role_alignment": 0 },
                "summary_critique": "",
                "comparison_table": [ 
                    { "category": "education", "jd_requirement": "...", "user_status": "...", "gap": "..." },
                    { "category": "experience", "jd_requirement": "...", "user_status": "...", "gap": "..." }
                ],
                "action_plan": "... ",
                "roadmap": ["Step 1", "Step 2", "Step 3"]
            },
            "optimized_sections": {
                "summary": { "options": [] },
                "skills": {
                    "tech": { "options": [ [], [], [] ] },
                    "soft": { "options": [ [], [], [] ] }
                },
                "experience": [ { "company": "", "role": "", "type": "job/internship", "optimized_bullets": [] } ]
            }
        }
        """
        r2 = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": r2_prompt}],
            response_format={"type": "json_object"},
            temperature=0.4
        )

        # ✅ FIX 2: choices is a list — need [0] index
        res2_content = r2.choices[0].message.content
        res2 = json.loads(res2_content)

        if os.path.exists(file_location):
            os.remove(file_location)

        return {
            "analysis": {
                "master_record": master_record,
                "intent_suggestion": res2.get("intent_suggestion", "Strategic tailoring applied."),
                "optimized_sections": res2.get("optimized_sections", {}),
                "audit": res2.get("audit", {}),
                "validation": validation_report
            }
        }

    except Exception as e:
        if os.path.exists(file_location):
            os.remove(file_location)
        print(f"--- BACKEND CRASH: {str(e)} ---")
        traceback.print_exc()  # ✅ Added: prints full stack trace with line numbers
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)