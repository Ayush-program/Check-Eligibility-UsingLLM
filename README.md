# 🏛️ Tender Eligibility Checker — AI Powered

An intelligent system to check company eligibility for GeM (Government e-Marketplace) tenders. Upload a tender PDF and let the AI extract all requirements, then enter your company details to get an instant eligibility score.

---

## ✨ Features

- 📄 **AI Extraction** — Automatically extracts turnover, experience, documents, and classification from tender PDFs
- 🤖 **LLM Analysis** — Uses Groq (Llama 3.3 70B) + RAG pipeline for deep document understanding
- 📊 **Eligibility Scoring** — Multi-parameter weighted scoring with MSE/Startup exemption support
- 🔍 **Keyword Detection** — Detects MCC, NDD, ISO, BIS, Blacklisting, and other critical clauses
- 📎 **ATC Processing** — Automatically downloads and parses Additional Terms & Conditions documents
- 🔒 **Secure API** — Rate limiting, API key auth, security headers, SSRF protection

---

## 🚀 Quick Start (Development)

### Prerequisites
- Python 3.11+
- [Groq API Key](https://console.groq.com/) (free tier available)

### 1. Clone & Setup
```bash
git clone https://github.com/your-username/LLm_check_eligibility.git
cd LLm_check_eligibility
```

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your GROQ_API_KEY
```

### 3. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 4. Run the App
```bash
python start.py
# Opens http://localhost:3000 in your browser
```

---

## 🐳 Docker (Recommended)

```bash
# Copy and configure environment
cp backend/.env.example backend/.env
# Edit .env with your keys

# Start with Docker Compose
docker compose up --build

# App will be available at http://localhost:8000
```

---

## 🔧 Environment Variables

| Variable | Required | Description |
|---|:---:|---|
| `GROQ_API_KEY` | ✅ | Your Groq AI API key |
| `API_KEY` | ✅ (prod) | Secret key for API authentication |
| `ENVIRONMENT` | ❌ | `development` or `production` (default: `production`) |
| `ALLOWED_ORIGINS` | ❌ | Comma-separated CORS origins |
| `DATABASE_URL` | ❌ | PostgreSQL URL (defaults to SQLite for dev) |

> See `backend/.env.example` for full documentation.

---

## 🏗️ Project Structure

```
LLm_check_eligibility/
├── backend/
│   ├── main.py              # FastAPI app, routes, middleware
│   ├── extractor_openai.py  # PDF extraction with Groq + RAG
│   ├── eligibility.py       # Eligibility scoring engine
│   ├── ai_explainer.py      # AI explanation generator
│   ├── database.py          # Database models & connection
│   ├── utils.py             # Utility functions
│   ├── requirements.txt     # Pinned Python dependencies
│   └── .env.example         # Environment variable template
├── frontend/
│   ├── index.html           # Single-page app
│   ├── app.js               # Frontend logic
│   └── style.css            # Styling
├── Dockerfile               # Docker image definition
├── compose.yaml             # Docker Compose config
├── .dockerignore            # Docker build exclusions
└── start.py                 # Development startup script
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check (DB, Groq API, disk) |
| `GET` | `/config` | Frontend config (base URL) |
| `POST` | `/extract` | Extract tender data from PDF |
| `POST` | `/check` | Check company eligibility |
| `POST` | `/download_atc` | Download ATC document |

> API docs available at `/docs` in **development mode only**.

---

## 🔒 Security

- API Key authentication on all write endpoints
- Rate limiting: 10 req/min extract, 20 req/min check
- SSRF protection on URL downloads
- Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- MIME type validation on file uploads
- CORS restricted to configured origins

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run tests: `pytest backend/tests/`
4. Submit a Pull Request

---

## 📝 License

MIT License — See [LICENSE](LICENSE) for details.
