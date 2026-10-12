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

/**
 * When this module is processed by webpack, `__non_webpack_require__` is replaced
 * by webpack with Node's native require (which can load modules that are not part
 * of the bundle). Otherwise (plain tsc output) it is undefined and the normal
 * require is used.
 */
declare const __non_webpack_require__: NodeJS.Require | undefined;

/**
 * Node's native require function. Use this instead of the bare `require` for
 * loading modules that are external to the bundle at runtime (for example,
 * plug-in command handlers, plug-in modules, or user files). Unlike a bare
 * `require`, this is not rewritten by webpack, so the module is loaded from
 * the file system at runtime even when this code executes inside a bundle.
 */
export const runtimeRequire: NodeJS.Require = typeof __non_webpack_require__ !== "undefined" ?
    __non_webpack_require__ :
    require;

/**
 * Resolve a module request using Node's native require.resolve. Use this for
 * module requests that must be resolved from the file system at runtime (for
 * example, a module installed in the host CLI's node_modules), even when this
 * code executes inside a webpack bundle.
 *
 * @param request - the module request to resolve
 * @param options - options for the resolution (e.g. `paths`)
 * @returns the resolved file path
 */
export function runtimeResolve(request: string, options?: { paths?: string[] }): string {
    return runtimeRequire.resolve(request, options);
}

/**
 * Load a module that is external to the bundle at runtime. This mirrors the
 * semantics of a TypeScript-compiled dynamic import in a CommonJS build
 * (`Promise.resolve().then(() => require(request))`), so the resulting value
 * is the required module itself.
 *
 * @param request - the module request to load
 * @returns a promise resolving to the loaded module
 */
export function runtimeImport(request: string): Promise<any> {
    return Promise.resolve().then(() => runtimeRequire(request));
}

/**
 * Get the lookup paths that Node would use to resolve the given module request
 * (Node's `require.resolve.paths`). Use this instead of `require.resolve.paths`
 * so that the lookup works even when this code executes inside a webpack bundle.
 *
 * @param request - the module request to obtain the lookup paths for
 * @returns the lookup paths, or null if the request is a core module
 */
export function runtimeResolvePaths(request: string): string[] | null {
    return runtimeRequire.resolve.paths(request);
}
