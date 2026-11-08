// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//
// If you have dependencies that try to import CSS, esbuild will generate a separate `app.css` file.
// To load it, simply add a second `<link>` to your `root.html.heex` file.

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"
// Establish Phoenix Socket and LiveView configuration.
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
import {hooks as colocatedHooks} from "phoenix-colocated/skullet_demo"
import topbar from "../vendor/topbar"
import { SkulletHook, registerReveal } from "../../../priv/static/skullet.js"

// A reveal of your own: the content arrives behind a mask wiped down the pane, 500ms.
registerReveal("wipe-down", {
  duration: 500,
  wipe: {
    mask: progress => `linear-gradient(#000 ${(progress * 100).toFixed(1)}%, transparent)`,
    out: progress => `linear-gradient(transparent ${(progress * 100).toFixed(1)}%, #000)`
  }
})

const BUILD = "engine-4 instant-bars single-owner resolve-nodes"

const csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
const liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: {_csrf_token: csrfToken},
  hooks: {
    ...colocatedHooks,
    // Wrapped only in the demo so the browser can look inside the engine.
    Skullet: {
      ...SkulletHook,
      mounted() {
        SkulletHook.mounted.call(this)
        window.__engines = window.__engines || []
        window.__engines.push(this.engine)
      }
    }
  },
})

// Show progress bar on live navigation and form submits
topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"})
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// connect if there are any LiveViews on the page
liveSocket.connect()

if (!liveSocket.hooks || !liveSocket.hooks.Skullet) {
  document.querySelectorAll("[data-skullet-build]").forEach(element => {
    element.textContent = "Skullet hook is NOT registered — this page is running a stale bundle"
    element.style.color = "#b91c1c"
    element.style.fontWeight = "700"
  })
}

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket

// Says which engine this page is running, and what it is doing: a blank skeleton with a
// live engine here points at the engine, a blank panel points at stale JavaScript.
const panel = document.querySelector("[data-skullet-build]")
const failures = []
window.addEventListener("error", event => failures.push(event.message))
window.addEventListener("unhandledrejection", event => failures.push(String(event.reason)))

setInterval(() => {
  if (!panel) return

  const root = document.getElementById("profile")
  const overlay = root?.querySelector("[data-skullet-overlay]")
  const bars = overlay?.shadowRoot?.querySelector("[data-skullet-bars]")
  const engine = window.__engines?.[0]

  const state = root?.getAttribute("data-skullet-state")
  const count = bars?.querySelectorAll("[data-skullet-bar]").length ?? 0
  const healthy =
    failures.length === 0 &&
    Boolean(engine?.started) &&
    (state === "loading" ? count > 0 : count === 0)

  panel.style.background = healthy ? "#0b3d2c" : "#7f1d1d"
  panel.style.color = healthy ? "#7CFC9B" : "#fff"
  panel.textContent = [
    BUILD,
    `state ${state}`,
    `engine ${engine ? (engine.started ? "started" : "idle") : "NONE"}`,
    `phase ${bars?.getAttribute("data-skullet-phase") ?? "-"}`,
    `bars ${count}`,
    `pane ${engine?.content === root?.querySelector("[data-skullet-content]") ? "live" : "MISMATCH"}`,
    `sheets ${overlay?.shadowRoot?.adoptedStyleSheets?.length ?? 0}`,
    failures.length ? `ERROR ${failures[0]}` : "no errors"
  ].join(" · ")
}, 500)

// The lines below enable quality of life phoenix_live_reload
// development features:
//
//     1. stream server logs to the browser console
//     2. click on elements to jump to their definitions in your code editor
//
if (process.env.NODE_ENV === "development") {
  window.addEventListener("phx:live_reload:attached", ({detail: reloader}) => {
    // Enable server log streaming to client.
    // Disable with reloader.disableServerLogs()
    reloader.enableServerLogs()

    // Open configured PLUG_EDITOR at file:line of the clicked element's HEEx component
    //
    //   * click with "c" key pressed to open at caller location
    //   * click with "d" key pressed to open at function component definition location
    let keyDown
    window.addEventListener("keydown", e => keyDown = e.key)
    window.addEventListener("keyup", _e => keyDown = null)
    window.addEventListener("click", e => {
      if(keyDown === "c"){
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtCaller(e.target)
      } else if(keyDown === "d"){
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtDef(e.target)
      }
    }, true)

    window.liveReloader = reloader
  })
}

