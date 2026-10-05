process.env.TZ = 'UTC'

module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'styl'],
  setupFiles: ['<rootDir>/test/jestLib/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/test/jestLib/setupAfterEnv.js'],
  moduleDirectories: ['src', 'node_modules'],
  moduleNameMapper: {
    '\\.(png|gif|jpe?g|svg)$': '<rootDir>/test/__mocks__/fileMock.js',
    '\\.(styl|css)$': 'identity-obj-proxy',
    '^cozy-client$': 'cozy-client/dist/index',
    '^@/(.*)': '<rootDir>/src/$1',
    '^src/(.*)': '<rootDir>/src/$1',
    '^test/(.*)': '<rootDir>/test/$1'
  },
  transformIgnorePatterns: ['node_modules/(?!(cozy-ui|@linagora/twake-icons)/)'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  globals: {
    __ALLOW_HTTP__: false,
    __TARGET__: 'browser',
    cozy: {}
  }
}
