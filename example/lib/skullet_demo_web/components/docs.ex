defmodule SkulletDemoWeb.Docs do
  @moduledoc "Layout pieces for the demo page: sections, demo cards and code snippets."

  use Phoenix.Component

  attr :id, :string, required: true
  attr :title, :string, required: true
  attr :blurb, :string, default: nil
  slot :inner_block, required: true
  slot :code

  def section(assigns) do
    ~H"""
    <section id={@id} class="scroll-mt-24 border-t border-base-300 pt-10">
      <h2 class="text-2xl font-semibold tracking-tight">{@title}</h2>
      <p :if={@blurb} class="mt-1 max-w-2xl text-sm opacity-70">{@blurb}</p>
      <div class="mt-6 grid gap-6">
        {render_slot(@inner_block)}
      </div>
    </section>
    """
  end

  attr :id, :string, required: true
  attr :title, :string, required: true
  attr :blurb, :string, default: nil
  attr :code, :string, default: nil
  slot :inner_block, required: true
  slot :actions

  def demo(assigns) do
    ~H"""
    <article id={@id} class="scroll-mt-24 rounded-xl border border-base-300 bg-base-100 p-5">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="font-semibold">{@title}</h3>
          <p :if={@blurb} class="mt-0.5 max-w-xl text-sm opacity-70">{@blurb}</p>
        </div>
        <div class="flex items-center gap-2">{render_slot(@actions)}</div>
      </header>

      <div class="mt-4">{render_slot(@inner_block)}</div>

      <details :if={@code} class="mt-4 group">
        <summary class="cursor-pointer text-xs font-medium opacity-60 hover:opacity-100">
          code
        </summary>
        <pre class="highlight mt-2 overflow-x-auto rounded-lg bg-base-200 p-3 text-xs leading-relaxed"><code>{highlight(@code)}</code></pre>
      </details>
    </article>
    """
  end

  # HEEx reads as HTML with Elixir inside; the HTML lexer keeps the tags readable.
  defp highlight(source) do
    source
    |> Makeup.highlight_inner_html(lexer: "html")
    |> Phoenix.HTML.raw()
  end

  attr :person, :map, required: true

  def person(assigns) do
    ~H"""
    <div class="flex items-center gap-4">
      <img src={@person.avatar} width="56" height="56" alt="" class="size-14 rounded-full" />
      <div class="min-w-0">
        <p class="truncate font-semibold">{@person.name}</p>
        <p class="truncate text-sm opacity-70">{@person.bio}</p>
      </div>
    </div>
    """
  end

  attr :controls, :map, required: true
  slot :inner_block, required: true

  def card(assigns) do
    ~H"""
    <div class="flex items-center gap-4">
      <img src={@controls.avatar} width="56" height="56" alt="" class="size-14 rounded-full" />
      <div class="min-w-0">
        <p class="truncate font-semibold">{@controls.name}</p>
        <p class="truncate text-sm opacity-70">{@controls.bio}</p>
      </div>
    </div>
    """
  end
end
