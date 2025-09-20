import pandas as pd
from datasets import Dataset
from sklearn.model_selection import train_test_split
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments
)
import numpy as np
import evaluate

# 1. Load dataset
df = pd.read_csv("allsides_balanced_news_headlines-texts.csv")

# Keep relevant columns
df = df[["heading", "bias_rating"]].dropna()
df = df[df["bias_rating"].isin(["left", "right", "center"])]

# Normalize labels
df["label"] = df["bias_rating"].str.upper().map({
    "LEFT": 0,
    "CENTER": 1,
    "RIGHT": 2
})

print(df["label"].value_counts())

# Split train/test
train_texts, test_texts, train_labels, test_labels = train_test_split(
    df["heading"].tolist(),
    df["label"].tolist(),
    test_size=0.2,
    random_state=42,
    stratify=df["label"].tolist()
)

# 2. HuggingFace Dataset
train_dataset = Dataset.from_dict({"text": train_texts, "label": train_labels})
test_dataset = Dataset.from_dict({"text": test_texts, "label": test_labels})

# 3. Tokenizer
MODEL_NAME = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

def preprocess(batch):
    return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=128)

train_dataset = train_dataset.map(preprocess, batched=True)
test_dataset = test_dataset.map(preprocess, batched=True)

# Set format for PyTorch
train_dataset.set_format(type="torch", columns=["input_ids", "attention_mask", "label"])
test_dataset.set_format(type="torch", columns=["input_ids", "attention_mask", "label"])

# 4. Model
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME, num_labels=3
)

# 5. Metrics
accuracy = evaluate.load("accuracy")
f1 = evaluate.load("f1")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    acc = accuracy.compute(predictions=preds, references=labels)["accuracy"]
    f1_macro = f1.compute(predictions=preds, references=labels, average="macro")["f1"]
    return {
        "accuracy": acc,
        "f1_macro": f1_macro
    }


# 6. Trainer
training_args = TrainingArguments(
    output_dir="./bias-bert-model",
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=3,
    weight_decay=0.01,
    logging_dir="./logs",
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    greater_is_better=True
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
    tokenizer=tokenizer,
    compute_metrics=compute_metrics
)

# 7. Train & Save
trainer.train()

trainer.save_model("./bias-bert-model")
tokenizer.save_pretrained("./bias-bert-model")

print("Model saved to ./bias-bert-model")
