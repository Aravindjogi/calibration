const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  const data = await kv.get('calibrations') || [];
  let due_soon = 0, overdue = 0, not_due = 0;
  data.forEach(entry => {
    const status = getStatus(entry);
    if (status === 'due-soon') due_soon++;
    else if (status === 'overdue') overdue++;
    else not_due++;
  });
  res.status(200).json({ due_soon, overdue, not_due });
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
