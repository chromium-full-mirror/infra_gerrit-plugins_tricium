/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import {assert} from '@open-wc/testing';
import {
  TriciumV1Client,
  RobotCommentInfo,
  ReportNotUsefulResponse,
} from './tricium-client';
import './tricium-feedback-button';
import {TriciumFeedbackButton} from './tricium-feedback-button';

suite('<tricium-feedback-button> init conditions', () => {
  const element: TriciumFeedbackButton = new TriciumFeedbackButton();
  let initSpy: sinon.SinonSpy;

  function makeExampleComment(): RobotCommentInfo {
    return {
      id: '1234_abcd',
      robot_run_id: '2345',
      robot_id: 'Spacey/Mixed',
      message: 'mixed whitespace',
      author: {
        name: 'Tricium',
        email: 'tricium-dev@appspot.gserviceaccount.com',
      },
      properties: {
        tricium_comment_uuid: 'abcd1234-abcd1234',
      },
    };
  }

  setup(() => {
    initSpy = sinon.spy(element, 'init');
  });

  teardown(() => {
    initSpy.restore();
  });

  test('init is called with valid comment', () => {
    element.comment = makeExampleComment();
    element.connectedCallback();
    assert.isTrue(initSpy.called);
  });

  test('init is not called with no comment', () => {
    element.comment = undefined;
    element.connectedCallback();
    assert.isFalse(initSpy.called);
  });

  test('init is not called with empty author', () => {
    element.comment = makeExampleComment();
    delete element.comment.author;
    element.connectedCallback();
    assert.isFalse(initSpy.called);
  });

  test('init is not called with non-robot comment', () => {
    element.comment = makeExampleComment();
    delete element.comment.robot_run_id;
    delete element.comment.robot_id;
    element.connectedCallback();
    assert.isFalse(initSpy.called);
  });

  test('init is not called with non-tricium comment', () => {
    element.comment = makeExampleComment();
    element.comment.author = {
      name: 'Someone',
      email: 'someone@somewhere',
    };
    element.connectedCallback();
    assert.isFalse(initSpy.called);
  });
});

suite('<tricium-feedback-button> report behavior', () => {
  const element: TriciumFeedbackButton = new TriciumFeedbackButton();
  let reportStub: sinon.SinonStub;

  function makeExampleComment(): RobotCommentInfo {
    return {
      id: '1234_abcd',
      robot_run_id: '2345',
      robot_id: 'Spacey/Mixed',
      author: {
        name: 'Tricium',
        email: 'tricium-dev@appspot.gserviceaccount.com',
      },
      properties: {
        tricium_comment_uuid: 'abcd1234-abcd1234',
      },
    };
  }

  function makeExampleResponse(): ReportNotUsefulResponse {
    return {owner: 'foo'} as ReportNotUsefulResponse;
  }

  /**
   * Asserts that the URLs are roughly equal, i.e. same origin, path and same
   * set of search params.
   *
   * @param urlA URL to be compared.
   * @param urlB URL to be compared.
   */
  function assertURLsEqual(urlA: string, urlB: string) {
    const aParams = new URL(urlA);
    const bParams = new URL(urlB);
    assert.equal(aParams.origin, bParams.origin);
    assert.equal(aParams.pathname, bParams.pathname);
    assert.deepEqual(aParams.searchParams, bParams.searchParams);
  }

  setup(() => {
    reportStub = sinon.stub(TriciumV1Client.prototype, 'reportNotUseful');
  });

  teardown(() => {
    reportStub.restore();
  });

  test('getProjectName gets project name from URL', async () => {
    sinon
      .stub(element, 'getCurrentUrl')
      .returns(
        'https://chromium-review.googlesource.com/c/chromium/src/+/1893975'
      );
    assert.equal(element.getProjectName(), 'chromium/src');
  });

  test('reportNotUseful delegates to client', async () => {
    element.triciumClient = new TriciumV1Client('host');
    reportStub.callsFake(async comment => {
      assert.deepEqual(comment, makeExampleComment());
      return makeExampleResponse();
    });
    element.comment = makeExampleComment();
    element.isDisabled = false;
    const response = await element.reportNotUseful();
    assert.deepEqual(response, makeExampleResponse());
  });

  test('reportNotUseful with success, button disabled', async () => {
    element.triciumClient = new TriciumV1Client('host');
    reportStub.callsFake(async _comment => makeExampleResponse());
    element.comment = makeExampleComment();
    element.isDisabled = false;
    const response = await element.reportNotUseful();
    assert.deepEqual(response, makeExampleResponse());
    assert.equal(element.buttonText, 'Reported not useful');
    assert.isTrue(element.isDisabled);
  });

  test('reportNotUseful with failure, button stays enabled', async () => {
    reportStub.callsFake(_comment => {
      throw Error('some error');
    });
    element.comment = makeExampleComment();
    element.isDisabled = false;
    let alertFired = false;
    element.addEventListener('show-alert', e => {
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
      assert.equal((e as any).detail.message, 'Failed to report not useful');
      alertFired = true;
    });
    try {
      await element.reportNotUseful();
      assert.fail('got no exception', 'expected exception');
    } catch (error) {
      assert.isFalse(element.isDisabled);
      assert.isTrue(alertFired);
    }
  });

  test('constructBugLinkURL with no owner/component', () => {
    element.comment = makeExampleComment();
    element.triciumHost = 'tricium-dev.appspot.com';
    assertURLsEqual(
      element.constructBugLinkURL({} as ReportNotUsefulResponse),
      'https://bugs.chromium.org/p/chromium/issues/entry' +
        '?summary=Issue+report+for+Spacey%2FMixed' +
        '&description=https%3A%2F%2Ftricium-dev.appspot.com%2Frun%2F2345'
    );
  });

  test('constructBugLinkURL with owner/component', () => {
    element.comment = makeExampleComment();
    element.triciumHost = 'tricium-dev.appspot.com';
    assertURLsEqual(
      element.constructBugLinkURL({
        owner: 'someone@chromium.org',
        monorailComponent: 'Some>Component',
      } as ReportNotUsefulResponse),
      'https://bugs.chromium.org/p/chromium/issues/entry' +
        '?summary=Issue+report+for+Spacey%2FMixed' +
        '&description=https%3A%2F%2Ftricium-dev.appspot.com%2Frun%2F2345' +
        '&components=Some%3EComponent' +
        '&cc=someone%40chromium.org'
    );
  });

  test('constructBugLinkURL with issue tracker component id', () => {
    element.comment = makeExampleComment();
    element.triciumHost = 'tricium-dev.appspot.com';
    assertURLsEqual(
      element.constructBugLinkURL({
        owner: 'someone@chromium.org',
        monorailComponent: 'Old>Component',
        issueTrackerComponentId: '1234',
      } as ReportNotUsefulResponse),
      'https://issues.chromium.org/issues/new?' +
        'title=Issue+report+for+Spacey%2FMixed' +
        '&description=https%3A%2F%2Ftricium-dev.appspot.com%2Frun%2F2345' +
        '&component=1234' +
        '&cc=someone%40chromium.org'
    );
  });
});
