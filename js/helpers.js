export function cleanTranscription(transcription) {
    const transcriptionArray = transcription
        .split(/\r\n?\r?\n/g)
        .filter(line => line.trim() !== '' && /^\d/.test(line))
        .map(line => line.replace(/[#()?|\[\]]/g, '').replace(/^\d+[^ ]*\s*/, ' ').replace(', ', '').trim())

    const transcriptionString = transcriptionArray
        .join('\n')

    return { transcriptionArray, transcriptionString }
}

export function cleanVariants(line) {
    return line.map(item => item.replace(/~[a-z](\d)?/g, ''))
}

export function checkMatch(query, lineToCheck, distinguishVariantsFlag, splitCompoundsFlag, cleanMatchFlag) {
    let foundCompoundsTablet = []
    let sortedQuery = query.split(' ').slice().sort()
    let sortedLineToCheck = lineToCheck.split(' ').slice().sort()

    if (distinguishVariantsFlag === false) {
        sortedQuery = cleanVariants(sortedQuery)
        sortedLineToCheck = cleanVariants(sortedLineToCheck)
    }

    // Unpacking the compounds and saving results
    if (splitCompoundsFlag === true) {
        const { line, trueMatches } = splitAndEvaluateCompounds(sortedQuery, sortedLineToCheck)
        sortedLineToCheck = line
        foundCompoundsTablet = trueMatches
    }

    // Managing returns
    // Clean match is when all the elements fit.
    if (cleanMatchFlag === true) {
        return {
            isMatch: sortedQuery.length === sortedLineToCheck.length && sortedQuery.every((value, index) => value === sortedLineToCheck[index]),
            foundCompoundsTablet
        }
    } else {
        return {
            isMatch: sortedQuery.every(value => sortedLineToCheck.includes(value)),
            foundCompoundsTablet
        }
    }
}

export function splitAndEvaluateCompounds(query, line) {
    const trueMatches = []

    // First save potential matches
    const potentialMatches = line.filter(item => /[.+&x]/g.test(item))

    // Break and flatten the line
    const lineWithSplitCompounds = line.flatMap(item => item.split(/[.+&x]/g))

    // Now check if any of the potential matches contain anything from the query
    potentialMatches.forEach(item => {
        const splitMatch = item.split(/[.+&x]/g)
        if (splitMatch.some(value => query.includes(value))) {
            trueMatches.push(item)
        }
    })

    // If yes, then if the tablet was matching, those matches should be pushed as compounds that contained parts of the query
    return { line: lineWithSplitCompounds, trueMatches: trueMatches }
}

export function displayLexicalEntries(lexicalItems) {
    const tree = {}; // Object to store the tree structure

    // Iterate over each JSON object in the list
    lexicalItems.forEach(item => {
        const compositeID = item.tablet.inscription.compositeId;
        let line = item.lexicalLine.trim(); // Trim to remove leading/trailing whitespace

        line = line.split(' ').sort().join(' ');

        // If line doesn't exist in the tree, create it
        if (!tree[line]) {
            tree[line] = {};
        }

        // If compositeID doesn't exist under the line, create it
        if (!tree[line][compositeID]) {
            tree[line][compositeID] = new Set();
        }

        // Add tablet ID under the compositeID
        tree[line][compositeID].add(
            {
                id: item.tablet.id,
                provenience: item.tablet.origin.provenience,
                period: item.tablet.origin.period
            });
    });

    return tree;
}


