# -*- coding: utf-8 -*-

from pymongo import MongoClient
import pandas as pd
import joblib
from datetime import datetime, timedelta

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["weatherdb"]

weather_collection = db["weatherrecords"]
prediction_collection = db["predictions"]

# On lit les données de Paris
data = list(weather_collection.find({"city": "Paris"}).sort("recordedAt", 1))

if len(data) < 5:
    print("Pas assez de donnees pour predire.")
    raise SystemExit

df = pd.DataFrame(data)

required_columns = ["temperature", "humidity", "pressure", "windSpeed", "recordedAt"]
for col in required_columns:
    if col not in df.columns:
        print(f"Colonne manquante : {col}")
        raise SystemExit

df["recordedAt"] = pd.to_datetime(df["recordedAt"])
df["hour"] = df["recordedAt"].dt.hour
df["day"] = df["recordedAt"].dt.day
df["month"] = df["recordedAt"].dt.month

window_size = 5

# On prend les 5 dernières lignes
last_rows = df.tail(window_size)

features = []

for _, row in last_rows.iterrows():
    features.extend([
        row["temperature"],
        row["humidity"],
        row["pressure"],
        row["windSpeed"],
        row["hour"],
        row["day"],
        row["month"]
    ])

model = joblib.load("model/weather_model.pkl")

prediction = model.predict([features])[0]

# On supprime l'ancienne prédiction de Paris pour garder seulement la plus récente
prediction_collection.delete_many({"city": "Paris"})

prediction_collection.insert_one({
    "city": "Paris",
    "predictedTemperature": float(prediction),
    "predictedAt": datetime.utcnow(),
    "targetTime": datetime.utcnow() + timedelta(hours=1)
})

print(f"Prediction enregistree : {prediction:.2f} °C")