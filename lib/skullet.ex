defmodule Skullet do
  @moduledoc """
  Draws a skeleton of what is about to load.

  While data is missing, your own component is rendered from a *sample* with its text
  transparent, the browser lays it out for real, and rounded bars are drawn over it — one
  per wrapped line, one block per image or control. Nothing is guessed, so nothing moves
  when the content arrives.

  The most common shape, one `assign_async/3` and a sample:

      <Skullet.skeleton :let={user} id="profile" async={@user} sample={@sample_user}>
        <Profile.card user={user} />
      </Skullet.skeleton>

  Wiring, in the app's `assets/js/app.js` and `assets/css/app.css`:

      import { SkulletHook } from "../../deps/skullet/priv/static/skullet.js"
      new LiveSocket("/live", Socket, { hooks: { Skullet: SkulletHook } })

      @import "../../deps/skullet/priv/static/skullet.css";

  The CSS is not optional: it keeps the sample invisible before the engine runs.

  Under a Content Security Policy the boot script and the theme's `<style>` block need the
  page's nonce: `nonce={@csp_nonce}` on `skeleton/1`, `provider/1` and `box/1`; see the
  [CSP section](usage.html#content-security-policy).

  The detail lives in the guides:

    * [Usage](usage.html) — async assigns and plain data, attributes and slots, empty and
      error states, memory, images, plain pages without LiveView.
    * [Theming](theming.html) — every custom property, the `theme` map, the provider.
    * [Reveals](reveals.html) — how `smart` decides, the built-in modes, specs of your own.
    * [Internals](internals.html) — how measuring works, first paint, the engine's build.

  `Skullet.Boot.boot/1` covers the gap before the bundle loads, and `Skullet.Memory`
  backs `remember`.
  """

  use Phoenix.Component

  require Logger

  alias Phoenix.LiveView.AsyncResult

  @theme_vars %{
    "base" => "--skullet-base",
    "highlight" => "--skullet-highlight",
    "radius" => "--skullet-radius",
    "animation" => "--skullet-animation",
    "speed" => "--skullet-speed",
    "text_top" => "--skullet-text-top",
    "text_bottom" => "--skullet-text-bottom",
    "hold" => "--skullet-hold",
    "fade" => "--skullet-fade",
    "resize" => "--skullet-resize",
    "cascade" => "--skullet-cascade",
    "delay" => "--skullet-delay",
    "secondary_delay" => "--skullet-secondary-delay",
    "enter_filter" => "--skullet-enter-filter",
    "enter_scale" => "--skullet-enter-scale"
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

  attr(:state, :atom,
    default: nil,
    values: [nil, :loading, :loaded, :failed, :empty],
    doc: """
    says the state outright instead of inferring it from `async`, `data` and `loading` —
    for the two cases those cannot express: `:empty` (loaded, and there is nothing to show)
    and `:failed` with plain data.
    """
  )

  attr(:reveal, :string,
    default: "smart",
    doc:
      "`smart`, `together`, `sequence`, `sweep`, `instant`, or a name registered with `registerReveal/2` in JS"
  )

  attr(:theme, :map, default: %{}, doc: "custom properties to override on this skeleton")

  attr(:nonce, :string,
    default: nil,
    doc: "the CSP nonce for the `<style>` block this emits when `theme` is set"
  )

  attr(:label, :string, default: "Loading", doc: "read to screen readers while loading")

  attr(:class, :any,
    default: nil,
    doc: "extra classes on the skeleton root, for a layout rhythm of your own"
  )

  attr(:rest, :global)

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
    warn_misuse(assigns)

    assigns =
      assign(assigns,
        state: state,
        value: value,
        empty: Map.get(assigns, :empty, false) or Map.get(assigns, :state) == :empty,
        style_tag: style_tag(theme_css(assigns.id, assigns.theme), assigns.nonce)
      )

    ~H"""
    <div
      class={["skullet" | List.wrap(@class)]}
      id={@id}
      phx-hook="Skullet"
      data-skullet-state={@state}
      data-skullet-reveal={@reveal}
      aria-busy={to_string(@state == :loading)}
      {@rest}
    >
      {@style_tag}
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
          <div
            class="skullet-content"
            data-skullet-content
            data-skullet-sample={to_string(@state == :loading)}
          >
            {render_slot(@inner_block, @value)}
          </div>
      <% end %>
    </div>
    """
  end

  @doc """
  Says what a skeleton would render, without rendering it: `:loading`, `:loaded`, `:failed`
  or `:empty`.

  The same rules `skeleton/1` uses, so an app can map an assign to a state once instead of
  re-deriving "nil means loading" in every helper:

  state = Skullet.state(async: @user)
  """
  @spec state(Keyword.t() | map()) :: :loading | :loaded | :failed | :empty
  def state(assigns) do
    assigns =
      assigns
      |> Map.new()
      |> Map.put_new(:state, nil)
      |> Map.put_new(:loading, false)
      |> Map.put_new(:async, nil)
      |> Map.put_new(:data, nil)
      |> Map.put_new(:sample, nil)
      |> Map.put_new(:id, nil)
      |> Map.put_new(:remember, nil)

    case {assigns.state, state_and_value(assigns)} do
      {:empty, _} -> :empty
      {nil, {state, _value}} -> state
      {state, _} -> state
    end
  end

  attr(:id, :string, default: nil, doc: "DOM id for the wrapper")
  attr(:nonce, :string, default: nil, doc: "the CSP nonce for the `<style>` block this emits")
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
    id = assigns.id || (style && derived_id("skullet-provider", style))

    assigns =
      assign(assigns,
        id: id,
        style_tag: style && style_tag("##{id} { #{style} }", assigns.nonce)
      )

    ~H"""
    <div id={@id} {@rest}>
      {@style_tag}
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
  attr(:nonce, :string, default: nil, doc: "the CSP nonce for the `<style>` block this emits")

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
    style = box_style(assigns)
    name = derived_id("skullet-box", style)

    assigns =
      assign(assigns,
        class: "skullet-box #{name}",
        style_tag: style_tag(".#{name} { #{style} }", assigns.nonce)
      )

    ~H"""
    <span class={@class} skullet-block></span>
    {@style_tag}
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

  # A stable name for a rule, derived from the declarations it carries: the same box gets
  # the same class on every render, so LiveView patches nothing.
  defp derived_id(prefix, declarations) do
    digest =
      :crypto.hash(:sha256, declarations)
      |> Base.encode16(case: :lower)
      |> binary_part(0, 8)

    "#{prefix}-#{digest}"
  end

  defp css_length(value) when is_number(value), do: "#{value}px"
  defp css_length(value), do: to_string(value)

  defp state_and_value(%{state: :loading} = assigns), do: {:loading, sample(assigns)}
  defp state_and_value(%{state: :failed} = assigns), do: {:failed, sample(assigns)}
  defp state_and_value(%{state: :empty} = assigns), do: {:loaded, sample(assigns)}
  defp state_and_value(%{state: :loaded} = assigns), do: {:loaded, assigns.data}

  defp state_and_value(%{loading: true} = assigns), do: {:loading, sample(assigns)}

  defp state_and_value(%{async: %AsyncResult{ok?: true, result: result}}),
    do: {:loaded, result}

  defp state_and_value(%{async: %AsyncResult{failed: reason}} = assigns)
       when not is_nil(reason),
       do: {:failed, sample(assigns)}

  defp state_and_value(%{async: %AsyncResult{}} = assigns), do: {:loading, sample(assigns)}

  defp state_and_value(%{data: data}) when not is_nil(data), do: {:loaded, data}

  defp state_and_value(assigns), do: {:loading, sample(assigns)}

  # Both of these render something, so nothing fails — it just does not do what was meant.
  # Said once per id, which is enough to catch it without filling a log.
  defp warn_misuse(assigns) do
    if Map.get(assigns, :sample) == nil do
      warn_once({:sample, assigns.id}, """
      Skullet.skeleton #{inspect(assigns.id)} has no sample: the skeleton will be empty. \
      Pass the data it is standing in for, or use the :skeleton slot for markup of your own.\
      """)
    end

    if Map.get(assigns, :empty, false) and Map.get(assigns, :empty_message, []) == [] do
      warn_once({:empty, assigns.id}, """
      Skullet.skeleton #{inspect(assigns.id)} sets empty without an :empty_message slot, \
      which renders the content as usual. Add the slot, or drop empty.\
      """)
    end
  end

  defp warn_once(key, message) do
    unless :persistent_term.get({__MODULE__, key}, false) do
      :persistent_term.put({__MODULE__, key}, true)
      Logger.warning(message)
    end
  end

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

  # HEEx reads `<style>` as raw text, so the element is built here: interpolating inside it
  # would come out literally, and the CSS has to carry a CSP nonce.
  defp style_tag(nil, _nonce), do: nil

  defp style_tag(css, nonce) do
    if String.contains?(css, ["<", ">"]) do
      raise ArgumentError, "theme values must not contain < or >, got: #{inspect(css)}"
    end

    attributes =
      if nonce,
        do: Phoenix.HTML.safe_to_string(Phoenix.HTML.attributes_escape(nonce: nonce)),
        else: ""

    Phoenix.HTML.raw(["<style", attributes, ">", css, "</style>"])
  end

  defp theme_css(_id, theme) when map_size(theme) == 0, do: nil

  defp theme_css(id, theme), do: "##{id} { #{theme_style(theme)} }"

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
