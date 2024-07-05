import data from '../ai/aiInput.json' with { type: 'json' };
import { analysisSimilarity } from '../js/workersAnalysis.js';

const averages = [];

async function analyzeData() {
    try {
        for (const item of data.slice(0, 25)) {
            const { id, inscription: { accountType }, ai: { transcriptionCasesNoNumbers } } = item;

            if (!transcriptionCasesNoNumbers || !accountType.includes('economic')) {
                continue; // Skip empty or non-economic texts
            }

            try {
                const results = await analysisSimilarity(transcriptionCasesNoNumbers, 1, 0);
                const parsedResults = JSON.parse(results.replace(/'/g, '"')).slice(1);

                const scores = parsedResults.map(item => {
                    const { similarity_score } = item;
                    return parseFloat((similarity_score * 100).toFixed(1));
                });

                const averageSimilarity = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                if (!isNaN(averageSimilarity)) {
                    console.log(`${id}: ${averageSimilarity.toFixed(2)}`);
                    averages.push({ id, score: parseFloat(averageSimilarity.toFixed(2)), accountType });
                    if (averages.length % 10 === 0) {
                        console.log(`## ${averages.length} done. ##`);
                    }
                } else {
                    console.log(`Average similarity for ${id} is NaN`);
                }
            } catch (error) {
                console.error(`Error processing tablet ${id}:`, error);
            }
        }
    } catch (error) {
        console.error('Error during data analysis:', error);
    }
}

async function calculateAndWriteReport() {
    await analyzeData();

    if (averages.length > 0) {
        const totalAverage = averages.reduce((sum, item) => sum + item.score, 0) / averages.length;
        console.log(`Total average similarity: ${totalAverage.toFixed(2)} %. ${averages.length} texts were used.`);
        await Deno.writeTextFile('averagesReport.json', JSON.stringify({ count: averages.length, totalAverage: parseFloat(totalAverage.toFixed(2)), results: averages }, null, 4));
    } else {
        console.log('No valid texts were analyzed.');
    }
}

// Call the main function to start the program
calculateAndWriteReport();
