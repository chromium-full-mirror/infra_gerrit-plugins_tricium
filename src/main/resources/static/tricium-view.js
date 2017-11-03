// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
  'use strict';

  const EMAIL_SCOPE = 'email';
  const DEFAULT_UPDATE_INTERVAL_MS = 1000 * 5;
  const MAX_UPDATE_INTERVAL_MS = 1000 * 60 * 5;

  const AnalyzerStatus = {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    FAILURE: 'FAILURE',
    SUCCESS: 'SUCCESS',
  };

  Polymer({
    is: 'tricium-view',

    properties: {
      baseUrl: String,
      pluginContext: Object,
      projectName: String,
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
    },

    detached() {
      this.unlisten(document, 'visibilitychange', '_handleVisibilityChange');
      window.clearTimeout(this._updateTimeoutID);
      // Because a reference to this element is maintained in tricium.js,
      // these properties should be cleared so that stale results from other
      // changes are not shown while the new element is reloaded.
      this._analyzerResults = [];
    },

    /**
     * Reset the state of the element, then fetch and display analyzer progress.
     *
     * @return {Promise} Resolves upon completion.
     */
    reload() {
      this._loading = true;
      window.clearTimeout(this._updateTimeoutID);

      const pluginName = this.pluginContext.getPluginName();
      const project = this.change.project;

      return this.$.client.getConfig(project, pluginName).then((config) => {
          this.baseUrl = config.triciumHost;
        }).then(() => {
          this._refreshProgress().then(() => { this._loading = false; });
        });
    },

    _handleAuthChange(e) {
      this._loggedIn = !!e.detail.loggedIn;
    },

    /**
     * Fetch current progress state and update properties.
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

    _computeTitleText(analyzerResults) {
      return (analyzerResults.length === 0 ? 'No ' : '') + 'Analyzers';
    },

    /**
     * Return a string indicating status to use as a class string.
     *
     * @param {AnalyzerProgress} An object with a "state" property.
     * @return {string} A CSS class name, or empty string.
     */
    _getAnalyzerRunClass(analyzer) {
      if (analyzer.state === AnalyzerStatus.PENDING) {
        return 'pending';
      }
      if (analyzer.state === AnalyzerStatus.RUNNING) {
        return 'running';
      }
      if (analyzer.state === AnalyzerStatus.SUCCESS) {
        return 'success';
      }
      if (analyzer.state === AnalyzerStatus.FAILURE) {
        return 'failure';
      }
      return '';
    },
  });
})();
