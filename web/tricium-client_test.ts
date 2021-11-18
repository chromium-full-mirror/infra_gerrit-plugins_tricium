/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import './test/test-setup';
import {TriciumV1Client, RobotCommentInfo} from './tricium-client';
import {assertRejects} from './test/test-util';

suite('TriciumV1Client RPC request behavior', () => {
  let client: TriciumV1Client;
  let fetchStub: sinon.SinonStub;

  const comment: RobotCommentInfo = {
    id: '8a0b9120_a01440e3',
    robot_id: 'Hello',
    robot_run_id: '123412341234',
    properties: {
      tricium_comment_uuid: 'f37e05e3-ce3b-475b-a4cd-2cc60814bc69',
    },
  };

  function newSuccessResponse(data: object): Response {
    return new Response(")]}'" + JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Prpc-Grpc-Code': '0',
      },
    });
  }

  setup(() => {
    client = new TriciumV1Client('tricium-mock.appspot.com');
    client._getAccessToken = async () => 'accessToken';
    fetchStub = sinon.stub(window, 'fetch');
  });

  teardown(() => {
    fetchStub.restore();
  });

  test('reportNotUseful with valid comment', async () => {
    const responseData = {responseField: 123};
    const response = newSuccessResponse(responseData);
    fetchStub.returns(Promise.resolve(response));
    const data = await client.reportNotUseful(comment);
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    assert.deepEqual(data, responseData as any);
  });

  test('reportNotUseful with invalid empty comment', async () => {
    const response = newSuccessResponse({responseField: 123});
    fetchStub.returns(Promise.resolve(response));
    assertRejects(
      client.reportNotUseful({properties: {}} as RobotCommentInfo),
      'No tricium_comment_uuid field in comment.properties: {}'
    );
  });

  test('message describes response contents', async () => {
    const successResponse = newSuccessResponse({responseField: 123});
    const message = await client.message(successResponse);
    assert.equal(
      message,
      'X-Prpc-Grpc-Code: 0\nHTTP status: 200\n' +
        'Body: )]}\'{"responseField":123}'
    );
  });

  test('parseRpcJson parses pRPC JSON', async () => {
    const response = newSuccessResponse({mydata: 42});
    const data = await client.parseRpcJson(response);
    assert.deepEqual(data, {mydata: 42});
  });

  test('parseRpcJson raises with invalid JSON', async () => {
    const response = new Response('not valid JSON', {
      status: 500,
      headers: {'X-Prpc-Grpc-Code': '1'},
    });
    assertRejects(client.parseRpcJson(response));
  });

  test('rpcCode with an error code present', () => {
    const response = new Response('Invalid Argument', {
      status: 400,
      headers: {'X-Prpc-Grpc-Code': '3'},
    });
    assert.equal(client.rpcCode(response), 3);
  });

  test('rpcCode with missing header', () => {
    const response = new Response('Not pRPC', {
      status: 200,
    });
    assert.isNaN(client.rpcCode(response));
  });
});
