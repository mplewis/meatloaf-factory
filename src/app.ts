import { fastify as Fastify, FastifyServerOptions } from 'fastify'
import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'
import { generateGibberish, indexGibberish } from './gibberish'
import corpus from '../assets/banana-pepper.txt?raw'
import template from '../assets/index.html?raw'

function cleanString(input) {
  let output = input.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  output = output.replace(/\s+/g, ' ')
  return output.trim()
}

const LOOKBACK_RANGE = [12, 16] as const
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
    const gibMarkdown = generateGibberish(gIndex, LOOKBACK_RANGE, CHARS)
    const gibHTML = await marked.parse(gibMarkdown)
    const gibSanitized = DOMPurify.sanitize(gibHTML)
    const html = template.replace('<!-- CONTENT -->', gibSanitized)
    _reply.type('text/html').send(html)
  })

  return fastify
}
