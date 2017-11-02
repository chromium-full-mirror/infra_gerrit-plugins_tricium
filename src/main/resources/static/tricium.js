// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function(window) {
  'use strict';

  const ELEMENT = '/static/tricium-view.html';

  class TriciumPlugin {

    /**
     * Create an empty TriciumPlugin instance.
     *
     * @param {Plugin} gerritPlugin An object used to contain the plugin.
     *    Schema for Plugin: https://goo.gl/6nfYna.
     */
    constructor(gerritPlugin) {
      this._gerritPlugin = gerritPlugin;
      this._element = null;
    }

    addEventListeners() {
      this._gerritPlugin.on('showchange', this.handleShowChange.bind(this));
    }

    /** @return {Promise} Resolves when the element is loaded. */
    loadElement() {
      return new Promise((resolve, reject) => {
        Polymer.Base.importHref(
            this._gerritPlugin.url(ELEMENT), resolve, reject);
      });
    }

    /**
     * Initialize and insert the UI element into a Gerrit change page.
     *
     * This may reuse an existing element object, so it reloads and resets
     * the state of the element.
     *
     * Schema for ChangeInfo: https://goo.gl/RgRGZV
     * And for RevisionInfo: https://goo.gl/BhtmGL
     *
     * @param {ChangeInfo} change The change shown.
     * @param {RevisionInfo} revision The patchset shown.
     */
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

    /** Insert the tricium-view element into the change page. */
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
