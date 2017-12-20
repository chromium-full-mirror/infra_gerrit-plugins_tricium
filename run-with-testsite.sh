#!/bin/bash
#
# This script rebuilds the Tricium plugin and runs a local Gerrit
# instance with the Tricium plugin.
#
# This assumes that a Gerrit testsite has already been initialized; see
# https://gerrit-review.googlesource.com/Documentation/dev-readme.html for site
# initialization instructions.
#
# Usage: Invoke with no arguments. Set the environment variables GERRIT and
#     GERRIT_TESTSITE if necessary.

set -eu

readonly SCRIPT_DIR=$(realpath "$(dirname "${0}")")
readonly GERRIT_DIR=$(realpath "${GERRIT:-${SCRIPT_DIR}/../..}")
readonly GERRIT_TESTSITE_DIR=$(realpath \
    "${GERRIT_TESTSITE:-${GERRIT_DIR}/../gerrit_testsite}")

echo "Using ${SCRIPT_DIR} as Tricium plugin directory."
echo "Using ${GERRIT_DIR} as Gerrit directory."
echo "Using ${GERRIT_TESTSITE_DIR} as Gerrit testsite directory."

# Move to the Gerrit directory so that Bazel can find the workspace.
pushd "${GERRIT_DIR}"

# We want to force re-build even if only static files changed.
rm -f bazel-genfiles/plugins/tricium/tricium.jar
bazel build plugins/tricium

# Copy the built plugin into the testsite directory. The .jar file in the
# destination directory is set as read-only, so it has to be force-removed.
rm -f "${GERRIT_TESTSITE_DIR}/plugins/tricium.jar"
cp bazel-genfiles/plugins/tricium/tricium.jar \
    "${GERRIT_TESTSITE_DIR}/plugins/tricium.jar"

# Gerrrit docs say to use the same Java version that Bazel used for the build.
"$(bazel info output_base)/external/local_jdk/bin/java" \
    -jar bazel-bin/gerrit.war daemon -d "${GERRIT_TESTSITE_DIR}" \
    --console-log

popd
