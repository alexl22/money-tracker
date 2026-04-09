const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase v9+ uses .cjs files, so we need to add them to the source extensions
config.resolver.sourceExts.push('cjs');

module.exports = config;
