import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { get, post, BASE } from '../../api/index'
import { startEasyPayPayment } from '../../api/easypay'
import { useAuth } from '../../context/AuthContext'
import CandidateLogin from '../../components/CandidateLogin'
import { IconWarn, IconCheck, IconCheckCircle } from '../../components/Icons'
import { describeFee } from '../../utils/fee'
import { uploadWithProgress } from '../../utils/uploadWithProgress'
import UploadProgress from '../../components/UploadProgress'
import { describeAgeLimit, describeRelaxation, requirementOf, REQUIREMENT_LABEL, TYPE_HEADING } from '../../utils/eligibility'


const DEFAULT_DOC_LIMIT = { maxBytes: 2 * 1024 * 1024, maxLabel: '2 MB' }


const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

// ─────────────────────────────────────────────────────────────
// Document Upload Panel — each file uploads the moment it is picked, so Submit
// only attaches what is already stored and returns at once.
// ─────────────────────────────────────────────────────────────
function DocumentUploadPanel({ advt, formData, onSuccess, onBack }) {
  const docs = [
    ...(advt.required_qualifications || []).map((rq) => ({
      label: rq.qualification?.name || String(rq.qualification),
      type: rq.qualification?.type || 'education',
      requirement: requirementOf(rq),
      is_compulsory: requirementOf(rq) === 'compulsory',
      instruction: rq.instruction,
    })),
    ...(advt.caste_certificate?.required
      ? [{
          label: 'Caste Certificate',
          type: 'document',
          requirement: advt.caste_certificate.is_compulsory ? 'compulsory' : 'optional',
          is_compulsory: !!advt.caste_certificate.is_compulsory,
        }]
      : []),
  ]
  // Certificates the candidate chose to declare ("will obtain") instead of uploading.
  const [declared, setDeclared] = useState({})

  // label -> { status, pct, message, name, token, file }
  const [uploads, setUploads]     = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)
  const [docLimit, setDocLimit]   = useState(DEFAULT_DOC_LIMIT)

  useEffect(() => {
    get('/api/v1/config/portal')
      .then((res) => {
        const limits = res?.data?.uploadLimits
        if (limits?.documentMaxBytes) {
          setDocLimit({
            maxBytes: limits.documentMaxBytes,
            maxLabel: limits.documentMaxLabel || `${Math.round(limits.documentMaxBytes / (1024 * 1024))} MB`,
          })
        }
      })
      .catch(() => {})
  }, [])

  const setUpload = (label, patch) =>
    setUploads((p) => ({ ...p, [label]: { ...(p[label] || {}), ...patch } }))

  const startUpload = async (label, file) => {
    setUpload(label, { status: 'uploading', pct: 0, message: null, name: file.name, token: null, file })
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadWithProgress('/api/v1/applications/documents/stage', fd, (pct) => setUpload(label, { pct }))
      // Ignore a finished upload if the candidate has since picked another file.
      setUploads((p) => (p[label]?.file === file ? { ...p, [label]: { ...p[label], status: 'done', pct: 100, token: res?.data?.token } } : p))
    } catch (err) {
      setUploads((p) => (p[label]?.file === file ? { ...p, [label]: { ...p[label], status: 'error', message: err.message } } : p))
    }
  }

  const anyUploading = Object.values(uploads).some((u) => u?.status === 'uploading')
  const compulsoryReady = docs.every((d) =>
    d.requirement === 'compulsory'
      ? uploads[d.label]?.status === 'done'
      : d.requirement === 'declaration'
        ? uploads[d.label]?.status === 'done' || !!declared[d.label]
        : true)
  const optionalFailed = docs.some((d) => !d.is_compulsory && uploads[d.label]?.status === 'error')

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const documents = docs
        .filter((d) => uploads[d.label]?.status === 'done' && uploads[d.label]?.token)
        .map((d) => ({ label: d.label, token: uploads[d.label].token }))
      const res = await post('/api/v1/applications', {
        advt_no: advt.advt_no,
        declaration_accepted: true,
        additional_fields: formData || {},
        documents,
        declarations: docs
          .filter((d) => d.requirement === 'declaration' && declared[d.label] && uploads[d.label]?.status !== 'done')
          .map((d) => ({ label: d.label })),
      })
      const ref = res?.data?.application_ref_no
      if (!ref) throw new Error('Could not get application reference number.')
      toast.success('Application submitted successfully.')
      onSuccess(ref)
    } catch (err) {
      setError(err.message || 'Submission failed. Try again.')
      toast.error(err.message || 'Submission failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="box" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="box-title">
        <span>Document Submission</span>
        <span className="guj">દસ્તાવેજ સબમિટ કરો</span>
      </div>
      <div className="box-body">
        <div className="notice info" style={{ fontSize: 13, marginBottom: 16 }}>
          Select the required documents below. Each one uploads as soon as you select it — wait for the ✓ before submitting.
          Accepted: PDF, JPG, PNG — max {docLimit.maxLabel} each.
          <div className="guj" style={{ marginTop: 4 }}>
            દરેક દસ્તાવેજ પસંદ કરતાં જ અપલોડ થાય છે — સબમિટ કરતાં પહેલાં ✓ દેખાય તેની રાહ જુઓ. PDF, JPG, PNG — દરેક મહત્તમ {docLimit.maxLabel}.
          </div>
        </div>

        {docs.map(({ label, is_compulsory, type, requirement, instruction }) => (
          <div key={label} style={{ marginBottom: 16, padding: '12px 14px', border: `1px solid ${uploads[label]?.status === 'done' || declared[label] ? '#c3e6cb' : uploads[label]?.status === 'error' || is_compulsory ? '#f5c6cb' : 'var(--ojas-line)'}`, borderRadius: 4, background: uploads[label]?.status === 'done' || declared[label] ? '#f0fff4' : '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                {label}
                <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'var(--ojas-ink-3)' }}>{TYPE_HEADING[type]}</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: requirement === 'compulsory' ? '#f8d7da' : requirement === 'declaration' ? '#fff3cd' : '#e2e8f0', color: requirement === 'compulsory' ? '#721c24' : requirement === 'declaration' ? '#856404' : '#4a5568' }}>
                {REQUIREMENT_LABEL[requirement]}
              </span>
            </div>
            {instruction && <div style={{ fontSize: 12.5, color: 'var(--ojas-ink-2)', marginBottom: 8 }}>{instruction}</div>}
            {requirement === 'declaration' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, fontSize: 13 }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name={`decl-${label}`} checked={!declared[label]} onChange={() => setDeclared((p) => ({ ...p, [label]: false }))} disabled={submitting} />
                  I have this certificate — upload it below
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name={`decl-${label}`} checked={!!declared[label]} onChange={() => setDeclared((p) => ({ ...p, [label]: true }))} disabled={submitting} />
                  I do not have it yet — I declare I will obtain it within the time allowed (e.g. probation period)
                </label>
              </div>
            )}
            {!declared[label] && <input type="file" accept=".pdf,.jpg,.jpeg,.png"
              disabled={submitting}
              onChange={(e) => {
                const file = e.target.files[0] || undefined
                if (!file) return
                if (file.size > docLimit.maxBytes) {
                  e.target.value = ''
                  setUpload(label, { status: 'error', message: `File must be under ${docLimit.maxLabel} (yours is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`, token: null, file: null, name: file.name })
                  return
                }
                startUpload(label, file)
              }}
              style={{ fontSize: 13, width: '100%' }} />}
            {!declared[label] && <UploadProgress
              state={uploads[label]}
              onRetry={uploads[label]?.file ? () => startUpload(label, uploads[label].file) : undefined}
            />}
          </div>
        ))}

        {error && (
          <div style={{ color: 'var(--ojas-red)', fontSize: 13, marginBottom: 14, padding: '8px 12px', background: '#fff3f3', border: '1px solid #f5c6cb', borderRadius: 3 }}>
            <IconWarn /> {error}
          </div>
        )}

        <div className="form-actions" style={{ marginTop: 8 }}>
          <button className="btn" onClick={onBack} disabled={submitting}>← Back</button>
          {anyUploading ? (
            <span style={{ fontSize: 12, color: 'var(--ojas-ink-3)', alignSelf: 'center' }}>
              Waiting for uploads to finish…
            </span>
          ) : !compulsoryReady ? (
            <span style={{ fontSize: 12, color: 'var(--ojas-red)', alignSelf: 'center' }}>
              <IconWarn /> Upload all compulsory documents (or make the declaration) to submit.
            </span>
          ) : optionalFailed ? (
            <span style={{ fontSize: 12, color: 'var(--ojas-red)', alignSelf: 'center' }}>
              <IconWarn /> An optional document failed — try again, or submit without it.
            </span>
          ) : null}
          <button className="btn primary" disabled={!compulsoryReady || anyUploading || submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'Submit Application ▶'}
          </button>
        </div>
      </div>
    </div>
  )
}

const checkEligibility = (vacancies, enforceRules, user, selectedGender) => {
  if (enforceRules === false || !vacancies || typeof vacancies !== 'object') {
    return { eligible: true }
  }

  const normCat = (cat) => {
    if (!cat) return 'general'
    const c = String(cat).toLowerCase().trim()
    if (c.includes('sc') || c.includes('scheduled caste')) return 'sc'
    if (c.includes('st') || c.includes('scheduled tribe')) return 'st'
    if (c.includes('sebc') || c.includes('obc') || c.includes('baxi')) return 'sebc'
    if (c.includes('ews')) return 'ews'
    return 'general'
  }

  const candCategory = normCat(user?.category)
  const candGender = String(selectedGender || user?.gender || '').toLowerCase().trim()
  const isFemale = candGender.startsWith('f')

  const toNum = (v) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  const generalGen = toNum(vacancies.general?.general)
  const generalFem = toNum(vacancies.general?.female)
  const scGen = toNum(vacancies.sc?.general)
  const scFem = toNum(vacancies.sc?.female)
  const stGen = toNum(vacancies.st?.general)
  const stFem = toNum(vacancies.st?.female)
  const sebcGen = toNum(vacancies.sebc?.general)
  const sebcFem = toNum(vacancies.sebc?.female)
  const ewsGen = toNum(vacancies.ews?.general)
  const ewsFem = toNum(vacancies.ews?.female)

  const totalSeats =
    generalGen + generalFem +
    scGen + scFem +
    stGen + stFem +
    sebcGen + sebcFem +
    ewsGen + ewsFem

  if (totalSeats === 0) return { eligible: true }

  let eligibleSeats = 0
  eligibleSeats += generalGen
  if (isFemale) eligibleSeats += generalFem

  if (candCategory === 'sc') {
    eligibleSeats += scGen
    if (isFemale) eligibleSeats += scFem
  } else if (candCategory === 'st') {
    eligibleSeats += stGen
    if (isFemale) eligibleSeats += stFem
  } else if (candCategory === 'sebc') {
    eligibleSeats += sebcGen
    if (isFemale) eligibleSeats += sebcFem
  } else if (candCategory === 'ews') {
    eligibleSeats += ewsGen
    if (isFemale) eligibleSeats += ewsFem
  }

  if (eligibleSeats > 0) return { eligible: true, eligibleSeats }

  const totalOpenGeneralSeats = generalGen + scGen + stGen + sebcGen + ewsGen
  const totalFemaleSeats = generalFem + scFem + stFem + sebcFem + ewsFem

  if (totalOpenGeneralSeats === 0 && totalFemaleSeats > 0 && !isFemale) {
    return {
      eligible: false,
      reason: 'Available vacancies for this advertisement are reserved exclusively for Female candidates.',
    }
  }

  const availableBreakdown = []
  if (generalGen > 0 || generalFem > 0) availableBreakdown.push(`General (${generalGen + generalFem})`)
  if (scGen > 0 || scFem > 0) availableBreakdown.push(`SC (${scGen + scFem})`)
  if (stGen > 0 || stFem > 0) availableBreakdown.push(`ST (${stGen + stFem})`)
  if (sebcGen > 0 || sebcFem > 0) availableBreakdown.push(`SEBC (${sebcGen + sebcFem})`)
  if (ewsGen > 0 || ewsFem > 0) availableBreakdown.push(`EWS (${ewsGen + ewsFem})`)

  const catDisplay = user?.category || 'General'
  const genderDisplay = user?.gender || (isFemale ? 'Female' : 'Male')

  return {
    eligible: false,
    reason: `There are no unreserved or matching category vacancies available for your category (${catDisplay}) and gender (${genderDisplay}). Available seats are reserved for: ${availableBreakdown.join(', ') || 'None'}.`,
  }
}

// ─────────────────────────────────────────────────────────────
// Application Form (shown after login)
// ─────────────────────────────────────────────────────────────
function ApplicationFormPanel({ advt, onSuccess, onNext, onDeadline }) {
  const { user } = useAuth()
  const [agreed, setAgreed]   = useState(false)
  const [gender, setGender]   = useState(user?.gender || '')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const eligibility = checkEligibility(
    advt?.vacancies,
    advt?.enforce_reservation_rules !== false,
    user,
    gender
  )

  // Age and education — checked by the server against the OTR profile.
  const [ageEdu, setAgeEdu] = useState(null) // null = checking
  useEffect(() => {
    let active = true
    get(`/api/v1/applications/eligibility/${advt._id}`)
      .then((res) => { if (active) setAgeEdu(res?.data || { eligible: true, reasons: [], details: {} }) })
      .catch((err) => { if (active) setAgeEdu({ eligible: false, reasons: [err.message || 'Could not check eligibility. Please refresh.'], details: {} }) })
    return () => { active = false }
  }, [advt._id])
  const canApply = eligibility.eligible && ageEdu?.eligible === true

  useEffect(() => {
    if (!gender && user?.gender) {
      setGender(user.gender)
    }
  }, [user, gender])

  useEffect(() => {
    if (!advt?.end_date) return
    const deadline = new Date(advt.end_date)
    deadline.setHours(23, 59, 59, 999)
    const check = () => {
      if (Date.now() > deadline.getTime()) {
        toast.error('The application deadline has passed. This form is now closed.')
        onDeadline()
      }
    }
    check()
    const t = setInterval(check, 10000)
    return () => clearInterval(t)
  }, [advt, onDeadline])

  const hasDocs = (advt.required_qualifications?.length > 0) || !!advt.caste_certificate?.required

  const handleNext = () => {
    if (!gender) { setError('Please select your gender.'); return }
    if (!eligibility.eligible) { setError(eligibility.reason); return }
    if (!ageEdu?.eligible) { setError(ageEdu?.reasons?.join(' ') || 'Checking eligibility…'); return }
    if (!agreed) { setError('Accept the declaration to continue.'); return }
    setError(null)
    onNext({ gender })
  }

  const handleSubmitDirect = async () => {
    if (!gender) { setError('Please select your gender.'); return }
    if (!eligibility.eligible) { setError(eligibility.reason); return }
    if (!ageEdu?.eligible) { setError(ageEdu?.reasons?.join(' ') || 'Checking eligibility…'); return }
    if (!agreed) { setError('Accept the declaration to continue.'); return }
    setError(null); setLoading(true)
    try {
      const res = await post('/api/v1/applications', { advt_no: advt.advt_no, declaration_accepted: true, additional_fields: { gender } })
      toast.success('Application submitted successfully.')
      onSuccess(res?.data?.application_ref_no)
    } catch (err) {
      setError(err.message || 'Submission failed. Try again.')
      toast.error(err.message || 'Submission failed. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="box" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="box-title">
        <span>Application Form — {advt.advt_no}</span>
        <span className="guj">ઓનલાઇન અરજી ફોર્મ</span>
      </div>
      <div className="box-body">
        {!eligibility.eligible && (
          <div style={{ color: '#721c24', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: '12px 16px', marginBottom: 16, fontSize: 13.5, fontWeight: 500 }}>
            <strong><IconWarn /> Ineligible to Apply:</strong> {eligibility.reason}
          </div>
        )}

        {/* Age & education check against the OTR profile */}
        {ageEdu === null ? (
          <div className="notice info" style={{ fontSize: 13, marginBottom: 16 }}>Checking your eligibility…</div>
        ) : !ageEdu.eligible ? (
          <div style={{ color: '#721c24', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: '12px 16px', marginBottom: 16, fontSize: 13.5 }}>
            <strong><IconWarn /> You are not eligible for this post / આપ આ જગ્યા માટે પાત્ર નથી</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>
              {ageEdu.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <div style={{ marginTop: 6, fontSize: 12.5 }}>
              If your OTR profile is wrong, correct it from <Link to="/profile" style={{ color: '#721c24', fontWeight: 700 }}>My Profile</Link>.
            </div>
          </div>
        ) : (ageEdu.details?.age_on_cutoff != null || ageEdu.details?.required_education) ? (
          <div style={{ color: '#155724', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 4, padding: '10px 16px', marginBottom: 16, fontSize: 13.5 }}>
            <strong><IconCheck /> You meet the age and education requirements</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.7, fontSize: 13 }}>
              {ageEdu.details.age_on_cutoff != null && (
                <li>
                  Your age on the last date: {ageEdu.details.age_on_cutoff} years
                  {ageEdu.details.max_age_allowed != null && ` (allowed ${ageEdu.details.min_age ?? '—'}–${ageEdu.details.max_age_allowed}${ageEdu.details.relaxation_years ? `, incl. ${ageEdu.details.relaxation_years} years relaxation` : ''})`}
                </li>
              )}
              {ageEdu.details.required_education && (
                <li>Your highest qualification ({ageEdu.details.education}) meets the minimum: {ageEdu.details.required_education}</li>
              )}
            </ul>
          </div>
        ) : null}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, marginBottom: 16 }}>
          <tbody>
            {[
              ['Post', advt.post_title?.en],
              advt.post_title?.gu ? ['Post (gu)', advt.post_title.gu] : null,
              ['Class', `Class ${advt.class}`],
              ['Department', advt.department?.departmentName],
              ['Total Posts', typeof advt.vacancies === 'object' ? advt.vacancies?.total : advt.vacancies],
              ['Pay Scale', advt.pay_scale],
              ['Application Fee', describeFee(advt)],
              ['Last Date to Apply', fmtDate(advt.end_date)],
              ['Age Limit', describeAgeLimit(advt)],
              describeRelaxation(advt).length ? ['Age Relaxation', describeRelaxation(advt).join(' ')] : null,
              ['Minimum Education', advt.min_education?.name ? `${advt.min_education.name} or higher` : null],
            ].filter(Boolean).map(([label, value]) => value != null ? (
              <tr key={label}>
                <td style={{ width: '38%', color: 'var(--ojas-ink-3)', padding: '6px 12px', borderBottom: '1px solid var(--ojas-line)', fontWeight: 500, fontSize: 13 }}>{label}</td>
                <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--ojas-line)', fontFamily: label.includes('(gu)') ? 'var(--font-guj)' : 'inherit' }}>{value}</td>
              </tr>
            ) : null)}
          </tbody>
        </table>

        <div className="notice info" style={{ fontSize: 13, marginBottom: 16 }}>
          Your personal details (name, DOB, category, address, photo, signature) are taken automatically from your <strong>OTR profile</strong>. Ensure your OTR profile is complete and accurate.
        </div>

        <div style={{ marginBottom: 16, padding: '12px 14px', border: '1px solid var(--ojas-line)', borderRadius: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>
            Gender / જાતિ <span style={{ color: 'var(--ojas-red)' }}>*</span>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Male', 'Female', 'Other'].map((g) => (
              <label key={g} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13.5 }}>
                <input type="radio" name="gender" value={g} checked={gender === g} onChange={() => setGender(g)} />
                {g}
              </label>
            ))}
          </div>
        </div>

        {hasDocs && (
          <div className="notice warn" style={{ fontSize: 13, marginBottom: 16 }}>
            <div className="title">Documents required after submission</div>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.9 }}>
              {(advt.required_qualifications || []).map((rq, i) => (
                <li key={i}>
                  {rq.qualification?.name || rq.qualification}
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: requirementOf(rq) === 'compulsory' ? 700 : 400, color: requirementOf(rq) === 'compulsory' ? '#721c24' : '#856404' }}>
                    ({REQUIREMENT_LABEL[requirementOf(rq)]})
                  </span>
                </li>
              ))}
              {advt.caste_certificate?.required && (
                <li>Caste Certificate
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: advt.caste_certificate.is_compulsory ? 700 : 400, color: advt.caste_certificate.is_compulsory ? '#721c24' : '#856404' }}>
                    ({advt.caste_certificate.is_compulsory ? 'Compulsory' : 'Optional'})
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="notice warn" style={{ fontSize: 13, marginBottom: 16 }}>
          <div className="title">Declaration / ઘોષણા</div>
          I hereby apply for the above post and declare that all information in my OTR profile is true and correct to the best of my knowledge. I understand that providing false information may result in cancellation of my application or appointment.
          <br />
          <span style={{ fontFamily: 'var(--font-guj)', fontSize: 11.5, marginTop: 8, display: 'block', color: 'var(--ojas-ink-2)' }}>
            હું ઘોષિત કરું છું કે મારી OTR પ્રોફાઇલની તમામ માહિતી સત્ય અને સાચી છે. ખોટી માહિતી આપવાથી અરજી રદ થઈ શકે છે.
          </span>
        </div>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 20, fontSize: 13.5 }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
          <span>I accept the above declaration and wish to submit my application for <strong>{advt.post_title?.en}</strong>.</span>
        </label>

        {error && (
          <div style={{ color: 'var(--ojas-red)', fontSize: 13, marginBottom: 14, padding: '8px 12px', background: '#fff3f3', border: '1px solid #f5c6cb', borderRadius: 3 }}>
            <IconWarn /> {error}
          </div>
        )}

        <div className="form-actions">
          <Link to="/careers" className="btn">← Cancel</Link>
          {hasDocs ? (
            <button className="btn primary" disabled={!agreed || !canApply} onClick={handleNext}>
              Next: Upload Documents →
            </button>
          ) : (
            <button className="btn primary" disabled={loading || !agreed || !canApply} onClick={handleSubmitDirect}>
              {loading ? 'Submitting…' : 'Submit Application ▶'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Success Screen
// ─────────────────────────────────────────────────────────────
function SuccessPanel({ refNo, advt, navigate }) {
  const [paying, setPaying] = useState(false)

  // Pay straight from the success screen: the candidate is signed in and we
  // already hold the reference, so there is nothing to look up first.
  const handlePay = async () => {
    setPaying(true)
    try {
      // Only returns if the redirect to the bank didn't happen.
      await startEasyPayPayment(refNo)
    } catch (err) {
      toast.error(err.message || 'Payment could not be started.')
      navigate('/applications')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="notice info" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 42, marginBottom: 8, color: '#2a7a2a' }}><IconCheckCircle /></div>
        <div className="title" style={{ color: '#2a7a2a', fontSize: 20, marginBottom: 8 }}>Application Submitted</div>
        <div style={{ fontSize: 13.5, color: 'var(--ojas-ink-2)', marginBottom: 20 }}>
          Your application for <strong>{advt.post_title?.en}</strong> ({advt.advt_no}) has been received.
        </div>
        <div style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginBottom: 6 }}>Application Reference Number</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, letterSpacing: 3, color: 'var(--ojas-navy)', marginBottom: 20, padding: '10px 0', borderTop: '1px solid var(--ojas-line)', borderBottom: '1px solid var(--ojas-line)' }}>
          {refNo}
        </div>
        <p style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginBottom: 24 }}>
          Note this reference number. You will need it to print your application form and track status.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => navigate('/application/print', { state: { ref: refNo } })}>
            Print Application ▶
          </button>
          <button className="btn" onClick={handlePay} disabled={paying}>
            {paying ? 'Opening…' : 'Pay Fee ▶'}
          </button>
          <Link to="/careers" className="btn">Browse More Openings</Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Already Applied Panel
// ─────────────────────────────────────────────────────────────
function AlreadyAppliedPanel({ advt, myApp, navigate }) {
  const refNo = myApp?.application_ref_no
  // null = still loading, undefined = no payment row yet (never initiated)
  const [fee, setFee] = useState(null)
  const [paying, setPaying] = useState(false)

  // An advertisement with neither fee configured is free — never tell those
  // candidates a payment is outstanding. The exact amount stays a server
  // decision (it depends on category and gender), so we only ask "is there a
  // fee at all" here.
  const feeApplies = Number(advt?.application_fee) > 0 ||
                     Number(advt?.application_fee_concessional) > 0

  useEffect(() => {
    if (!refNo || !feeApplies) return
    let cancelled = false
    get('/api/v1/fee-payments/me', undefined, { silent401: true })
      .then((res) => {
        if (cancelled) return
        setFee((res?.data ?? []).find((f) => f.application_ref_no === refNo))
      })
      .catch(() => { if (!cancelled) setFee(undefined) })
    return () => { cancelled = true }
  }, [refNo, feeApplies])

  const handlePay = async () => {
    setPaying(true)
    try {
      // Only returns if the redirect to the bank didn't happen.
      await startEasyPayPayment(refNo)
    } catch (err) {
      toast.error(err.message || 'Payment could not be started.')
      navigate('/applications')
    } finally {
      setPaying(false)
    }
  }

  const paid = fee?.status === 'paid'
  // Loading is only distinguishable while `fee` is still the initial null.
  const feeLoading = feeApplies && refNo && fee === null

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="notice info">
        <div className="title" style={{ color: '#2a7a2a' }}>Already Applied <IconCheck /></div>
        <p style={{ marginTop: 8, fontSize: 13.5 }}>
          You have already submitted an application for <strong>{advt.post_title?.en}</strong> ({advt.advt_no}).
        </p>
        {refNo && (
          <div style={{ margin: '12px 0', padding: '10px 14px', background: '#fff', border: '1px solid var(--ojas-line)', borderRadius: 3 }}>
            <span style={{ fontSize: 12, color: 'var(--ojas-ink-3)' }}>Reference No: </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--ojas-navy)' }}>{refNo}</span>
          </div>
        )}

        {feeApplies && refNo && !feeLoading && (
          paid ? (
            <div style={{ margin: '12px 0', padding: '10px 14px', background: '#fff', border: '1px solid var(--ojas-line)', borderLeft: '4px solid #2a7a2a', borderRadius: 3 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#2a7a2a' }}>
                Fee Paid <IconCheck />
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ojas-ink-2)', marginTop: 4 }}>
                ₹{Number(fee.amount).toLocaleString('en-IN')} received
                {fee.paid_at ? ` on ${fmtDate(fee.paid_at)}` : ''}.{' '}
                <a
                  href={`${BASE}/api/v1/fee-payments/receipt/${fee.payment_id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}
                >
                  Download Receipt ▶
                </a>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginTop: 4, fontFamily: 'var(--font-guj)' }}>
                ફી ચૂકવાઈ ગઈ છે.
              </div>
            </div>
          ) : (
            <div style={{ margin: '12px 0', padding: '10px 14px', background: '#fff8ec', border: '1px solid var(--ojas-saffron-deep)', borderLeft: '4px solid var(--ojas-saffron-deep)', borderRadius: 3 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#8a2a2a' }}>
                <IconWarn /> Fee Pending
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ojas-ink-2)', marginTop: 4, lineHeight: 1.6 }}>
                Your application is submitted, but the application fee has not been paid yet.
                Your application is not complete until the fee is received.
              </div>
              <div style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginTop: 4, fontFamily: 'var(--font-guj)', lineHeight: 1.7 }}>
                તમારી અરજી સબમિટ થઈ છે, પરંતુ અરજી ફી હજુ ચૂકવાઈ નથી. ફી મળ્યા વિના અરજી પૂર્ણ ગણાશે નહીં.
              </div>
            </div>
          )
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {feeApplies && refNo && !feeLoading && !paid && (
            <button className="btn primary" onClick={handlePay} disabled={paying}>
              {paying ? 'Opening…' : 'Pay Fee Now ▶'}
            </button>
          )}
          {refNo && (
            <button className={feeApplies && !paid ? 'btn' : 'btn primary'} onClick={() => navigate('/application/print', { state: { ref: refNo } })}>
              Print Application ▶
            </button>
          )}
          <Link to="/careers" className="btn">← Back to Openings</Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function ApplyDirect() {
  const { slug }  = useParams()
  const id        = slug
  const navigate  = useNavigate()
  const { refresh } = useAuth()

  // screen: 'loading' | 'not_found' | 'closed' | 'error' | 'login' | 'form' | 'already_applied' | 'success'
  const [screen, setScreen]   = useState('loading')
  const [advt, setAdvt]       = useState(null)
  const [myApp, setMyApp]     = useState(null)
  const [refNo, setRefNo]     = useState(null)
  const [formData, setFormData] = useState({})

  const loadData = useCallback(async () => {
    setScreen('loading')
    try {
      const authRes = await get('/api/v1/applications/me', undefined, { silent401: true }).catch(() => null)
      if (authRes === null) {
        setScreen('login')
        return
      }

      const advtRes = await get(`/api/v1/advertisements/${id}`)
      const a = advtRes?.data
      if (!a) { setScreen('not_found'); return }
      if (a.status === 'Closed' || a.status === 'Archived') { setAdvt(a); setScreen('closed'); return }
      if (a.status !== 'Published') { setAdvt(a); setScreen('closed'); return }

      setAdvt(a)
      const existing = (authRes?.data || []).find(ap => ap.advt_no === a.advt_no)
      if (existing) { setMyApp(existing); setScreen('already_applied'); return }
      setScreen('form')
    } catch {
      setScreen('error')
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  // After OTP login succeeds, hydrate the auth context (header state)
  // and re-check existing applications
  const handleLoginSuccess = () => { refresh(); loadData() }

  const handleSubmitSuccess = (ref) => {
    setRefNo(ref)
    setScreen('success')
  }

  // ── Screens ─────────────────────────────────────────────────

  if (screen === 'loading') {
    return <div style={{ padding: 56, textAlign: 'center', color: 'var(--ojas-ink-3)', fontSize: 15 }}>Loading…</div>
  }

  if (screen === 'not_found') {
    return (
      <>
        <div className="page-heading"><h1>Advertisement Not Found</h1></div>
        <div className="notice warn" style={{ maxWidth: 480, margin: '24px auto' }}>
          <div className="title">Not Found</div>
          This advertisement does not exist or is no longer available.{' '}
          <Link to="/careers" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Browse Current Openings →</Link>
        </div>
      </>
    )
  }

  if (screen === 'error') {
    return (
      <>
        <div className="page-heading"><h1>Error</h1></div>
        <div className="notice warn" style={{ maxWidth: 480, margin: '24px auto' }}>
          <div className="title">Something went wrong</div>
          Could not load the advertisement. Please try again.{' '}
          <button className="btn-link" onClick={loadData}>Retry</button>
        </div>
      </>
    )
  }

  const heading = (
    <>
      <div className="page-heading">
        <h1>Apply Online</h1>
        <span className="guj">ઓનલાઇન અરજી</span>
      </div>

      {/* advt summary strip */}
      {advt && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <span style={{ background: 'var(--ojas-navy)', color: '#fff', padding: '4px 12px', borderRadius: 3, fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {advt.advt_no}
          </span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ojas-ink-1)' }}>
            {advt.post_title?.en}
          </span>
          {advt.post_title?.gu && (
            <span style={{ fontFamily: 'var(--font-guj)', fontSize: 13, color: 'var(--ojas-ink-3)' }}>
              ({advt.post_title.gu})
            </span>
          )}
        </div>
      )}
    </>
  )

  if (screen === 'closed') {
    return (
      <>
        {heading}
        <div className="notice warn" style={{ maxWidth: 480, margin: '24px auto' }}>
          <div className="title">Applications Closed</div>
          This advertisement is no longer accepting applications.{' '}
          <Link to="/careers" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Browse Current Openings →</Link>
        </div>
      </>
    )
  }

  if (screen === 'upload_docs') {
    return (
      <>
        {heading}
        <DocumentUploadPanel
          advt={advt}
          formData={formData}
          onSuccess={(ref) => { setRefNo(ref); setScreen('success') }}
          onBack={() => setScreen('form')}
        />
      </>
    )
  }

  if (screen === 'success') {
    return (
      <>
        {heading}
        <SuccessPanel refNo={refNo} advt={advt} navigate={navigate} />
      </>
    )
  }

  if (screen === 'already_applied') {
    return (
      <>
        {heading}
        <AlreadyAppliedPanel advt={advt} myApp={myApp} navigate={navigate} />
      </>
    )
  }

  return (
    <>
      {heading}

      {screen === 'login' && (
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="notice info" style={{ marginBottom: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <strong style={{ fontSize: 13.5, color: 'var(--ojas-navy-deep)', display: 'block', marginBottom: 2 }}>
                  First time applying? / નવા ઉમેદવાર?
                </strong>
                <span style={{ fontSize: 12, color: 'var(--ojas-ink-2)' }}>
                  Complete One-Time Registration (OTR) before applying.
                </span>
              </div>
              <Link
                to="/registration"
                className="btn primary"
                style={{ padding: '6px 14px', fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Register (OTR) ▶
              </Link>
            </div>
          </div>
          <CandidateLogin onSuccess={handleLoginSuccess} submitLabel="Login & Continue" />
        </div>
      )}

      {screen === 'form' && (
        <ApplicationFormPanel
          advt={advt}
          onSuccess={handleSubmitSuccess}
          onNext={(data) => { setFormData(data); setScreen('upload_docs') }}
          onDeadline={() => setScreen('closed')}
        />
      )}
    </>
  )
}
