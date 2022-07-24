export function randomString(
  length = 16,
  characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
) {
  let output = ``

  const charactersLength = characters.length

  for (let i = 0; i < length; i++) {
    output += characters.charAt(Math.floor(Math.random() * charactersLength))
  }

  return output
}

export function parseMarket(market: string) {
  return market.match(/([^:]*):(.*)/).slice(1, 3)
}

export function sleep(duration = 1000): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), duration)
  })
}
