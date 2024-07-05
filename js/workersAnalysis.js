import { cleanVariants, makeJSONButton } from './helpers.js';
import data from '../data/4ky_clean.json' with {type: 'json'}

// to be expanded according to scholarship
const allTheonyms = [
    ['AN', 'MUSZ3'],
    ['EZINU'],
    ['NANSZE']
]

const allToponyms = [
    ['AB', 'NUN'],
    ['KU6', 'AB'],
    ['UH3'],
    ['DILMUN'],
    ['SZURUPPAK'], ['3N57.RU'],
    ['ADAB'], ['U4.NUN'],
    ['KI', 'NUN'],
    ['ARARMA2'], ['U4.AB'],
    ['IDIGNA'],
    ['KU6', 'UR2', 'RAD'],
    ['NAGA'],
    ['NI.RU'], ['UB'],
    ['UNUG'],
    ['ZABALAM'], ['MUSZ3+AB'],
    ['E2x1N57@t'],
    ['NUN', 'GIR3@g'],
    ['AN', 'NI'],
    ['ASAR'],
    ['GAN2', 'SI'], ['GAN2', 'URUx3N57'], ['MASZ', 'GAN2', 'SIxKU'], ['MASZ', 'GAN2', 'MUSZ3'], ['MASZ', 'GAN2', 'E2x1N57@t'], ['MASZ', 'GAN2', 'KU6', 'UR5', 'SZIR']
]

export function analysisLexical(transcriptionArray) {
    const foundLexicalItems = []
    transcriptionArray.forEach(testLine => {
        
        // early break for empty lines
        if (testLine.length === 0) return

        data.filter(tablet => tablet.inscription.accountType.includes('lexical')).forEach(tablet => {
            const tabletContent = tablet.inscription.transliterationClean
            tabletContent.split('\n').forEach(line => {
                if (!line.includes('...') && !line.includes('X')) {
                    const lexicalLine = line.replace(/,|(?<!\S)\d+N\d+(?!\S)/g, '').replace(/\bN\b/g, '').trim();
                    
                    // if the line has become empty, drop it this attempt, otherwise check for matches.
                    if (lexicalLine.length === 0) return
                    if (checkOppositeMatch(testLine, lexicalLine)) foundLexicalItems.push({tablet, lexicalLine})
                }
            })
        })
    })

    return { foundLexicalItems }
}

function checkOppositeMatch(query, lineToCheck) {
    const countQuery = countOccurrences(query.split(' '));
    const countLineToCheck = countOccurrences(lineToCheck.split(' '));

    // Iterate through each unique string in the line to check
    for (const [sign, count] of Object.entries(countLineToCheck)) {
        // Check if the count in the line to check is greater than the count in the query
        if (count > (countQuery[sign] || 0)) {
            return false; // If count in line to check is greater, return false
        }
    }

    return true; // All counts in line to check are less than or equal to counts in query
}

// Function to count occurrences of each string in an array
function countOccurrences(array) {
    const counts = {};
    for (const item of array) {
        counts[item] = (counts[item] || 0) + 1;
    }
    return counts;
}

export async function analysisSimilarity(transcriptionString, cases, numbers) {
    const similarities = new Deno.Command('python3', { args: [ `${Deno.cwd()}/ai/ai_loader_similarity.py`, transcriptionString, cases, numbers ] })
    const { stdout, stderr } = await similarities.output()

    // if (stderr) console.log(new TextDecoder().decode(stderr))
    return new TextDecoder().decode(stdout)
}

export function processSimilarity(results) {
    const parsedResults = JSON.parse(results.replace(/'/g, '"'))

    // build the HTML (only if there is something to write)
    const similarityHTML = (parsedResults.length > 0) 
        ? `<div class='urukTranscription'>` + parsedResults.slice(0, 3).map(item => `<a href='https://cdli.mpiwg-berlin.mpg.de/artifacts/${item.id}' target='_blank'>${item.designation}</a>: <span class='urukLabel'>${(item.similarity_score * 100).toFixed(1)}%</span>`).join('<br>') + '</div>'
        : ''

    // check the scores for the JSON
    const validScores = parsedResults.filter(item => !isNaN(item.similarity_score))
    const averageScore = validScores.reduce((sum, item) => sum + item.similarity_score, 0) / validScores.length
    const averageScorePercentage = (averageScore * 100).toFixed(2)
    const countAboveAverage = validScores.filter(item => item.similarity_score > averageScore).length

    const jsonButtonSimilarity = (validScores.length > 0) ? makeJSONButton({
        "count": validScores.length,
        "average": averageScorePercentage,
        "countAboveAverage": countAboveAverage,
        "scores": validScores.map(item => {
            const { id, designation, similarity_score } = item
            const link = `https://cdli.mpiwg-berlin.mpg.de/artifacts/${id}`
            const shortSimilarity = (similarity_score * 100).toFixed(1)
            return { id, designation, link, similarity_score: shortSimilarity }
        })
    }) : ''

    return { similarityHTML, jsonButtonSimilarity }
}

export async function analysisPrediction(transcriptionString) {
    const prediction = new Deno.Command('python3', { args: [ `${Deno.cwd()}/ai/ai_loader_accountType.py`, transcriptionString ] })
    const { stdout, stderr } = await prediction.output()

    // if (stderr) console.log(new TextDecoder().decode(stderr))
    return new TextDecoder().decode(stdout)
}

export function analysisFeatures(transcriptionArray) {
    const foundTheonyms = []
    const foundTimeExpressions = []
    const foundToponyms = []

    transcriptionArray.forEach(line => {
        const cleanLine = cleanVariants(line.split(' '))

        // find theonyms
        allTheonyms.forEach(theonym => {
            if (theonym.every(sign => cleanLine.includes(sign))) {
                if (!foundTheonyms.includes(theonym.join(' '))) {
                    foundTheonyms.push(theonym.join(' '))
                } 
            }
        })

        // find toponyms
        allToponyms.forEach(toponym => {
            if (toponym.every(sign => cleanLine.includes(sign))) {
                if (!foundToponyms.includes(toponym.join(' '))) {
                    foundToponyms.push(toponym.join(' '))
                } 
            }
        })

        // find time expressions
        cleanLine.forEach(sign => {
            const substrings = sign.split(/[.|x]/)
            if (substrings.includes('U4') && substrings.some(substring => substring.match(/N\d{2}$/))) {
                if (!foundTimeExpressions.includes(sign)) {
                    foundTimeExpressions.push(sign)
                }
            }
        })
    })

    return { foundTheonyms, foundTimeExpressions, foundToponyms }
}