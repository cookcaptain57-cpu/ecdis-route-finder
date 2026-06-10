// craco.config.js
const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {

      // Fix 1: Allow .mjs files from node_modules
      webpackConfig.module.rules.unshift({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: { fullySpecified: false },
      });

      // Fix 2: Disable fullySpecified on all rules
      webpackConfig.module.rules = webpackConfig.module.rules.map(rule => {
        if (rule.oneOf) {
          rule.oneOf = rule.oneOf.map(oneOfRule => {
            if (oneOfRule.type === 'asset/resource') return oneOfRule;
            return { ...oneOfRule, resolve: { ...oneOfRule.resolve, fullySpecified: false } };
          });
        }
        return rule;
      });

      // Fix 3: Global resolve fullySpecified false
      webpackConfig.resolve = { ...webpackConfig.resolve, fullySpecified: false };

      // Fix 5: Force webpack to NOT use native ESM output
      // This is the critical fix — externalsType must not be 'module'
      webpackConfig.externalsType = 'commonjs';

      // Fix 6: Explicitly set output to IIFE/commonjs, not module
      webpackConfig.output = {
        ...webpackConfig.output,
        module: false,
        chunkFormat: 'array-push',
        chunkLoading: 'jsonp',
        workerChunkLoading: 'importScripts',
        wasmLoading: 'fetch',
        library: undefined,
        environment: {
          arrowFunction: false,
          bigIntLiteral: false,
          const: false,
          destructuring: false,
          dynamicImport: false,
          forOf: false,
          module: false,
        },
      };

      return webpackConfig;
    },
  },
};
