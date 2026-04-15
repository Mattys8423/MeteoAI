// server.js
require("dotenv").config();

// Import des modules
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import des routes
const weatherRoutes = require("./routes/weather");
const historyRoutes = require("./routes/history");
const predictionRoutes = require("./routes/prediction");
const { startWeatherCollectionJob } = require("./jobs/collectWeather");
const { startTrainingJob } = require("./jobs/trainModel");

// Création de l'application Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connecté");
    })
    .catch((error) => {
        console.error("Erreur MongoDB :", error);
    });

// Routes API
app.use("/api/weather", weatherRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/prediction", predictionRoutes);

// Démarrage de la tâche de collecte automatique
startWeatherCollectionJob();
startTrainingJob();

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});