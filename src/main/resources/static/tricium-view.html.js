// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const triciumViewTemplate = Polymer.html`
  <style include="gr-change-view-integration-shared-styles">
    #view-container {
      display: block;
    }
    .container {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
    }
    /** Header only, no content so remove the bottom border. */
    .header {
      border-bottom: 0px;
    }
  </style>

  <div id="view-container" hidden$="[[_hidden]]">
    <div class="header container">
      <div class="container">
        <h3 class="label">[[_computeTitleText(_response)]]</h3>
        <a href="[[_computeRunURL(_response)]]" target="_blank"
           hidden$="[[!_computeRunURL(_response)]]">
          [[_computeRunText(_response)]]
        </a>
      </div>
      <div class="container">
        <gr-button link on-tap="_handleFileBugTap">File Bug</gr-button>
      </div>
    </div>
  </div>`;
