const { kv } = require('@vercel/kv');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  const { id } = req.query;
  let data = await kv.get('calibrations') || [];
  const index = data.findIndex(e => e.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }
  if (req.method === 'PUT') {
    data[index] = { ...data[index], ...req.body };
    await kv.set('calibrations', data);
    if (req.body.send_email) {
      const entry = data[index];
      try {
        const text = `Equipment: ${entry.equipment_name}\nMake: ${entry.make}\nManufactured: ${entry.manufactured}\nSerial: ${entry.serial_number}\nCalibration Date: ${entry.calibration_date}\nInterval: ${entry.recalibration_interval} months\nDepartment: ${entry.department}\nNumber of Instruments: ${entry.number_of_instruments}`;
        await sendEmail(entry.emails, `Calibration Updated: ${entry.equipment_name}`, text);
        await logEmail(entry.equipment_name, entry.emails, 'confirmation', true);
      } catch (e) {
        await logEmail(entry.equipment_name, entry.emails, 'confirmation', false);
        res.status(500).json({ error: 'Email send failed' });
        return;
      }
    }
    res.status(200).json({ success: true });
  } else if (req.method === 'DELETE') {
    data.splice(index, 1);
    await kv.set('calibrations', data);
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
