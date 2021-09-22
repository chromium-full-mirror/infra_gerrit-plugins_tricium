// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This was copied from the buildbucket plugin.
// TODO(crbug.com/928553): Move this to a separate plugin.

import {addTimeout} from './promises.js';

/**
 * Implements authentication layer, in particular global
 * getAccessToken function.
 */
let globalAuthenticatorPromise = null;

/**
 * Used in tests to reset the auth configuration.
 */
export function resetAuthState() {
  globalAuthenticatorPromise = null;
}

/**
 * Returns an access token to use in requests.
 *
 * For anonymous requests, or when the token could not be fetched, for
 * example due to timeout, then null is returned.
 *
 * @returns {string?} access token to use in requests.
 */
export async function getAccessToken() {
  if (!globalAuthenticatorPromise) {
    throw new Error('initAuth was not called');
  }
  console.debug('bb: Awaiting globalAuthenticatorPromise');
  const authenticator = await globalAuthenticatorPromise;
  console.debug('bb: Resolved globalAuthenticatorPromise');
  if (!authenticator) {
    return null;
  }
  try {
    console.debug('bb: Awaiting authenticator.getToken()');
    const token = await authenticator.getToken();
    console.debug('bb: Resolved token');
    return token.access_token;
  } catch (err) {
    console.warn('Failed to fetch access token', err);
    return null;
  }
}

/**
 * Provides an OAuth access token.
 *
 * Assumes gapi.auth2 is loaded.
 * For internal use only, use getAccessToken instead.
 */
export class Authenticator {
  constructor(config) {
    this.config = config;
    this._token = null;
    this._currentFetchTokenPromise = null;
  }

  /**
   * Returns an auth token.
   * The token is cached for the duration of its TTL.
   *
   * @returns {string?} auth token to use for requests.
   */
  async getToken() {
    if (!this._isValidToken(this._token)) {
      this._token = null;
    }

    if (!this._token) {
      console.debug('bb: Awaiting _fetchToken()');
      this._token = await this._fetchToken();
      console.debug('bb: Resolved _fetchToken()');
    }
    return this._token;
  }

  /**
   * Fetches a new OAuth token using gapi.
   *
   * @param {number=} timeoutMs Milliseconds before timeout, can be specified in
   *     unit tests.
   * @returns {Promise<Object?>} Resolves to a token object or null if the user
   *     is not logged in. Rejects on an error or timeout.
   */
  async _fetchToken(timeoutMs=10000) {
    if (this._currentFetchTokenPromise) {
      return await this._currentFetchTokenPromise;
    }

    this._currentFetchTokenPromise = this._fetchTokenUnserialized(timeoutMs);
    try {
      return await this._currentFetchTokenPromise;
    } finally {
      this._currentFetchTokenPromise = null;
    }
  }

  /** Implements _fetchToken.
   *
   * @param {number} timeoutMs Milliseconds before timeout, can be specified in
   *     unit tests.
   * @returns {Promise<Object?>} Resolves to a token object or null if the user
   *     is not logged in. Rejects on an error or timeout.
   */
  async _fetchTokenUnserialized(timeoutMs) {
    // Call gapi.auth2.authorize.
    const opts = {
      client_id: this.config.client_id,
      prompt: 'none',
      scope: 'email',
      login_hint: this.config.email,
    };
    const authorizePromise = new Promise(
        resolve => window.gapi.auth2.authorize(opts, resolve));
    const token = await addTimeout(authorizePromise, timeoutMs);

    // Check response.
    if (token.error) {
      throw new Error(token.error);
    }
    if (!this._isValidToken(token)) {
      throw new Error('Received an invalid token');
    }
    return token;
  }

  /**
   * Validates the given token object.
   *
   * @param {Object} token A token object, see https://goo.gl/HZH4Nq.
   * @return {boolean} True if valid.
   */
  _isValidToken(token) {
    if (!token || !token.access_token) {
      return false;
    }

    if (!token.expires_at) {
      return false;
    }
    const expiration = new Date(parseInt(token.expires_at, 10) * 1000);
    if (Date.now() >= expiration) {
      return false;
    }

    return true;
  }
}

/** Initializes authentication. Must be called at most once.
 *
 * @param {Object} plugin Plugin object given by gerrit on Gerrit.install.
 * @param {HTMLScriptElement} platformJsElement Script element where platform.js
 *     is loaded.
 */
export function initAuth(plugin, platformJsElement) {
  if (globalAuthenticatorPromise) {
    throw new Error('initAuth is called more than once');
  }
  globalAuthenticatorPromise = _initAuth(plugin, platformJsElement);
  console.debug('bb: globalAuthenticatorPromise');
}

/** Implements initAuth. Must be called at most once.
 *
 * @param {Object} plugin Plugin object given by gerrit on Gerrit.install.
 * @param {HTMLScriptElement} platformJsElement Script element where platform.js
 *     is loaded.
 */
async function _initAuth(plugin, platformJsElement) {
  // Cannot load OAuth config if the user is not logged in.
  console.debug('bb: Awaiting plugin.restApi().getLoggedIn()');
  const loggedIn = await plugin.restApi().getLoggedIn();
  console.debug('bb: Resolved plugin.restApi().getLoggedIn()', loggedIn);
  if (!loggedIn) {
    console.debug('bb: Not logged in');
    return null;
  }

  // Wait for platform.js to load.
  console.debug('bb: Awaiting for platform.js to load', platformJsElement);
  const loaded = await new Promise(resolve => {
    // window.gapi is set by platform.js.
    if (window.gapi) {
      resolve(true);
    }
    platformJsElement.onload = () => resolve(true);
    platformJsElement.onerror = () => resolve(false);
  });
  if (!loaded) {
    console.debug('bb: platform.js failed to load.');
    return null;
  }
  console.debug('bb: platform.js loaded', loaded);

  console.debug('bb: Awaiting for /accounts/self/oauthconfig');
  const cfg = await plugin.restApi().get('/accounts/self/oauthconfig');
  console.debug('bb: Resolved /accounts/self/oauthconfig', cfg);
  console.debug('bb: Awaiting for _loadGapiAuth(cfg)');
  await _loadGapiAuth(cfg);
  console.debug('bb: Resolved _loadGapiAuth(cfg)');
  return new Authenticator(cfg);
}

/**
 * Loads global gapi auth.
 *
 * @param {Object} cfg OAuth config loaded from Gerrit.
 * @return {Promise} Resolves when gapi.auth2 is loaded.
 */
async function _loadGapiAuth(cfg) {
  const gapi = window.gapi;

  // Load "config" library and configure it according to cfg.
  console.debug('bb: Awaiting for gapi.load("config_min")');
  await new Promise(resolve => gapi.load('config_min', resolve));
  console.debug('bb: Resolved gapi.load("config_min")');
  if (cfg.auth_url) {
    gapi.config.update('oauth-flow/authUrl', cfg.auth_url);
  }
  if (cfg.proxy_url) {
    gapi.config.update('oauth-flow/proxyUrl', cfg.proxy_url);
  }

  // Load "auth2" library only after configuring URLs.
  console.debug('bb: Loading "auth2"');
  await new Promise(resolve => gapi.load('auth2', resolve));
  console.debug('bb: Resolved gapi.load("auth2")');
}
