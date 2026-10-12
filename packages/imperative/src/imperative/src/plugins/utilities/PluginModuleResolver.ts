/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

import { existsSync } from "fs";
import { isAbsolute, join } from "path";
import { IssueSeverity, PluginIssues } from "./PluginIssues";
import { PMFConstants } from "./PMFConstants";
import { runtimeRequire } from "../../../../utilities";

/**
 * Form the runtime path to a module within an installed plugin.
 *
 * @param {string} pluginName - The name of the plugin/module to load.
 * @param {string} relativePath - A relative path name from the plugin's root
 *     to the module. If omitted, the plugin's runtime root is returned.
 *
 * @returns {string} - The runtime path to the plugin module
 */
export function formPluginRuntimePath(pluginName: string, relativePath: string = ""): string {
    // Attempt to find the node_modules that contains the plugin
    let pluginRuntimeDir = null;
    for (const location of PMFConstants.instance.PLUGIN_NODE_MODULE_LOCATION) {
        pluginRuntimeDir = join(location, pluginName);
        if (existsSync(pluginRuntimeDir)) {
            break;
        }
    }

    if (relativePath.length === 0) {
        return pluginRuntimeDir;
    }

    /* If the relative path is already absolute, do not place our
     * plugin's runtime location in front of the supplied path.
     */
    if (isAbsolute(relativePath)) {
        return relativePath;
    }

    return join(pluginRuntimeDir, relativePath);
}

/**
 * Produces a function that requires a module from a plugin using a relative
 * path name from the plugin's root to the module. Used as a callback function
 * from the ConfigurationLoader to load configuration handlers.
 *
 * @param {string} pluginName - The name of the plugin/module to load.
 *
 * @returns {function} - The method responsible for requiring the module
 */
export function requirePluginModuleCallback(pluginName: string): ((relativePath: string) => any) {
    return (relativePath: string) => {
        const pluginModuleRuntimePath = formPluginRuntimePath(pluginName, relativePath);
        try {
            return runtimeRequire(pluginModuleRuntimePath);
        } catch (requireError) {
            PluginIssues.instance.recordIssue(pluginName, IssueSeverity.CMD_ERROR,
                "Unable to load the following module for plug-in '" +
                pluginName + "' :\n" + pluginModuleRuntimePath + "\n" +
                "Reason = " + requireError.message
            );
            return {};
        }
    };
}
