import { fastify as Fastify, FastifyServerOptions } from 'fastify'
import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'
import { GibGen } from './gibberish'
import template from '../assets/index.html?raw'
import { basename, dirname, join, resolve } from 'path'
import { readdir, readFile, stat } from 'fs/promises'
import { statSync } from 'fs'
import { shuffle } from 'fast-shuffle'
import { random } from './random'
import { fileURLToPath } from 'url'
import prettyBytes from 'pretty-bytes'

const LOOKBACK_RANGE = [12, 16] as const
const CHARS = 3000
const GENERATOR_COUNT = 30
const DOCS_PER_GENERATOR = 5

// https://stackoverflow.com/a/73948058/254187
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')
const DOCS_PATH = join(REPO_ROOT, 'assets', 'content', 'banana-pepper')

async function buildGenerators() {
  const rawPathsAll = (await readdir(DOCS_PATH))
    .map((f) => join(DOCS_PATH, f))
    .filter((p) => statSync(p).isFile() && p.endsWith('.txt'))

  const gens = []
  for (let i = 0; i < GENERATOR_COUNT; i++) {
    let corpus = ''
    const rawPaths = shuffle(rawPathsAll)
    for (let j = 0; j < DOCS_PER_GENERATOR; j++) {
      const doc = await readFile(rawPaths[j], 'utf-8')
      corpus += doc + '\n\n'
    }
    const gen = new GibGen(LOOKBACK_RANGE, corpus)
    console.log(`New generator: ${prettyBytes(gen.bytes)}`)
    for (let j = 0; j < DOCS_PER_GENERATOR; j++) {
      console.log(`  ${basename(rawPaths[j])}`)
    }
    gens.push(gen)
  }
  return gens
}

export default async (opts?: FastifyServerOptions) => {
  const fastify = Fastify(opts)

  const gens = await buildGenerators()
  fastify.get('/', async (_request, _reply) => {
    const gen = random(gens)
    const gibMarkdown = gen.generateGibberish(CHARS)
    const gibHTML = await marked.parse(gibMarkdown)
    const gibSanitized = DOMPurify.sanitize(gibHTML)
    const html = template.replace('<!-- CONTENT -->', gibSanitized)
    _reply.type('text/html').send(html)
  })

  return fastify
}
