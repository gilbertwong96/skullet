defmodule Skullet.MixProject do
  use Mix.Project

  def project do
    [
      app: :skullet,
      version: "0.1.0",
      elixir: "~> 1.14",
      name: "Skullet",
      description: "Measured skeleton loading screens for Phoenix LiveView",
      source_url: "https://github.com/gilbertwong96/skullet",
      package: package(),
      docs: docs(),
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      extra_applications: [:logger],
      mod: {Skullet.Application, []}
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:phoenix_live_view, "~> 1.2"},
      {:phoenix_html, "~> 4.3"},
      {:lazy_html, ">= 0.1.0", only: :test},
      {:ex_doc, "~> 0.34", only: :dev, runtime: false}
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp package do
    [
      licenses: ["MIT"],
      files: ~w(lib priv mix.exs README.md CHANGELOG.md LICENSE .formatter.exs),
      links: %{"GitHub" => "https://github.com/gilbertwong96/skullet"}
    ]
  end

  defp docs do
    [
      main: "readme",
      extras: ["README.md", "CHANGELOG.md"],
      source_url: "https://github.com/gilbertwong96/skullet"
    ]
  end
end
