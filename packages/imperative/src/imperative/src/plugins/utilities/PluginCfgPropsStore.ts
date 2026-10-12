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

import { IPluginCfgProps } from "../doc/IPluginCfgProps";

/**
 * Holds the configuration properties for all loaded plugins. This state lives
 * outside of PluginManagementFacility so that command handlers can access it
 * without creating a circular dependency with the facility.
 */
export class PluginCfgPropsStore {

    /**
     * Internal reference to the set of configuration properties for all loaded plugins.
     */
    private static mAllPluginCfgProps: IPluginCfgProps[] = [];

    /**
     * Get the set of configuration properties for all loaded plugins.
     * @return {IPluginCfgProps[]}
     */
    public static get allPluginCfgProps(): IPluginCfgProps[] {
        return PluginCfgPropsStore.mAllPluginCfgProps;
    }
}
