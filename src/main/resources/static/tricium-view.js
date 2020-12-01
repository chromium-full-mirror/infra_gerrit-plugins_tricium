// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {triciumViewTemplate} from './tricium-view.html.js';
import {TriciumV1Client} from './tricium-client.js';

// Constants determining update behavior.
// Tricium polls for new patchsets once per minute; it is expected that
// results should be available after a couple of minutes.
// In practice, if there are results, they'll usually be available
// on the first request; if there are not, then there never will be.
const DEFAULT_UPDATE_INTERVAL_MS = 1000 * 5;
const MAX_UPDATE_INTERVAL_MS = 1000 * 60 * 5;
const MAX_UPDATE_DELAY_MS = 1000 * 60;

class TriciumView extends Polymer.Element {
  static get template() {
    return triciumViewTemplate;
  }

  static get is() {
    return 'tricium-view';
  }

  static get properties() {
    return {
      triciumHost: String,
      triciumClient: String,
      plugin: Object,
      change: Object,
      revision: {
        type: Object,
        observer: 'reload',
      },

      _hidden: {
        type: Boolean,
        value: false,
      },
      // How long to keep trying to update after initialization.
      _maxUpdateDelayMs: {
        type: Number,
        value: MAX_UPDATE_DELAY_MS,
      },
      _needsUpdate: {
        type: Boolean,
        value: false,
      },
      // Response is a ProgressResponse or null; see https://goo.gl/rA5H1m.
      _response: Object,
      _updateIntervalMs: {
        type: Number,
        value: DEFAULT_UPDATE_INTERVAL_MS,
      },
      // Start time is the time that this element was loaded,
      // used to determine how long we've been trying to update.
      _startTime: Date,
      _updateTimeoutID: Number,
    }
  }


  constructor() {
    super();
    this._boundListener = this._handleVisibilityChange.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this._handleVisibilityChange);
    if (!this.change || !this.revision) {
      console.warn('element attached without change and revision set.');
      return;
    }

    // If the change is merged, use the previous revision,
    // since Tricium doesn't run on merged changes.
    const lastNumber = this.revision._number;
    if (this.change.status == 'MERGED') {
      for (const id in this.change.revisions) {
        const r = this.change.revisions[id];
        if (r._number == lastNumber - 1) {
          this.revision = r;
        }
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(
        'visibilitychange', this._handleVisibilityChange);
    this._clearUpdateTimeout();
  }

  /**
   * Reset the state of the element, then fetch and display progress.
   *
   * @return {Promise} Resolves upon completion.
   */
  async reload() {
    this._hidden = true;
    this._response = null;
    this._startTime = new Date();

    const project = this.change.project;
    const pluginName = this.plugin.getPluginName();
    const config = await this.plugin.restApi().get(
        `/projects/${encodeURIComponent(project)}/` +
        `${encodeURIComponent(pluginName)}~config`);
    if (config && config.triciumHost) {
      this.triciumHost = config.triciumHost;
      this.triciumClient = new TriciumV1Client(this.triciumHost);
    } else {
      console.info(
        `No config found for project "${project}", ` +
        `plugin ${pluginName}, not fetching Tricium Progress.`);
    }
    if (this.triciumHost) {
      await this._update();
      this._hidden = false;
    }
  }

  /**
   * Fetch current progress state and update properties.
   *
   * If not all Tricium analyzers are finished yet, this will
   * set a timeout to update again later.
   *
   * It is assumed that this will only be called if the Tricium
   * host is configured.
   *
   * @return {Promise} Resolves upon completion.
   */
  async _update() {
    const now = new Date();
    if (Number(this._startTime) + this._maxUpdateDelayMs < Number(now)) {
      this._clearUpdateTimeout();
      return;
    }
    try {
      const response = await this.triciumClient.getProgress(
          this.change, this.revision);
      this._updateState(response);
    } catch (err) {
      this._updateIntervalMs = Math.min(
          MAX_UPDATE_INTERVAL_MS,
          (1 + Math.random()) * this._updateIntervalMs * 2);
      console.warn(err);
    }
    this._resetTimeout();
  }

  /**
   * Update element state based on the given fetched progress.
   */
  _updateState(response) {
    this._response = response;
    this._updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS;
  }

  /** Set a timeout to update again if applicable. */
  _resetTimeout() {
    this._clearUpdateTimeout();
    // If all analyzers are finished, then the results won't change
    // again for this patch set.
    if (this._isDone()) {
      return;
    }
    this._updateTimeoutID = window.setTimeout(
        this._updateTimeoutFired.bind(this),
        this._updateIntervalMs);
  }

  _clearUpdateTimeout() {
    if (this._updateTimeoutID) {
      window.clearTimeout(this._updateTimeoutID);
      this._updateTimeoutID = null;
    }
  }

  /**
   * Check whether we are done requesting results from Tricium.
   *
   * Since we just show a run ID with a link, we are done as soon
   * as we get any valid response.
   *
   * @return {Boolean} True when we are done requesting results.
   */
  _isDone() {
    return Boolean(this._response && this._response.runId);
  }

  _handleVisibilityChange(e) {
    if (!document.hidden && this._needsUpdate) {
      this._update();
      this._needsUpdate = false;
    }
  }

  _handleFileBugTap(e) {
    // Warning: window.open is safe only if the arguments are hard-coded and
    // unchanged.
    window.open(
        ('https://bugs.chromium.org/p/chromium/issues/entry' +
         '?components=Infra%3EPlatform%3ETricium'),
        '_blank');
  }

  _updateTimeoutFired() {
    if (document.hidden) {
      this._needsUpdate = true;
      return;
    }
    this._update();
  }

  /** Return a string to show as the bold title in the UI. */
  _computeTitleText(response) {
    if (!response) {
      return 'No Tricium Results';
    }
    return 'Tricium';
  }

  /** Return a URL for viewing run details. */
  _computeRunURL(response) {
    if (!response || !response.runId || !this.triciumHost) {
      return '';
    }
    return `https://${this.triciumHost}/run/${response.runId}`;
  }

  /** Return a string describing the run ID. */
  _computeRunText(response) {
    if (!response || !response.runId) {
      return '';
    }
    return `Run ${response.runId}`;
  }

  /**
   * Mockable equivalent of window.tricium.getAccessToken.
   */
  _getAccessToken() {
    return window.tricium.getAccessToken();
  }
}

customElements.define(TriciumView.is, TriciumView);
