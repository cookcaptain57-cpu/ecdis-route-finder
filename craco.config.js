// craco.config.js
module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {

      // Fix 1: Allow .mjs files from node_modules
      webpackConfig.module.rules.unshift({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: { fullySpecified: false },
      });

      // Fix 2: Disable fullySpecified globally
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        fullySpecified: false,
      };

      // Fix 3: THE ACTUAL FIX
      // webpack 5 throws this error when it encounters a package with
      // "type":"module" and tries to treat it as an external of type 'module'
      // Force all externals to use 'commonjs' type instead
      const originalExternals = webpackConfig.externals;
      webpackConfig.externals = originalExternals
        ? (Array.isArray(originalExternals)
            ? originalExternals.map(ext =>
                typeof ext === 'string' ? { [ext]: `commonjs ${ext}` } : ext
              )
            : originalExternals)
        : undefined;

      // Fix 4: Explicitly set experiments to disable outputModule
      webpackConfig.experiments = {
        ...webpackConfig.experiments,
        outputModule: false,
      };

      // Fix 5: Remove 'module' from output if set
      if (webpackConfig.output) {
        delete webpackConfig.output.module;
        delete webpackConfig.output.library;
      }

      return webpackConfig;
    },
  },
};
