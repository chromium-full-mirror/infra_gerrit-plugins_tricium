#!/bin/bash
#
# This script runs a server using local PolyGerrit resources and
# chromium-review.googlesource.com production data.
#
# Usage: Invoke with environment variable GERRIT set, e.g.:
#     GERRIT=~/gerrit tricium/run-server.sh

readonly SCRIPT_DIR=$(realpath "$(dirname "${0}")")
readonly GERRIT_DIR=$(realpath "${GERRIT:-${SCRIPT_DIR}/../..}")
readonly PLUGIN_DIR=$(mktemp -d)
readonly GERRIT_HOST="chromium-review.googlesource.com"

echo "Using ${SCRIPT_DIR} as Tricium plugin directory."
echo "Using ${GERRIT_DIR} as Gerrit directory."
echo "Using ${PLUGIN_DIR} as plugins directory."
echo "Using ${GERRIT_HOST} as Gerrit host."

if ! which vulcanize > /dev/null; then
  echo "Error: vulcanize not found."
  echo "Install with npm install -g vulcanize"
  exit 1
fi

# Even though the tricium plugin is not yet enabled in production, we can still
# experiment with Tricium by pretending to be another plugin that is enabled.
# TODO(qyearsley): Update this after enabling tricium in prod.
# Note: another possible approach that doesn't require vulcanize is to copy
# over all the individual files into the plugin-specific static directory.
mkdir -p "${PLUGIN_DIR}/chromium-behavior/static/"
vulcanize --inline-scripts "${SCRIPT_DIR}/resources/static/tricium.html" \
    > "${PLUGIN_DIR}/chromium-behavior/static/chromium-behavior.html"

(cd "${GERRIT_DIR}" && \
    polygerrit-ui/run-server.sh \
    -host "chromium-review.googlesource.com" \
    -plugins "${PLUGIN_DIR}")
