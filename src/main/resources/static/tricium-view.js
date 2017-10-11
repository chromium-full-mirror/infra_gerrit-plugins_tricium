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

      analyzerResults_: Array,
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
      this.analyzerResults_ = [];
    },

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

    _updateAnalyzers(allAnalyzers) {
      this._updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS;
      this._lastUpdate = new Date().toLocaleTimeString();
      this.analyzerResults_ = allAnalyzers;
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

    _getAnalyzerIcon(analyzer) {
      const iconMap = {
        'pending': '\u29D6',
        'running': '\u29D6',
        'success': '\u2713',
        'failure': '\u26A0',
        '': '',
      };
      return iconMap[this._getAnalyzerRunClass(analyzer)];
    },
  });
})();
