from google import genai
from google.genai import types
from sample.google import TEXT_MODEL


def main() -> None:
    client = genai.Client()

    response = client.models.generate_content(
        model=TEXT_MODEL,
        contents="AIエージェントとワークフローの違いを3つの箇条書きで説明してください。",
        config=types.GenerateContentConfig(
            temperature=0.2,
            system_instruction="Respond briefly and focus on practical usage.",
            thinking_config=types.ThinkingConfig(thinking_level="low"),
        ),
    )
    print(response.text)


if __name__ == "__main__":
    main()


# References:
# https://ai.google.dev/gemini-api/docs/text-generation
# https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
