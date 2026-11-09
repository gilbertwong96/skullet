defmodule SkulletDemoWeb.CSP do
  @moduledoc """
  A nonce per request, and the policy that carries it.

  The demo runs under this in production, which is what `<Skullet.Boot.boot nonce={…} />`
  needs: the boot script is inlined, so a policy without its nonce blocks it. Dev leaves
  the plug out (see `config/config.exs`) because Phoenix's live-reloader injects a script of
  its own and has no way to sign it.
  """

  @behaviour Plug

  import Plug.Conn

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    if enabled?() do
      nonce = Base.url_encode64(:crypto.strong_rand_bytes(16), padding: false)

      conn
      |> assign(:csp_nonce, nonce)
      |> put_session(:csp_nonce, nonce)
      |> put_resp_header("content-security-policy", policy(nonce))
    else
      conn
    end
  end

  defp enabled? do
    Application.get_env(:skullet_demo, :csp, false) or
      System.get_env("SKULLET_DEMO_CSP") == "true"
  end

  defp policy(nonce) do
    "default-src 'self'; " <>
      "script-src 'self' 'nonce-#{nonce}'; " <>
      "style-src 'self' 'unsafe-inline'; " <>
      "img-src 'self' data:; " <>
      "connect-src 'self'; " <>
      "base-uri 'none'; form-action 'self'"
  end
end
