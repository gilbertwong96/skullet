defmodule SkulletDemoWeb.DemoLiveTest do
  use SkulletDemoWeb.ConnCase
  import Phoenix.LiveViewTest

  test "every option in the controls panel renders", %{conn: conn} do
    {:ok, view, html} = live(conn, "/")

    for {field, values} <- options(html) do
      for value <- values do
        assert render_change(view, "control", %{"controls" => %{field => value}})
      end
    end
  end

  test "the panel says what the hold does, and when it hides the skeleton", %{conn: conn} do
    {:ok, view, html} = live(conn, "/")
    assert html =~ "before a skeleton shows"
    refute html =~ "is not shorter than"

    assert render_change(view, "control", %{"controls" => %{"hold" => "800ms"}}) =~
             "is not shorter than"

    html = render_change(view, "control", %{"controls" => %{"hold" => ""}})
    assert html =~ "before a skeleton shows"
    refute html =~ "is not shorter than"
  end

  test "the header offers the three page themes", %{conn: conn} do
    {:ok, _view, html} = live(conn, "/")

    themes =
      html
      |> LazyHTML.from_document()
      |> LazyHTML.query("header button[data-phx-theme]")
      |> LazyHTML.attribute("data-phx-theme")

    assert themes == ["system", "light", "dark"]
  end

  test "the provider card sets its own scheme, whatever the page does", %{conn: conn} do
    {:ok, view, html} = live(conn, "/")

    assert html =~ ~r/#provider-card \{ color-scheme: dark/
    assert html =~ "bg-neutral"

    light = render_click(view, "own_mode", %{"mode" => "light"})
    assert light =~ ~r/#provider-card \{ color-scheme: light/
    assert light =~ "bg-white"

    assert render_click(view, "own_mode", %{"mode" => "dark"}) =~
             ~r/#provider-card \{ color-scheme: dark/
  end

  defp options(html) do
    html
    |> LazyHTML.from_document()
    |> LazyHTML.query("select[name^='controls']")
    |> Enum.map(fn select -> {field(select), values(select)} end)
  end

  defp field(select) do
    select
    |> LazyHTML.attribute("name")
    |> List.first()
    |> String.slice(9..-2//1)
  end

  defp values(select), do: select |> LazyHTML.query("option") |> LazyHTML.attribute("value")
end
