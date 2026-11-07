defmodule Skullet.Test.Endpoint do
  @moduledoc false

  use Phoenix.Endpoint, otp_app: :skullet

  socket("/live", Phoenix.LiveView.Socket)

  plug(Skullet.Test.Router)
end
