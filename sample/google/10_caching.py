import time

from google import genai
from google.genai import types
from sample.google import DATA_DIR, TEXT_MODEL


def wait_for_file_processing(client: genai.Client, file_name: str) -> object:
    uploaded_file = client.files.get(name=file_name)
    while getattr(uploaded_file.state, "name", None) == "PROCESSING":
        time.sleep(2)
        uploaded_file = client.files.get(name=file_name)
    return uploaded_file


def main() -> None:
    client = genai.Client()

    document = client.files.upload(
        file=DATA_DIR / "pdf_test.pdf",
        config=dict(mime_type="application/pdf"),
    )
    document = wait_for_file_processing(client, document.name)

    cache = None
    try:
        cache = client.caches.create(
            model=TEXT_MODEL,
            config=types.CreateCachedContentConfig(
                display_name="local-pdf-explicit-cache-sample",
                system_instruction=(
                    "You are an expert document analyst. Answer only from the PDF "
                    "that was cached for this request."
                ),
                contents=[document],
                ttl="600s",
            ),
        )

        print("[cache created]")
        print(f"name={cache.name}")
        print(f"expire_time={cache.expire_time}")
        print()

        cache_metadata = client.caches.get(name=cache.name)
        print("[cache metadata]")
        print(f"display_name={cache_metadata.display_name}")
        print(f"model={cache_metadata.model}")
        print()

        response = client.models.generate_content(
            model=TEXT_MODEL,
            contents=(
                "Summarize this PDF in 3 bullet points and then list 2 important "
                "follow-up questions."
            ),
            config=types.GenerateContentConfig(
                cached_content=cache.name,
                temperature=0.1,
            ),
        )

        print("[usage metadata]")
        print(response.usage_metadata)
        print()

        print("[answer]")
        print(response.text)
    finally:
        if cache is not None:
            client.caches.delete(name=cache.name)
            print()
            print("[cache deleted]")
            print(cache.name)


if __name__ == "__main__":
    main()


# References:
# https://ai.google.dev/gemini-api/docs/caching
