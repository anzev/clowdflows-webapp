var webpackConfig = require('./webpack.test');

module.exports = function (config) {
    var _config = {
        basePath: '',

        frameworks: ['jasmine'],

        files: [
            {pattern: './config/karma-test-shim.ts', watched: false}
        ],

        preprocessors: {
            './config/karma-test-shim.ts': ['webpack', 'sourcemap'],
            './src/**/!(*.spec).(ts|js)': [
                'sourcemap'
            ]
        },

        webpack: webpackConfig,

        webpackMiddleware: {
            stats: 'errors-only'
        },

        webpackServer: {
            noInfo: true
        },

        reporters: ['progress'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['PhantomJS'],
        singleRun: true
    };

    config.set(_config);
};
