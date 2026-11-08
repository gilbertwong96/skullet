defmodule SkulletDemoWeb.DemoLive do
  use SkulletDemoWeb, :live_view

  import SkulletDemoWeb.Docs

  @reveals ~w(smart together sequence sweep instant)
  @animations ~w(shimmer group-shimmer pulse none)
  @speeds ~w(slow fast)
  @modes ~w(system light dark)
  @latencies ~w(0 600 2000)
  @radii [{"default", ""}, {"0.25em", "0.25em"}, {"8px", "8px"}, {"999px", "999px"}]
  @texts [
    {"ascender → descender", "ascender/descender"},
    {"cap-height → baseline", "cap-height/baseline"},
    {"x-height → baseline", "x-height/baseline"}
  ]
  @holds [{"150ms (default)", ""}, {"0ms", "0ms"}, {"800ms", "800ms"}]
  @delays [{"0ms (default)", ""}, {"200ms", "200ms"}]
  @enters [
    {"none (default)", ""},
    {"blur(6px)", "blur"},
    {"scale 0.98", "scale"},
    {"both", "both"}
  ]

  # Demo name (the button's phx-value) to the async assign that feeds it.
  @demos %{
    "card" => :card,
    "sized" => :sized,
    "own" => :own,
    "hints" => :hints,
    "memory" => :memory,
    "modes" => :reveal_demo,
    "custom" => :custom,
    "suspense" => :suspense
  }

  @codes %{
    card: """
    <Skullet.skeleton :let={user} id="card" async={@user} sample={@sample_user}>
      <Profile.card user={user} />
    </Skullet.skeleton>
    """
  }

  @sample_card %{
    name: "Ada Lovelace",
    bio: "Mathematician, first to see the machine as more than arithmetic.",
    avatar: "/images/a.svg"
  }

  @real_card %{
    name: "Grace Hopper",
    bio: "Rear admiral, compiler pioneer, found the first literal bug.",
    avatar: "/images/b.svg"
  }

  @sample_short %{name: "Ada Lovelace", bio: "One line of sample.", avatar: "/images/a.svg"}

  @real_long %{
    name: "Grace Hopper",
    bio:
      "Four lines of real content. The sample guessed one, so the reveal eases to the height that actually arrived instead of snapping, and nothing on the page below moves until it is done.",
    avatar: "/images/b.svg"
  }

  @sample_rows [
    %{name: "Ada Lovelace", role: "Mathematics"},
    %{name: "Grace Hopper", role: "Compilers"},
    %{name: "Alan Turing", role: "Machines"},
    %{name: "Katherine Johnson", role: "Orbital mechanics"},
    %{name: "Margaret Hamilton", role: "Flight software"},
    %{name: "Barbara Liskov", role: "Abstraction"}
  ]

  @real_rows [
    %{name: "Ada Lovelace", role: "Analytical Engine"},
    %{name: "Grace Hopper", role: "COBOL"},
    %{name: "Alan Turing", role: "Computability"},
    %{name: "Katherine Johnson", role: "Trajectories"},
    %{name: "Margaret Hamilton", role: "Apollo guidance"},
    %{name: "Barbara Liskov", role: "Substitution principle"}
  ]

  @sample_chart [40, 64, 52, 88, 72, 96, 60, 80]
  @real_chart [72, 48, 92, 60, 84, 68, 96, 54]

  @images [
    %{src: "/images/a.svg", label: "A"},
    %{src: "/images/b.svg", label: "B"},
    %{src: "/images/c.svg", label: "C"},
    %{src: "/images/d.svg", label: "D"}
  ]

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Skullet — measured skeletons for Phoenix LiveView")
     |> assign(:reveals, @reveals)
     |> assign(:animations, @animations)
     |> assign(:speeds, @speeds)
     |> assign(:modes, @modes)
     |> assign(:latencies, @latencies)
     |> assign(:radii, @radii)
     |> assign(:texts, @texts)
     |> assign(:holds, @holds)
     |> assign(:delays, @delays)
     |> assign(:enters, @enters)
     |> assign(:sample_card, @sample_card)
     |> assign(:real_card, @real_card)
     |> assign(:sample_short, @sample_short)
     |> assign(:real_long, @real_long)
     |> assign(:sample_rows, @sample_rows)
     |> assign(:real_rows, @real_rows)
     |> assign(:sample_chart, @sample_chart)
     |> assign(:real_chart, @real_chart)
     |> assign(:images, @images)
     |> assign(:plain_user, @real_card)
     |> assign(:pinned, false)
     |> assign(:controls, controls())
     |> assign(:codes, @codes)
     |> replay(:card)
     |> replay(:sized)
     |> replay(:own)
     |> replay(:hints)
     |> replay(:memory)
     |> replay(:reveal_demo)
     |> replay(:custom)
     |> replay(:suspense)}
  end

  @impl true
  def handle_event("replay", %{"demo" => demo}, socket) do
    case Map.fetch(@demos, demo) do
      {:ok, key} -> {:noreply, replay(socket, key)}
      :error -> {:noreply, socket}
    end
  end

  def handle_event("control", %{"controls" => controls}, socket) do
    {:noreply, assign(socket, :controls, Map.merge(socket.assigns.controls, controls))}
  end

  def handle_event("pin", _params, socket) do
    {:noreply, update(socket, :pinned, &(!&1))}
  end

  def handle_event("forget", _params, socket) do
    Skullet.Memory.forget("demo")

    {:noreply,
     put_flash(socket, :info, "Forgotten — the next replay draws from the sample again.")}
  end

  defp controls do
    %{
      "latency" => "600",
      "animation" => "shimmer",
      "speed" => "slow",
      "mode" => "system",
      "radius" => "",
      "text" => "ascender/descender",
      "hold" => "",
      "delay" => "",
      "enter" => "",
      "reveal" => "smart"
    }
  end

  # One async assign per demo, all with the same latency, so replay behaves the same way.
  # `reset: true` is what brings the skeleton back — without it LiveView keeps the old result.
  defp replay(socket, :suspense) do
    assign_async(socket, :suspense, fn -> {:error, :boom} end, reset: true)
  end

  defp replay(socket, key) do
    delay = String.to_integer(socket.assigns.controls["latency"])

    assign_async(
      socket,
      key,
      fn ->
        Process.sleep(delay)
        {:ok, %{key => data_for(key)}}
      end,
      reset: true
    )
  end

  defp data_for(:card), do: @real_card
  defp data_for(:sized), do: @real_long
  defp data_for(:own), do: @real_chart
  defp data_for(:hints), do: @real_card
  defp data_for(:memory), do: @real_card
  defp data_for(:reveal_demo), do: @real_card
  defp data_for(:custom), do: @real_card

  # The theme the provider applies to every skeleton in the page.
  defp theme(controls) do
    %{}
    |> put("radius", controls["radius"])
    |> put("hold", controls["hold"])
    |> put("delay", controls["delay"])
    |> put_text(controls["text"])
    |> put_enter(controls["enter"])
  end

  defp put(theme, _key, value) when value in [nil, ""], do: theme
  defp put(theme, key, value), do: Map.put(theme, key, value)

  defp put_text(theme, "ascender/descender"), do: theme

  defp put_text(theme, value) do
    [top, bottom] = String.split(value, "/")
    theme |> Map.put("text_top", top) |> Map.put("text_bottom", bottom)
  end

  defp put_enter(theme, ""), do: theme
  defp put_enter(theme, "blur"), do: Map.put(theme, "enter_filter", "blur(6px)")
  defp put_enter(theme, "scale"), do: Map.put(theme, "enter_scale", "0.98")

  defp put_enter(theme, "both"),
    do: theme |> Map.put("enter_filter", "blur(6px)") |> Map.put("enter_scale", "0.98")

  defp provider_theme(controls) do
    theme(controls)
    |> Map.new(fn {key, value} -> {String.to_existing_atom(key), value} end)
  end

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash}>
      <Skullet.provider
        mode={@controls["mode"]}
        animation={@controls["animation"]}
        speed={@controls["speed"]}
        theme={provider_theme(@controls)}
      >
        <header class="mb-10">
          <h1 class="text-3xl font-semibold tracking-tight">
            Skullet for Phoenix LiveView
          </h1>
          <p class="mt-2 max-w-2xl text-sm opacity-70">
            Your own component, rendered from sample data and measured, so the skeleton is
            exactly the shape of what is coming. Nothing moves when it arrives. Every demo
            below runs on a real <code class="rounded bg-base-200 px-1">assign_async</code>.
          </p>
        </header>

        <.controls
          controls={@controls}
          radii={@radii}
          texts={@texts}
          holds={@holds}
          delays={@delays}
          enters={@enters}
          modes={@modes}
          animations={@animations}
          speeds={@speeds}
          reveals={@reveals}
          latencies={@latencies}
        />

        <div class="mt-10 grid gap-12">
          <section id="skeletons" class="scroll-mt-24 grid gap-6">
            <div class="border-b border-base-300 pb-2">
              <h2 class="text-2xl font-semibold tracking-tight">Skeletons</h2>
              <p class="mt-1 max-w-2xl text-sm opacity-70">
                Every one of these is your markup, drawn once from sample data while the assign
                is loading.
              </p>
            </div>

            <.demo
              id="card"
              title="From your component"
              blurb="The sample is a person; the real data is someone else. The skeleton is measured from the sample, the reveal is measured from the real card."
              code={@codes.card}
            >
              <:actions>
                <button class="btn btn-xs" phx-click="replay" phx-value-demo="card">Replay</button>
              </:actions>
              <Skullet.skeleton
                :let={user}
                id="s-card"
                async={@card}
                sample={@sample_card}
                label="Loading profile"
              >
                <.person person={user} />
              </Skullet.skeleton>
            </.demo>

            <.demo
              id="sized"
              title="Changing size"
              blurb="The sample guesses one line, four arrive: the reveal eases to the real height instead of snapping."
            >
              <:actions>
                <button class="btn btn-xs" phx-click="replay" phx-value-demo="sized">Replay</button>
              </:actions>
              <Skullet.skeleton :let={user} id="s-sized" async={@sized} sample={@sample_short}>
                <div class="flex items-start gap-4">
                  <img src={user.avatar} width="56" height="56" alt="" class="size-14 rounded-full" />
                  <div class="min-w-0">
                    <p class="font-semibold">{user.name}</p>
                    <p class="text-sm opacity-70">{user.bio}</p>
                  </div>
                </div>
              </Skullet.skeleton>
            </.demo>

            <.demo
              id="plain"
              title="Plain children"
              blurb="You drive `loading` yourself; the children are measured as they are."
            >
              <:actions>
                <button class="btn btn-xs" phx-click="pin">
                  {if @pinned, do: "Show loaded", else: "Show loading"}
                </button>
              </:actions>
              <Skullet.skeleton
                :let={user}
                id="s-plain"
                data={@plain_user}
                loading={@pinned}
                sample={@sample_card}
              >
                <.person person={user} />
              </Skullet.skeleton>
            </.demo>

            <.demo
              id="own"
              title="Your own skeleton"
              blurb="A chart does not measure well. The `skeleton` slot supplies the shape instead: a baseline and a row of boxes."
            >
              <:actions>
                <button class="btn btn-xs" phx-click="replay" phx-value-demo="own">Replay</button>
              </:actions>
              <Skullet.skeleton :let={values} id="s-own" async={@own} sample={@sample_chart}>
                <div class="flex h-28 items-end gap-2">
                  <div
                    :for={value <- values}
                    class="w-5 rounded-t bg-primary"
                    style={"height: #{value}%"}
                  >
                  </div>
                </div>
                <:skeleton>
                  <div class="flex h-28 items-end gap-2 border-b border-base-300 pb-1">
                    <Skullet.box
                      :for={height <- @sample_chart}
                      width={20}
                      height={"#{height}%"}
                      radius="4px"
                    />
                  </div>
                </:skeleton>
              </Skullet.skeleton>
            </.demo>

            <.demo
              id="hints"
              title="Hints"
              blurb="Marking what measuring reads wrong: `skullet-ignore` leaves an element out, `skullet-block` draws it whole."
            >
              <:actions>
                <button class="btn btn-xs" phx-click="replay" phx-value-demo="hints">Replay</button>
              </:actions>
              <Skullet.skeleton :let={user} id="s-hints" async={@hints} sample={@sample_card}>
                <div class="flex items-center gap-4">
                  <img src={user.avatar} width="56" height="56" alt="" class="size-14 rounded-full" />
                  <div class="min-w-0">
                    <p class="truncate font-semibold">
                      {user.name}
                      <span skullet-ignore class="badge badge-sm ml-1">New</span>
                    </p>
                    <p class="truncate text-sm opacity-70">{user.bio}</p>
                  </div>
                  <div skullet-block class="ml-auto size-10 rounded-lg bg-base-300"></div>
                </div>
              </Skullet.skeleton>
            </.demo>

            <.demo
              id="memory"
              title="Memory"
              blurb="Pass `remember` and the next skeleton is drawn from the data this one last showed, not from the sample. Replay once, then reload the page."
            >
              <:actions>
                <button class="btn btn-xs" phx-click="replay" phx-value-demo="memory">Replay</button>
                <button class="btn btn-xs btn-ghost" phx-click="forget">Forget</button>
              </:actions>
              <Skullet.skeleton
                :let={user}
                id="s-memory"
                async={@memory}
                sample={@sample_card}
                remember="demo"
              >
                <.person person={user} />
              </Skullet.skeleton>
            </.demo>
          </section>

          <section id="reveals" class="scroll-mt-24 grid gap-6">
            <div class="border-b border-base-300 pb-2">
              <h2 class="text-2xl font-semibold tracking-tight">Reveals</h2>
              <p class="mt-1 max-w-2xl text-sm opacity-70">
                How content replaces its skeleton. <code class="rounded bg-base-200 px-1">smart</code>
                decides from how long the skeleton was up, recent input, refetches and how much arrives.
              </p>
            </div>

            <.demo
              id="modes"
              title="Reveal modes"
              blurb="Pick a mode and replay. Every mode is measured the same way; only the exit differs."
            >
              <:actions>
                <form phx-change="control" class="flex items-center gap-2">
                  <select name="controls[reveal]" class="select select-xs">
                    <option
                      :for={reveal <- @reveals}
                      value={reveal}
                      selected={reveal == @controls["reveal"]}
                    >
                      {reveal}
                    </option>
                  </select>
                </form>
                <button class="btn btn-xs" phx-click="replay" phx-value-demo="modes">Replay</button>
              </:actions>
              <Skullet.skeleton
                :let={user}
                id="s-modes"
                async={@reveal_demo}
                sample={@sample_card}
                reveal={@controls["reveal"]}
              >
                <.person person={user} />
              </Skullet.skeleton>
            </.demo>

            <.demo
              id="custom"
              title="Your own reveal"
              blurb="`registerReveal` in app.js names a spec: this one wipes the content in behind a mask, 500ms."
            >
              <:actions>
                <button class="btn btn-xs" phx-click="replay" phx-value-demo="custom">Replay</button>
              </:actions>
              <Skullet.skeleton
                :let={user}
                id="s-custom"
                async={@custom}
                sample={@sample_card}
                reveal="wipe-down"
              >
                <.person person={user} />
              </Skullet.skeleton>
            </.demo>

            <.demo
              id="suspense"
              title="Suspense and failure"
              blurb="The same component is the Suspense boundary: an async assign, a measured fallback, one error branch. This one always fails, and Retry replays it."
            >
              <:actions>
                <button class="btn btn-xs" phx-click="replay" phx-value-demo="suspense">Retry</button>
              </:actions>
              <Skullet.skeleton
                :let={user}
                id="s-suspense"
                async={@suspense}
                sample={@sample_card}
                label="Loading profile"
              >
                <.person person={user} />
                <:skeleton>
                  <div class="flex items-center gap-4">
                    <Skullet.box width={56} height={56} radius="999px" />
                    <div class="min-w-0 flex-1">
                      <Skullet.box width="40%" height={16} />
                      <Skullet.box width="70%" height={12} radius="6px" />
                    </div>
                  </div>
                </:skeleton>
                <:error>
                  <div class="flex items-center gap-3 rounded-lg border border-error/40 bg-error/10 p-3 text-sm">
                    <span class="badge badge-error badge-sm">error</span>
                    <span>Could not load the profile.</span>
                  </div>
                </:error>
              </Skullet.skeleton>
            </.demo>
          </section>

          <section id="styling" class="scroll-mt-24 grid gap-6">
            <div class="border-b border-base-300 pb-2">
              <h2 class="text-2xl font-semibold tracking-tight">Styling</h2>
              <p class="mt-1 max-w-2xl text-sm opacity-70">
                Every option is a custom property, so the panel above is enough: one provider,
                and every skeleton inside inherits it.
              </p>
            </div>

            <.demo
              id="theming"
              title="Theming"
              blurb="Colours follow the page's colour scheme; the reveal's shape, timings and enter filters are properties too."
            >
              <Skullet.skeleton
                :let={user}
                id="s-theming"
                data={@real_card}
                loading={true}
                sample={@sample_card}
              >
                <.person person={user} />
              </Skullet.skeleton>
            </.demo>

            <.demo
              id="provider"
              title="A provider's mode"
              blurb="`mode` sets `color-scheme` on the wrapper, which is what the bars' colours follow — dark bars on a light page."
            >
              <Skullet.provider mode="dark" class="rounded-lg bg-neutral p-4 text-neutral-content">
                <div class="flex items-center gap-4">
                  <div class="size-14 rounded-full bg-white/20"></div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold">Dark bars, light page</p>
                    <p class="truncate text-sm opacity-70">inside a provider with mode="dark"</p>
                  </div>
                </div>
              </Skullet.provider>
            </.demo>
          </section>

          <section id="reference" class="scroll-mt-24 grid gap-6">
            <div class="border-b border-base-300 pb-2">
              <h2 class="text-2xl font-semibold tracking-tight">Reference</h2>
              <p class="mt-1 max-w-2xl text-sm opacity-70">
                The parts you do not see in the demos.
              </p>
            </div>

            <.demo
              id="images"
              title="Images"
              blurb="An image still decoding when the content arrives waits at zero opacity and fades in. These four are served with a delay."
            >
              <:actions>
                <button class="btn btn-xs" phx-click="replay" phx-value-demo="own">Replay</button>
              </:actions>
              <div class="grid grid-cols-4 gap-3">
                <img
                  :for={{image, index} <- Enum.with_index(@images)}
                  src={"/slow/#{1200 + index * 600}#{image.src}"}
                  width="96"
                  height="96"
                  alt=""
                  class="size-24 rounded-xl"
                />
              </div>
            </.demo>

            <.demo
              id="accessibility"
              title="Accessibility"
              blurb="A loading reveal is aria-busy, its skeleton is hidden from screen readers, and the label is read in its place. Reduced motion stops the shimmer and makes every reveal instant."
            >
              <p class="text-sm opacity-70">
                Turn on “Reduce motion” in your system settings and reload: the bars hold still
                and content appears at once.
              </p>
            </.demo>

            <.demo
              id="debug"
              title="Debugging"
              blurb="Add ?skullet-debug to the URL: blue outlines while loading, green when the content landed where the skeleton was, red with the distance when it moved. `skullet-xray` on any element shows the sample through the skeleton."
            >
              <:actions>
                <a class="btn btn-xs" href="?skullet-debug">?skullet-debug</a>
              </:actions>
              <p class="text-sm opacity-70">
                The footer shows the running engine — state, phase, bars drawn, and whether
                anything threw.
              </p>
            </.demo>

            <.demo
              id="server"
              title="Server rendering"
              blurb="The whole page is rendered on the server, skeleton included. `<Skullet.Boot.boot />` in the root layout paints it before the first paint, so the bundle never has to arrive first."
            >
              <p class="text-sm opacity-70">
                View source: the sample is in the HTML, and an inline script measures it.
              </p>
            </.demo>
          </section>
        </div>
      </Skullet.provider>
    </Layouts.app>
    """
  end

  attr :controls, :map, required: true
  attr :radii, :list, required: true
  attr :texts, :list, required: true
  attr :holds, :list, required: true
  attr :delays, :list, required: true
  attr :enters, :list, required: true
  attr :modes, :list, required: true
  attr :animations, :list, required: true
  attr :speeds, :list, required: true
  attr :reveals, :list, required: true
  attr :latencies, :list, required: true

  defp controls(assigns) do
    ~H"""
    <form phx-change="control" class="rounded-xl border border-base-300 bg-base-100 p-4">
      <p class="mb-3 text-xs font-medium uppercase tracking-wide opacity-60">Every demo above</p>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <.field label="latency">
          <select name="controls[latency]" class="select select-sm w-full">
            <option
              :for={latency <- @latencies}
              value={latency}
              selected={latency == @controls["latency"]}
            >
              {latency}ms
            </option>
          </select>
        </.field>

        <.field label="animation">
          <select name="controls[animation]" class="select select-sm w-full">
            <option
              :for={animation <- @animations}
              value={animation}
              selected={animation == @controls["animation"]}
            >
              {animation}
            </option>
          </select>
        </.field>

        <.field label="speed">
          <select name="controls[speed]" class="select select-sm w-full">
            <option :for={speed <- @speeds} value={speed} selected={speed == @controls["speed"]}>
              {speed}
            </option>
          </select>
        </.field>

        <.field label="mode">
          <select name="controls[mode]" class="select select-sm w-full">
            <option :for={mode <- @modes} value={mode} selected={mode == @controls["mode"]}>
              {mode}
            </option>
          </select>
        </.field>

        <.field label="radius">
          <select name="controls[radius]" class="select select-sm w-full">
            <option
              :for={{label, value} <- @radii}
              value={value}
              selected={value == @controls["radius"]}
            >
              {label}
            </option>
          </select>
        </.field>

        <.field label="text bars">
          <select name="controls[text]" class="select select-sm w-full">
            <option
              :for={{label, value} <- @texts}
              value={value}
              selected={value == @controls["text"]}
            >
              {label}
            </option>
          </select>
        </.field>

        <.field label="hold">
          <select name="controls[hold]" class="select select-sm w-full">
            <option
              :for={{label, value} <- @holds}
              value={value}
              selected={value == @controls["hold"]}
            >
              {label}
            </option>
          </select>
        </.field>

        <.field label="reveal delay">
          <select name="controls[delay]" class="select select-sm w-full">
            <option
              :for={{label, value} <- @delays}
              value={value}
              selected={value == @controls["delay"]}
            >
              {label}
            </option>
          </select>
        </.field>

        <.field label="enter">
          <select name="controls[enter]" class="select select-sm w-full">
            <option
              :for={{label, value} <- @enters}
              value={value}
              selected={value == @controls["enter"]}
            >
              {label}
            </option>
          </select>
        </.field>
      </div>
    </form>
    """
  end

  attr :label, :string, required: true
  slot :inner_block, required: true

  defp field(assigns) do
    ~H"""
    <label class="block">
      <span class="mb-1 block text-xs opacity-60">{@label}</span>
      {render_slot(@inner_block)}
    </label>
    """
  end
end
