from fastapi import FastAPI

app = FastAPI(title="HireFlow ML Service")


@app.get("/health")
def health():
    return {"status": "ok"}
