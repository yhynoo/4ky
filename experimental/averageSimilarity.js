import data from '../ai/similarity/numbers_noCases/inputData.json' with { type: 'json' };
import { analysisSimilarity } from '../js/workersAnalysis.js';

const averages = [];
let totalAverage = 0;

async function analyzeData() {
    for (const tablet of data) {
        const { id, transliterationNoStopWords, accountType } = tablet;

        // Skip empty
        if (!transliterationNoStopWords) continue;

        // Filtering example: use only economic texts
        if (!accountType.includes('animals')) continue;

        try {
            const results = await analysisSimilarity(transliterationNoStopWords);

            // slice(1) excludes the tablet itself
            const parsedResults = JSON.parse(results.replace(/'/g, '"')).slice(1).map(item => {
                const { similarity_score } = item;
                return parseFloat((similarity_score * 100).toFixed(1));
            });

            const averageSimilarity = parsedResults.reduce((sum, score) => sum + score, 0) / parsedResults.length;
            if (!isNaN(averageSimilarity)) {
                console.log(`${id}: ${averageSimilarity.toFixed(2)}`);
                averages.push({id, score: parseFloat(averageSimilarity.toFixed(2)), accountType});
                if ((averages.length % 10) === 0) console.log(`## ${averages.length} done. ##`)
            }
        } catch (error) {
            console.error(`Error processing tablet ${id}:`, error);
        }
    }

    totalAverage = averages.map(item => item.score).reduce((sum, avg) => sum + avg, 0) / averages.length;
    
    // outputs
    const amountToShow = 3;

    console.log('Most unique ones:')
    console.log(averages.sort((a, b) => a.score - b.score).slice(0, amountToShow))

    console.log('Least unique ones:')
    console.log(averages.sort((a, b) => b.score - a.score).slice(0, amountToShow))
    
    console.log(`Total average similarity (Jaccard, sign-by-sign; no stop words): ${totalAverage.toFixed(2)} %. ${averages.length} texts were used.`);
    Deno.writeTextFile('averagesReport.json', JSON.stringify({"count": averages.length, "totalAverage": parseFloat(totalAverage.toFixed(2)), "results": averages}, null, 4))
}

// Call the analyzeData function
analyzeData();
