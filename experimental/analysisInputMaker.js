import data from '../data/4ky_clean.json' with {type: 'json'}
import { makeCasesAndNumbers } from '../js/helpers.js'

const preparedData = []

data.forEach(tablet => {
    const {id, designation, link, inscription: {transliterationClean, compositeId, accountType, features}, origin: {period, provenience}} = tablet

    const transcriptionNoCasesNoNumbers = transliterationClean.split('\n').map(line => makeCasesAndNumbers(line, false, false)).join('\n')
    const transcriptionCasesNoNumbers   = transliterationClean.split('\n').map(line => makeCasesAndNumbers(line, true, false)).join('\n')

    const transcriptionNoCasesNumbers   = transliterationClean.split('\n').map(line => makeCasesAndNumbers(line, false, true)).join('\n')
    const transcriptionCasesNumbers     = transliterationClean.split('\n').map(line => makeCasesAndNumbers(line, true, true)).join('\n')

    preparedData.push({
        id,
        designation,
        link,
        "inscription": {
            transliterationClean,
            compositeId,
            accountType,
            features
        },
        "ai": {
            transcriptionNoCasesNoNumbers,
            transcriptionCasesNoNumbers,
            transcriptionNoCasesNumbers,
            transcriptionCasesNumbers
        },
        "origin": {
            period,
            provenience
        }
    })
})

Deno.writeTextFile('ai/aiInput.json', JSON.stringify(preparedData, null, 4));