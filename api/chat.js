/**
 * AI Chat API для визитки — [cursor-ai-chatbot](https://github.com/evgyur/cursor-ai-chatbot)
 * Поддержка MiniMax API и fallback по базе знаний.
 */

const KNOWLEDGE = [
  { q: "Услуги и цены", a: "Персональная тренировка (60 мин) — 3500 ₽. Абонемент 8 тренировок — 22000 ₽. Консультация по питанию — 3000 ₽. Групповое занятие — 1000 ₽ с человека. Онлайн-консультация — 2500 ₽. Выступление на мероприятии (мотивационный спикинг) — от 20000 ₽." },
  { q: "Персональная тренировка", a: "Одна персональная тренировка 60 минут — 3500 ₽. В зале или на выезде. Абонемент 8 занятий — 22000 ₽." },
  { q: "Абонемент", a: "Абонемент на 8 персональных тренировок — 22000 ₽. Срок действия 2 месяца. Можно заморозить на 2 недели по запросу." },
  { q: "Питание", a: "Консультация по питанию — 3000 ₽. Разбор рациона, рекомендации под цели. Повторная консультация — 2000 ₽." },
  { q: "Групповые занятия", a: "Групповое занятие — 1000 ₽ с человека. Группы до 8 человек." },
  { q: "Онлайн", a: "Онлайн-консультация (Zoom/Telegram) — 2500 ₽. Онлайн-тренировки — по запросу." },
  { q: "Выступление мотивационный спикер", a: "Выступление на мероприятии — от 20000 ₽. Напишите на почту с описанием формата." },
  { q: "Контакты связь", a: "Связаться: johnny.sins@email.com, Telegram @johnny_sins. Отвечаю в течение дня." }
];

const SYSTEM_PROMPT = `Ты Джонни Синс — фитнес-тренер и мотивационный спикер. Отвечай кратко и по делу ТОЛЬКО на основе данных ниже. Не выдумывай цены. Если спрашивают то, чего нет в данных — предложи написать на почту johnny.sins@email.com или в Telegram @johnny_sins.

Данные об услугах и ценах:
${KNOWLEDGE.map(k => `- ${k.q}: ${k.a}`).join('\n')}`;

function answerFromKnowledge(message) {
  const lower = message.toLowerCase();
  for (const { q, a } of KNOWLEDGE) {
    const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (keywords.some(kw => lower.includes(kw))) return a;
  }
  return `По вашему вопросу лучше уточнить напрямую: почта johnny.sins@email.com или Telegram @johnny_sins. Кратко: персональная тренировка 3500 ₽, абонемент 8 занятий 22000 ₽, консультация по питанию 3000 ₽, выступления от 20000 ₽.`;
}

async function callMiniMax(apiKey, userMessage) {
  const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'M2-her',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      max_completion_tokens: 1024,
      temperature: 0.7
    })
  });
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (content) return content;
  throw new Error(data?.base_resp?.status_msg || 'Ошибка MiniMax');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Только POST' });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Нет сообщения' });
  }

  const apiKey = process.env.MINIMAX_API_KEY;

  try {
    const response = apiKey
      ? await callMiniMax(apiKey, message.trim())
      : answerFromKnowledge(message.trim());
    return res.status(200).json({ response });
  } catch (err) {
    console.error(err);
    const fallback = answerFromKnowledge(message.trim());
    return res.status(200).json({ response: fallback });
  }
};
