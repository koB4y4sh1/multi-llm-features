from google import genai
from google.genai import types
from sample.google import TEXT_MODEL


def main() -> None:
    client = genai.Client()

    prompt = """
        Alice, Bob, and Carol each live in a different house on the same street: red, green, and blue.
        The person who lives in the red house owns a cat.
        Bob does not live in the green house.
        Carol owns a dog.
        The green house is to the left of the red house.
        Alice does not own a cat.
        Who lives in each house, and what pet do they own?
    """.strip()

    response = client.models.generate_content(
        model=TEXT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                include_thoughts=True,
                thinking_level="low",
            )
        ),
    )

    for part in response.candidates[0].content.parts:
        if not part.text:
            continue
        if part.thought:
            print("[thought summary]")
            print(part.text)
            print()
            continue

        print("[answer]")
        print(part.text)
        print()


if __name__ == "__main__":
    main()


# References:
# https://ai.google.dev/gemini-api/docs/thinking
