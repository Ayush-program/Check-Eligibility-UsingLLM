@echo off
title Tender Eligibility Checker
color 0A

echo ========================================
echo    TENDER ELIGIBILITY CHECKER
echo ========================================
echo.

:: Check if virtual environment exists
if exist "backend\llmenv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call backend\llmenv\Scripts\activate.bat
)

:: Install/upgrade required packages
echo Installing required packages...
pip install --upgrade openai httpx python-dotenv pdfplumber fastapi uvicorn python-multipart

echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && call llmenv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8000 --host 127.0.0.1"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && python -m http.server 3000"

echo.
echo ========================================
echo    SERVERS STARTED!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Opening browser...
start http://localhost:3000

echo.
echo Press any key to close this window (servers will keep running)
pause >nul