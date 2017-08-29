// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function(window) {
  'use strict';

  const ELEMENT = '/static/tricium-view.html';

  class TriciumPlugin {

    constructor(gerritPlugin) {
      this.gerritPlugin_ = gerritPlugin;
      this.element_ = null;
    }

    addEventListeners() {
      this.gerritPlugin_.on('showchange', this.handleShowChange.bind(this));
    };

    loadElement() {
      return new Promise(function(resolve, reject) {
        Polymer.Base.importHref(this.gerritPlugin_.url(ELEMENT), resolve, reject);
      }.bind(this));
    }

    handleShowChange(change, revision) {
      this.loadElement().then(function() {
        if (!this.element_) {
          this.element_ = this.createElement();
        }
        this.configureElement(change, revision);
        this.appendElementToPage();
        this.element_.reload();
      }.bind(this)).catch(function(err) {
        console.error('Could not load Tricium element', err);
      });
    }

    createElement() {
      var el = document.createElement('tricium-view');
      el.pluginContext = this.gerritPlugin_;
      return el;
    }

    configureElement(change, revision) {
      this.element_.change = change;
      this.element_.revision = revision;
    }

    appendElementToPage() {
      var appEl = Polymer.dom(document).querySelector('gr-app');
      var changeView = Polymer.dom(appEl.root).querySelector('gr-change-view');
      var messageList =
          Polymer.dom(changeView.root).querySelector('gr-messages-list');
      Polymer.dom(messageList.parentNode).insertBefore(this.element_,
          messageList);
    }
  }

  // Gerrit may not be defined (say, in a test environment).
  if (window.Gerrit) {
    Gerrit.install(function(self) {
      // Currently only supported in PolyGerrit.
      if (!window.Polymer) { return; }
      var plugin = new TriciumPlugin(self);
      plugin.addEventListeners();
    }, '0.1');
  }
  window.__TriciumPlugin = window.__TriciumPlugin || TriciumPlugin;
})(window);
