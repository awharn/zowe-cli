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

const path = require("path");

/**
 * Webpack configuration that produces a single-file bundle of the Zowe CLI.
 *
 * The bundle is emitted to `bundle/main.js` so that the `web-help-logo.png`
 * asset (resolved via `__dirname + ".."`) and the `prebuilds/` directory
 * (located by walking up from the bundle) remain reachable. Native modules
 * are kept external: they are loaded from node_modules at runtime.
 */
module.exports = {
    mode: "production",
    target: "node",
    devtool: false,
    entry: path.resolve(__dirname, "lib", "main.js"),
    output: {
        path: path.resolve(__dirname, "bundle"),
        filename: "main.js",
        clean: true
    },
    node: {
        __dirname: false,
        __filename: false
    },
    optimization: {
        // keep class and function names intact: imperative identifies command
        // handlers (and other components) by their runtime names
        minimize: false
    },
    externalsType: "node-commonjs",
    externals: [
        // native modules - cannot be bundled, loaded from node_modules at runtime
        "@zowe/secrets-for-zowe-sdk",
        "cpu-features",
        "ssh2",
        // loads its appenders with a runtime-computed require that cannot be
        // statically analyzed - loaded from node_modules at runtime
        "log4js"
    ],
    performance: {
        // the bundle is a server-side CLI; size hints are not actionable
        hints: false
    }
};
