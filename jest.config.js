module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo|expo-.*|@expo|@expo-.*|react-navigation|@react-navigation|@unimodules|unimodules|@noble/ciphers)/)",
  ],
};
