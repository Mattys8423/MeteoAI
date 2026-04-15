const cron = require("node-cron");
const { exec } = require("child_process");
const path = require("path");

function startTrainingJob() {
    // Tous les jours à 02:00
    cron.schedule("0 2 * * *", () => {
        console.log("Entrainement du modele en cours...");

        const aiPath = path.join(__dirname, "../../AI");

        exec("python train_model.py", { cwd: aiPath }, (error, stdout, stderr) => {
            if (error) {
                console.error("Erreur train_model.py :", error.message);
                return;
            }

            if (stderr) {
                console.error("STDERR train_model.py :", stderr);
            }

            console.log(stdout);

            exec("python predict.py", { cwd: aiPath }, (error2, stdout2, stderr2) => {
                if (error2) {
                    console.error("Erreur predict.py :", error2.message);
                    return;
                }

                if (stderr2) {
                    console.error("STDERR predict.py :", stderr2);
                }

                console.log(stdout2);
            });
        });
    });

    console.log("Tache de re-entrainement quotidienne activee.");
}

module.exports = { startTrainingJob };