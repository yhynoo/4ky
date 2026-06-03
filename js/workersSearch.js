import data from '../data/4ky_with_excavation.json' with {type: 'json'}
import { checkMatch, highlightMatches, isStopWord, cleanVariants, makeJSONButton, displayAccountTypes } from './helpers.js';
import { lexicalListLabels, locationLabels, periodLabels, validTypes } from './labels.js';

export function searchCorpus(term, periods, origins, distinguishVariantsFlag, distinguishQuantitiesFlag, splitCompoundsFlag, accountTypes = []) {
    let economicAttestations = [];
    let lexicalAttestations = [];
    const economicCompounds = [];
    const lexicalCompounds = [];

    // Split the term into an array of terms
    const terms = term.split(",").map(t => t.trim());
    const isCoordinated = (terms.length > 1) ? true : false;

    // filtering
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

    if (accountTypes.length > 0) {
        const wantsUntagged = accountTypes.includes("untagged");
        const selected = accountTypes
            .filter(t => t !== "untagged")
            .map(t => t.toLowerCase());

        filteredTablets = filteredTablets.filter(tablet => {
            const normalized = (tablet.inscription.accountType || [])
                .map(t => t.replace(/\(.*?\)/g, "").trim().toLowerCase());

            const hasValid = normalized.some(t => validTypes.includes(t));
            const matchSelected = selected.length > 0 && normalized.some(t => selected.includes(t));
            const matchUntagged = wantsUntagged && !hasValid;

            return matchSelected || matchUntagged;
        });
    }

    // searching
    filteredTablets.forEach(tablet => {
        const tabletContent = tablet.inscription.transliterationClean;

        const economicTermMatches = new Set();
        const lexicalTermMatches = new Set();

        tabletContent.split('\n').forEach((line, index) => {
            if (tablet.inscription.accountType.includes('economic')) {
                terms.forEach(term => {
                    const { isMatch, foundCompoundsTablet } = checkMatch(term, line, distinguishVariantsFlag, distinguishQuantitiesFlag, splitCompoundsFlag, false);
                    if (isMatch) {
                        economicTermMatches.add(term);
                        const highlightedLine = highlightMatches(terms, line, distinguishVariantsFlag, distinguishQuantitiesFlag, splitCompoundsFlag)
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
                        const { isMatch, foundCompoundsTablet } = checkMatch(term, lexicalLine, distinguishVariantsFlag, distinguishQuantitiesFlag, splitCompoundsFlag, true);
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
    let distributionHTML = ''
    if (economicAttestations.length === 0) return distributionHTML

    // make the actual table
    const table = [
        ['',    105,    159,    72,     154,    168,    306,    1000    ],
        [4,     0,      0,      0,      0,      0,      0,      0       ],
        [3,     0,      0,      0,      0,      0,      0,      0       ],
        [2,     0,      0,      0,      0,      0,      0,      0       ],
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
    distributionHTML = `<div class = 'urukTranscription'><table class = 'urukTable'>`;

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
    distributionHTML += '</table></div>'

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

        // for this, take each tablet only once!
        if (!uniqueTablets.includes(id)) uniqueTablets.push(id) 
            else return

        transliterationClean.trim().split(' ').forEach(sign => {
            const processedSign = distinguishVariantsFlag ? sign : sign.replace(/~[a-z](\d)?/g, '')
            if (isStopWord(processedSign, processedQuery, splitCompoundsFlag)) return

            if (tabletCounts[processedSign]) tabletCounts[processedSign]++
                else tabletCounts[processedSign] = 1

            totalSignsTablet++
        })
        
    })

    // sorting
    const lineCountsArray = Object.entries(lineCounts).sort((a, b) => b[1] - a[1])
    const tabletCountsArray = Object.entries(tabletCounts).sort((a, b) => b[1] - a[1])

    // building the HTML (only if there is something to write.)
    const lineCountsHTML = (lineCountsArray.length > 0) 
        ? `<div class='urukTranscription'>` + lineCountsArray.filter(item => (item[1] / totalSignsLine * 100).toFixed(1) >= 3 && item[1] >= 3).slice(0, 3).map(item => `<span class = 'urukLabel'>${item[0]}:</span> ${item[1]} times, ${(item[1] / totalSignsLine * 100).toFixed(1)}%`).join('<br>') + '</div>'
        : ''

    const tabletCountsHTML = (tabletCountsArray.length > 0)
        ? `<div class='urukTranscription'>` + tabletCountsArray.filter(item => (item[1] / totalSignsTablet * 100).toFixed(1) >= 3 && item[1] >= 3).slice(0, 3).map(item => `<span class = 'urukLabel'>${item[0]}:</span> ${item[1]} times, ${(item[1] / totalSignsTablet * 100).toFixed(1)}%`).join('<br>') + '</div>'
        : ''

    // building the buttons
    const jsonButtonLine = (lineCountsArray.length > 0) ? makeJSONButton(Object.fromEntries(lineCountsArray)) : ''
    const jsonButtonTablet = (tabletCountsArray.length > 0) ? makeJSONButton(Object.fromEntries(tabletCountsArray)) : ''

    return { lineCountsHTML, jsonButtonLine, tabletCountsHTML, jsonButtonTablet }
}

// ECONOMIC
export function processSearchEconomicCompounds(economicCompounds) {
    const counts = {}
    economicCompounds.forEach(item => {
        if (!counts[item]) counts[item] = 1
        else counts[item]++
    })

    const countsArray = Object.entries(counts).sort().sort((a, b) => b[1] - a[1])
    const compoundsHTML = (countsArray.length > 0) 
        ? `<div class='urukTranscription'>` + countsArray.slice(0, 3).map(item => `${item[0]}: <span class = 'urukLabel'>${item[1]} times, ${(item[1] / economicCompounds.length * 100).toFixed()}%</span>`).join('<br>') + `</div>`
        : ''
    
    const jsonButtonCompounds = (countsArray.length > 0) ? makeJSONButton(Object.fromEntries(countsArray)) : ''
    return { compoundsHTML, jsonButtonCompounds }
}

export function processSearchEconomic(economicAttestations) {
    const hierarchy = {};

    economicAttestations.forEach(item => {
        const { 
            tablet: { id, designation },
            tablet: { inscription: { transliterationClean, accountType, featureIndicators } },
            tablet: { origin: { provenience: place, period: time} },
            tablet: { excavation },
            line: { highlightedLine, index }
        } = item

        if (!hierarchy[id]) hierarchy[id] = { 
            designation, 
            place, 
            time, 
            transliterationClean, 
            accountType, 
            featureIndicators, 
            excavation, 
            lines: [] 
        }
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
        const accountTypesHTML = displayAccountTypes(hierarchy[tablet]);

        attestationHTML += `
            <div class='urukAttestation urukSmallText'>
                <center>
                    <b><a href = 'https://cdli.earth/artifacts/${tablet}' target = '_blank'>${hierarchy[tablet].designation}</a>
                    <br>${locationLabels[hierarchy[tablet].place] || 'uncertain'}, ${periodLabels[hierarchy[tablet].time] || 'uncertain'}</b>
                    <!--<br>${accountTypesHTML}-->
                </center>
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

// LEXICAL
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
                <b>${lexicalListLabels[text] || 'unknown'}</b>`

                Object.keys(hierarchy[line][text]).sort().forEach(place => {
                    attestationHTML += `<p>${locationLabels[place] || 'uncertain'} (${hierarchy[line][text][place].length}): <span class = 'urukLabel'>`
                    attestationHTML += hierarchy[line][text][place].map(item => {
                        return `<a href = 'https://cdli.mpiwg-berlin.mpg.de/artifacts/${item.id}' target='_blank'>${item.id}</a> (${periodLabels[item.time]})`
                    }).join(', ')
                })
                attestationHTML += '</p></span></div>'
        })
        attestationHTML += `</div>`
    })

    return attestationHTML
}

// ACCOUNT TYPES
export function processSearchAccountTypes(economicAttestations) {
    const counts = {};
    validTypes.forEach(t => counts[t] = 0);

    let untagged = 0;

    // Collect unique tablets
    const uniqueTablets = {};
    economicAttestations.forEach(item => {
        uniqueTablets[item.tablet.id] = item.tablet;
    });

    const tablets = Object.values(uniqueTablets);
    const total = tablets.length;

    tablets.forEach(tablet => {
        const types = tablet.inscription.accountType || [];

        const normalized = types.map(t =>
            t.replace(/\(.*?\)/g, "").trim().toLowerCase()
        );

        const matched = normalized.filter(t => validTypes.includes(t));

        if (matched.length === 0) {
            untagged++;
        } else {
            matched.forEach(t => counts[t]++);
        }
    });

    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1]);

    return { sorted, untagged, total };
}

export function drawSearchAccountTypes({ sorted, untagged, total }) {
    const nonZero = sorted.filter(([type, count]) => count > 0);
    if (nonZero.length === 0 && untagged === 0) return "";

    let html = `<div class="urukTranscription">`;

    html += nonZero
        .map(([type, count]) => {
            const pct = ((count / total) * 100).toFixed(1);
            return `${type} (${count}, ${pct}%)`;
        })
        .join("<br>");

    if (untagged > 0) {
        const pct = ((untagged / total) * 100).toFixed(1);
        html += `<br>untagged (${untagged}, ${pct}%)`;
    }

    html += `</div>`;
    return html;
}

// EXCAVATION DATA
export function processSearchExcavation(economicAttestations) {
    const squares = {};
    let total = 0;

    const columns = [
        "Me",
        "Na","Nb","Nc","Nd","Ne",
        "Oa","Ob","Oc","Od","Oe",
        "Pa","Pb","Pc","Pd","Pe",
        "Qa"
    ];

    const rows = [
        "XIV,5",
        "XV,1","XV,2","XV,3","XV,4","XV,5",
        "XVI,1","XVI,2","XVI,3","XVI,4","XVI,5",
        "XVII,1","XVII,2","XVII,3","XVII,4","XVII,5"
    ];

    // NEW: 2D grid
    const grid = Array.from({ length: rows.length }, () =>
        Array(columns.length).fill(0)
    );

    economicAttestations.forEach(item => {
        const { excavation } = item.tablet;
        if (!excavation) return;
        if (item.tablet.origin.provenience !== 105) return;

        total++;

        const square = excavation.findspot_square || "unknown";
        const comment = excavation.findspot_comments || null;

        // ---- existing aggregation ----
        if (!squares[square]) {
            squares[square] = {
                count: 0,
                comments: {}
            };
        }

        squares[square].count++;

        if (comment) {
            squares[square].comments[comment] =
                (squares[square].comments[comment] || 0) + 1;
        }

        // ---- NEW: fill grid ----
        if (square !== "unknown") {
            const [col, row] = square.split(" ");

            const colIndex = columns.indexOf(col);
            const rowIndex = rows.indexOf(row);

            if (colIndex !== -1 && rowIndex !== -1) {
                grid[rowIndex][colIndex]++;
            }
        }
    });

    const sorted = Object.entries(squares)
        .sort((a, b) => b[1].count - a[1].count);

    // NEW: human-readable console grid
    const labeledGrid = {};

    rows.forEach((rowLabel, r) => {
        labeledGrid[rowLabel] = {};

        columns.forEach((colLabel, c) => {
            labeledGrid[rowLabel][colLabel] = grid[r][c];
        });
    });

    return {
        sorted,
        total,
        grid,
        rows,
        columns,
        labeledGrid // optional but useful for debugging/UI later
    };
}

export function drawSearchExcavation({ sorted, total }) {
    if (sorted.length === 0) return "";

    let html = `<div class="urukTranscription">`;

    sorted.forEach(([square, data]) => {
        const pct = ((data.count / total) * 100).toFixed(1);
        html += `<b>${square}</b> — ${data.count}, ${pct}%<br>`;

        const comments = Object.entries(data.comments);
        if (comments.length > 0) {
            html += `<ul>`;
            comments.forEach(([comment, count]) => {
                const pctC = ((count / total) * 100).toFixed(1);
                html += `<li>${comment} <span class='urukLabel'>(${count}, ${pctC}%)</span></li>`;
            });
            html += `</ul>`;
        }
    });

    html += `</div>`;
    return html;
}

export function drawSearchExcavationGrid({ grid, rows, columns }) {
    const max = Math.max(...grid.flat());
    let html = `<div class="excavationMapWrapper">
        <div class="excavationGrid">`;

    // TOP ROW (empty corner + column labels)
    html += `<div class="gridRow">`;

    html += `<div class="gridCell label"></div>`; // top-left empty corner

    columns.forEach(col => {
        html += `<div class="gridCell label">${col}</div>`;
    });

    html += `</div>`;

    // DATA ROWS
    rows.forEach((rowLabel, rIndex) => {
        html += `<div class="gridRow">`;

        // row label column
        html += `<div class="gridCell label">${rowLabel}</div>`;

        // data cells
        grid[rIndex].forEach(cell => {
            if (cell === 0) {
                html += `<div class="gridCell empty"></div>`;
            } else {
                const opacity = 0.15 + (cell / max) * 0.5;

                html += `<div class="gridCell filled" style="--o:${opacity}">
                            ${cell}
                        </div>`;
            }
        });

        html += `</div>`;
    });

    html += `</div></div>`;

    return html;
}

// unused
export function processSearchLexicalCompounds(lexicalCompounds) {
    const items = new Set(lexicalCompounds)
    return `<div class='urukAttestation urukSmallText'><b>Dismantled compounds found in lexical lists:</b>
    <div class='urukTranscription'>` + Array.from(items).join(', ') + `</div></div>`
}