load("@npm//@bazel/rollup:index.bzl", "rollup_bundle")
load("//tools/bzl:js.bzl", "polygerrit_plugin")

rollup_bundle(
    name = "tricium-bundle",
    srcs = glob(["*.js"]),
    entry_point = "plugin.js",
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
