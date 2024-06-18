export function cleanTranscription(transcription, cases, numbers) {
    const transcriptionArray = transcription
        .split(/\r?\n/) // Split into lines
        .filter(line => line.trim() !== '' && /^\d/.test(line)) // Keep non-empty lines starting with a digit
        .map(line => line
            .replace(/[#()?|\[\]]/g, '')        // Remove special characters
            .replace(/^\d+\S*\s*/, '')          // Remove leading digits and following non-space characters
            .replace(', ', '')                  // Remove remaining comma-space sequences
        )
        .map(line => makeCasesAndNumbers(line, cases, numbers))
        .filter(line => line.trim() !== '')

    const transcriptionString = transcriptionArray.join('\n');
    return { transcriptionArray, transcriptionString };
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
    const isMatch = (cleanMatchFlag === true) ? sortedQuery.length === sortedLineToCheck.length && sortedQuery.every((value, index) => value === sortedLineToCheck[index]) : sortedQuery.every(value => sortedLineToCheck.includes(value))
    foundCompoundsTablet = (isMatch) ? foundCompoundsTablet : []

    return { isMatch, foundCompoundsTablet }
}

export function isStopWord(sign, query, splitCompoundsFlag) {
    if ([",", "...", "N", "X", "\n"].includes(sign)) return true
    if (/^\d+N\d+$/.test(sign)) return true
    if (query.map(t => t.trim()).includes(sign)) return true

    if (splitCompoundsFlag && /[.+&x]/.test(sign)) {
        if (sign.split(/[.+&x]/g).some(value => query.includes(value))) return true
    }

    return false
}

export function highlightMatches(query, line, distinguishVariantsFlag, splitCompoundsFlag) {
    const splitLine = line.split(' ');

    const processWord = word => distinguishVariantsFlag ? word : word.replace(/~[a-z](\d)?/g, '');
    const processedQuery = distinguishVariantsFlag ? query.join(' ').replace(',', '').split(' ') : cleanVariants(query.join(' ').replace(',', '').split(' '));

    const newLine = splitLine.map(word => {
        const processedWord = processWord(word);

        if (processedQuery.includes(processedWord)) {
            return `<span class='urukHighlight'>${word}</span>`;
        } else if (splitCompoundsFlag && /[.+&x]/.test(processedWord)) {
            if (processedWord.split(/[.+&x]/g).some(value => processedQuery.includes(value))) {
                return `<span class='urukHighlight'>${word}</span>`;
            }
        }
        return word;
    });

    return newLine.join(' ');
}

export function makeCasesAndNumbers(line, cases, numbers) {
    let result = line

    result = result.replace(/\.\.\./g, '')
                   .replace(/\b[NX]\b/g, '')
                   .replace(/(?<=\s),(?=\s)/g, '')
                   .replace(/[^\S\r\n]+/g, ' ')

    if (cases) {
        result = result.split(' ').sort().join(' ')
    }
    if (!numbers) {
        result = result.replace(/\b(\d+)N(\d{2}(?:~[a-z])?(?![\w.]))/g, '')
    }
    result = result.trim()

    return result
}

export function splitAndEvaluateCompounds(query, line) {
    const trueMatches = []
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

export function makeJSONButton(data) {
    const jsonData = JSON.stringify(data, null, 4);
    const jsonDataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonData);
    return `<a href="${jsonDataUri}" target="_blank">View all as JSON</a>`;
}