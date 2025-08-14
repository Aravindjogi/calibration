const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  const data = await kv.get('calibrations') || [];
  const missing = data.filter(entry => getStatus(entry) === 'overdue').map(entry => {
    const calibDate = new Date(entry.calibration_date);
    const dueDate = new Date(calibDate);
    dueDate.setMonth(dueDate.getMonth() + entry.recalibration_interval);
    return { ...entry, due_date: dueDate.toISOString().split('T')[0] };
  });
  res.status(200).json(missing);
}

function getStatus(entry) {
  const calibDate = new Date(entry.calibration_date);
  const dueDate = new Date(calibDate);
  dueDate.setMonth(dueDate.getMonth() + entry.recalibration_interval);
  const now = new Date();
  const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 30) return 'due-soon';
  return 'not-due';
}
