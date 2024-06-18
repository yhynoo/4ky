import { cleanTranscription, displayLexicalEntries, makeJSONButton } from './helpers.js'
import { analysisLexical, analysisFeatures, analysisPrediction, analysisSimilarity, processSimilarity } from "./workersAnalysis.js"
import { 
    searchCorpus,
    countUniqueAccounts,
    processSearchDistribution,
    processSearchCollocations,
    processSearchEconomic,
    drawSearchEconomic,
    processSearchEconomicCompounds, 
    processSearchLexical, 
    drawSearchLexical
} from "./workersSearch.js"
import { lexicalListLabels } from './labels.js'

export function analysisPost(req, res) {
    const { transcription, cases, numbers } = req.body

    // create a URL
    const queryParams = new URLSearchParams({
        transcription,
        cases,
        numbers
    })

    // send the URL data and the user to a new page
    res.redirect(`/analysisResults?${queryParams.toString()}`)
}

export async function analysisResultsGet(req, res) {
    const cases = (req.query.cases === "1") ? 1 : 0
    const numbers = (req.query.numbers === "1") ? 1 : 0

    const { transcriptionArray, transcriptionString } = cleanTranscription(req.query.transcription, cases, numbers)

    // operate on the array
    const { foundLexicalItems } = analysisLexical(transcriptionArray)
    const { foundTheonyms, foundTimeExpressions, foundToponyms } = analysisFeatures(transcriptionArray)
    const processedLexicalEntries = displayLexicalEntries(foundLexicalItems)
    
    const processedPrediction = await analysisPrediction(transcriptionString)
    const similarityResults = await analysisSimilarity(transcriptionString, cases, numbers)
    const { similarityHTML, jsonButtonSimilarity } = processSimilarity(similarityResults)

    // render the results page
    res.render('analysisResults', {data: 
        { 
            // features - does it contain time expressions, original metadata ('colophon'), lexical items, is it a ration list?
            features: {
                isRations: false, // placeholder
                lexicalItems: processedLexicalEntries,
                originalMetadata: '',  // placeholder

                theonyms: foundTheonyms,
                timeExpressions: foundTimeExpressions,
                toponyms: foundToponyms
            },
            
            // type
            prediction: processedPrediction,

            // similarity
            similarityHTML,
            jsonButtonSimilarity,

            text: transcriptionString
        },
        lexicalListLabels
    })
}

export function searchPost(req, res) {
    const term = req.body.term
    const timePeriods = req.body.timePeriod
    const provenience = req.body.provenience

    const distinguishVariantsFlag = req.body.distinguishVariants === '1'
    const splitCompoundsFlag = req.body.splitCompounds === '1'

    const queryParams = new URLSearchParams({
        term, 
        timePeriods,
        provenience,

        distinguishVariantsFlag,
        splitCompoundsFlag
    })
    
    res.redirect(`/searchResults?${queryParams.toString()}`);
}

export function searchResultsGet(req, res) {
    const { term, timePeriods, provenience, distinguishVariantsFlag: distinguishVariants, splitCompoundsFlag: split } = req.query;

    // Convert string values to booleans
    const distinguishVariantsFlag = distinguishVariants === 'true'
    const splitCompoundsFlag = split === 'true'

    const { economicAttestations,
            economicCompounds, 
            lexicalAttestations, 
            _lexicalCompounds,
            isCoordinated
        } = searchCorpus(term, timePeriods, provenience, distinguishVariantsFlag, splitCompoundsFlag)

    const { lineCountsHTML, jsonButtonLine, tabletCountsHTML, jsonButtonTablet } = processSearchCollocations(term, economicAttestations, distinguishVariantsFlag, splitCompoundsFlag, isCoordinated)
    const { compoundsHTML, jsonButtonCompounds } = processSearchEconomicCompounds(economicCompounds)
    const jsonButtonEconomic = makeJSONButton(economicAttestations)
    const jsonButtonLexical = makeJSONButton(lexicalAttestations)

    res.render('searchResults', {data: {
            economicAttestations: drawSearchEconomic(processSearchEconomic(economicAttestations)),
            economicAccountsCount: countUniqueAccounts(economicAttestations),
            economicAttestationsCount: economicAttestations.length,
            statistics: {
                distribution: processSearchDistribution(economicAttestations),
                lineCountsHTML,
                tabletCountsHTML,
                compoundsHTML 
            },
            isCoordinated,

            jsonButtonLine,
            jsonButtonTablet,
            jsonButtonCompounds,
            jsonButtonEconomic,
            jsonButtonLexical,
            
            lexicalItemsCount: lexicalAttestations.length,
            lexicalItems: drawSearchLexical(processSearchLexical(lexicalAttestations))
        },
        term
    })
}