import json
import joblib
from scipy.sparse import save_npz
from sklearn.feature_extraction.text import TfidfVectorizer

# File paths
INPUT_FILE = 'ai/aiInput.json'
SPARSE_MATRIX_FILE = 'vectorized_data.npz'
VECTORIZER_FILE = 'tfidf_vectorizer.joblib'

# Load the dataset
with open(INPUT_FILE, 'r') as f:
    data = json.load(f)

# Extract the texts
CASES = False
texts = [item['ai']['transcriptionNoCasesNumbers'] for item in data]

# We could also filter the data, instead of taking all of it - so we can, for instance, study the 'cohesion' of types:
# texts = [item['ai']['transcriptionCasesNoNumbers'] for item in data if 'cereals' in item['inscription']['accountTypes']]

# This won't be available online though, as it's much too resource-consuming. We'd have to store a ton of different vectors for such things, and that's just too many moving parts for now.

# Use the right vectorization pattern
if CASES:
    tfidf_vectorizer = TfidfVectorizer(token_pattern=r"(?u).+")
else:
    tfidf_vectorizer = TfidfVectorizer(token_pattern=r"(?u)\S+")

X = tfidf_vectorizer.fit_transform(texts)

# Save the vectorizer for future use
joblib.dump(tfidf_vectorizer, VECTORIZER_FILE)

# Save the vectorized data in sparse matrix format
save_npz(SPARSE_MATRIX_FILE, X)

# Add the sparse matrix file path to the original data
for item in data:
    item['vector'] = SPARSE_MATRIX_FILE

print("Done.")
