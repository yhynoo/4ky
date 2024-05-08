import { cleanVariants } from './transcriptionCleaner.js'

// to be expanded according to scholarship
const allTheonyms = [
    ['AN', 'MUSZ3'],
    ['EZINU'],
    ['NANSZE']
]

const allToponyms = [
    ['ADAB'],
    ['ARARMA2'],
    ['KU6', 'UR2', 'RAD'],
    ['NI.RU'],
    ['UNUG']
]

export function checkSimpleFeatures(transcriptionArray) {
    const foundTheonyms = []
    const foundTimeExpressions = []
    const foundToponyms = []

    transcriptionArray.forEach(line => {
        const cleanLine = []
        const splitLine = line.split(' ')

        splitLine.forEach(sign => {
            cleanLine.push(cleanVariants(sign))
        })

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