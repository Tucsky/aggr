import store from '@/store'
import { slugify } from '@/utils/helpers'
import workspacesService from './workspacesService'

class GifsService {
  cache: { [keyword: string]: string[] } = {}
  promisesOfGifs: { [keyword: string]: Promise<string[]> } = {}

  constructor() {
    setTimeout(this.cleanExpiredGifs.bind(this), 60000 + Math.random() * 60000)
  }

  async cleanExpiredGifs() {
    const keywords = await workspacesService.getGifsKeywords()
    const now = Date.now()

    for (const keyword of keywords) {
      if (this.cache[keyword]) {
        continue
      }

      const slug = slugify(keyword)

      const storedGifs = await workspacesService.getGifs(slug)

      if (
        !storedGifs ||
        now - storedGifs.timestamp >= 1000 * 60 * 60 * 24 * 7
      ) {
        this.deleteGifs(keyword)
      }
    }
  }

  forgetGifs(keyword) {
    if (this.cache[keyword]) {
      store.dispatch('app/showNotice', {
        title:
          'Forgeting ' +
          this.cache[keyword].length +
          ' gifs about "' +
          keyword +
          '"',
        type: 'info'
      })

      delete this.cache[keyword]
    }
  }

  async deleteGifs(keyword) {
    const slug = slugify(keyword)
    await workspacesService.deleteGifs(slug)

    store.dispatch('app/showNotice', {
      title: 'Removed gifs about "' + keyword + '"',
      type: 'info'
    })
  }

  async getGifs(keyword, showNotice?: boolean) {
    if (!keyword) {
      return
    }

    if (this.cache[keyword]) {
      return this.cache[keyword]
    }

    if (this.promisesOfGifs[keyword]) {
      return this.promisesOfGifs[keyword]
    }

    const slug = slugify(keyword)

    this.promisesOfGifs[keyword] = workspacesService
      .getGifs(slug)
      .then(storedGifs => {
        delete this.promisesOfGifs[keyword]

        if (
          storedGifs &&
          Date.now() - storedGifs.timestamp < 1000 * 60 * 60 * 24 * 7
        ) {
          this.cache[keyword] = storedGifs.data

          return storedGifs.data
        } else {
          return this.fetchGifByKeyword(keyword, showNotice)
        }
      })

    return this.promisesOfGifs[keyword]
  }

  async fetchGifByKeyword(keyword: string, showNotice?: boolean) {
    if (!keyword) {
      return
    }

    const slug = slugify(keyword)

    return fetch(
      'https://api.giphy.com/v1/gifs/search?q=' +
        keyword +
        '&rating=r&limit=100&api_key=b5Y5CZcpj9spa0xEfskQxGGnhChYt3hi'
    )
      .then(res => res.json())
      .then(async res => {
        if (!res.data || !res.data.length) {
          return
        }

        this.cache[keyword] = []

        for (const item of res.data) {
          this.cache[keyword].push(item.images.downsized.url)
        }

        if (showNotice) {
          store.dispatch('app/showNotice', {
            title:
              'Fetched ' + this.cache[keyword].length + ' ' + keyword + ' gifs',
            type: 'success'
          })
        }

        await workspacesService.saveGifs({
          slug,
          keyword: keyword,
          timestamp: Date.now(),
          data: this.cache[keyword]
        })

        return this.cache[keyword]
      })
      .finally(() => {
        delete this.promisesOfGifs[keyword]
      })
  }
}

export default new GifsService()
