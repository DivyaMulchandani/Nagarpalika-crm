// Display helpers for an advertisement's age / education / document rules.
// The server (services/eligibility.service.js) enforces them; keep the group
// keys and wording in step.

const RELAX_GROUPS = [
  ["SC", "SC"],
  ["ST", "ST"],
  ["OBC", "SEBC / OBC"],
  ["EWS", "EWS"],
  ["Female", "Women"],
  ["PH", "Persons with disability (PH)"],
  ["ExServiceman", "Ex-servicemen"],
];

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : ''

/** "18 – 35 years as on 06-10-2026" */
export const describeAgeLimit = (advt) => {
  const { min, max } = advt?.age_limit || {}
  if (!min && !max) return null
  return `${min ?? '—'} – ${max ?? '—'} years${advt.end_date ? ` as on ${fmt(advt.end_date)} (last date)` : ''}`
}

/** Lines describing the age relaxation, or [] when there is none. */
export const describeRelaxation = (advt) => {
  const r = advt?.age_relaxation
  if (!r?.enabled) return []
  const years = Object.fromEntries((r.rules || []).map((x) => [x.group, x.years]))
  const lines = RELAX_GROUPS.filter(([k]) => years[k] > 0).map(([k, label]) => `${label}: ${years[k]} years`)
  if (!lines.length && !r.notes) return []
  if (lines.length > 1)
    lines.push(r.combine === 'highest'
      ? 'If you belong to more than one group, only the highest relaxation applies.'
      : 'If you belong to more than one group, the relaxations are added together.')
  if (r.max_age_cap) lines.push(`Upper age after relaxation will not exceed ${r.max_age_cap} years.`)
  if (r.notes) lines.push(r.notes)
  return lines
}

export const requirementOf = (rq) => rq?.requirement || (rq?.is_compulsory ? 'compulsory' : 'optional')

export const REQUIREMENT_LABEL = {
  compulsory: 'Compulsory',
  optional: 'Optional',
  declaration: 'Upload, or declare you will obtain it',
}

export const TYPE_HEADING = {
  education: 'Education certificates',
  certificate: 'Certificates',
  document: 'Other documents',
}
