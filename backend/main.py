from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import APIKeyHeader
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
import json
import ipaddress
import shutil
import os
import tempfile
import hashlib
import magic
import httpx
import uuid
import re
import logging
from datetime import datetime
from typing import Dict, Any
from urllib.parse import urlparse

from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from extractor_openai import CompleteTenderExtractor
from eligibility import check_eligibility
from ai_explainer import AIExplainer
from database import database, connect_db, disconnect_db, extractions, eligibility_checks
from pydantic import BaseModel, ValidationError

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Security: API Key authentication
# Crash at startup if API_KEY is not configured — no dangerous defaults allowed.
API_KEY = os.getenv("API_KEY")

# Use ENVIRONMENT variable, never IP detection (unreliable behind proxies)
IS_DEV = os.getenv("ENVIRONMENT", "production").lower() == "development"

if not API_KEY:
    if not IS_DEV:
        raise RuntimeError(
            "CRITICAL: API_KEY environment variable is not set. "
            "Set ENVIRONMENT=development to bypass in local dev."
        )
    API_KEY = "dev-only-key-not-for-production"
    logger.warning("Running in DEVELOPMENT mode — API key enforcement is relaxed.")

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def verify_api_key(request: Request, api_key: str = Security(api_key_header)):
    """Verify API key. Dev mode only bypasses in development environment."""
    if IS_DEV:
        return "dev-bypass"
    if not api_key or api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )
    return api_key

# CORS configuration — strip whitespace and filter out wildcards in production
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
if "*" in ALLOWED_ORIGINS and not IS_DEV:
    logger.warning("Wildcard '*' removed from ALLOWED_ORIGINS — not safe for production.")
    ALLOWED_ORIGINS = [o for o in ALLOWED_ORIGINS if o != "*"]

# Maximum file size (20 MB)
MAX_FILE_SIZE = 20 * 1024 * 1024
UPLOAD_DIR = "uploads"
DOWNLOADS_DIR = "downloads"

# ------------------------------------------------------------------
# Lifespan context manager (startup + shutdown) — must be defined
# BEFORE FastAPI() is instantiated so the reference is resolved.
# ------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown using the modern lifespan pattern."""
    # --- STARTUP ---
    required_vars = ["GROQ_API_KEY"]
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        logger.error(f"Missing required environment variables: {missing}")
        raise RuntimeError(f"Missing environment variables: {missing}")
    logger.info("All required environment variables are set")
    logger.info(f"Running in {'DEVELOPMENT' if IS_DEV else 'PRODUCTION'} mode")
    # Live Groq API key validation — catches wrong/placeholder keys immediately
    groq_key = os.getenv("GROQ_API_KEY", "")
    if groq_key in ("", "your-groq-api-key-here", "your-API-key"):
        logger.error("GROQ_API_KEY is still set to a placeholder value. Please set a real key.")
        raise RuntimeError("GROQ_API_KEY is a placeholder. Update your .env file.")
    try:
        from groq import Groq as _Groq
        _Groq(api_key=groq_key).models.list()
        logger.info("✅ Groq API key validated successfully")
    except Exception as _e:
        logger.warning(f"⚠️ Groq API key validation failed: {_e}. Extractions will fail at runtime.")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    await connect_db()
    logger.info("Database connected")
    yield
    # --- SHUTDOWN ---
    await disconnect_db()
    logger.info("Database disconnected")

# Initialize FastAPI app (lifespan must be defined above this line)
app = FastAPI(
    title="Tender Eligibility Checker - AI Powered",
    version="2.0.0",
    lifespan=lifespan,
    # Hide API docs in production to reduce attack surface
    docs_url="/docs" if IS_DEV else None,
    redoc_url=None,
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=[API_KEY_NAME, "Content-Type"],
)

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data:;"
        )
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    logger.info(f"Request {request_id}: {request.method} {request.url.path}")
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    logger.info(f"Request {request_id}: completed with status {response.status_code}")
    return response

app.mount("/downloads", StaticFiles(directory=DOWNLOADS_DIR), name="downloads")

# Frontend static files
FRONTEND_DIR = os.path.join(os.path.dirname(os.getcwd()), "frontend")
if not os.path.exists(FRONTEND_DIR):
    FRONTEND_DIR = os.path.join(os.getcwd(), "frontend")
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

@app.get("/config")
async def get_config(request: Request):
    """Return frontend configuration"""
    base_url = str(request.base_url).rstrip('/')
    return {"base_url": base_url, "api_key_required": True}

@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "checks": {}
    }
    # Check GROQ API
    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        client.models.list()
        health_status["checks"]["groq_api"] = "ok"
    except Exception as e:
        health_status["checks"]["groq_api"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    # Check disk space
    import shutil
    for path, name in [(UPLOAD_DIR, "uploads"), (DOWNLOADS_DIR, "downloads")]:
        try:
            usage = shutil.disk_usage(path)
            free_gb = usage.free / (1024**3)
            health_status["checks"][f"{name}_disk_free_gb"] = round(free_gb, 2)
            if free_gb < 1:
                health_status["checks"][f"{name}_warning"] = "low disk space"
                if health_status["status"] == "healthy":
                    health_status["status"] = "degraded"
        except Exception as e:
            health_status["checks"][f"{name}_error"] = str(e)
            health_status["status"] = "unhealthy"
    # Check database
    if database.is_connected:
        try:
            await database.fetch_one("SELECT 1")
            health_status["checks"]["database"] = "ok"
        except Exception as e:
            health_status["checks"]["database"] = f"error: {str(e)}"
            health_status["status"] = "unhealthy"
    return health_status

@app.post("/extract")
@limiter.limit("10/minute")
async def extract_tender(
    request: Request,
    file: UploadFile = File(...),
    api_key: str = Security(verify_api_key)
):
    """Extract tender information from PDF"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Validate MIME type
    header = await file.read(2048)
    mime_type = magic.from_buffer(header, mime=True)
    await file.seek(0)
    if mime_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Invalid file type. Only valid PDFs are accepted.")
    
    content_length = file.size
    if content_length and content_length > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE//1024//1024}MB")
    
    # Save to temp file with size check
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        total_size = 0
        while chunk := await file.read(8192):
            total_size += len(chunk)
            if total_size > MAX_FILE_SIZE:
                os.unlink(tmp.name)
                raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE//1024//1024}MB")
            tmp.write(chunk)
        file_path = tmp.name
    
    try:
        # Clear old downloads (optional)
        import glob
        for old_file in glob.glob(os.path.join(DOWNLOADS_DIR, "*")):
            try:
                os.remove(old_file)
            except Exception as e:
                logger.warning(f"Failed to delete old file: {e}")
        
        logger.info(f"Extracting data from {file.filename}")
        extractor = CompleteTenderExtractor()
        data = extractor.extract_fields(file_path)
        
        # Save to database
        query = extractions.insert().values(
            filename=file.filename,
            tender_data=data
        )
        await database.execute(query)
        
        return JSONResponse({
            "success": True,
            "tender": data,
            "filename": file.filename
        })
    except Exception as e:
        logger.error(f"Extraction error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred during extraction. Please try again."
        )
    finally:
        if os.path.exists(file_path):
            os.unlink(file_path)


class CompanyData(BaseModel):
    mse_status: str
    startup_status: str
    documents: list[str] = []
    turnover: float = 0.0
    oem_turnover: float = 0.0
    experience: int = 0
    past_performance: float = 0.0
    oem_authorization: str = "No"

class DownloadRequest(BaseModel):
    url: str

@app.post("/check")
@limiter.limit("20/minute")
async def check_eligibility_endpoint(
    request: Request,
    tender_data: str = Form(...),
    company_data: str = Form(...),
    api_key: str = Security(verify_api_key)
):
    """Check company eligibility"""
    try:
        raw_company = json.loads(company_data)
        tender = json.loads(tender_data)
        
        try:
            company_obj = CompanyData(**raw_company)
            company = company_obj.model_dump()
        except ValidationError as ve:
            raise HTTPException(status_code=422, detail=f"Invalid company data: {ve}")
        
        logger.info(f"Checking eligibility for company")
        result = check_eligibility(company, tender)
        
        explainer = AIExplainer()
        ai_output = explainer.generate_explanation(result, tender, company)
        
        # Save to database
        query = eligibility_checks.insert().values(
            tender_data=tender,
            company_data=company,
            result=result
        )
        await database.execute(query)
        
        return JSONResponse({
            "success": True,
            "tender": tender,
            "company": company,
            "result": result,
            "ai": ai_output
        })
    except Exception as e:
        logger.error(f"Check error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred during eligibility check. Please try again."
        )

def safe_filename(ext: str, url_hash: str) -> str:
    safe_ext = re.sub(r'[^a-zA-Z0-9.]', '', ext)
    allowed = ['.pdf', '.docx', '.xlsx', '.xml', '.zip', '.doc', '.xls']
    if safe_ext.lower() not in allowed:
        safe_ext = '.pdf'
    return f"atc_{url_hash}{safe_ext}"

# Private/reserved IP ranges that must not be fetched (SSRF protection)
_BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # AWS metadata
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]

def _is_ssrf_safe(url: str) -> bool:
    """Return True only if the URL resolves to a public IP (SSRF guard)."""
    import socket
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    hostname = parsed.hostname
    if not hostname:
        return False
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(hostname))
        for net in _BLOCKED_NETWORKS:
            if ip in net:
                return False
        return True
    except Exception:
        return False


@app.post("/download_atc")
@limiter.limit("30/minute")
async def download_atc(
    request: Request,
    download_req: DownloadRequest,
    api_key: str = Security(verify_api_key)
):
    """Download ATC document securely with SSRF protection."""
    url = download_req.url
    if not url:
        return JSONResponse({"success": False, "error": "No URL provided"})

    # SSRF guard — block private/internal IPs
    if not _is_ssrf_safe(url):
        logger.warning(f"Blocked SSRF attempt for URL: {url}")
        return JSONResponse({"success": False, "error": "URL not allowed."})

    file_id = hashlib.sha256(url.encode()).hexdigest()[:16]

    import glob
    existing = glob.glob(os.path.join(DOWNLOADS_DIR, f"atc_{file_id}.*"))
    if existing:
        filename = os.path.basename(existing[0])
        local_url = f"{request.base_url}downloads/{filename}"
        ext = os.path.splitext(filename)[1].lower()
        return JSONResponse({"success": True, "local_url": local_url, "extension": ext})

    try:
        logger.info(f"Downloading ATC from {url}")
        # Use async httpx — does NOT block the event loop unlike requests.get()
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            r = await client.get(url)
        if r.status_code == 200:
            ext = ".pdf"
            ct = r.headers.get("content-type", "").lower()
            cd = r.headers.get("content-disposition", "")
            if "filename=" in cd:
                match = re.search(r'filename="?([^"]+)"?', cd)
                if match:
                    ext = os.path.splitext(match.group(1))[1]
            elif "wordprocessingml" in ct or "msword" in ct:
                ext = ".docx"
            elif "spreadsheetml" in ct or "ms-excel" in ct:
                ext = ".xlsx"
            elif "xml" in ct:
                ext = ".xml"
            elif "zip" in ct:
                ext = ".zip"

            filename = safe_filename(ext, file_id)
            file_path = os.path.join(DOWNLOADS_DIR, filename)
            with open(file_path, "wb") as f:
                f.write(r.content)

            local_url = f"{request.base_url}downloads/{filename}"
            return JSONResponse({"success": True, "local_url": local_url, "extension": ext.lower()})
        else:
            return JSONResponse({"success": False, "error": f"Failed to download (Status {r.status_code})"})
    except httpx.TimeoutException:
        logger.error(f"ATC Download timeout for URL: {url}")
        return JSONResponse({"success": False, "error": "Download timed out."})
    except Exception as e:
        logger.error(f"ATC Download Error: {e}", exc_info=True)
        return JSONResponse({"success": False, "error": "Failed to download document."})

if __name__ == "__main__":
   
    uvicorn.run(app, host="0.0.0.0", port=8000)