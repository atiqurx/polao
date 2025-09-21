#!/usr/bin/env python3
import sys, json, os
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

LABELS = ["LEFT", "CENTER", "RIGHT"]
MODEL_DIR = "model/bias-bert-model"

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
model.eval()

def predict_batch(texts):
    if not texts:
        return []
    inputs = tokenizer(
        texts,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128,
    )
    with torch.no_grad():
        logits = model(**inputs).logits
    preds = logits.argmax(dim=-1).tolist()
    return [LABELS[i] for i in preds]

def handle(line):
    msg = json.loads(line)
    req_id = msg.get("id")
    items = msg.get("items", [])
    # normalize to objects with id + text
    norm = []
    for it in items:
        if isinstance(it, str):
            norm.append({"id": None, "text": it})
        else:
            norm.append({"id": it.get("id"), "text": it.get("text", "")})
    labels = predict_batch([x["text"] for x in norm])
    out = [{"id": norm[i]["id"], "label": labels[i]} for i in range(len(norm))]
    return {"id": req_id, "results": out}

def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            resp = handle(line)
        except Exception as e:
            resp = {"id": json.loads(line).get("id"), "error": str(e)}
        sys.stdout.write(json.dumps(resp) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
