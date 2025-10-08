#!/bin/bash

set -euo pipefail

./$1 --config $2 \
  --dir 'plugins/tricium/web/_bazel_ts_out_tests' \
  --test-files 'plugins/tricium/web/_bazel_ts_out_tests/*_test.js' \
  --ts-config="plugins/tricium/web/tsconfig.json"
