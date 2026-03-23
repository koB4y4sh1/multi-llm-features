from google import genai
from google.genai import types
from sample.google import EMBEDDING_MODEL


def main() -> None:
    client = genai.Client()

    texts = [
        "Build FAQ automation with Gemini on Vertex AI.",
        "Convert support history into embeddings for semantic search.",
        "Improve prompts for image generation.",
    ]

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=768,
        ),
    )

    for index, embedding in enumerate(response.embeddings, start=1):
        print(f"[embedding {index}] length={len(embedding.values)}")
        print(embedding.values[:8])


if __name__ == "__main__":
    main()


# References:
# https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings
# https://googleapis.github.io/python-genai/
