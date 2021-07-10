module.exports = {
  presets: [
    ['@vue/app', { bundlePolyfills: false, exclude: ['transform-async-to-generator', 'transform-regenerator', 'proposal-async-generator-functions'] }]
  ]
}
