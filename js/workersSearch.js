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

        tabletContent.split('\n').forEach((line, index) => {
            if (tablet.inscription.accountType.includes('economic')) {
                const { isMatch, foundCompoundsTablet } = checkMatch(term, line, distinguishVariantsFlag, splitCompoundsFlag, false)
                if (isMatch) economicAttestations.push({tablet, line: {line, index}})
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

export function processSearchEconomic(economicAttestations) {
    const hierarchy = {};

    economicAttestations.forEach(item => {
        const { 
            tablet: { id, designation },
            tablet: { inscription: { transliterationClean } },
            tablet: { origin: { provenience: place, period: time} },
            line: { line, index }
        }= item;

        if (!hierarchy[id]) hierarchy[id] = { designation, place, time, transliterationClean, lines: [] };
        if (!hierarchy[id]["lines"].some(entry => entry.index === index)) {
            hierarchy[id]["lines"].push({ line, index });
        }
    });
    return hierarchy
}

export function drawSearchEconomic(hierarchy) {
    let attestationHTML = ``;
    Object.keys(hierarchy).forEach(tablet => {
        const allLines = hierarchy[tablet].transliterationClean.split('\n')
        attestationHTML += `
            <div class='urukAttestation urukSmallText'>
                <b><a href = 'https://cdli.mpiwg-berlin.mpg.de/artifacts/${tablet}' target = '_blank'>${hierarchy[tablet].designation}</a> (${locationLabels[hierarchy[tablet].place] || 'uncertain'}, ${periodLabels[hierarchy[tablet].time] || 'uncertain'})</b> 
        `;

        hierarchy[tablet].lines.forEach(line => {
            attestationHTML += `<div class='urukTranscription'>`
            allLines[line.index - 1] ? attestationHTML += `${allLines[line.index - 1]}<br>` : ''
            attestationHTML += `${line.line.trim()}`
            allLines[line.index + 1] ? attestationHTML += `<br>${allLines[line.index + 1]}` : ''
            attestationHTML += `</div>`
        });

        attestationHTML += `</div>`;
    });
    return attestationHTML;
}

export function processSearchEconomicCompounds(economicCompounds) {
    const counts = {}

    economicCompounds.forEach(item => {
        if (!counts[item]) counts[item] = 1
        else counts[item]++
    })

    const countsArray = Object.entries(counts).sort().sort((a, b) => b[1] - a[1])

    let compoundsHTML = `<div class='urukAttestation urukSmallText'><b>Most common dismantled compound signs:</b> <div class='urukTranscription'>`
        + countsArray.slice(0, 3).map(item => `${item[0]}: <span class = 'urukLabel'>${item[1]} times, ${(item[1] / economicCompounds.length * 100).toFixed()}%</span>`).join('<br>') 
        + `</div>`
    
    // Create a download link for the JSON file
    const jsonData = JSON.stringify(Object.fromEntries(countsArray), null, 4);
    const jsonDataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonData);
    compoundsHTML += `<span class = 'urukNav'><a href="${jsonDataUri}" target="_blank">View complete results as JSON</a></span></div>`;
    
    return compoundsHTML
}

export function processSearchLexical(lexicalAttestations) {
    const hierarchy = {}

    lexicalAttestations.forEach(item => {
        let { 
            tablet: { id },
            tablet: { inscription: { compositeId: text } },
            tablet: { origin: { provenience: place, period: time} },
            lexicalLine 
        }= item

        lexicalLine = lexicalLine.split(' ').sort().join(' ');

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

// unused
export function processSearchLexicalCompounds(lexicalCompounds) {
    const items = new Set(lexicalCompounds)
    return `<div class='urukAttestation urukSmallText'><b>Dismantled compounds found in lexical lists:</b>
    <div class='urukTranscription'>` + Array.from(items).join(', ') + `</div></div>`
}