import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path
import time
import pandas as pd

url = "https://books.toscrape.com/"

records = []

while url:

    print("Scraping:", url)

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as error:
        print("Request failed:", error)
        break

    soup = BeautifulSoup(response.text, "html.parser")

    books = soup.select("article.product_pod")

    for book in books:
        title = book.select_one("h3 a")["title"]
        price = book.select_one(".price_color").get_text(strip=True)
        rating = book.select_one(".star-rating")["class"][1]

        records.append({
            "title": title,
            "price": price,
            "rating": rating
        })

    next_link = soup.select_one("li.next a")

    if next_link:
        url = urljoin(url, next_link["href"])
    else:
        url = None

    time.sleep(0.5)


df = pd.DataFrame(records)

print(df.head())
print(df.shape)

df["price"] = (
    df["price"]
    .str.replace("Â£", "", regex=False)
    .astype(float)
)

rating_map = {
    "One": 1,
    "Two": 2,
    "Three": 3,
    "Four": 4,
    "Five": 5
}

df["rating"] = df["rating"].map(rating_map)

print(df.head())
print(df.shape)

output_path = Path(__file__).resolve().parents[1] / "data" / "books.csv"
df.to_csv(output_path, index=False)

print(f"Saved to {output_path}")
print("Total records:", len(records))
