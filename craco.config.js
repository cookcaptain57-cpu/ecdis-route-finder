module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Fix: allow dynamic import() in .mjs files from node_modules
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

      // Add explicit rule for .mjs files
      webpackConfig.module.rules.unshift({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        },
      });

      return webpackConfig;
    },
  },
};
