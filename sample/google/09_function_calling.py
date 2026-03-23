from google import genai
from google.genai import types
from sample.google import TEXT_MODEL


def get_current_location() -> dict:
    """Returns the user's current city."""

    return {"location": "Tokyo"}


def get_current_temperature(location: str) -> dict:
    """Gets the current temperature for a given location."""

    mock_temperatures = {
        "Tokyo": 18,
        "Osaka": 20,
        "Kyoto": 17,
    }
    temperature_c = mock_temperatures.get(location, 19)
    return {"location": location, "temperature_c": temperature_c}


def print_history(chat: object) -> None:
    for index, message in enumerate(chat.get_history(), start=1):
        print(f"[history {index}] role={message.role}")

        for part in message.parts:
            thought_signature = getattr(part, "thought_signature", None)
            if thought_signature:
                print("thought_signature=present")

            if getattr(part, "text", None):
                print(part.text)
                continue

            function_call = getattr(part, "function_call", None)
            if function_call:
                print(f"function_call={function_call.name} args={function_call.args}")
                continue

            function_response = getattr(part, "function_response", None)
            if function_response:
                print(
                    f"function_response={function_response.name} "
                    f"response={function_response.response}"
                )

        print()


def main() -> None:
    client = genai.Client()

    chat = client.chats.create(
        model=TEXT_MODEL,
        config=types.GenerateContentConfig(
            tools=[get_current_location, get_current_temperature],
            thinking_config=types.ThinkingConfig(
                include_thoughts=True,
                thinking_level="minimal",
            ),
        ),
    )

    response = chat.send_message(
        "Use the tools to find my current location, then get the temperature there, "
        "and finally answer in Japanese."
    )

    print("[final answer]")
    print(response.text)
    print()

    print("[chat history]")
    print_history(chat)


if __name__ == "__main__":
    main()


# References:
# https://ai.google.dev/gemini-api/docs/function-calling
# https://ai.google.dev/gemini-api/docs/thought-signatures
