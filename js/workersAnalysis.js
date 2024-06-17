import { cleanVariants } from './helpers.js';
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
        data.filter(tablet => tablet.inscription.accountType.includes('lexical')).forEach(tablet => {
            const tabletContent = tablet.inscription.transliterationClean
            tabletContent.split('\n').forEach(line => {
                if (!line.includes('...') && !line.includes('X')) {
                    const lexicalLine = line.replace(/,|(?<!\S)\d+N\d+(?!\S)/g, '').replace(/\bN\b/g, '').trim();

                    if (checkOppositeMatch(testLine, lexicalLine)) {
                        foundLexicalItems.push({tablet, lexicalLine})
                    }
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

export async function analysisSimilarity(transcriptionString) {
    
}

export async function analysisPrediction(transcriptionString) {
    const prediction = new Deno.Command('python3', { args: [ Deno.cwd() + '/ai/ai_proba_loader.py', transcriptionString ] })
    const { stdout } = await prediction.output();
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