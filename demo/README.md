# Demo Layout

The `demo/` folder now has two lanes:

- `demo/models/`: model-first comparisons that run the same prompts across Anthropic, Gemini, and OpenAI.
- `demo/use_cases/`: scenario-first demos that show how multiple models behave on a concrete task.
- `demo/google/`: the existing Gemini Embedding 2 exploration remains available.

Recommended commands:

```bash
python -m demo.models.model_comparison_demo
python -m demo.use_cases.support_triage_demo
python -m demo.google.gemini_embedding_2_demo
python -m llm.openai.chat_feature_probe --output-html demo/artifacts/openai_probe.html
python -m llm.anthropic.chat_feature_probe --output-html demo/artifacts/anthropic_probe.html
python -m llm.google.gemini_text_probe --output-html demo/artifacts/gemini_probe.html
```

Environment variables:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

Generated reports are written to `demo/artifacts/`.
