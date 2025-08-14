const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  const logs = await kv.get('email_log') || [];
  res.status(200).json(logs);
}
