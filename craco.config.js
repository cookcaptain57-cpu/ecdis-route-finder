module.exports = {
  webpack: {
    configure: (webpackConfig) => {

      // Fix 1: Set target to support dynamic import()
      webpackConfig.target = ['web', 'es5'];

      // Fix 2: Allow .mjs files from node_modules
      webpackConfig.module.rules.unshift({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        },
      });

      // Fix 3: Disable fullySpecified on all rules
      webpackConfig.module.rules = webpackConfig.module.rules.map(rule => {
        if (rule.oneOf) {
          rule.oneOf = rule.oneOf.map(oneOfRule => {
            if (oneOfRule.type === 'asset/resource') return oneOfRule;
            return {
              ...oneOfRule,
              resolve: {
                ...oneOfRule.resolve,
                fullySpecified: false,
              },
            };
          });
        }
        return rule;
      });

      // Fix 4: Tell webpack to handle ESM modules from node_modules
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        extensionAlias: {
          '.js': ['.js', '.ts', '.tsx'],
        },
        fullySpecified: false,
      };

      // Fix 5: Exclude problematic node_modules from being transpiled as scripts
      webpackConfig.output = {
        ...webpackConfig.output,
        environment: {
          ...webpackConfig.output?.environment,
          dynamicImport: true,
        },
      };

      return webpackConfig;
    },
  },
};
