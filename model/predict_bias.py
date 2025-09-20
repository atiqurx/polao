import sys
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

LABELS = ["LEFT", "CENTER", "RIGHT"]

# Load model & tokenizer
tokenizer = AutoTokenizer.from_pretrained("./bias-bert-model")
model = AutoModelForSequenceClassification.from_pretrained("./bias-bert-model")

def predict(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    with torch.no_grad():
        logits = model(**inputs).logits
    pred_id = torch.argmax(logits, dim=-1).item()
    return LABELS[pred_id]

if __name__ == "__main__":
    if len(sys.argv) > 1:
        headline = " ".join(sys.argv[1:])
        print(f"Headline: {headline}")
        print(f"Predicted Bias: {predict(headline)}")
    else:
        print("Usage: python3 predict_bias.py 'Some headline here'")
