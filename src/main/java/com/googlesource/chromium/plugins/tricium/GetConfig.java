// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.googlesource.chromium.plugins.tricium;

import com.google.common.flogger.FluentLogger;
import com.google.gerrit.extensions.annotations.PluginName;
import com.google.gerrit.extensions.restapi.RestReadView;
import com.google.gerrit.server.config.PluginConfigFactory;
import com.google.gerrit.server.project.NoSuchProjectException;
import com.google.gerrit.server.project.ProjectResource;
import com.google.gson.annotations.SerializedName;
import com.google.inject.Inject;
import com.google.inject.Singleton;
import org.eclipse.jgit.lib.Config;

@Singleton
class GetConfig implements RestReadView<ProjectResource> {
  private static final FluentLogger logger = FluentLogger.forEnclosingClass();

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
    logger.atInfo().log("Getting config for %s...", project.getName());
    Config cfg = config.getProjectPluginConfigWithInheritance(
        project.getNameKey(), pluginName);
    logger.atInfo().log("Found sections: %s", cfg.getSections());

    TriciumConfig result = new TriciumConfig();
    result.triciumHost = cfg.getString(HOST_SECTION, null, TRICIUM);
    logger.atInfo().log("Found Tricium host: %s", result.triciumHost);

    return result;
  }

  static class TriciumConfig {
    @SerializedName("triciumHost")
    String triciumHost;
  }
}
