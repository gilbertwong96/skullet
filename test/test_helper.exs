Application.put_env(:skullet, Skullet.Test.Endpoint,
  url: [host: "localhost"],
  secret_key_base: String.duplicate("skullet", 8),
  live_view: [signing_salt: "skullet-test-salt"],
  pubsub_server: Skullet.Test.PubSub,
  render_errors: [formats: [html: Skullet.Test.ErrorHTML], layout: false]
)

{:ok, _} =
  Supervisor.start_link(
    [{Phoenix.PubSub, name: Skullet.Test.PubSub}, Skullet.Test.Endpoint],
    strategy: :one_for_one
  )

ExUnit.start()
