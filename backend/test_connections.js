require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const net = require('net');

async function testAllConnections() {
  console.log('====================================================');
  console.log('       FINDORA AI - ENVIRONMENT CONNECTION TEST      ');
  console.log('====================================================\n');

  const results = {
    brevoSmtp: { status: 'PENDING', message: '' },
    cloudinary: { status: 'PENDING', message: '' },
    supabaseHost: { status: 'PENDING', message: '' }
  };

  // 1. TEST BREVO SMTP
  console.log('[1/3] Testing Brevo SMTP Relay...');
  console.log(`      Host: ${process.env.SMTP_HOST || 'smtp-relay.brevo.com'}:${process.env.SMTP_PORT || 587}`);
  console.log(`      User: ${process.env.SMTP_USER}`);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });

    await transporter.verify();
    results.brevoSmtp = {
      status: 'SUCCESS',
      message: 'SMTP authentication verified successfully with Brevo!'
    };
    console.log('      ✅ Brevo SMTP: CONNECTED & AUTHENTICATED\n');
  } catch (err) {
    results.brevoSmtp = {
      status: 'FAILED',
      message: err.message
    };
    console.log(`      ❌ Brevo SMTP Failed: ${err.message}\n`);
  }

  // 2. TEST CLOUDINARY
  console.log('[2/3] Testing Cloudinary Storage API...');
  console.log(`      API Key: ${process.env.CLOUDINARY_API_KEY}`);
  console.log(`      Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);

  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const pingRes = await cloudinary.api.ping();
    results.cloudinary = {
      status: 'SUCCESS',
      message: `Cloudinary ping successful: status=${pingRes.status}`
    };
    console.log('      ✅ Cloudinary: CONNECTED & AUTHENTICATED\n');
  } catch (err) {
    results.cloudinary = {
      status: 'FAILED',
      message: err.message
    };
    console.log(`      ❌ Cloudinary Failed: ${err.message}\n`);
  }

  // 3. TEST SUPABASE POSTGRES HOST REACHABILITY & CONNECTION STRING
  console.log('[3/3] Testing Supabase PostgreSQL Database...');
  const host = process.env.SUPABASE_DB_HOST || 'aws-0-ap-south-1.pooler.supabase.com';
  const port = parseInt(process.env.SUPABASE_DB_PORT || '6543', 10);
  const dbUrl = process.env.DATABASE_URL || '';

  console.log(`      Host: ${host}:${port}`);
  console.log(`      User: ${process.env.SUPABASE_DB_USER}`);
  console.log(`      Database URL: ${dbUrl.replace(/:[^:@]*@/, ':****@')}`);

  // Test TCP Reachability first
  const tcpCheck = await new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(8000);

    socket.on('connect', () => {
      socket.destroy();
      resolve({ success: true });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: 'Connection timed out' });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ success: false, error: err.message });
    });

    socket.connect(port, host);
  });

  if (tcpCheck.success) {
    console.log('      ✅ Supabase Host TCP Port 6543: REACHABLE & OPEN');
    
    // Check if password placeholder is still present
    if (dbUrl.includes('[YOUR-PASSWORD]')) {
      results.supabaseHost = {
        status: 'PASSWORD_NEEDED',
        message: 'Supabase host port 6543 is reachable and accepting connections, but your password is still set to placeholder [YOUR-PASSWORD] in .env. Please provide your Supabase database password to authenticate queries.'
      };
      console.log('      ⚠️  Supabase: Needs actual database password (currently [YOUR-PASSWORD] placeholder)\n');
    } else {
      results.supabaseHost = {
        status: 'SUCCESS',
        message: 'Supabase host is reachable!'
      };
      console.log('      ✅ Supabase: CONNECTED\n');
    }
  } else {
    results.supabaseHost = {
      status: 'FAILED',
      message: `Could not reach ${host}:${port} - ${tcpCheck.error}`
    };
    console.log(`      ❌ Supabase Failed: ${tcpCheck.error}\n`);
  }

  console.log('====================================================');
  console.log('                    SUMMARY RESULT                   ');
  console.log('====================================================');
  console.log(` Brevo SMTP : ${results.brevoSmtp.status} - ${results.brevoSmtp.message}`);
  console.log(` Cloudinary : ${results.cloudinary.status} - ${results.cloudinary.message}`);
  console.log(` Supabase   : ${results.supabaseHost.status} - ${results.supabaseHost.message}`);
  console.log('====================================================\n');

  return results;
}

testAllConnections().catch(console.error);
