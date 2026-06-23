import webpush from 'web-push';
import connectDB from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import Notification from '@/models/Notification';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a notification to a user.
 * Saves to DB (so it shows in the in-app notification list)
 * AND sends a push notification (so it appears on their device).
 *
 * @param {string} userId     - recipient's MongoDB _id
 * @param {object} payload
 * @param {string} payload.title
 * @param {string} payload.body
 * @param {string} payload.url
 * @param {string} payload.type  - must match Notification model enum
 * @param {string} payload.senderId - optional, who triggered this
 */
export async function sendNotificationToUser(userId, payload) {
  const {
    title,
    body,
    url      = '/',
    type     = 'system',
    senderId = null,
  } = payload;

  try {
    await connectDB();

    // ── 1. Save to database ──────────────────────────────────────────────
    await Notification.create({
      recipient: userId,
      sender:    senderId || undefined,
      type,
      title,
      body,
      url,
    });

    // ── 2. Send push notification ────────────────────────────────────────
    const sub = await PushSubscription.findOne({ user: userId });
    if (sub) {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({ title, body, url }),
        {
          urgency: 'high',
          TTL:     300,
        }
      ).catch(async (err) => {
        // Subscription expired — clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.findOneAndDelete({ user: userId });
        } else {
          console.error('Push error:', err.message);
        }
      });
    }
  } catch (error) {
    console.error('sendNotificationToUser error:', error.message);
  }
}