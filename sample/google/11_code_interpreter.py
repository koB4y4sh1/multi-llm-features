from google import genai
from google.genai import types
from sample.google import TEXT_MODEL


def main() -> None:
    client = genai.Client()

    response = client.models.generate_content(
        model=TEXT_MODEL,
        contents=(
            "次の sales 配列を使って、合計値・平均値・最大値を計算してください。"
            "必ず code execution ツールを使って Python を実行してから回答してください。"
            "暗算や推論だけで答えず、実行結果に基づいて日本語で短い分析も付けてください。"
            "\n\nsales = [120, 180, 90, 210, 160]"
        ),
        config=types.GenerateContentConfig(
            tools=[types.Tool(code_execution=types.ToolCodeExecution())],
            temperature=0,
        ),
    )

    for candidate in response.candidates:
        for part in candidate.content.parts:
            if getattr(part, "text", None):
                print(part.text)
            if getattr(part, "executable_code", None):
                print("[code]")
                print(part.executable_code.code)
            if getattr(part, "code_execution_result", None):
                print("[code result]")
                print(part.code_execution_result.output)


if __name__ == "__main__":
    main()


# References:
# https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
# https://googleapis.github.io/python-genai/
