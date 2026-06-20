'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, Loader2, ShieldCheck, Clock, XCircle, AlertCircle } from 'lucide-react';

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

export default function VerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [verification, setVerification] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  useEffect(() => {
    if (!session) return;
    fetchStatus();
  }, [session]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/verification/upload');
      if (res.ok) {
        const data = await res.json();
        setVerification(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
  };

  if (status === 'loading' || loadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  if (session.user.role !== 'provider') {
    return (
      <div className="min-h-screen bg-[#080f0a] flex items-center justify-center px-4">
        <div className="text-center p-10 rounded-3xl max-w-md w-full" style={glassCard}>
          <ShieldCheck size={36} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <h2 className="text-xl font-bold text-white mb-2">Providers Only</h2>
          <p className="text-white/40 text-sm">Only service providers can submit verification documents.</p>
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File is too large (max 10MB)');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select your ID document');

    setSubmitting(true);
    try {
      // Reuse your existing upload endpoint
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();

      const res = await fetch('/api/verification/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docUrl: uploadData.url }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit verification');
        return;
      }
      toast.success('Document submitted for review!');
      setFile(null);
      setPreview(null);
      fetchStatus();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBanner = () => {
    const s = verification?.verificationStatus;

    if (s === 'verified') {
      return (
        <div className="flex items-center gap-3 p-5 rounded-2xl mb-6"
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <ShieldCheck size={22} className="text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-400">You're verified!</p>
            <p className="text-xs text-white/40 mt-0.5">Your profile now shows a verification badge to clients.</p>
          </div>
        </div>
      );
    }
    if (s === 'pending') {
      return (
        <div className="flex items-center gap-3 p-5 rounded-2xl mb-6"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <Clock size={22} className="text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">Verification pending</p>
            <p className="text-xs text-white/40 mt-0.5">An admin is reviewing your document. This usually takes 1-2 business days.</p>
          </div>
        </div>
      );
    }
    if (s === 'rejected') {
      return (
        <div className="flex items-center gap-3 p-5 rounded-2xl mb-6"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <XCircle size={22} className="text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">Verification rejected</p>
            <p className="text-xs text-white/40 mt-0.5">
              {verification?.verificationRejectionReason || 'Please re-submit a clearer document.'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const canSubmit = !verification || ['unsubmitted', 'rejected'].includes(verification.verificationStatus);

  return (
    <div className="min-h-screen bg-[#080f0a] relative overflow-x-hidden">
      <div className="relative max-w-xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-400/60 mb-2">Provider Verification</p>
          <h1 className="text-3xl font-bold text-white mb-1">Get Verified</h1>
          <p className="text-white/35 text-sm">Upload a valid ID to earn a verification badge clients can trust.</p>
        </div>

        {renderStatusBanner()}

        {canSubmit && (
          <form onSubmit={handleSubmit} className="p-6 rounded-2xl space-y-5" style={glassCard}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                Government-issued ID <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-white/30 mb-4">
                National ID, driver's license, or passport. Make sure it's clear and all details are visible.
              </p>

              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Document preview"
                    className="w-full max-h-64 object-contain rounded-xl"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }} />
                  <button type="button" onClick={() => { setFile(null); setPreview(null); }}
                    className="mt-3 text-xs text-white/40 hover:text-white/70 transition">
                    Choose a different file
                  </button>
                </div>
              ) : (
                <label className="w-full h-40 rounded-xl flex flex-col items-center justify-center cursor-pointer transition"
                  style={{ border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}>
                  <Upload size={24} className="text-white/20 mb-2" />
                  <span className="text-sm text-white/30">Click to upload your ID</span>
                  <span className="text-xs text-white/20 mt-1">PNG, JPG up to 10MB</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <AlertCircle size={14} className="text-white/30 mt-0.5 shrink-0" />
              <p className="text-xs text-white/30">
                Your document is only visible to admins reviewing your application and is never shown publicly.
              </p>
            </div>

            <button type="submit" disabled={submitting || !file}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50"
              style={{
                background: (submitting || !file) ? 'rgba(22,163,74,0.4)' : 'linear-gradient(135deg,#16a34a,#15803d)',
                boxShadow: (submitting || !file) ? 'none' : '0 4px 24px rgba(22,163,74,0.35)',
              }}>
              {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : 'Submit for Verification'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}