import data from '../data/schoyen.json' with {type: 'json'}

const ATFCleaner = (atf) => {
    atf = atf.replace(/\r/g, '')    // Remove all the unnecessary \r characters
    const lines = atf.split('\n');

    const cleanLines = lines.filter(line => !/^[#@>$&]/.test(line))                  // Filter out lines starting with #, @, >, or $
                            .map(line => line.replace(/[#()?|\[\]]/g, ''))           // Remove characters #, (, ), ?, |, [, and ]
                            .map(line => line.replace(/^\d+[^ ]*\s*/, ' '))          // Remove everything from the beginning of the line until the first space if the line starts with a number
                            .filter(line => line.trim() !== '');                     // Remove empty lines or lines with just a space

    return cleanLines.join('\n');        // Join lines with line breaks
}

const processTablet = (tablet) => {
    const {
        id,
        designation,
        findspot_square,
        findspot_comment,
        inscription,
        genres = [],
        composites = [],
        period,
        provenience
    } = tablet

    const atf = inscription?.atf || ''
    const periodId = period?.id || null
    const provenienceId = provenience?.id || 0
    const compositeId = composites[0]?.composite?.id || 0

    const accountType = []
    if (genres.some(g => g.genre?.id === 1)) accountType.push('economic')
    if (genres.some(g => g.genre?.id === 4)) accountType.push('lexical')

    return {
        id,
        designation,
        link: `https://cdli.earth/artifacts/${id}`,
        inscription: {
            transliterationClean: ATFCleaner(atf),
            compositeId,
            accountType,
            features: []
        },
        origin: {
            period: periodId,
            provenience: provenienceId
        },
        excavation: {
            findspot_square,
            findspot_comment
        }
    }
}

// Process
const processedData = data.map(tablet => processTablet(tablet))

// Write to file
Deno.writeTextFile('../data/4ky_schoyen.json', JSON.stringify(processedData))