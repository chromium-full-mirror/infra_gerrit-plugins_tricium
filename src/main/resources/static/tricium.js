// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

Gerrit.install((plugin) => {
  // Only supported in PolyGerrit.
  if (!window.Polymer) { return; }
  Polymer.Base.importHref(plugin.url('/static/tricium-feedback-button.html'), () => {
    plugin.registerCustomComponent('robot-comments-controls', 'tricium-feedback-button');
  }, (err) => {
    console.error(`Failed to load tricium-feedback-button: ${err}`);
  });

  Polymer.Base.importHref(plugin.url('/static/tricium-view.html'), () => {
    plugin.registerCustomComponent('change-view-integration', 'tricium-view');
  }, (err) => {
    console.error(`Failed to load tricium-view: ${err}`);
  });
});
