load("//tools/bzl:plugin.bzl", "gerrit_plugin")

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
