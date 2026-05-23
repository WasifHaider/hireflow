# HireFlow

Multi-tenant SaaS hiring platform with AI-powered candidate screening.

## Setup

### Prerequisites

- Node.js 20.18+ (22.12+ recommended for latest create-vue defaults)
- Python 3.11+
- npm

### Install & run

```bash
# Root — concurrent dev scripts
cd hireflow
npm install

# Backend
cd apps/backend && npm install

# Frontend
cd apps/frontend && npm install

# ML service
cd apps/ml-service
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

# From repo root — all three apps
cd ../..
npm run dev
```

Copy `.env.example` → `.env` in each app when you connect Supabase, Redis, and OpenAI.

### Local URLs

| Service  | URL |
|----------|-----|
| Backend  | http://localhost:3200 |
| Swagger  | http://localhost:3200/api/docs |
| Frontend | http://localhost:9173 |
| ML       | http://localhost:8100/health |
