defmodule Skullet.LiveViewTest do
  use ExUnit.Case, async: false
  import Phoenix.ConnTest
  import Phoenix.LiveViewTest

  @endpoint Skullet.Test.Endpoint

  test "a dead render is loading, then the async assign reveals the content" do
    {:ok, view, html} = live(conn(), "/demo")

    assert html =~ ~s(data-skullet-state="loading")
    assert html =~ "Sample Name"

    html = render_async(view)

    assert html =~ ~s(data-skullet-state="loaded")
    assert html =~ "Real Name"
    refute html =~ "Sample Name"
  end

  test "going back to loading shows the skeleton again" do
    {:ok, view, _html} = live(conn(), "/demo")
    render_async(view)

    html = render_click(view, "reload")

    assert html =~ ~s(data-skullet-state="loading")
    assert render_async(view) =~ ~s(data-skullet-state="loaded")
  end

  defp conn, do: Phoenix.ConnTest.build_conn()
end
