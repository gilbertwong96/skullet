defmodule Skullet.Sample do
  def sample_user do
    %{name: "Sample Name", bio: "A sample bio long enough to wrap.", avatar: "/sample.png"}
  end

  def real_user do
    %{name: "Real Name", bio: "The real bio.", avatar: "/real.png"}
  end
end
