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

const fs = require("fs");
const path = require("path");

/**
 * Copies the web-help distribution assets next to the bundle so that the
 * bundled CLI can generate web help without the @zowe/imperative package tree.
 */
class CopyWebHelpPlugin {
    apply(compiler) {
        compiler.hooks.done.tap("CopyWebHelpPlugin", () => {
            const src = path.resolve(__dirname, "..", "imperative", "web-help", "dist");
            const dest = path.join(path.resolve(__dirname, "bundle"), "web-help", "dist");
            if (fs.existsSync(src)) {
                fs.cpSync(src, dest, {recursive: true});
            } else {
                console.warn(`CopyWebHelpPlugin: web-help distribution not found at "${src}" - ` +
                    "web help will not be available in this bundle. " +
                    "Build @zowe/imperative (npm run build:webHelp) first.");
            }
        });
    }
}

/**
 * Rspack configuration that produces a single-file bundle of the Zowe CLI.
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
    plugins: [new CopyWebHelpPlugin()],
    node: {
        __dirname: false,
        __filename: false
    },
    resolve: {
        alias: {
            // optional ssh2 dependency; ssh2's try/catch handles its absence
            "cpu-features": false
        }
    },
    optimization: {
        // keep class and function names intact: imperative identifies command
        // handlers (and other components) by their runtime names
        minimize: false,
        chunkIds: 'natural'
    },
    externalsType: "node-commonjs",
    externals: [
        // native modules - cannot be bundled, loaded from node_modules at runtime
        "@zowe/secrets-for-zowe-sdk",
        "ssh2",
        // loads its appenders with a runtime-computed require that cannot be
        // statically analyzed - loaded from node_modules at runtime
        "log4js"
    ],
    ignoreWarnings: [
        {
            // yargs resolves config-file "extends" and optional peer modules with
            // runtime-computed requires. Zowe CLI never exercises those code paths.
            module: /[\\/]node_modules[\\/](yargs|yargs-parser)[\\/]/
        },
        {
            // The plain-Node fallback in RuntimeRequire references require as a
            // value, which rspack cannot statically extract. Under rspack the
            // __non_webpack_require__ branch of that expression always wins.
            module: /[\\/]RuntimeRequire\.js$/,
            message: /require function is used in a way in which dependencies cannot be statically extracted/
        }
    ],
    performance: {
        // the bundle is a server-side CLI; size hints are not actionable
        hints: false
    }
};
