defmodule Skullet.MemoryStoreTest do
  use ExUnit.Case, async: false

  test "clear/0 forgets every scope" do
    Skullet.Memory.put(:one, "profile", %{name: "one"})
    Skullet.Memory.put(:two, "profile", %{name: "two"})

    assert Skullet.Memory.clear() == :ok
    assert Skullet.Memory.get(:one, "profile") == nil
    assert Skullet.Memory.get(:two, "profile") == nil
  end

  test "reading an expired entry forgets it" do
    Skullet.Memory.put(:expiring, "inbox", %{name: "x"})

    assert Skullet.Memory.get(:expiring, "inbox", ttl_ms: -1) == nil
    assert :ets.lookup(Skullet.Memory, {:expiring, "inbox"}) == []
  end

  test "the sweep drops entries nobody reads again" do
    Skullet.Memory.put(:stale, "inbox", %{name: "x"})
    old = System.monotonic_time(:millisecond) - :timer.hours(2)
    :ets.insert(Skullet.Memory, {{:stale, "inbox"}, %{name: "x"}, old})

    send(Skullet.Memory, :sweep)
    _ = :sys.get_state(Skullet.Memory)

    assert :ets.lookup(Skullet.Memory, {:stale, "inbox"}) == []
  end

  test "a missing table says how to fix it" do
    on_exit(fn ->
      Supervisor.terminate_child(Skullet.Supervisor, Skullet.Memory)
      Supervisor.restart_child(Skullet.Supervisor, Skullet.Memory)
    end)

    :ets.delete(:ets.whereis(Skullet.Memory))

    assert_raise RuntimeError, ~r/extra_applications/, fn ->
      Skullet.Memory.put(:scope, "id", %{})
    end
  end
end
