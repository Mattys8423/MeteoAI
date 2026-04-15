// Script pour la page météo
document.addEventListener("DOMContentLoaded", () => {

    document.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            getWeather();
        }
    });

    document.getElementById("search-button").addEventListener("click", getWeather);
    document.getElementById("predict-button").addEventListener("click", loadPrediction);

    // Cacher les sections au démarrage
    document.getElementById("predictionSection").classList.add("hidden");
    document.getElementById("predictionControls").classList.add("hidden");
    document.getElementById("prediction").classList.add("hidden");
    document.getElementById("forecastChartSection").classList.add("hidden");
});

// fonction pour récupérer les données météo actuelles d'une ville
function getWeather() {

    const cityInput = document.getElementById("cityInput");
    const city = cityInput.value.trim();

    const predictionControls = document.getElementById("predictionControls");
    const predictionSection = document.getElementById("predictionSection");
    const predictionBlock = document.getElementById("prediction");
    const predictionValue = document.getElementById("predictionValue");

    if (!city) {
        alert("Veuillez saisir une ville");
        return;
    }

    // Reset prédiction
    predictionBlock.classList.add("hidden");
    predictionValue.textContent = "";

    fetch(`http://localhost:3000/api/weather?city=${encodeURIComponent(city)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Ville non trouvée");
            }
            return response.json();
        })
        .then(data => {

            const main = data.weather[0].main.toLowerCase();
            const iconCode = data.weather[0].icon;

            document.getElementById("cityName").textContent = data.name;
            document.getElementById("temperature").textContent = `${data.main.temp} °C`;
            document.getElementById("weatherIcon").src =
                `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

            document.getElementById("weatherResult").classList.remove("hidden");

            // Fond dynamique
            if (main.includes("clear") && iconCode.includes("d")) {
                document.body.className = "sunny";
            } else if (
                main.includes("rain") ||
                main.includes("drizzle") ||
                main.includes("thunderstorm")
            ) {
                document.body.className = "rainy";
            } else {
                document.body.className = "cloudy";
            }

            loadHistory(data.name);

            // Affichage bloc prédiction
            predictionSection.classList.remove("hidden");
            predictionControls.classList.remove("hidden");
        })
        .catch(error => {
            console.error("Erreur météo :", error);
            alert(error.message);
        });
}

// fonction pour charger l'historique météo de la ville
function loadHistory(city) {

    fetch(`http://localhost:3000/api/history?city=${encodeURIComponent(city)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Erreur historique");
            }
            return response.json();
        })
        .then(history => {

            const container = document.getElementById("history");
            const section = document.getElementById("historySection");

            container.innerHTML = "";

            if (history.length === 0) {
                container.innerHTML = "<p>Aucun historique disponible.</p>";
                section.classList.remove("hidden");
                return;
            }

            section.classList.remove("hidden");

            history.forEach(item => {

                const div = document.createElement("div");
                div.classList.add("history-item");

                div.innerHTML = `
                    <p><strong>Température :</strong> ${item.temperature} °C</p>
                    <p><strong>Condition :</strong> ${item.condition}</p>
                    <img src="https://openweathermap.org/img/wn/${item.icon}.png">
                    <p>${new Date(item.recordedAt).toLocaleString()}</p>
                `;

                container.appendChild(div);
            });
        })
        .catch(err => console.error("Erreur historique :", err));
}

// fonction pour charger la prédiction de température pour les heures à venir
function loadPrediction() {

    const city = document.getElementById("cityName").textContent;
    const hours = parseInt(document.getElementById("predictionHours").value, 10);

    const predictionBlock = document.getElementById("prediction");
    const predictionValue = document.getElementById("predictionValue");

    if (!city) {
        alert("Veuillez d'abord rechercher une ville.");
        return;
    }

    if (isNaN(hours) || hours < 1 || hours > 24) {
        alert("Veuillez choisir entre 1 et 24h.");
        return;
    }

    predictionValue.textContent = "Calcul en cours...";
    predictionBlock.classList.remove("hidden");

    fetch(`http://localhost:3000/api/prediction?city=${encodeURIComponent(city)}&hours=${hours}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Erreur prédiction");
            }
            return response.json();
        })
        .then(data => {

            if (!data) {
                predictionValue.textContent = "Pas de prediction disponible";
                return;
            }

            predictionValue.textContent =
                `${data.predictedTemperature.toFixed(1)} °C dans ${data.hours}h`;

            // Charger le graphique
            loadForecastChart(city);
        })
        .catch(error => {
            console.error(error);
            predictionValue.textContent = error.message;
        });
}

// fonction pour charger le graphique de prévision pour les 6 prochaines heures
let chartInstance = null;

async function loadForecastChart(city) {
    const section = document.getElementById("forecastChartSection");

    try {
        const response = await fetch(
            `http://localhost:3000/api/prediction/next6h?city=${encodeURIComponent(city)}`
        );

        if (!response.ok) {
            console.error("Erreur API graphique");
            section.classList.add("hidden");
            return;
        }

        const predictions = await response.json();

        if (!Array.isArray(predictions) || predictions.length !== 6) {
            console.error("Données insuffisantes pour le graphique :", predictions);
            section.classList.add("hidden");
            return;
        }

        renderChart(predictions);
        section.classList.remove("hidden");

    } catch (error) {
        console.error("Erreur graphique :", error);
        section.classList.add("hidden");
    }
}

// Fonction pour afficher le graphique avec Chart.js
function renderChart(predictions) {
    const ctx = document.getElementById("forecastChart").getContext("2d");

    const labels = predictions.map(p => `+${p.hours}h`);
    const values = predictions.map(p => p.predictedTemperature);

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Température prévue (°C)",
                data: values,
                borderWidth: 2,
                tension: 0.3,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}