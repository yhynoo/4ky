export function cleanTranscription(transcription) {
    const transcriptionArray = transcription
        .split(/\r\n?\r?\n/g)
        .filter(line => line.trim() !== '' && /^\d/.test(line))
        .map(line => line.replace(/[#()?|\[\]]/g, '').replace(/^\d+[^ ]*\s*/, ' ').replace(', ', '').trim())

    const transcriptionString = transcriptionArray
        .join('\n')

    return { transcriptionArray, transcriptionString }
}

export function cleanVariants(sign) {
    return sign.replace(/~[a-wyz0-9]+/g, '');
}