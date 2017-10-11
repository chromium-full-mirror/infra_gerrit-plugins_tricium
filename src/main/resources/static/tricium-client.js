// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
  'use strict';

  const EMAIL_SCOPE = 'email';

  // Shared state keys.
  const OAUTH_CLIENT_ID = 'oauth_client_id';
  const OAUTH_CONFIGURED = 'oauth_configured';
  const OAUTH_EMAIL = 'oauth_email';
  const OAUTH_TOKEN = 'oauth_token';

  Polymer({
    is: 'tricium-client',

    /**
     * Fired when the auth state changes.
     *
     * @event auth-change
     * @param {Boolean} loggedIn Whether the OAuth flow successfully completed.
     */

    properties: {
      baseUrl: String,

      _sharedAuthState: {
        type: Object,
        value: {  // Intentional to share the object across instances.
          OAUTH_CLIENT_ID: null,
          OAUTH_CONFIGURED: false,
          OAUTH_EMAIL: null,
          OAUTH_TOKEN: null,
        },
      },
    },

    getOAuthToken() {
      if (this._oauthTokenIsValid(this._sharedAuthState[OAUTH_TOKEN])) {
        return Promise.resolve();
      }

      return this._configureOAuthLibrary().then(() => {
        return this._refreshToken().then((token) => {
          this._sharedAuthState[OAUTH_TOKEN] = token;
          this.fire('auth-change', {loggedIn: this._oauthTokenIsValid(token)});
        }).catch((err) => {
          this.fire('auth-change', {loggedIn: false});
        });
      });
    },

    getConfig(projectName, pluginName) {
      const configURL = '/projects/' + encodeURIComponent(projectName) + '/' +
          encodeURIComponent(pluginName) + '~config';
      const opts = {credentials: 'same-origin'};
      return fetch(configURL, opts).then((response) => {
        if (!response.ok) {
          console.error(response.statusText);
          return {};
        }
        return this._getResponseObject(response);
      });
    },

    getProgress(change, revision) {
      /* TODO(emso): Include when there is a non-RPC endpoint to call.
      let url = this.baseUrl + '/progress' +
                    '?change=' + change +
                    '&revision=' + revision;
      let headers = new Headers();
      let accessToken = this._getSharedAccessToken();
      if (accessToken) {
        headers.set('Authorization', 'Bearer ' + accessToken);
      }
      let opts = {headers: headers};
      return fetch(url, opts).then((response) => {
        if (!response.ok) {
          console.error(response.statusText);
          if (response.body && response.body.then) {
            return response.body.then((text) => {
              return Promise.reject(text);
            });
          }
          return Promise.reject(response.statusText);
        }
        return response.json();
      });
      */
      return new Promise(() => {
        return {
            analyzer_progress: [{analyzer: 'Hello'}],
        };
      });
    },

    _isSignedIn() {
      // TODO(emso): Use Gerrit.isSignedIn() once it's available.
      return document.cookie.indexOf('XSRF_TOKEN=') !== -1;
    },

    _getSharedAccessToken() {
      const token = this._sharedAuthState[OAUTH_TOKEN];
      if (!token) {
          return null;
      }
      return token['access_token'];
    },

    _configureOAuthLibrary() {
      if (!this._isSignedIn() || this._sharedAuthState[OAUTH_CONFIGURED]) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        // gapi.config is available in 'config_min', not 'config'. More details about gapi:
        // https://developers.google.com/api-client-library/javascript/reference/referencedocs
        gapi.load('config_min', resolve);
      }).then(() => {
        return this.getOAuthConfig_();
      }).then((config) => {
        if (config.hasOwnProperty('auth_url') && config['auth_url']) {
          gapi.config.update('oauth-flow/authUrl', config['auth_url']);
        }
        if (config.hasOwnProperty('proxy_url') && config['proxy_url']) {
          gapi.config.update('oauth-flow/proxyUrl', config['proxy_url']);
        }
        this._sharedAuthState[OAUTH_CLIENT_ID] = config['client_id'];
        this._sharedAuthState[OAUTH_EMAIL] = config['email'];
        return new Promise((resolve) => {
          // Loading auth has a side-effect. The URLs should be set before
          // loading it.
          gapi.load('auth', () => { gapi.auth.init(resolve); });
        });
      }).then(() => {
        this._sharedAuthState[OAUTH_CONFIGURED] = true;
      }).catch(() => {
        this._sharedAuthState[OAUTH_CONFIGURED] = false;
      });
    },

    _getOAuthConfig() {
      const authConfigURL = '/accounts/self/oauthconfig';
      const opts = {
        headers: new Headers({Accept: 'application/json'}),
        credentials: 'same-origin',
      };
      return fetch(authConfigURL, opts).then((response) => {
        if (!response.ok) {
          console.error(response.statusText);
          if (response.body && response.body.then) {
            return response.body.then((text) => {
              return Promise.reject(text);
            });
          }
          return Promise.reject(response.statusText);
        }
        return this._getResponseObject(response);
      });
    },

    _oauthTokenIsValid(token) {
      if (!token) { return false; }
      if (!token['access_token'] || !token['expires_at']) { return false; }
      const expiration = new Date(parseInt(token['expires_at'], 10) * 1000);
      if (Date.now() >= expiration) { return false; }
      return true;
    },

    _refreshToken() {
      const opts = {
        client_id: this._sharedAuthState[OAUTH_CLIENT_ID],
        immediate: true,
        scope: EMAIL_SCOPE,
        login_hint: this._sharedAuthState[OAUTH_EMAIL],
      };
      return new Promise((resolve, reject) => {
        gapi.auth.authorize(opts, (token) => {
          if (!token) {
            reject('No token returned');
          } else if (token['error']) {
            reject(token['error']);
          } else {
            resolve(token);
          }
        });
      });
    },

    _getResponseObject(response) {
      const JSON_PREFIX = ')]}\'';
      return response.text().then((text) => {
        return JSON.parse(text.substring(JSON_PREFIX.length));
      });
    },
  });
})();
