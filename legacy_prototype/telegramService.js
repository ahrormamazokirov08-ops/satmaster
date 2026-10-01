const https = require('https');
const fs = require('fs');
const path = require('path');

// Basic .env loader (zero external dependencies required)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    } catch (e) {
      console.warn('Could not read .env file:', e.message);
    }
  }
}

loadEnv();

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatTelegramMessage(data) {
  const answers = data.answers || [];
  const sender = data.user || null;
  const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : new Date().toLocaleString();

  let msg = `💖 <b>New Romantic Quiz Response!</b> 💌\n`;
  msg += `<i>Someone special just completed your questionnaire:</i>\n\n`;

  if (sender && (sender.first_name || sender.username)) {
    const name = [sender.first_name, sender.last_name].filter(Boolean).join(' ');
    const handle = sender.username ? ` (@${sender.username})` : '';
    msg += `👤 <b>Partner:</b> ${escapeHtml(name)}${escapeHtml(handle)}\n\n`;
  }

  answers.forEach((item, index) => {
    const qNum = index + 1;
    const question = escapeHtml(item.question);
    const answer = escapeHtml(item.answer);
    const dodgeCount = item.dodgeCount || 0;

    let dodgeNote = '';
    if (dodgeCount > 0) {
      dodgeNote = ` <i>(dodged ${dodgeCount} time${dodgeCount > 1 ? 's' : ''}! 🏃💨)</i>`;
    }

    // Special heart for question 8 or positive answers
    let heartEmoji = '';
    if (qNum === 8) {
      heartEmoji = ' 💛✨';
    }

    msg += `<b>${qNum}. ${question}</b>\n`;
    msg += `   └ <b>${answer}</b>${heartEmoji}${dodgeNote}\n\n`;
  });

  msg += `🕒 <i>Completed on: ${escapeHtml(timestamp)}</i>\n`;
  msg += `✨ <i>Sent with love via Romantic Questionnaire Bot</i>`;

  return msg;
}

async function sendTelegramMessage(formattedHtml) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const isConfigured = token && chatId && 
    token !== 'your_telegram_bot_token_here' && 
    chatId !== 'your_telegram_chat_id_here';

  if (!isConfigured) {
    console.log('\n' + '='.repeat(50));
    console.log('💌 [MOCK TELEGRAM BOT NOTIFICATION]');
    console.log('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured in .env');
    console.log('Here is the message that would be sent to Telegram:');
    console.log('='.repeat(50));
    console.log(formattedHtml.replace(/<[^>]*>/g, '')); // print plain text to console
    console.log('='.repeat(50) + '\n');
    
    return {
      success: true,
      mock: true,
      message: 'Logged answer locally. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env to receive it directly in Telegram!'
    };
  }

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      chat_id: chatId,
      text: formattedHtml,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.ok) {
            resolve({ success: true, result: json.result });
          } else {
            console.error('Telegram API error:', json.description);
            resolve({ success: false, error: json.description });
          }
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse Telegram API response' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('Telegram request network error:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  loadEnv,
  formatTelegramMessage,
  sendTelegramMessage
};
