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

import { IPartialCommandDefinition } from "../../IPartialCommandDefinition";
import { ICommandHandlerClass } from "../../ICommandDefinition";

export interface ICommandProfileAutoInitConfig {
    /**
     * The handler for the auto-init command - either the handler class itself,
     * or a path to the handler module. The handler should inherit from Imperative
     * BaseAutoInitHandler. When the handler class is provided directly, no local
     * lookup of the handler module is performed; when a string path is provided,
     * the handler is located via the require lookup.
     */
    handler: string | ICommandHandlerClass;

    /**
     * The provider giving connection information and details for the automatically generated config
     */
    provider: string;

    /**
     * Command properties for `config auto-init`
     */
    autoInit?: IPartialCommandDefinition;

    /**
     * The type of profile associated with the provider, if any
     */
    profileType?: string;
}
