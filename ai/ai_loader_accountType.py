import os
import joblib
import sys
import numpy as np

# Load the models and the vectorizer
script_dir = os.path.dirname(os.path.abspath(__file__))
svms = joblib.load(os.path.join(script_dir, 'signStopProbability', 'svm_models.joblib'))
tfidf_vectorizer = joblib.load(os.path.join(script_dir, 'signStopProbability', 'tfidf_vectorizer.joblib'))
mlb = joblib.load(os.path.join(script_dir, 'signStopProbability', 'mlb.joblib'))

# Function to make a prediction on a single text with confidence scores
def predict_single_with_confidence(text):
    # Transform the text data
    X = tfidf_vectorizer.transform([text])

    # Predict for each label
    confidences = []
    for svm in svms:
        # Get the probability score for the positive class
        prob = svm.predict_proba(X)[0][1]
        confidences.append(prob)

    # Convert list of predictions to NumPy array
    confidences = np.array(confidences).reshape(1, -1)

    # Convert binary predictions back to label names
    predicted_labels = mlb.inverse_transform(confidences > 0.9)

    return predicted_labels[0], confidences[0]

# Ensure the correct number of command-line arguments
if len(sys.argv) != 2:
    print("Usage: python script.py <text>")
    sys.exit(1)

# Use the provided text
new_text = sys.argv[1]
prediction, confidences = predict_single_with_confidence(new_text)

# Convert confidences to percentages and format them without decimal points
confidence_percentages = [f"{int(conf * 100)}%" for conf in confidences]

# Determine the highest confidence value and corresponding label
max_confidence = max(confidences)
max_confidence_index = np.argmax(confidences)
predicted_label = mlb.classes_[max_confidence_index]

# Output the highest confidence result or default message
if max_confidence > 0.9:
    type = f"I am {int(max_confidence * 100)}% sure it is an account of {predicted_label}."
else:
    type = "Sorry, I'm not sure what kind of account this is."

# Alternative option: print out the predicted labels and confidences:
# print("[" + ", ".join(f"{i:.2f}" for i in confidences) + "]")

# Prepare the complete assessment string
categories = mlb.classes_
assessment = ", ".join(f"{category}: {confidence_percentages[i]}" for i, category in enumerate(categories))
assessment = f"Complete assessment: <span class = 'urukLabel'>{assessment}.</span>"

# Print the complete assessment
print(f"{type}<br>{assessment}")
