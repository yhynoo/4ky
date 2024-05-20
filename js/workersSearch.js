import data from '../data/4ky_clean.json' with {type: 'json'}
import { checkMatch, highlightMatches, isStopWord, cleanVariants } from './helpers.js';
import { lexicalListLabels, locationLabels, periodLabels } from './labels.js';

export function searchCorpus(term, periods, origins, distinguishVariantsFlag, splitCompoundsFlag) {
    let economicAttestations = [];
    let lexicalAttestations = [];
    const economicCompounds = [];
    const lexicalCompounds = [];

    // Split the term into an array of terms
    const terms = term.split(",").map(t => t.trim());
    const isCoordinated = (terms.length > 1) ? true : false;

    // Filtering
    let filteredTablets = data;
    const processedPeriods = (periods === 'undefined') ? [] : periods.split(",");
    const processedOrigins = (origins === 'undefined') ? [] : origins.split(",");

    if (processedPeriods.length > 0) {
        filteredTablets = filteredTablets.filter(tablet => processedPeriods.includes(tablet.origin.period.toString()));
    }

    if (processedOrigins.length > 0) {
        if (processedOrigins.includes("0")) {
            processedOrigins.push("12", "42", "44", "91", "97", "130", "137", "161", "184", "217", "279");
        }
        filteredTablets = filteredTablets.filter(tablet => processedOrigins.includes(tablet.origin.provenience.toString()));
    }

    // Searching
    filteredTablets.forEach(tablet => {
        const tabletContent = tablet.inscription.transliterationClean;

        const economicTermMatches = new Set();
        const lexicalTermMatches = new Set();

        tabletContent.split('\n').forEach((line, index) => {
            if (tablet.inscription.accountType.includes('economic')) {
                terms.forEach(term => {
                    const { isMatch, foundCompoundsTablet } = checkMatch(term, line, distinguishVariantsFlag, splitCompoundsFlag, false);
                    if (isMatch) {
                        economicTermMatches.add(term);
                        const highlightedLine = highlightMatches(terms, line, distinguishVariantsFlag, splitCompoundsFlag);
                        economicAttestations.push({ tablet, line: { highlightedLine, line, index } });
                    }
                    if (foundCompoundsTablet.length > 0) {
                        foundCompoundsTablet.forEach(compound => economicCompounds.push(compound))
                    }
                });
            }

            if (tablet.inscription.accountType.includes('lexical')) {
                if (!line.includes('...') && !line.includes('X')) {
                    const lexicalLine = line.replace(/,|(?<!\S)\d+N\d+(?!\S)/g, '').replace(/\bN\b/g, '').trim();
                    terms.forEach(term => {
                        const { isMatch, foundCompoundsTablet } = checkMatch(term, lexicalLine, distinguishVariantsFlag, splitCompoundsFlag, true);
                        if (isMatch) {
                            lexicalTermMatches.add(term);
                            lexicalAttestations.push({ tablet, lexicalLine });
                        }
                        if (foundCompoundsTablet.length > 0) lexicalCompounds.push(foundCompoundsTablet.join(', '));
                    });
                }
            }
        });

        // Only keep attestations if all terms are matched
        if (economicTermMatches.size !== terms.length) {
            economicAttestations = economicAttestations.filter(attestation => attestation.tablet !== tablet);
        }

        if (lexicalTermMatches.size !== terms.length) {
            lexicalAttestations = lexicalAttestations.filter(attestation => attestation.tablet !== tablet);
        }
    });

    return { economicAttestations, economicCompounds, lexicalAttestations, lexicalCompounds, isCoordinated };
}

export function countUniqueAccounts(economicAttestations) {
    const uniqueAccounts = {}
    economicAttestations.forEach(item => {
        if (!uniqueAccounts[item.tablet.id]) uniqueAccounts[item.tablet.id] = item
    })
    return Object.keys(uniqueAccounts).length
}

export function processSearchDistribution(economicAttestations) {

    // make the actual table
    const table = [
        ['',    105,    159,    72,     154,    168,    306,    1000],
        [4,     0,      0,      0,      0,      0,      0,      0],
        [3,     0,      0,      0,      0,      0,      0,      0],
        [2,     0,      0,      0,      0,      0,      0,      0],
    ];
    
    economicAttestations.forEach(item => {
        let column = table[0].indexOf(item.tablet.origin.provenience)
        if (column === -1) column = 7;

        let row = 1;
        switch(item.tablet.origin.period) {
            case 3: {
                row = 2;
                break
            }
            case 2: {
                row = 3;
                break
            }
        }
        table[row][column]++
    })

    // make the HTML
    let distributionHTML = `<div class='urukAttestation urukSmallText'><b>Distribution:</b><div class = 'urukTranscription'><table class = 'urukTable'>`;

    table.forEach((row, index) => {
        distributionHTML += `<tr>`
        if (index === 0) {
            row.forEach((column, index) => distributionHTML += (index === 0) ? '<td></td>' : `<td><b>${locationLabels[column]}</b></td>`)
        } else {
            row.forEach((column, index) => {
                if (index === 0) {
                    distributionHTML += `<td><b>${periodLabels[column]}</b></td>`
                } else {
                    distributionHTML += (column === 0) ? '<td></td>' : `<td>${column}</td>`
                }
            });
        }
        distributionHTML += `</tr>`
    });
    distributionHTML += '</table></div></div>'

    return distributionHTML
}

export function processSearchCollocations(query, economicAttestations, distinguishVariantsFlag, splitCompoundsFlag, isCoordinated) {
    const lineCounts = {}
    const tabletCounts = {}
    const uniqueTablets = []

    let totalSignsLine = 0
    let totalSignsTablet = 0

    economicAttestations.forEach(tablet => {
        const {
            tablet: { id, inscription: { transliterationClean } },
            line: { line }
        } = tablet

        if (!uniqueTablets.includes(id)) uniqueTablets.push(id) 
            else return

        const processedQuery = distinguishVariantsFlag ? query.replace(',', '').split(' ') : cleanVariants(query.replace(',', '').split(' '))

        if (!isCoordinated) {
            line.trim().split(' ').forEach(sign => {
                const processedSign = distinguishVariantsFlag ? sign : sign.replace(/~[a-z](\d)?/g, '')
                if (isStopWord(processedSign, processedQuery, splitCompoundsFlag)) return

                if (lineCounts[processedSign]) lineCounts[processedSign]++
                    else lineCounts[processedSign] = 1

                totalSignsLine++
            })
        }

        transliterationClean.trim().split(' ').forEach(sign => {
            const processedSign = distinguishVariantsFlag ? sign : sign.replace(/~[a-z](\d)?/g, '')
            if (isStopWord(processedSign, processedQuery, splitCompoundsFlag)) return

            if (tabletCounts[processedSign]) tabletCounts[processedSign]++
                else tabletCounts[processedSign] = 1

            totalSignsTablet++
        })
        
    })

    // sorting
    const lineCountsArray = Object.entries(lineCounts).sort().sort((a, b) => b[1] - a[1])
    const tabletCountsArray = Object.entries(tabletCounts).sort().sort((a, b) => b[1] - a[1])

    // building the HTML (only if there is something to write.)
    let lineCountsHTML = ''
    let tabletCountsHTML = ''

    if (lineCountsArray.length > 0) {
        lineCountsHTML += `<div class='urukAttestation urukSmallText'><b>Signs attested in the same case:</b> <div class='urukTranscription'>`
        + lineCountsArray.slice(0, 3).map(item => `${item[0]}: <span class = 'urukLabel'>${item[1]} times, ${(item[1] / totalSignsLine * 100).toFixed()}%</span>`).join('<br>') 
        + `</div>`

        const jsonData = JSON.stringify(Object.fromEntries(lineCountsArray), null, 4);
        const jsonDataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonData);
        lineCountsHTML += `<span class = 'urukNav'><a href="${jsonDataUri}" target="_blank">View complete results as JSON</a></span></div>`;
    }

    if (tabletCountsArray.length > 0) {
        tabletCountsHTML += `<div class='urukAttestation urukSmallText'><b>Signs attested on the same tablet:</b> <div class='urukTranscription'>`
        + tabletCountsArray.slice(0, 3).map(item => `${item[0]}: <span class = 'urukLabel'>${item[1]} times, ${(item[1] / totalSignsTablet * 100).toFixed()}%</span>`).join('<br>') 
        + `</div>`

        const jsonData = JSON.stringify(Object.fromEntries(tabletCountsArray), null, 4);
        const jsonDataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonData);
        tabletCountsHTML += `<span class = 'urukNav'><a href="${jsonDataUri}" target="_blank">View complete results as JSON</a></span></div>`;
    }

    return { lineCountsHTML, tabletCountsHTML }
}

export function processSearchEconomicCompounds(economicCompounds) {
    if (economicCompounds.length === 0) return ''

    const counts = {}
    economicCompounds.forEach(item => {
        if (!counts[item]) counts[item] = 1
        else counts[item]++
    })

    const countsArray = Object.entries(counts).sort().sort((a, b) => b[1] - a[1])

    let compoundsHTML = `<div class='urukAttestation urukSmallText'><b>Dismantled compound signs:</b> <div class='urukTranscription'>`
        + countsArray.slice(0, 3).map(item => `${item[0]}: <span class = 'urukLabel'>${item[1]} times, ${(item[1] / economicCompounds.length * 100).toFixed()}%</span>`).join('<br>') 
        + `</div>`
    
    // Create a download link for the JSON file
    const jsonData = JSON.stringify(Object.fromEntries(countsArray), null, 4);
    const jsonDataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonData);
    compoundsHTML += `<span class = 'urukNav'><a href="${jsonDataUri}" target="_blank">View complete results as JSON</a></span></div>`;
    
    return compoundsHTML
}

export function processSearchEconomic(economicAttestations) {
    const hierarchy = {};

    economicAttestations.forEach(item => {
        const { 
            tablet: { id, designation },
            tablet: { inscription: { transliterationClean } },
            tablet: { origin: { provenience: place, period: time} },
            line: { highlightedLine, index }
        } = item

        if (!hierarchy[id]) hierarchy[id] = { designation, place, time, transliterationClean, lines: [] }
        if (!hierarchy[id]["lines"].some(entry => entry.index === index)) {
            hierarchy[id]["lines"].push({ highlightedLine, index })
        }
    });
    return hierarchy
}

export function drawSearchEconomic(hierarchy) {
    let attestationHTML = ``;

    // sorting
    const sortedTablets = Object.keys(hierarchy).sort((a, b) => 
        hierarchy[a].designation.localeCompare(hierarchy[b].designation)
    );

    // writing the HTML
    sortedTablets.forEach(tablet => {
        const allLines = hierarchy[tablet].transliterationClean.split('\n')
        attestationHTML += `
            <div class='urukAttestation urukSmallText'>
                <b><a href = 'https://cdli.mpiwg-berlin.mpg.de/artifacts/${tablet}' target = '_blank'>${hierarchy[tablet].designation}</a> (${locationLabels[hierarchy[tablet].place] || 'uncertain'}, ${periodLabels[hierarchy[tablet].time] || 'uncertain'})</b> 
        `;

        hierarchy[tablet].lines.forEach(line => {
            attestationHTML += `<div class='urukTranscription'>`
            allLines[line.index - 1] ? attestationHTML += `${allLines[line.index - 1]}<br>` : ''
            attestationHTML += `${line.highlightedLine.trim()}`
            allLines[line.index + 1] ? attestationHTML += `<br>${allLines[line.index + 1]}` : ''
            attestationHTML += `</div>`
        });

        attestationHTML += `</div>`;
    });
    return attestationHTML;
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