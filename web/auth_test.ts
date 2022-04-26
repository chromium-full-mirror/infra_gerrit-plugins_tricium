/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import {assertRejects} from './test/test-util';
import './test/test-setup';
import {Authenticator, initAuth, getAuthorizationHeader, resetAuthState, JWT_TOKEN_ID, JWT_TIMEOUT_MILLISECONDS, GERRIT_JWT_FLAG, Token, OAuthConfig} from './auth';
import {PluginApi} from '@gerritcodereview/typescript-api/plugin';
import { RestPluginApi } from '@gerritcodereview/typescript-api/rest';

const platformJsElement = document.getElementById('platformJs') as HTMLScriptElement;

suite('auth', () => {
  let sandbox: sinon.SinonSandbox;
  let authenticator: Authenticator;
  let plugin: PluginApi;
  let accessToken: Token;
  let jwtToken: Token;
  let jwtResponse: {jwts: any};
  let clock: sinon.SinonFakeTimers;
  let changeId: string;

  setup(() => {
    sandbox = sinon.createSandbox({});
    clock = sinon.useFakeTimers({
      now: new Date().getTime(),
    });
    accessToken = {
      access_token: 'token',
      expires_at: Date.now() + 60e3,
    };

    jwtToken = {
      signed_jwt: 'abc',
      expires_at: new Date().getTime() + JWT_TIMEOUT_MILLISECONDS,
    }

    window.gapi = {
      auth2: {
        authorize: (_: any, resolve: any) => resolve(accessToken),
      },
    };

    jwtResponse = {
      jwts: {
        [JWT_TOKEN_ID]: {
          signed_jwt: 'abc',
        }
      }
    };

    changeId = '123';
    plugin = {
      restApi: () => ({
        get: () => jwtResponse
      })
    } as unknown as PluginApi;

    // Test with Mendel flag enabled
    if (!window.ENABLED_EXPERIMENTS) {
      window.ENABLED_EXPERIMENTS = [];
    }

    window.ENABLED_EXPERIMENTS.push(GERRIT_JWT_FLAG);

    authenticator = new Authenticator({
      client_id: 'client-id',
      email: 'jane@example.com',
    }, plugin);
  });

  teardown(() => {
    sandbox.restore();
    clock.restore();
  });

  test('getToken returns expected token object', async () => {
    const actualToken = await authenticator.getToken(changeId);
    assert.deepEqual(actualToken, jwtToken);
  });

  test('getToken falls back to access_token when JWT is not configured', async () => {
    plugin.restApi = () => ({
      get: () => { throw new Error(); }
    } as unknown as RestPluginApi);

    const actualToken = await authenticator.getToken(changeId);
    assert.deepEqual(actualToken, accessToken);

    plugin.restApi = () => ({
      get: () => jwtResponse
    } as unknown as RestPluginApi);
  });

  test('getToken falls back to access_token when there is no JWT', async () => {
    jwtResponse.jwts = {};
    const actualToken = await authenticator.getToken(changeId);
    assert.deepEqual(actualToken, accessToken);
  });

  test('getToken rejects if there is an error', async () => {
    jwtResponse.jwts[JWT_TOKEN_ID].error = 'bad';
    assertRejects(authenticator.getToken(changeId), 'bad');
  });

  test('getToken rejects when token has no expiry date', async () => {
    jwtResponse.jwts = {};
    accessToken.expires_at = null;
    assertRejects(authenticator.getToken(changeId));
  });

  test('getToken rejects when token is expired', async () => {
    jwtResponse.jwts = {};
    accessToken.expires_at = 1543620640;
    assertRejects(authenticator.getToken(changeId));
  });

  test('getToken rejects when authorize times out', async () => {
    jwtResponse.jwts = {};
    const forever = new Promise(() => {});
    sandbox.stub(gapi.auth2, 'authorize').callsFake(forever as any);
    assertRejects(authenticator.getToken(changeId), 'timeout');
  });

  test('getToken uses cached token', async () => {
    sandbox.spy(plugin, 'restApi');
    const actualToken1 = await authenticator.getToken(changeId);
    const actualToken2 = await authenticator.getToken(changeId);
    assert.isTrue((plugin.restApi as any).calledOnce);
    assert.deepEqual(actualToken1, jwtToken);
    assert.deepEqual(actualToken2, jwtToken);
  });

  test('getToken uses cached token for two async calls', async () => {
    sandbox.spy(plugin, 'restApi');
    const [actualToken1, actualToken2] = await Promise.all([
      authenticator.getToken(changeId),
      authenticator.getToken(changeId),
    ]);
    assert.deepEqual(actualToken1, jwtToken);
    assert.deepEqual(actualToken2, jwtToken);
    assert.isTrue((plugin.restApi as any).calledOnce);
  });
});

suite('initAuth', () => {
  let sandbox: sinon.SinonSandbox;
  let plugin: PluginApi;
  let loggedIn: boolean;
  let cfg: OAuthConfig;
  const accessToken = 'token';

  setup(() => {
    sandbox = sinon.createSandbox({
      useFakeTimers: {now: 1543620642},
    });

    loggedIn = true;
    cfg = {};
    plugin = {
      restApi: () => ({
        getLoggedIn: async () => loggedIn,
        get: async (_) => cfg,
      }),
    } as PluginApi;

    window.gapi = {
      auth2: {
        init: (resolve: any) => resolve(),
      },
      config: {
        get: () => null,
        update: () => {},
      },
      load: (_: any, resolve: any) => resolve(),
    };

    sandbox.stub(Authenticator.prototype, 'getToken').callsFake(async () => ({
      access_token: accessToken,
      expires_at: 0,
    }));
  });

  teardown(() => {
    sandbox.restore();
    resetAuthState();
  });

  test('initAuth sets access token which can then be gotten', async () => {
    initAuth(plugin, platformJsElement);
    const actualAuthHeader = await getAuthorizationHeader('123456');
    assert.deepEqual(actualAuthHeader, {'authorization': `Bearer ${accessToken}`});
  });

  test('initAuth throws if called twice', async () => {
    initAuth(plugin, platformJsElement);
    assert.throws(
      () => initAuth(plugin, platformJsElement), 'initAuth is called more than once');
  });

  test('getAuthorizationHeader rejects if called before init', async () => {
    assertRejects(getAuthorizationHeader('123456'), 'initAuth was not called');
  });

  test('initAuth sets up gapi', async () => {
    sandbox.spy(gapi.config, 'update');
    sandbox.spy(gapi, 'load');
    cfg = {
      auth_url: 'https://example.com/auth',
      proxy_url: 'https://example.com/proxy',
    };
    initAuth(plugin, platformJsElement);
    await getAuthorizationHeader('123456');

    assert.isTrue(
      gapi.config.update.calledWith('oauth-flow/authUrl', cfg.auth_url));
    assert.isTrue(
      gapi.config.update.calledWith('oauth-flow/proxyUrl', cfg.proxy_url));

    // `auth` must be loaded after config is updated.
    assert.isTrue(
      gapi.load.withArgs('auth2', sinon.match.any)
      .calledAfter(gapi.config.update));
  });
});

