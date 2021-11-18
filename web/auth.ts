/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

// This was copied from the buildbucket plugin.
// TODO(crbug.com/928553): Move this to a separate plugin.

import {PluginApi} from '@gerritcodereview/typescript-api/plugin';
import {addTimeout} from './promises';

declare global {
  interface Window {
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    gapi: any;
  }
}

export declare interface Token {
  access_token: string | null;
  expires_at: number | null;
  error?: string;
}

export declare interface OAuthConfig {
  auth_url: string;
  proxy_url: string;
  client_id: string;
  email: string;
}

/**
 * Implements authentication layer, in particular global
 * getAccessToken function.
 */
let globalAuthenticatorPromise: Promise<Authenticator | null> | null = null;

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
 * @returns access token to use in requests.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!globalAuthenticatorPromise) {
    throw new Error('initAuth was not called');
  }
  console.info('bb: Awaiting globalAuthenticatorPromise');
  const authenticator = await globalAuthenticatorPromise;
  console.info('bb: Resolved globalAuthenticatorPromise');
  if (!authenticator) {
    return null;
  }
  try {
    console.info('bb: Awaiting authenticator.getToken()');
    const token = await authenticator.getToken();
    console.info('bb: Resolved token');
    return token?.access_token || null;
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
  config: OAuthConfig;

  token: Token | null;

  currentFetchTokenPromise: Promise<Token | null> | null;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.token = null;
    this.currentFetchTokenPromise = null;
  }

  /**
   * Returns an auth token.
   * The token is cached for the duration of its TTL.
   *
   * @returns auth token to use for requests.
   */
  async getToken(): Promise<Token | null> {
    if (!this.isValidToken(this.token)) {
      this.token = null;
    }

    if (!this.token) {
      console.info('bb: Awaiting fetchToken()');
      this.token = await this.fetchToken();
      console.info('bb: Resolved fetchToken()');
    }
    return this.token;
  }

  /**
   * Fetches a new OAuth token using gapi.
   *
   * @param timeoutMs Milliseconds before timeout, can be specified in
   *     unit tests.
   * @returns Promise resolving to a token object. Rejects on an error, timeout,
   *     or if the user is not logged in.
   */
  async fetchToken(timeoutMs = 10000): Promise<Token | null> {
    if (this.currentFetchTokenPromise) {
      return await this.currentFetchTokenPromise;
    }

    this.currentFetchTokenPromise = this.fetchTokenUnserialized(timeoutMs);
    try {
      return await this.currentFetchTokenPromise;
    } finally {
      this.currentFetchTokenPromise = null;
    }
  }

  /** Implements fetchToken.
   *
   * @param timeoutMs Milliseconds before timeout, can be specified in
   *     unit tests.
   * @returns Promise resolving to a token object. Rejects on an error, timeout,
   *     or if the user is not logged in.
   */
  async fetchTokenUnserialized(timeoutMs: number): Promise<Token> {
    // Call gapi.auth2.authorize.
    const opts = {
      client_id: this.config.client_id,
      prompt: 'none',
      scope: 'email',
      login_hint: this.config.email,
    };
    const authorizePromise = new Promise(resolve =>
      window.gapi.auth2.authorize(opts, resolve)
    );
    const token = await addTimeout(authorizePromise, timeoutMs);

    // Check response.
    if (token.error) {
      throw new Error(token.error);
    }
    if (!this.isValidToken(token)) {
      throw new Error('Received an invalid token');
    }
    return token;
  }

  /**
   * Validates the given token object.
   *
   * @param token A token object, see https://goo.gl/HZH4Nq.
   * @return True if valid.
   */
  isValidToken(token: Token | null): boolean {
    if (!token?.access_token) {
      return false;
    }

    if (!token.expires_at) {
      return false;
    }
    const expiration = new Date(parseInt(token.expires_at.toString(10), 10));
    if (Date.now() >= expiration.getTime()) {
      return false;
    }

    return true;
  }
}

/** Initializes authentication. Must be called at most once.
 *
 * @param plugin Plugin object given by gerrit on Gerrit.install.
 * @param platformJsElement Script element where platform.js is loaded.
 */
export function initAuth(
  plugin: PluginApi,
  platformJsElement: HTMLScriptElement
) {
  if (globalAuthenticatorPromise) {
    throw new Error('initAuth is called more than once');
  }
  globalAuthenticatorPromise = _initAuth(plugin, platformJsElement);
  console.info('bb: globalAuthenticatorPromise');
}

/** Implements initAuth. Must be called at most once.
 *
 * @param plugin Plugin object given by gerrit on Gerrit.install.
 * @param platformJsElement Script element where platform.js is loaded.
 */
async function _initAuth(
  plugin: PluginApi,
  platformJsElement: HTMLScriptElement
): Promise<Authenticator | null> {
  // Cannot load OAuth config if the user is not logged in.
  console.info('bb: Awaiting plugin.restApi().getLoggedIn()');
  const loggedIn = await plugin.restApi().getLoggedIn();
  console.info('bb: Resolved plugin.restApi().getLoggedIn()', loggedIn);
  if (!loggedIn) {
    console.info('bb: Not logged in');
    return null;
  }

  // Wait for platform.js to load.
  console.info('bb: Awaiting for platform.js to load', platformJsElement);
  const loaded = await new Promise(resolve => {
    // window.gapi is set by platform.js.
    if (window.gapi) {
      resolve(true);
    }
    platformJsElement.onload = () => resolve(true);
    platformJsElement.onerror = () => resolve(false);
  });
  if (!loaded) {
    console.info('bb: platform.js failed to load.');
    return null;
  }
  console.info('bb: platform.js loaded', loaded);

  console.info('bb: Awaiting for /accounts/self/oauthconfig');
  const cfg: OAuthConfig = await plugin
    .restApi()
    .get('/accounts/self/oauthconfig');
  console.info('bb: Resolved /accounts/self/oauthconfig', cfg);
  console.info('bb: Awaiting for loadGapiAuth(cfg)');
  await loadGapiAuth(cfg);
  console.info('bb: Resolved loadGapiAuth(cfg)');
  return new Authenticator(cfg);
}

/**
 * Loads global gapi auth.
 *
 * @param cfg OAuth config loaded from Gerrit.
 * @return Promise resolving when gapi.auth2 is loaded.
 */
async function loadGapiAuth(cfg: OAuthConfig): Promise<void> {
  const gapi = window.gapi;

  // Load "config" library and configure it according to cfg.
  console.info('bb: Awaiting for gapi.load("config_min")');
  await new Promise(resolve => gapi.load('config_min', resolve));
  console.info('bb: Resolved gapi.load("config_min")');
  if (cfg.auth_url) {
    gapi.config.update('oauth-flow/authUrl', cfg.auth_url);
  }
  if (cfg.proxy_url) {
    gapi.config.update('oauth-flow/proxyUrl', cfg.proxy_url);
  }

  // Load "auth2" library only after configuring URLs.
  console.info('bb: Loading "auth2"');
  await new Promise(resolve => gapi.load('auth2', resolve));
  console.info('bb: Resolved gapi.load("auth2")');
}
