# Build from the repository root, because the demo depends on the library next to it:
#
#   docker build -f example/Dockerfile -t skullet-demo .
#   fly deploy -c example/fly.toml
#
# The example's `mix.exs` reaches the library at `path: ".."`, so this image lays the
# repository out as it is: the library at /app, the demo at /app/example.

ARG ELIXIR_VERSION=1.20.5
ARG OTP_VERSION=29.1.2
ARG DEBIAN_VERSION=trixie-20261104-slim

ARG BUILDER_IMAGE="docker.io/hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="docker.io/debian:${DEBIAN_VERSION}"

FROM ${BUILDER_IMAGE} AS builder

# install build dependencies
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mix local.hex --force \
  && mix local.rebar --force

ENV MIX_ENV="prod"

# the library: the demo depends on it by path, and its compiled assets are imported
COPY mix.exs mix.lock ./
COPY lib lib
COPY priv priv

# the demo
COPY example/mix.exs example/mix.lock example/
RUN cd example && mix deps.get --only $MIX_ENV

RUN mkdir -p example/config
COPY example/config/config.exs example/config/$MIX_ENV.exs example/config/
RUN cd example && mix deps.compile

RUN cd example && mix assets.setup

COPY example/priv example/priv
COPY example/lib example/lib
RUN cd example && mix compile

COPY example/assets example/assets
RUN cd example && mix assets.deploy

# changes to runtime.exs do not require recompiling the code
COPY example/config/runtime.exs example/config/

COPY example/rel example/rel
RUN cd example && mix release

FROM ${RUNNER_IMAGE} AS final

RUN apt-get update \
  && apt-get install -y --no-install-recommends libstdc++6 openssl libncurses6 locales ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
  && locale-gen

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

WORKDIR "/app"
RUN chown nobody /app

ENV MIX_ENV="prod"

# only the release goes into the final image
COPY --from=builder --chown=nobody:root /app/example/_build/${MIX_ENV}/rel/skullet_demo ./

USER nobody

CMD ["/app/bin/server"]
