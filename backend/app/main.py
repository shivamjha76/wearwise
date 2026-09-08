from fastapi import FastAPI

app = FastAPI(
    title="WearWise API",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "WearWise API is running 🚀"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }