import { useState, useCallback, useEffect } from 'react';
import StepProgressBar from './wizard/StepProgressBar.jsx';
import FaceVerification from '../FaceVerification.jsx';
import IDCardUpload from './IDCardUpload.jsx';
import * as api from '../api.js';

const STUDENT_STEPS = ['Details', 'Verify Email', 'ID Card', 'Face Scan', 'Done'];
const GENERAL_STEPS = ['Details', 'Verify Email', 'Face Scan', 'Done'];

export default function RegistrationWizard({ role = 'student', onComplete, onCancel, onRedirectToLogin }) {
  const steps = role === 'student' ? STUDENT_STEPS : GENERAL_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  
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

  // OTP Verification state
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailExistsError, setEmailExistsError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);

  // ID Card & Biometric Face state
  const [idCardBase64, setIdCardBase64] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [faceChecking, setFaceChecking] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState(null); // { matchedEmail, matchedName, message }

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  // Fetch recognized colleges if student registration
  useEffect(() => {
    if (role === 'student') {
      setLoadingColleges(true);
      api.fetchColleges()
        .then((data) => {
          if (Array.isArray(data)) setColleges(data);
        })
        .catch((err) => console.error('Error loading colleges:', err))
        .finally(() => setLoadingColleges(false));
    }
  }, [role]);

  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => {
    setSubmitError('');
    setOtpError('');
    setEmailExistsError('');
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  // ── Details Validation ──────────────────────────────────────────────────
  const isEmailValid = Boolean(form.email && form.email.includes('@') && form.email.includes('.'));
  const isNameValid = Boolean(form.name && form.name.trim().length >= 2);
  const isPasswordValid = Boolean(form.password && form.password.length >= 6);
  const isCollegeValid = role !== 'student' || Boolean(form.collegeId || form.college);
  const isDetailsValid = isNameValid && isEmailValid && isPasswordValid && isCollegeValid;

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

  const handleDetailsContinue = async () => {
    if (!isDetailsValid) return;
    const ok = await handleSendOtp();
    if (ok) {
      next();
    }
  };

  // ── Verify Email Code ────────────────────────────────────────────────────
  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter the 6-digit code received.');
      return;
    }
    setOtpError('');
    setVerifyingOtp(true);
    try {
      let deviceFingerprint = null;
      try {
        const FP = (await import('@fingerprintjs/fingerprintjs')).default;
        const fp = await FP.load();
        deviceFingerprint = (await fp.get()).visitorId;
      } catch {}

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

  // ── Real-time Face Scan & Duplicate Detection ───────────────────────────
  const handleFaceCaptured = async (desc) => {
    setSubmitError('');
    setDuplicateMatch(null);
    setFaceChecking(true);

    try {
      const checkRes = await api.checkFaceDuplicate(desc, form.email);
      if (checkRes.duplicate) {
        // Biometric match found on existing user account!
        setDuplicateMatch({
          matchedEmail: checkRes.matchedEmail,
          matchedName: checkRes.matchedName,
          message: checkRes.message,
        });
        // Disallow registration with duplicate face
        setFaceDescriptor(null);
      } else {
        // Valid & unique face
        setFaceDescriptor(desc);
        setDuplicateMatch(null);
      }
    } catch (err) {
      console.error('Biometric face check error:', err);
      // Fallback: still set descriptor so registration isn't permanently blocked if network hiccup
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
      setSubmitError('Email verification code is missing. Please verify your email.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      let deviceFingerprint = null;
      try {
        const FP = (await import('@fingerprintjs/fingerprintjs')).default;
        const fp = await FP.load();
        deviceFingerprint = (await fp.get()).visitorId;
      } catch {}

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        otp: otp.trim(),
        faceDescriptor,
        faceEmbedding: faceDescriptor,
        deviceFingerprint,
        ...(role === 'student' && {
          collegeId: form.collegeId || undefined,
          college: form.college || undefined,
          collegeIdNumber: form.collegeIdNumber || undefined,
          idCardImage: idCardBase64,
        }),
      };

      let data;
      if (role === 'student') {
        data = await api.registerStudent(payload);
      } else {
        data = await api.registerGeneral(payload);
      }

      setResultMessage(data?.message || 'Account created successfully! Welcome to TimeBank 🎉');

      if (data?.waitingApproval) {
        setWaitingApproval(true);
        setPendingUserId(data.userId);
        next();
      } else if (data?.token && data?.user) {
        if (onComplete) {
          setTimeout(() => onComplete(data.token, data.user), 1500);
        }
        next();
      } else {
        next();
      }
    } catch (e) {
      // Check if duplicate face detected by server fraud check
      if (e.code === 'DUPLICATE_FACE' || e.duplicateFace || e.message?.includes('face matches an existing account')) {
        const matched = e.matchedEmail || e.data?.matchedEmail;
        setDuplicateMatch({
          matchedEmail: matched || 'your original registered email',
          matchedName: e.matchedName || e.data?.matchedName || '',
          message: e.message || 'Face scan matches an existing account.',
        });
        setFaceDescriptor(null);
        // Do NOT navigate to Done step!
      } else {
        setSubmitError(e.message || 'An unexpected error occurred during registration. Please try again.');
        // Do NOT navigate to Done step on failure!
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, otp, faceDescriptor, idCardBase64, role, onComplete]);

  const stepKey = steps[stepIndex];

  // ── Shared input style ───────────────────────────────────────────────────
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: '11px 14px',
    color: '#f1f5f9',
    fontSize: 13.5,
    outline: 'none',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  };

  return (
    <div style={{ maxWidth: 460, width: '100%', margin: '0 auto', padding: '0.5rem 0' }}>
      <StepProgressBar steps={steps} currentStep={stepIndex} />

      <div key={stepIndex} style={{ animation: 'fadeSlide 0.25s ease-out' }}>

        {/* ─── STEP 0: DETAILS ─── */}
        {stepKey === 'Details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9', marginBottom: 3 }}>
                {role === 'student' ? 'Student Registration' : 'Create General Account'}
              </div>
              <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0, lineHeight: 1.45 }}>
                {role === 'student'
                  ? 'Sign up with your college details. Requires email verification and biometric scan.'
                  : 'Fast onboarding with email verification and live biometric face scan.'}
              </p>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 4, display: 'block' }}>
                Full Legal Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                placeholder="Enter your full legal name"
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 4, display: 'block' }}>
                {role === 'student' ? 'College Email Address' : 'Email Address'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                placeholder={role === 'student' ? 'Enter your college email' : 'Enter your email address'}
                style={inputStyle}
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setEmailExistsError('');
                  setOtpError('');
                }}
              />
            </div>

            {role === 'student' && (
              <>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 4, display: 'block' }}>
                    Select College / Institution <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    style={{
                      ...inputStyle,
                      background: '#121826',
                      cursor: 'pointer',
                    }}
                    value={form.collegeId}
                    onChange={(e) => {
                      const sel = colleges.find((c) => c._id === e.target.value);
                      setForm({
                        ...form,
                        collegeId: e.target.value,
                        college: sel ? sel.name : '',
                      });
                    }}
                  >
                    <option value="">{loadingColleges ? 'Loading institutions…' : '-- Choose your institution --'}</option>
                    {colleges.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code || c.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 4, display: 'block' }}>
                    College ID / USN Number
                  </label>
                  <input
                    placeholder="Enter College ID / USN"
                    style={inputStyle}
                    value={form.collegeIdNumber}
                    onChange={(e) => setForm({ ...form, collegeIdNumber: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 4, display: 'block' }}>
                Phone Number (Optional)
              </label>
              <input
                placeholder="Enter phone number (optional)"
                style={inputStyle}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 4, display: 'block' }}>
                Create Password (min 6 characters) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                placeholder="Enter password (min 6 characters)"
                type="password"
                style={inputStyle}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && isDetailsValid && !sendingOtp && handleDetailsContinue()}
              />
            </div>

            {/* Email Already Exists Notification Banner */}
            {emailExistsError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1.5px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 12,
                padding: '12px 14px',
                textAlign: 'center',
                animation: 'fadeSlide 0.2s ease',
              }}>
                <div style={{ color: '#f87171', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  ⚠️ {emailExistsError}
                </div>
                <button
                  type="button"
                  className="btn btn-p btn-sm"
                  onClick={() => {
                    if (onRedirectToLogin) onRedirectToLogin(form.email);
                  }}
                  style={{ width: '100%', justifyContent: 'center', height: 38, fontWeight: 700 }}
                >
                  Sign In with This Account →
                </button>
              </div>
            )}

            {/* General OTP / Validation Error */}
            {otpError && !emailExistsError && (
              <div style={{
                color: '#f87171',
                fontSize: 12.5,
                padding: '8px 12px',
                background: 'rgba(239, 68, 68, 0.08)',
                borderRadius: 8,
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}>
                {otpError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {onCancel && (
                <button type="button" onClick={onCancel} className="btn btn-o" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
              )}
              <button
                disabled={!isDetailsValid || sendingOtp}
                onClick={handleDetailsContinue}
                className="btn btn-p"
                style={{
                  flex: 2,
                  justifyContent: 'center',
                  fontWeight: 700,
                  opacity: !isDetailsValid || sendingOtp ? 0.6 : 1,
                  cursor: !isDetailsValid || sendingOtp ? 'not-allowed' : 'pointer',
                }}
              >
                {sendingOtp ? 'Sending Code ⚡...' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 1: VERIFY EMAIL ─── */}
        {stepKey === 'Verify Email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 42, marginBottom: 2 }}>📬</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9' }}>Verify Your Email</div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              We dispatched a 6-digit verification code to<br />
              <b style={{ color: '#fff', fontSize: 14 }}>{form.email}</b>.<br />
              Please enter the code below to verify your email.
            </p>

            <input
              placeholder="• • • • • •"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                setOtpError('');
              }}
              maxLength={6}
              style={{
                ...inputStyle,
                textAlign: 'center',
                letterSpacing: '0.4em',
                fontSize: 24,
                fontWeight: 800,
                height: 52,
                color: '#10b981',
              }}
              onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && !verifyingOtp && handleVerifyOtp()}
              autoFocus
            />

            {otpError && (
              <div style={{ color: '#f87171', fontSize: 12.5 }}>{otpError}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} className="btn btn-o" style={{ flex: 1, justifyContent: 'center' }}>
                Back
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6 || verifyingOtp}
                className="btn btn-p"
                style={{ flex: 2, justifyContent: 'center', fontWeight: 700 }}
              >
                {verifyingOtp ? 'Verifying…' : 'Verify Code →'}
              </button>
            </div>

            <button
              onClick={handleSendOtp}
              disabled={otpCountdown > 0 || sendingOtp}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: otpCountdown > 0 ? '#64748b' : '#10b981',
                cursor: otpCountdown > 0 || sendingOtp ? 'default' : 'pointer',
                fontSize: 12.5,
                marginTop: 4,
              }}
            >
              {sendingOtp
                ? 'Dispatching code…'
                : otpCountdown > 0
                ? `Didn't get code? Resend in ${otpCountdown}s`
                : 'Resend Verification Code ⚡'}
            </button>
          </div>
        )}

        {/* ─── STEP 2: ID CARD (Students Only) ─── */}
        {stepKey === 'ID Card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9', marginBottom: 4 }}>
                College ID Verification
              </div>
              <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Upload a clear photo of your college ID card. Your college administrator will verify this during review.
              </p>
            </div>

            <IDCardUpload onSelect={setIdCardBase64} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} className="btn btn-o" style={{ flex: 1, justifyContent: 'center' }}>
                Back
              </button>
              <button
                disabled={!idCardBase64}
                onClick={next}
                className="btn btn-p"
                style={{ flex: 2, justifyContent: 'center', fontWeight: 700 }}
              >
                {idCardBase64 ? 'Continue →' : 'Upload ID to Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP: FACE SCAN ─── */}
        {stepKey === 'Face Scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9', marginBottom: 4 }}>
                Biometric Enrollment & Identity Verification
              </div>
              <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Position your face inside the frame with good lighting. Live face scan detects multi-accounting and protects your identity.
              </p>
            </div>

            <FaceVerification onCaptured={handleFaceCaptured} />

            {/* Checking status indicator */}
            {faceChecking && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 10,
                color: '#10b981',
                fontSize: 12.5,
              }}>
                <span className="spinner-sm" /> Checking biometric database for existing accounts...
              </div>
            )}

            {/* DUPLICATE FACE ALERT & REDIRECT */}
            {duplicateMatch && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 14,
                padding: '16px',
                textAlign: 'center',
                animation: 'fadeSlide 0.25s ease-out',
              }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>⚠️</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#f87171', marginBottom: 6 }}>
                  Existing Account Detected
                </div>
                <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 12px' }}>
                  This face is already enrolled with an existing TimeBank profile:
                  <br />
                  <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: 14 }}>
                    {duplicateMatch.matchedEmail}
                  </span>
                </p>
                <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 14, lineHeight: 1.4 }}>
                  Each individual is permitted only one TimeBank profile. If you already have an account, please sign in.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-o"
                    style={{ flex: 1, justifyContent: 'center', fontSize: 12.5 }}
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
                    style={{
                      flex: 2,
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      background: '#ef4444',
                      borderColor: '#dc2626',
                      color: '#fff',
                    }}
                    onClick={() => {
                      if (onRedirectToLogin) {
                        onRedirectToLogin(duplicateMatch.matchedEmail);
                      }
                    }}
                  >
                    Sign In to Primary Account →
                  </button>
                </div>
              </div>
            )}

            {/* Clean face enrolled success message */}
            {faceDescriptor && !duplicateMatch && !faceChecking && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 10,
                color: '#10b981',
                fontSize: 12.5,
              }}>
                <span>✅</span>
                <span>Biometric face scan verified and unique! Ready to complete registration.</span>
              </div>
            )}

            {/* Submission Error Banner */}
            {submitError && (
              <div style={{
                color: '#f87171',
                fontSize: 12.5,
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.08)',
                borderRadius: 10,
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}>
                ⚠️ {submitError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={back} className="btn btn-o" style={{ flex: 1, justifyContent: 'center' }}>
                Back
              </button>
              <button
                disabled={!faceDescriptor || submitting || faceChecking || !!duplicateMatch}
                onClick={submit}
                className="btn btn-p"
                style={{
                  flex: 2,
                  justifyContent: 'center',
                  fontWeight: 700,
                  opacity: !faceDescriptor || submitting || faceChecking || !!duplicateMatch ? 0.6 : 1,
                  cursor: !faceDescriptor || submitting || faceChecking || !!duplicateMatch ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Creating Account…' : 'Complete Registration 🎉'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP: DONE ─── */}
        {stepKey === 'Done' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
            {waitingApproval ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#f1f5f9', marginBottom: 8 }}>
                  Application Submitted!
                </div>
                <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
                  Your student application and college ID card have been securely submitted to your college administrator for review.
                </p>
                <div style={{
                  background: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 12.5,
                  color: '#fbbf24',
                  lineHeight: 1.5,
                }}>
                  ⚠️ You will receive an email and notification once your college admin approves your account.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#f1f5f9', marginBottom: 8 }}>
                  Welcome to TimeBank!
                </div>
                <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.5 }}>
                  {resultMessage}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
