/* eslint-disable no-console */
import execa from 'execa'
import fs from 'fs'
;(async () => {
  try {
    const branch = (await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD']))
      .stdout

    console.log('Prepare manifest...')
    const manifestPath = `public/manifest.webmanifest`
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    manifest.start_url = '/aggr/'
    manifest.id = '/aggr/'
    manifest.icons = manifest.icons.map(icon => {
      const iconSrc = icon.src.startsWith('/')
        ? icon.src.substring(1)
        : icon.src
      return { ...icon, src: `/aggr/${iconSrc}` }
    })

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

    console.log('Building started...', branch)
    await execa('npm', ['run', 'build', '--', '--mode', 'github'])
    await execa('git', ['checkout', '--orphan', 'gh-pages'])
    // Understand if it's dist or build folder
    const distFolder = fs.existsSync('dist') ? 'dist' : 'build'
    await execa('touch', [`${distFolder}/.nojekyll`])
    await execa('git', ['--work-tree', distFolder, 'add', '--all'])
    await execa('git', ['--work-tree', distFolder, 'commit', '-m', 'gh-pages'])
    console.log('Pushing to gh-pages...')
    await execa('git', ['push', 'origin', 'HEAD:gh-pages', '--force'])
    await execa('rm', ['-r', distFolder])
    await execa('git', ['checkout', '-f', branch])
    await execa('git', ['branch', '-D', 'gh-pages'])
    console.log('Successfully deployed')
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e.message)
    process.exit(1)
  }
})()
