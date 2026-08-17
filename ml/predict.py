"""
TimeBank ML — Prediction Utilities
Loads the trained model and provides prediction functions.
"""

import joblib
import numpy as np
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

_model = None
_feature_columns = None


def load_model():
    global _model, _feature_columns
    if _model is None:
        model_path = os.path.join(MODEL_DIR, "skill_match_model.pkl")
        columns_path = os.path.join(MODEL_DIR, "feature_columns.pkl")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}. Run train_model.py first.")
        _model = joblib.load(model_path)
        _feature_columns = joblib.load(columns_path)
    return _model, _feature_columns


# Skill categories for similarity computation
SKILL_CATEGORIES = {
    "programming": ["python", "javascript", "react", "node.js", "java", "c++", "flutter", "mobile development", "game development", "unity"],
    "data_ai": ["machine learning", "data science", "blockchain", "iot"],
    "design": ["web design", "graphic design", "ui/ux design", "3d modeling", "animation"],
    "media": ["photography", "video editing", "drawing", "painting"],
    "writing": ["content writing", "seo", "digital marketing", "resume writing"],
    "academic": ["mathematics", "physics", "chemistry", "biology", "english tutoring", "hindi tutoring"],
    "arts": ["music", "guitar", "piano", "cooking"],
    "personal": ["yoga", "fitness", "public speaking", "interview prep"],
    "finance": ["financial planning", "accounting"],
    "infra": ["cybersecurity", "cloud computing", "devops", "database admin", "embedded systems", "arduino", "robotics"],
}


def get_skill_category(skill):
    skill_lower = skill.lower().strip()
    for cat, skills in SKILL_CATEGORIES.items():
        if skill_lower in skills:
            return cat
    return "other"


def compute_skill_similarity(requested_skill, offered_skills):
    """Compute similarity between a requested skill and a list of offered skills."""
    req_lower = requested_skill.lower().strip()
    req_cat = get_skill_category(requested_skill)
    best_sim = 0.0

    for skill in offered_skills:
        sk_lower = skill.lower().strip()
        if req_lower == sk_lower:
            return 1.0  # Exact match
        sk_cat = get_skill_category(skill)
        if req_cat == sk_cat and req_cat != "other":
            sim = 0.7  # Same category
        else:
            sim = 0.15  # Different category
        best_sim = max(best_sim, sim)

    return best_sim


def predict_match(requested_skill, candidate):
    """
    Predict match score for a single candidate.
    
    candidate dict should contain:
      skills, rating, experience_years, completion_rate, cancellation_rate,
      response_rate, previous_transactions, successful_transactions,
      reputation_score, time_credits, availability, distance_km
    """
    model, feature_columns = load_model()

    offered_skills = candidate.get("skills", [])
    skill_similarity = compute_skill_similarity(requested_skill, offered_skills)

    # Availability match (1 if available, 0.5 if online, 0 if offline)
    avail = candidate.get("availability", "offline")
    availability_match = 1.0 if avail == "available" else (0.5 if avail == "online" else 0.2)

    features = {
        "skill_similarity": skill_similarity,
        "experience_years": candidate.get("experience_years", 0),
        "user_rating": candidate.get("rating", 3.0),
        "distance_km": candidate.get("distance_km", 10.0),
        "availability_match": availability_match,
        "previous_transactions": candidate.get("previous_transactions", 0),
        "successful_transactions": candidate.get("successful_transactions", 0),
        "response_rate": candidate.get("response_rate", 0.5),
        "completion_rate": candidate.get("completion_rate", 0.5),
        "cancellation_rate": candidate.get("cancellation_rate", 0.1),
        "time_credits": candidate.get("time_credits", 10),
        "reputation_score": candidate.get("reputation_score", 50),
    }

    # Build feature vector in correct order
    X = np.array([[features[col] for col in feature_columns]])

    # Get probability of successful exchange
    proba = model.predict_proba(X)[0][1]
    match_score = int(round(proba * 100))

    # Generate explanation reasons
    reasons = []
    if skill_similarity >= 0.9:
        reasons.append(f"{int(skill_similarity*100)}% skill similarity")
    elif skill_similarity >= 0.55:
        reasons.append(f"{int(skill_similarity*100)}% related skill match")

    rating = features["user_rating"]
    if rating >= 4.5:
        reasons.append(f"{rating}/5 excellent rating")
    elif rating >= 3.5:
        reasons.append(f"{rating}/5 good rating")

    cr = features["completion_rate"]
    if cr >= 0.85:
        reasons.append(f"{int(cr*100)}% completion rate")

    rr = features["response_rate"]
    if rr >= 0.85:
        reasons.append(f"{int(rr*100)}% response rate")

    st = features["successful_transactions"]
    if st >= 5:
        reasons.append(f"{st} successful exchanges")

    if availability_match >= 0.8:
        reasons.append("Available now")

    dist = features["distance_km"]
    if dist <= 5:
        reasons.append(f"{dist:.1f} km away")

    exp = features["experience_years"]
    if exp >= 2:
        reasons.append(f"{exp} years experience")

    # Ensure at least 2 reasons
    if len(reasons) < 2:
        reasons.append(f"Trust score: {features['reputation_score']:.0f}/100")

    return {
        "match_score": match_score,
        "reasons": reasons[:5],  # Max 5 reasons
        "skill_similarity": round(skill_similarity, 2),
    }


def predict_batch(requested_skill, candidates):
    """Predict and rank multiple candidates."""
    results = []
    for candidate in candidates:
        prediction = predict_match(requested_skill, candidate)
        results.append({
            "user_id": candidate.get("user_id", ""),
            "name": candidate.get("name", "Unknown"),
            "skills": candidate.get("skills", []),
            "rating": candidate.get("rating", 0),
            "experience_years": candidate.get("experience_years", 0),
            "avatar": candidate.get("avatar", ""),
            "avatarUrl": candidate.get("avatarUrl", ""),
            "availability": candidate.get("availability", "offline"),
            "distance_km": candidate.get("distance_km", 0),
            "completion_rate": candidate.get("completion_rate", 0),
            "response_rate": candidate.get("response_rate", 0),
            "successful_transactions": candidate.get("successful_transactions", 0),
            **prediction,
        })

    # Sort by match_score descending
    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results
