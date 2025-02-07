import { random } from './random'

const SENTENCE_ENDS_RE = /[.!?'"]\s+/

type PrefixIndex = Record<string, string[]>

export class GibGen {
  private index: PrefixIndex
  private lookbackRange: readonly [number, number]
  readonly bytes: number

  constructor(lookbackRange: readonly [number, number], corpus: string) {
    this.lookbackRange = lookbackRange
    this.index = this.buildIndex(corpus)
    this.bytes = JSON.stringify(this.index).length
  }

  private buildIndex(corpus: string) {
    const c = cleanString(corpus)
    const index: PrefixIndex = {}
    const [start, end] = this.lookbackRange
    for (let lookback = start; lookback <= end; lookback++) {
      for (let i = 0; i < c.length - lookback; i++) {
        const prefix = c.slice(i, i + lookback)
        const nextChar = c[i + lookback]
        if (!index[prefix]) {
          index[prefix] = []
        }
        index[prefix].push(nextChar)
      }
    }
    return index
  }

  generateGibberish(chars: number): string {
    const [minLookback, maxLookback] = this.lookbackRange
    let prefix = randomPrefix(this.index)
    let result = prefix
    for (let i = 0; i < chars; i++) {
      let char = randomNextChar(this.index, prefix)
      if (!char) {
        prefix = randomPrefix(this.index)
        result += prefix
        char = randomNextChar(this.index, prefix)
      }
      result += char
      const nextLookback =
        Math.floor(Math.random() * (maxLookback - minLookback + 1)) +
        minLookback
      prefix = result.slice(-nextLookback)
    }

    // Add newlines after some sentence ends
    let paragraphs = ''
    for (let i = 0; i < result.length; i++) {
      paragraphs += result[i]
      const bits = result.slice(i - 1, i + 1)
      if (SENTENCE_ENDS_RE.test(bits) && Math.random() < 0.2) {
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
}

function cleanString(input: string) {
  let output = input.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  output = output.replace(/\s+/g, ' ')
  return output.trim()
}

function randomPrefix(index: PrefixIndex): string {
  return random(Object.keys(index))
}

function randomNextChar(index: PrefixIndex, prefix: string): string | null {
  const choices = index[prefix]
  if (!choices) return null
  return random(choices)
}
