# Tricium Plugin for Gerrit

Tricium is a code analysis service for Chromium. The purpose of this plugin is
to integrate with the Gerrit UI, e.g. by displaying progress of analyzers.

## Development

### Checking out the code

To check out the Tricium plugin code:

```
git clone https://chromium.googlesource.com/infra/gerrit-plugins/tricium
```

### Running the tests

The unit tests of the plugin are [web-component-tester unit tests][1].
Dependencies are specified in bower.json and can be installed by running
`bower install` in this directory. This requires [bower to be
installed](https://bower.io/#install-bower).

To run the tests, run `wct` from this directory.  See `wct --help`
for more options.

### Previewing UI with a static server

With a local static web server, such as the one provided by [Polymer CLI][2],
you can also view and tweak UI interactively.

To install the Polymer tool-set globally, run `npm install -g polymer-cli`.

After running `polymer serve`, you can view an example of how the
tricium-view element appears by navigating to
http://localhost:8081/components/tricium/test/example.html.

### Integration testing with Gerrit

You can create a local instance of Gerrit and use this plugin in that instance.

If needed, [install bazel](https://bazel.build/), and then build from the Gerrit
repo root with `bazel build plugins/tricium`.

#### Running with PolyGerrit UI and production data

The Gerrit repo includes a script for trying the PolyGerrit UI with a local
server local plugins but with production data. See
[run-with-prod-data.sh](./run-with-prod-data.sh).

To set up to run PolyGerrit with a local copy of the plugin, first get
the Gerrit repo:

```
git clone --recursive https://gerrit.googlesource.com/gerrit
```

Then move or link the Tricium repo so it's inside the `gerrit/plugins/`
directory, e.g. `mv tricium gerrit/plugins/`.

Known issue: with a locally run PolyGerrit, you can't log in, which
means robot comment actions (e.g. the "not useful" button) aren't visible
by default.

#### Running a local Gerrit instance

It's also possible to test with a local instance of Gerrit.

To do this you must [set up a Gerrit test site][3]. To build the tricium plugin
in Gerrit, it is assumed that the tricium directory is iniside the gerrit
plugins directory.

Then, the local site could be started with Tricium by running
[run-with-testsite.sh](./run-with-testsite.sh).

## Project Configuration

This plugin is configured via the `tricium.config` file present in the repo's
`refs/meta/config` ref. This file uses git config format. Example:

```
[host]
  tricium = tricium-prod.appspot.com
```

[1]: https://www.polymer-project.org/1.0/docs/tools/tests
[2]: https://www.polymer-project.org/1.0/docs/tools/polymer-cli
[3]: https://gerrit-review.googlesource.com/Documentation/dev-readme.html
