import { shuffle } from 'fast-shuffle'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { jack } from 'jackspeak'
import OpenAI from 'openai'
import { join, resolve } from 'path'
import { z } from 'zod'

const OPENAI_API_KEY = mustEnv('OPENAI_API_KEY')
const REPO_ROOT = resolve(__dirname, '../..')
const ASSETS_ROOT = join(REPO_ROOT, 'assets')
const TEMPLATE_ROOT = join(ASSETS_ROOT, 'generate-content')
const CONTENT_ROOT = join(ASSETS_ROOT, 'content')

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const genresSchema = z.array(z.object({ genre: z.string(), desc: z.string() }))
type Genres = z.infer<typeof genresSchema>
type Genre = Genres[number]

function mustEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

async function loadGenres(name: string): Promise<Genre[]> {
  const path = join(TEMPLATE_ROOT, 'genres', `${name}.json`)
  const raw = await readFile(path, 'utf-8')
  const data = JSON.parse(raw)
  return genresSchema.parse(data)
}

function interpolateTemplate(tmpl: string, kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => ({
      re: new RegExp(`{${k}}`, 'g'),
      v
    }))
    .reduce((acc, { re, v }) => acc.replaceAll(re, v), tmpl)
}

function generatePrompt(tmpl: string, genre: Genre, setting: string) {
  return interpolateTemplate(tmpl, {
    SETTING: setting,
    GENRE: genre.genre,
    GENRE_DESC: genre.desc
  })
}

async function askGPT(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }]
  })
  const result = completion.choices[0].message.content
  if (!result) throw new Error('No response from GPT')
  return result
}

function randomN<T>(arr: T[], n: number): T[] {
  const results = []
  for (let i = 0; i < Math.ceil(n / arr.length); i++) {
    results.push(...shuffle(arr).slice(0, n - results.length))
  }
  return results
}

function parseArgs() {
  const args = jack()
    .num({
      count: { description: 'Number of stories to generate', default: 1 }
    })
    .parse(process.argv)
  const {
    positionals,
    values: { count }
  } = args
  if (positionals.length < 2) {
    console.error(
      'Usage: generate-content <collection name> <description of setting> [--count <number>]'
    )
    process.exit(1)
  }
  return { collection: positionals[0], setting: positionals[1], count }
}

async function main() {
  const fiction = await loadGenres('fiction')
  const nonfiction = await loadGenres('nonfiction')
  const allGenres = [...fiction, ...nonfiction]
  const promptTmpl = await readFile(join(TEMPLATE_ROOT, 'prompt.txt'), 'utf-8')

  const { collection, setting, count } = parseArgs()
  const outDir = join(CONTENT_ROOT, collection)
  await mkdir(outDir, { recursive: true })

  const genres = randomN(allGenres, count)
  for (const genre of genres) {
    const prompt = generatePrompt(promptTmpl, genre, setting)
    const unix_ts = Math.floor(Date.now() / 1000)

    console.log(prompt)
    const start = Date.now()
    const output = await askGPT(prompt)
    const duration = Date.now() - start
    console.log(output)
    console.log(`Generated in ${(duration / 1000).toFixed(2)} sec`)

    const pathSafeGenre = genre.genre.toLowerCase().replaceAll(' ', '-')
    const path = join(outDir, `${collection}_${pathSafeGenre}_${unix_ts}.txt`)
    await writeFile(path, output)
  }
}

main()
