defmodule Skullet.Boot do
  @moduledoc """
  Draws the skeletons already in the server's HTML **before the browser's first paint**.

  Without it, the sample is laid out and hidden from the first paint, but the bars only
  appear once the engine's bundle has loaded and the LiveView has mounted — a blank box
  for those few hundred milliseconds. The script measures and draws synchronously, using
  the same geometry, metrics and shimmer code the engine uses.

  Render it once per page, after the markup it measures:

      <Skullet.Boot.boot nonce={@nonce} />

  It is about 9KB of JavaScript inlined into the page, so it is your call to place it. Being
  inline, a Content Security Policy needs its `nonce` — [usage](usage.html#content-security-policy)
  has a plug that makes one and carries it into the LiveView.
  """

  use Phoenix.Component

  @script_path Path.join([__DIR__, "../../priv/static/skullet.pre.js"])
  @external_resource @script_path
  @script File.read!(@script_path)

  attr(:nonce, :string, default: nil, doc: "the CSP nonce for the inline script")

  attr(:src, :string,
    default: nil,
    doc: """
    fetch the pre-paint script instead of inlining it. Nothing inline is left: loaded with a
    `src`, the file starts itself, so a policy needs only `script-src 'self'` — no nonce.
    Serve it straight out of the dependency, no copy step:

        plug Plug.Static, at: "/skullet", from: {:skullet, "priv/static"}, only: ["skullet.pre.js"]
        <Skullet.Boot.boot src={~p"/skullet/skullet.pre.js"} nonce={@csp_nonce} />

    Inlining costs ~9KB in every response but needs no request before the first paint; the
    fetched form is cached and needs no nonce for the file, and pays one round trip on the
    first view. [usage](usage.html#before-the-first-paint) has the trade.
    """
  )

  @spec boot(map()) :: Phoenix.LiveView.Rendered.t()
  def boot(assigns) do
    # The script may not have loaded (a wrong src, a proxy); nothing to call is no error.
    call = "if (typeof __skulletPre !== \"undefined\") __skulletPre.boot()"

    assigns =
      assign(assigns,
        script: Phoenix.HTML.raw(@script <> ";" <> call),
        call: Phoenix.HTML.raw(call)
      )

    ~H"""
    <script :if={@src} src={@src} nonce={@nonce} data-skullet-boot></script>
    <script :if={!@src} nonce={@nonce} data-skullet-boot><%= @script %></script>
    """
  end
end
