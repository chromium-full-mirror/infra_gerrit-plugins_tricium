# Tricium Plugin for Gerrit

Tricium is a code analysis service for Chromium. The purpose of this plugin is
to display progress of analyzers running via Tricium.

## Usage

This plugin is configured via the `tricium.config` file present in the
repo's `refs/meta/config` ref. This file uses git config format, and is
expected to have a "host" section with a "tricium" setting, e.g.

```
[host]
  tricium = tricium-prod.appspot.com
```

## Development

You can create a local instance of Gerrit and use this plugin in that instance.

To build, check out the gerrit repo and create a symlink to the Tricium plugin
directory in the gerrit plugins directory:

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

### Running a Local Gerrit Instance

To test locally, [setup a Gerrit test
site](https://gerrit-review.googlesource.com/Documentation/dev-readme.html).
Below we assume that the test site directory is `../gerrit_testsite`.

Rebuild the Tricium plugin jar; to ensure that it is rebuilt even if there
are only static resource file changes, you may need to remove the .jar file:

```
rm -f bazel-genfiles/plugins/tricium/tricium.jar
rm -f ../gerrit_testsite/plugins/tricium.jar
bazel build gerrit
bazel build plugins/tricium
cp bazel-genfiles/plugins/tricium/tricium.jar ../gerrit_testsite/plugins/
```

Run the Gerrit server, using the same version of Java used to build Gerrit:

```
out_base=$(bazel info output_base)
$out_base/external/local_jdk/bin/java -jar bazel-bin/gerrit.war daemon \
    -d ../gerrit_testsite --console-log --show-stack-trace
```

Among the logs you should see a line including a message like "Loaded plugin
tricium". You may then navigate to a change page in the local instance (you may
need to make one if you haven't already) and you should see the plugin loaded
on page.

Each time you update Tricium, you must rebuild and copy the jar file into the
test site plugin directory and restart Gerrit. You may need to hard-reload the
page in your browser so cached resources aren't used.

### Running web component tests

First, dependencies must be installed via bower. This creates a
`bower_components` directory which shouldn't be checked in:

```
npm install -g bower
npm install -g web-component-tester
cd test/
bower install
```

Then, you can run all of the tests from the tricium plugin directory root with
the `wct` command with no arguments. See `wct --help` for more options related
to running the tests. Alternatively, you can run a server to interactively run
the tests with `polymer serve`.
