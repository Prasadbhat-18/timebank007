import { useState, useCallback } from 'react';
import StepProgressBar from './wizard/StepProgressBar.jsx';
import FaceVerification from '../FaceVerification.jsx';
import IDCardUpload from './IDCardUpload.jsx';
import * as api from '../api.js';

const STUDENT_STEPS = ['Details', 'Verify Email', 'ID Card', 'Face Scan', 'Done'];
const GENERAL_STEPS = ['Details', 'Verify Email', 'Face Scan', 'Done'];

export default function RegistrationWizard({ role = 'student', onComplete, onCancel }) {
  const steps = role === 'student' ? STUDENT_STEPS : GENERAL_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [idCardBase64, setIdCardBase64] = useState(null); // base64 data URI
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  // ── OTP ─────────────────────────────────────────────────────────────────
  const sendOtp = useCallback(async () => {
    setOtpError('');
    try {
      await api.sendOtp(form.email, 'register');
      setOtpSent(true);
      // Countdown
      setOtpCountdown(60);
      const tid = setInterval(() => setOtpCountdown(c => {
        if (c <= 1) { clearInterval(tid); return 0; }
        return c - 1;
      }), 1000);
      return true;
    } catch (e) {
      setOtpError(e.message || 'Failed to dispatch code. Please try again.');
      return false;
    }
  }, [form.email]);

  const verifyOtp = useCallback(async () => {
    setOtpError('');
    try {
      let deviceFingerprint = null;
      try {
        const FP = (await import('@fingerprintjs/fingerprintjs')).default;
        const fp = await FP.load();
        deviceFingerprint = (await fp.get()).visitorId;
      } catch {}
      const res = await api.verifyOtp(form.email, otp, deviceFingerprint);
      if (res?.verified || res?.success) next();
    } catch (e) {
      setOtpError(e.message || 'Invalid or expired code. Please try again.');
    }
  }, [form.email, otp]);

  // ── Final Submit ──────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      let deviceFingerprint = null;
      try {
        const FP = (await import('@fingerprintjs/fingerprintjs')).default;
        const fp = await FP.load();
        deviceFingerprint = (await fp.get()).visitorId;
      } catch {}

      const payload = {
        ...form,
        otp,
        faceDescriptor,
        faceEmbedding: faceDescriptor,
        deviceFingerprint,
        ...(role === 'student' && { idCardImage: idCardBase64 }),
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
      } else if (data?.token && data?.user && onComplete) {
        setTimeout(() => onComplete(data.token, data.user), 1500);
        next();
      } else {
        next();
      }
    } catch (e) {
      setResultMessage(e.message || 'An unexpected error occurred during submission.');
      next();
    } finally {
      setSubmitting(false);
    }
  }, [form, otp, faceDescriptor, idCardBase64, role, onComplete]);

  const stepKey = steps[stepIndex];

  // ── Shared input style ───────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '10px 14px',
    color: '#f1f5f9', fontSize: 13.5,
    outline: 'none',
  };

  return (
    <div style={{ maxWidth: 440, width: '100%', margin: '0 auto', padding: '0.5rem 0' }}>
      <StepProgressBar steps={steps} currentStep={stepIndex} />

      <div key={stepIndex} style={{ animation: 'fadeSlide 0.25s ease-out' }}>

        {/* ─── DETAILS ─── */}
        {stepKey === 'Details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 2 }}>
              {role === 'student' ? 'Student Registration' : 'Create Account'}
            </div>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
              {role === 'student'
                ? 'Your account will be reviewed and approved by your college admin.'
                : 'General accounts get immediate access after email verification.'}
            </p>
            <input
              placeholder="Full legal name"
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder={role === 'student' ? 'College email (e.g. name@college.edu)' : 'Email address'}
              style={inputStyle}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              placeholder="Phone number (optional)"
              style={inputStyle}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              placeholder="Password"
              type="password"
              style={inputStyle}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            {otpError && (
              <div style={{ color: '#f87171', fontSize: 12, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
                {otpError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {onCancel && (
                <button type="button" onClick={onCancel} className="btn btn-o" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
              )}
              <button
                disabled={!form.name || !form.email || !form.password}
                onClick={async () => { const ok = await sendOtp(); if (ok) next(); }}
                className="btn btn-p"
                style={{ flex: 2, justifyContent: 'center' }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ─── VERIFY EMAIL ─── */}
        {stepKey === 'Verify Email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 4 }}>📬</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>Check Your Inbox</div>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              We sent a 6-digit code to{' '}
              <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{form.email}</span>
              <br />Check your spam folder if you don't see it.
            </p>
            <input
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              style={{
                ...inputStyle,
                textAlign: 'center', letterSpacing: '0.35em',
                fontSize: 22, fontWeight: 800, height: 50,
              }}
              onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && verifyOtp()}
            />
            {otpError && (
              <div style={{ color: '#f87171', fontSize: 12 }}>{otpError}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} className="btn btn-o" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
              <button
                onClick={verifyOtp}
                disabled={otp.length !== 6}
                className="btn btn-p"
                style={{ flex: 2, justifyContent: 'center' }}
              >
                Verify Code →
              </button>
            </div>
            <button
              onClick={sendOtp}
              disabled={otpCountdown > 0}
              type="button"
              style={{
                background: 'none', border: 'none',
                color: otpCountdown > 0 ? '#475569' : '#10b981',
                cursor: otpCountdown > 0 ? 'default' : 'pointer',
                fontSize: 12, marginTop: 4,
              }}
            >
              {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend Code'}
            </button>
          </div>
        )}

        {/* ─── ID CARD (students only) ─── */}
        {stepKey === 'ID Card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 4 }}>
                College ID Verification
              </div>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Upload a photo of your college ID card. It will be sent to your college admin for verification.
              </p>
            </div>
            <IDCardUpload onSelect={setIdCardBase64} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} className="btn btn-o" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
              <button
                disabled={!idCardBase64}
                onClick={next}
                className="btn btn-p"
                style={{ flex: 2, justifyContent: 'center' }}
              >
                {idCardBase64 ? 'Continue →' : 'Upload to Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ─── FACE SCAN ─── */}
        {stepKey === 'Face Scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 4 }}>
                Biometric Enrollment
              </div>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Position your face in good lighting. Detection is automatic.
              </p>
            </div>
            <FaceVerification onCaptured={setFaceDescriptor} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} className="btn btn-o" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
              <button
                disabled={!faceDescriptor || submitting}
                onClick={submit}
                className="btn btn-p"
                style={{ flex: 2, justifyContent: 'center' }}
              >
                {submitting ? 'Submitting…' : 'Complete Registration 🎉'}
              </button>
            </div>
          </div>
        )}

        {/* ─── DONE ─── */}
        {stepKey === 'Done' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
            {waitingApproval ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#f1f5f9', marginBottom: 8 }}>
                  Application Submitted!
                </div>
                <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
                  Your college ID card has been sent to your college administrator for review. You'll receive a notification once your account is approved.
                </p>
                <div style={{
                  background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                  borderRadius: 12, padding: '12px 16px',
                  fontSize: 12.5, color: '#fbbf24', lineHeight: 1.5,
                }}>
                  ⚠️ You will not be able to log in until your college admin approves your account.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#f1f5f9', marginBottom: 8 }}>
                  Welcome to TimeBank!
                </div>
                <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
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
