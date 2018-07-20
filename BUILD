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

polygerrit_plugin(
    name = "tricium_ui",
    srcs = glob([
        "src/main/resources/static/*.html",
        "src/main/resources/static/*.js",
    ]),
    app = "src/main/resources/static/tricium.html",
)
