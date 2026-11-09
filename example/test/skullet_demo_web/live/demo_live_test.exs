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

  test "the panel says when the hold outlasts the latency", %{conn: conn} do
    {:ok, view, html} = live(conn, "/")
    refute html =~ "is not shorter than"

    assert render_change(view, "control", %{"controls" => %{"hold" => "800ms"}}) =~
             "is not shorter than"

    refute render_change(view, "control", %{"controls" => %{"hold" => ""}}) =~
             "is not shorter than"
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

  test "the provider card can ask for its own colour scheme", %{conn: conn} do
    {:ok, view, html} = live(conn, "/")

    assert html =~ ~s(color-scheme: dark)

    assert render_click(view, "own_mode", %{"mode" => "light"}) =~ "color-scheme: light"
    # an empty mode means "follow the page", so the wrapper stops overriding it
    refute render_click(view, "own_mode", %{"mode" => ""}) =~ "color-scheme:"
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
