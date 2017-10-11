// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function(window) {
  'use strict';

  const ELEMENT = '/static/tricium-view.html';

  class TriciumPlugin {

    constructor(gerritPlugin) {
      this._gerritPlugin = gerritPlugin;
      this._element = null;
    }

    addEventListeners() {
      this._gerritPlugin.on('showchange', this.handleShowChange.bind(this));
    }

    loadElement() {
      return new Promise((resolve, reject) => {
        Polymer.Base.importHref(
            this._gerritPlugin.url(ELEMENT), resolve, reject);
      });
    }

    handleShowChange(change, revision) {
      this.loadElement().then(() => {
        if (!this._element) {
          this._element = this.createElement();
        }
        this.configureElement(change, revision);
        this.appendElementToPage();
        this._element.reload();
      }).catch((err) => {
        console.error('Could not load Tricium element', err);
      });
    }

    createElement() {
      const el = document.createElement('tricium-view');
      el.pluginContext = this._gerritPlugin;
      return el;
    }

    configureElement(change, revision) {
      this._element.change = change;
      this._element.revision = revision;
    }

    appendElementToPage() {
      const appEl = Polymer.dom(document).querySelector('gr-app');
      const changeView = Polymer.dom(appEl.root).querySelector(
          'gr-change-view');
      const messageList =
          Polymer.dom(changeView.root).querySelector('gr-messages-list');
      Polymer.dom(messageList.parentNode).insertBefore(this._element,
          messageList);
    }
  }

  // Gerrit may not be defined (say, in a test environment).
  if (window.Gerrit) {
    Gerrit.install((self) => {
      // Currently only supported in PolyGerrit.
      if (!window.Polymer) { return; }
      const plugin = new TriciumPlugin(self);
      plugin.addEventListeners();
    }, '0.1');
  }
  window.__TriciumPlugin = window.__TriciumPlugin || TriciumPlugin;
})(window);
