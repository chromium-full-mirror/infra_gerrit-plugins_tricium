/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import './test/test-setup';
import {PluginApi} from '@gerritcodereview/typescript-api/plugin';
import {assertRejects} from './test/test-util';
import {
  Authenticator,
  initAuth,
  getAccessToken,
  resetAuthState,
  OAuthConfig,
  Token,
} from './auth';

const platformJsElement = document.getElementById(
  'platformJs'
)! as HTMLScriptElement;

suite('auth', () => {
  let authenticator: Authenticator;
  let token: Token;

  setup(() => {
    token = {
      access_token: 'token',
      expires_at: Date.now() + 60e3,
    };

    window.gapi = {
      auth2: {
        authorize: (_opt: object, resolve: (t: Token) => void) =>
          resolve(token),
      },
    };

    authenticator = new Authenticator({
      client_id: 'client-id',
      email: 'jane@example.com',
    } as OAuthConfig);
  });

  test('getToken returns expected token object', async () => {
    const actualToken = await authenticator.getToken();
    assert.equal(actualToken, token);
  });

  test('getToken rejects when there is no access_token', async () => {
    token.access_token = null;
    assertRejects(authenticator.getToken());
  });

  test('getToken rejects if there is an error', async () => {
    token.error = 'bad';
    assertRejects(authenticator.getToken(), 'bad');
  });

  test('getToken rejects when token has no expiry date', async () => {
    token.expires_at = null;
    assertRejects(authenticator.getToken());
  });

  test('getToken rejects when token is expired', async () => {
    token.access_token = '1543620640';
    assertRejects(authenticator.getToken());
  });

  test('getToken rejects when authorize times out', async () => {
    const forever = new Promise(() => {});
    window.gapi.auth2.authorize = forever;
    assertRejects(authenticator.getToken(), 'timeout');
  });

  test('getToken uses cached token', async () => {
    sinon.spy(window.gapi.auth2, 'authorize');
    const actualToken1 = await authenticator.getToken();
    const actualToken2 = await authenticator.getToken();
    assert.isTrue(window.gapi.auth2.authorize.calledOnce);
    assert.equal(actualToken1, token);
    assert.equal(actualToken2, token);
  });

  test('getToken uses cached token for two async calls', async () => {
    sinon.spy(window.gapi.auth2, 'authorize');
    const [actualToken1, actualToken2] = await Promise.all([
      authenticator.getToken(),
      authenticator.getToken(),
    ]);
    assert.equal(actualToken1, token);
    assert.equal(actualToken2, token);
    assert.isTrue(window.gapi.auth2.authorize.calledOnce);
  });
});

suite('initAuth', () => {
  let plugin: PluginApi;
  let loggedIn: boolean;
  let cfg: OAuthConfig;
  const accessToken = 'token';

  setup(() => {
    loggedIn = true;
    cfg = {} as OAuthConfig;
    plugin = {
      restApi: () => {
        return {
          getLoggedIn: async () => loggedIn,
          get: async _url => cfg,
        };
      },
    } as PluginApi;

    window.gapi = {
      auth2: {
        init: (resolve: () => void) => resolve(),
      },
      config: {
        get: () => null,
        update: () => {},
      },
      load: (_modules: object, resolve: () => void) => resolve(),
    };

    sinon.stub(Authenticator.prototype, 'getToken').resolves({
      access_token: accessToken,
    } as Token);
  });

  teardown(() => {
    sinon.restore();
    resetAuthState();
  });

  test('initAuth sets access token which can then be gotten', async () => {
    initAuth(plugin, platformJsElement);
    const actualAccessToken = await getAccessToken();
    assert.equal(actualAccessToken, accessToken);
  });

  test('initAuth throws if called twice', async () => {
    initAuth(plugin, platformJsElement);
    assert.throws(
      () => initAuth(plugin, platformJsElement),
      'initAuth is called more than once'
    );
  });

  test('getAccessToken rejects if called before init', async () => {
    assertRejects(getAccessToken(), 'initAuth was not called');
  });

  test('initAuth sets up gapi', async () => {
    sinon.spy(window.gapi.config, 'update');
    sinon.spy(window.gapi, 'load');
    cfg = {
      auth_url: 'https://example.com/auth',
      proxy_url: 'https://example.com/proxy',
    } as OAuthConfig;
    initAuth(plugin, platformJsElement);
    await getAccessToken();

    assert.isTrue(
      window.gapi.config.update.calledWith('oauth-flow/authUrl', cfg.auth_url)
    );
    assert.isTrue(
      window.gapi.config.update.calledWith('oauth-flow/proxyUrl', cfg.proxy_url)
    );

    // `auth` must be loaded after config is updated.
    assert.isTrue(
      window.gapi.load
        .withArgs('auth2', sinon.match.any)
        .calledAfter(window.gapi.config.update)
    );
  });
});
