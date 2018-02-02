// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
  'use strict';

  Polymer({
    is: 'tricium-feedback-button',

    properties: {
      triciumHost: String,
      plugin: Object,
      comment: Object,
      view: Object,
      disabled: {
        type: Boolean,
        value: true,
      },
    },

    /** Upon attachment in the page, initialize the element. */
    attached() {
      if (!this.comment) {
        console.warn('tricium-feedback-button attached without comment');
        return;
      }
      // The email addresses for the tricium service accounts are
      // tricium-{dev,prod}@appspot.gserviceaccount.com.
      // If this is not a Tricium robot comment, don't show a button.
      if (!this.comment.author.email.startsWith('tricium-')) {
        return;
      }
    },

    /** Load config and set tricium host name. */
    init() {
      const project = this.getProjectName();
      if (!project) {
        console.warn('tricium-feedback-button could not find project name');
        return;
      }
      const plugin = this.plugin.getPluginName();
      return this.$.client.getConfig(project, plugin).then((config) => {
        if (config && config.triciumHost) {
          this.triciumHost = config.triciumHost;
          this.disabled = false;
        } else {
          console.warn(`No config found for project "${project}", ` +
                       `plugin "${plugin}", cannot report feedback.`);
        }
        return Boolean(this.triciumHost);
      });
    },

    /** Fetch the project name for the current change. */
    getProjectName() {
      // TODO(qyearsley): Find a better way to get the project name.
      const elements = document.getElementsByTagName('gr-diff');
      if (elements.length == 0) {
        console.warn('no gr-diff element found on page');
        return '';
      }
      return elements[0].projectName;
    },

    /** Report to the tricium server that this comment was not useful. */
    reportNotUseful() {
      if (this.disabled) {
        console.warn('reportNotUseful called on disabled tricium-feedback-button');
        return Promise.reject();
      }
      return this.$.client.reportNotUseful(this.comment);
    },
  });
})();
