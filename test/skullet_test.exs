defmodule SkulletTest do
  use ExUnit.Case, async: true
  import Phoenix.LiveViewTest
  alias Phoenix.LiveView.AsyncResult

  @real Skullet.Sample.real_user()

  defp skeleton_html(opts) do
    opts =
      Keyword.merge(
        [
          id: "profile",
          async: nil,
          data: nil,
          loading: false,
          theme: %{},
          label: "Loading",
          reveal: "smart"
        ],
        opts
      )

    render_component(&Skullet.TestComponents.profile/1, opts)
  end

  defp root(html), do: html |> LazyHTML.from_document() |> LazyHTML.query(".skullet")
  defp attr(html, name), do: html |> root() |> LazyHTML.attribute(name) |> List.first()
  defp text(%LazyHTML{} = lazy), do: LazyHTML.text(lazy)
  defp text(html) when is_binary(html), do: html |> LazyHTML.from_document() |> LazyHTML.text()
  defp query(html, selector), do: html |> LazyHTML.from_document() |> LazyHTML.query(selector)
  defp empty?(html, selector), do: html |> query(selector) |> Enum.empty?()

  test "a dead render is loading, and renders the sample" do
    html = skeleton_html([])

    assert attr(html, "id") == "profile"
    assert attr(html, "class") == "skullet"
    assert attr(html, "phx-hook") == "Skullet"
    assert attr(html, "data-skullet-state") == "loading"
    assert attr(html, "data-skullet-reveal") == "smart"
    assert attr(html, "aria-busy") == "true"

    assert text(query(html, "#content")) == "Sample Name"
  end

  test "a plain value is loaded" do
    html = skeleton_html(data: @real)

    assert attr(html, "data-skullet-state") == "loaded"
    assert attr(html, "aria-busy") == "false"
    assert text(query(html, "#content")) == "Real Name"
    refute text(html) =~ "Sample Name"
  end

  test "nil data is loading" do
    html = skeleton_html(data: nil)

    assert attr(html, "data-skullet-state") == "loading"
    assert text(query(html, "#content")) == "Sample Name"
  end

  test "a resolved async assign is loaded" do
    html = skeleton_html(async: AsyncResult.ok(%AsyncResult{}, @real))

    assert attr(html, "data-skullet-state") == "loaded"
    assert text(query(html, "#content")) == "Real Name"
  end

  test "an unresolved async assign is loading" do
    html = skeleton_html(async: %AsyncResult{ok?: false})

    assert attr(html, "data-skullet-state") == "loading"
    assert text(query(html, "#content")) == "Sample Name"
  end

  test "a failed async assign renders the error slot and no content pane" do
    html =
      render_component(&Skullet.TestComponents.failed/1,
        id: "profile",
        async: AsyncResult.failed(%AsyncResult{}, :boom)
      )

    assert attr(html, "data-skullet-state") == "failed"
    assert attr(html, "aria-busy") == "false"
    assert text(query(html, "#error")) == "Could not load."
    assert empty?(html, "[data-skullet-content]")
  end

  test "the loading attribute wins over data" do
    html = skeleton_html(data: @real, loading: true)

    assert attr(html, "data-skullet-state") == "loading"
    assert text(query(html, "#content")) == "Sample Name"
  end

  test "the status span carries the label outside the content pane" do
    html = skeleton_html(label: "Loading profile")

    assert text(query(html, ".skullet-status")) == "Loading profile"
    assert empty?(html, "[data-skullet-content] .skullet-status")
  end
end
