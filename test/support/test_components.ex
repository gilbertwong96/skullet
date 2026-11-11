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
  attr(:nonce, :string, default: nil)
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
      nonce={@nonce}
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

  attr(:id, :string, default: nil)
  attr(:nonce, :string, default: nil)

  def provider(assigns) do
    ~H"""
    <Skullet.provider
      id={@id}
      mode={@mode}
      theme={@theme}
      animation={@animation}
      speed={@speed}
      nonce={@nonce}
    >
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

  attr(:data, :any, default: nil)
  attr(:async, :any, default: nil)
  attr(:empty, :boolean, default: false)
  slot(:empty_message)

  def with_empty_state(assigns) do
    ~H"""
    <.skeleton
      :let={user}
      id={@id}
      sample={Skullet.Sample.sample_user()}
      data={@data}
      async={@async}
      empty={@empty}
    >
      <div id="content">{user.name}</div>
      <:error><p id="error">Could not load.</p></:error>
      <:empty_message><p id="empty">No messages yet.</p></:empty_message>
    </.skeleton>
    """
  end

  attr(:id, :string, required: true)
  attr(:data, :any, default: nil)
  attr(:state, :atom, default: nil)
  attr(:class, :any, default: nil)
  attr(:rest, :global)
  slot(:empty_message)

  def stateful(assigns) do
    ~H"""
    <.skeleton
      id={@id}
      sample={Skullet.Sample.sample_user()}
      data={@data}
      state={@state}
      class={@class}
      {@rest}
    >
      <div id="content">content</div>
      <:error><p id="error">Could not load.</p></:error>
      <:empty_message><p id="empty">No messages yet.</p></:empty_message>
    </.skeleton>
    """
  end

  attr(:data, :any, default: nil)

  def no_sample(assigns) do
    ~H"""
    <.skeleton id={@id} sample={nil} data={@data}>
      <div id="content">content</div>
    </.skeleton>
    """
  end

  def empty_without_message(assigns) do
    ~H"""
    <.skeleton :let={user} id={@id} sample={Skullet.Sample.sample_user()} data={@data} empty>
      <div id="content">{user.name}</div>
    </.skeleton>
    """
  end
end
