# -*- coding: utf-8 -*-

"""
TRAIN_MODEL.PY

Modèle IA pour prédire la température à +1h
"""

from pymongo import MongoClient
import pandas as pd
import numpy as np
import joblib
import os
import sys
from sklearn.ensemble import GradientBoostingRegressor

# ---------------------------
# PARAMETRES
# ---------------------------

if len(sys.argv) < 2:
    print("Usage: python train_model.py <ville>")
    sys.exit()

city = sys.argv[1]
window_size = 12  # historique utilisé

# ---------------------------
# CONNEXION MONGODB
# ---------------------------

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["weatherdb"]
collection = db["weatherrecords"]

# ---------------------------
# RECUPERATION DONNEES
# ---------------------------

data = list(collection.find({"city": city}).sort("recordedAt", 1))

if len(data) < window_size + 1:
    print("Pas assez de donnees pour entrainer le modele.")
    sys.exit()

df = pd.DataFrame(data)

# ---------------------------
# FEATURE ENGINEERING
# ---------------------------

df["recordedAt"] = pd.to_datetime(df["recordedAt"])

df["hour"] = df["recordedAt"].dt.hour
df["day"] = df["recordedAt"].dt.day
df["month"] = df["recordedAt"].dt.month
df["dayofweek"] = df["recordedAt"].dt.dayofweek

# Encodage cyclique
df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

df["dow_sin"] = np.sin(2 * np.pi * df["dayofweek"] / 7)
df["dow_cos"] = np.cos(2 * np.pi * df["dayofweek"] / 7)

# progression de la journée (0 à 1)
df["day_progress"] = df["hour"] / 24
df["sun_effect"] = np.sin(np.pi * df["hour"] / 24)
df["temp_mean_6h"] = df["temperature"].rolling(6).mean().bfill()

# Tendance
df["temp_delta"] = df["temperature"].diff().fillna(0)

# Encodage condition météo
condition_dummies = pd.get_dummies(df["condition"], prefix="cond")
df = pd.concat([df, condition_dummies], axis=1)
condition_columns = list(condition_dummies.columns)

# ---------------------------
# CREATION DATASET (X / y)
# ---------------------------

X = []
y = []

for i in range(len(df) - window_size):
    target_index = i + window_size

    features = []

    for j in range(i, i + window_size):
        row = df.iloc[j]

        base_features = [
            row["temperature"],
            row["humidity"],
            row["pressure"],
            row["windSpeed"],
            row["hour_sin"],
            row["hour_cos"],
            row["day_progress"],   # ✔ ajouté
            row["sun_effect"],     # ✔ ajouté
            row["temp_mean_6h"],   # ✔ ajouté
            row["temp_delta"]
        ]

        condition_features = [row[col] for col in condition_columns]

        features.extend(base_features + condition_features)

    X.append(features)
    y.append(df.iloc[target_index]["temperature"])

X = np.array(X)
y = np.array(y)

print(f"Nombre d'exemples : {len(X)}")

# ---------------------------
# MODELE IA
# ---------------------------

model = GradientBoostingRegressor(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=4,
    random_state=42
)

model.fit(X, y)

# ---------------------------
# SAUVEGARDE
# ---------------------------

os.makedirs("model", exist_ok=True)

joblib.dump(model, f"model/weather_model_{city}.pkl")
joblib.dump(condition_columns, f"model/condition_columns_{city}.pkl")

print(f"Modele entrainé pour {city}")