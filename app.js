import express from "npm:express";
import ejs from "npm:ejs";

import { analysisPost, analysisResultsGet, searchPost, searchResultsGet } from "./js/views.js";

const app = express();

// setting the app to work with EJS and telling it where to take the views from
app.set('view engine', 'ejs');
app.set('views', './views');

// setting the app to load CSS properly -- Deno.cwd() returns the root directory.
app.use(express.static(Deno.cwd() + '/static'))

// allow using URL-encoded requests
app.use(express.urlencoded({ extended: true }))


// -- SETTING UP REQUEST MANAGEMENT

// search

    app.get('/', (_req, res) => {
        res.render('search')
    })

    app.post('/', (req, res) => {
        searchPost(req, res)
    })

    app.get('/searchResults', (req, res) => {
        searchResultsGet(req, res)
    })

// analysis

    app.get('/analysis', (_req, res) => {
        res.render('analysis')
    });

    app.post('/analysis', (req, res) => {
        analysisPost(req, res)
    })

    app.get('/analysisResults', (req, res) => {
        analysisResultsGet(req, res)
    })

app.listen(8000, () => {
    console.log("Server is running on http://localhost:8000");
});