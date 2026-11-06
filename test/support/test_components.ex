defmodule Skullet.TestComponents do
  use Phoenix.Component
  import Skullet

  attr(:id, :string, required: true)
  attr(:async, :any, default: nil)
  attr(:data, :any, default: nil)
  attr(:loading, :boolean, default: false)
  attr(:theme, :map, default: %{})
  attr(:label, :string, default: "Loading")
  attr(:reveal, :string, default: "smart")
  slot(:error)

  def profile(assigns) do
    ~H"""
    <.skeleton
      :let={user}
      id={@id}
      sample={Skullet.Sample.sample_user()}
      async={@async}
      data={@data}
      loading={@loading}
      theme={@theme}
      label={@label}
      reveal={@reveal}
    >
      <div id="content">{user.name}</div>
    </.skeleton>
    """
  end

  def failed(assigns) do
    ~H"""
    <.skeleton id={@id} sample={Skullet.Sample.sample_user()} async={@async}>
      <div id="content">never</div>
      <:error><p id="error">Could not load.</p></:error>
    </.skeleton>
    """
  end
end
