// craco.config.js
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.unshift({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: { fullySpecified: false },
      });
      webpackConfig.resolve = { ...webpackConfig.resolve, fullySpecified: false };
      return webpackConfig;
    },
  },
};
