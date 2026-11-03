'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2, Copy, Check } from 'lucide-react';

const naira = (n) => (typeof n === 'number' ? `₦${n.toLocaleString('en-NG')}` : '—');
const REDIRECT_SECONDS = 6;

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const jobId = searchParams.get('jobId');
  const providerId = searchParams.get('providerId');
  const providerShare = searchParams.get('providerShare');

  const [status, setStatus] = useState('verifying'); // verifying | success | failed
  const [payment, setPayment] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const backHref = jobId ? `/jobs/${jobId}` : '/dashboard';

  useEffect(() => {
    if (!reference) {
      setErrorMsg('This page was opened without a payment reference.');
      setStatus('failed');
      return;
    }
    if (started.current) return; // avoid verifying twice on mount
    started.current = true;
    verify();
  }, [reference]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown, then go back to the job. Cleared if the user leaves first.
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown <= 0) { router.push(backHref); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = async () => {
    setStatus('verifying');
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ reference });
      if (jobId) params.set('jobId', jobId);
      // NOTE: the server must NOT trust these two — see the notes.
      if (providerId) params.set('providerId', providerId);
      if (providerShare) params.set('providerShare', providerShare);

      const res = await fetch(`/api/payment/verify?${params}`);
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setPayment(data.payment || null);
        setCountdown(REDIRECT_SECONDS);
        setStatus('success');
      } else {
        setErrorMsg(data.error || '');
        setStatus('failed');
      }
    } catch {
      setErrorMsg('Couldn’t reach the server. Check your connection.');
      setStatus('failed');
    }
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked — ignore */ }
  };

  return (
    <div key={status} className="rise max-w-md">
      {status === 'verifying' && (
        <>
          <p className="mono mb-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
            <Loader2 size={13} className="animate-spin text-green-400" /> Confirming with Paystack
          </p>
          <h1 className="serif text-5xl leading-[0.95] md:text-6xl">
            One<br /><em className="text-green-400">moment.</em>
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-white/55">
            We’re checking that your payment went through. Please don’t close this page or pay again.
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <p className="mono mb-6 text-[11px] uppercase tracking-[0.18em] text-green-400">Payment confirmed</p>
          <h1 className="serif text-5xl leading-[0.95] md:text-6xl">
            All<br /><em className="text-green-400">paid.</em>
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-white/55">
            The job is closed and the provider has been notified.
            {payment?.providerShare != null && <> They’ll receive <span className="text-white">{naira(payment.providerShare)}</span>.</>}
          </p>

          {payment && (
            <dl className="mt-10 space-y-3 border-t border-white/10 pt-6 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-white/45">You paid</dt>
                <dd className="mono text-white">{naira(payment.totalAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/45">100Gigs fee (10%)</dt>
                <dd className="mono text-white/60">− {naira(payment.commission)}</dd>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3">
                <dt className="text-white/75">Provider receives</dt>
                <dd className="mono text-green-400">{naira(payment.providerShare)}</dd>
              </div>
            </dl>
          )}

          {reference && (
            <p className="mono mt-6 text-[11px] text-white/30">Ref {reference}</p>
          )}

          <Link href={backHref}
            className="group mt-10 flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 sm:w-max sm:px-8">
            {jobId ? 'Back to the job' : 'Go to dashboard'}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mono mt-4 text-[11px] text-white/30">Taking you back in {countdown}s</p>

          {jobId && (
            <p className="mt-8 text-[13px] text-white/45">
              Happy with the work?{' '}
              <Link href={`/jobs/${jobId}#applications`}
                className="text-white underline decoration-white/20 underline-offset-4 transition hover:text-green-400 hover:decoration-green-400">
                Leave a review
              </Link>
            </p>
          )}
        </>
      )}

      {status === 'failed' && (
        <>
          <p className="mono mb-6 text-[11px] uppercase tracking-[0.18em] text-red-400">Not confirmed</p>
          <h1 className="serif text-5xl leading-[0.95] md:text-6xl">
            We couldn’t<br /><em className="text-white/80">confirm it.</em>
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-white/55">
            {errorMsg || 'We couldn’t confirm this payment with Paystack.'}
          </p>

          <p className="mt-6 border-l-2 border-amber-300 pl-3 text-[13px] leading-relaxed text-amber-200/85">
            If money left your account, don’t pay again. Try checking once more, or contact us with the reference below and we’ll sort it out.
          </p>

          {reference && (
            <button onClick={copyRef}
              className="mono mt-6 inline-flex items-center gap-2 text-[12px] text-white/50 transition hover:text-white">
              Ref {reference}
              {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            </button>
          )}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            {reference && (
              <button onClick={verify}
                className="group flex items-center justify-center gap-2 rounded-full bg-green-400 px-8 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300">
                Check again
              </button>
            )}
            <Link href={backHref}
              className="flex items-center justify-center rounded-full border border-white/15 px-8 py-3.5 text-[14px] text-white/75 transition hover:border-white/40 hover:text-white">
              {jobId ? 'Back to the job' : 'Go to dashboard'}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <div className="pv flex min-h-screen flex-col bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .pv { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .rise { animation: rise .7s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none; } }
      `}</style>

      <header className="border-b border-white/[0.07]">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 md:px-8">
          <Link href="/" className="text-[1.35rem] font-semibold tracking-tight">
            <span className="text-green-400">100</span>Gigs
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8">
          <Suspense fallback={
            <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">Loading…</p>
          }>
            <VerifyContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}