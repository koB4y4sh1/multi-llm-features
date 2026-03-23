from google import genai
from google.genai import types
from sample.google import TEXT_MODEL, read_bytes


def main() -> None:
    client = genai.Client()

    cat_image = types.Part.from_bytes(
        data=read_bytes("cat.png"),
        mime_type="image/png",
    )
    dog_image = types.Part.from_bytes(
        data=read_bytes("dog.png"),
        mime_type="image/png",
    )

    response = client.models.generate_content(
        model=TEXT_MODEL,
        contents=[
            "これら2つの画像を比較し、主題、雰囲気、そして想定される用途の違いを説明してください。",
            cat_image,
            dog_image,
        ],
        config=types.GenerateContentConfig(temperature=0.1),
    )
    print(response.text)


if __name__ == "__main__":
    main()


# References:
# https://ai.google.dev/gemini-api/docs/image-understanding
# https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/googlegenaisdk-textgen-with-txt-img
# https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
