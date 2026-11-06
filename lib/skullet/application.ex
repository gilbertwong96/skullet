defmodule Skullet.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    Supervisor.start_link([Skullet.Memory], strategy: :one_for_one, name: Skullet.Supervisor)
  end
end
