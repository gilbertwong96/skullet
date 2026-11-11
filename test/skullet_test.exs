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
          reveal: "smart",
          remember: nil
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

  defp css(html),
    do: html |> LazyHTML.from_document() |> LazyHTML.query("style") |> LazyHTML.text()

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
    # nothing is loading any more: the label must not be left behind for screen readers
    assert empty?(html, ".skullet-status")
  end

  test "the loading attribute wins over data" do
    html = skeleton_html(data: @real, loading: true)

    assert attr(html, "data-skullet-state") == "loading"
    assert text(query(html, "#content")) == "Sample Name"
  end

  test "an empty result shows the empty message in place of the content" do
    html =
      render_component(&Skullet.TestComponents.with_empty_state/1,
        id: "inbox",
        data: [],
        empty: true
      )

    assert attr(html, "data-skullet-state") == "loaded"
    assert attr(html, "aria-busy") == "false"
    assert text(query(html, "#empty")) == "No messages yet."
    assert empty?(html, "#content")
    # the message is the content pane, so the engine measures and reveals it
    refute empty?(html, "[data-skullet-content] #empty")
    assert empty?(html, ".skullet-status")
  end

  @tag capture_log: true
  test "empty without a message leaves the content alone" do
    html =
      render_component(&Skullet.TestComponents.empty_without_message/1,
        id: "inbox",
        data: @real
      )

    assert text(query(html, "#content")) == "Real Name"
    assert empty?(html, "#empty")
  end

  test "content that has not arrived is not empty yet" do
    html =
      render_component(&Skullet.TestComponents.with_empty_state/1, id: "inbox", empty: true)

    assert attr(html, "data-skullet-state") == "loading"
    assert text(query(html, "#content")) == "Sample Name"
    assert empty?(html, "#empty")
  end

  test "an empty state does not hide a failure" do
    html =
      render_component(&Skullet.TestComponents.with_empty_state/1,
        id: "inbox",
        empty: true,
        async: AsyncResult.failed(%AsyncResult{}, :boom)
      )

    assert attr(html, "data-skullet-state") == "failed"
    assert text(query(html, "#error")) == "Could not load."
    assert empty?(html, "#empty")
  end

  test "state says the two cases the inference cannot: empty, and failed over plain data" do
    empty = render_component(&Skullet.TestComponents.stateful/1, id: "inbox", state: :empty)

    assert attr(empty, "data-skullet-state") == "loaded"
    assert text(query(empty, "#empty")) == "No messages yet."
    assert empty?(empty, "#content")

    failed = render_component(&Skullet.TestComponents.stateful/1, id: "inbox", state: :failed)

    assert attr(failed, "data-skullet-state") == "failed"
    assert text(query(failed, "#error")) == "Could not load."
    assert empty?(failed, "#content")
  end

  test "state: :loaded passes the data through, nil included" do
    html = render_component(&Skullet.TestComponents.stateful/1, id: "inbox", state: :loaded)

    assert attr(html, "data-skullet-state") == "loaded"
    assert text(query(html, "#content")) == "content"
  end

  test "state: :loading is the skeleton, whatever the data says" do
    html =
      render_component(&Skullet.TestComponents.stateful/1,
        id: "inbox",
        state: :loading,
        data: @real
      )

    assert attr(html, "data-skullet-state") == "loading"
  end

  test "Skullet.state/1 reports what the component would do" do
    assert Skullet.state(data: @real) == :loaded
    assert Skullet.state(data: nil) == :loading
    assert Skullet.state(async: AsyncResult.ok(%AsyncResult{}, @real)) == :loaded
    assert Skullet.state(async: AsyncResult.failed(%AsyncResult{}, :boom)) == :failed
    assert Skullet.state(data: nil, state: :empty) == :empty
    assert Skullet.state(data: @real, loading: true) == :loading
  end

  test "classes of your own join the root, and other attributes pass through" do
    html =
      render_component(&Skullet.TestComponents.stateful/1,
        id: "inbox",
        class: "space-y-6",
        role: "region"
      )

    assert attr(html, "class") == "skullet space-y-6"
    assert attr(html, "role") == "region"

    bare = render_component(&Skullet.TestComponents.stateful/1, id: "inbox")
    assert attr(bare, "class") == "skullet"
  end

  test "the loading pane says it is the sample" do
    sample = query(skeleton_html([]), "[data-skullet-content]")
    loaded = query(skeleton_html(data: @real), "[data-skullet-content]")

    assert LazyHTML.attribute(sample, "data-skullet-sample") == ["true"]
    assert LazyHTML.attribute(loaded, "data-skullet-sample") == ["false"]
  end

  test "a nil sample warns once" do
    log =
      ExUnit.CaptureLog.capture_log(fn ->
        render_component(&Skullet.TestComponents.no_sample/1, id: "nil-sample")
        render_component(&Skullet.TestComponents.no_sample/1, id: "nil-sample")
      end)

    assert log =~ "nil-sample"
    assert log =~ "has no sample"
    assert log |> String.split("has no sample") |> length() == 2
  end

  test "empty without an empty_message slot warns once" do
    log =
      ExUnit.CaptureLog.capture_log(fn ->
        render_component(&Skullet.TestComponents.empty_without_message/1,
          id: "no-empty-slot",
          data: @real
        )
      end)

    assert log =~ "no-empty-slot"
    assert log =~ "empty without an :empty_message slot"
  end

  test "the overlay is rendered by the server, so LiveView keeps it" do
    # LiveView prunes children it does not know about: an overlay created only by JS
    # is removed by the first patch, taking the reveal with it.
    overlay = query(skeleton_html([]), "[data-skullet-overlay]")

    assert Enum.count(overlay) == 1
    assert LazyHTML.attribute(overlay, "aria-hidden") == ["true"]
  end

  test "a custom skeleton is measured instead of the sample" do
    loading =
      render_component(&Skullet.TestComponents.with_custom_skeleton/1, id: "chart", data: nil)

    assert text(query(loading, "#custom")) == "custom skeleton"
    assert empty?(loading, "#content")

    loaded =
      render_component(&Skullet.TestComponents.with_custom_skeleton/1,
        id: "chart",
        data: @real
      )

    assert text(query(loaded, "#content")) == "Real Name"
    assert empty?(loaded, "#custom")
  end

  test "a provider sets the scheme and the properties everything inside inherits" do
    html =
      render_component(&Skullet.TestComponents.provider/1,
        id: "panel",
        mode: "dark",
        theme: %{base: "red"},
        animation: "group-shimmer",
        speed: "fast"
      )

    # a rule for the wrapper's id, not a style attribute: a nonce cannot rescue those
    rule = css(html)

    assert rule =~ "#panel {"
    assert rule =~ "color-scheme: dark"
    assert rule =~ "--skullet-base: red"
    assert rule =~ "--skullet-animation: group-shimmer"
    assert rule =~ "--skullet-speed: fast"
    refute html =~ ~s(style=")
  end

  test "a provider with nothing to say renders no style" do
    html =
      render_component(&Skullet.TestComponents.provider/1, %{
        mode: nil,
        theme: %{},
        animation: nil,
        speed: nil
      })

    refute html =~ "<style"
  end

  test "the pre-paint script is inlined, with the nonce it is given" do
    html = render_component(&Skullet.Boot.boot/1, %{nonce: "abc123"})
    script = html |> LazyHTML.from_document() |> LazyHTML.query("script[data-skullet-boot]")
    body = LazyHTML.text(script)

    assert LazyHTML.attribute(script, "nonce") == ["abc123"]
    assert body =~ "__skulletPre.boot()"
    assert body =~ "data-skullet-bar"
  end

  test "a box stands in for what cannot be measured" do
    html = render_component(&Skullet.box/1, width: 240, height: 120, radius: "8px")
    box = LazyHTML.from_document(html) |> LazyHTML.query(".skullet-box")

    assert LazyHTML.attribute(box, "skullet-block") == [""]
    assert [class] = LazyHTML.attribute(box, "class")
    assert [name] = class |> String.split() |> Enum.drop(1)

    rule = css(html)
    assert rule =~ ".#{name} {"
    assert rule =~ "width:240px"
    assert rule =~ "height:120px"
    assert rule =~ "border-radius:8px"
    refute html =~ ~s(style=")

    # the same box is the same class, so LiveView patches nothing between renders
    assert render_component(&Skullet.box/1, width: 240, height: 120, radius: "8px") == html
    refute render_component(&Skullet.box/1, width: 100, height: 120, radius: "8px") == html
  end

  test "remembering the last data draws the next skeleton from it" do
    scope = {:test, System.unique_integer()}

    assert text(query(skeleton_html(data: @real, remember: scope), "#content")) == "Real Name"

    # loading again: no data, so the remembered value stands in for the sample
    assert text(query(skeleton_html(remember: scope), "#content")) == "Real Name"
    assert attr(skeleton_html(remember: scope), "data-skullet-state") == "loading"
  end

  test "without a scope nothing is remembered" do
    scope = {:test, System.unique_integer()}
    skeleton_html(data: @real, remember: scope)

    assert text(query(skeleton_html([]), "#content")) == "Sample Name"
  end

  test "forget clears one scope and leaves the others" do
    kept = {:test, System.unique_integer()}
    forgotten = {:test, System.unique_integer()}

    skeleton_html(data: @real, remember: kept)
    skeleton_html(data: @real, remember: forgotten)

    Skullet.Memory.forget(forgotten)

    assert text(query(skeleton_html(remember: kept), "#content")) == "Real Name"
    assert text(query(skeleton_html(remember: forgotten), "#content")) == "Sample Name"
  end

  test "a remembered value expires" do
    scope = {:test, System.unique_integer()}
    skeleton_html(data: @real, remember: scope)

    assert Skullet.Memory.get(scope, "profile") == @real
    assert Skullet.Memory.get(scope, "profile", ttl_ms: -1) == nil
  end

  test "the status span carries the label outside the content pane" do
    html = skeleton_html(label: "Loading profile")
    status = query(html, ".skullet-status")

    assert text(status) == "Loading profile"
    assert LazyHTML.attribute(status, "role") == ["status"]
    assert LazyHTML.attribute(status, "aria-live") == ["polite"]
    assert empty?(html, "[data-skullet-content] .skullet-status")
  end

  test "a theme becomes a rule for that skeleton" do
    html = skeleton_html(theme: %{base: "rgb(0 0 0 / 0.1)", radius: "8px"})

    assert css(html) =~ "#profile {"
    assert css(html) =~ "--skullet-base: rgb(0 0 0 / 0.1)"
    assert css(html) =~ "--skullet-radius: 8px"
    refute Map.has_key?(attrs(html), "style")
  end

  test "a theme carries the CSP nonce it is given" do
    html = skeleton_html(theme: %{radius: "8px"}, nonce: "abc123")
    style = html |> LazyHTML.from_document() |> LazyHTML.query("style")

    assert LazyHTML.attribute(style, "nonce") == ["abc123"]
  end

  test "string keys are accepted" do
    html = skeleton_html(theme: %{"speed" => "fast"})

    assert css(html) =~ "--skullet-speed: fast"
  end

  test "an empty theme renders no rule" do
    html = skeleton_html(theme: %{})

    refute Map.has_key?(attrs(html), "style")
    refute html =~ "<style"
  end

  test "non-string values are stringified" do
    html = skeleton_html(theme: %{radius: 8})

    assert css(html) =~ "--skullet-radius: 8"
  end

  test "the text knobs are reachable from a theme" do
    html = skeleton_html(theme: %{text_top: "x-height", text_bottom: "baseline"})

    assert css(html) =~ "--skullet-text-top: x-height"
    assert css(html) =~ "--skullet-text-bottom: baseline"
  end

  test "every custom property the README documents is a theme key" do
    keys = %{
      base: "--skullet-base",
      highlight: "--skullet-highlight",
      radius: "--skullet-radius",
      animation: "--skullet-animation",
      speed: "--skullet-speed",
      text_top: "--skullet-text-top",
      text_bottom: "--skullet-text-bottom",
      hold: "--skullet-hold",
      fade: "--skullet-fade",
      resize: "--skullet-resize",
      cascade: "--skullet-cascade",
      delay: "--skullet-delay",
      secondary_delay: "--skullet-secondary-delay",
      enter_filter: "--skullet-enter-filter",
      enter_scale: "--skullet-enter-scale"
    }

    rule = skeleton_html(theme: Map.new(keys, fn {key, _var} -> {key, "1"} end)) |> css()

    for {_key, var} <- keys do
      assert rule =~ "#{var}: 1"
    end
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
