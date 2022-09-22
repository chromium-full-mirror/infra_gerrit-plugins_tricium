/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import {assert} from '@open-wc/testing';

import {assertRejects} from './test/test-util';
import {
  Authenticator,
  initAuth,
  getAuthorizationHeader,
  resetAuthState,
  JWT_TOKEN_ID,
  JWT_TIMEOUT_MILLISECONDS,
  Token,
} from './auth';
import {PluginApi} from '@gerritcodereview/typescript-api/plugin';

suite('auth', () => {
  let sandbox: sinon.SinonSandbox;
  let authenticator: Authenticator;
  let plugin: PluginApi;
  let jwtToken: Token;
  let jwtResponse: {jwts: any};
  let clock: sinon.SinonFakeTimers;
  let changeId: string;

  setup(() => {
    sandbox = sinon.createSandbox({});
    clock = sinon.useFakeTimers({
      now: new Date().getTime(),
    });

    jwtToken = {
      signed_jwt: 'abc',
      expires_at: new Date().getTime() + JWT_TIMEOUT_MILLISECONDS,
    };

    jwtResponse = {
      jwts: {
        [JWT_TOKEN_ID]: {
          signed_jwt: 'abc',
        },
      },
    };

    changeId = '123';
    plugin = {
      restApi: () => {
        return {
          get: () => jwtResponse,
        };
      },
    } as unknown as PluginApi;

    authenticator = new Authenticator(plugin);
  });

  teardown(() => {
    sandbox.restore();
    clock.restore();
  });

  test('getToken returns expected token object', async () => {
    const actualToken = await authenticator.getToken(changeId);
    assert.deepEqual(actualToken, jwtToken);
  });

  test('getToken rejects if there is an error', async () => {
    jwtResponse.jwts[JWT_TOKEN_ID].error = 'bad';
    assertRejects(authenticator.getToken(changeId), 'bad');
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
  let jwtToken: Token;
  let jwtResponse: {jwts: any};
  setup(() => {
    sandbox = sinon.createSandbox({
      useFakeTimers: {now: 1543620642},
    });

    jwtToken = {
      signed_jwt: 'abc',
      expires_at: new Date().getTime() + JWT_TIMEOUT_MILLISECONDS,
    };

    jwtResponse = {
      jwts: {
        [JWT_TOKEN_ID]: {
          signed_jwt: 'abc',
        },
      },
    };

    plugin = {
      restApi: () => {
        return {
          get: () => jwtResponse,
          getLoggedIn: () => true,
        };
      },
    } as unknown as PluginApi;

    sandbox
      .stub(Authenticator.prototype, 'getToken')
      .callsFake(async () => jwtToken);
  });

  teardown(() => {
    sandbox.restore();
    resetAuthState();
  });

  test('initAuth sets access token which can then be gotten', async () => {
    initAuth(plugin);
    const actualAuthHeader = await getAuthorizationHeader('123456');
    assert.deepEqual(actualAuthHeader, {
      'X-Gerrit-Auth': jwtToken.signed_jwt,
    });
  });

  test('initAuth throws if called twice', async () => {
    initAuth(plugin);
    assert.throws(() => initAuth(plugin), 'initAuth is called more than once');
  });

  test('getAuthorizationHeader rejects if called before init', async () => {
    assertRejects(getAuthorizationHeader('123456'), 'initAuth was not called');
  });
});
