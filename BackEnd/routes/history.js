// routes/history.js
const express = require("express");
const WeatherRecord = require("../models/WeatherRecord");

// Route pour récupérer l'historique des mesures d'une ville
const router = express.Router();

// fonction pour récupérer l'historique des mesures d'une ville
router.get("/", async (req, res) => {
    // Récupère la ville depuis les paramètres de requête
    try {
        const city = req.query.city;

        if (!city) {
            return res.status(400).json({ error: "Le paramètre city est obligatoire" });
        }

        // Récupère les 5 dernières mesures de la ville (insensible à la casse)
        const history = await WeatherRecord.find({
            city: new RegExp(`^${city}$`, "i")
        })
            .sort({ recordedAt: -1 })
            .limit(5);

        res.json(history);

    } catch (error) {
        console.error("Erreur historique :", error.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Export du routeur
module.exports = router;