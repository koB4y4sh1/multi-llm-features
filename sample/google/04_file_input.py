from google import genai
from google.genai import types
from sample.google import TEXT_MODEL, read_bytes

client = genai.Client()

document = types.Part.from_bytes(
    inline_data=read_bytes("sample.pdf"),
    mime_type="",
)
video = types.Part.from_bytes(
    data=read_bytes("phone_black_man.mp4"),
    mime_type="video/mp4",
)
audio = types.Part.from_bytes(
    data=read_bytes("phone_black_man.mp4"),
    mime_type="video/mp4",
)


def run_document() -> None:
    response = client.models.generate_content(
        model=TEXT_MODEL,
        contents=[
            "この動画の内容を要約し、重要なシーンを3つ挙げてください。",
            document,
        ],
        config=types.GenerateContentConfig(temperature=0.1),
    )
    print(response.text)


def run_video() -> None:
    response = client.models.generate_content(
        model=TEXT_MODEL,
        contents=[
            "この動画の内容を要約し、重要なシーンを3つ挙げてください。",
            video,
        ],
        config=types.GenerateContentConfig(temperature=0.1),
    )
    print(response.text)


def run_audio() -> None:
    response = client.models.generate_content(
        model=TEXT_MODEL,
        contents=[
            "この動画の内容を要約し、重要なシーンを3つ挙げてください。",
            audio,
        ],
        config=types.GenerateContentConfig(temperature=0.1),
    )
    print(response.text)


if __name__ == "__main__":
    run_document()
    run_video()
    run_audio()


# References:
# https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/googlegenaisdk-textgen-with-video
# https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
