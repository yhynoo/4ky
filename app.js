import express from "npm:express";
import ejs from "npm:ejs";

import { cleanTranscription } from './js/transcriptionCleaner.js'
import { checkSimpleFeatures } from "./js/simpleFeatures.js";

const app = express();

// setting the app to work with EJS and telling it where to take the views from
app.set('view engine', 'ejs');
app.set('views', './');

// setting the app to load CSS properly -- Deno.cwd() returns the root directory.
app.use(express.static(Deno.cwd() + '/static'))

// allow using URL-encoded requests
app.use(express.urlencoded({ extended: true }))


// -- SETTING UP REQUEST MANAGEMENT

app.get("/", (_req, res) => {
    res.render('index', {data: {}});
});

app.post('/', (req, res) => {
    const { transcriptionArray, transcriptionString } = cleanTranscription(req.body.transcription)

    // operate on the array of lines
    const { foundTheonyms, foundTimeExpressions, foundToponyms } = checkSimpleFeatures(transcriptionArray)

    // re-render the page.
    res.render('index', {data: 
        { 
            // features - does it contain time expressions, original metadata ('colophon'), lexical items, is it a ration list?
            features: {
                isRations: false,
                lexicalItems: [],
                originalMetadata: '',

                theonyms: foundTheonyms,
                timeExpressions: foundTimeExpressions,
                toponyms: foundToponyms
            },
            
            // type
            certainty: 0,
            prediction: 'uncertain',
            text: transcriptionString
        } 
    })
})

app.listen(8000, () => {
    console.log("Server is running on http://localhost:8000");
});