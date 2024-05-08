import express from "npm:express";
import ejs from "npm:ejs";

import { cleanTranscription } from './js/transcription-cleaner.js'

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
    res.render('index', {data: {msg: 'No transcription processed yet.'}});
});

app.post('/', (req, res) => {
    const { transcriptionArray, transcriptionString } = cleanTranscription(req.body.transcription)

    // operate on the array of lines
    console.log(transcriptionArray)

    // re-render the page.
    res.render('index', {data: 
        { 
            text: transcriptionString,
            prediction: '',
            certainty: 0
        } 
    })
})

app.listen(8000, () => {
    console.log("Server is running on http://localhost:8000");
});