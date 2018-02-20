#!/bin/bash
#
# This script runs a server using local PolyGerrit resources and
# live production data.
#
# Usage: Invoke with no arguments, optionally with the environment
#     variables set to change behavior, e.g.
#     GERRIT_HOST=gerrit-review.googlesource.com GERRIT_DIR=~/gerrit <script>

set -eu

readonly SCRIPT_DIR=$(realpath "$(dirname "${0}")")
readonly GERRIT_DIR=$(realpath "${GERRIT_DIR:-${SCRIPT_DIR}/../..}")
readonly GERRIT_HOST="${GERRIT_HOST:-chromium-review.googlesource.com}"
readonly PLUGIN_PATH=$(realpath --relative-to="$GERRIT_DIR" \
    "$SCRIPT_DIR/src/main/resources/static/tricium.html")

echo "Using ${SCRIPT_DIR} as Tricium plugin directory."
echo "Using ${GERRIT_DIR} as Gerrit directory."
echo "Using ${GERRIT_HOST} as Gerrit host."
echo "Using ${PLUGIN_PATH} as path to plugin web UI entry point."

(cd "${GERRIT_DIR}" && \
    polygerrit-ui/run-server.sh \
    --host "${GERRIT_HOST}" \
    --plugins="$PLUGIN_PATH")
