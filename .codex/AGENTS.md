# AGENTS.md

Instructions for AI coding agents working in this Python project.

## Read First

- `README.md` - project overview and how to run it
- `pyproject.toml` - dependencies, tooling, test/lint settings
- `AGENTS.md` in subdirectories, if present

## Core Rules

- リクエストで求められている変更のみを行う
- 既存のコーディングスタイルとプロジェクト構造に従う
- 動作が不明確な場合、要件を推測しない
- 無関係なリファクタリングや依存関係の変更は避ける
- 変更は小さく、レビューしやすいものにする

## Implementation

- 症状だけでなく、根本原因の修正を優先する
- タスクで明示的に変更が必要とされない限り、既存の公開APIは維持する
- 新しいユーティリティやパターンを追加する前に、既存のものを再利用する
- コードの意図が明らかでない場合にのみ、コメントを追加する

## Testing

- 変更した動作に対してテストを追加または更新する
- 最小限で効果的なテスト範囲を優先する
- `pyproject.toml` またはプロジェクトスクリプトで定義された標準チェックを実行する

## Documentation

ドキュメントは日本語で記載する。
以下の変更を行う際は、ドキュメントを更新する：

- `README.md` - プロジェクト概要、使い方、設定または環境変数
- `SETUP.md` - セットアップまたは実行手順
- `CODING.md` - コーディング規約・命名規約、lint / format / security check の方針
- `.env.example` - 環境変数

## Safety

- シークレット、トークン、認証情報をハードコードしてはならない
- 機密データをログに記録してはならない
- 外部入力を検証し、エラーを明示的に処理する

## Subdirectory Rules

下位ディレクトリに `AGENTS.md` が存在する場合は、そのディレクトリについては当該ファイルに従う。