'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const reference    = searchParams.get('reference');
  const jobId        = searchParams.get('jobId');
  const providerId   = searchParams.get('providerId');
  const providerShare = searchParams.get('providerShare');

  const [status,  setStatus]  = useState('verifying'); // verifying | success | failed
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    if (!reference) { setStatus('failed'); return; }
    verify();
  }, [reference]);

  const verify = async () => {
    try {
      const params = new URLSearchParams({ reference });
      if (jobId)        params.set('jobId', jobId);
      if (providerId)   params.set('providerId', providerId);
      if (providerShare) params.set('providerShare', providerShare);

      const res  = await fetch(`/api/payment/verify?${params}`);
      const data = await res.json();

      if (res.ok) {
        setPayment(data.payment);
        setStatus('success');
        // Redirect to job after 4 seconds
        if (jobId) setTimeout(() => router.push(`/jobs/${jobId}`), 4000);
      } else {
        setStatus('failed');
      }
    } catch {
      setStatus('failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#080f0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        {status === 'verifying' && (
          <>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <Loader2 size={36} className="text-green-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verifying payment…</h2>
            <p className="text-white/40 text-sm">Please wait while we confirm your payment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-white/40 text-sm mb-6">
              The job has been marked as completed. The provider will receive
              ₦{payment?.providerShare?.toLocaleString()} after the 10% platform fee.
            </p>

            {/* Payment breakdown */}
            {payment && (
              <div className="p-5 rounded-2xl mb-6 text-left space-y-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Payment Summary</p>
                {[
                  { label: 'Total Paid',       value: `₦${payment.totalAmount?.toLocaleString()}`,   color: 'text-white' },
                  { label: '100Gigs Fee (10%)', value: `₦${payment.commission?.toLocaleString()}`,   color: 'text-red-400' },
                  { label: 'Provider Receives', value: `₦${payment.providerShare?.toLocaleString()}`, color: 'text-green-400' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-white/40">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-white/25 text-xs mb-6">Redirecting you back to the job…</p>

            <Link href={jobId ? `/jobs/${jobId}` : '/dashboard'}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 24px rgba(22,163,74,0.35)' }}>
              Back to Job
            </Link>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)' }}>
              <XCircle size={40} className="text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
            <p className="text-white/40 text-sm mb-6">
              Something went wrong verifying your payment. Please try again or contact support.
            </p>
            <div className="flex gap-3">
              <Link href="/dashboard"
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white/60 text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Go to Dashboard
              </Link>
              <button onClick={verify}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080f0a] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}