"""
TimeBank ML — Model Training Script
Trains a Random Forest classifier on the TimeBank skill-matching dataset.
"""

import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, classification_report
)
from sklearn.preprocessing import LabelEncoder
from datetime import datetime


def load_dataset():
    csv_path = os.path.join("dataset", "timebank_matches.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found: {csv_path}. Run generate_dataset.py first.")
    return pd.read_csv(csv_path)


def train():
    print("=" * 60)
    print("TimeBank ML — Model Training")
    print("=" * 60)

    # 1. Load data
    df = load_dataset()
    print(f"\nDataset loaded: {len(df)} records")
    print(f"Success rate: {df['successful_exchange'].mean():.2%}")

    # 2. Feature engineering
    # Encode categorical skill columns
    le_requested = LabelEncoder()
    le_offered = LabelEncoder()
    all_skills = pd.concat([df["requested_skill"], df["offered_skill"]]).unique()
    le_requested.fit(all_skills)
    le_offered.fit(all_skills)

    df["requested_skill_enc"] = le_requested.transform(df["requested_skill"])
    df["offered_skill_enc"] = le_offered.transform(df["offered_skill"])

    # Features for the model
    feature_columns = [
        "skill_similarity",
        "experience_years",
        "user_rating",
        "distance_km",
        "availability_match",
        "previous_transactions",
        "successful_transactions",
        "response_rate",
        "completion_rate",
        "cancellation_rate",
        "time_credits",
        "reputation_score",
    ]

    X = df[feature_columns]
    y = df["successful_exchange"]

    print(f"\nFeatures ({len(feature_columns)}): {feature_columns}")
    print(f"Target distribution: {dict(y.value_counts())}")

    # 3. Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\nTrain set: {len(X_train)} | Test set: {len(X_test)}")

    # 4. Train Random Forest
    print("\nTraining Random Forest...")
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # 5. Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_proba)
    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "=" * 40)
    print("EVALUATION RESULTS")
    print("=" * 40)
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    print(f"\nConfusion Matrix:")
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")

    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Failed", "Successful"]))

    # Feature importance
    importances = dict(zip(feature_columns, model.feature_importances_))
    sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    print("\nFeature Importance:")
    for feat, imp in sorted_imp:
        bar = "*" * int(imp * 50)
        print(f"  {feat:30s} {imp:.4f} {bar}")

    # 6. Save model and artifacts
    os.makedirs("models", exist_ok=True)

    model_path = os.path.join("models", "skill_match_model.pkl")
    joblib.dump(model, model_path)
    print(f"\nModel saved: {model_path}")

    columns_path = os.path.join("models", "feature_columns.pkl")
    joblib.dump(feature_columns, columns_path)
    print(f"Feature columns saved: {columns_path}")

    # Save evaluation report
    report = {
        "model_type": "RandomForestClassifier",
        "n_estimators": 150,
        "max_depth": 12,
        "dataset_size": len(df),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": {
            "true_negative": int(cm[0][0]),
            "false_positive": int(cm[0][1]),
            "false_negative": int(cm[1][0]),
            "true_positive": int(cm[1][1]),
        },
        "feature_importance": {k: round(v, 4) for k, v in sorted_imp},
        "success_rate": round(df["successful_exchange"].mean(), 4),
        "trained_at": datetime.now().isoformat(),
    }

    report_path = os.path.join("models", "evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Evaluation report saved: {report_path}")

    print("\n" + "=" * 60)
    print("Training complete!")
    print("=" * 60)


if __name__ == "__main__":
    train()
