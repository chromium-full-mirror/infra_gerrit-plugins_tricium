// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
  'use strict';

  /** Client for Tricium V1 API. */
  class TriciumV1Client {
    constructor(host) {
      this.triciumHost = host;
    }

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
    }

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
    }

    /** Checks if the response indicates that a run wasn't found. */
    _isNotFound(response) {
      return this._rpcCode(response) == 5 && response.status == 404;
    }

    /** Checks if the response indicates an OK response. */
    _isOk(response) {
      return this._rpcCode(response) == 0 && response.status == 200;
    }

    /** @return {number} The RPC code from the response, NaN if absent. */
    _rpcCode(response) {
      return parseInt(response.headers.get('X-Prpc-Grpc-Code'), 10);
    }

    /** @return {Promise} Resolves to parsed object. */
    async _parseRpcJson(response) {
      const jsonPrefix = ')]}\'';
      const text = await response.text();
      return JSON.parse(text.substring(jsonPrefix.length));
    }

    /** @return {Promise} Resolves to a description of an RPC response. */
    async _message(response) {
      const code = this._rpcCode(response);
      const text = await response.text();
      return `X-Prpc-Grpc-Code: ${code}\n` +
          `HTTP status: ${response.status}\n` +
          `Body: ${text}`;
    }

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
      const accessToken = await this._getAccessToken();
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
    }

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
    }

    /** Mockable equivalent of window.tricium.getAccessToken. */
    _getAccessToken() {
      return window.tricium.getAccessToken();
    }
  }

  window.tricium = window.tricium || {};
  Object.assign(window.tricium, {
    TriciumV1Client,
  });
})();
