'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Check, Plus, ArrowRight, Lock } from 'lucide-react';

const MAX_MB = 10;
const maskAccount = (n) => (n ? `•••• ${String(n).slice(-4)}` : '');

export default function VerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [verification, setVerification] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Bank details
  const [banks, setBanks] = useState([]);
  const [banksFailed, setBanksFailed] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankQuery, setBankQuery] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [resolvingBank, setResolvingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [existingBank, setExistingBank] = useState(null);
  const [editingBank, setEditingBank] = useState(false);
  const resolveId = useRef(0);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=%2Fverification');
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session) return;
    fetchStatus();
    fetchBanks();
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Free the preview image when it changes or the page closes
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Auto-check the account name once there are 10 digits and a bank.
  // Ignores slow answers for an older number/bank so the name always matches what's on screen.
  useEffect(() => {
    setAccountName('');
    setResolveError('');
    if (accountNumber.length !== 10 || !bankCode) { setResolvingBank(false); return; }
    const myId = ++resolveId.current;
    setResolvingBank(true);
    (async () => {
      try {
        const res = await fetch(`/api/bank/resolve?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode)}`);
        const data = await res.json().catch(() => ({}));
        if (myId !== resolveId.current) return;
        if (res.ok && data.accountName) setAccountName(data.accountName);
        else setResolveError(data.error || 'We couldn’t find that account. Check the number and bank.');
      } catch {
        if (myId === resolveId.current) setResolveError('Couldn’t check the account. Check your connection.');
      } finally {
        if (myId === resolveId.current) setResolvingBank(false);
      }
    })();
  }, [accountNumber, bankCode]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/verification/upload');
      if (res.ok) {
        const data = await res.json();
        setVerification(data);
        if (data.bankDetails?.accountNumber) setExistingBank(data.bankDetails);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchBanks = async () => {
    setLoadingBanks(true);
    setBanksFailed(false);
    try {
      const res = await fetch('/api/bank/list');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('banks');
      // Paystack lists some banks more than once — keep one per code
      const seen = new Set();
      setBanks((data.banks || []).filter((b) => b.code && !seen.has(b.code) && seen.add(b.code)));
    } catch (e) {
      console.error(e);
      setBanksFailed(true);
    } finally {
      setLoadingBanks(false);
    }
  };

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    return q ? banks.filter((b) => b.name.toLowerCase().includes(q)) : banks;
  }, [banks, bankQuery]);
  const selectedBank = banks.find((b) => b.code === bankCode);
  const bankVerified = !!accountName && !resolvingBank;

  const resetBankForm = () => {
    setBankCode(''); setBankQuery(''); setAccountNumber(''); setAccountName(''); setResolveError('');
  };

  const handleSaveBankDetails = async () => {
    if (!bankVerified) { toast.error('Check your account number first'); return; }
    setSavingBank(true);
    try {
      // NOTE: the server must re-check this account with Paystack itself — see notes.
      const details = { bankName: selectedBank?.name || '', bankCode, accountNumber, accountName };
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankDetails: details }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Couldn’t save your bank details');
        return;
      }
      toast.success('Payout account saved');
      setExistingBank({ ...details, verified: true });
      setEditingBank(false);
      resetBankForm();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSavingBank(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Upload a photo of your ID (JPG or PNG)'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`That photo is over ${MAX_MB}MB`); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => { setFile(null); setPreview(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Add a photo of your ID first'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!uploadRes.ok) throw new Error('upload');
      const uploadData = await uploadRes.json();

      const res = await fetch('/api/verification/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docUrl: uploadData.url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Couldn’t submit your ID'); return; }
      toast.success('ID submitted for review');
      clearFile();
      fetchStatus();
    } catch {
      toast.error('Couldn’t upload your ID. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── render ───────────────────────────────────────────── */

  const shell = (children) => (
    <div className="vf min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .vf { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        .vf select option { background: #0b150e; color: #fff; }
      `}</style>
      {children}
    </div>
  );

  if (status === 'loading' || (session && loadingStatus)) {
    return shell(
      <div className="flex min-h-screen items-center justify-center">
        <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">Loading…</p>
      </div>
    );
  }
  if (!session) return null;

  if (session.user.role !== 'provider') {
    return shell(
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 md:px-8">
        <p className="serif max-w-xl text-5xl leading-[0.95]">Verification is for service providers.</p>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/55">
          Providers verify their ID so clients know who they’re hiring. As a client, there’s nothing you need to do here.
        </p>
        <Link href="/dashboard"
          className="mt-10 inline-flex w-max items-center gap-2 rounded-full bg-green-400 px-7 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300">
          Back to dashboard <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const vStatus = verification?.verificationStatus || 'unsubmitted';
  const canSubmit = ['unsubmitted', 'rejected'].includes(vStatus);
  const hasBank = !!existingBank?.accountNumber && !editingBank;

  const STATUS = {
    verified: { tag: 'Verified', tone: 'text-green-400', rule: 'border-green-400', title: 'You’re verified.', body: 'Your profile shows the verified badge. Clients can see you’ve been checked.' },
    pending: { tag: 'Under review', tone: 'text-amber-300', rule: 'border-amber-300', title: 'We’re checking your ID.', body: 'An admin is reviewing it. This usually takes 1–2 business days. You’ll get a notification.' },
    rejected: { tag: 'Needs attention', tone: 'text-red-400', rule: 'border-red-400', title: 'Your ID wasn’t accepted.', body: verification?.verificationRejectionReason || 'Please upload a clearer photo where every detail can be read.' },
  }[vStatus];

  const label = 'mono mb-3 block text-[10px] uppercase tracking-[0.16em] text-white/35';
  const input = 'w-full border-b border-white/15 bg-transparent pb-3 text-[16px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-400';

  return shell(
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 md:px-8 md:pt-16">
      <header className="mb-12 max-w-2xl">
        <h1 className="serif text-5xl leading-[0.95] md:text-7xl">
          Get <em className="text-green-400">verified.</em>
        </h1>
        <p className="mt-6 text-[15px] leading-relaxed text-white/55">
          Two things: a photo of your ID so clients know who they’re hiring, and the account you want to be paid into.
        </p>
      </header>

      {/* Progress */}
      <ol className="mb-16 grid grid-cols-2 border-y border-white/10">
        {[
          ['ID check', vStatus === 'verified' ? 'Done' : vStatus === 'pending' ? 'In review' : vStatus === 'rejected' ? 'Try again' : 'To do', vStatus === 'verified'],
          ['Payout account', existingBank?.accountNumber ? 'Done' : 'To do', !!existingBank?.accountNumber],
        ].map(([t, s, ok], i) => (
          <li key={t} className={`flex items-center gap-3 py-5 ${i ? 'border-l border-white/10 pl-5 md:pl-8' : ''}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${ok ? 'border-green-400 bg-green-400' : 'border-white/25'}`}>
              {ok && <Check size={11} strokeWidth={3} className="text-[#080f0a]" />}
            </span>
            <span>
              <span className="block text-[14px] text-white">{t}</span>
              <span className={`mono block text-[11px] ${ok ? 'text-green-400' : 'text-white/40'}`}>{s}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="space-y-20">

        {/* ─── 01 ID ─── */}
        <section className="grid gap-8 md:grid-cols-[260px_1fr] md:gap-14">
          <div>
            <p className="mono mb-3 text-[11px] text-green-400">01</p>
            <h2 className="text-xl font-medium text-white">Your ID</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/45">
              National ID (NIN slip or card), driver’s licence, voter’s card or international passport.
            </p>
          </div>

          <div>
            {STATUS && (
              <div className={`mb-8 border-l-2 ${STATUS.rule} pl-5`}>
                <p className={`mono mb-2 text-[10px] uppercase tracking-[0.16em] ${STATUS.tone}`}>{STATUS.tag}</p>
                <p className="serif text-2xl leading-tight">{STATUS.title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-white/55">{STATUS.body}</p>
              </div>
            )}

            {canSubmit && (
              <form onSubmit={handleSubmit}>
                {preview ? (
                  <div>
                    <div className="border border-white/10 bg-white/[0.02] p-3">
                      <img src={preview} alt="Your ID" className="mx-auto max-h-72 w-auto object-contain" />
                    </div>
                    <button type="button" onClick={clearFile} disabled={submitting}
                      className="mt-3 border-b border-white/20 pb-0.5 text-[13px] text-white/60 transition hover:border-green-400 hover:text-green-400 disabled:opacity-40">
                      Use a different photo
                    </button>
                  </div>
                ) : (
                  <label className="flex h-44 cursor-pointer flex-col items-center justify-center border border-dashed border-white/15 text-white/40 transition hover:border-green-400 hover:text-green-400">
                    <Plus size={22} />
                    <span className="mt-2 text-[14px]">Take or upload a photo of your ID</span>
                    <span className="mono mt-1 text-[10px] text-white/30">JPG or PNG · up to {MAX_MB}MB</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                  </label>
                )}

                <ul className="mt-6 space-y-2 text-[13px] text-white/45">
                  <li>· Lay it flat in good light, no glare</li>
                  <li>· All four corners in the photo</li>
                  <li>· Name and photo must match your profile</li>
                </ul>

                <p className="mt-6 flex items-start gap-2 text-[12px] leading-relaxed text-white/35">
                  <Lock size={13} className="mt-0.5 shrink-0" />
                  Only 100Gigs admins see your ID. It’s never shown on your profile.
                </p>

                <button type="submit" disabled={submitting || !file}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-400 px-8 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:bg-white/[0.06] disabled:text-white/30 sm:w-max">
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : vStatus === 'rejected' ? 'Submit again' : 'Submit for review'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* ─── 02 Payout ─── */}
        <section className="grid gap-8 border-t border-white/10 pt-16 md:grid-cols-[260px_1fr] md:gap-14">
          <div>
            <p className="mono mb-3 text-[11px] text-green-400">02</p>
            <h2 className="text-xl font-medium text-white">Payout account</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/45">
              Where we send your money when a client pays through 100Gigs. We keep a 10% fee; the rest is yours.
            </p>
          </div>

          <div>
            {hasBank ? (
              <div className="border border-white/10 bg-[#0b150e] p-6">
                <p className="mono mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-green-400">
                  <Check size={12} strokeWidth={3} /> Account saved
                </p>
                <p className="text-[17px] font-medium text-white">{existingBank.accountName}</p>
                <p className="mono mt-1 text-[13px] text-white/50">
                  {existingBank.bankName} · {maskAccount(existingBank.accountNumber)}
                </p>
                <button onClick={() => { setEditingBank(true); resetBankForm(); }}
                  className="mt-5 border-b border-white/20 pb-0.5 text-[13px] text-white/60 transition hover:border-green-400 hover:text-green-400">
                  Change account
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <label htmlFor="bank" className={label}>Bank</label>
                  {banksFailed ? (
                    <p className="text-[14px] text-white/55">
                      Couldn’t load the bank list.{' '}
                      <button onClick={fetchBanks} className="text-white underline underline-offset-4 hover:text-green-400">Try again</button>
                    </p>
                  ) : (
                    <>
                      {banks.length > 12 && (
                        <input value={bankQuery} onChange={(e) => setBankQuery(e.target.value)}
                          placeholder="Search banks — e.g. Opay, GTBank, Moniepoint"
                          className={`${input} mb-4 text-[15px]`} aria-label="Search banks" />
                      )}
                      <select id="bank" value={bankCode} onChange={(e) => setBankCode(e.target.value)} disabled={loadingBanks}
                        className={`${input} ${bankCode ? '' : 'text-white/30'}`}>
                        <option value="">{loadingBanks ? 'Loading banks…' : filteredBanks.length ? 'Choose your bank' : 'No bank matches that search'}</option>
                        {filteredBanks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                        {selectedBank && !filteredBanks.includes(selectedBank) && (
                          <option value={selectedBank.code}>{selectedBank.name}</option>
                        )}
                      </select>
                    </>
                  )}
                </div>

                <div>
                  <label htmlFor="acct" className={label}>Account number</label>
                  <input id="acct" inputMode="numeric" autoComplete="off" value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10 digits" className={`${input} mono tracking-[0.12em]`} />
                  <p className="mono mt-2 text-right text-[10px] text-white/25">{accountNumber.length}/10</p>
                </div>

                <div aria-live="polite" className="min-h-[3.5rem]">
                  <p className={label}>Account name</p>
                  {resolvingBank ? (
                    <p className="inline-flex items-center gap-2 text-[15px] text-white/45">
                      <Loader2 size={15} className="animate-spin" /> Checking with your bank…
                    </p>
                  ) : accountName ? (
                    <p className="inline-flex items-center gap-2 text-[17px] text-green-400">
                      <Check size={16} strokeWidth={2.5} /> {accountName}
                    </p>
                  ) : resolveError ? (
                    <p className="text-[13px] text-red-300">{resolveError}</p>
                  ) : (
                    <p className="text-[14px] text-white/30">Appears once you pick a bank and enter 10 digits.</p>
                  )}
                </div>

                {accountName && (
                  <p className="text-[12px] leading-relaxed text-white/40">
                    Make sure this is your name. Payments can’t be pulled back once sent to the wrong account.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <button onClick={handleSaveBankDetails} disabled={!bankVerified || savingBank}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-400 px-8 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:bg-white/[0.06] disabled:text-white/30 sm:w-max">
                    {savingBank ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save payout account'}
                  </button>
                  {editingBank && (
                    <button onClick={() => { setEditingBank(false); resetBankForm(); }} disabled={savingBank}
                      className="text-[13px] text-white/50 transition hover:text-white">
                      Keep current account
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}