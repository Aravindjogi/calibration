const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  const data = await kv.get('calibrations') || [];
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=calibration_data.json');
  res.status(200).send(JSON.stringify(data, null, 2));
}
