defmodule SkulletDemoWeb.PageController do
  use SkulletDemoWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
