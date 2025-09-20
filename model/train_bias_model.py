import os
import pickle
import time
from dotenv import load_dotenv
import pandas as pd
import google.generativeai as genai
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

# 1. Load API key from .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found. Make sure it's set in model/.env")

genai.configure(api_key=api_key)
EMBED_MODEL = "models/embedding-001"

def get_embedding(text: str):
    """Fetch embedding vector from Gemini API for a given text."""
    try:
        res = genai.embed_content(model=EMBED_MODEL, content=text)
        return res["embedding"]
    except Exception as e:
        print(f"Embedding error: {e}")
        return None

# 2. Load Qbias dataset
print("Loading Qbias dataset...")
df = pd.read_csv("allsides_balanced_news_headlines-texts.csv")

# Keep relevant columns
df = df[["heading", "bias_rating"]].dropna()

# Only keep Left, Right, Center
df = df[df["bias_rating"].isin(["left", "right", "center"])]

# Normalize labels
df["label"] = df["bias_rating"].str.upper()

print("Class distribution:")
print(df["label"].value_counts())

# Use ALL rows
texts = df["heading"].tolist()
labels = df["label"].tolist()

# 3. Load existing cache if available
cache_file = "embeddings_full.pkl"

if os.path.exists(cache_file):
    print("Loading cached embeddings...")
    with open(cache_file, "rb") as f:
        embeddings, valid_labels = pickle.load(f)
else:
    print("⏳ Generating embeddings for FULL dataset...")
    embeddings, valid_labels = [], []
    for i, text in enumerate(texts):
        vec = get_embedding(text)
        if vec:
            embeddings.append(vec)
            valid_labels.append(labels[i])
        if i % 25 == 0:
            print(f"Processed {i}/{len(texts)} headlines...")
            time.sleep(1)  # avoid quota bursts

    # Save cache
    with open(cache_file, "wb") as f:
        pickle.dump((embeddings, valid_labels), f)
    print(f"Embeddings cached to {cache_file}")

print(f"Total embeddings: {len(embeddings)}")


# 4. Train classifier
X_train, X_test, y_train, y_test = train_test_split(
    embeddings, valid_labels, test_size=0.2, random_state=42
)

clf = LogisticRegression(max_iter=500)
clf.fit(X_train, y_train)

# Evaluate
y_pred = clf.predict(X_test)
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# 5. Save model
joblib.dump(clf, "bias_classifier.pkl")
print("Model saved to bias_classifier.pkl")
