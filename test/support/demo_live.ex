defmodule Skullet.Test.DemoLive do
  @moduledoc false

  use Phoenix.LiveView

  @sample %{name: "Sample Name", bio: "A sample bio."}
  @real %{name: "Real Name", bio: "The real bio."}

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:sample_user, @sample)
     |> assign_async(:user, fn ->
       {:ok, %{user: @real}}
     end)}
  end

  @impl true
  def handle_event("reload", _params, socket) do
    {:noreply,
     socket
     |> assign(:user, Phoenix.LiveView.AsyncResult.loading())
     |> assign_async(:user, fn -> {:ok, %{user: @real}} end, reset: true)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <Skullet.skeleton :let={user} id="profile" async={@user} sample={@sample_user}>
      <p id="content">{user.name}</p>
    </Skullet.skeleton>
    """
  end
end
