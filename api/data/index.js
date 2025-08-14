const { kv } = require('@vercel/kv');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const data = await kv.get('calibrations') || [];
    res.status(200).json(data);
  } else if (req.method === 'POST') {
    const newEntry = req.body;
    let data = await kv.get('calibrations') || [];
    data.push(newEntry);
    await kv.set('calibrations', data);
    if (newEntry.send_email) {
      try {
        const text = `Equipment: ${newEntry.equipment_name}\nMake: ${newEntry.make}\nManufactured: ${newEntry.manufactured}\nSerial: ${newEntry.serial_number}\nCalibration Date: ${newEntry.calibration_date}\nInterval: ${newEntry.recalibration_interval} months\nDepartment: ${newEntry.department}\nNumber of Instruments: ${newEntry.number_of_instruments}`;
        await sendEmail(newEntry.emails, `New Calibration Added: ${newEntry.equipment_name}`, text);
        await logEmail(newEntry.equipment_name, newEntry.emails, 'confirmation', true);
      } catch (e) {
        await logEmail(newEntry.equipment_name, newEntry.emails, 'confirmation', false);
        res.status(500).json({ error: 'Email send failed' });
        return;
      }
    }
    res.status(200).json({ success: true });
  } else if (req.method === 'DELETE') {
    await kv.set('calibrations', []);
    res.status(200).json({ success: true });
  } else {
    res.status(405).end();
  }
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
