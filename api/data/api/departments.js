const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const depts = await kv.get('departments') || [];
    res.status(200).json(depts);
  } else if (req.method === 'POST') {
    await kv.set('departments', req.body);
    res.status(200).json({ success: true });
  } else {
    res.status(405).end();
  }
}
