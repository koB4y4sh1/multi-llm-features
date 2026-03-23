from google import genai
from sample.google import TEXT_MODEL


def main() -> None:
    client = genai.Client()

    chat = client.chats.create(model=TEXT_MODEL)

    first = chat.send_message(
        "I am planning a web app and want to use generative AI for FAQ support."
    )
    print("[turn1]")
    print(first.text)
    print()

    second = chat.send_message(
        "Based on your previous answer, list what to do in the first two weeks."
    )
    print("[turn2]")
    print(second.text)


if __name__ == "__main__":
    main()


# References:
# https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart
# https://googleapis.github.io/python-genai/
