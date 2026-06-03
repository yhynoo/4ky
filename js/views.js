import { cleanTranscription, displayLexicalEntries, makeJSONButton } from './helpers.js';
import { 
    searchCorpus,
    countUniqueAccounts,
    processSearchDistribution,
    processSearchCollocations,
    processSearchEconomic,
    drawSearchEconomic,
    processSearchEconomicCompounds, 
    processSearchLexical, 
    drawSearchLexical,
    processSearchAccountTypes,
    drawSearchAccountTypes,
    processSearchExcavation,
    drawSearchExcavation,
    drawSearchExcavationGrid
} from "./workersSearch.js";
import { lexicalListLabels } from './labels.js';

/* ------------------------- ANALYSIS ------------------------- */

export function analysisPost(req, res) {
    const { transcription, cases, numbers } = req.body;

    const queryParams = new URLSearchParams({
        transcription,
        cases,
        numbers
    });

    res.redirect(`/analysisResults?${queryParams.toString()}`);
}

export async function analysisResultsGet(req, res) {
    const cases = req.query.cases === "1" ? 1 : 0;
    const numbers = req.query.numbers === "1" ? 1 : 0;

    const { transcriptionArray, transcriptionString } =
        cleanTranscription(req.query.transcription, cases, numbers);

    const { foundLexicalItems } = analysisLexical(transcriptionArray);
    const { foundTheonyms, foundTimeExpressions, foundToponyms } =
        analysisFeatures(transcriptionArray);

    const processedLexicalEntries = displayLexicalEntries(foundLexicalItems);

    const prediction = await analysisPrediction(transcriptionString);
    const similarityResults = await analysisSimilarity(transcriptionString, cases, numbers);
    const { similarityHTML, jsonButtonSimilarity } = processSimilarity(similarityResults);

    res.render('analysisResults', {
        data: {
            features: {
                isRations: false,
                lexicalItems: processedLexicalEntries,
                originalMetadata: '',
                theonyms: foundTheonyms,
                timeExpressions: foundTimeExpressions,
                toponyms: foundToponyms
            },
            prediction,
            similarityHTML,
            jsonButtonSimilarity,
            text: transcriptionString
        },
        lexicalListLabels
    });
}

/* ------------------------- SEARCH ------------------------- */

export function searchPost(req, res) {
    const {
        term,
        timePeriod: timePeriods,
        provenience,
        accountType,
        distinguishVariants,
        distinguishQuantities,
        splitCompounds
    } = req.body;

    const queryParams = new URLSearchParams({
        term,
        timePeriods,
        provenience,
        distinguishVariantsFlag: distinguishVariants === '1',
        distinguishQuantitiesFlag: distinguishQuantities === '1',
        splitCompoundsFlag: splitCompounds === '1'
    });

    // accountType may be array or single value
    if (Array.isArray(accountType)) {
        accountType.forEach(t => queryParams.append("accountType", t));
    } else if (accountType) {
        queryParams.append("accountType", accountType);
    }

    res.redirect(`/searchResults?${queryParams.toString()}`);
}

export function searchResultsGet(req, res) {
    const {
        term,
        timePeriods,
        provenience,
        distinguishVariantsFlag,
        distinguishQuantitiesFlag,
        splitCompoundsFlag
    } = req.query;

    const accountTypes = req.query.accountType
        ? [].concat(req.query.accountType)
        : [];

    const distinguishVariants = distinguishVariantsFlag === 'true';
    const distinguishQuantities = distinguishQuantitiesFlag === 'true';
    const splitCompounds = splitCompoundsFlag === 'true';

    const {
        economicAttestations,
        economicCompounds,
        lexicalAttestations,
        _lexicalCompounds,
        isCoordinated
    } = searchCorpus(
        term,
        timePeriods,
        provenience,
        distinguishVariants,
        distinguishQuantities,
        splitCompounds,
        accountTypes
    );

    const {
        lineCountsHTML,
        jsonButtonLine,
        tabletCountsHTML,
        jsonButtonTablet
    } = processSearchCollocations(term, economicAttestations, distinguishVariants, splitCompounds, isCoordinated);

    const { compoundsHTML, jsonButtonCompounds } =
        processSearchEconomicCompounds(economicCompounds);

    const jsonButtonEconomic = makeJSONButton(economicAttestations);
    const jsonButtonLexical = makeJSONButton(lexicalAttestations);

    const accountTypeHTML = drawSearchAccountTypes(
        processSearchAccountTypes(economicAttestations)
    );

    const excavationData = processSearchExcavation(economicAttestations)
    const excavationHTML = drawSearchExcavation(excavationData)

    const excavationGridHTML = drawSearchExcavationGrid({
        grid: excavationData.grid,
        rows: excavationData.rows,
        columns: excavationData.columns
    });

    res.render('searchResults', {
        data: {
            economicAttestations: drawSearchEconomic(
                processSearchEconomic(economicAttestations)
            ),
            economicAccountsCount: countUniqueAccounts(economicAttestations),
            economicAttestationsCount: economicAttestations.length,
            statistics: {
                distribution: processSearchDistribution(economicAttestations),
                lineCountsHTML,
                tabletCountsHTML,
                compoundsHTML,
                accountTypeHTML,
                excavationHTML,
                excavationGridHTML
            },
            isCoordinated,
            jsonButtonLine,
            jsonButtonTablet,
            jsonButtonCompounds,
            jsonButtonEconomic,
            jsonButtonLexical,
            lexicalItemsCount: lexicalAttestations.length,
            lexicalItems: drawSearchLexical(
                processSearchLexical(lexicalAttestations)
            )
        },
        term
    });
}
