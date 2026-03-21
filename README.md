# multi-llm-features

Utilities for investigating Anthropic, Gemini, and OpenAI models from two angles:

- `llm/`: provider-focused feature probes and reusable evaluation/reporting helpers
- `demo/`: model comparison demos and use-case demos that emit HTML reports

Quick start:

```bash
pip install -e .
python -m demo.models.model_comparison_demo
python -m demo.use_cases.support_triage_demo
```
