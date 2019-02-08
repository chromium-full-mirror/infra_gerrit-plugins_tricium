// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Implements Promise utility functions.
 *
 * This was copied from the buildbucket plugin.
 */
(function() {
  'use strict';

  /**
   * Asserts that the given promise will rejected.
   *
   * @param {Error|string|RegExp} expectedReason Expected rejection reason.
   *   If RegExp or string, then rejection reason is expected to have message
   *   property (like Error) that matches the expected reason.
   */
  async function assertRejects(promise, expectedReason = null) {
    try {
      await promise;
      assert.fail('exception', 'no exception');
    } catch (actualReason) {
      if (expectedReason) {
        if (expectedReason instanceof RegExp) {
          assert.match(actualReason.message, expectedReason);
        } else if (typeof expectedReason == 'string') {
          assert.equal(actualReason.message, expectedReason);
        } else {
          assert.deepEqual(actualReason, expectedReason);
        }
      }
    }
  }

  function deepFreeze(obj) {
    for (const p of Object.keys(obj)) {
      const v = obj[p];
      if (typeof v == 'object' && v !== null) {
        deepFreeze(v);
      }
    }
    return Object.freeze(obj);
  }

  window.tricium = window.tricium || {};
  window.tricium.test = window.tricium.test || {};
  Object.assign(window.tricium.test, {
    assertRejects,
    deepFreeze,
  });
})();
