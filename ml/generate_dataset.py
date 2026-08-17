"""
TimeBank ML — Synthetic Dataset Generator
Generates ~10,000 realistic skill-exchange records for training.
"""

import pandas as pd
import numpy as np
import os

np.random.seed(42)

N = 10000

SKILLS = [
    "Python", "JavaScript", "React", "Node.js", "Machine Learning",
    "Data Science", "Web Design", "Graphic Design", "UI/UX Design",
    "Photography", "Video Editing", "Content Writing", "SEO",
    "Digital Marketing", "Mobile Development", "Flutter", "Java",
    "C++", "Mathematics", "Physics", "Chemistry", "Biology",
    "English Tutoring", "Hindi Tutoring", "Music", "Guitar",
    "Piano", "Drawing", "Painting", "Cooking", "Yoga", "Fitness",
    "Public Speaking", "Resume Writing", "Interview Prep",
    "Financial Planning", "Accounting", "3D Modeling", "Animation",
    "Cybersecurity", "Cloud Computing", "DevOps", "Database Admin",
    "Blockchain", "IoT", "Robotics", "Arduino", "Embedded Systems",
    "Game Development", "Unity"
]

# Skill categories for computing similarity
SKILL_CATEGORIES = {
    "programming": ["Python", "JavaScript", "React", "Node.js", "Java", "C++", "Flutter", "Mobile Development", "Game Development", "Unity"],
    "data_ai": ["Machine Learning", "Data Science", "Blockchain", "IoT"],
    "design": ["Web Design", "Graphic Design", "UI/UX Design", "3D Modeling", "Animation"],
    "media": ["Photography", "Video Editing", "Drawing", "Painting"],
    "writing": ["Content Writing", "SEO", "Digital Marketing", "Resume Writing"],
    "academic": ["Mathematics", "Physics", "Chemistry", "Biology", "English Tutoring", "Hindi Tutoring"],
    "arts": ["Music", "Guitar", "Piano", "Cooking"],
    "personal": ["Yoga", "Fitness", "Public Speaking", "Interview Prep"],
    "finance": ["Financial Planning", "Accounting"],
    "infra": ["Cybersecurity", "Cloud Computing", "DevOps", "Database Admin", "Embedded Systems", "Arduino", "Robotics"],
}

def get_category(skill):
    for cat, skills in SKILL_CATEGORIES.items():
        if skill in skills:
            return cat
    return "other"

def compute_skill_similarity(requested, offered):
    if requested == offered:
        return 1.0
    cat_req = get_category(requested)
    cat_off = get_category(offered)
    if cat_req == cat_off:
        return np.random.uniform(0.55, 0.85)
    return np.random.uniform(0.05, 0.35)

print("Generating TimeBank ML dataset...")

records = []
for _ in range(N):
    requested_skill = np.random.choice(SKILLS)
    offered_skill = np.random.choice(SKILLS)

    skill_similarity = compute_skill_similarity(requested_skill, offered_skill)
    experience_years = max(0, int(np.random.exponential(2.5)))
    experience_years = min(experience_years, 15)

    user_rating = np.clip(np.random.normal(3.8, 0.8), 1.0, 5.0)
    user_rating = round(user_rating, 1)

    distance_km = round(np.random.exponential(8.0), 1)
    distance_km = min(distance_km, 50.0)

    availability_match = round(np.random.beta(2, 1.5), 2)

    previous_transactions = max(0, int(np.random.exponential(12)))
    previous_transactions = min(previous_transactions, 100)

    success_ratio = np.clip(np.random.beta(5, 1.5), 0.3, 1.0)
    successful_transactions = int(previous_transactions * success_ratio)

    response_rate = round(np.clip(np.random.beta(4, 1.5), 0.1, 1.0), 2)
    completion_rate = round(np.clip(np.random.beta(5, 1.2), 0.2, 1.0), 2)
    cancellation_rate = round(1.0 - completion_rate + np.random.uniform(-0.05, 0.05), 2)
    cancellation_rate = np.clip(cancellation_rate, 0.0, 0.5)

    time_credits = max(0, int(np.random.exponential(30)))
    time_credits = min(time_credits, 500)

    reputation_score = round(np.clip(
        (user_rating / 5) * 30 +
        completion_rate * 25 +
        response_rate * 15 +
        (1 - cancellation_rate) * 15 +
        min(experience_years / 10, 1) * 15, 0, 100
    ), 1)

    # --- Target: successful_exchange ---
    # Realistic probability based on feature correlations
    prob = (
        skill_similarity * 0.30 +
        (user_rating / 5) * 0.15 +
        availability_match * 0.15 +
        completion_rate * 0.15 +
        response_rate * 0.10 +
        (1 - cancellation_rate) * 0.05 +
        min(experience_years / 10, 1) * 0.05 +
        max(0, 1 - distance_km / 50) * 0.05
    )

    # Add noise
    prob = np.clip(prob + np.random.normal(0, 0.08), 0.02, 0.98)
    successful_exchange = 1 if np.random.random() < prob else 0

    records.append({
        "requested_skill": requested_skill,
        "offered_skill": offered_skill,
        "skill_similarity": round(skill_similarity, 3),
        "experience_years": experience_years,
        "user_rating": user_rating,
        "distance_km": distance_km,
        "availability_match": availability_match,
        "previous_transactions": previous_transactions,
        "successful_transactions": successful_transactions,
        "response_rate": response_rate,
        "completion_rate": completion_rate,
        "cancellation_rate": round(cancellation_rate, 3),
        "time_credits": time_credits,
        "reputation_score": reputation_score,
        "successful_exchange": successful_exchange,
    })

df = pd.DataFrame(records)

os.makedirs("dataset", exist_ok=True)
csv_path = os.path.join("dataset", "timebank_matches.csv")
df.to_csv(csv_path, index=False)

print(f"Dataset saved: {csv_path}")
print(f"Total records: {len(df)}")
print(f"Success rate: {df['successful_exchange'].mean():.2%}")
print(f"\nFeature summary:")
print(df.describe().round(2))
