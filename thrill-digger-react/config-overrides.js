const path = require('path');
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

module.exports = function override(config, env) {
    config.resolve.extensions.push(".wasm");

    config.module.rules.forEach(rule => {
        (rule.oneOf || []).forEach(oneOf => {
            if (oneOf.loader && oneOf.loader.indexOf("file-loader") >= 0) {
                // Make file-loader ignore WASM files
                oneOf.exclude.push(/\.wasm$/);
            }
        });
    });

    config.plugins = (config.plugins || []).concat([
        new WasmPackPlugin({
            crateDirectory: path.resolve(__dirname, "./src/native"),
            // extraArgs: "--no-typescript",
            forceMode: "release",
            outDir: path.resolve(__dirname, "./src/native/build")
        }),
    ]);

    return config;
}