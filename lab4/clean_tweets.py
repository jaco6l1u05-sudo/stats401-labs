import pandas as pd
import re
import nltk

from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from transformers import pipeline

df = pd.read_csv("data/elon_musk_tweets.csv")

print("Shape:", df.shape)

print("\nColumns:")
print(df.columns.tolist())

print("\nData types:")
print(df.dtypes)

print("\nMissing values:")
print(df.isna().sum())

print("\nDuplicates:")
print(df.duplicated().sum())

print("\nRetweet status:")
print(df["is_retweet"].value_counts())

print("\nRetweets:")
print(df["retweets"].describe())

print("\nFavorites:")
print(df["favorites"].describe())

print("\nFollowers:")
print(df["user_followers"].describe())

df["date"] = pd.to_datetime(df["date"])

print("\nDate range:")
print(df["date"].min())
print(df["date"].max())

print("\nExample tweets:")
print(df["text"].head(10).to_string())

df["date"] = pd.to_datetime(df["date"])
print("Invalid dates:", df["date"].isna().sum())
df = df.dropna(subset=["text"])
df = df[df["text"].str.strip() != ""]
print("Final shape after basic cleaning:", df.shape)

df["retweets"] = pd.to_numeric(
    df["retweets"],
    errors="coerce"
)

df["favorites"] = pd.to_numeric(
    df["favorites"],
    errors="coerce"
)
print(df[["retweets", "favorites"]].isna().sum())

#normalize
def normalize_text(text):
    text = str(text)

    text = re.sub(r"http\S+|www\S+", " URL ", text)

    text = re.sub(r"@\w+", " USER ", text)

    text = re.sub(r"\b\d+(?:\.\d+)?\b", " NUMBER ", text)

    text = text.lower()

    text = re.sub(r"\s+", " ", text).strip()
    return text

df["text_normalized"] = df["text"].apply(normalize_text)

print("\nText normalization examples:")
print(
    df[["text", "text_normalized"]]
    .head(10)
    .to_string()
)

#tokenization
stop_words = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()
def clean_for_tfidf(text):
    tokens = word_tokenize(text)

    cleaned_tokens = []

    for token in tokens:
        # Keep alphabetic words only
        if not token.isalpha():
            continue

        # Remove stop words
        if token in stop_words:
            continue

        # Lemmatize
        token = lemmatizer.lemmatize(token)

        cleaned_tokens.append(token)

    return " ".join(cleaned_tokens)

df["text_clean"] = df["text_normalized"].apply(clean_for_tfidf)

print("\nCleaned text examples:")
print(
    df[["text", "text_normalized", "text_clean"]]
    .head(10)
    .to_string()
)

vectorizer = TfidfVectorizer(
    min_df=2,
    max_df=0.90
)

tfidf_matrix = vectorizer.fit_transform(df["text_clean"])
feature_names = vectorizer.get_feature_names_out()

print("\nNumber of TF-IDF features:")
print(len(feature_names))

feature_names = vectorizer.get_feature_names_out()

print("\nNumber of TF-IDF features:")
print(len(feature_names))

sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    top_k=3
)

results = sentiment_pipeline(
    df["text"].head(5).tolist()
)

print(results[0])

def get_sentiment_scores(texts, batch_size=32):
    all_results = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]

        results = sentiment_pipeline(
            batch,
            truncation=True,
            max_length=512
        )

        all_results.extend(results)

        print(
            f"Processed {min(i + batch_size, len(texts))}"
            f"/{len(texts)}"
        )

    return all_results

sentiment_results = get_sentiment_scores(
    df["text"].tolist()
)

def parse_sentiment(result):
    scores = {
        item["label"].lower(): item["score"]
        for item in result
    }

    negative = scores.get("negative", 0)
    neutral = scores.get("neutral", 0)
    positive = scores.get("positive", 0)

    sentiment_score = positive - negative

    sentiment = max(
        ["negative", "neutral", "positive"],
        key=lambda x: scores.get(x, 0)
    )

    return sentiment, sentiment_score

parsed_results = [
    parse_sentiment(result)
    for result in sentiment_results
]

df["sentiment"] = [
    result[0] for result in parsed_results
]

df["sentiment_score"] = [
    result[1] for result in parsed_results
]

print(
    df[
        ["text", "sentiment", "sentiment_score"]
    ].head(10).to_string()
)

print("\nSentiment counts:")
print(df["sentiment"].value_counts())

print("\nSentiment score:")
print(df["sentiment_score"].describe())

print(
    df["sentiment_score"].min(),
    df["sentiment_score"].max()
)

df["week"] = df["date"].dt.to_period("W").dt.start_time

weekly_sentiment = (
    df.groupby("week")
      .agg(
          avg_sentiment=("sentiment_score", "mean"),
          tweet_count=("id", "count"),
          avg_retweets=("retweets", "mean"),
          avg_favorites=("favorites", "mean")
      )
      .reset_index()
)

print("\nWeekly sentiment:")
print(weekly_sentiment.head(10))

df.to_csv(
    "data/lab4_clean_tweets.csv",
    index=False
)

weekly_sentiment.to_csv(
    "data/lab4_weekly_sentiment.csv",
    index=False
)