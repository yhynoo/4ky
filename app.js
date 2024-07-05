import express from "npm:express";
import ejs from "npm:ejs";
import { searchPost, searchResultsGet } from "./js/views.js";

const app = express();

// Setting the app to work with EJS and telling it where to take the views from
app.set('view engine', 'ejs');
app.set('views', './views');

// Setting the app to load CSS properly -- Deno.cwd() returns the root directory.
app.use(express.static(Deno.cwd() + '/static'));
app.use(express.urlencoded({ extended: true }));

// Utility function to handle async route handlers
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// -- SETTING UP REQUEST MANAGEMENT

// Search
app.get('/', (_req, res) => res.render('search'));
app.post('/', asyncHandler(searchPost));
app.get('/searchResults', asyncHandler(searchResultsGet));

// About
app.get('/about', (_req, res) => res.render('about'));

app.listen(8000, () => {
    console.log("Server is running on http://localhost:8000");
});
