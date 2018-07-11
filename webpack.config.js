const path = require('path');

module.exports = {
  entry: './dist/demo.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
};
