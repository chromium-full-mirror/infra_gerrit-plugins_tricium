// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {triciumFeedbackButtonTemplate} from './tricium-feedback-button.html.js';
import {TriciumV1Client} from './tricium-client.js';

class TriciumFeedbackButton extends Polymer.Element {
  static get template() {
    return triciumFeedbackButtonTemplate
  }
  static get is() {
    return 'tricium-feedback-button';
  }

  static get properties() {
    return {
      triciumHost: String,
      triciumClient: Object,
      plugin: Object,
      comment: Object,
      hidden: {
        type: Boolean,
        value: true,
      },
      disabled: {
        type: Boolean,
        value: true,
      },
      buttonText: {
        type: String,
        value: 'Not useful',
      },
      bugLinkURL: {
        type: String,
        value: ('https://bugs.chromium.org/p/chromium/issues/entry'+
                '?components=Infra%3EPlatform%3ETricium'),
      },
    }
  }

    /** Upon attachment in the page, initialize the element. */
  connectedCallback() {
    super.connectedCallback();
    if (!this.comment) {
      console.warn('tricium-feedback-button attached without comment');
      return;
    }
    if (!this.comment.robot_run_id) {
      return; // Not a robot comment.
    }
    // The email addresses for the tricium service accounts are
    // tricium-{dev,prod}@appspot.gserviceaccount.com.
    // If this is not a Tricium robot comment, don't show a button.
    if (!this.comment || !this.comment.author || !this.comment.author.email
        || !this.comment.author.email.startsWith('tricium-')) {
      return;
    }
    this.init();
  }

  /** Load config and set tricium host name. */
  async init() {
    const project = this.getProjectName();
    if (!project) {
      console.warn('tricium-feedback-button could not find project name');
      return;
    }
    const pluginName = this.plugin.getPluginName();
    const config = await this.plugin.restApi().get(
        `/projects/${encodeURIComponent(project)}/` +
        `${encodeURIComponent(pluginName)}~config`);
    if (config && config.triciumHost) {
      this.triciumHost = config.triciumHost;
      this.hidden = false;
      this.disabled = false;
      this.triciumClient = new TriciumV1Client(this.triciumHost);
    } else {
      console.warn(`No config found for project "${project}", ` +
          `plugin "${pluginName}", cannot report feedback.`);
    }
    return Boolean(this.triciumHost);
  }

  /** Enables stubbing current URL in unit tests */
  getCurrentUrl() {
    return window.location.href;
  }

  /** Fetch the project name for the current change. */
  getProjectName() {
    // We use a roundabout way of getting the project name because we don't
    // have access to the change object.
    // TODO(qyearsley): Find a better way to get the project name.
    const url = this.getCurrentUrl();
    // Get the project name between the /c/ and /+/ fields in the URL
    const projectMatches = url.match(/\/c\/(.*)\/\+\//);
    if (!projectMatches || projectMatches.length <= 1) {
      console.warn(`Could not get project name from URL "${url}"`);
      return '';
    }
    return projectMatches[1];
  }

  /** Report to the tricium server that this comment was not useful. */
  async reportNotUseful() {
    if (this.disabled) {
      console.warn('reportNotUseful called on disabled button');
      return Promise.reject(new Error('unexpected reportNotUseful call'));
    }
    this.disabled = true;
    try {
      const response = await this.triciumClient.reportNotUseful(this.comment);
      this.bugLinkURL = this.constructBugLinkURL(response);
      this.buttonText = 'Reported not useful';
      this.$.buglink.hidden = false;
      return response;
    } catch (err) {
      this.dispatchEvent(new CustomEvent('show-alert', {
        detail: {message: 'Failed to report not useful'},
        bubbles: true,
      }));
      this.disabled = false;
      return Promise.reject(new Error('failed reportNotUseful call'));
    }
  }

  constructBugLinkURL(response) {
    const params = new URLSearchParams();
    params.set('summary', `Issue report for ${this.comment.robot_id}`);
    params.set(
        'description',
        `https://${this.triciumHost}/run/${this.comment.robot_run_id}`);
    params.set('components', 'Infra>Platform>Tricium');
    if (response.monorailComponent) {
      params.set('components', response.monorailComponent);
    }
    if (response.owner) {
      params.set('cc', response.owner);
    }
    const base = 'https://bugs.chromium.org/p/chromium/issues/entry';
    return base + '?' + params.toString();
  }
}

customElements.define(TriciumFeedbackButton.is, TriciumFeedbackButton);
