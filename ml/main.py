"""
TimeBank ML — FastAPI Recommendation Service
Serves ML predictions for skill matching.
Run: uvicorn main:app --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from predict import predict_batch, load_model

app = FastAPI(
    title="TimeBank ML Service",
    description="AI-powered skill matching and recommendation engine",
    version="1.0.0"
)

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Models ---

class Candidate(BaseModel):
    user_id: str
    name: str = "Unknown"
    skills: List[str] = []
    rating: float = 3.0
    experience_years: int = 0
    completion_rate: float = 0.5
    cancellation_rate: float = 0.1
    response_rate: float = 0.5
    previous_transactions: int = 0
    successful_transactions: int = 0
    reputation_score: float = 50.0
    time_credits: int = 10
    availability: str = "offline"
    distance_km: float = 10.0
    avatar: str = ""
    avatarUrl: str = ""


class RecommendRequest(BaseModel):
    requested_skill: str
    candidates: List[Candidate]


class RecommendResponse(BaseModel):
    recommendations: list
    model_type: str = "RandomForest"
    total_candidates: int = 0


# --- Load model on startup ---

@app.on_event("startup")
async def startup():
    try:
        load_model()
        print("ML Model loaded successfully!")
    except FileNotFoundError as e:
        print(f"WARNING: {e}")
        print("The ML service will return errors until the model is trained.")


# --- Endpoints ---

@app.get("/api/ml/health")
async def health():
    """Health check for the ML service."""
    try:
        load_model()
        return {"status": "ok", "model_loaded": True}
    except FileNotFoundError:
        return {"status": "degraded", "model_loaded": False, "error": "Model not trained yet"}


@app.post("/api/ml/recommend", response_model=RecommendResponse)
async def recommend(request: RecommendRequest):
    """Get ML-powered skill match recommendations."""
    try:
        load_model()
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="ML model not available. Train the model first.")

    if not request.candidates:
        return RecommendResponse(recommendations=[], total_candidates=0)

    candidates_dict = [c.model_dump() for c in request.candidates]
    recommendations = predict_batch(request.requested_skill, candidates_dict)

    return RecommendResponse(
        recommendations=recommendations,
        model_type="RandomForest",
        total_candidates=len(request.candidates)
    )


@app.get("/api/ml/dashboard")
async def dashboard():
    """Return model evaluation metrics for the ML dashboard."""
    report_path = os.path.join("models", "evaluation_report.json")
    if not os.path.exists(report_path):
        return {
            "status": "not_trained",
            "message": "No trained model found. Run train_model.py first."
        }

    with open(report_path, "r") as f:
        report = json.load(f)

    # Check if real exchange data exists
    real_data_path = os.path.join("dataset", "real_exchanges.csv")
    real_exchanges = 0
    if os.path.exists(real_data_path):
        import pandas as pd
        real_df = pd.read_csv(real_data_path)
        real_exchanges = len(real_df)

    return {
        "status": "trained",
        **report,
        "real_exchanges_collected": real_exchanges,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
