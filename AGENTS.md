# VibeKit quality gate

## Development

```sh
mix deps.get
mix ci
```

## Conventions

- Use `mix ci` for the full validation suite before finishing changes.
- For Phoenix/web apps, keep Phoenix's generated guidance, but treat this VibeKit section as the final quality gate.
- For non-web Elixir projects, VibeKit is the default project baseline.
- Keep changes small, tested, and formatted.

## Refactoring with pi-elixir

Source changes go through pi-elixir's tools, not text edits or throwaway scripts. The
session has them as `elixir_ast_search`, `elixir_ast_replace` and `elixir_eval`.

- **Find the shape first**: `elixir_ast_search` with an ExAST pattern — `def handle_call(_, _, _) do _ end`, `%Step{id: "subject"}`, `IO.inspect(_)`. Lowercase names capture, `_` is a wildcard, `...` matches zero or more nodes. Use `inside` / `notInside` to keep a match in its scope, and `patterns` for several searches in one pass.
- **Rewrite with it**: `elixir_ast_replace` for the change, `dryRun: true` first and read the diff before applying. Captures take the pattern's variable names into the replacement.
- **Ask the runtime**: `elixir_eval` against the `project` target for anything that is really a question about the code — docs, exports, config, a data pipeline, `Code.string_to_quoted` checks.
- **Finish the way any change finishes**: `mix format`, then `mix ci`.

Text edits stay for prose, config, and one-line changes with a unique anchor. A rename that
reaches across modules, protocols or the public API is an AST change — never a global string
replace, and never a Python/Perl/sed script.
