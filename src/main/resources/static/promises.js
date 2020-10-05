// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// This was copied from the buildbucket plugin.
// TODO(crbug.com/928553): Move this to a separate plugin.

/** Implements Promise utility functions. */

/** Returns a promise that rejects after the timeout.
 *
 * @param {number} timeoutMs Milliseconds before timeout.
 * @returns {Promise} promise that rejects after the timeout.
 */
export function timeout(timeoutMs) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });
}

/** Decorates the promise with a rejection on timeout.
 *
 * @param {Promise} promise to decorate.
 * @param {number} timeoutMs Milliseconds before timeout.
 * @returns {Promise} decorated promise that rejects on timeout.
 */
export function addTimeout(promise, timeoutMs) {
  return Promise.race([promise, timeout(timeoutMs)]);
}
