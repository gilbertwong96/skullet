defmodule SkulletDemoWeb.DemoLive do
  use SkulletDemoWeb, :live_view

  alias Phoenix.LiveView.AsyncResult

  # Must match BUILD in assets/js/app.js. A tab running another build reloads itself.
  @build "engine-4 instant-bars single-owner resolve-nodes"

  @sample %{
    name: "Sample Person",
    bio: "A sample bio.",
    avatar: "/images/logo.svg"
  }

  @real %{
    name: "Real Person",
    bio: "The real bio is shorter.",
    avatar: "/images/logo.svg"
  }

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:build, @build)
     |> assign(:sample_user, @sample)
     |> assign(:pinned, true)
     |> load()}
  end

  @impl true
  def handle_event("toggle", _params, socket) do
    {:noreply, update(socket, :pinned, &(!&1))}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash}>
      <div id="page" class="p-8 space-y-6">
        <span id="build" class="hidden">{@build}</span>
        <div class="flex items-center gap-4">
          <button id="toggle" phx-click="toggle" class="btn btn-primary">
            {if @pinned, do: "Show loaded", else: "Show loading"}
          </button>
          <span id="state" class="text-sm opacity-70">
            assign: <b>{state(@user)}</b> · pinned: <b>{@pinned}</b>
          </span>
        </div>

        <Skullet.skeleton
          :let={user}
          id="profile"
          async={@user}
          loading={@pinned}
          sample={@sample_user}
          label="Loading profile"
        >
          <div id="card" class="w-96 border rounded-lg p-4">
            <img src={user.avatar} width="48" height="48" alt="" />
            <h2 id="name" class="text-lg font-semibold">{user.name}</h2>
            <p id="bio">{user.bio}</p>
          </div>
        </Skullet.skeleton>
      </div>
    </Layouts.app>
    """
  end

  defp load(socket) do
    # reset: true makes the refetch show the skeleton again; without it LiveView keeps
    # the previous result while the new one loads (a background refetch), and the
    # component renders the content, not a skeleton.
    assign_async(
      socket,
      :user,
      fn ->
        Process.sleep(600)
        {:ok, %{user: @real}}
      end,
      reset: true
    )
  end

  defp state(%AsyncResult{ok?: true}), do: "loaded"
  defp state(%AsyncResult{failed: reason}) when not is_nil(reason), do: "failed"
  defp state(%AsyncResult{}), do: "loading"
end
