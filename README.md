# Tricium Plugin for Gerrit

Tricium is a code analysis service for Chromium. The purpose of this plugin is
to integrate with the Gerrit UI, e.g. by displaying progress of analyzers.

## Checking out the code

This plugin must be placed inside the Gerrit plugins directory. To check out
the Tricium plugin code:

    git clone --recurse-submodules https://gerrit.googlesource.com/gerrit
    cd gerrit/plugins
    git clone https://chromium.googlesource.com/infra/gerrit-plugins/tricium

## Development

Run the commands below in web/.

### Running the tests

For running unit tests execute:

    make test

For checking or fixing eslint formatter problems run:

    make lint_test
    make lint_fix

#### Running with PolyGerrit UI and production data

For testing the plugin with
[Gerrit FE Dev Helper](https://gerrit.googlesource.com/gerrit-fe-dev-helper/)
the command below builds the JavaScript bundle and copies it to the `plugins/tricium` folder:

    make build

and let the Dev Helper redirect from `.+/plugins/tricium/static/tricium.js` to
`http://localhost:8081/plugins_/plugins/tricium.js`.

## Project Configuration

This plugin is configured via the `tricium.config` file present in the repo's
`refs/meta/config` ref. This file uses git config format. Example:

```
[host]
  tricium = tricium-prod.appspot.com
```
