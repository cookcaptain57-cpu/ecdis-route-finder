// craco.config.js
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
            return {
              ...oneOfRule,
              resolve: { ...oneOfRule.resolve, fullySpecified: false },
            };
          });
        }
        return rule;
      });

      // Fix 3: Global resolve fullySpecified false
      webpackConfig.resolve = { ...webpackConfig.resolve, fullySpecified: false };

      // Fix 4: Force non-ESM environment flags only — no chunk loading changes
      webpackConfig.output = {
        ...webpackConfig.output,
        environment: {
          arrowFunction: true,
          bigIntLiteral: false,
          const: true,
          destructuring: true,
          dynamicImport: false,
          forOf: true,
          module: false,
        },
      };

      return webpackConfig;
    },
  },
};
