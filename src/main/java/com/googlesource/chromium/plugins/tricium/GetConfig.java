// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.googlesource.chromium.plugins.tricium;

import com.google.gerrit.extensions.annotations.PluginName;
import com.google.gerrit.extensions.restapi.RestReadView;
import com.google.gerrit.server.config.PluginConfigFactory;
import com.google.gerrit.server.project.NoSuchProjectException;
import com.google.gerrit.server.project.ProjectResource;
import com.google.gson.annotations.SerializedName;
import com.google.inject.Inject;
import com.google.inject.Singleton;
import org.eclipse.jgit.lib.Config;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
class GetConfig implements RestReadView<ProjectResource> {

  private static final Logger LOG = LoggerFactory.getLogger(GetConfig.class);
  private static final String HOST_SECTION = "host";
  private static final String TRICIUM = "tricium";

  private final PluginConfigFactory config;
  private final String pluginName;

  @Inject
  GetConfig(PluginConfigFactory config, @PluginName String pluginName) {
    this.config = config;
    this.pluginName = pluginName;
  }

  @Override
  public TriciumConfig apply(ProjectResource project) throws NoSuchProjectException {
    LOG.info("Getting config for {}...", project.getName());
    Config cfg = config.getProjectPluginConfigWithInheritance(
        project.getNameKey(), pluginName);
    LOG.info("Found sections: {}", cfg.getSections());

    TriciumConfig result = new TriciumConfig();
    result.triciumHost = cfg.getString(HOST_SECTION, null, TRICIUM);
    LOG.info("Found Tricium host: {}", result.triciumHost);

    return result;
  }

  static class TriciumConfig {
    @SerializedName("triciumHost")
    String triciumHost;
  }
}
