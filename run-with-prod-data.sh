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
readonly PLUGIN_DIR=$(mktemp -d)
readonly GERRIT_HOST="${GERRIT_HOST:-chromium-review.googlesource.com}"

echo "Using ${SCRIPT_DIR} as Tricium plugin directory."
echo "Using ${GERRIT_DIR} as Gerrit directory."
echo "Using ${PLUGIN_DIR} as plugins directory."
echo "Using ${GERRIT_HOST} as Gerrit host."

function cleanup {
    echo  "Cleaning up temp dir: $PLUGIN_DIR"
    rm -r "$PLUGIN_DIR"
    exit 0
}
trap cleanup EXIT

mkdir -p "${PLUGIN_DIR}/tricium/"
ln -s "${SCRIPT_DIR}/src/main/resources/static" "${PLUGIN_DIR}/tricium/static"

(cd "${GERRIT_DIR}" && \
    polygerrit-ui/run-server.sh \
    -host "${GERRIT_HOST}" -plugins "${PLUGIN_DIR}")
