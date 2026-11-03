'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { X, Plus, Loader2, ArrowRight, ArrowUpRight } from 'lucide-react';

const CATEGORIES = [
  'Plumbing', 'Electrical', 'Carpentry', 'Makeup & Hair',
  'Cleaning', 'Painting', 'Car Repair', 'Tailoring',
  'Graphic Design', 'Photography', 'Tutoring', 'Delivery',
  'Event Planning', 'AC Repair', 'Other',
];

const LOCATIONS = [
  'GRA Phase 1', 'GRA Phase 2', 'Trans Amadi', 'Woji',
  'Elelenwo', 'Rumuomasi', 'Rumuola', 'Diobu', 'Borokiri',
  'D-Line', 'Rumuigbo', 'Ozuoba', 'Choba', 'Ada George',
  'Rukpokwu', 'Eneka', 'Mgbuoba',
  'Port Harcourt City', 'Asari-Toru', 'Other',
];

const MAX_IMAGES = 5;
const MAX_MB = 10;
const TITLE_MAX = 100;
const DESC_MAX = 2000;

// Today's date in the user's own timezone (toISOString uses UTC, which
// allowed picking yesterday as a deadline just after midnight in Lagos)
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

function validate(f) {
  const e = {};
  const title = f.title.trim();
  const desc = f.description.trim();
  if (!title) e.title = 'Give the job a title.';
  else if (title.length < 10) e.title = 'A bit more detail — at least 10 characters.';
  if (!desc) e.description = 'Describe what needs doing.';
  else if (desc.length < 30) e.description = `Add a little more — ${30 - desc.length} more characters.`;
  if (!f.category) e.category = 'Pick the trade this job needs.';
  if (!f.location) e.location = 'Pick the area the job is in.';
  const lo = Number(f.budgetMin), hi = Number(f.budgetMax);
  if (!f.budgetMin || !f.budgetMax) e.budget = 'Enter both a minimum and maximum.';
  else if (lo <= 0) e.budget = 'The minimum must be more than ₦0.';
  else if (lo > hi) e.budget = 'The minimum can’t be higher than the maximum.';
  return e;
}

export default function PostJob() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '', description: '', category: '',
    budgetMin: '', budgetMax: '', location: '', deadline: '',
  });
  // Each image keeps its own preview URL so they can't get out of order
  const [images, setImages] = useState([]); // [{ file, url }]
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | uploading | posting
  const refs = { title: useRef(null), description: useRef(null), category: useRef(null), location: useRef(null), budget: useRef(null) };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=%2Fpost-job');
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Free preview memory when leaving the page
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((img) => URL.revokeObjectURL(img.url)), []);

  // Re-check live once they've tried to submit
  useEffect(() => { if (submitted) setErrors(validate(formData)); }, [formData, submitted]);

  const shell = (children) => (
    <div className="pj min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .pj { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        .pj select option { background: #0b150e; color: #fff; }
        .pj input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .pj input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: .4; cursor: pointer; }
      `}</style>
      {children}
    </div>
  );

  if (status === 'loading') {
    return shell(
      <div className="flex min-h-screen items-center justify-center">
        <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">Loading…</p>
      </div>
    );
  }
  if (!session) return null;

  if (!['client', 'admin'].includes(session.user.role)) {
    return shell(
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 md:px-8">
        <p className="mono mb-5 text-[11px] uppercase tracking-[0.18em] text-white/35">Provider account</p>
        <p className="serif max-w-xl text-5xl leading-[0.95] md:text-6xl">Posting jobs is for clients.</p>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/55">
          You’re logged in as a service provider, so you apply to jobs rather than post them.
        </p>
        <Link href="/browse"
          className="group mt-10 inline-flex w-max items-center gap-2 rounded-full bg-green-400 px-7 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300">
          Browse open jobs <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    );
  }

  const set = (name, value) => setFormData((f) => ({ ...f, [name]: value }));
  const handleChange = (e) => set(e.target.name, e.target.value);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // so picking the same file again still works
    const room = MAX_IMAGES - images.length;
    if (files.length > room) toast.error(`You can add ${room} more photo${room === 1 ? '' : 's'} (max ${MAX_IMAGES}).`);
    const valid = files.slice(0, room).filter((file) => {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} isn’t an image`); return false; }
      if (file.size > MAX_MB * 1024 * 1024) { toast.error(`${file.name} is over ${MAX_MB}MB`); return false; }
      return true;
    });
    setImages((prev) => [...prev, ...valid.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  const removeImage = (index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImages = async () => {
    const urls = await Promise.all(images.map(async ({ file }) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('upload');
      const data = await res.json();
      return data.url;
    }));
    return urls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(formData);
    setErrors(errs);
    const first = ['title', 'description', 'category', 'location', 'budget'].find((k) => errs[k]);
    if (first) {
      refs[first].current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      refs[first].current?.querySelector('input,textarea,select,button')?.focus({ preventScroll: true });
      return;
    }

    try {
      let imageUrls = [];
      if (images.length) {
        setPhase('uploading');
        try { imageUrls = await uploadImages(); }
        catch { toast.error('Couldn’t upload your photos. Try again, or remove them and post without.'); setPhase('idle'); return; }
      }
      setPhase('posting');
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          title: formData.title.trim(),
          description: formData.description.trim(),
          budgetMin: Number(formData.budgetMin),
          budgetMax: Number(formData.budgetMax),
          images: imageUrls,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data._id) { toast.error(data.error || 'Couldn’t post the job. Please try again.'); setPhase('idle'); return; }
      toast.success('Your job is live');
      router.push(`/jobs/${data._id}`); // keep the button busy while we navigate
    } catch {
      toast.error('Something went wrong. Please try again.');
      setPhase('idle');
    }
  };

  const busy = phase !== 'idle';
  const label = 'mono mb-3 block text-[10px] uppercase tracking-[0.16em] text-white/35';
  const input = (err) =>
    `w-full border-b bg-transparent pb-3 text-[16px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-400 ${err ? 'border-red-400/70' : 'border-white/15'}`;
  const Err = ({ k }) => (errors[k] ? <p className="mt-2 text-[12px] text-red-300">{errors[k]}</p> : null);
  const Step = ({ n, title, hint }) => (
    <div className="mb-6 flex items-baseline gap-4">
      <span className="mono text-[11px] text-green-400">{String(n).padStart(2, '0')}</span>
      <div>
        <h2 className="text-[17px] font-medium text-white">{title}</h2>
        {hint && <p className="mt-1 text-[13px] text-white/40">{hint}</p>}
      </div>
    </div>
  );

  const lo = Number(formData.budgetMin), hi = Number(formData.budgetMax);
  const previewBudget = formData.budgetMin && formData.budgetMax && lo <= hi
    ? (lo === hi ? naira(lo) : `${naira(lo)} – ${naira(hi)}`)
    : formData.budgetMin ? `From ${naira(lo)}` : '₦ —';

  return shell(
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-8 md:pt-16">
      <header className="mb-14 max-w-2xl">
        <h1 className="serif text-5xl leading-[0.95] md:text-7xl">
          Post a <em className="text-green-400">job.</em>
        </h1>
        <p className="mt-6 text-[15px] leading-relaxed text-white/55">
          Tell local providers what you need. Clear jobs with photos and a fair budget get the best applicants, usually within a day.
        </p>
      </header>

      <div className="grid gap-16 lg:grid-cols-[1fr_340px] lg:gap-16">
        <form onSubmit={handleSubmit} noValidate className="min-w-0 space-y-14">

          {/* 01 — What */}
          <section>
            <Step n={1} title="What do you need done?" />
            <div ref={refs.title}>
              <label htmlFor="title" className={label}>Title</label>
              <input id="title" name="title" value={formData.title} onChange={handleChange}
                maxLength={TITLE_MAX} autoComplete="off"
                placeholder="e.g. Fix leaking kitchen sink in Woji"
                className={input(errors.title)} />
              <div className="flex justify-between">
                <Err k="title" />
                <p className="mono ml-auto mt-2 text-[10px] text-white/25">{formData.title.length}/{TITLE_MAX}</p>
              </div>
            </div>

            <div ref={refs.description} className="mt-8">
              <label htmlFor="description" className={label}>Details</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange}
                rows={6} maxLength={DESC_MAX}
                placeholder="What’s the problem, how big is the job, anything the provider should bring, best time to come…"
                className={`${input(errors.description)} resize-none leading-relaxed`} />
              <div className="flex justify-between">
                <Err k="description" />
                <p className="mono ml-auto mt-2 text-[10px] text-white/25">{formData.description.length}/{DESC_MAX}</p>
              </div>
            </div>
          </section>

          {/* 02 — Trade */}
          <section ref={refs.category}>
            <Step n={2} title="Which trade?" />
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
              {CATEGORIES.map((c) => {
                const on = formData.category === c;
                return (
                  <button key={c} type="button" role="radio" aria-checked={on} onClick={() => set('category', c)}
                    className={`rounded-full border px-4 py-2 text-[13px] transition ${
                      on ? 'border-green-400 bg-green-400 text-[#080f0a]' : 'border-white/15 text-white/65 hover:border-white/40 hover:text-white'
                    }`}>
                    {c}
                  </button>
                );
              })}
            </div>
            <Err k="category" />
          </section>

          {/* 03 — Where & when */}
          <section>
            <Step n={3} title="Where and when?" />
            <div className="grid gap-8 sm:grid-cols-2">
              <div ref={refs.location}>
                <label htmlFor="location" className={label}>Area</label>
                <select id="location" name="location" value={formData.location} onChange={handleChange}
                  className={`${input(errors.location)} ${formData.location ? '' : 'text-white/30'}`}>
                  <option value="">Choose an area</option>
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <Err k="location" />
              </div>
              <div>
                <label htmlFor="deadline" className={label}>Needed by <span className="normal-case tracking-normal text-white/25">· optional</span></label>
                <input id="deadline" type="date" name="deadline" value={formData.deadline} onChange={handleChange}
                  min={todayLocal()} style={{ colorScheme: 'dark' }}
                  className={`${input(false)} mono ${formData.deadline ? '' : 'text-white/30'}`} />
              </div>
            </div>
          </section>

          {/* 04 — Budget */}
          <section ref={refs.budget}>
            <Step n={4} title="What’s your budget?" hint="A range works best. Providers can suggest their own rate when they apply." />
            <div className="grid grid-cols-2 gap-6">
              {[['budgetMin', 'From', '5,000'], ['budgetMax', 'Up to', '20,000']].map(([name, l, ph]) => (
                <div key={name}>
                  <label htmlFor={name} className={label}>{l}</label>
                  <div className={`flex items-baseline border-b pb-3 transition-colors focus-within:border-green-400 ${errors.budget ? 'border-red-400/70' : 'border-white/15'}`}>
                    <span className="mono mr-2 text-[16px] text-white/35">₦</span>
                    <input id={name} type="number" inputMode="numeric" min="0" name={name}
                      value={formData[name]} onChange={handleChange} placeholder={ph}
                      className="mono min-w-0 flex-1 bg-transparent text-[18px] text-white outline-none placeholder:text-white/20" />
                  </div>
                </div>
              ))}
            </div>
            <Err k="budget" />
          </section>

          {/* 05 — Photos */}
          <section>
            <Step n={5} title="Add photos" hint={`Optional, up to ${MAX_IMAGES}. A picture of the problem saves a lot of back-and-forth.`} />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {images.map((img, i) => (
                <div key={img.url} className="relative aspect-square overflow-hidden border border-white/10">
                  <img src={img.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} disabled={busy} aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#080f0a]/80 text-white transition hover:bg-red-500">
                    <X size={13} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center border border-dashed border-white/15 text-white/35 transition hover:border-green-400 hover:text-green-400">
                  <Plus size={20} />
                  <span className="mono mt-1.5 text-[10px] uppercase tracking-[0.14em]">{images.length ? 'Add' : 'Photos'}</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" disabled={busy} />
                </label>
              )}
            </div>
            <p className="mono mt-3 text-[10px] text-white/25">JPG or PNG · up to {MAX_MB}MB each</p>
          </section>

          {/* Submit */}
          <div className="border-t border-white/10 pt-10">
            {submitted && Object.keys(errors).length > 0 && (
              <p className="mb-5 border-l-2 border-red-400 pl-3 text-[13px] text-red-300">
                A few things need fixing before you can post. They’re marked in red above.
              </p>
            )}
            <button type="submit" disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-4 text-[15px] font-medium text-[#080f0a] transition hover:bg-green-300 active:scale-[0.99] disabled:bg-white/[0.06] disabled:text-white/40 sm:w-max sm:px-10">
              {phase === 'uploading' ? <><Loader2 size={17} className="animate-spin" /> Uploading photos…</>
                : phase === 'posting' ? <><Loader2 size={17} className="animate-spin" /> Posting…</>
                : <>Post job <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" /></>}
            </button>
            <p className="mt-4 text-[12px] text-white/35">Posting is free. You only pay when the job is done.</p>
          </div>
        </form>

        {/* Live preview */}
        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <p className="mono mb-3 text-[10px] uppercase tracking-[0.16em] text-white/35">How it’ll look</p>
            <div className="border border-white/10 bg-[#0b150e]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <span className="mono text-[11px] uppercase tracking-[0.16em] text-white/45">On the board</span>
                <span className="mono flex items-center gap-2 text-[11px] text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> open
                </span>
              </div>
              <div className="px-5 py-5">
                <p className="mono mb-2 text-[11px] text-white/35">
                  {formData.category || 'Trade'} · {formData.location || 'Area'} · just now
                </p>
                <p className={`text-[16px] leading-snug ${formData.title.trim() ? 'text-white' : 'text-white/25'}`}>
                  {formData.title.trim() || 'Your job title'}
                </p>
                <p className={`mt-1.5 line-clamp-2 text-[13px] leading-relaxed ${formData.description.trim() ? 'text-white/45' : 'text-white/20'}`}>
                  {formData.description.trim() || 'The first lines of your description show here.'}
                </p>
                {images.length > 0 && (
                  <div className="mt-4 flex gap-1.5">
                    {images.slice(0, 4).map((img) => (
                      <img key={img.url} src={img.url} alt="" className="h-10 w-10 object-cover" />
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <p className="mono text-[14px] text-green-400">{previewBudget}</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/30">
                    <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            </div>

            <ul className="mt-8 space-y-3 text-[13px] leading-relaxed text-white/45">
              <li className="border-l border-white/15 pl-3">Mention a street or landmark in the details — it helps providers judge the distance.</li>
              <li className="border-l border-white/15 pl-3">Mention timing. “This Saturday morning” gets faster replies than nothing.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}