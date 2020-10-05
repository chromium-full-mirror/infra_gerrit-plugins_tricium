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

```
npm run wct-test
```

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

To bypass this issue, follow the instructions below:
1. Install the [Gerrit Dev Helper extension][4]. After downloading the plugin,
navigate to a CL with Tricium comments on Chrome. Click the plugin icon on the
top right to enable the plugin. Click the icon again to display a configuration
menu.
2. Add
`http://localhost:8081/plugins/tricium/src/main/resources/static/tricium.html`
to the `injectHtmlCode` field. Note that the port might not be 8081 depending on
how you started the local server. Make sure you use the correct port number.
3. Disable the bundled plugins.
  a. Find the URL of the bundled plugins, which looks something like
  `https://cdn.googlesource.com/polygerrit_assets/282.0/2194a55.html`, but
  may have a different version and hash. You can search for the correct link
  in the "Network" section of Chrome's developer console.
  b. In the configuration menu for the Gerrit Dev Helper extension, add a rule
  to block all requests to the polygerrit assets link you found before.
4. If necessary, add a rule to redirect
`https://chromium-review.googlesource.com/plugins/tricium/static/tricium.html`
to
`http://localhost:8081/plugins/tricium/src/main/resources/static/tricium.html`.
5. Reload the page. You should see Gerrit using your local version of the
plugin.

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
[4]: https://gerrit.googlesource.com/gerrit-fe-dev-helper/+/HEAD/README.md
