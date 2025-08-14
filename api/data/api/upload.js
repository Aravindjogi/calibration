const { kv } = require('@vercel/kv');
const busboy = require('busboy');
const { parse } = require('csv-parse/sync');
const nodemailer = require('nodemailer');

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  const bb = busboy({ headers: req.headers });
  let fileContent = '';
  let send_emails = false;
  bb.on('file', (name, file, info) => {
    if (name === 'file') {
      file.on('data', (data) => {
        fileContent += data;
      });
    }
  });
  bb.on('field', (name, val) => {
    if (name === 'send_emails') send_emails = val === 'true';
  });
  bb.on('finish', async () => {
    try {
      const records = parse(fileContent, { columns: true, skip_empty_lines: true });
      let data = await kv.get('calibrations') || [];
      for (const rec of records) {
        const entry = {
          id: generateId(),
          equipment_name: rec['Equipment Name'],
          make: rec['Make'],
          manufactured: rec['Manufactured'],
          serial_number: rec['Serial Number'],
          calibration_date: rec['Calibration Date'],
          number_of_instruments: parseInt(rec['Number of Instruments']),
          department: rec['Department'],
          emails: rec['Team Emails'],
          recalibration_interval: parseInt(rec['Interval (months)']),
          last_reminder: null
        };
        data.push(entry);
        if (send_emails) {
          try {
            const text = `Equipment: ${entry.equipment_name}\nMake: ${entry.make}\nManufactured: ${entry.manufactured}\nSerial: ${entry.serial_number}\nCalibration Date: ${entry.calibration_date}\nInterval: ${entry.recalibration_interval} months\nDepartment: ${entry.department}\nNumber of Instruments: ${entry.number_of_instruments}`;
            await sendEmail(entry.emails, `New Calibration Added from CSV: ${entry.equipment_name}`, text);
            await logEmail(entry.equipment_name, entry.emails, 'confirmation', true);
          } catch (e) {
            await logEmail(entry.equipment_name, entry.emails, 'confirmation', false);
          }
        }
      }
      await kv.set('calibrations', data);
      res.status(200).json({ message: 'CSV uploaded and processed successfully' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  req.pipe(bb);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
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
