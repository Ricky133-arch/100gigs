import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function sendNotificationToUser(userId, payload) {
  try {
    const sub = await PushSubscription.findOne({ user: userId });
    if (!sub) return;

    await webpush.sendNotification(
      sub.subscription,
      JSON.stringify(payload)
    );
  } catch (error) {
    // Subscription expired or invalid — remove it
    if (error.statusCode === 410 || error.statusCode === 404) {
      await PushSubscription.findOneAndDelete({ user: userId });
    }
    console.error('Push notification error:', error.message);
  }
}