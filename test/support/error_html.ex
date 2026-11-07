defmodule Skullet.Test.ErrorHTML do
  @moduledoc false

  def render(template, assigns) do
    "error #{template}: #{inspect(Map.get(assigns, :reason))}"
  end
end
