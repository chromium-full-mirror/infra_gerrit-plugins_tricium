// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
  'use strict';

  const DEFAULT_UPDATE_INTERVAL_MS = 1000 * 5;
  const MAX_UPDATE_INTERVAL_MS = 1000 * 60 * 5;

  /**
   * Enum of possible Tricium function states to show.
   * See the State enum in the Tricium API: https://goo.gl/rA5H1m.
   */
  const FunctionState = {
    PENDING: 'pending',
    RUNNING: 'running',
    FAILURE: 'failure',
    SUCCESS: 'success',
  };

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

      _results: Array,
      _hidden: {
        type: Boolean,
        value: false,
      },
      _loggedIn: {
        type: Boolean,
        value: false,
      },
      _lastUpdate: String,
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
      this._results = [];
      const project = this.change.project;
      const plugin = this.plugin.getPluginName();
      const config = await this.$.client.getConfig(project, plugin);
      if (config && config.triciumHost) {
        this.triciumHost = config.triciumHost;
      } else {
        console.warn(`No config found for project "${project}", ` +
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
        const results = await this.$.client.getProgress(
            this.change, this.revision);
        this._updateState(results);
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
     *
     * The fields in the FunctionProgress objects are specified in the
     * Tricium API: See API specification in: https://goo.gl/rA5H1m
     *
     * @param {Array<FunctionProgress>} results Fetched results.
     */
    _updateState(results) {
      this._lastUpdate = new Date().toLocaleTimeString();
      this._results = results;
      this._updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS;
    },

    /** Set a timeout to update again if applicable. */
    _resetTimeout() {
      this._clearUpdateTimeout();
      // If all analyzers are finished, then results won't change
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
     * Check whether the Tricium analyzers are all finished.
     *
     * The Tricium workflow is generated all at once before it is started, so
     * once it is non-empty, we assume that there will be no additional
     * analyzers in later responses.
     *
     * @param {Array<FunctionProgress>} results Fetched results.
     * @return {Boolean} True if the Tricium run is finished, false otherwise.
     */
    _isDone() {
      if (!this._results || this._results.length == 0) {
        return false;
      }
      return this._results.every((r) => {
        // The state is considered done if it is not pending or running.
        // It might be canceled, aborted, failed, or finished successfully.
        return r.state && r.state != 'PENDING' && r.state != 'RUNNING';
      });
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

    _computeTitleText(results) {
      if (!results || results.length == 0) {
        return 'No Tricium Results';
      }
      return 'Tricium Results';
    },

    _computeUpdateText(lastUpdate) {
      if (!lastUpdate) {
        return '';
      }
      return `Last updated at ${lastUpdate}.`;
    },

    /**
     * Return a string indicating Tricium function state.
     *
     * @param {FunctionProgress} result An object with a "state" property.
     * @return {string} Function state. May be used as a CSS class name.
     */
    _getFunctionClass(result) {
      if (!result.state) {
        return 'pending';
      }
      return FunctionState[result.state] || '';
    },

    /** Return a URL to view details for a particular function run. */
    _getFunctionUrl(result) {
      return `${result.swarmingUrl}/task?id=${result.swarmingTaskId}`;
    },

    /** Return a string describing the current patchset number. */
    _computePatchsetDescription(revision) {
      if (revision && revision._number) {
        return `Showing results for patchset ${revision._number}.`;
      }
      return '';
    },
  });
})();
