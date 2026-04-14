//Mettre la fonction GetWeather sur la touche entrée une fois que la page est chargée
document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            getWeather();
        }
    });

    //Mettre la fonction GetWeather sur le bouton de recherche
    document.getElementById("search-button").addEventListener("click", getWeather);
});

function getWeather() {

    //Variable de la ville
    const city = document.getElementById("cityInput").value.trim();

    if (!city) {
        alert("Veuillez saisir une ville");
        return;
    }

    //appel a l'API avec la ville en paramètre
    fetch(`http://localhost:3000/api/weather?city=${encodeURIComponent(city)}`)

        //Gerer l'exception de si la ville n'est pas trouvé dans la base de donnée
        .then(response => {
            if (!response.ok) {
                throw new Error("Ville non trouvée");
            }
            return response.json();
        })

        //fait les changements en fonction des résultats
        .then(data => {
            //variables
            const main = data.weather[0].main.toLowerCase();
            const iconCode = data.weather[0].icon;

            //Change la ville et la temperature
            document.getElementById("cityName").textContent = data.name;
            document.getElementById("temperature").textContent = `${data.main.temp} °C`;

            //Change L'icone
            document.getElementById("weatherIcon").src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

            //Montre les éléments 
            document.getElementById("weatherResult").classList.remove("hidden");

            //Changement de fond selon le temps et le moment de la journée
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

            //Charger l'historique de la ville
            loadHistory(data.name);

            //Charger la prédiction de la ville
            loadPrediction(data.name);
        })

        //Gerer les erreurs
        .catch(error => {
            console.error("Erreur :", error);
            alert(error.message);
        });
}

//Fonction pour charger l'historique de la ville
function loadHistory(city) {

    //appel a l'API pour l'historique de la ville
    fetch(`http://localhost:3000/api/history?city=${encodeURIComponent(city)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Erreur lors du chargement de l'historique");
            }
            return response.json();
        })

        //Affiche l'historique
        .then(history => {
            console.log("Historique :", history);

            //variables
            const historyContainer = document.getElementById("history");
            const historySection = document.getElementById("historySection");

            //Vider l'historique avant de le remplir
            historyContainer.innerHTML = "";

            //Si l'historique est vide, afficher un message
            if (history.length === 0) {
                historyContainer.innerHTML = "<p>Aucun historique disponible.</p>";
                historySection.classList.remove("hidden");
                return;
            }

            //Afficher l'historique
            historySection.classList.remove("hidden");

            //Afficher chaque élément de l'historique
            history.forEach(item => {
                const div = document.createElement("div");
                div.classList.add("history-item");

                div.innerHTML = `
                    <p><strong>Ville :</strong> ${item.city}</p>
                    <p><strong>Température :</strong> ${item.temperature} °C</p>
                    <p><strong>Condition :</strong> ${item.condition}</p>
                    <img src="https://openweathermap.org/img/wn/${item.icon}.png" />
                    <p><strong>Date :</strong> ${new Date(item.recordedAt).toLocaleString()}</p>
                `;

                historyContainer.appendChild(div);
            });
        })

        //Gerer les erreurs
        .catch(error => {
            console.error("Erreur historique :", error);
        });
}

//Fonction pour charger la prédiction de la ville
function loadPrediction(city) {
    fetch(`http://localhost:3000/api/prediction?city=${encodeURIComponent(city)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Aucune prédiction disponible");
            }
            return response.json();
        })
        .then(data => {
            document.getElementById("predictionValue").textContent =
                `${data.predictedTemperature.toFixed(1)} °C prévu pour bientôt`;

            document.getElementById("prediction").classList.remove("hidden");
        })
        .catch(error => {
            console.error("Erreur prédiction :", error);
        });
}


