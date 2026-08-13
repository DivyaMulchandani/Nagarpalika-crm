import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { get, patch, BASE } from '../../api/index'
import StoredImage from '../../components/StoredImage'
import { IconCheck } from '../../components/Icons'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—')

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS']
const GENDERS = ['Male', 'Female', 'Other']
const MARITAL_STATUSES = ['Unmarried', 'Married', 'Divorced', 'Widowed']
const RELIGIONS = ['Hindu', 'Muslim', 'Jain', 'Christian', 'Sikh', 'Buddhist', 'Other']
const DEFAULT_LANGUAGES = ['Gujarati', 'Hindi', 'English']

function Field({ label, value, style = {} }) {
  return (
    <div style={{ marginBottom: 12, minWidth: 0, ...style }}>
      <div
        style={{
          fontSize: 11,
          color: 'var(--ojas-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '.04em',
          fontWeight: 600,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.4 }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

function VerifiedBadge({ verified }) {
  if (!verified) return null
  return (
    <span style={{ color: '#2a7a2a', fontWeight: 700, fontSize: 12, display: 'inline-block', marginLeft: 4 }}>
      {' '}
      Verified <IconCheck />
    </span>
  )
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

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [qualificationsList, setQualificationsList] = useState([])
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

  // Photo & Signature upload files
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [sigFile, setSigFile] = useState(null)
  const [sigPreview, setSigPreview] = useState(null)

  const photoInputRef = useRef()
  const sigInputRef = useRef()

  const loadProfile = () => {
    setLoading(true)
    get('/api/v1/candidates/me', undefined, { silent401: true })
      .then((res) => {
        setProfile(res?.data ?? null)
      })
      .catch((e) => setError(e.message || 'Failed to load profile'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProfile()
    get('/api/v1/qualifications/public')
      .then((res) => {
        const list = (res?.data || []).map((q) => q.name).filter(Boolean)
        setQualificationsList(list)
      })
      .catch(() => {})
  }, [])

  const startEditing = () => {
    if (!profile) return
    const currentLanguages = profile.languages && profile.languages.length > 0
      ? profile.languages
      : DEFAULT_LANGUAGES.map((l) => ({ language: l, read: false, write: false, speak: false }))

    setFormData({
      name: profile.name || '',
      father_husband_name: profile.father_husband_name || '',
      dob: profile.dob ? profile.dob.split('T')[0] : '',
      gender: profile.gender || 'Male',
      category: profile.category || 'General',
      caste_cert_no: profile.caste_cert_no || '',
      marital_status: profile.marital_status || 'Unmarried',
      nationality: profile.nationality || 'Indian',
      religion: profile.religion || 'Hindu',
      mother_tongue: profile.mother_tongue || 'Gujarati',
      alternate_mobile: profile.alternate_mobile || '',
      qualification: profile.qualification || '',
      address_permanent: {
        line1: profile.address_permanent?.line1 || '',
        line2: profile.address_permanent?.line2 || '',
        taluka: profile.address_permanent?.taluka || '',
        district: profile.address_permanent?.district || '',
        pincode: profile.address_permanent?.pincode || '',
      },
      address_current: {
        same_as_permanent: !!profile.address_current?.same_as_permanent,
        line1: profile.address_current?.line1 || '',
        line2: profile.address_current?.line2 || '',
        taluka: profile.address_current?.taluka || '',
        district: profile.address_current?.district || '',
        pincode: profile.address_current?.pincode || '',
      },
      languages: currentLanguages,
      photo_path: profile.photo_path || '',
      signature_path: profile.signature_path || '',
    })
    setPhotoFile(null)
    setPhotoPreview(null)
    setSigFile(null)
    setSigPreview(null)
    setFormErrors({})
    setIsEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setFormErrors({})
    setPhotoFile(null)
    setPhotoPreview(null)
    setSigFile(null)
    setSigPreview(null)
  }

  const handleTextChange = (field) => (e) => {
    setFormData((p) => ({ ...p, [field]: e.target.value }))
  }

  const handlePermanentAddrChange = (field) => (e) => {
    const val = e.target.value
    setFormData((p) => {
      const updatedPerm = { ...p.address_permanent, [field]: val }
      const updatedCurr = p.address_current?.same_as_permanent
        ? { ...p.address_current, [field]: val }
        : p.address_current
      return {
        ...p,
        address_permanent: updatedPerm,
        address_current: updatedCurr,
      }
    })
  }

  const handleCurrentAddrChange = (field) => (e) => {
    const val = e.target.value
    setFormData((p) => ({
      ...p,
      address_current: {
        ...p.address_current,
        [field]: val,
      },
    }))
  }

  const handleSameAsPermanentToggle = (e) => {
    const checked = e.target.checked
    setFormData((p) => ({
      ...p,
      address_current: checked
        ? { same_as_permanent: true, ...p.address_permanent }
        : { ...p.address_current, same_as_permanent: false },
    }))
  }

  const handleLanguageToggle = (langName, skill) => {
    setFormData((p) => {
      const langs = [...(p.languages || [])]
      const idx = langs.findIndex((l) => l.language === langName)
      if (idx >= 0) {
        langs[idx] = { ...langs[idx], [skill]: !langs[idx][skill] }
      } else {
        langs.push({ language: langName, read: skill === 'read', write: skill === 'write', speak: skill === 'speak' })
      }
      return { ...p, languages: langs }
    })
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Only JPG/PNG images are allowed for photo.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo size must be under 5 MB.')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSigSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Only JPG/PNG images are allowed for signature.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Signature size must be under 5 MB.')
      return
    }
    setSigFile(file)
    setSigPreview(URL.createObjectURL(file))
  }

  const validateForm = () => {
    const errs = {}
    if (!formData.name?.trim()) errs.name = 'Name is required'
    if (!formData.father_husband_name?.trim()) errs.father_husband_name = 'Father / Husband name is required'
    if (!formData.dob) errs.dob = 'Date of birth is required'
    if (!formData.qualification?.trim()) errs.qualification = 'Qualification is required'
    if (!formData.address_permanent?.line1?.trim()) errs.perm_line1 = 'Permanent address line 1 is required'
    if (!formData.address_permanent?.district?.trim()) errs.perm_district = 'District is required'
    if (!formData.address_permanent?.pincode?.trim() || !/^\d{6}$/.test(formData.address_permanent.pincode)) {
      errs.perm_pincode = 'Valid 6-digit Pincode is required'
    }

    if (!formData.address_current?.same_as_permanent) {
      if (!formData.address_current?.line1?.trim()) errs.curr_line1 = 'Current address line 1 is required'
      if (!formData.address_current?.district?.trim()) errs.curr_district = 'District is required'
      if (!formData.address_current?.pincode?.trim() || !/^\d{6}$/.test(formData.address_current.pincode)) {
        errs.curr_pincode = 'Valid 6-digit Pincode is required'
      }
    }

    if (formData.category && formData.category !== 'General' && !formData.caste_cert_no?.trim()) {
      errs.caste_cert_no = 'Caste certificate number is required for reserved categories'
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleOpenConfirm = (e) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Please fix the errors in the form before saving.')
      return
    }
    setConfirmModalOpen(true)
  }

  const handleSaveProfile = async () => {
    setConfirmModalOpen(false)
    setSaving(true)
    try {
      // 1. Upload photo if newly selected
      let photoPath = formData.photo_path
      if (photoFile) {
        const pfd = new FormData()
        pfd.append('photo', photoFile)
        const photoRes = await fetch(`${BASE}/api/v1/candidates/me/photo`, {
          method: 'POST',
          credentials: 'include',
          body: pfd,
        })
        const photoJson = await photoRes.json()
        if (!photoRes.ok) throw new Error(photoJson.message || 'Photo upload failed')
        if (photoJson.data?.photo_path) photoPath = photoJson.data.photo_path
      }

      // 2. Upload signature if newly selected
      let sigPath = formData.signature_path
      if (sigFile) {
        const sfd = new FormData()
        sfd.append('signature', sigFile)
        const sigRes = await fetch(`${BASE}/api/v1/candidates/me/signature`, {
          method: 'POST',
          credentials: 'include',
          body: sfd,
        })
        const sigJson = await sigRes.json()
        if (!sigRes.ok) throw new Error(sigJson.message || 'Signature upload failed')
        if (sigJson.data?.signature_path) sigPath = sigJson.data.signature_path
      }

      // 3. Patch profile data
      const payload = {
        name: formData.name.trim(),
        father_husband_name: formData.father_husband_name.trim(),
        dob: formData.dob,
        gender: formData.gender,
        category: formData.category,
        caste_cert_no: formData.caste_cert_no?.trim() || undefined,
        marital_status: formData.marital_status,
        nationality: formData.nationality?.trim() || 'Indian',
        religion: formData.religion,
        mother_tongue: formData.mother_tongue?.trim() || 'Gujarati',
        alternate_mobile: formData.alternate_mobile?.trim() || undefined,
        qualification: formData.qualification,
        languages: formData.languages,
        address_permanent: formData.address_permanent,
        address_current: formData.address_current,
        photo_path: photoPath,
        signature_path: sigPath,
      }

      const res = await patch('/api/v1/candidates/me', payload)
      toast.success(res.message || 'Profile updated successfully!')
      setProfile(res.data)
      setIsEditing(false)
      loadProfile()
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--ojas-ink-3)' }}>Loading profile…</div>

  if (error || !profile) {
    return (
      <>
        <div className="page-heading">
          <h1>My Profile</h1>
        </div>
        <div className="notice warn">
          <div className="title">Unable to load profile</div>
          {error || 'Please try again later.'}
        </div>
      </>
    )
  }

  const isEditLocked = (profile.profile_edit_count || 0) >= 1
  const permanentAddress = formatAddress(profile.address_permanent)
  const currentAddress = profile.address_current?.same_as_permanent
    ? permanentAddress
    : formatAddress(profile.address_current)

  return (
    <>
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>My Profile</h1>
          <span className="guj">મારી પ્રોફાઇલ</span>
        </div>
        {!isEditing && !isEditLocked && (
          <button
            type="button"
            className="btn primary"
            onClick={startEditing}
            style={{ fontWeight: 700 }}
          >
            Edit Profile (1-Time Allowed)
          </button>
        )}
      </div>

      {/* ── Guidance / Status Notice ── */}
      {!isEditing && (
        <>
          {isEditLocked ? (
            <div
              className="box"
              style={{
                marginBottom: 20,
                borderLeft: '5px solid #d97706',
                background: '#fffbeb',
                borderColor: '#fcd34d',
              }}
            >
              <div className="box-body" style={{ padding: '16px 20px' }}>
                <div style={{ marginBottom: 6 }}>
                  <strong style={{ color: '#92400e', fontSize: 15 }}>
                    Profile Editing Locked (1-Time Lifetime Limit Reached)
                  </strong>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
                  You have already used your 1-time profile edit allowance{profile.profile_edited_at ? ` on ${fmtDate(profile.profile_edited_at)}` : ''}.
                  Online editing is permanently locked to prevent unauthorized changes.
                </p>
                <div
                  style={{
                    background: '#ffffff',
                    padding: '12px 16px',
                    borderRadius: 6,
                    border: '1px solid #fde68a',
                    fontSize: 13,
                    color: '#451a03',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    Need further corrections or critical detail updates?
                  </div>
                  <div>
                    Please contact the <strong>Nagarpalika Recruitment Administration Helpline</strong> with your Registration ID (<code>{profile.registration_id}</code>) and supporting government documents:
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <span><strong>Helpline Phone:</strong> 02766-233232</span>
                    <span><strong>Official Email:</strong> np_patan@yahoo.co.in</span>
                    <span><strong>Working Hours:</strong> Mon – Sat, 10:30 AM – 6:10 PM</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="box"
              style={{
                marginBottom: 20,
                borderLeft: '5px solid var(--ojas-saffron)',
                background: '#fef8f0',
                borderColor: '#fed7aa',
              }}
            >
              <div className="box-body" style={{ padding: '14px 18px' }}>
                <div style={{ fontWeight: 700, color: 'var(--ojas-ink)', fontSize: 14, marginBottom: 2 }}>
                  Profile Edit Available (1-Time Lifetime Allowed)
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ojas-ink-2)' }}>
                  You can edit your personal and address details <strong>only once</strong> in your lifetime. 
                  <strong style={{ color: '#b91c1c' }}> Aadhaar Number, Mobile Number, and Email Address are permanently locked</strong> and cannot be changed online.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── EDIT MODE FORM ── */}
      {isEditing ? (
        <form onSubmit={handleOpenConfirm}>
          <div
            className="notice warn"
            style={{
              marginBottom: 20,
              background: '#fff7ed',
              borderColor: '#fdba74',
              color: '#9a3412',
            }}
          >
            <div className="title" style={{ fontSize: 15, fontWeight: 700 }}>
              Warning: You can only edit your profile ONCE
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5 }}>
              Once you submit these changes, your profile will be <strong>permanently locked</strong> from online editing. 
              <strong> Aadhaar Number, Mobile Number, and Email Address cannot be changed.</strong> Please review all information thoroughly before saving.
            </p>
          </div>

          <div className="box" style={{ marginBottom: 20 }}>
            <div className="box-title">
              <span>Permanently Locked Identity Details (Read-Only)</span>
            </div>
            <div className="box-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div className="form-field">
                <label>Registration ID (Locked)</label>
                <input type="text" value={profile.registration_id} disabled style={{ background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }} />
                <span style={{ fontSize: 11, color: 'var(--ojas-ink-3)' }}>System assigned OTR identifier</span>
              </div>
              <div className="form-field">
                <label>Mobile Number (Locked)</label>
                <input type="text" value={profile.mobile} disabled style={{ background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }} />
                <span style={{ fontSize: 11, color: '#b91c1c' }}>Permanently locked for candidate security</span>
              </div>
              <div className="form-field">
                <label>Email Address (Locked)</label>
                <input type="text" value={profile.email || '—'} disabled style={{ background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }} />
                <span style={{ fontSize: 11, color: '#b91c1c' }}>Permanently locked for candidate security</span>
              </div>
            </div>
          </div>

          <div className="box" style={{ marginBottom: 20 }}>
            <div className="box-title">
              <span>Personal Details (Editable 1-Time)</span>
            </div>
            <div className="box-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                <div className="form-field">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value.replace(/[^A-Za-z\s.']/g, '').slice(0, 100) }))}
                  />
                  {formErrors.name && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.name}</p>}
                </div>

                <div className="form-field">
                  <label>Father / Husband Name *</label>
                  <input
                    type="text"
                    value={formData.father_husband_name}
                    onChange={(e) => setFormData((p) => ({ ...p, father_husband_name: e.target.value.replace(/[^A-Za-z\s.']/g, '').slice(0, 100) }))}
                  />
                  {formErrors.father_husband_name && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.father_husband_name}</p>}
                </div>

                <div className="form-field">
                  <label>Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.dob}
                    max={new Date().toISOString().split('T')[0]}
                    min="1940-01-01"
                    onChange={handleTextChange('dob')}
                  />
                  {formErrors.dob && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.dob}</p>}
                </div>

                <div className="form-field">
                  <label>Gender *</label>
                  <select value={formData.gender} onChange={handleTextChange('gender')}>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Category *</label>
                  <select value={formData.category} onChange={handleTextChange('category')}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {formData.category !== 'General' && (
                  <div className="form-field">
                    <label>Caste Certificate Number *</label>
                    <input
                      type="text"
                      placeholder="Certificate Number"
                      value={formData.caste_cert_no}
                      onChange={handleTextChange('caste_cert_no')}
                    />
                    {formErrors.caste_cert_no && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.caste_cert_no}</p>}
                  </div>
                )}

                <div className="form-field">
                  <label>Marital Status</label>
                  <select value={formData.marital_status} onChange={handleTextChange('marital_status')}>
                    {MARITAL_STATUSES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Religion</label>
                  <select value={formData.religion} onChange={handleTextChange('religion')}>
                    {RELIGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Mother Tongue</label>
                  <input type="text" value={formData.mother_tongue} onChange={handleTextChange('mother_tongue')} />
                </div>

                <div className="form-field">
                  <label>Alternate Mobile Number (Optional)</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="10-digit number"
                    value={formData.alternate_mobile}
                    onChange={(e) => setFormData((p) => ({ ...p, alternate_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="box" style={{ marginBottom: 20 }}>
            <div className="box-title">
              <span>Address Details</span>
            </div>
            <div className="box-body">
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: 'var(--ojas-navy)' }}>
                Permanent Address
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div className="form-field" style={{ gridColumn: 'span 2' }}>
                  <label>Address Line 1 *</label>
                  <input type="text" value={formData.address_permanent?.line1 || ''} onChange={handlePermanentAddrChange('line1')} />
                  {formErrors.perm_line1 && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.perm_line1}</p>}
                </div>
                <div className="form-field" style={{ gridColumn: 'span 2' }}>
                  <label>Address Line 2</label>
                  <input type="text" value={formData.address_permanent?.line2 || ''} onChange={handlePermanentAddrChange('line2')} />
                </div>
                <div className="form-field">
                  <label>Taluka</label>
                  <input type="text" value={formData.address_permanent?.taluka || ''} onChange={handlePermanentAddrChange('taluka')} />
                </div>
                <div className="form-field">
                  <label>District *</label>
                  <input type="text" value={formData.address_permanent?.district || ''} onChange={handlePermanentAddrChange('district')} />
                  {formErrors.perm_district && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.perm_district}</p>}
                </div>
                <div className="form-field">
                  <label>Pincode *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.address_permanent?.pincode || ''}
                    onChange={(e) => handlePermanentAddrChange('pincode')({ target: { value: e.target.value.replace(/\D/g, '').slice(0, 6) } })}
                  />
                  {formErrors.perm_pincode && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.perm_pincode}</p>}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--ojas-line)', margin: '16px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--ojas-navy)' }}>
                  Current Address
                </h3>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={!!formData.address_current?.same_as_permanent}
                    onChange={handleSameAsPermanentToggle}
                  />
                  Same as Permanent Address
                </label>
              </div>

              {!formData.address_current?.same_as_permanent && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <div className="form-field" style={{ gridColumn: 'span 2' }}>
                    <label>Current Address Line 1 *</label>
                    <input type="text" value={formData.address_current?.line1 || ''} onChange={handleCurrentAddrChange('line1')} />
                    {formErrors.curr_line1 && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.curr_line1}</p>}
                  </div>
                  <div className="form-field" style={{ gridColumn: 'span 2' }}>
                    <label>Current Address Line 2</label>
                    <input type="text" value={formData.address_current?.line2 || ''} onChange={handleCurrentAddrChange('line2')} />
                  </div>
                  <div className="form-field">
                    <label>Taluka</label>
                    <input type="text" value={formData.address_current?.taluka || ''} onChange={handleCurrentAddrChange('taluka')} />
                  </div>
                  <div className="form-field">
                    <label>District *</label>
                    <input type="text" value={formData.address_current?.district || ''} onChange={handleCurrentAddrChange('district')} />
                    {formErrors.curr_district && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.curr_district}</p>}
                  </div>
                  <div className="form-field">
                    <label>Pincode *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.address_current?.pincode || ''}
                      onChange={(e) => handleCurrentAddrChange('pincode')({ target: { value: e.target.value.replace(/\D/g, '').slice(0, 6) } })}
                    />
                    {formErrors.curr_pincode && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.curr_pincode}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="box" style={{ marginBottom: 20 }}>
            <div className="box-title">
              <span>Education & Language Details</span>
            </div>
            <div className="box-body">
              <div className="form-field" style={{ maxWidth: 400, marginBottom: 20 }}>
                <label>Highest Qualification *</label>
                <select value={formData.qualification} onChange={handleTextChange('qualification')}>
                  <option value="">-- Select Qualification --</option>
                  {qualificationsList.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                  {formData.qualification && !qualificationsList.includes(formData.qualification) && (
                    <option value={formData.qualification}>{formData.qualification}</option>
                  )}
                </select>
                {formErrors.qualification && <p style={{ color: 'var(--ojas-red)', fontSize: 12, margin: '2px 0 0' }}>{formErrors.qualification}</p>}
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'block' }}>Languages Known</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  {DEFAULT_LANGUAGES.map((lang) => {
                    const entry = (formData.languages || []).find((l) => l.language === lang) || {}
                    return (
                      <div key={lang} style={{ background: '#f9fafb', border: '1px solid var(--ojas-line)', borderRadius: 6, padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{lang}</div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12.5 }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!entry.read} onChange={() => handleLanguageToggle(lang, 'read')} /> Read
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!entry.write} onChange={() => handleLanguageToggle(lang, 'write')} /> Write
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!entry.speak} onChange={() => handleLanguageToggle(lang, 'speak')} /> Speak
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="box" style={{ marginBottom: 24 }}>
            <div className="box-title">
              <span>Photo & Signature (Optional Update)</span>
            </div>
            <div className="box-body" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 6 }}>Candidate Photograph</label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" style={{ width: 110, height: 140, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--ojas-line)' }} />
                  ) : profile.photo_path ? (
                    <StoredImage path={profile.photo_path} alt="Photo" style={{ width: 110, height: 140, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--ojas-line)' }} />
                  ) : (
                    <div style={{ width: 110, height: 140, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>No photo</div>
                  )}
                  <div>
                    <input type="file" accept="image/jpeg,image/png" ref={photoInputRef} onChange={handlePhotoSelect} style={{ display: 'none' }} />
                    <button type="button" className="btn" onClick={() => photoInputRef.current?.click()} style={{ fontSize: 12.5, padding: '6px 12px' }}>
                      Change Photo
                    </button>
                    <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)', marginTop: 4 }}>Max 5 MB (JPG/PNG)</div>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 6 }}>Candidate Signature</label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {sigPreview ? (
                    <img src={sigPreview} alt="Preview" style={{ width: 150, height: 75, objectFit: 'contain', background: '#fff', borderRadius: 4, border: '1px solid var(--ojas-line)' }} />
                  ) : profile.signature_path ? (
                    <StoredImage path={profile.signature_path} alt="Signature" style={{ width: 150, height: 75, objectFit: 'contain', background: '#fff', borderRadius: 4, border: '1px solid var(--ojas-line)' }} />
                  ) : (
                    <div style={{ width: 150, height: 75, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>No signature</div>
                  )}
                  <div>
                    <input type="file" accept="image/jpeg,image/png" ref={sigInputRef} onChange={handleSigSelect} style={{ display: 'none' }} />
                    <button type="button" className="btn" onClick={() => sigInputRef.current?.click()} style={{ fontSize: 12.5, padding: '6px 12px' }}>
                      Change Signature
                    </button>
                    <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)', marginTop: 4 }}>Max 5 MB (JPG/PNG)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn" onClick={cancelEditing} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving} style={{ fontWeight: 700 }}>
              {saving ? 'Saving Changes…' : 'Save Profile Changes (1-Time Only)'}
            </button>
          </div>
        </form>
      ) : (
        /* ── VIEW MODE ── */
        <div className="box">
          <div className="box-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Candidate Profile Information</span>
            <span style={{ fontSize: 12, color: 'var(--ojas-ink-3)', fontWeight: 400 }}>
              OTR Registration: <strong>{profile.registration_id}</strong>
            </span>
          </div>
          <div className="box-body">
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 24 }}>
              {profile.photo_path && (
                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  <StoredImage
                    path={profile.photo_path}
                    alt="Candidate photo"
                    style={{
                      width: 130,
                      height: 160,
                      objectFit: 'cover',
                      borderRadius: 6,
                      border: '1px solid var(--ojas-line)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)', marginTop: 4, fontWeight: 600 }}>Photo</div>
                </div>
              )}
              {profile.signature_path && (
                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  <StoredImage
                    path={profile.signature_path}
                    alt="Candidate signature"
                    style={{
                      width: 160,
                      height: 70,
                      objectFit: 'contain',
                      background: '#fff',
                      borderRadius: 6,
                      border: '1px solid var(--ojas-line)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)', marginTop: 4, fontWeight: 600 }}>Signature</div>
                </div>
              )}
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: 'var(--ojas-navy)', borderBottom: '1px solid var(--ojas-line)', paddingBottom: 6 }}>
              Personal Details
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                columnGap: 24,
                rowGap: 14,
                marginBottom: 20,
              }}
            >
              <Field label="Registration ID" value={profile.registration_id} />
              <Field label="Full Name" value={profile.name} />
              <Field label="Father/Husband Name" value={profile.father_husband_name} />
              <Field label="Date of Birth" value={fmtDate(profile.dob)} />
              <Field label="Gender" value={profile.gender} />
              <Field label="Category" value={profile.category} />
              {profile.caste_cert_no && <Field label="Caste Certificate No" value={profile.caste_cert_no} />}
              <Field label="Marital Status" value={profile.marital_status} />
              <Field label="Religion" value={profile.religion} />
              <Field label="Nationality" value={profile.nationality || 'Indian'} />
              <Field label="Mother Tongue" value={profile.mother_tongue} />
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: 'var(--ojas-navy)', borderBottom: '1px solid var(--ojas-line)', paddingBottom: 6 }}>
              Contact Details
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                columnGap: 24,
                rowGap: 14,
                marginBottom: 20,
              }}
            >
              <Field
                label="Mobile Number"
                value={
                  <>
                    {profile.mobile}
                    <VerifiedBadge verified={profile.mobile_verified} />
                  </>
                }
              />
              <Field
                label="Email Address"
                value={
                  profile.email ? (
                    <>
                      {profile.email}
                      <VerifiedBadge verified={profile.email_verified} />
                    </>
                  ) : null
                }
              />
              {profile.alternate_mobile && <Field label="Alternate Mobile" value={profile.alternate_mobile} />}
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: 'var(--ojas-navy)', borderBottom: '1px solid var(--ojas-line)', paddingBottom: 6 }}>
              Address Details
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                columnGap: 24,
                rowGap: 14,
                marginBottom: 20,
              }}
            >
              <Field label="Permanent Address" value={permanentAddress} />
              <Field label="Current Address" value={currentAddress} />
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: 'var(--ojas-navy)', borderBottom: '1px solid var(--ojas-line)', paddingBottom: 6 }}>
              Education & Languages
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                columnGap: 24,
                rowGap: 14,
              }}
            >
              <Field label="Highest Qualification" value={profile.qualification} />
              <Field
                label="Languages Known"
                value={
                  profile.languages && profile.languages.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {profile.languages.map((l) => (
                        <span
                          key={l.language}
                          style={{
                            background: '#f3f4f6',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          <strong>{l.language}:</strong> {[l.read && 'Read', l.write && 'Write', l.speak && 'Speak'].filter(Boolean).join(', ') || 'None'}
                        </span>
                      ))}
                    </div>
                  ) : '—'
                }
                style={{ gridColumn: 'span 2' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {confirmModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="box"
            style={{
              maxWidth: 480,
              width: '100%',
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              className="box-title"
              style={{ background: '#78350f', color: '#fff', display: 'flex', alignItems: 'center' }}
            >
              <span>Confirm Profile Update (1-Time Only)</span>
            </div>
            <div className="box-body" style={{ padding: 20 }}>
              <p style={{ fontSize: 14, color: 'var(--ojas-ink)', lineHeight: 1.5, margin: '0 0 14px' }}>
                Are you sure you want to save these profile changes?
              </p>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  padding: '12px 14px',
                  color: '#991b1b',
                  fontSize: 13,
                  marginBottom: 18,
                  lineHeight: 1.4,
                }}
              >
                <strong>Important Notice:</strong> You are allowed to edit your profile <strong>ONLY ONCE</strong> in your lifetime. Once submitted:
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  <li>Online profile editing will be <strong>permanently locked</strong>.</li>
                  <li>Any further changes will strictly require contacting the Nagarpalika helpline with supporting identity documents.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setConfirmModalOpen(false)}
                  disabled={saving}
                >
                  Cancel & Review
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{ background: '#b91c1c', borderColor: '#991b1b', fontWeight: 700 }}
                >
                  {saving ? 'Saving…' : 'Yes, Confirm & Lock Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
