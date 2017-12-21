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
      triciumHost: String,
      gerritHost: String,
      plugin: Object,

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

    /**
     * Fetch and store a new OAuth token if necessary.
     *
     * @return {Promise} Resolves when finished.
     */
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

    /**
     * Fetch the config for this plugin and project.
     *
     * @param {string} project Gerrit project name.
     * @param {string} plugin Plugin name.
     * @return {Promise} Resolves to the fetched config object.
     */
    getConfig(project, plugin) {
      return this.plugin.restApi().get(
          `/projects/${encodeURIComponent(project)}` +
          `/${encodeURIComponent(plugin)}~config`);
    },

    /**
     * Make a Progress request to the Tricium server.
     *
     * For more about the request and response fields for the Progress
     * method, see the Tricium proto definitions: https://goo.gl/rA5H1m
     *
     * The change and revision passed to this function come from the Gerrit
     * REST API. API reference:
     *   ChangeInfo: https://goo.gl/RgRGZV
     *   RevisionInfo: https://goo.gl/BhtmGL
     *
     * @param {ChangeInfo} change The current CL.
     * @param {RevisionInfo} revision The current patchset.
     * @return {Promise} Resolves to a list of AnalyzerProgress objects,
     *     or rejects with an error.
     */
    getProgress(change, revision) {
      if (!this.triciumHost) {
        return Promise.reject('Cannot fetch Progress, Tricium host not set.');
      }
      const service = 'tricium.Tricium';
      const method = 'Progress';
      const request = {
          consumer: 'GERRIT',
          gerritDetails: {
            project: change.project,
            change: change.id,
            revision: revision.ref,
            host: this.gerritHost || window.location.host,
        },
      };
      return this._rpcRequest(this.triciumHost, service, method, request)
          .then((response) => response.analyzerProgress);
    },

    /**
     * Make a pRPC request with JSON data to the given service.
     *
     * For more about pRPC, see:
     *   https://godoc.org/github.com/luci/luci-go/grpc/prpc
     *
     * Note: This could be changed to use the rpc-client element from
     * https://chromium.googlesource.com/infra/luci/luci-go/+/master/web/inc/rpc/.
     * However, that element has extra dependencies expected to be managed via
     * bower and compiled together with vulcanize. It also has more
     * functionality than is required here.
     *
     * @param {string} host The host to send requests to.
     * @param {string} service Service name, including package name.
     * @param {string} method The RPC method name.
     * @param {Object} request Request message object.
     * @return {Promise} Resolves to a response message body,
     *     or rejects with an error.
     */
    _rpcRequest(host, service, method, request) {
      const url = `https://${host}/prpc/${service}/${method}`;
      const headers = new Headers({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
      });
      const accessToken = this._getSharedAccessToken();
      if (accessToken) {
        headers.set('Authorization', 'Bearer ' + accessToken);
      }
      const opts = {
          headers,
          method: 'POST',
          body: JSON.stringify(request),
      };
      return fetch(url, opts).then((response) => {
        return this._handleRpcResponse(response);
      });
    },

    /**
     * Check and parse a pRPC response.
     *
     * @param {Response} response The Response object from a fetch call.
     * @return {Promise} Resolves to an object with the response message,
     *     or rejects with an error message.
     */
    _handleRpcResponse(response) {
      const codeHeader = response.headers.get('X-Prpc-Grpc-Code');
      const codeNumber = parseInt(codeHeader, 10);
      if (codeNumber !== 0) {
        let message = 'X-Prpc-Grpc-Code: ' + codeHeader;
        if (isNaN(codeNumber)) {
          message += '\nHTTP status: ' + response.status;
        }
        return response.text().then(
            (text) => Promise.reject(message + '\nBody: ' + text));
      }
      return this._getResponseObject(response, ')]}\'');
    },

     /** @return {?string} The stored OAuth access token. */
    _getSharedAccessToken() {
      const token = this._sharedAuthState[OAUTH_TOKEN];
      if (!token) {
          return null;
      }
      return token['access_token'];
    },

    /**
     * Use the gapi library to configure OAuth.
     *
     * This involves fetching the OAuth config from Gerrit, then loading the
     * gapi.auth library and initialize it. When completed, the state of this
     * element is updated. If the configuration has already been done, it
     * is not repeated.
     *
     * @return {Promise} Resolves upon completion.
     */
    _configureOAuthLibrary() {
      return this.plugin.restApi().getLoggedIn().then((loggedIn) => {
        // No need to configure OAuth if no user is logged in, or if it's
        // already configured.
        if (!loggedIn || this._sharedAuthState[OAUTH_CONFIGURED]) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          // gapi library shares state between clients, so if this library is
          // already used by another plugin, there may be unexpected results.
          // TODO(qyearsley): Check whether gapi is already configured, and if
          // so log a message and do nothing.
          // More about gapi:
          // https://developers.google.com/api-client-library/javascript/reference/referencedocs
          gapi.load('config_min', resolve);
        }).then(() => {
          return this._getOAuthConfig();
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
      });
    },

    /**
     * Request OAuth config info from the Gerrit REST API.
     *
     * @return {Promise} Resolves to a token object.
     */
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

    /**
     * Validate the given token object.
     *
     * @param {Object} token A token object. The fields that should
     *     be present are listed in the OAuth2 specification (RFC 6749):
     *     https://goo.gl/HZH4Nq.
     * @return {boolean} True if valid.
     */
    _oauthTokenIsValid(token) {
      if (!token) { return false; }
      if (!token['access_token'] || !token['expires_at']) { return false; }
      const expiration = new Date(parseInt(token['expires_at'], 10) * 1000);
      if (Date.now() >= expiration) { return false; }
      return true;
    },

    /**
     * Request a new OAuth token using gapi.
     *
     * This requires gapi.auth to be configured first with
     * _configureOAuthLibrary().
     *
     * @return {Promise} Resolves to a token object.
     */
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

    _getResponseObject(response, jsonPrefix = ')]}\'') {
      return response.text().then((text) => {
        return JSON.parse(text.substring(jsonPrefix.length));
      });
    },
  });
})();
