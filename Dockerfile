FROM python:3.11-slim

# Install system dependencies including Tesseract OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install python dependencies
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend /app/backend
COPY frontend /app/frontend

# Set Environment variables
ENV TESSERACT_CMD=/usr/bin/tesseract
ENV PYTHONPATH=/app

# Expose FastAPI port
EXPOSE 8000

# Run the server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
