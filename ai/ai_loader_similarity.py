import json
import joblib
import os
import sys
from scipy.sparse import load_npz

# Parse command line arguments for QUERY, CASES, and NUMBERS settings
if len(sys.argv) < 4:
    print("Usage: python loader_script.py <QUERY> <CASES> <NUMBERS>")
    sys.exit(1)

QUERY = sys.argv[1]                 # Retrieve query from command line argument
CASES = bool(int(sys.argv[2]))      # Convert string argument to boolean
NUMBERS = bool(int(sys.argv[3]))    # Convert string argument to boolean

# Determine folder names based on CASES and NUMBERS settings
if CASES and NUMBERS:
    folder_name = 'cases_numbers'
elif CASES and not NUMBERS:
    folder_name = 'cases_noNumbers'
elif not CASES and NUMBERS:
    folder_name = 'noCases_numbers'
else:
    folder_name = 'noCases_noNumbers'

# Construct paths to vectorizer and vectorized data
script_dir = os.path.dirname(os.path.abspath(__file__))
vectorizer_file = os.path.join(script_dir, 'similarity', folder_name, 'tfidf_vectorizer.joblib')
vectorized_data_file = os.path.join(script_dir, 'similarity', folder_name, 'vectorized_data.npz')

# Load the saved vectorizer
tfidf_vectorizer = joblib.load(vectorizer_file)

# Load the library of strings (sparse matrix)
X_library = load_npz(vectorized_data_file)

# User query
user_vector = tfidf_vectorizer.transform([QUERY])

# Binarize the vectors (convert to binary format)
user_vector_bin = user_vector.sign()
X_library_bin = X_library.sign()

# Calculate Jaccard similarity scores using matrix operations
intersection = user_vector_bin.multiply(X_library_bin).sum(axis=1).A.flatten()
union = user_vector_bin.sum() + X_library_bin.sum(axis=1).A.flatten() - intersection

# Calculate Jaccard similarity scores as ratios
similarity_scores = (intersection / union)

# Sort indices based on similarity scores in descending order
sorted_indices = sorted(range(len(similarity_scores)), key=lambda i: similarity_scores[i], reverse=True)

# Load the dataset
with open(os.path.join(script_dir, 'aiInput.json'), 'r') as f:
    data = json.load(f)

# Return list of objects with highest similarity scores to the query
results = []
for index in sorted_indices:
    similarity_score = similarity_scores[index]
    # Retrieve the corresponding object from the library based on index
    object_data = data[index]
    result_object = {
        "id": object_data["id"],
        "designation": object_data["designation"],
        "similarity_score": similarity_score,
    }
    results.append(result_object)

# Print top results for Jaccard similarity
print(results)