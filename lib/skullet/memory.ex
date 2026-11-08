defmodule Skullet.Memory do
  @moduledoc """
  Remembers the data a skeleton last showed, so its next skeleton is drawn from that
  instead of from a hand-written sample.

  The upstream JavaScript library remembers *shapes* in `localStorage`; a Phoenix app can
  do better and remember the *data*, then render it: the skeleton is measured from the
  real component and is exact at any viewport size, on any device.

  Opt in per skeleton:

      <Skullet.skeleton :let={user} id="profile" async={@user} remember={@current_user.id}>
        …
      </Skullet.skeleton>

  `remember` is a scope — usually the user's id — and the skeleton's `id` completes the
  key. While loading, a remembered value is used as the sample; once loaded, the real
  value replaces it.

  The store is this node's memory only: it is not shared between nodes, it expires after
  `config :skullet, :memory_ttl_ms` (30 minutes by default), and it must be cleared when
  somebody signs out — `forget/1` with their scope, from wherever that happens.
  """

  use GenServer

  @table __MODULE__
  @default_ttl :timer.minutes(30)

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(_opts) do
    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  @impl true
  @spec init(:ok) :: {:ok, nil}
  def init(:ok) do
    :ets.new(@table, [:named_table, :public, :set, read_concurrency: true])
    {:ok, nil}
  end

  @doc "Remembers `value` for `scope` and `id`."
  @spec put(term(), term(), term()) :: :ok
  def put(scope, id, value) do
    ensure_table()
    :ets.insert(@table, {{scope, id}, value, now()})
    :ok
  end

  @doc """
  The value remembered for `scope` and `id`, or `nil`.

  ## Options

    * `:ttl_ms` — how old a value may be; defaults to `config :skullet, :memory_ttl_ms`
  """
  @spec get(term(), term(), keyword()) :: term() | nil
  def get(scope, id, opts \\ []) do
    ttl = Keyword.get(opts, :ttl_ms, ttl_ms())

    with true <- :ets.whereis(@table) != :undefined,
         [{_, value, at}] <- :ets.lookup(@table, {scope, id}) do
      if now() - at <= ttl, do: value
    else
      _ -> nil
    end
  end

  @doc "Forgets everything remembered under `scope`, as on sign-out."
  @spec forget(term()) :: :ok
  def forget(scope) do
    with true <- :ets.whereis(@table) != :undefined do
      :ets.match_delete(@table, {{scope, :_}, :_, :_})
    end

    :ok
  end

  @doc "Forgets everything, for every scope."
  @spec clear() :: :ok
  def clear do
    with true <- :ets.whereis(@table) != :undefined do
      :ets.delete_all_objects(@table)
    end

    :ok
  end

  defp ttl_ms, do: Application.get_env(:skullet, :memory_ttl_ms, @default_ttl)

  defp now, do: System.monotonic_time(:millisecond)

  defp ensure_table do
    if :ets.whereis(@table) == :undefined do
      raise "Skullet.Memory is not running: add :skullet to your application's extra_applications"
    end
  end
end
