# Python slim = smaller image than the full python image (no gcc, no extra tools)
FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

EXPOSE 8000

# --host 0.0.0.0 is critical inside Docker — without it the server only
# listens on localhost INSIDE the container, unreachable from outside
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
