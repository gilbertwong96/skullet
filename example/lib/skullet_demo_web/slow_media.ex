defmodule SkulletDemoWeb.SlowMedia do
  @moduledoc """
  Serves a static file after a delay, so the demo can show an image arriving late:
  `/slow/1500/images/a.svg`. Never anything but this app's own `priv/static`.
  """

  import Plug.Conn

  @max_delay 10_000

  def init(opts), do: opts

  def call(%Plug.Conn{path_info: ["slow", ms | rest]} = conn, _opts) do
    with {delay, ""} <- Integer.parse(ms),
         true <- delay in 0..@max_delay,
         {:ok, path} <- static_path(rest) do
      Process.sleep(delay)

      conn
      |> put_resp_content_type(content_type(rest))
      |> send_file(200, path)
      |> halt()
    else
      _ -> conn |> send_resp(400, "bad request") |> halt()
    end
  end

  def call(conn, _opts), do: conn

  defp static_path(rest) do
    root = Path.join(to_string(:code.priv_dir(:skullet_demo)), "static")
    path = Path.expand(Path.join([root | rest]))

    if String.starts_with?(path, root <> "/") and File.regular?(path),
      do: {:ok, path},
      else: :error
  end

  defp content_type(path) do
    file = List.last(path)

    case Path.extname(file) do
      ".svg" -> "image/svg+xml"
      ".png" -> "image/png"
      ".jpg" -> "image/jpeg"
      ".webp" -> "image/webp"
      _ -> "application/octet-stream"
    end
  end
end
