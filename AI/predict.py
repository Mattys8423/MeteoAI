# -*- coding: utf-8 -*-

"""
PREDICT.PY

Objectif :
Predire la temperature dans X heures en simulant heure par heure.

Le modele est entraine pour predire seulement +1h.
Pour predire plusieurs heures, on boucle heure par heure.
"""

import os
import sys
from pymongo import MongoClient
import pandas as pd
import numpy as np
import joblib
from datetime import datetime, timedelta
from dotenv import load_dotenv

# ---------------------------
# PARAMETRES
# ---------------------------

if len(sys.argv) < 3:
    print("Usage: python predict.py <ville> <hours>")
    sys.exit()

city = sys.argv[1].strip()
hours = int(sys.argv[2])

if hours < 1 or hours > 24:
    print("Le nombre d'heures doit etre entre 1 et 24.")
    sys.exit()

# DOIT ETRE IDENTIQUE A train_model.py
window_size = 12

# ---------------------------
# CONNEXION MONGODB
# ---------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "..", "BackEnd", ".env")

load_dotenv(ENV_PATH)
mongo_uri = os.getenv("MONGO_URI")

if not mongo_uri:
    print("MONGO_URI introuvable dans le fichier .env")
    sys.exit()

client = MongoClient(mongo_uri)

db = client.get_default_database()
if db is None:
    db = client["weatherdb"]

weather_collection = db["weatherrecords"]
prediction_collection = db["predictions"]

# ---------------------------
# RECUPERATION DONNEES
# ---------------------------

data = list(weather_collection.find({"city": city}).sort("recordedAt", 1))

if len(data) < window_size:
    print(f"Pas assez de donnees pour {city}")
    sys.exit()

df = pd.DataFrame(data)

required_columns = [
    "temperature",
    "humidity",
    "pressure",
    "windSpeed",
    "condition",
    "recordedAt"
]

for col in required_columns:
    if col not in df.columns:
        print(f"Colonne manquante : {col}")
        sys.exit()

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

# Features ajoutees dans train_model.py
df["day_progress"] = df["hour"] / 24
df["sun_effect"] = np.sin(np.pi * df["hour"] / 24)
df["temp_mean_6h"] = df["temperature"].rolling(6).mean().bfill()
df["temp_delta"] = df["temperature"].diff().fillna(0)

# ---------------------------
# CHARGEMENT MODELE
# ---------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model_path = os.path.join(BASE_DIR, f"model/weather_model_{city}.pkl")
condition_columns_path = os.path.join(BASE_DIR, f"model/condition_columns_{city}.pkl")

if not os.path.exists(model_path):
    print(f"Aucun modele trouve pour {city}")
    sys.exit()

if not os.path.exists(condition_columns_path):
    print(f"Aucun fichier de conditions trouve pour {city}")
    sys.exit()

model = joblib.load(model_path)
condition_columns = joblib.load(condition_columns_path)

# ---------------------------
# PREDICTION MULTI-STEP
# ---------------------------

current_rows = df.tail(window_size).copy()

for step in range(hours):
    features = []

    for _, row in current_rows.iterrows():
        # Encodage condition
        condition_features = [
            1 if row["condition"] == col.replace("cond_", "") else 0
            for col in condition_columns
        ]

        base_features = [
            row["temperature"],
            row["humidity"],
            row["pressure"],
            row["windSpeed"],
            row["hour_sin"],
            row["hour_cos"],
            row["day_progress"],
            row["sun_effect"],
            row["temp_mean_6h"],
            row["temp_delta"]
        ]

        features.extend(base_features + condition_features)

    # Debug utile
    print(f"Nombre de features envoyees au modele : {len(features)}")

    pred = model.predict([features])[0]

    # ---------------------------
    # CREATION DE LA NOUVELLE LIGNE
    # ---------------------------

    last_row = current_rows.iloc[-1]
    new_time = last_row["recordedAt"] + pd.Timedelta(hours=1)

    new_row = last_row.copy()
    new_row["temperature"] = pred
    new_row["recordedAt"] = new_time

    new_row["hour"] = new_time.hour
    new_row["day"] = new_time.day
    new_row["month"] = new_time.month
    new_row["dayofweek"] = new_time.dayofweek

    new_row["hour_sin"] = np.sin(2 * np.pi * new_row["hour"] / 24)
    new_row["hour_cos"] = np.cos(2 * np.pi * new_row["hour"] / 24)

    new_row["dow_sin"] = np.sin(2 * np.pi * new_row["dayofweek"] / 7)
    new_row["dow_cos"] = np.cos(2 * np.pi * new_row["dayofweek"] / 7)

    new_row["day_progress"] = new_row["hour"] / 24
    new_row["sun_effect"] = np.sin(np.pi * new_row["hour"] / 24)

    # Mise a jour de la tendance
    new_row["temp_delta"] = pred - last_row["temperature"]

    # Mise a jour de la moyenne glissante 6h
    temp_values = list(current_rows["temperature"].values[-5:]) + [pred]
    new_row["temp_mean_6h"] = np.mean(temp_values)

    # Approximation : on conserve la condition et les autres valeurs
    new_row["condition"] = last_row["condition"]
    new_row["humidity"] = last_row["humidity"]
    new_row["pressure"] = last_row["pressure"]
    new_row["windSpeed"] = last_row["windSpeed"]

    # Mise a jour de la fenetre
    current_rows = pd.concat(
        [current_rows.iloc[1:], pd.DataFrame([new_row])],
        ignore_index=True
    )

# ---------------------------
# SAUVEGARDE MONGODB
# ---------------------------
prediction = pred

# sécurité
if prediction is None or np.isnan(prediction):
    print(f"Prediction invalide pour {hours}h -> NON INSEREE")
    sys.exit()

# normalisation
city = city.strip()
hours = int(hours)

# suppression ancienne
prediction_collection.delete_many({
    "city": city,
    "hours": hours
})

# insertion
result = prediction_collection.insert_one({
    "city": city,
    "predictedTemperature": float(prediction),
    "hours": hours,
    "predictedAt": datetime.utcnow(),
    "targetTime": datetime.utcnow() + timedelta(hours=hours)
})

print(f"INSERT OK -> id={result.inserted_id} | city={city} | hours={hours} | temp={prediction:.2f}")

print(f"Prediction OK pour {city} dans {hours}h : {prediction:.2f} °C")