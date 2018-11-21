// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
  'use strict';

  const DEFAULT_UPDATE_INTERVAL_MS = 1000 * 5;
  const MAX_UPDATE_INTERVAL_MS = 1000 * 60 * 5;

  Polymer({
    is: 'tricium-view',

    properties: {
      triciumHost: String,
      plugin: Object,
      change: Object,
      revision: {
        type: Object,
        observer: 'reload',
      },

      // Response is a ProgressResponse or null; see https://goo.gl/rA5H1m.
      _response: Object,
      _hidden: {
        type: Boolean,
        value: false,
      },
      _loggedIn: {
        type: Boolean,
        value: false,
      },
      _needsUpdate: {
        type: Boolean,
        value: false,
      },
      _updateIntervalMs: {
        type: Number,
        value: DEFAULT_UPDATE_INTERVAL_MS,
      },
      _updateTimeoutID: Number,
    },

    attached() {
      this.listen(document, 'visibilitychange', '_handleVisibilityChange');
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
    },

    detached() {
      this._clearUpdateTimeout();
    },

    /**
     * Reset the state of the element, then fetch and display progress.
     *
     * @return {Promise} Resolves upon completion.
     */
    async reload() {
      this._hidden = true;
      this._response = null;

      const project = this.change.project;
      const plugin = this.plugin.getPluginName();
      const config = await this.$.client.getConfig(project, plugin);
      if (config && config.triciumHost) {
        this.triciumHost = config.triciumHost;
      } else {
        console.info(`No config found for project "${project}", ` +
                     `plugin "${plugin}", not fetching Tricium Progress.`);
      }
      if (this.triciumHost) {
        await this._update();
        this._hidden = false;
      }
    },

    _handleAuthChange(e) {
      this._loggedIn = !!e.detail.loggedIn;
    },

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
      await this.$.client.getOAuthToken();
      try {
        const response = await this.$.client.getProgress(
            this.change, this.revision);
        this._updateState(response);
      } catch (err) {
        this._updateIntervalMs = Math.min(
            MAX_UPDATE_INTERVAL_MS,
            (1 + Math.random()) * this._updateIntervalMs * 2);
        console.warn(err);
      }
      this._resetTimeout();
    },

    /**
     * Update element state based on the given fetched progress.
     */
    _updateState(response) {
      this._response = response;
      this._updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS;
    },

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
    },

    _clearUpdateTimeout() {
      if (this._updateTimeoutID) {
        window.clearTimeout(this._updateTimeoutID);
        this._updateTimeoutID = null;
      }
    },

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
    },

    _handleVisibilityChange(e) {
      if (!document.hidden && this._needsUpdate) {
        this._update();
        this._needsUpdate = false;
      }
    },

    _updateTimeoutFired() {
      if (document.hidden) {
        this._needsUpdate = true;
        return;
      }
      this._update();
    },

    /** Return a string to show as the bold title in the UI. */
    _computeTitleText(response) {
      if (!response) {
        return 'No Tricium Results';
      }
      return 'Tricium';
    },

    /** Return a URL for viewing run details. */
    _computeRunURL(response) {
      if (!response || !response.runId || !this.triciumHost) {
        return '';
      }
      return `https://${this.triciumHost}/run/${response.runId}`;
    },

    /** Return a string describing the run ID. */
    _computeRunText(response) {
      if (!response || !response.runId) {
        return '';
      }
      return `Run ${response.runId}`;
    },
  });
})();
