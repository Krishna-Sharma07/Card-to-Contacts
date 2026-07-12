module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-ml-kit|@react-navigation|react-native-.*)/)',
  ],
};
