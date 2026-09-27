import pandas as pd
import numpy as np

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans

from sentence_transformers import SentenceTransformer
import umap

df = pd.read_csv("data/bulletin_passages.csv")

df = df.dropna(subset=["text"])
df = df.drop_duplicates(subset=["text"])

df["text_clean"] = (
    df["text"]
    .str.replace(r"\s+", " ", regex=True)
    .str.strip()
)

print(df.head())
print(df.shape)

df["word_count"] = df["text_clean"].str.split().str.len()

print(df["word_count"].describe())
print(df["section"].value_counts())

vectorizer = TfidfVectorizer(
    stop_words="english",
    max_features=1000
)

tfidf_matrix = vectorizer.fit_transform(df["text_clean"])

print("TF-IDF matrix shape:", tfidf_matrix.shape)

terms = vectorizer.get_feature_names_out()
mean_tfidf = np.asarray(tfidf_matrix.mean(axis=0)).ravel()

top_indices = mean_tfidf.argsort()[-30:][::-1]

print("Top TF-IDF terms:")
for i in top_indices:
    print(f"{terms[i]}: {mean_tfidf[i]:.4f}")

model = SentenceTransformer("all-MiniLM-L6-v2")

embeddings = model.encode(
    df["text_clean"].tolist(),
    normalize_embeddings=True
)

print(embeddings.shape)

similarity = cosine_similarity(embeddings)

scores = similarity[0].copy()
scores[0] = -1

index = np.argmax(scores)

print("Original passage:")
print(df.iloc[0]["text_clean"])

print("\nMost semantically similar passage:")
print(df.iloc[index]["text_clean"])

print("\nSimilarity:", scores[index])

reducer = umap.UMAP(
    n_components=2,
    n_neighbors=15,
    min_dist=0.15,
    metric="cosine",
    random_state=401
)

coords = reducer.fit_transform(embeddings)

df["x"] = coords[:, 0]
df["y"] = coords[:, 1]

print(coords.shape)
print(df[["passage_id", "x", "y"]].head())

from sklearn.cluster import KMeans

kmeans = KMeans(
    n_clusters=8,
    random_state=401,
    n_init="auto"
)

df["cluster"] = kmeans.fit_predict(embeddings)

print(df["cluster"].value_counts().sort_index())

for cluster_id in range(8):

    cluster_indices = np.where(
        df["cluster"].values == cluster_id
    )[0]

    cluster_embeddings = embeddings[cluster_indices]

    centroid = kmeans.cluster_centers_[cluster_id]

    distances = np.linalg.norm(
        cluster_embeddings - centroid,
        axis=1
    )

    closest = cluster_indices[
        np.argsort(distances)[:5]
    ]

    print("\n" + "=" * 80)
    print(f"CLUSTER {cluster_id}")
    print("=" * 80)

    for idx in closest:

        print(
            f"\nPassage: {df.iloc[idx]['passage_id']}"
        )

        print(
            f"Section: {df.iloc[idx]['section']}"
        )

        print(
            f"Text: {df.iloc[idx]['text_clean'][:500]}"
        )

print("\n" + "=" * 80)
print("TOP TF-IDF TERMS BY CLUSTER")
print("=" * 80)

for cluster_id in range(8):

    cluster_indices = np.where(
        df["cluster"].values == cluster_id
    )[0]

    cluster_tfidf = tfidf_matrix[
        cluster_indices
    ]

    mean_cluster_tfidf = np.asarray(
        cluster_tfidf.mean(axis=0)
    ).ravel()

    top_indices = mean_cluster_tfidf.argsort()[-10:][::-1]

    print(f"\nCluster {cluster_id}:")

    for i in top_indices:
        print(
            f"{terms[i]}: "
            f"{mean_cluster_tfidf[i]:.4f}"
        )

cluster_names = {
    0: "Arts, Media & Humanities",
    1: "Academic Policies & Study Away",
    2: "Chinese Studies & History",
    3: "Social Sciences & Culture",
    4: "Course Prerequisites",
    5: "Environmental & Health Sciences",
    6: "Political Science & Public Policy",
    7: "Computer Science & Natural Sciences"
}

df["cluster_name"] = df["cluster"].map(
    cluster_names
)

neighbor_ids = []

for i in range(len(df)):

    scores = similarity[i].copy()

    # Exclude the passage itself
    scores[i] = -1

    # Get the indices of the 5 highest similarity scores
    top_indices = np.argsort(scores)[-5:][::-1]

    # Convert indices to passage IDs
    neighbors = df.iloc[top_indices]["passage_id"].tolist()

    neighbor_ids.append(",".join(neighbors))

df["neighbor_ids"] = neighbor_ids

print(df[["passage_id", "neighbor_ids"]].head())

df[
    [
        "passage_id",
        "chapter",
        "section",
        "subsection",
        "page",
        "text",
        "word_count",
        "cluster",
        "cluster_name",
        "x",
        "y",
        "neighbor_ids"
    ]
].to_csv(
    "data/lab8_embedding_map.csv",
    index=False
)

print("\nEmbedding map saved:")
print("data/lab8_embedding_map.csv")
print("Shape:", df.shape)

matrix_df = (
    df.groupby(
        ["section", "cluster_name"]
    )
    .size()
    .reset_index(name="count")
)

matrix_df.to_csv(
    "data/lab8_topic_section_matrix.csv",
    index=False
)

print("\nTopic × Section matrix saved:")
print("data/lab8_topic_section_matrix.csv")
print("Shape:", matrix_df.shape)

print(matrix_df.head())