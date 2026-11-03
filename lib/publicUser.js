/**
 * lib/publicUser.js
 *
 * The ONLY fields anyone can see about another user. Anything not listed
 * here (email, bank details, ID documents, reset tokens, push data,
 * suspension notes…) never leaves the server through a public route.
 *
 * Add a field here only if you'd be happy to print it on a flyer.
 */
import Job from '@/models/Job';
import Application from '@/models/Application';

export const PUBLIC_USER_FIELDS =
  'name avatar bio location skills role username socialLinks verificationStatus createdAt';

const HIRED = { $in: ['accepted', 'completed'] };

/**
 * Phone numbers are shared only between people who have actually hired /
 * been hired by each other (plus the person themselves and admins).
 * Keeps providers' numbers away from scrapers, and keeps first contact on
 * 100Gigs where chat, payment and ratings protect both sides.
 */
export async function canSeePhone(viewer, profileId) {
  if (!viewer?.id) return false;
  const me = String(viewer.id);
  const them = String(profileId);
  if (me === them || viewer.role === 'admin') return true;

  const [myJobs, theirJobs] = await Promise.all([
    Job.find({ postedBy: me }).distinct('_id'),
    Job.find({ postedBy: them }).distinct('_id'),
  ]);

  const hired = await Promise.all([
    myJobs.length ? Application.exists({ job: { $in: myJobs }, applicant: them, status: HIRED }) : null,
    theirJobs.length ? Application.exists({ job: { $in: theirJobs }, applicant: me, status: HIRED }) : null,
  ]);
  return hired.some(Boolean);
}