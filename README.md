# 🤖 AI Eligibility Checker (LLM + FastAPI)

## 📌 Project Overview

This project is an AI-powered eligibility checking system designed to analyze tender documents and determine whether a user qualifies for bidding. It leverages Large Language Models (LLMs) for intelligent data extraction and FastAPI for building a scalable backend service.

---

## 🎯 Key Features

* 📄 Automatic extraction of eligibility criteria from tender documents
* 🧠 AI-based analysis using LLMs
* ⚡ FastAPI backend for real-time processing
* ✅ Automated qualification decision (Eligible / Not Eligible)
* 🔍 Reduces manual effort and improves accuracy

---

## 🛠️ Tech Stack

* Python
* FastAPI
* LLM (OpenAI / other models)
* NLP (Natural Language Processing)
* Pandas / JSON processing

---

## ⚙️ Installation

### 1️⃣ Clone Repository

```bash id="iwr1s2"
git clone https://github.com/Ayush-program/eligibility-checker.git
cd eligibility-checker
```

---

### 2️⃣ Install Dependencies

```bash id="fdg03r"
pip install -r requirements.txt
```

---

### 3️⃣ Set Environment Variables

Create `.env` file:

```env id="6dj8gm"
OPENAI_API_KEY=your_api_key_here
```

---

## ▶️ How to Run

```bash id="ujqg7h"
uvicorn main:app --reload
```

👉 Server will run on:

```id="v3znw2"
http://127.0.0.1:8000
```

---

## 📡 API Endpoints

### 🔹 Check Eligibility

```http id="2e5g1p"
POST /check-eligibility
```

### Request Example:

```json id="cz6a9x"
{
  "document_text": "Tender requires 3 years experience and turnover above 10 lakh..."
}
```

### Response:

```json id="t6u6bj"
{
  "status": "Eligible",
  "reason": "Meets experience and financial criteria"
}
```

---

## 🧠 How It Works

1. **Input Processing**

   * Accepts tender document (text or extracted PDF content)

2. **LLM Analysis**

   * Extracts key eligibility conditions

3. **Decision Engine**

   * Compares user data with requirements

4. **Output**

   * Returns eligibility status with explanation

---

## ⚠️ Notes

* Requires LLM API key
* Accuracy depends on input quality
* Not a legal decision system (advisory use)

---

## 🚀 Future Improvements

* Add PDF upload support
* Build frontend dashboard
* Improve model accuracy
* Deploy on cloud (AWS / Render)

---

## 👨‍💻 Author

**Ayush Gaudani**
AI/ML Engineer

---

## ⭐ Use Case

* Tender consulting companies
* MSMEs applying for bids
* Automated document analysis systems

---
