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
      email_: String,
      loading_: {
        type: Boolean,
        value: false,
      },
      loggedIn_: {
        type: Boolean,
        value: false,
      },
      lastUpdate_: String,
      needsUpdate_: {
        type: Boolean,
        value: false,
      },
      updateIntervalMs_: {
        type: Number,
        value: DEFAULT_UPDATE_INTERVAL_MS,
      },
      updateTimeoutID_: Number,
    },

    attached() {
      this.listen(document, 'visibilitychange', '_handleVisibilityChange');
    },

    detached() {
      this.unlisten(document, 'visibilitychange', '_handleVisibilityChange');
      window.clearTimeout(this.updateTimeoutID_);
      // Because a reference to this element is maintained in tricium.js,
      // these properties should be cleared so that stale results from other
      // changes are not shown while the new element is reloaded.
      this.analyzerResults_ = [];
    },

    reload() {
      this.loading_ = true;
      window.clearTimeout(this.updateTimeoutID_);

      const pluginName = this.pluginContext.getPluginName();
      const project = this.change.project;

      return this.$.client.getConfig(project, pluginName).then((config) => {
          this.baseUrl = config.triciumHost;
        }).then(() => {
          this.refreshProgress_().then(() => { this.loading_ = false; });
        });
    },

    handleAuthChange_(e) {
      this.loggedIn_ = !!e.detail.loggedIn;
    },

    refreshProgress_() {
      return this.$.client.getOAuthToken().then(() => {
        return this.$.client.getProgress(this.change, this.revision).then(
            (allAnalyzers) => {
              this.updateAnalyzers_(allAnalyzers);
            }
        ).catch((err) => {
              this.updateIntervalMs_ = Math.min(MAX_UPDATE_INTERVAL_MS,
                  (1 + Math.random()) * this.updateIntervalMs_ * 2);
              console.error(err);
            }).then(() => {
              this.updateTimeoutID_ =
                  window.setTimeout(this.updateTimerFired_.bind(this),
                      this.updateIntervalMs_);
            });
      });
    },

    updateAnalyzers_(allAnalyzers) {
      this.updateIntervalMs_ = DEFAULT_UPDATE_INTERVAL_MS;
      this.lastUpdate_ = new Date().toLocaleTimeString();
      this.analyzerResults_ = allAnalyzers;
    },

    handleVisibilityChange_(e) {
      if (!document.hidden && this.needsUpdate_) {
        this.refreshProgress_();
        this.needsUpdate_ = false;
      }
    },

    updateTimerFired_() {
      if (document.hidden) {
        this.needsUpdate_ = true;
        return;
      }
      this.refreshProgress_();
    },

    computeTitleText_(analyzerResults) {
      return (analyzerResults.length === 0 ? 'No ' : '') + 'Analyzers';
    },

    getAnalyzerRunClass_(analyzer) {
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

    getAnalyzerIcon_(analyzer) {
      const iconMap = {
        'pending': '\u29D6',
        'running': '\u29D6',
        'success': '\u2713',
        'failure': '\u26A0',
        '': '',
      };
      return iconMap[this.getAnalyzerRunClass_(analyzer)];
    },
  });
})();
