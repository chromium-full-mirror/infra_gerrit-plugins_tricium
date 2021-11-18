/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import {getAccessToken} from './auth.js';

export declare interface RobotCommentInfo {
  id: string;
  message?: string;
  robot_id?: string;
  robot_run_id?: string;
  url?: string;
  properties?: {
    tricium_comment_uuid: string;
  };
  author?: {
    name: string;
    email: string;
  };
}

declare interface TriciumRequest {
  comment_id?: string;
  gerritRevision?: {
    host: string;
    project: string;
    change: string;
    gitRef: string;
  };
}

export declare interface ReportNotUsefulResponse extends Response {
  owner?: string;
  monorailComponent?: string;
}

/** Client for Tricium V1 API. */
export class TriciumV1Client {
  triciumHost: string;

  constructor(host: string) {
    this.triciumHost = host;
  }

  /**
   * Send a "not useful" Feedback message to the Tricium server.
   *
   * @param comment The comment to send feedback for.
   * @return Resolves if successful, or rejects with error.
   */
  async reportNotUseful(
    comment: RobotCommentInfo
  ): Promise<ReportNotUsefulResponse> {
    if (!this.triciumHost) {
      throw Error('Cannot send report, Tricium host not set.');
    }
    if (!comment.properties?.tricium_comment_uuid) {
      throw Error(
        'No tricium_comment_uuid field in comment.properties: ' +
          JSON.stringify(comment.properties)
      );
    }
    const request = {
      comment_id: comment.properties.tricium_comment_uuid,
    };
    const response = await this.rpcRequest(
      this.triciumHost,
      'tricium.Tricium',
      'ReportNotUseful',
      request
    );
    if (this.isOk(response)) {
      return (await this.parseRpcJson(response)) as ReportNotUsefulResponse;
    }
    throw Error(await this.message(response));
  }

  /** Checks if the response indicates an OK response. */
  private isOk(response: Response): boolean {
    return this.rpcCode(response) === 0 && response.status === 200;
  }

  /** @return The RPC code from the response, NaN if absent. */
  rpcCode(response: Response): number {
    return parseInt(response.headers.get('X-Prpc-Grpc-Code') || '', 10);
  }

  /** @return Promise resolving to parsed object. */
  async parseRpcJson(response: Response): Promise<object> {
    const jsonPrefix = ")]}'";
    const text = await response.text();
    return JSON.parse(text.substring(jsonPrefix.length));
  }

  /** @return Promise resolving to a description of an RPC response. */
  async message(response: Response): Promise<string> {
    const code = this.rpcCode(response);
    const text = await response.text();
    return (
      `X-Prpc-Grpc-Code: ${code}\n` +
      `HTTP status: ${response.status}\n` +
      `Body: ${text}`
    );
  }

  /**
   * Make a pRPC request with JSON data to the given service.
   *
   * For more about pRPC, see:
   *   https://godoc.org/github.com/luci/luci-go/grpc/prpc
   *
   * Note: This could be changed to use the rpc-client element from
   * https://chromium.googlesource.com/infra/luci/luci-go/+/HEAD/web/inc/rpc/.
   * However, that element has extra dependencies expected to be managed via
   * bower and compiled together with vulcanize. It also has more
   * functionality than is required here.
   *
   * @param host The host to send requests to.
   * @param service Service name, including package name.
   * @param method The RPC method name.
   * @param request Request message object.
   * @return Promise resolving to a fetch Response object.
   */
  private async rpcRequest(
    host: string,
    service: string,
    method: string,
    request: TriciumRequest
  ): Promise<Response> {
    const url = `https://${host}/prpc/${service}/${method}`;
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    const accessToken = await this._getAccessToken();
    if (accessToken) {
      headers.set('Authorization', 'Bearer ' + accessToken);
    } else {
      console.info(`Making request to ${url} with no bearer token.`);
    }
    const opts = {
      headers,
      method: 'POST',
      body: JSON.stringify(request),
    };
    return await fetch(url, opts);
  }

  /** Mockable equivalent of window.tricium.getAccessToken. */
  _getAccessToken() {
    return getAccessToken();
  }
}
