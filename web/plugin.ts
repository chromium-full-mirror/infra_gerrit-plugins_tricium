// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const platformJsElement = document.createElement('script');
platformJsElement.setAttribute(
      'src', 'https://apis.google.com/js/platform.js');
document.head.appendChild(platformJsElement);

import {initAuth} from './auth.js';
import {TriciumV1Client} from './tricium-client.js';
import './tricium-feedback-button.js';

Gerrit.install(async (plugin) => {
    initAuth(plugin, platformJsElement);
    plugin.registerCustomComponent(
        'robot-comment-controls', 'tricium-feedback-button');
});

// Export TriciumV1Client to global space so other plugins can use it.
// TODO(https://crbug.com/1087585): remove global variables
window.tricium = window.tricium || {};
Object.assign(window.tricium, {
  TriciumV1Client,
});
