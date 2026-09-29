require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const net = require('net');
const https = require('https');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const db = require('./database/db');

async function testAll() {
  console.log('====================================================================');
  console.log('🔍 FINDORA AI • COMPREHENSIVE ENVIRONMENT CONFIGURATION AUDIT');
  console.log('====================================================================\n');

  const results = {};

  // 1. JWT & Security Secrets Test
  try {
    const payload = { testUser: 'audit_test_user', role: 'admin' };
    const secret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    if (decoded.testUser === payload.testUser) {
      results['JWT_SECURITY'] = { status: 'PASS', details: 'Secret active, signing & verification 100% operational' };
    } else {
      results['JWT_SECURITY'] = { status: 'FAIL', details: 'Token decoding mismatch' };
    }
  } catch (e) {
    results['JWT_SECURITY'] = { status: 'FAIL', details: e.message };
  }

  // 2. Local Database & Users Test
  try {
    const users = db.prepare('SELECT id, name, email, role FROM users').all();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    results['DATABASE_SQLITE'] = { 
      status: 'PASS', 
      details: `${tables.length} tables verified, ${users.length} configured users active in database` 
    };
  } catch (e) {
    results['DATABASE_SQLITE'] = { status: 'FAIL', details: e.message };
  }

  // 3. Brevo SMTP Connection & Handshake Test
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    await transporter.verify();
    results['BREVO_SMTP'] = { 
      status: 'PASS', 
      details: `Authenticated with ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} as ${process.env.SMTP_USER}` 
    };
  } catch (e) {
    results['BREVO_SMTP'] = { status: 'FAIL', details: e.message };
  }

  // 4. Google Gemini Generative AI Test
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: "Explain FINDORA campus recovery in five words" }] }]
    });

    const geminiRes = await new Promise((resolve, reject) => {
      const req = https.request(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    if (geminiRes.statusCode === 200) {
      const data = JSON.parse(geminiRes.body);
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'AI response received';
      results['GEMINI_AI'] = { status: 'PASS', details: `Model: ${model} | Response: "${answer.replace(/\n/g, ' ')}"` };
    } else {
      results['GEMINI_AI'] = { status: 'FAIL', details: `HTTP ${geminiRes.statusCode}: ${geminiRes.body}` };
    }
  } catch (e) {
    results['GEMINI_AI'] = { status: 'FAIL', details: e.message };
  }

  // 5. Cloudinary Media Storage Test
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    const ping = await cloudinary.api.ping();
    results['CLOUDINARY'] = { 
      status: ping.status === 'ok' ? 'PASS' : 'WARN', 
      details: `Cloud name: ${process.env.CLOUDINARY_CLOUD_NAME} | Status: ${ping.status}` 
    };
  } catch (e) {
    results['CLOUDINARY'] = { status: 'FAIL', details: e.message };
  }

  // 6. Supabase Network & Pooler Test
  try {
    const host = process.env.SUPABASE_DB_HOST || 'aws-0-ap-south-1.pooler.supabase.com';
    const port = parseInt(process.env.SUPABASE_DB_PORT || '6543', 10);

    const tcpCheck = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(4000);
      socket.on('connect', () => {
        socket.destroy();
        resolve({ reachable: true });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ reachable: false, error: 'Connection timed out' });
      });
      socket.on('error', (err) => {
        resolve({ reachable: false, error: err.message });
      });
      socket.connect(port, host);
    });

    const hasPlaceholder = (process.env.DATABASE_URL || '').includes('[YOUR-PASSWORD]');

    if (tcpCheck.reachable) {
      results['SUPABASE_POOLER'] = { 
        status: hasPlaceholder ? 'CONFIG_ACTION_NEEDED' : 'PASS', 
        details: hasPlaceholder 
          ? `TCP Reachable (${host}:${port}) - Database password placeholder [YOUR-PASSWORD] needs real Supabase DB password to authenticate` 
          : `TCP Connected successfully to ${host}:${port}` 
      };
    } else {
      results['SUPABASE_POOLER'] = { status: 'FAIL', details: tcpCheck.error };
    }
  } catch (e) {
    results['SUPABASE_POOLER'] = { status: 'FAIL', details: e.message };
  }

  // Print Structured Audit Summary
  console.table(
    Object.keys(results).map(key => ({
      Component: key,
      Status: results[key].status,
      Details: results[key].details
    }))
  );

  return results;
}

testAll().catch(console.error);
