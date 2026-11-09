defmodule Skullet.Boot do
  @moduledoc """
  Draws the skeletons already in the server's HTML **before the browser's first paint**.

  Without it, the sample is laid out and hidden from the first paint, but the bars only
  appear once the engine's bundle has loaded and the LiveView has mounted — a blank box
  for those few hundred milliseconds. The script measures and draws synchronously, using
  the same geometry, metrics and shimmer code the engine uses.

  Render it once per page, after the markup it measures:

      <Skullet.Boot.boot nonce={@nonce} />

  It is about 9KB of JavaScript inlined into the page, so it is your call to place it. Under
  a Content Security Policy, pass the script's `nonce`; [usage](usage.html) has a plug that
  makes one.
  """

  use Phoenix.Component

  @script_path Path.join([__DIR__, "../../priv/static/skullet.pre.js"])
  @external_resource @script_path
  @script File.read!(@script_path)

  attr(:nonce, :string, default: nil, doc: "the CSP nonce for the inline script")

  @spec boot(map()) :: Phoenix.LiveView.Rendered.t()
  def boot(assigns) do
    assigns = assign(assigns, script: Phoenix.HTML.raw(@script <> ";__skulletPre.boot()"))

    ~H"""
    <script nonce={@nonce} data-skullet-boot><%= @script %></script>
    """
  end
end
