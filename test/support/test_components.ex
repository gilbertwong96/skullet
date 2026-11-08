defmodule Skullet.TestComponents do
  @moduledoc false

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
      remember={@remember}
    >
      <div id="content">{user.name}</div>
    </.skeleton>
    """
  end

  def with_custom_skeleton(assigns) do
    ~H"""
    <.skeleton id={@id} sample={Skullet.Sample.sample_user()} data={@data}>
      <div id="content">{@data.name}</div>
      <:skeleton><div id="custom" skullet-block>custom skeleton</div></:skeleton>
    </.skeleton>
    """
  end

  def provider(assigns) do
    ~H"""
    <Skullet.provider mode={@mode} theme={@theme} animation={@animation} speed={@speed}>
      <div id="inside">hi</div>
    </Skullet.provider>
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
