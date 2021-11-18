# Tricium Plugin for Gerrit

Tricium is a code analysis service for Chromium. The purpose of this plugin is
to integrate with the Gerrit UI, e.g. by displaying progress of analyzers.

## Development

### Checking out the code

This plugin must be placed inside the Gerrit plugins directory. To check out
the Tricium plugin code:

    git clone --recurse-submodules https://gerrit.googlesource.com/gerrit
    cd gerrit/plugins
    git clone https://chromium.googlesource.com/infra/gerrit-plugins/tricium

### Running the tests

For running unit tests execute:

    bazel test --test_output=all //plugins/tricium/web:karma_test

For checking or fixing eslint formatter problems run:

    bazel test //plugins/tricium/web:lint_test
    bazel run //plugins/tricium/web:lint_bin -- --fix "$(pwd)/plugins/tricium/web"

#### Running with PolyGerrit UI and production data

For testing the plugin with
[Gerrit FE Dev Helper](https://gerrit.googlesource.com/gerrit-fe-dev-helper/)
build the JavaScript bundle and copy it to the `plugins/tricium` folder:

    bazel build //plugins/tricium/web:tricium
    cp -f bazel-bin/plugins/tricium/web/tricium.js plugins/tricium

and let the Dev Helper redirect from `.+/plugins/tricium/static/tricium.js` to
`http://localhost:8081/plugins_/plugins/tricium.js`.

## Project Configuration

This plugin is configured via the `tricium.config` file present in the repo's
`refs/meta/config` ref. This file uses git config format. Example:

```
[host]
  tricium = tricium-prod.appspot.com
```
