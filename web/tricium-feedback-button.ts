/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import {PluginApi} from '@gerritcodereview/typescript-api/plugin';
import {css, html, LitElement} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {
  TriciumV1Client,
  RobotCommentInfo,
  ReportNotUsefulResponse,
} from './tricium-client';

declare interface TriciumConfig {
  triciumHost: string;
}

@customElement('tricium-feedback-button')
export class TriciumFeedbackButton extends LitElement {
  @property()
  triciumHost = '';

  @property()
  triciumClient: TriciumV1Client | null = null;

  @property()
  plugin!: PluginApi;

  @property()
  comment?: RobotCommentInfo;

  @state()
  isHidden = true;

  @state()
  isBugLinkHidden = true;

  @state()
  isDisabled = true;

  @state()
  buttonText = 'Not useful';

  @property()
  bugLinkURL = 'https://issues.chromium.org/issues/new?component=1456522';

  static override styles = css`
    #buglink {
      color: var(--link-color);
    }
  `;

  override render() {
    return html`
      <gr-button
        class="action"
        ?hidden="${this.isHidden}"
        @click=${this.reportNotUseful}
        ?disabled="${this.isDisabled}"
        link
        >${this.buttonText}</gr-button
      >
      <a
        id="buglink"
        href="${this.bugLinkURL}"
        target="_blank"
        ?hidden="${this.isBugLinkHidden}"
      >
        File a Bug
      </a>
    `;
  }

  /** Upon attachment in the page, initialize the element. */
  override connectedCallback() {
    super.connectedCallback();
    if (!this.comment) {
      console.warn('tricium-feedback-button attached without comment');
      return;
    }
    if (!this.comment.robot_run_id) {
      return; // Not a robot comment.
    }
    // The email addresses for the tricium service accounts are
    // tricium-{dev,prod}@appspot.gserviceaccount.com.
    // If this is not a Tricium robot comment, don't show a button.
    if (!this.comment.author?.email?.startsWith('tricium-')) {
      return;
    }
    this.init();
  }

  /** Load config and set tricium host name. */
  async init() {
    const project = this.getProjectName();
    if (!project) {
      console.warn('tricium-feedback-button could not find project name');
      return;
    }
    const pluginName = this.plugin.getPluginName();
    const config: TriciumConfig = await this.plugin
      .restApi()
      .get(
        `/projects/${encodeURIComponent(project)}/` +
          `${encodeURIComponent(pluginName)}~config`
      );
    if (config?.triciumHost) {
      this.triciumHost = config.triciumHost;
      this.isHidden = false;
      this.isDisabled = false;
      this.triciumClient = new TriciumV1Client(this.triciumHost);
    } else {
      console.warn(
        `No config found for project "${project}", plugin "${pluginName}", ` +
          'cannot report feedback.'
      );
    }
    return Boolean(this.triciumHost);
  }

  /** Enables stubbing current URL in unit tests */
  getCurrentUrl(): string {
    return window.location.href;
  }

  /** Fetch the project name for the current change. */
  getProjectName(): string {
    // We use a roundabout way of getting the project name because we don't
    // have access to the change object.
    // TODO(qyearsley): Find a better way to get the project name.
    const url = this.getCurrentUrl();
    // Get the project name between the /c/ and /+/ fields in the URL
    const projectMatches = url.match(/\/c\/(.*)\/\+\//);
    if (!projectMatches || projectMatches.length <= 1) {
      console.warn(`Could not get project name from URL "${url}"`);
      return '';
    }
    return projectMatches[1];
  }

  /** Report to the tricium server that this comment was not useful. */
  async reportNotUseful(): Promise<ReportNotUsefulResponse> {
    if (this.isDisabled) {
      console.warn('reportNotUseful called on disabled button');
      return Promise.reject(new Error('unexpected reportNotUseful call'));
    }
    this.isDisabled = true;
    try {
      const response = await this.triciumClient!.reportNotUseful(this.comment!);
      this.bugLinkURL = this.constructBugLinkURL(response);
      this.buttonText = 'Reported not useful';
      this.isBugLinkHidden = false;
      return response;
    } catch (err) {
      this.dispatchEvent(
        new CustomEvent('show-alert', {
          detail: {message: 'Failed to report not useful'},
          bubbles: true,
        })
      );
      this.isDisabled = false;
      return Promise.reject(new Error('failed reportNotUseful call'));
    }
  }

  constructBugLinkURL(response: ReportNotUsefulResponse): string {
    const params = new URLSearchParams();
    params.set(
      'description',
      `https://${this.triciumHost}/run/${this.comment!.robot_run_id}`
    );
    if (response.owner) {
      params.set('cc', response.owner);
    }
    const title = `Issue report for ${this.comment!.robot_id}`;
    if (response.issueTrackerComponentId) {
      params.set('component', response.issueTrackerComponentId);
      params.set('title', title);
      return `https://issues.chromium.org/issues/new?${params.toString()}`
    }

    params.set('summary', title);
    if (response.monorailComponent) {
      params.set('components', response.monorailComponent);
    }
    const base = 'https://bugs.chromium.org/p/chromium/issues/entry';
    return base + '?' + params.toString();
  }
}
