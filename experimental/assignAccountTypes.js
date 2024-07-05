import data from '../ai/aiInput.json' with {type: 'json'}
import { analysisPrediction } from '../js/workersAnalysis.js'

//
//  Careful! this script only works if you swith the ai_loader_accountType.py output to "alternative"
//

const madePredictions = {"animals": {"total": 0, "list": []}, "cereal": {"total": 0, "list": []}, "fields": {"total": 0, "list": []}, "humans": {"total": 0, "list": []}}

async function makePredictions() {
    for (let item of data.slice(0, 500)) {
        const { link, inscription: { accountType }, ai: { transcriptionNoCasesNumbers } } = item;

        if (accountType.length < 2 && accountType.includes('economic')) {
            const predictions = await analysisPrediction(transcriptionNoCasesNumbers);
            const parsedPredictions = JSON.parse(predictions.trim())

            // debug:
            console.log(predictions.trim())

            // organizing:
            parsedPredictions.forEach((item, index) => {
                if (item > 0.9) {
                    madePredictions[["animals", "cereal", "fields", "humans"][index]]["total"]++
                    madePredictions[["animals", "cereal", "fields", "humans"][index]]["list"].push(link)
                }
            })
        } else continue
    }

    Deno.writeTextFile('assignedAccountTypes', JSON.stringify(madePredictions, null, 4))
    console.log('Done.')
}

// runtime
makePredictions()