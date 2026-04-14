const cron = require("node-cron");
const axios = require("axios");
const WeatherRecord = require("../models/WeatherRecord");

const cities = ["Paris", "Lyon", "Marseille", "Lille", "Toulouse"];

async function fetchAndStoreWeather(city) {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=fr`;

    const response = await axios.get(url);
    const data = response.data;

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
    console.log(`Donnees enregistrees pour ${data.name}`);
}

function startWeatherCollectionJob() {
    // Toutes les heures à minute 0
    cron.schedule("0 * * * *", async () => {
        console.log("Collecte automatique en cours...");

        for (const city of cities) {
            try {
                await fetchAndStoreWeather(city);
            } catch (error) {
                console.error(`Erreur pour ${city}:`, error.message);
            }
        }
    });

    console.log("Tache de collecte horaire activee.");
}

module.exports = { startWeatherCollectionJob };