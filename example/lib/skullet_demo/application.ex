defmodule SkulletDemo.Application do
  # See https://elixir.hexdocs.pm/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      SkulletDemoWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:skullet_demo, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: SkulletDemo.PubSub},
      # Start a worker by calling: SkulletDemo.Worker.start_link(arg)
      # {SkulletDemo.Worker, arg},
      # Start to serve requests, typically the last entry
      SkulletDemoWeb.Endpoint
    ]

    # See https://elixir.hexdocs.pm/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: SkulletDemo.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    SkulletDemoWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
