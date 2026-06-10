const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {

      // Force webpack to treat ALL files as javascript/auto (no module restrictions)
      webpackConfig.module.rules.unshift(
        {
          test: /\.m?js$/,
          resolve: { fullySpecified: false },
          type: 'javascript/auto',
        }
      );

      // Set target explicitly to web (not browserslist)
      webpackConfig.target = 'web';

      // Tell webpack output environment supports dynamic imports
      webpackConfig.output = {
        ...webpackConfig.output,
        environment: {
          arrowFunction: true,
          bigIntLiteral: false,
          const: true,
          destructuring: true,
          dynamicImport: true,
          forOf: true,
          module: false,
        },
      };

      return webpackConfig;
    },
  },
};
