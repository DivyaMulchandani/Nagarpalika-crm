import { useState, useEffect } from 'react'
import { get } from '../../api/index'
import StoredImage from '../../components/StoredImage'
import { IconCheck } from '../../components/Icons'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—'

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value ?? '—'}</div>
    </div>
  )
}

function VerifiedBadge({ verified }) {
  return verified
    ? <span style={{ color: '#2a7a2a', fontWeight: 700, fontSize: 12 }}> Verified <IconCheck /></span>
    : <span style={{ color: 'var(--ojas-ink-3)', fontSize: 12 }}> (Not verified)</span>
}

function formatAddress(addr) {
  if (!addr) return null
  const parts = [addr.line1, addr.line2, addr.taluka, addr.district, addr.pincode].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    get('/api/v1/candidates/me', undefined, { silent401: true })
      .then((res) => setProfile(res?.data ?? null))
      .catch((e) => setError(e.message || 'Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div>

  if (error || !profile) {
    return (
      <>
        <div className="page-heading"><h1>My Profile</h1></div>
        <div className="notice warn">
          <div className="title">Unable to load profile</div>
          {error || 'Please try again later.'}
        </div>
      </>
    )
  }

  const address = profile.address_current?.same_as_permanent
    ? formatAddress(profile.address_permanent)
    : formatAddress(profile.address_current)

  return (
    <>
      <div className="page-heading">
        <h1>My Profile</h1>
        <span className="guj">મારી પ્રોફાઇલ</span>
      </div>

      <div className="box">
        <div className="box-title"><span>Profile Details</span></div>
        <div className="box-body" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {profile.photo_path && (
            <StoredImage
              path={profile.photo_path}
              alt="Candidate photo"
              style={{ width: 120, height: 150, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--ojas-line)' }}
            />
          )}
          <div style={{ flex: '1 1 320px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Field label="Registration ID" value={profile.registration_id} />
            <Field label="Name" value={profile.name} />
            <Field label="Father/Husband Name" value={profile.father_husband_name} />
            <Field label="Date of Birth" value={fmtDate(profile.dob)} />
            <Field label="Gender" value={profile.gender} />
            <Field label="Category" value={profile.category} />
            <Field label="Mobile" value={<>{profile.mobile}<VerifiedBadge verified={profile.mobile_verified} /></>} />
            <Field label="Email" value={profile.email ? <>{profile.email}<VerifiedBadge verified={profile.email_verified} /></> : null} />
            <Field label="Qualification" value={profile.qualification} />
            <Field label="Current Address" value={address} />
          </div>
        </div>
      </div>
    </>
  )
}
