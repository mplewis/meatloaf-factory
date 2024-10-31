import { shuffle } from 'fast-shuffle'
import { readFile } from 'fs/promises'
import { jack } from 'jackspeak'
import { join, resolve } from 'path'
import { z } from 'zod'

const OPENAI_API_KEY = mustEnv('OPENAI_API_KEY')
const REPO_ROOT = resolve(__dirname, '../..')
const ASSET_ROOT = join(REPO_ROOT, 'assets', 'generate-content')

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
  const path = join(ASSET_ROOT, 'genres', `${name}.json`)
  const raw = await readFile(path, 'utf-8')
  const data = JSON.parse(raw)
  return genresSchema.parse(data)
}

function interpolateTemplate(tmpl: string, kv: Record<string, string>): string {
  console.log({ tmpl, kv })
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

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
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
  if (positionals.length < 1) {
    console.error(
      'Usage: generate-content <description of setting> [--count <number>]'
    )
    process.exit(1)
  }
  return { setting: positionals[0], count }
}

async function main() {
  const fiction = await loadGenres('fiction')
  const nonfiction = await loadGenres('nonfiction')
  const allGenres = [...fiction, ...nonfiction]
  const promptTmpl = await readFile(join(ASSET_ROOT, 'prompt.txt'), 'utf-8')

  const { setting, count } = parseArgs()
  const genres = randomN(allGenres, count)
  for (const genre of genres) {
    const prompt = generatePrompt(promptTmpl, genre, setting)
    console.log(prompt)
  }
}

main()
