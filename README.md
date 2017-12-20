# Tricium Plugin for Gerrit

Tricium is a code analysis service for Chromium. The purpose of this plugin is
to display progress of analyzers running via Tricium.

## Project Configuration

This plugin is configured via the `tricium.config` file present in the
repo's `refs/meta/config` ref. This file uses git config format. Example:

```
[host]
  tricium = tricium-prod.appspot.com
```

## Development

### Checking out the code

To check out the Tricium plugin code:

```
git clone https://chromium.googlesource.com/infra/gerrit-plugins/tricium
```

### Running web component tests

The plugin's unit tests are [web-component-tester unit tests][1]. Dependencies
must be installed via bower; this creates a `bower_components` directory, which
shouldn't be checked in.

```
npm install -g bower
npm install -g web-component-tester
cd test/
bower install
```

These tests can be run from the tricium plugin directory root with the `wct`
command with no arguments. See `wct --help` for more options.

### Previewing UI with a static server

With a local static web server, such as the one provided by [Polymer
CLI][2], you can also view and tweak UI interactively.

To install the Polymer tool-set, run `npm install -g polymer-cli`.

After running `polymer serve`, you can view an example of how the
tricium-element appears by navigating to
http://localhost:8081/components/tricium/tests/example.html.

### Testing with Gerrit

You can create a local instance of Gerrit and use this plugin in that instance.
To build, check out the gerrit repo:

```
git clone --recursive https://gerrit.googlesource.com/gerrit
```

If needed, [install bazel](https://bazel.build/), and then build from the
Gerrit repo root with `bazel build plugins/tricium`.

This will create a Tricium plugin jar file at
`bazel-genfiles/plugins/tricium/tricium.jar`.

### Running a local Gerrit instance

To test locally with a local instance of Gerrit, you must first [set up a
Gerrit test site][3]. To build the tricium plugin in Gerrit, it is assumed
that the tricium directory is iniside the gerrit plugins directory:

```
cd gerrit
ln -s /path/to/tricium/plugin/root plugins/tricium
bazel build plugins/tricium
```

Then, the local site can be started with Tricium
by running [run-with-testsite.sh](./run-with-testsite.sh).

### Running with PolyGerrit UI and production data

The Gerrit repo includes a script for trying the PolyGerrit UI with a local
server local plugins but with production data. See
[run-with-prod-data.sh](./run-with-prod-data.sh).

[1]: https://www.polymer-project.org/1.0/docs/tools/tests
[2]: https://www.polymer-project.org/1.0/docs/tools/polymer-cli
[3]: https://gerrit-review.googlesource.com/Documentation/dev-readme.html
