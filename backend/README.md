Backend service (FastAPI) for Sauti Biashara

Quick start (dev):

1. Create a Python venv and install dependencies:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and adjust `DATABASE_URL` and `SECRET_KEY`.

3. Run the app:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
