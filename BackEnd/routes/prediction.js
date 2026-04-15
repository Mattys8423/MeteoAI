// ---------------------------
// IMPORTS
// ---------------------------

const express = require("express");
const mongoose = require("mongoose");
const { spawn } = require("child_process");
const path = require("path");

const router = express.Router();

// ---------------------------
// CONFIG
// ---------------------------

const aiPath = path.join(__dirname, "../../AI");
const pythonExe = "C:\\Users\\matty\\AppData\\Local\\Programs\\Python\\Python311\\python.exe";

// ---------------------------
// MODELE MONGODB
// ---------------------------

const PredictionSchema = new mongoose.Schema({
    city: String,
    predictedTemperature: Number,
    hours: Number,
    predictedAt: Date,
    targetTime: Date
});

const Prediction = mongoose.model("Prediction", PredictionSchema);

// ---------------------------
// FONCTION UTILITAIRE PYTHON
// ---------------------------

function runPrediction(city, hours) {
    return new Promise((resolve) => {

        const py = spawn(pythonExe, ["predict.py", city, String(hours)], { cwd: aiPath });

        let stdout = "";
        let stderr = "";

        py.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        py.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        py.on("close", (code) => {

            console.log(`Python ${hours}h -> STDOUT:`, stdout);
            console.log(`Python ${hours}h -> STDERR:`, stderr);

            if (code !== 0) {
                resolve({
                    success: false,
                    error: stderr || `Erreur code ${code}`
                });
            } else {
                resolve({ success: true });
            }
        });
    });
}

// ---------------------------
// ROUTE SIMPLE (1 PRÉDICTION)
// ---------------------------

router.get("/", async (req, res) => {
    try {
        const city = req.query.city;
        const hours = parseInt(req.query.hours || "1", 10);

        if (!city) {
            return res.status(400).json({ error: "Ville requise" });
        }

        if (isNaN(hours) || hours < 1 || hours > 24) {
            return res.status(400).json({ error: "hours doit etre entre 1 et 24" });
        }

        const result = await runPrediction(city, hours);

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        const prediction = await Prediction.findOne({ city, hours })
            .sort({ predictedAt: -1 });

        res.json(prediction || null);

    } catch (error) {
        console.error("Erreur prediction :", error.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ---------------------------
// ROUTE 6H (GRAPHIQUE)
// ---------------------------

router.get("/next6h", async (req, res) => {
    try {
        const city = req.query.city;

        if (!city) {
            return res.status(400).json({ error: "Ville requise" });
        }

        const predictions = [];

        // 🔥 Génère les prédictions 1 → 6h
        for (let h = 1; h <= 6; h++) {

            const result = await runPrediction(city, h);

            if (!result.success) {
                return res.status(500).json({
                    error: `Erreur Python pour ${h}h`,
                    details: result.error
                });
            }

            const prediction = await Prediction.findOne({ city, hours: h })
                .sort({ predictedAt: -1 });

            if (!prediction) {
                return res.status(404).json({
                    error: `Prediction manquante pour ${h}h`
                });
            }

            predictions.push(prediction);
        }

        res.json(predictions);

    } catch (error) {
        console.error("Erreur next6h :", error.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ---------------------------
// EXPORT
// ---------------------------

module.exports = router;