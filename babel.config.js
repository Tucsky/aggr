module.exports = {
  presets: [
    [
      '@vue/app',
      {
        useBuiltIns: false,
        bundlePolyfills: false,
        exclude: ['transform-async-to-generator', 'transform-regenerator', 'proposal-async-generator-functions']
      }
    ]
  ]
}
