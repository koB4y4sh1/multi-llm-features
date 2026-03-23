from google import genai
from google.genai import types
from sample.google import TEXT_MODEL, read_bytes


def main() -> None:
    client = genai.Client()

    image = types.Part.from_bytes(
        data=read_bytes("cat.png"),
        mime_type="image/png",
    )

    response = client.models.count_tokens(
        model=TEXT_MODEL,
        contents=[
            "Describe this image and write copy that could be used on an ecommerce page.",
            image,
        ],
    )

    print(f"total_tokens={response.total_tokens}")
    print(f"cached_content_token_count={response.cached_content_token_count}")


if __name__ == "__main__":
    main()


# References:
# https://ai.google.dev/gemini-api/docs/tokens
# https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/get-token-count
# https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/count-tokens
