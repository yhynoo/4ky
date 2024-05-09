import data from '../data/4ky_clean.json' with {type: 'json'}
import { checkMatch } from './helpers.js';

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