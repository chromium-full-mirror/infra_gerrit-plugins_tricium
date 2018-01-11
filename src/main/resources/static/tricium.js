// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

if (window.Polymer) {
  Gerrit.install((plugin) => {
    const path = '/static/tricium-view.html';
    Polymer.Base.importHref(plugin.url(path), () => {
      plugin.registerCustomComponent('change-view-integration', 'tricium-view');
    }, (err) => {
      console.error(`Failed to load tricium-view: ${err}`);
    });
  });
}

