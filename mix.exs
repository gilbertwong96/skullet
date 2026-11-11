defmodule Skullet.MixProject do
  use Mix.Project

  def project do
    [
      app: :skullet,
      version: "0.1.2",
      elixir: "~> 1.18",
      name: "Skullet",
      description: "Measured skeleton loading screens for Phoenix LiveView",
      source_url: "https://github.com/gilbertwong96/skullet",
      package: package(),
      docs: docs(),
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      dialyzer: [plt_add_apps: [:ex_unit]],
      test_coverage: [tool: ExCoveralls],
      aliases: aliases()
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      extra_applications: [:logger],
      mod: {Skullet.Application, []}
    ]
  end

  def cli do
    [
      preferred_envs: [
        ci: :test,
        coveralls: :test,
        "coveralls.html": :test,
        "coveralls.json": :test
      ]
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:excoveralls, "~> 0.18", only: [:dev, :test], runtime: false},
      {:spec_lint, "~> 0.1", only: [:dev, :test], runtime: false},
      {:ex_slop, "~> 0.4", only: [:dev, :test], runtime: false},
      {:reach, "~> 2.0", only: [:dev, :test], runtime: false},
      {:ex_dna, "~> 1.0", only: [:dev, :test], runtime: false},
      {:dialyxir, "~> 1.0", only: [:dev, :test], runtime: false},
      {:credo, "~> 1.0", only: [:dev, :test], runtime: false},
      {:phoenix_live_view, "~> 1.2"},
      {:phoenix_html, "~> 4.3"},
      {:lazy_html, ">= 0.1.0", only: :test},
      {:ex_doc, "~> 0.34", only: :dev, runtime: false},
      # ExDoc brings makeup + makeup_elixir; the guides also fence heex, js and css.
      {:makeup_eex, "~> 2.0", only: :dev, runtime: false},
      {:makeup_html, "~> 1.0", only: :dev, runtime: false},
      {:makeup_js, "~> 0.1", only: :dev, runtime: false},
      {:makeup_css, "~> 0.2", only: :dev, runtime: false}
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp package do
    [
      licenses: ["MIT"],
      files: ~w(lib priv guides mix.exs README.md CHANGELOG.md LICENSE .formatter.exs),
      links: %{"GitHub" => "https://github.com/gilbertwong96/skullet"}
    ]
  end

  defp docs do
    [
      main: "readme",
      extras: [
        "README.md",
        "guides/usage.md",
        "guides/theming.md",
        "guides/reveals.md",
        "guides/internals.md",
        "CHANGELOG.md"
      ],
      groups_for_extras: [
        Guides: ~r|^guides/|
      ],
      source_url: "https://github.com/gilbertwong96/skullet"
    ]
  end

  defp aliases() do
    [
      ci: [
        "compile --warnings-as-errors",
        "format --check-formatted",
        "coveralls.lcov",
        "credo --strict",
        "dialyzer",
        "spec_lint --warnings-as-errors",
        "ex_dna --max-clones 0",
        "reach.check --arch --dead-code --smells"
      ]
    ]
  end
end
