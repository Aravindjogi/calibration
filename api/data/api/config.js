const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const config = await kv.get('config') || { notify_hour: 8, notify_minute: 0 };
    res.status(200).json(config);
  } else if (req.method === 'POST') {
    await kv.set('config', req.body);
    res.status(200).json({ success: true });
  } else {
    res.status(405).end();
  }
}
