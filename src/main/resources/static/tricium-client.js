// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
  'use strict';

  const EMAIL_SCOPE = 'email';

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
      plugin: Object,

      // The auth state could potentially be re-used for multiple instances
      // of this element on the same page, e.g. for both tricium-view and
      // tricium-feedback-button.
      _sharedAuthState: {
        type: Object,
        value: {
          config: null,
          token: null,
        },
      },
    },

    /**
     * Fetch and store a new OAuth token if necessary.
     *
     * @return {Promise} Resolves when finished.
     */
    async getOAuthToken() {
      if (this._oauthTokenIsValid(this._sharedAuthState.token)) {
        return;
      }

      await this._configureOAuthLibrary();
      try {
        const token = await this._refreshToken();
        if (!this._oauthTokenIsValid(token)) {
          throw Error('Received an invalid token.');
        }
        this._sharedAuthState.token = token;
        this.fire('auth-change', {loggedIn: true});
      } catch (err) {
        console.warn('Failed to get refresh token; error:', err);
        this.fire('auth-change', {loggedIn: false});
      }
    },

    /**
     * Fetch the config for this plugin and project.
     *
     * @param {string} project Gerrit project name.
     * @param {string} plugin Plugin name.
     * @return {Promise} Resolves to the fetched config object,
     *     or rejects if the response is non-OK.
     */
    async getConfig(project, plugin) {
      return await this.plugin.restApi().get(
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
     * @return {Promise} If there is a successful response from
     *     Tricium, this resolves to a a ProgressResponse object.
     *     If Tricium returns 404, this resolves with null; else
     *     else it rejects with an error message.
     */
    async getProgress(change, revision) {
      if (!this.triciumHost) {
        throw Error('Cannot fetch Progress, Tricium host not set.');
      }
      const request = {
        gerritRevision: {
          host: this._getGerritHost(),
          project: change.project,
          change: change.id,
          gitRef: revision.ref,
        },
      };
      const response = await this._rpcRequest(
          this.triciumHost, 'tricium.Tricium', 'Progress', request);
      if (this._isOk(response)) {
        return await this._parseRpcJson(response);
      }
      if (this._isNotFound(response)) {
        return null;
      }
      throw await this._message(response);
    },

    /**
     * Send a "not useful" Feedback message to the Tricium server.
     *
     * @param {RobotCommentInfo} comment The comment to send feedback for.
     * @return {Promise} Resolves if successful, or rejects with error.
     */
    async reportNotUseful(comment) {
      if (!this.triciumHost) {
        throw Error('Cannot send report, Tricium host not set.');
      }
      if (!comment.properties || !comment.properties.tricium_comment_uuid) {
        throw Error(
          'No tricium_comment_uuid field in comment.properties: ' +
          JSON.stringify(comment.properties));
      }
      const request = {
        comment_id: comment.properties.tricium_comment_uuid,
      };
      const response = await this._rpcRequest(
          this.triciumHost, 'tricium.Tricium', 'ReportNotUseful', request);
      if (this._isOk(response)) {
        return await this._parseRpcJson(response);
      }
      throw Error(await this._message(response));
    },

    /** Checks if the response indicates that a run wasn't found. */
    _isNotFound(response) {
      return this._rpcCode(response) == 5 && response.status == 404;
    },

    /** Checks if the response indicates an OK response. */
    _isOk(response) {
      return this._rpcCode(response) == 0 && response.status == 200;
    },

    /** @return {number} The RPC code from the response, NaN if absent. */
    _rpcCode(response) {
      return parseInt(response.headers.get('X-Prpc-Grpc-Code'), 10);
    },

    /** @return {Promise} Resolves to parsed object. */
    async _parseRpcJson(response) {
      const jsonPrefix = ')]}\'';
      const text = await response.text();
      return JSON.parse(text.substring(jsonPrefix.length));
    },

    /** @return {Promise} Resolves to a description of an RPC response. */
    async _message(response) {
      const code = this._rpcCode(response);
      const text = await response.text();
      return `X-Prpc-Grpc-Code: ${code}\n` +
          `HTTP status: ${response.status}\n` +
          `Body: ${text}`;
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
     * @return {Promise} Resolves to a fetch Response object.
     */
    async _rpcRequest(host, service, method, request) {
      const url = `https://${host}/prpc/${service}/${method}`;
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      });
      const accessToken = this._getSharedAccessToken();
      if (accessToken) {
        headers.set('Authorization', 'Bearer ' + accessToken);
      } else {
        console.log(`Making request to ${url} with no bearer token.`);
      }
      const opts = {
        headers,
        method: 'POST',
        body: JSON.stringify(request),
      };
      return await fetch(url, opts);
    },

    /** @return {string} Gerrit host string to send to Tricium. */
    _getGerritHost() {
      // In practice, there are "canary" Gerrit hosts which serve the same
      // change data as the non-canary version but which may use a newer
      // version of Gerrit. For convenience, strip the "canary-" part.
      const host = document.location.host;
      if (host.startsWith('canary-')) {
        return host.slice('canary-'.length);
      }
      return host;
    },

    /** @return {?string} The stored OAuth access token. */
    _getSharedAccessToken() {
      const token = this._sharedAuthState.token;
      if (!token) {
        return null;
      }
      return token.access_token;
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
    async _configureOAuthLibrary() {
      const loggedIn = await this.plugin.restApi().getLoggedIn();
      // No need to configure OAuth if no user is logged in, or if it's
      // already configured.
      if (!loggedIn || this._sharedAuthState.config) {
        return;
      }

      const gapi = window.gapi;

      await new Promise((resolve) => {
        // gapi library shares state between clients, so if this library is
        // already used by another plugin, there may be unexpected results.
        // TODO(qyearsley): Check whether gapi is already configured, and if
        // so log a message and do nothing.
        // More about gapi:
        // https://developers.google.com/api-client-library/javascript/reference/referencedocs
        gapi.load('config_min', resolve);
      });
      const config = await this._getOAuthConfig();

      if (config.hasOwnProperty('auth_url') && config.auth_url) {
        gapi.config.update('oauth-flow/authUrl', config.auth_url);
      }
      if (config.hasOwnProperty('proxy_url') && config.proxy_url) {
        gapi.config.update('oauth-flow/proxyUrl', config.proxy_url);
      }
      this._sharedAuthState.config = config;

      try {
        await new Promise((resolve) => {
          // Loading auth has a side-effect. The URLs should be set before
          // loading it.
          gapi.load('auth', () => { gapi.auth.init(resolve); });
        });
      } catch (err) {
        this._sharedAuthState.config = null;
      }
    },

    /**
     * Request OAuth config info from the Gerrit REST API.
     *
     * @return {Promise} Resolves to a token object.
     */
    async _getOAuthConfig() {
      return await this.plugin.restApi().get('/accounts/self/oauthconfig');
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
      if (!token) {
        return false;
      }
      if (!token.access_token || !token.expires_at) {
        return false;
      }
      const expiration = new Date(parseInt(token.expires_at, 10) * 1000);
      if (Date.now() >= expiration) {
        return false;
      }
      return true;
    },

    /**
     * Request a new OAuth token using gapi.
     *
     * This requires gapi.auth to be configured first with
     * _configureOAuthLibrary().
     *
     * @param {Number} timeoutMs Milliseconds before timeout,
     *     can be specified in unit tests.
     * @return {Promise} Resolves to a token object, or rejects
     *     if there was an error or no token, or a time-out.
     */
    async _refreshToken(timeoutMs = 1000) {
      if (!this._sharedAuthState.config) {
        throw Error('Trying to refresh token when OAuth is not configured.');
      }
      const opts = {
        client_id: this._sharedAuthState.config.client_id,
        login_hint: this._sharedAuthState.config.email,
        immediate: true,
        scope: EMAIL_SCOPE,
      };
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(reject, timeoutMs);
        window.gapi.auth.authorize(opts, (token) => {
          clearTimeout(timeout);
          if (!token) {
            reject('No token returned');
          } else if (token.error) {
            reject(token.error);
          } else {
            resolve(token);
          }
        });
      });
    },
  });
})();
