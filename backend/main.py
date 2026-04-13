from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import json
import shutil
import os
from typing import Dict, Any
import logging
from datetime import datetime

# Import from local modules
from fastapi.staticfiles import StaticFiles
import hashlib
import requests

from extractor_openai import CompleteTenderExtractor
from eligibility import check_eligibility
from ai_explainer import AIExplainer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Tender Eligibility Checker - AI Powered", version="2.0.0")

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure CORS dynamically
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Create downloads directory for temporary ATC storage
DOWNLOADS_DIR = "downloads"
os.makedirs(DOWNLOADS_DIR, exist_ok=True)
app.mount("/downloads", StaticFiles(directory=DOWNLOADS_DIR), name="downloads")

# Define frontend directory
# Assuming the file is in 'backend' and 'frontend' is a peer directory
FRONTEND_DIR = os.path.join(os.path.dirname(os.getcwd()), "frontend")
if not os.path.exists(FRONTEND_DIR):
    # Fallback to local 'frontend' if backend is context root
    FRONTEND_DIR = os.path.join(os.getcwd(), "frontend")

# Mount frontend as static files
app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")


@app.get("/")
async def root():
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": "Tender Eligibility Checker API - AI Powered",
        "version": "2.0.0",
        "error": "Frontend index.html not found, but API is running."
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import Response
    return Response(content=b"", media_type="image/x-icon")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/extract")
async def extract_tender(file: UploadFile = File(...)):
    """Extract tender information"""
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    import tempfile
    
    try:
        # Create a temporary file that handles its own lifecycle better
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(file.file, tmp)
            file_path = tmp.name
            
        # Empty downloads directory on new upload to clear old files (optional: could also be improved via backgrounds tasks)
        import glob
        for old_file in glob.glob(os.path.join(DOWNLOADS_DIR, "*")):
            try:
                os.remove(old_file)
            except Exception as e:
                logger.error(f"Failed to delete old document: {old_file} - {e}")
        
        logger.info(f"Extracting data from {file.filename}")
        
        # Create extractor instance
        extractor = CompleteTenderExtractor()
        
        # Extract fields from the PDF using the temporary file path
        data = extractor.extract_fields(file_path)
        
        return JSONResponse({
            "success": True,
            "tender": data,
            "filename": file.filename
        })
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Ensure the temporary file is deleted regardless of success or failure
        if 'file_path' in locals() and os.path.exists(file_path):
            try:
                os.unlink(file_path)
            except Exception as cleanup_err:
                logger.error(f"Failed to clean up temp file: {cleanup_err}")


from pydantic import BaseModel, ValidationError

class CompanyData(BaseModel):
    mse_status: str
    startup_status: str
    documents: list[str] = []
    turnover: float = 0.0
    oem_turnover: float = 0.0
    experience: int = 0
    past_performance: float = 0.0
    oem_authorization: str = "No"

@app.post("/check")
async def check_eligibility_endpoint(
    tender_data: str = Form(...),
    company_data: str = Form(...)
):
    """Check company eligibility"""
    
    try:
        raw_company = json.loads(company_data)
        tender = json.loads(tender_data)
        
        # Validate company using Pydantic
        try:
            company_obj = CompanyData(**raw_company)
            company = company_obj.model_dump()
        except ValidationError as ve:
            raise HTTPException(status_code=422, detail=f"Invalid company data: {ve}")
        
        logger.info(f"Checking eligibility for company: {company.get('mse_status', 'N/A')}")
        
        result = check_eligibility(company, tender)
        
        explainer = AIExplainer()
        ai_output = explainer.generate_explanation(result, tender, company)
        
        return JSONResponse({
            "success": True,
            "tender": tender,
            "company": company,
            "result": result,
            "ai": ai_output
        })
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class DownloadRequest(BaseModel):
    url: str

@app.post("/download_atc")
async def download_atc(request: DownloadRequest):
    """Download ATC document automatically to backend and serve it locally"""
    url = request.url
    if not url:
        return JSONResponse({"success": False, "error": "No URL provided"})
    
    # Generate stable filename based on URL hash
    file_id = hashlib.md5(url.encode()).hexdigest()
    
    # Check if already downloaded
    import glob
    existing = glob.glob(os.path.join(DOWNLOADS_DIR, f"atc_{file_id}.*"))
    if existing:
        filename = os.path.basename(existing[0])
        local_url = f"http://127.0.0.1:8000/downloads/{filename}"
        ext = os.path.splitext(filename)[1].lower()
        return JSONResponse({"success": True, "local_url": local_url, "extension": ext})
    
    # Download file if it doesn't already exist locally
    try:
        logger.info(f"Downloading ATC document from {url}")
        r = requests.get(url, stream=True, timeout=30)
        if r.status_code == 200:
            import re
            ext = ".pdf"
            ct = r.headers.get("Content-Type", "").lower()
            cd = r.headers.get("Content-Disposition", "")
            
            # Try from Content-Disposition
            if "filename=" in cd:
                match = re.search(r'filename="?([^"]+)"?', cd)
                if match:
                    ext = os.path.splitext(match.group(1))[1]
            # Fallback to Content-Type
            elif "wordprocessingml" in ct or "msword" in ct: ext = ".docx"
            elif "spreadsheetml" in ct or "ms-excel" in ct: ext = ".xlsx"
            elif "xml" in ct: ext = ".xml"
            elif "zip" in ct: ext = ".zip"
            
            if not ext: ext = ".pdf"
                
            filename = f"atc_{file_id}{ext}"
            file_path = os.path.join(DOWNLOADS_DIR, filename)
            
            with open(file_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            local_url = f"http://127.0.0.1:8000/downloads/{filename}"
            return JSONResponse({"success": True, "local_url": local_url, "extension": ext.lower()})
        else:
            return JSONResponse({"success": False, "error": f"Failed to download (Status {r.status_code})"})
    except Exception as e:
        logger.error(f"ATC Download Error: {e}")
        return JSONResponse({"success": False, "error": str(e)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)