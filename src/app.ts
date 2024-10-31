import { fastify as Fastify, FastifyServerOptions } from 'fastify'
import { generateGibberish, indexGibberish } from './gibberish'
import corpus from '../assets/gatsby.txt?raw'

function cleanString(input) {
  let output = input.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  output = output.replace(/\s+/g, ' ')
  return output.trim()
}

const LOOKBACK_RANGE = [12, 24] as const
const CHARS = 3000

export default (opts?: FastifyServerOptions) => {
  const fastify = Fastify(opts)

  const gIndex = indexGibberish(
    LOOKBACK_RANGE,
    cleanString(corpus + ' ' + corpus)
  )
  console.log(`Index size: ${Object.keys(gIndex).length}`)
  console.log(`Index bytes: ${JSON.stringify(gIndex).length}`)

  fastify.get('/', async (_request, _reply) => {
    return generateGibberish(gIndex, LOOKBACK_RANGE, CHARS)
  })

  return fastify
}
