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
 * Collects the bundler external packages and their transitive dependencies from
 * the installed node_modules tree into `bundle/node_modules`, mimicking npm's
 * bundledDependencies behavior: the bundle directory becomes self-contained, so
 * the runtime requires emitted for the externals resolve from the bundle's own
 * node_modules instead of requiring the full repository node_modules tree.
 *
 * Packages are copied flat (mirroring the hoisted layout they were resolved
 * from). If a dependency name resolves to more than one location in the
 * installed tree, the first location wins the flat slot and later copies are
 * nested under the dependent package's own node_modules.
 *
 * Run after rspack (see the "bundle" script in package.json).
 */

const fs = require("fs");
const path = require("path");
const {createRequire} = require("module");

/**
 * Must match the `externals` list in rspack.config.js.
 */
const EXTERNALS = [
    "@zowe/secrets-for-zowe-sdk",
    "cpu-features",
    "ssh2",
    "log4js"
];

/**
 * Packages to intentionally omit from the collected set. ssh2 declares
 * cpu-features as an optional dependency and guards its require with a
 * try/catch fallback, so ssh2 functions without it (it only enables
 * hardware-accelerated feature detection).
 */
const OMITTED = new Set([
    "cpu-features"
]);

const cliRoot = path.resolve(__dirname, "..");
const bundleDir = path.join(cliRoot, "bundle");
const destNodeModules = path.join(bundleDir, "node_modules");

/**
 * Resolution is anchored at the CLI's compiled entry point so that packages are
 * located exactly the way webpack resolved the externals at bundle time.
 */
const cliRequire = createRequire(path.join(cliRoot, "lib", "main.js"));

/**
 * Resolve a package name to the real path of its package directory.
 *
 * @param {string} name - the package name
 * @returns {string | null} the real path of the package directory, or null if
 *     the package cannot be resolved (e.g. an uninstalled optional dependency)
 */
function resolvePkgDir(name) {
    let mainFile;
    try {
        mainFile = cliRequire.resolve(name);
    } catch (err) {
        return null;
    }
    let dir = path.dirname(mainFile);
    for (;;) {
        const pkgJsonPath = path.join(dir, "package.json");
        if (fs.existsSync(pkgJsonPath)) {
            try {
                if (JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")).name === name) {
                    return fs.realpathSync(dir);
                }
            } catch (err) {
                // unreadable package.json - keep walking up
            }
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            return fs.realpathSync(path.dirname(mainFile));
        }
        dir = parent;
    }
}

/**
 * Copy a package directory into the bundle's node_modules, dereferencing
 * symlinks (so workspace-linked packages are materialized) and excluding any
 * nested node_modules directories.
 *
 * @param {string} srcDir - the real path of the package directory
 * @param {string} destDir - the destination directory in the bundle
 */
function copyPkg(srcDir, destDir) {
    fs.mkdirSync(path.dirname(destDir), {recursive: true});
    fs.cpSync(srcDir, destDir, {
        recursive: true,
        dereference: true,
        filter: (src) => {
            if (path.basename(src) === "node_modules") {
                return false;
            }
            // exclude Rust build directories - a "target" directory beside a
            // Cargo.toml contains only intermediate build artifacts
            if (path.basename(src) === "target" &&
                fs.existsSync(path.join(path.dirname(src), "Cargo.toml"))) {
                return false;
            }
            return true;
        }
    });
}

// walk the transitive closure of the externals; `under` carries the name of the
// top-level external package whose nested node_modules should receive a copy if
// this dependency conflicts with an already-collected flat copy
const flatCopied = new Map();  // name -> realpath that owns the flat slot
const queue = EXTERNALS.map((name) => ({name, under: null}));
let nestedCopies = 0;

while (queue.length > 0) {
    const {name, under} = queue.shift();

    if (OMITTED.has(name)) {
        console.log(`collectExternalDeps: intentionally omitting "${name}"`);
        continue;
    }

    const dir = resolvePkgDir(name);

    if (dir == null) {
        console.warn(`collectExternalDeps: skipping "${name}" - not resolvable`);
        continue;
    }

    if (!flatCopied.has(name)) {
        // first occurrence wins the flat slot
        flatCopied.set(name, dir);
        copyPkg(dir, path.join(destNodeModules, name));
    } else if (flatCopied.get(name) !== dir) {
        // the same dependency name resolved to a different package - nest it
        if (under == null) {
            console.warn(`collectExternalDeps: conflicting locations for "${name}" - ` +
                `keeping ${flatCopied.get(name)}`);
            continue;
        }
        copyPkg(dir, path.join(destNodeModules, under, "node_modules", name));
        nestedCopies++;
    } else {
        // already collected from this exact location
        continue;
    }

    const pkgJson = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    // Optional dependencies are intentionally not collected: by npm's contract a
    // package must tolerate their absence (npm --omit=optional). The only optional
    // dependency in this closure is ssh2's cpu-features, whose require is guarded
    // by try/catch in ssh2 itself.
    const deps = Object.keys(pkgJson.dependencies ?? {});
    for (const dep of deps) {
        queue.push({name: dep, under: under ?? name});
    }
}

console.log(`collectExternalDeps: ${flatCopied.size} packages collected into ${destNodeModules}` +
    (nestedCopies > 0 ? ` (${nestedCopies} nested copies for conflicting versions)` : ""));
