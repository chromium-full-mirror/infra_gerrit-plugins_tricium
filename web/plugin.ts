/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import '@gerritcodereview/typescript-api/gerrit';

const platformJsElement = document.createElement('script');
platformJsElement.setAttribute('src', 'https://apis.google.com/js/platform.js');
document.head.appendChild(platformJsElement);

import {initAuth} from './auth';
import './tricium-feedback-button';

window.Gerrit.install(async plugin => {
  initAuth(plugin, platformJsElement);
  plugin.registerCustomComponent(
    'robot-comment-controls',
    'tricium-feedback-button'
  );
});
