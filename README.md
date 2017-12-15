# Tricium plugin for Gerrit

Tricium is a code analysis service for Chromium; this plugin supports the integration of a Tricium service and a Gerrit code review instance.

## Project Configuration

If the Tricium plugin is enabled for your Gerrit host, it can be enabled for a
particular project via the `project.config` file present in the project's
`refs/meta/config` reference, by adding a section like this:

```
[plugin "tricium"]
  triciumHost = tricium-prod.appspot.com
```

## Development

### Checking out the code

To check out the Tricium plugin code:

```
git clone https://chromium.googlesource.com/infra/gerrit-plugins/tricium
```

### Running unit tests

The plugin's unit tests are web-component-tester unit tests[1]. Dependencies
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

### Running the Polymer static server

With a local static web server, such as the one provided by [Polymer CLI][2] you
can also view and tweak the UI interactively. To install the Polymer CLI
tool-set:

```
npm install -g polymer-cli
```

After running `polymer serve` in the Tricium root repo, you can view an example
of the element outside of a Gerrit change page by navigating to
http://localhost:8081/components/tricium/test/example.html.

### Running with a local Gerrit instance

To test the plugin locally with Gerrit, you must first checkout the Gerrit; see
the [Gerrit Developer Setup docs][3]. To test with your own instance of Gerrit
you must set up a Gerrit test site according to the docs.

The local intance can be started with the plugin via
[run-gerrit-testsite.sh](./run-gerrit-testsite.sh), with environment variables
set to point to the site directory and Gerrit directory.

```
GERRIT_TESTSITE=~/gerrit_testsite GERRIT=~/gerrit ./run-gerrit-testsite.sh
```

### Running with PolyGerrit UI and production data

The Gerrit repo includes a script for trying the PolyGerrit UI with a local
server local plugins but with production data. The Tricium plugin directory

Apart from a Gerrit checkout, this also depends on vulcanize and polymer-cli:

```
npm install -g polymer-cli
npm install -g vulcanize
```

To run the local server, set the environment variable GERRIT and run the
[run-server.sh](./run-server.sh) script:

```
GERRIT=~/gerrit ./run-server.sh
```

[1]: https://www.polymer-project.org/1.0/docs/tools/tests
[2]: https://www.polymer-project.org/1.0/docs/tools/polymer-cli
[3]: https://gerrit-review.googlesource.com/Documentation/dev-readme.html
