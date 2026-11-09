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
