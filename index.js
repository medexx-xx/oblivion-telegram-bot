const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

app.post('/', async (req, res) => {
  try {
    const { message, callback_query } = req.body;

    if (message) {
      const chat_id = message.chat.id;
      const text = message.text || '';
      await sendButtons(chat_id, text);
    } else if (callback_query) {
      const chat_id = callback_query.message.chat.id;
      const [lang, prompt] = callback_query.data.split('|');
      const code = await generateCode(prompt, lang);
      await sendMessage(chat_id, `\`\`\`${lang}\n${code}\n\`\`\``);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error:', error);
    res.sendStatus(500);
  }
});

async function sendButtons(chatId, text) {
  const reply_markup = {
    inline_keyboard: [
      [
        { text: '🟨 JavaScript', callback_data: `javascript|${text}` },
        { text: '🐍 Python', callback_data: `python|${text}` }
      ]
    ]
  };
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `*${text}* — choose language`,
      parse_mode: 'Markdown',
      reply_markup
    })
  });
}

async function generateCode(prompt, lang) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral/mistral-7b-instruct',
      messages: [{ role: 'user', content: `Write ${lang} code for this: ${prompt}. Only respond with code.` }]
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '🤖 AI error – no code returned';
}

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    })
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
