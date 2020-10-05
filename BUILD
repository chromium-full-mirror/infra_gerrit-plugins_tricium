load("@npm//@bazel/rollup:index.bzl", "rollup_bundle")
load("//tools/bzl:plugin.bzl", "gerrit_plugin")
load("//tools/bzl:js.bzl", "polygerrit_plugin")

gerrit_plugin(
    name = "tricium",
    srcs = glob(["src/main/java/**/*.java"]),
    manifest_entries = [
        "Gerrit-PluginName: tricium",
        "Gerrit-Module: com.googlesource.chromium.plugins.tricium.TriciumModule",
        "Implementation-Title: Tricium plugin",
        "Implementation-URL: https://chromium.googlesource.com/infra/gerrit-plugins/tricium",
    ],
    resources = glob(["src/main/**/*"]),
)

rollup_bundle(
    name = "tricium-bundle",
    srcs = glob(["src/main/resources/static/*.js"]),
    entry_point = "src/main/resources/static/tricium.js",
    rollup_bin = "//tools/node_tools:rollup-bin",
    sourcemap = "hidden",
    deps = [
        "@tools_npm//rollup-plugin-node-resolve",
    ],
)

polygerrit_plugin(
    name = "tricium_ui",
    app = "tricium-bundle.js",
    plugin_name = "tricium",
)
