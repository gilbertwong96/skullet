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
  it instead of a blank box if the engine never does.

  Theme through custom properties (`--skullet-base`, `--skullet-highlight`,
  `--skullet-radius`, `--skullet-animation`, `--skullet-speed`), set per skeleton with the
  `theme` attribute or globally in CSS. `reveal` is `"smart"` (waits 150 ms, then
  crossfades) or `"instant"`.
  """

  use Phoenix.Component

  alias Phoenix.LiveView.AsyncResult

  @theme_vars %{
    "base" => "--skullet-base",
    "highlight" => "--skullet-highlight",
    "radius" => "--skullet-radius",
    "animation" => "--skullet-animation",
    "speed" => "--skullet-speed"
  }

  attr(:id, :string, required: true, doc: "DOM id for the hook; also the future shape key")
  attr(:async, :any, default: nil, doc: "a `%Phoenix.LiveView.AsyncResult{}`")

  attr(:data, :any,
    default: nil,
    doc: "plain data; `nil` means loading, anything else is loaded"
  )

  attr(:sample, :any, required: true, doc: "stands in for the data to draw the skeleton")
  attr(:loading, :boolean, default: false, doc: "forces the skeleton, even over data")
  attr(:reveal, :string, default: "smart", values: ~w(smart instant))
  attr(:theme, :map, default: %{}, doc: "custom properties to override on this skeleton")
  attr(:label, :string, default: "Loading", doc: "read to screen readers while loading")
  slot(:error, doc: "rendered in place of the content when the async assign failed")
  slot(:inner_block, required: true, doc: "receives the sample, then the real value")

  def skeleton(assigns) do
    {state, value} = state_and_value(assigns)
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
      <span class="skullet-status">{@label}</span>
      <%= if @state == :failed do %>
        {render_slot(@error)}
      <% else %>
        <div class="skullet-content" data-skullet-content>
          {render_slot(@inner_block, @value)}
        </div>
      <% end %>
    </div>
    """
  end

  defp state_and_value(%{loading: true, sample: sample}), do: {:loading, sample}

  defp state_and_value(%{async: %AsyncResult{ok?: true, result: result}}),
    do: {:loaded, result}

  defp state_and_value(%{async: %AsyncResult{failed: reason}, sample: sample})
       when not is_nil(reason),
       do: {:failed, sample}

  defp state_and_value(%{async: %AsyncResult{}, sample: sample}), do: {:loading, sample}

  defp state_and_value(%{data: data}) when not is_nil(data), do: {:loaded, data}

  defp state_and_value(%{sample: sample}), do: {:loading, sample}

  defp theme_style(theme) when map_size(theme) == 0, do: nil

  defp theme_style(theme) do
    theme
    |> Enum.map(fn {key, value} -> "#{theme_var!(key)}: #{value}" end)
    |> Enum.join("; ")
  end

  defp theme_var!(key) do
    name = to_string(key)

    case Map.fetch(@theme_vars, name) do
      {:ok, var} ->
        var

      :error ->
        raise ArgumentError,
              "unknown theme key #{inspect(key)}, allowed keys: #{Enum.join(Map.keys(@theme_vars), ", ")}"
    end
  end
end
