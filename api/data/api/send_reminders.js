const { kv } = require('@vercel/kv');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  let data = await kv.get('calibrations') || [];
  const now = new Date();
  const filtered = data.filter(entry => {
    const calibDate = new Date(entry.calibration_date);
    const dueDate = new Date(calibDate);
    dueDate.setMonth(dueDate.getMonth() + entry.recalibration_interval);
    const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
    return daysUntilDue <= 30;
  });
  const promises = filtered.map(async entry => {
    try {
      const dueDate = new Date(new Date(entry.calibration_date));
      dueDate.setMonth(dueDate.getMonth() + entry.recalibration_interval);
      const text = `Reminder for Equipment: ${entry.equipment_name}\nMake: ${entry.make}\nSerial: ${entry.serial_number}\nCalibration Date: ${entry.calibration_date}\nDue Date: ${dueDate.toLocaleDateString()}\nStatus: ${getStatus(entry)}\nDepartment: ${entry.department}`;
      await sendEmail(entry.emails, `Calibration Reminder: ${entry.equipment_name}`, text);
      await logEmail(entry.equipment_name, entry.emails, 'reminder', true);
      entry.last_reminder = Math.floor(Date.now() / 1000);
    } catch (e) {
      await logEmail(entry.equipment_name, entry.emails, 'reminder', false);
    }
  });
  await Promise.all(promises);
  await kv.set('calibrations', data);
  res.status(200).json({ success: true });
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

async function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text
  });
}

async function logEmail(equipment_name, emails, type, success) {
  let logs = await kv.get('email_log') || [];
  logs.push({
    timestamp: Math.floor(Date.now() / 1000),
    equipment_name,
    emails,
    type,
    success
  });
  await kv.set('email_log', logs);
}
