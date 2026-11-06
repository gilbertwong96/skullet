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
  defp attrs(html), do: html |> root() |> LazyHTML.attributes() |> List.flatten() |> Map.new()

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

  test "a theme renders as custom properties on the root" do
    html = skeleton_html(theme: %{base: "rgb(0 0 0 / 0.1)", radius: "8px"})
    style = attr(html, "style")

    assert style =~ "--skullet-base: rgb(0 0 0 / 0.1)"
    assert style =~ "--skullet-radius: 8px"
  end

  test "string keys are accepted" do
    html = skeleton_html(theme: %{"speed" => "fast"})

    assert attr(html, "style") =~ "--skullet-speed: fast"
  end

  test "an empty theme renders no style attribute" do
    html = skeleton_html(theme: %{})

    refute Map.has_key?(attrs(html), "style")
  end

  test "non-string values are stringified" do
    html = skeleton_html(theme: %{radius: 8})

    assert attr(html, "style") =~ "--skullet-radius: 8"
  end

  test "a theme key that is neither atom nor string still raises ArgumentError" do
    assert_raise ArgumentError, ~r/allowed keys/, fn ->
      skeleton_html(theme: %{{:base} => "red"})
    end
  end

  test "an unknown key raises" do
    assert_raise ArgumentError, ~r/allowed keys/, fn ->
      skeleton_html(theme: %{colour: "red"})
    end
  end
end
