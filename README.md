# Tricium Plugin for Gerrit

Tricium is a code analysis service for Chromium. The purpose of this plugin is
to display progress of analyzers running via Tricium.

## Usage

This plugin is configured via the `project.config` file present in the
repo's `refs/meta/config` ref. This file uses git config format. To
configure tricium, add a section like:

```
[plugin "tricium"]
  triciumHost = tricium-prod.appspot.com
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
are only static resource file changes, you may need to remove the .jar file;
then run the Gerrit server, using the same version of Java used to build Gerrit.

See the [reload-gerrit.sh](./reload-gerrit.sh) script for specific steps.

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
to running the tests.

### Previewing UI with a static server

With a local static web server, such as the one provided by [Polymer
CLI](https://www.polymer-project.org/1.0/docs/tools/polymer-cli), you can also
view and tweak UI interactively.

To install the Polymer tool-set, run `npm install -g polymer-cli`.

After running `polymer serve`, you can view an example of how the
tricium-element appears by navigating to:
http://localhost:8081/components/tricium/src/main/resources/static/example.html
