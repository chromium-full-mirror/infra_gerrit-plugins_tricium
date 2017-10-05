# Tricium Plugin for Gerrit

Tricium is a code analysis service for Chromium. The purpose of this plugin is
to display progress of analyzers running via Tricium.

## Development Setup

To build, check out the gerrit repo and create a symlink to the root of the
Tricium plugin directory (i.e. the directory where this README file is found)
in the gerrit plugins directory:

```
git clone https://gerrit.googlesource.com/gerrit
cd gerrit
ln -s /path/to/tricium/plugin/root plugins/tricium
```

If needed, [install bazel](https://bazel.build/), and then build from the
Gerrit repo root:

```
bazel build plugins/tricium
```

This will create a Tricium plugin jar file at
`bazel-genfiles/plugins/tricium/tricium.jar`.

## Running a Local Instance

To test locally, [setup a Gerrit test
site](https://gerrit-review.googlesource.com/Documentation/dev-readme.html).
Below we assume that the test site directory is `../gerrit_testsite`.

Then, replace the Tricium plugin jar in the test site plugin directory and run the
Gerrit daemon:

```
rm -f ../gerrit_testsite/plugins/tricium.jar
cp bazel-genfiles/plugins/tricium/tricium.jar ../gerrit_testsite/plugins/
bazel build gerrit
$(bazel info output_base)/external/local_jdk/bin/java -jar \
    bazel-bin/gerrit.war daemon -d ../gerrit_testsite \
    --console-log --show-stack-trace
```

Among the logs you should see a line including a message like "Loaded
plugin tricium". Each time you update Tricium, you must rebuild and copy
the jar file into the test site plugin directory and restart Gerrit. You
may need to hard-reload the page in your browser so cached resources
aren't used.

### Running web-component-tester

First, set up dependencies:

```
npm install -g bower
npm install -g web-component-tester
cd test/
bower install
```

The npm install commands may need to be run as root/administrator.
Then, you can either run all the tests from the tricium directory with the
`wct` command. See `wct --help` for more options related to running the tests.
