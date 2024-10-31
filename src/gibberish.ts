const SENTENCE_ENDS = '.!?'

export type PrefixIndex = Record<string, string[]>

export function indexGibberish(
  lookbackRange: readonly [number, number],
  corpus: string
): PrefixIndex {
  const index: PrefixIndex = {}
  const [start, end] = lookbackRange
  for (let lookback = start; lookback <= end; lookback++) {
    for (let i = 0; i < corpus.length - lookback; i++) {
      const prefix = corpus.slice(i, i + lookback)
      const nextChar = corpus[i + lookback]
      if (!index[prefix]) {
        index[prefix] = []
      }
      index[prefix].push(nextChar)
    }
  }
  return index
}

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomPrefix(index: PrefixIndex): string {
  return random(Object.keys(index))
}

function randomNextChar(index: PrefixIndex, prefix: string): string | null {
  const choices = index[prefix]
  if (!choices) return null
  return random(choices)
}

export function generateGibberish(
  index: PrefixIndex,
  lookbackRange: readonly [number, number],
  chars: number
): string {
  const [minLookback, maxLookback] = lookbackRange
  let prefix = randomPrefix(index)
  let result = prefix
  for (let i = 0; i < chars; i++) {
    let char = randomNextChar(index, prefix)
    if (!char) {
      prefix = randomPrefix(index)
      result += prefix
      char = randomNextChar(index, prefix)
    }
    result += char
    const nextLookback =
      Math.floor(Math.random() * (maxLookback - minLookback + 1)) + minLookback
    prefix = result.slice(-nextLookback)
  }

  // Add newlines after some sentence ends
  let paragraphs = ''
  for (let i = 0; i < result.length; i++) {
    paragraphs += result[i]
    if (SENTENCE_ENDS.includes(result[i]) && Math.random() < 0.2) {
      paragraphs += '\n\n'
    }
  }
  paragraphs = paragraphs.replaceAll('\n\n"', '"').replaceAll("\n\n'", "'")
  paragraphs = paragraphs
    .split('\n\n')
    .map((p) => p.trim())
    .join('\n\n')

  return paragraphs
}
