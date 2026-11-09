defmodule Skullet do
  @moduledoc """
  Draws a skeleton of what is about to load.

  While data is missing, your own component is rendered from a *sample* with its text
  transparent, the browser lays it out for real, and rounded bars are drawn over it — one
  per wrapped line, one block per image or control. Nothing is guessed, so nothing moves
  when the content arrives.

  The inner block receives the sample while loading, and the real value once it is there:

      <Skullet.skeleton :let={user} id="profile" async={@user} sample={@sample_user}>
        <Profile.card user={user} />
      </Skullet.skeleton>

      <Skullet.skeleton :let={user} id="profile" data={@user} sample={@sample_user}>
        <Profile.card user={user} />
      </Skullet.skeleton>

  `sample` is required: it is the only data available during a dead render, and writing a
  second skeleton is the thing this component exists to delete. `id` is required twice
  over — `phx-hook` needs one, and it is the key shape memory will use; a generated id
  would change on every render and remount the hook.

  Wiring, in the app's `assets/js/app.js` and `assets/css/app.css`:

      import { SkulletHook } from "../../deps/skullet/priv/static/skullet.js"
      new LiveSocket("/live", Socket, { hooks: { Skullet: SkulletHook } })

      @import "../../deps/skullet/priv/static/skullet.css";

  The CSS is not optional: it keeps the sample invisible before the engine runs, and shows
  it instead of a blank box if the engine never does. For bars on the very first paint —
  before the bundle has loaded — render `Skullet.Boot.boot/1` once in the layout; under a
  Content Security Policy pass it that script's `nonce`.

  A background refetch keeps the content on screen: `assign_async/3` leaves the previous
  result in place while the new one loads, so pass `reset: true` (or assign a fresh
  `AsyncResult.loading()`) to have the skeleton return.

  Theme through custom properties (`--skullet-base`, `--skullet-highlight`,
  `--skullet-radius`, `--skullet-animation`, `--skullet-speed`, `--skullet-text-top`,
  `--skullet-text-bottom`, `--skullet-hold`, `--skullet-fade`, `--skullet-resize`), set per
  skeleton with the `theme` attribute or globally in CSS.
  `reveal` is `"smart"` (decides from timing, input and size), `"together"`, `"sequence"`,
  `"sweep"`, `"instant"`, or a name a page registered with `registerReveal/2` in JS.

  Where measuring reads the markup wrong, say so in it: `skullet-block` draws an element as
  one block and `skullet-ignore` leaves it out of the skeleton entirely.

  A result that arrived but holds nothing is its own pane: `empty` renders the
  `:empty_message` slot in place of the content, and the reveal measures that message and
  eases to its height. It is content, not a loading state — the skeleton still shows while
  the data is missing, and the `:error` slot still wins when the assign failed.

  Pass `remember` — usually the current user's id — to have the next skeleton drawn from
  the data this one last showed instead of from the sample. It is held in ETS, expires,
  and is per node; call `Skullet.Memory.forget/1` on sign-out.
  """

  use Phoenix.Component

  alias Phoenix.LiveView.AsyncResult

  @theme_vars %{
    "base" => "--skullet-base",
    "highlight" => "--skullet-highlight",
    "radius" => "--skullet-radius",
    "animation" => "--skullet-animation",
    "speed" => "--skullet-speed",
    "text_top" => "--skullet-text-top",
    "text_bottom" => "--skullet-text-bottom"
  }

  attr(:id, :string, required: true, doc: "DOM id for the hook; also the future shape key")
  attr(:async, :any, default: nil, doc: "a `%Phoenix.LiveView.AsyncResult{}`")

  attr(:data, :any,
    default: nil,
    doc: "plain data; `nil` means loading, anything else is loaded"
  )

  attr(:sample, :any, required: true, doc: "stands in for the data to draw the skeleton")
  attr(:loading, :boolean, default: false, doc: "forces the skeleton, even over data")

  attr(:empty, :boolean,
    default: false,
    doc: "shows the `empty_message` slot in place of the content"
  )

  attr(:reveal, :string,
    default: "smart",
    doc:
      "`smart`, `together`, `sequence`, `sweep`, `instant`, or a name registered with `registerReveal/2` in JS"
  )

  attr(:theme, :map, default: %{}, doc: "custom properties to override on this skeleton")
  attr(:label, :string, default: "Loading", doc: "read to screen readers while loading")

  attr(:remember, :any,
    default: nil,
    doc: "opts in to remembering the data this skeleton last showed, under this scope"
  )

  slot(:error,
    doc: """
    rendered in place of the content when the async assign failed. It is your markup —
    the library styles none of it — so an alert, an empty state, or your own card frame
    all work here.
    """
  )

  slot(:skeleton,
    doc: """
    your own markup to measure instead of the sample — for a logo, a chart, a canvas.
    It is rendered while loading in place of the inner block.
    """
  )

  slot(:empty_message,
    doc: """
    rendered in place of the content while `empty` is true — the content itself when left
    out. It is your markup: the library styles none of it, so a dashed box, an illustration
    or a card frame all work here.
    """
  )

  slot(:inner_block, required: true, doc: "receives the sample, then the real value")

  @spec skeleton(map()) :: Phoenix.LiveView.Rendered.t()
  def skeleton(assigns) do
    {state, value} = state_and_value(assigns)
    if state == :loaded, do: remember(assigns, value)
    style = theme_style(assigns.theme)

    assigns =
      assign(assigns,
        state: state,
        value: value,
        style_attrs: if(style, do: [{"style", style}], else: [])
      )

    ~H"""
    <div
      class="skullet"
      id={@id}
      phx-hook="Skullet"
      data-skullet-state={@state}
      data-skullet-reveal={@reveal}
      aria-busy={to_string(@state == :loading)}
      {@style_attrs}
    >
      <span
        :if={@state == :loading}
        class="skullet-status"
        role="status"
        aria-live="polite"
      >{@label}</span>
      <%!-- Rendered here, not created by the engine: LiveView prunes children it does
      not know about, and would take the bars with them on the first patch. --%>
      <div data-skullet-overlay aria-hidden="true"></div>
      <%= cond do %>
        <% @state == :failed -> %>
          {render_slot(@error)}
        <% @state == :loading and @skeleton != [] -> %>
          <div class="skullet-content" data-skullet-content>
            {render_slot(@skeleton)}
          </div>
        <% @state == :loaded and @empty and @empty_message != [] -> %>
          <div class="skullet-content" data-skullet-content>
            {render_slot(@empty_message)}
          </div>
        <% true -> %>
          <div class="skullet-content" data-skullet-content>
            {render_slot(@inner_block, @value)}
          </div>
      <% end %>
    </div>
    """
  end

  attr(:id, :string, default: nil, doc: "DOM id for the wrapper")
  attr(:mode, :string, default: nil, values: [nil, "light", "dark", "system"])

  attr(:animation, :string,
    default: nil,
    values: [nil, "shimmer", "group-shimmer", "pulse", "none"]
  )

  attr(:speed, :string, default: nil, values: [nil, "slow", "fast"])
  attr(:theme, :map, default: %{}, doc: "custom properties for everything inside")
  attr(:rest, :global)
  slot(:inner_block, required: true)

  @doc """
  Sets the skeleton's look for everything inside — one place instead of every skeleton.

      <Skullet.provider mode="dark" animation="group-shimmer" speed="fast">
        …
      </Skullet.provider>

  `mode` sets `color-scheme` on the wrapper, which is what the bars' colours follow, so
  `"dark"` gives dark-page bars even where the page itself is light. `theme`, `animation`
  and `speed` become the custom properties the skeletons inside inherit.
  """
  def provider(assigns) do
    style = provider_style(assigns)
    assigns = assign(assigns, style_attrs: if(style, do: [{"style", style}], else: []))

    ~H"""
    <div id={@id} {@style_attrs} {@rest}>
      {render_slot(@inner_block)}
    </div>
    """
  end

  defp provider_style(assigns) do
    overrides =
      assigns.theme
      |> maybe_put("animation", assigns.animation)
      |> maybe_put("speed", assigns.speed)

    [
      if(assigns.mode in ["light", "dark"], do: "color-scheme: #{assigns.mode}"),
      theme_style(overrides)
    ]
    |> Enum.reject(&is_nil/1)
    |> Enum.join("; ")
    |> case do
      "" -> nil
      style -> style
    end
  end

  defp maybe_put(theme, _key, nil), do: theme
  defp maybe_put(theme, key, value), do: Map.put(theme, key, value)

  attr(:width, :any, default: "60%", doc: "any CSS length, or a number of pixels")
  attr(:height, :any, default: "1em", doc: "any CSS length, or a number of pixels")
  attr(:radius, :any, default: nil, doc: "defaults to `--skullet-radius`")

  @doc """
  A placeholder block for what cannot be measured — a logo, a chart, a canvas.

  Put it inside the skeleton's sample in place of the thing, sized like the thing:

      <Skullet.skeleton :let={report} id="report" async={@report} sample={@sample}>
        <Skullet.box width={240} height={120} />
        <p>{report.title}</p>
      </Skullet.skeleton>
  """
  @spec box(map()) :: Phoenix.LiveView.Rendered.t()
  def box(assigns) do
    assigns = assign(assigns, style: box_style(assigns))

    ~H"""
    <span class="skullet-box" skullet-block style={@style}></span>
    """
  end

  defp box_style(assigns) do
    [
      "display:inline-block",
      "width:#{css_length(assigns.width)}",
      "height:#{css_length(assigns.height)}",
      if(assigns.radius, do: "border-radius:#{css_length(assigns.radius)}")
    ]
    |> Enum.reject(&is_nil/1)
    |> Enum.join(";")
  end

  defp css_length(value) when is_number(value), do: "#{value}px"
  defp css_length(value), do: to_string(value)

  defp state_and_value(%{loading: true} = assigns), do: {:loading, sample(assigns)}

  defp state_and_value(%{async: %AsyncResult{ok?: true, result: result}}),
    do: {:loaded, result}

  defp state_and_value(%{async: %AsyncResult{failed: reason}} = assigns)
       when not is_nil(reason),
       do: {:failed, sample(assigns)}

  defp state_and_value(%{async: %AsyncResult{}} = assigns), do: {:loading, sample(assigns)}

  defp state_and_value(%{data: data}) when not is_nil(data), do: {:loaded, data}

  defp state_and_value(assigns), do: {:loading, sample(assigns)}

  defp sample(assigns) do
    case Map.get(assigns, :remember) do
      nil -> assigns.sample
      scope -> Skullet.Memory.get(scope, assigns.id) || assigns.sample
    end
  end

  defp remember(assigns, value) do
    case Map.get(assigns, :remember) do
      nil -> :ok
      scope -> Skullet.Memory.put(scope, assigns.id, value)
    end
  end

  defp theme_style(theme) when map_size(theme) == 0, do: nil

  defp theme_style(theme) do
    Enum.map_join(theme, "; ", fn {key, value} -> "#{theme_var!(key)}: #{value}" end)
  end

  defp theme_var!(key) do
    case Map.fetch(@theme_vars, theme_key(key)) do
      {:ok, var} ->
        var

      :error ->
        raise ArgumentError,
              "unknown theme key #{inspect(key)}, allowed keys: #{Enum.join(Map.keys(@theme_vars), ", ")}"
    end
  end

  defp theme_key(key) when is_atom(key) or is_binary(key), do: to_string(key)
  defp theme_key(_key), do: ""
end
