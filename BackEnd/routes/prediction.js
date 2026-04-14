// Route pour prédire la température future basée sur les données historiques
const express = require("express");
const mongoose = require("mongoose");

// Route pour prédire la température future basée sur les données historiques
const router = express.Router();

// Modèle de prédiction (pour stocker les prédictions si besoin)
const PredictionSchema = new mongoose.Schema({
    city: String,
    predictedTemperature: Number,
    predictedAt: Date,
    targetTime: Date
});

// Export du modèle de prédiction
const Prediction = mongoose.model("Prediction", PredictionSchema);

// fonction pour prédire la température future basée sur les données historiques
router.get("/", async (req, res) => {
    try {
        const city = req.query.city;

        const prediction = await Prediction.findOne({ city })
            .sort({ predictedAt: -1 });

        if (!prediction) {
            return res.status(404).json({ error: "Aucune prédiction disponible" });
        }

        res.json(prediction);
    } catch (error) {
        console.error("Erreur prediction :", error.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Export du routeur
module.exports = router;