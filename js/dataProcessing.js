import data from '../data/total.json' with {type: 'json'}

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
    const { id, designation, inscription, genres, composites, period: {id: periodId }, provenience } = tablet

    const atf = inscription && inscription.atf ? inscription.atf : ''
    const provenienceId = provenience && provenience.id ? provenience.id : 0
    const link = `https://cdli.mpiwg-berlin.mpg.de/artifacts/${id}`

    const compositeId = composites.length > 0 ? composites[0].composite.id : 0
    const accountType = []
    const features = []

    if (genres.some(genre => genre.genre.id === 1)) { accountType.push('economic') }
    if (genres.some(genre => genre.genre.id === 4)) { accountType.push('lexical') }

    return {
        id,
        designation,
        link,
        inscription: {
            transliterationClean: ATFCleaner(atf),
            compositeId,
            accountType,
            features
        },
        origin: {
            period: periodId,
            provenience: provenienceId
        }
    }
}

// Process
const processedData = data.map(tablet => processTablet(tablet))

// Write to file
Deno.writeTextFile('../data/4ky_clean.json', JSON.stringify(processedData))