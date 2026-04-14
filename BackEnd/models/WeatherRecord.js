// models/WeatherRecord.js
const mongoose = require("mongoose");

// Schéma pour les enregistrements météo
const WeatherRecordSchema = new mongoose.Schema({
    city: {
        type: String,
        required: true
    },
    temperature: {
        type: Number,
        required: true
    },
    humidity: Number,
    pressure: Number,
    windSpeed: Number,
    condition: String,
    icon: String,
    recordedAt: {
        type: Date,
        default: Date.now
    }
});

// Export du modèle
module.exports = mongoose.model("WeatherRecord", WeatherRecordSchema);