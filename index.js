#!/usr/bin/env node
const psl = require('psl')
const fetch = require('node-fetch')
const url = require('url')
const fs = require('fs')
const path = require('path')

const list_url = 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt'
const google_domains_url = 'https://www.google.com/supported_domains'

function emptyStarts (line, search) {
  if (line.startsWith(search)) return line.replace(search, '')
  return line
}

function fix (line) {
  ['||', '|', 'http://', 'https://', '*', '.'].forEach(search => {
    line = emptyStarts(line, search)
  })
  line = line.replace(/\*/g, '/')
  return line
}

function valid (line) {
  const hostname = url.parse('http://' + line).hostname
  if (!hostname) console.error('Can\'t handle line: ' + line)
  if (psl.isValid(hostname) || psl.isValid('dummy.' + hostname)) return hostname
  else console.error('Not valid hostname: ' + hostname)
  return null
}

function errorExit (error) {
  console.error(error)
  process.exit(1)
}

async function main () {
  const [list_raw, google_domains_list] = await Promise.all([
    fetch(list_url).then(r => r.text()).catch(errorExit),
    fetch(google_domains_url).then(r => r.text()).catch(errorExit),
  ])

  const decoded = Buffer.from(list_raw, 'base64').toString().concat('\n', google_domains_list)

  const domains = decoded.trim().split('\n').filter(line => {
    return !(line.trim().length === 0 || line.startsWith('!') || line.startsWith('@')
      || line.startsWith('[') || line.includes('.*'))
  }).map(fix).filter(l => l).map(valid).filter(l => l)

  const domains_set = new Set(domains)

  const pass_domains = fs.readFileSync(path.resolve(__dirname, 'passlist.txt')).toString().split('\n')
  pass_domains.forEach(p => domains_set.delete(p))

  console.log(Array.from(domains_set).sort().join('\n'))
}

main()
