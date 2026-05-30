const HALANT = '્'

// [roman, standalone vowel form, vowel sign after consonant]
const VOWELS = [
  ['aa', 'આ', 'ા'], ['ai', 'ઐ', 'ૈ'], ['au', 'ઔ', 'ૌ'],
  ['ii', 'ઈ', 'ી'], ['ee', 'ઈ', 'ી'], ['oo', 'ઊ', 'ૂ'], ['uu', 'ઊ', 'ૂ'],
  ['a',  'આ', 'ા'], ['e',  'એ', 'ે'],  ['i',  'ઇ', 'િ'],
  ['o',  'ઓ', 'ો'], ['u',  'ઉ', 'ુ'],
]

// [roman, gujarati glyph] — longest patterns first
const CONSONANTS = [
  ['ksh', 'ક્ષ'], ['gya', 'જ્ઞ'],
  ['kh', 'ખ'], ['gh', 'ઘ'], ['ch', 'ચ'], ['jh', 'ઝ'],
  ['th', 'થ'], ['dh', 'ધ'], ['ph', 'ફ'], ['bh', 'ભ'], ['sh', 'શ'],
  ['ng', 'ઙ'],
  ['k', 'ક'], ['g', 'ગ'], ['c', 'ચ'], ['j', 'જ'],
  ['t', 'ત'], ['d', 'દ'], ['n', 'ન'],
  ['p', 'પ'], ['f', 'ફ'], ['b', 'બ'], ['m', 'મ'],
  ['y', 'ય'], ['r', 'ર'], ['l', 'લ'],
  ['v', 'વ'], ['w', 'વ'], ['s', 'સ'], ['h', 'હ'],
  ['x', 'ક્ષ'],
]

function matchAt(str, pos, patterns) {
  for (const p of patterns) {
    if (str.slice(pos, pos + p[0].length).toLowerCase() === p[0]) return p
  }
  return null
}

export function transliterateToGujarati(input) {
  let out = ''
  let i = 0

  while (i < input.length) {
    if (input[i] === ' ' || /\d/.test(input[i])) { out += input[i++]; continue }

    const con = matchAt(input, i, CONSONANTS)
    if (con) {
      i += con[0].length
      const vow = matchAt(input, i, VOWELS)
      if (vow) {
        i += vow[0].length
        out += con[1] + vow[2]
      } else {
        out += con[1] + HALANT
      }
      continue
    }

    const vow = matchAt(input, i, VOWELS)
    if (vow) {
      i += vow[0].length
      out += vow[1]
      continue
    }

    out += input[i++]
  }

  // Remove halant before space or at end of string
  return out.replace(new RegExp(HALANT + '( |$)', 'g'), '$1')
}
