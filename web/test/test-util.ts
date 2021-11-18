/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * Implements Promise utility functions.
 *
 * This was copied from the buildbucket plugin.
 */

/**
 * Asserts that the given promise will rejected.
 *
 * @param expectedReason Expected rejection reason.
 *   If RegExp or string, then rejection reason is expected to have message
 *   property (like Error) that matches the expected reason.
 */
export async function assertRejects(
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  promise: Promise<any>,
  expectedReason: Error | string | RegExp | null = null
) {
  try {
    await promise;
    assert.fail('exception', 'no exception');
  } catch (actualReason) {
    if (expectedReason) {
      const message = String(actualReason);
      if (expectedReason instanceof RegExp) {
        assert.match(message, expectedReason);
      } else if (typeof expectedReason === 'string') {
        assert.equal(message, expectedReason);
      } else {
        assert.deepEqual(actualReason, expectedReason);
      }
    }
  }
}
