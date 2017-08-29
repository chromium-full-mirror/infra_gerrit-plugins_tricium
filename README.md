# Tricium Plugin for Gerrit

Tricium is a code analysis service for Chromium. The purpose of this plugin is
to display progress of analyzers running via Tricium.

## Development

To build, check out the gerrit repo and create a symlink to the root of the Tricium
plugin directory in the plugins directory:

```
$ git clone https://gerrit.googlesource.com/gerrit
$ cd gerrit
$ ln -s /path/to/tricium/plugin/root plugins/tricium
```

If needed, [install bazel](https://bazel.build/), and then build from the gerrit repo root:

```
$ bazel build plugins/tricium
```

This will create a tricium plugin jar under bazel-genfiles/plugins/tricium.


## Testing
 
To test locally, [setup a Gerrit test site](https://git.eclipse.org/r/Documentation/dev-readme.html).

Then, replace the Tricium plugin jar in the test site plugin dir and run the Gerrit daemon:

```
$ rm -f gerrit_testsite/plugins/tricium.jar
$ cp bazel-genfiles/plugins/tricium/tricium.jar gerrit_testsite/plugins/
$ bazel build gerrit && $(bazel info output_base)/external/local_jdk/bin/java -jar bazel-bin/gerrit.war daemon -d ../gerrit_testsite --console-log --show-stack-trace
```
