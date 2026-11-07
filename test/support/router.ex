defmodule Skullet.Test.Router do
  @moduledoc false

  use Phoenix.Router
  import Phoenix.LiveView.Router

  scope "/", Skullet.Test do
    live("/demo", DemoLive)
  end
end
