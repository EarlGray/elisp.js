const path = require('path');

module.exports = {
  entry: './demo/demo.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
};
