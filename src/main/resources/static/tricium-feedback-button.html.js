// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const triciumFeedbackButtonTemplate = Polymer.html`
  <style>
    #buglink {
      color: var(--link-color);
    }
  </style>
  <gr-button
      class="action"
      hidden$="[[hidden]]"
      on-tap="reportNotUseful"
      disabled$="[[disabled]]"
      link>[[buttonText]]</gr-button>
  <a id="buglink" href="[[bugLinkURL]]" target="_blank" hidden>File a Bug</a>`;
