#!/bin/bash
#
# This script runs a server using local PolyGerrit resources and
# chromium-review.googlesource.com production data.
#
# Usage: Invoke with no arguments, optionally with the environment
#     variable GERRIT set, e.g. GERRIT=~/gerrit tricium/run-server.sh

set -eu

readonly SCRIPT_DIR=$(realpath "$(dirname "${0}")")
readonly GERRIT_DIR=$(realpath "${GERRIT:-${SCRIPT_DIR}/../..}")
readonly PLUGIN_DIR=$(mktemp -d)
readonly GERRIT_HOST="chromium-review.googlesource.com"

echo "Using ${SCRIPT_DIR} as Tricium plugin directory."
echo "Using ${GERRIT_DIR} as Gerrit directory."
echo "Using ${PLUGIN_DIR} as plugins directory."
echo "Using ${GERRIT_HOST} as Gerrit host."

# Even though the tricium plugin is not yet enabled in production, we can still
# experiment with Tricium by pretending to be another plugin that is enabled.
# TODO(qyearsley): Update this after enabling tricium in prod.
readonly NAME="chumpdetector"
mkdir -p "${PLUGIN_DIR}/${NAME}/static/"
cp -r "${SCRIPT_DIR}/src/main/resources/static" "${PLUGIN_DIR}/${NAME}/"
cp "${PLUGIN_DIR}/${NAME}/static/tricium.js" "${PLUGIN_DIR}/${NAME}/static/${NAME}.js"

(cd "${GERRIT_DIR}" && \
    polygerrit-ui/run-server.sh \
    -host "${GERRIT_HOST}" -plugins "${PLUGIN_DIR}")
