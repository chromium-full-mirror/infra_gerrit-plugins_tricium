#!/bin/bash
#
# This script runs a local Gerrit instance with the Tricium plugin.

# This assumes that a Gerrit testsite has already been initialized; see
# https://gerrit-review.googlesource.com/Documentation/dev-readme.html
# for site initialization instructions.
#
# Usage: Invoke with environment variables GERRIT and GERRIT_TESTSITE, e.g.:
#     GERRIT=~/gerrit GERRIT_TESTSITE=~/testsite tricium/run-gerrit-testsite.sh

readonly SCRIPT_DIR=$(realpath "$(dirname "${0}")")
readonly GERRIT_DIR=$(realpath "${GERRIT:-${SCRIPT_DIR}/../..}")
readonly GERRIT_TESTSITE_DIR=$(realpath \
    "${GERRIT_TESTSITE:-${GERRIT_DIR}/../gerrit_testsite}")

echo "Using ${SCRIPT_DIR} as Tricium plugin directory."
echo "Using ${GERRIT_DIR} as Gerrit directory."
echo "Using ${GERRIT_TESTSITE_DIR} as Gerrit testsite directory."

if ! which vulcanize > /dev/null; then
  echo "Error: vulcanize not found."
  echo "Install with npm install -g vulcanize"
  exit 1
fi

vulcanize --inline-scripts "${SCRIPT_DIR}/resources/static/tricium.html" \
    > "${GERRIT_TESTSITE_DIR}/plugins/tricium.html"

# Move to the Gerrit directory so that Bazel can find the workspace.
# Gerrit docs say to use the same Java version that Bazel used for the build.
(cd "${GERRIT_DIR}" && "$(bazel info output_base)/external/local_jdk/bin/java" \
    -jar bazel-bin/gerrit.war daemon -d "${GERRIT_TESTSITE_DIR}" --console-log)
