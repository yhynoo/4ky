import data from '../data/4ky_clean.json' with {type: 'json'}
import { checkMatch } from './helpers.js';
import { lexicalListLabels, locationLabels, periodLabels } from './labels.js';

export function searchCorpus(term, _periods, _origins, distinguishVariantsFlag, splitCompoundsFlag) {
    const economicAttestations = []
    const economicCompounds = []
    const lexicalAttestations = []
    const lexicalCompounds = []

    // dodać filtry

    data.forEach(tablet => {
        const tabletContent = tablet.inscription.transliterationClean

        tabletContent.split('\n').forEach(line => {
            if (tablet.inscription.accountType.includes('economic')) {
                const { isMatch, foundCompoundsTablet } = checkMatch(term, line, distinguishVariantsFlag, splitCompoundsFlag, false)
                if (isMatch) economicAttestations.push({tablet, line})
                if (foundCompoundsTablet.length > 0) economicCompounds.push(foundCompoundsTablet.join(', '))
            }

            if (tablet.inscription.accountType.includes('lexical')) {
                if (!line.includes('...') && !line.includes('X')) {
                    const lexicalLine = line.replace(/,|(?<!\S)\d+N\d+(?!\S)/g, '').replace(/\bN\b/g, '').trim();
                    const { isMatch, foundCompoundsTablet } = checkMatch(term, lexicalLine, distinguishVariantsFlag, splitCompoundsFlag, true)
                    
                    if (isMatch) lexicalAttestations.push({tablet, lexicalLine})
                    if (foundCompoundsTablet.length > 0) lexicalCompounds.push(foundCompoundsTablet.join(', '))
                }
            }
        })
    })

    return { economicAttestations, economicCompounds, lexicalAttestations, lexicalCompounds }

}

export function processSearchLexical(lexicalAttestations) {
    const hierarchy = {}

    lexicalAttestations.forEach(item => {
        const { 
            tablet: { id },
            tablet: { inscription: { compositeId: text } },
            tablet: { origin: { provenience: place, period: time} },
            lexicalLine 
        }= item

        if (!hierarchy[lexicalLine]) hierarchy[lexicalLine] = {}
        if (!hierarchy[lexicalLine][text]) hierarchy[lexicalLine][text] = {}
        if (!hierarchy[lexicalLine][text][place]) hierarchy[lexicalLine][text][place] = []

        hierarchy[lexicalLine][text][place].push({id, time})

    })
    return hierarchy
}

export function drawSearchLexical(hierarchy) {
    let attestationHTML = ``
    Object.keys(hierarchy).sort().forEach(line => {
        attestationHTML += `
            <div class = 'urukAttestation urukSmallText'>
            <b>${line}</b>`

        Object.keys(hierarchy[line]).sort().forEach(text => {
            attestationHTML += `
                <div class = 'urukTranscription'>
                <b>${lexicalListLabels[text] || 'unknown'}</b><br>`

                Object.keys(hierarchy[line][text]).sort().forEach(place => {
                    attestationHTML += `<p>${locationLabels[place] || 'uncertain'} (${hierarchy[line][text][place].length}): <span class = 'urukLabel'>`
                    attestationHTML += hierarchy[line][text][place].map(item => {
                        return `<a href = 'https://cdli.mpiwg-berlin.mpg.de/artifacts/${item.id}' target='_blank'>${item.id}</a> (${periodLabels[item.time]})`
                    }).join(', ')
                })
                attestationHTML += '</span></p></div>'
        })
        attestationHTML += `</div>`
    })

    return attestationHTML
}