#!/bin/bash
#
# This script rebuilds the Tricium plugin and restarts Gerrit.
#
# Usage: Invoke with no arguments: ./reload-gerrit.sh
#
# This script assumes that it is run from <gerrit>/plugins/tricium, where
# <gerrit> is a checkout of the Gerrit repo. By default it uses a testsite
# directory called "gerrit_testsite" along-side the gerrit directory; this
# can be overridden by setting GERRIT_TESTSITE.

here=$(dirname "$0")
gerrit=$(realpath "$here/../..")
testsite=$(realpath "${GERRIT_TESTSITE:-$gerrit/../gerrit_testsite}")
echo "Using $gerrit as Gerrit directory."
echo "Using $testsite as Gerrit testsite directory."

# Move to the Gerrit directory so that Bazel can find the workspace.
pushd "$gerrit"

# We want to force re-build even if only static files changed.
rm -f bazel-genfiles/plugins/tricium/tricium.jar
bazel build plugins/tricium

# Copy the built plugin into the testsite directory. The .jar file in the
# destination directory is set as read-only, so it has to be force-removed.
rm -f "$testsite/plugins/tricium.jar"
cp bazel-genfiles/plugins/tricium/tricium.jar "$testsite/plugins/tricium.jar"

# Gerrrit docs say to use the same Java version that Bazel used for the build.
"$(bazel info output_base)/external/local_jdk/bin/java" \
    -jar bazel-bin/gerrit.war daemon -d "$testsite" --console-log

popd
