# -*- coding: utf-8 -*-

from pymongo import MongoClient
import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestRegressor

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["weatherdb"]
collection = db["weatherrecords"]

# Récupération des données triées par date
data = list(collection.find({"city": "Paris"}).sort("recordedAt", 1))

if len(data) < 5:
    print("Pas assez de donnees pour entrainer le modele.")
    raise SystemExit

df = pd.DataFrame(data)

# Vérification des colonnes nécessaires
required_columns = ["temperature", "humidity", "pressure", "windSpeed", "recordedAt"]
for col in required_columns:
    if col not in df.columns:
        print(f"Colonne manquante : {col}")
        raise SystemExit

# Transformation de la date
df["recordedAt"] = pd.to_datetime(df["recordedAt"])
df["hour"] = df["recordedAt"].dt.hour
df["day"] = df["recordedAt"].dt.day
df["month"] = df["recordedAt"].dt.month

# On construit les données avec une fenêtre glissante
window_size = 5
X = []
y = []

temperatures = df["temperature"].values
humidities = df["humidity"].values
pressures = df["pressure"].values
winds = df["windSpeed"].values
hours = df["hour"].values
days = df["day"].values
months = df["month"].values

for i in range(len(df) - window_size):
    features = []

    for j in range(i, i + window_size):
        features.extend([
            temperatures[j],
            humidities[j],
            pressures[j],
            winds[j],
            hours[j],
            days[j],
            months[j]
        ])

    X.append(features)
    y.append(temperatures[i + window_size])

X = np.array(X)
y = np.array(y)

if len(X) == 0:
    print("Pas assez de donnees apres preparation.")
    raise SystemExit

# Modèle plus robuste
model = RandomForestRegressor(
    n_estimators=200,
    random_state=42
)

model.fit(X, y)

# Création du dossier model si besoin
os.makedirs("model", exist_ok=True)

# Sauvegarde
joblib.dump(model, "model/weather_model.pkl")

print("Modele entraine et sauvegarde.")
print(f"Nombre d'exemples d'entrainement : {len(X)}")
print(f"Nombre de variables par exemple : {X.shape[1]}")