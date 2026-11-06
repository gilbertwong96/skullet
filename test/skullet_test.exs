defmodule SkulletTest do
  use ExUnit.Case
  doctest Skullet

  test "greets the world" do
    assert Skullet.hello() == :world
  end
end
