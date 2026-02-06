const nextConfig = require('eslint-config-next/core-web-vitals');

module.exports = [
  ...nextConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off'
    }
  }
];
