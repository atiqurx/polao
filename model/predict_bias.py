import sys
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

LABELS = ["LEFT", "CENTER", "RIGHT"]

MODEL_DIR = "model/bias-bert-model"

# Load model once
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)

def predict(text: str):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    with torch.no_grad():
        logits = model(**inputs).logits
    pred_id = torch.argmax(logits, dim=-1).item()
    return LABELS[pred_id]

if __name__ == "__main__":
    text = " ".join(sys.argv[1:])
    print(predict(text))
