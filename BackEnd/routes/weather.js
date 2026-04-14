// routes/weather.js
const express = require("express");
const axios = require("axios");
const WeatherRecord = require("../models/WeatherRecord");

// Route pour récupérer les données météo actuelles
const router = express.Router();

// fonction pour récupérer les données météo actuelles d'une ville
router.get("/", async (req, res) => {
    // Récupère la ville depuis les paramètres de requête
    try {
        const city = req.query.city;

        if (!city) {
            return res.status(400).json({ error: "Le paramètre city est obligatoire" });
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=fr`;

        const response = await axios.get(url);
        const data = response.data;

        // Sauvegarde dans MongoDB
        const lastRecord = await WeatherRecord.findOne({ city: data.name })
            .sort({ recordedAt: -1 });

        if (!lastRecord || Math.abs(lastRecord.temperature - data.main.temp) > 0.2) {
            const newRecord = new WeatherRecord({
                city: data.name,
                temperature: data.main.temp,
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                windSpeed: data.wind.speed,
                condition: data.weather[0].main,
                icon: data.weather[0].icon
            });

            await newRecord.save();
        }

        // On renvoie les données brutes au frontend
        res.json(data);

    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: "Ville non trouvée" });
        }

        console.error("Erreur API météo :", error.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Export du routeur
module.exports = router;