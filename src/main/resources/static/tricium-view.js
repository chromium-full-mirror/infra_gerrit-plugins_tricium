// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
  'use strict';

  const DEFAULT_UPDATE_INTERVAL_MS = 1000 * 5;
  const MAX_UPDATE_INTERVAL_MS = 1000 * 60 * 5;

  /**
   * Enum of possible analyzer states to show.
   * See the State enum in the Tricium API: https://goo.gl/rA5H1m.
   */
  const AnalyzerState = {
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
      revision: Object,

      _analyzerResults: Array,
      _email: String,
      _loading: {
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
      if (!this.change) {
        console.warn('element attached without change property set.');
        return;
      }
      this.reload();
    },

    /**
     * Reset the state of the element, then fetch and display analyzer progress.
     *
     * @return {Promise} Resolves upon completion.
     */
    reload() {
      this._loading = true;
      this._analyzerResults = [];
      const project = this.change.project;
      const plugin = this.plugin.getPluginName();
      return this.$.client.getConfig(project, plugin).then((config) => {
        if (config && config.triciumHost) {
          this.triciumHost = config.triciumHost;
        } else {
          console.warn(`No config found for project "${project}", ` +
                       `plugin "${plugin}", not fetching Tricium Progress.`);
        }
        return Boolean(this.triciumHost);
      }).then((configFound) => {
        if (configFound) {
          this._refreshProgress().then(() => { this._loading = false; });
        }
      });
    },

    _handleAuthChange(e) {
      this._loggedIn = !!e.detail.loggedIn;
    },

    /**
     * Fetch current progress state and update properties.
     *
     * It is assumed that this will only be called if the Tricium
     * host is configured.
     *
     * @return {Promise} Resolves upon completion.
     */
    _refreshProgress() {
      return this.$.client.getOAuthToken().then(() => {
        return this.$.client.getProgress(this.change, this.revision).then(
            (allAnalyzers) => {
              this._updateAnalyzers(allAnalyzers);
            }
        ).catch((err) => {
              this._updateIntervalMs = Math.min(MAX_UPDATE_INTERVAL_MS,
                  (1 + Math.random()) * this._updateIntervalMs * 2);
              console.error(err);
            }).then(() => {
              this._updateTimeoutID =
                  window.setTimeout(this._updateTimerFired.bind(this),
                      this._updateIntervalMs);
            });
      });
    },

    /**
     * Update element state based on the given fetched progress.
     *
     * The fields in the AnalyzerProgress objects are specified in the
     * Tricium API: See API specification in: https://goo.gl/rA5H1m
     *
     * @param {AnalyzerProgress[]} allAnalyzers Fetched analyzer progress.
     */
    _updateAnalyzers(allAnalyzers) {
      this._updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS;
      this._lastUpdate = new Date().toLocaleTimeString();
      this._analyzerResults = allAnalyzers;
    },

    _handleVisibilityChange(e) {
      if (!document.hidden && this._needsUpdate) {
        this._refreshProgress();
        this._needsUpdate = false;
      }
    },

    _updateTimerFired() {
      if (document.hidden) {
        this._needsUpdate = true;
        return;
      }
      this._refreshProgress();
    },

    _computeTitleText(results) {
      if (!results || results.length == 0) {
        return 'No Analyzers';
      }
      return 'Analyzers';
    },

    _computeUpdateText(lastUpdate) {
      if (!lastUpdate) {
        return '';
      }
      return `Last updated at ${lastUpdate}`;
    },

    /**
     * Return a string indicating analyzer state.
     *
     * @param {AnalyzerProgress} result An object with a "state" property.
     * @return {string} Analyzer state. May be used as a CSS class name.
     */
    _getAnalyzerClass(result) {
      return AnalyzerState[result.state] || '';
    },

    /** Return a URL to view details for a particular analyzer run. */
    _getAnalyzerUrl(result) {
      return `${result.swarmingUrl}/task?id=${result.swarmingTaskId}`;
    },
  });
})();
