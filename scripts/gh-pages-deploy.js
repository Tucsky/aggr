/* eslint-disable no-console */
const execa = require('execa')
const fs = require('fs')
;(async () => {
  try {
    // eslint-disable-next-line no-console
    console.log('Building started...')
    await execa('npm', ['run', 'build', '--', '--mode', 'github'])
    await execa('git', ['checkout', '--orphan', 'gh-pages'])
    // Understand if it's dist or build folder
    const folderName = fs.existsSync('dist') ? 'dist' : 'build'
    await execa('git', ['--work-tree', folderName, 'add', '--all'])
    await execa('git', ['--work-tree', folderName, 'commit', '-m', 'gh-pages'])
    console.log('Pushing to gh-pages...')
    await execa('git', ['push', 'origin', 'HEAD:gh-pages', '--force'])
    await execa('rm', ['-r', folderName])
    await execa('git', ['checkout', '-f', 'master'])
    await execa('git', ['branch', '-D', 'gh-pages'])
    console.log('Successfully deployed')
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e.message)
    process.exit(1)
  }
})()
