# -*- coding: utf-8 -*-

""" Ce code se connecte à une base de données MongoDB, 
récupère les enregistrements météorologiques pour la ville de Paris, 
et prépare les données pour l'entraînement d'un modèle de machine learning. 
Il crée des séquences de températures sur une fenêtre glissante de 5 jours pour prédire la température du jour suivant.
"""
from pymongo import MongoClient
import pandas as pd
import numpy as np

# Connexion à la base de données MongoDB
client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["weatherdb"]
collection = db["weatherrecords"]

# Récupération des enregistrements météorologiques pour la ville de Paris, triés par date
data = list(collection.find({"city": "Paris"}).sort("recordedAt", 1))
df = pd.DataFrame(data)

# Préparation des données pour l'entraînement du modèle de machine learning
temperatures = df["temperature"].values

X = []
y = []

window_size = 5

# Création de séquences de températures sur une fenêtre glissante de 5 jours pour prédire la température du jour suivant
for i in range(len(temperatures) - window_size):
    X.append(temperatures[i:i+window_size])
    y.append(temperatures[i+window_size])

X = np.array(X)
y = np.array(y)

print("X shape :", X.shape)
print("y shape :", y.shape)
print("Premier exemple X :", X[0])
print("Premier y :", y[0])