// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Implements Promise utility functions.
 *
 * This was copied from the buildbucket plugin.
 * TODO(crbug.com/928553): Move this to a separate plugin.
 */

(function() {
  'use strict';

  /** Return a promise that rejects after the timeout. */
  function timeout(timeoutMs) {
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
  }

  /** Decorates the promise with a rejection on timeout. */
  function addTimeout(promise, timeoutMs) {
    return Promise.race([promise, timeout(timeoutMs)]);
  }

  window.tricium = window.tricium || {};
  window.tricium.promises = window.tricium.promises || {};
  Object.assign(window.tricium.promises, {
    timeout,
    addTimeout,
  });
})();
