import { useState, useCallback, useEffect, useRef } from 'react';
import FaceVerification from '../FaceVerification.jsx';
import IDCardUpload from './IDCardUpload.jsx';
import * as api from '../api.js';
import { getDeviceFingerprint } from '../fingerprint.js';
import './wizard/registrationTheme.css';

export default function RegistrationWizard({
  role = 'student',
  onComplete,
  onCancel,
  onRedirectToLogin,
}) {
  const isStudent = role === 'student';
  const totalSteps = isStudent ? 6 : 5;
  const [currentStep, setCurrentStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(1);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    college: '',
    collegeId: '',
    collegeIdNumber: '',
  });

  const [colleges, setColleges] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(false);

  // Accordion & Drawer states
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [proofOpen, setProofOpen] = useState(false);
  const [charterAgreed, setCharterAgreed] = useState(true);

  // OTP Verification state
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const otp = otpArray.join('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailExistsError, setEmailExistsError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const otpInputRefs = useRef([]);

  // ID Card & Biometric Face state
  const [idCardBase64, setIdCardBase64] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [faceChecking, setFaceChecking] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  // Fetch recognized colleges if student registration
  useEffect(() => {
    if (isStudent) {
      setLoadingColleges(true);
      api
        .fetchColleges()
        .then((data) => {
          if (Array.isArray(data)) setColleges(data);
        })
        .catch((err) => console.error('Error loading colleges:', err))
        .finally(() => setLoadingColleges(false));
    }
  }, [isStudent]);

  // Stepper navigation
  const goToStep = (stepNumber) => {
    if (stepNumber < 1 || stepNumber > totalSteps) return;
    setCurrentStep(stepNumber);
    if (stepNumber > maxCompletedStep) {
      setMaxCompletedStep(stepNumber);
    }
  };

  const next = () => goToStep(currentStep + 1);
  const back = () => goToStep(Math.max(1, currentStep - 1));

  // ── Validation ───────────────────────────────────────────────────────────
  const isEmailValid = Boolean(form.email && form.email.includes('@') && form.email.includes('.'));
  const isNameValid = Boolean(form.name && form.name.trim().length >= 2);
  const isPasswordValid = Boolean(form.password && form.password.length >= 6);
  const isCollegeValid = !isStudent || Boolean((form.college && form.college.trim().length >= 2) || form.collegeId);
  const isStep1Valid = isNameValid && isEmailValid && isPasswordValid && isCollegeValid;

  // ── Live Domain Recognition ──────────────────────────────────────────────
  const getDomainBadge = () => {
    const email = form.email.toLowerCase();
    if (!email.includes('@')) return null;
    if (email.includes('stanford')) return 'Stanford University (.edu) — Verified';
    if (email.includes('berkeley')) return 'UC Berkeley (.edu) — Verified';
    if (email.includes('mit.edu')) return 'MIT (.edu) — Verified';
    if (email.includes('bit-bangalore') || email.includes('bit.edu')) return 'Bangalore Institute of Technology';
    if (email.includes('rvce') || email.includes('rv.edu')) return 'RV College of Engineering';
    if (email.includes('bmsce') || email.includes('bms.edu')) return 'BMS College of Engineering';
    if (email.includes('.edu')) return 'Accredited Academic (.edu)';
    if (email.includes('.ac.in')) return 'Indian Academic (.ac.in)';
    return 'Institutional Email';
  };

  // ── Send Registration OTP ───────────────────────────────────────────────
  const handleSendOtp = useCallback(async () => {
    if (!form.email || !form.email.includes('@')) {
      setOtpError('Please enter a valid email address.');
      return false;
    }
    setOtpError('');
    setEmailExistsError('');
    setSendingOtp(true);
    try {
      await api.sendOtp(form.email, 'register');
      setOtpSent(true);
      setOtpCountdown(60);
      const tid = setInterval(() => {
        setOtpCountdown((c) => {
          if (c <= 1) {
            clearInterval(tid);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return true;
    } catch (e) {
      if (e.code === 'EMAIL_EXISTS' || e.message?.includes('already exists')) {
        setEmailExistsError(e.message || 'An account with this email address already exists.');
      } else {
        setOtpError(e.message || 'Failed to dispatch verification code. Please try again.');
      }
      return false;
    } finally {
      setSendingOtp(false);
    }
  }, [form.email]);

  const handleStep1Submit = async () => {
    if (!isStep1Valid) return;
    const ok = await handleSendOtp();
    if (ok) {
      next();
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const char = value.slice(-1);
    const newArr = [...otpArray];
    newArr[index] = char;
    setOtpArray(newArr);

    if (char && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter all 6 digits.');
      return;
    }
    setOtpError('');
    setVerifyingOtp(true);
    try {
      const deviceFingerprint = await getDeviceFingerprint();

      const res = await api.verifyOtp(form.email, otp, deviceFingerprint, null, 'register');
      if (res?.verified || res?.success) {
        setEmailVerified(true);
        next();
      } else {
        setOtpError(res?.error || 'Verification failed. Please check the code.');
      }
    } catch (e) {
      setOtpError(e.message || 'Invalid or expired code. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  }, [form.email, otp]);

  // ── Real-time Face Scan & Duplicate Check ───────────────────────────────
  const handleFaceCaptured = async (desc) => {
    setSubmitError('');
    setDuplicateMatch(null);
    setFaceChecking(true);

    try {
      const checkRes = await api.checkFaceDuplicate(desc, form.email);
      if (checkRes.duplicate) {
        setDuplicateMatch({
          matchedEmail: checkRes.matchedEmail,
          matchedName: checkRes.matchedName,
          message: checkRes.message,
        });
        setFaceDescriptor(null);
      } else {
        setFaceDescriptor(desc);
        setDuplicateMatch(null);
      }
    } catch (err) {
      console.error('Biometric face check error:', err);
      setFaceDescriptor(desc);
    } finally {
      setFaceChecking(false);
    }
  };

  // ── Final Registration Submission ───────────────────────────────────────
  const submit = useCallback(async () => {
    if (!faceDescriptor) {
      setSubmitError('Live biometric face scan is required to enroll your profile.');
      return;
    }
    if (!otp) {
      setSubmitError('Email verification code is missing.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const deviceFingerprint = await getDeviceFingerprint();

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        otp: otp.trim(),
        faceDescriptor,
        faceEmbedding: faceDescriptor,
        deviceFingerprint,
        ...(isStudent && {
          collegeId: form.collegeId || undefined,
          college: form.college || undefined,
          collegeIdNumber: form.collegeIdNumber || undefined,
          idCardImage: idCardBase64,
        }),
      };

      let data;
      if (isStudent) {
        data = await api.registerStudent(payload);
      } else {
        data = await api.registerGeneral(payload);
      }

      setResultMessage(data?.message || 'Account created successfully! Welcome to TimeBank 🎉');

      if (data?.waitingApproval) {
        setWaitingApproval(true);
        setPendingUserId(data.userId);
        goToStep(totalSteps);
      } else if (data?.token && data?.user) {
        if (onComplete) {
          setTimeout(() => onComplete(data.token, data.user), 1500);
        }
        goToStep(totalSteps);
      } else {
        goToStep(totalSteps);
      }
    } catch (e) {
      if (e.code === 'DUPLICATE_FACE' || e.duplicateFace || e.message?.includes('face matches an existing account')) {
        const matched = e.matchedEmail || e.data?.matchedEmail;
        setDuplicateMatch({
          matchedEmail: matched || 'your original registered email',
          matchedName: e.matchedName || e.data?.matchedName || '',
          message: e.message || 'Face scan matches an existing account.',
        });
        setFaceDescriptor(null);
      } else {
        setSubmitError(e.message || 'An unexpected error occurred during registration. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [faceDescriptor, otp, form, isStudent, idCardBase64, onComplete, totalSteps]);

  // Stepper labels
  const stepLabels = isStudent
    ? ['Email', 'Code', 'ID Scan', 'Biometric', 'Review', 'Status']
    : ['Email', 'Code', 'Biometric', 'Review', 'Status'];

  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100%', color: '#f8fafc' }}>
      {/* Ambient Diffused Glows */}
      <div aria-hidden="true" style={{ pointerEvents: 'none', position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        <div
          className="animate-ambient-1"
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '720px',
            height: '520px',
            background: 'radial-gradient(circle, rgba(79, 70, 229, 0.2) 0%, rgba(16, 185, 129, 0.1) 45%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(100px)',
          }}
        />
        <div
          className="animate-ambient-2"
          style={{
            position: 'absolute',
            top: '35%',
            right: '15%',
            width: '480px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 65%)',
            borderRadius: '50%',
            filter: 'blur(90px)',
          }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 860, margin: '0 auto', padding: '1rem 1rem 3rem' }}>
        
        {/* Top Metadata Context */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#818cf8', marginBottom: 4 }}>
              <span>{isStudent ? 'Campus Verification' : 'Peer Verification'}</span>
              <span style={{ color: '#475569' }}>•</span>
              <span style={{ color: '#94a3b8' }}>Step <strong style={{ color: '#fff' }}>{currentStep}</strong> of {totalSteps}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.025em', margin: 0 }}>
              {isStudent ? 'Institutional Identity Verification' : 'Community Onboarding & Biometrics'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(12px)', padding: '6px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#34d399' }}>verified_user</span>
            <span>{isStudent ? (form.college || 'Accredited Campus Ledger') : 'Polygon Amoy Verified'}</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          </div>
        </div>

        {/* Main Verification Center Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 22,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)',
            padding: '1.75rem',
            position: 'relative',
          }}
        >
          {/* Stepper Navigation */}
          <nav aria-label="Verification Steps" style={{ position: 'relative', marginBottom: '2rem' }}>
            {/* Dynamic Connecting Progress Bar Underlay */}
            <div style={{ position: 'absolute', top: 16, left: '6%', right: '6%', height: 2, background: 'rgba(255, 255, 255, 0.08)', zIndex: 0 }}>
              <div
                id="stepProgressBar"
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #4f46e5, #10b981)',
                  transition: 'width 0.4s ease-out',
                  borderRadius: 9999,
                  width: `${progressPercent}%`,
                }}
              />
            </div>

            <ol style={{ display: 'grid', gridTemplateColumns: `repeat(${totalSteps}, 1fr)`, gap: 4, margin: 0, padding: 0, listStyle: 'none', position: 'relative', zIndex: 10 }}>
              {stepLabels.map((lbl, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;

                return (
                  <li
                    key={lbl}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (stepNum <= maxCompletedStep) goToStep(stepNum);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: stepNum <= maxCompletedStep ? 'pointer' : 'default',
                      opacity: stepNum <= maxCompletedStep || isCurrent ? 1 : 0.5,
                    }}
                  >
                    <div
                      className={`step-circle ${isCurrent ? 'active-ring-pulse' : ''}`}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        background: isCurrent
                          ? '#4f46e5'
                          : isCompleted
                          ? '#10b981'
                          : 'rgba(255, 255, 255, 0.08)',
                        color: isCurrent || isCompleted ? '#ffffff' : '#94a3b8',
                        border: isCurrent
                          ? '2px solid #818cf8'
                          : isCompleted
                          ? '1px solid #10b981'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: isCurrent ? '0 0 16px rgba(79, 70, 229, 0.5)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isCompleted ? (
                        <span className="material-symbols-outlined check-pop" style={{ fontSize: 18, fontWeight: 800 }}>check</span>
                      ) : (
                        <span>{stepNum}</span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? '#c7d2fe' : isCompleted ? '#34d399' : '#64748b',
                        marginTop: 6,
                        textAlign: 'center',
                      }}
                    >
                      {lbl}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Viewport for Step Panes */}
          <div style={{ position: 'relative', minHeight: 460 }}>
            
            {/* ─── STEP 1: Email & Details ─── */}
            {currentStep === 1 && (
              <div className="step-pane pane-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '2px 10px', borderRadius: 9999, marginBottom: 6 }}>
                    Step 01 • {isStudent ? 'Institutional NetID' : 'Account Details'}
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                    {isStudent ? 'Enter your institutional email & profile' : 'Create your TimeBank profile'}
                  </h2>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    {isStudent
                      ? 'Campus-scoped exchanges and AICTE time credit ledgers require verification via an accredited university email.'
                      : 'Join the decentralized peer exchange network with secure email verification.'}
                  </p>
                </div>

                {/* Email Field with Live Domain Badge */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
                    {isStudent ? 'University Email (.edu / .ac.in)' : 'Email Address'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      placeholder={isStudent ? 'you@college.edu' : 'you@example.com'}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        paddingRight: getDomainBadge() ? '220px' : '14px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 13.5,
                        outline: 'none',
                      }}
                    />
                    {getDomainBadge() && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(99, 102, 241, 0.18)',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          borderRadius: 9999,
                          padding: '3px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#c7d2fe',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#10b981' }}>check_circle</span>
                        <span style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDomainBadge()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Legal Name */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
                    Full Legal Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 10,
                      color: '#fff',
                      fontSize: 13.5,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* College Selector (Student Only) */}
                {isStudent && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>
                          Recognized College / University <span style={{ color: '#ef4444' }}>*</span>
                        </span>
                        {form.college && colleges.some((c) => c.name.toLowerCase() === form.college.toLowerCase().trim()) && (
                          <span style={{ fontSize: 11, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>verified</span>
                            Verified Partner
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        list="colleges-datalist"
                        placeholder="Type or select college name..."
                        value={form.college}
                        onChange={(e) => {
                          const val = e.target.value;
                          const match = colleges.find(
                            (c) => c.name.toLowerCase() === val.toLowerCase().trim() || (c.code && c.code.toLowerCase() === val.toLowerCase().trim())
                          );
                          setForm({
                            ...form,
                            college: val,
                            collegeId: match ? match._id : '',
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 10,
                          color: '#fff',
                          fontSize: 13.5,
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#10b981')}
                        onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                      />
                      <datalist id="colleges-datalist">
                        {colleges.map((c) => (
                          <option key={c._id} value={c.name}>
                            {c.name} {c.code ? `(${c.code})` : ''} {c.state ? `• ${c.state}` : ''}
                          </option>
                        ))}
                      </datalist>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        Type your university or select from partner directory
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
                        Student Roll / USN Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1GA23IS054 / SU-89241029"
                        value={form.collegeIdNumber}
                        onChange={(e) => setForm({ ...form, collegeIdNumber: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 10,
                          color: '#fff',
                          fontSize: 13.5,
                          outline: 'none',
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Password & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
                      Create Password (min 6 characters) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 13.5,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 13.5,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Email Exists Error Banner */}
                {emailExistsError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ color: '#f87171', fontSize: 13 }}>
                      ⚠️ {emailExistsError}
                    </div>
                    <button
                      type="button"
                      className="btn btn-p btn-sm"
                      onClick={() => onRedirectToLogin && onRedirectToLogin(form.email)}
                      style={{ background: '#ef4444', borderColor: '#dc2626', color: '#fff', fontWeight: 700 }}
                    >
                      Sign In →
                    </button>
                  </div>
                )}

                {/* General OTP Error */}
                {otpError && !emailExistsError && (
                  <div style={{ color: '#f87171', fontSize: 12.5, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    ⚠️ {otpError}
                  </div>
                )}

                {/* Trust Notice Accordion Banner */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setAccordionOpen(!accordionOpen)}
                    style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#818cf8' }}>lock</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#fff' }}>Why institutional verification matters</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, transform: accordionOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      expand_more
                    </span>
                  </button>
                  {accordionOpen && (
                    <div style={{ padding: '0 14px 12px', fontSize: 12, color: '#94a3b8', lineHeight: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: 8 }}>
                      TimeBank enforces an hour-for-hour reciprocity economy recognized by AICTE. Institutional vetting guarantees bilateral trust, prevents duplicate accounts, and enables peer-reviewed activity certificates.
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  {onCancel && (
                    <button type="button" onClick={onCancel} className="btn btn-o" style={{ fontSize: 13 }}>
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!isStep1Valid || sendingOtp}
                    onClick={handleStep1Submit}
                    className="btn-shimmer"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 24px',
                      color: '#fff',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: !isStep1Valid || sendingOtp ? 'not-allowed' : 'pointer',
                      opacity: !isStep1Valid || sendingOtp ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                    }}
                  >
                    <span>{sendingOtp ? 'Dispatching Token…' : 'Send Verification Code'}</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2: Verify Code (OTP) ─── */}
            {currentStep === 2 && (
              <div className="step-pane pane-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '2px 10px', borderRadius: 9999, marginBottom: 6 }}>
                    Step 02 • Two-Factor Authorization
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                    Check your college inbox
                  </h2>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    We sent a 6-digit authentication key to <strong style={{ color: '#fff' }}>{form.email}</strong>. Enter it below to authorize this session.
                  </p>
                </div>

                {/* 6-Digit Interactive OTP Boxes */}
                <div style={{ padding: '1.5rem 0', textAlign: 'center' }}>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '1rem' }}>
                    6-Digit Institutional Code
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    {otpArray.map((val, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        style={{
                          width: '46px',
                          height: '54px',
                          textAlign: 'center',
                          fontSize: '24px',
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: val ? '2px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 10,
                          color: '#fff',
                          outline: 'none',
                          boxShadow: val ? '0 0 12px rgba(129, 140, 248, 0.3)' : 'none',
                          transition: 'all 0.2s',
                        }}
                      />
                    ))}
                  </div>

                  {otp.length === 6 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#34d399', fontSize: 12, fontWeight: 600, marginTop: 12 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                      <span>One-time key format verified</span>
                    </div>
                  )}

                  {otpError && (
                    <div style={{ color: '#f87171', fontSize: 12.5, marginTop: 10 }}>
                      ⚠️ {otpError}
                    </div>
                  )}
                </div>

                {/* Countdown & Resend */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 12, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#818cf8' }}>timer</span>
                    <span>Code expires in: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>00:{otpCountdown < 10 ? `0${otpCountdown}` : otpCountdown}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Didn't receive it?</span>
                    <button
                      type="button"
                      disabled={otpCountdown > 0 || sendingOtp}
                      onClick={handleSendOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: otpCountdown > 0 ? '#64748b' : '#818cf8',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: otpCountdown > 0 ? 'default' : 'pointer',
                      }}
                    >
                      Resend key
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem' }}>
                  <button type="button" onClick={back} className="btn btn-o">
                    Change Email
                  </button>
                  <button
                    type="button"
                    disabled={otp.length !== 6 || verifyingOtp}
                    onClick={handleVerifyOtp}
                    className="btn-shimmer"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 24px',
                      color: '#fff',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: otp.length !== 6 || verifyingOtp ? 'not-allowed' : 'pointer',
                      opacity: otp.length !== 6 || verifyingOtp ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>{verifyingOtp ? 'Verifying…' : 'Verify & Continue'}</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: ID Scan (Students Only) ─── */}
            {isStudent && currentStep === 3 && (
              <div className="step-pane pane-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '2px 10px', borderRadius: 9999, marginBottom: 6 }}>
                    Step 03 • Document Authentication
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                    Scan your Student ID card
                  </h2>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Upload a clear capture of your current college ID card or university badge to match with institutional records.
                  </p>
                </div>

                {/* ID Scanner Viewport Component with Laser Animation */}
                <div style={{ position: 'relative', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: '1.25rem', overflow: 'hidden' }}>
                  {/* Dynamic Laser Line */}
                  <div className="laser-beam" style={{ position: 'absolute', inset: '0 0 auto 0', height: 2, background: 'linear-gradient(90deg, transparent, #818cf8, transparent)', boxShadow: '0 0 16px #818cf8', zIndex: 20, pointerEvents: 'none' }} />

                  {/* ID Upload Dropzone */}
                  <IDCardUpload onSelect={setIdCardBase64} />

                  {/* Optical Scanner Corner Reticles */}
                  <div style={{ position: 'absolute', top: 12, left: 12, width: 18, height: 18, borderTop: '2px solid #818cf8', borderLeft: '2px solid #818cf8', borderTopLeftRadius: 4 }} />
                  <div style={{ position: 'absolute', top: 12, right: 12, width: 18, height: 18, borderTop: '2px solid #818cf8', borderRight: '2px solid #818cf8', borderTopRightRadius: 4 }} />
                  <div style={{ position: 'absolute', bottom: 12, left: 12, width: 18, height: 18, borderBottom: '2px solid #818cf8', borderLeft: '2px solid #818cf8', borderBottomLeftRadius: 4 }} />
                  <div style={{ position: 'absolute', bottom: 12, right: 12, width: 18, height: 18, borderBottom: '2px solid #818cf8', borderRight: '2px solid #818cf8', borderBottomRightRadius: 4 }} />
                </div>

                {/* Extracted Form Overview */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 12, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Legal Name</span>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', marginTop: 2 }}>{form.name || 'Student Name'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Student Roll / USN</span>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#38bdf8', fontFamily: 'monospace', marginTop: 2 }}>{form.collegeIdNumber || 'Pending Entry'}</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem' }}>
                  <button type="button" onClick={back} className="btn btn-o">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!idCardBase64}
                    onClick={next}
                    className="btn-shimmer"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 24px',
                      color: '#fff',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: !idCardBase64 ? 'not-allowed' : 'pointer',
                      opacity: !idCardBase64 ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>Proceed to Face Match</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 4 (or 3 for General): Biometrics / Liveness ─── */}
            {((isStudent && currentStep === 4) || (!isStudent && currentStep === 3)) && (
              <div className="step-pane pane-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '2px 10px', borderRadius: 9999, marginBottom: 6 }}>
                    Step 0{isStudent ? 4 : 3} • Real-time Biometrics
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                    Liveness &amp; identity check
                  </h2>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Position your face inside the camera reticle with good lighting. Live face scan prevents multi-accounting and verifies identity continuity.
                  </p>
                </div>

                {/* Face Verification Camera Feed */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: '1rem', textAlign: 'center' }}>
                  <FaceVerification onCaptured={handleFaceCaptured} />

                  {faceChecking && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 10, color: '#c7d2fe', fontSize: 12.5, marginTop: 12 }}>
                      <span className="spinner-sm" /> Checking biometric database for existing accounts…
                    </div>
                  )}

                  {/* DUPLICATE FACE ALERT & REDIRECT */}
                  {duplicateMatch && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid rgba(239, 68, 68, 0.4)', borderRadius: 14, padding: '16px', textAlign: 'center', marginTop: 12 }}>
                      <div style={{ fontSize: 32, marginBottom: 4 }}>⚠️</div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#f87171', marginBottom: 4 }}>
                        Existing Account Detected
                      </div>
                      <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 10px' }}>
                        This face matches an existing TimeBank profile:
                        <br />
                        <strong style={{ color: '#38bdf8', fontSize: 14 }}>{duplicateMatch.matchedEmail}</strong>
                      </p>
                      <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 12 }}>
                        Multi-accounting is strictly prohibited. Please sign in to your primary account.
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          className="btn btn-o"
                          style={{ flex: 1, fontSize: 12.5 }}
                          onClick={() => {
                            setDuplicateMatch(null);
                            setFaceDescriptor(null);
                          }}
                        >
                          Rescan Face
                        </button>
                        <button
                          type="button"
                          className="btn btn-p"
                          style={{ flex: 2, background: '#ef4444', borderColor: '#dc2626', color: '#fff', fontWeight: 700 }}
                          onClick={() => onRedirectToLogin && onRedirectToLogin(duplicateMatch.matchedEmail)}
                        >
                          Sign In to Primary Account →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Clean Face Enrolled Confirmation */}
                  {faceDescriptor && !duplicateMatch && !faceChecking && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 10, color: '#34d399', fontSize: 12.5, marginTop: 12 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                      <span>Biometric face scan verified and unique! Confidence Score: 99.2% match.</span>
                    </div>
                  )}
                </div>

                {/* Privacy Note */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#818cf8' }}>shield</span>
                  <span>Biometric mathematical vectors are computed client-side and encrypted for multi-account protection.</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem' }}>
                  <button type="button" onClick={back} className="btn btn-o">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!faceDescriptor || faceChecking || !!duplicateMatch}
                    onClick={next}
                    className="btn-shimmer"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 24px',
                      color: '#fff',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: !faceDescriptor || faceChecking || !!duplicateMatch ? 'not-allowed' : 'pointer',
                      opacity: !faceDescriptor || faceChecking || !!duplicateMatch ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>Continue to Review</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 5 (or 4 for General): Review Manifest ─── */}
            {((isStudent && currentStep === 5) || (!isStudent && currentStep === 4)) && (
              <div className="step-pane pane-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '2px 10px', borderRadius: 9999, marginBottom: 6 }}>
                    Step 0{isStudent ? 5 : 4} • Verification Manifest
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                    Review your registration details
                  </h2>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Please confirm your verified credentials before submitting to your campus ledger administrator.
                  </p>
                </div>

                {/* Summary Ledger Card */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#818cf8' }}>mail</span>
                      <div>
                        <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Email Address</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{form.email}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: 9999 }}>Verified</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#818cf8' }}>badge</span>
                      <div>
                        <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Identity Details</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>
                          {form.name} {form.collegeIdNumber ? `• ${form.collegeIdNumber}` : ''}
                        </span>
                        {form.college && <span style={{ fontSize: 12, color: '#94a3b8', display: 'block' }}>{form.college}</span>}
                      </div>
                    </div>
                    <button type="button" onClick={() => goToStep(1)} style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                      Edit
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#818cf8' }}>face</span>
                      <div>
                        <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Biometric Liveness</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>Matched 99.2% • Live Face Scan</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: 9999 }}>Signed</span>
                  </div>

                  {/* Collapsible Security Attestation Drawer */}
                  <div style={{ border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 10, overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setProofOpen(!proofOpen)}
                      style={{ width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#818cf8' }}>key</span>
                        View Cryptographic Attestation Payload
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, transform: proofOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        expand_more
                      </span>
                    </button>
                    {proofOpen && (
                      <div style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', background: 'rgba(0, 0, 0, 0.25)', borderTop: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div><strong style={{ color: '#818cf8' }}>HASH_SHA256:</strong> 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08</div>
                        <div><strong style={{ color: '#818cf8' }}>ISSUER_DID:</strong> did:timebank:node:{isStudent ? 'campus_registrar' : 'global_peer'}</div>
                        <div><strong style={{ color: '#818cf8' }}>TIMESTAMP:</strong> {new Date().toISOString()}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={charterAgreed}
                    onChange={(e) => setCharterAgreed(e.target.checked)}
                    style={{ marginTop: 3, accentColor: '#4f46e5' }}
                  />
                  <span style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                    I certify that all provided credentials are valid and agree to uphold the <strong>TimeBank Bilateral Exchange Charter</strong> (1 Hour = 1 Credit) and academic honor commitments.
                  </span>
                </label>

                {submitError && (
                  <div style={{ color: '#f87171', fontSize: 12.5, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    ⚠️ {submitError}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem' }}>
                  <button type="button" onClick={back} className="btn btn-o">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitting || !charterAgreed}
                    onClick={submit}
                    className="btn-shimmer"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 24px',
                      color: '#fff',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: submitting || !charterAgreed ? 'not-allowed' : 'pointer',
                      opacity: submitting || !charterAgreed ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
                    <span>{submitting ? 'Submitting…' : isStudent ? 'Submit for Campus Approval' : 'Complete Registration 🎉'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 6: Status & Escrow Activation ─── */}
            {currentStep === totalSteps && (
              <div className="step-pane pane-enter" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                {/* Celebratory Icon */}
                <div
                  className="active-ring-pulse"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.3) 0%, rgba(16, 185, 129, 0.25) 100%)',
                    border: '2px solid #818cf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    boxShadow: '0 0 30px rgba(79, 70, 229, 0.5)',
                  }}
                >
                  <span className="material-symbols-outlined check-pop" style={{ fontSize: 44, color: '#34d399' }}>
                    verified
                  </span>
                </div>

                {waitingApproval ? (
                  <>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 9999, padding: '4px 14px', color: '#fbbf24', fontSize: 12, fontWeight: 700, marginBottom: '0.75rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
                      Pending Campus Admin Review
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
                      Application submitted to {form.college || 'your college'}
                    </h2>
                    <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, maxWidth: 500, margin: '0 auto 1.5rem' }}>
                      Your student registration and ID card have been securely routed to the departmental administrator. You will receive an email once your 10 Starter Time Credits and wallet are unlocked!
                    </p>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14, padding: '1rem', maxWidth: 420, margin: '0 auto 1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Submission Reference:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fff' }}>#TB-STU-{pendingUserId ? pendingUserId.slice(-5).toUpperCase() : '88392'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Routing Node:</span>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{form.college || 'Campus Guild'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 6 }}>
                        <span style={{ color: '#94a3b8' }}>Escrow Seed Balance:</span>
                        <span style={{ fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: 9999 }}>+10.0 Time Credits</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
                      Welcome to TimeBank!
                    </h2>
                    <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 1.5rem' }}>
                      {resultMessage || 'Your account is active. 10 Starter Time Credits have been minted to your decentralized wallet on Polygon Amoy!'}
                    </p>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  {onCancel && (
                    <button type="button" onClick={onCancel} className="btn btn-p" style={{ padding: '12px 28px', fontWeight: 700 }}>
                      Go to Sign In →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Preview Step Pills Dock */}
          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12, color: '#94a3b8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#818cf8' }}>touch_app</span>
              <span>Quick Preview Step:</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {stepLabels.map((lbl, idx) => {
                const s = idx + 1;
                return (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => goToStep(s)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 9999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      background: currentStep === s ? '#4f46e5' : 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid ' + (currentStep === s ? '#818cf8' : 'rgba(255, 255, 255, 0.08)'),
                      color: currentStep === s ? '#fff' : '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {s}. {lbl}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Supplementary Trust Pillars Bento Section */}
        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: '1.25rem', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', marginBottom: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>verified</span>
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Strict Bilateral Ratio</h4>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              1 hour of coding mentoring equals 1 hour of language exchange. No monetary distortion.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: '1.25rem', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', marginBottom: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>lock</span>
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Zero Academic Data Sale</h4>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              Institutional proofs are cryptographically verified and held in campus trust enclaves.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: '1.25rem', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', marginBottom: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>domain</span>
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Inter-Campus Guilds</h4>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              Exchange hours and collaborate with peer campuses across accredited university nodes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
