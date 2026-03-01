/**
 * AI Chat API для визитки — [cursor-ai-chatbot](https://github.com/evgyur/cursor-ai-chatbot)
 * Поддержка MiniMax API и fallback по базе знаний. Доп. ответы из knowledge.json.
 */

const path = require('path');
const fs = require('fs');

// Триггеры — варианты формулировок, по которым выбирается ответ
const KNOWLEDGE = [
  {
    triggers: ["услуг", "цен", "прайс", "сколько сто", "что предлаг", "чем занима", "какие услуг", "прайс-лист"],
    a: "Персональная тренировка (60 мин) — 3500 ₽. Абонемент 8 тренировок — 22000 ₽. Консультация по питанию — 3000 ₽. Групповое занятие — 1000 ₽ с человека. Онлайн-консультация — 2500 ₽. Выступление на мероприятии — от 20000 ₽. Подробнее по любому пункту — спрашивайте."
  },
  {
    triggers: ["персональн", "тренировка", "одно занятие", "одно заняти", "разов", "заняти", "тренировк", "цена заняти", "стоимость тренировки", "сколько занятие", "индивидуал"],
    a: "Одна персональная тренировка 60 минут — 3500 ₽. В зале или на выезде. Абонемент на 8 занятий — 22000 ₽ (выгоднее)."
  },
  {
    triggers: ["абонемент", "8 занятий", "8 тренировок", "пакет", "замороз"],
    a: "Абонемент на 8 персональных тренировок — 22000 ₽. Срок действия 2 месяца. Можно заморозить на 2 недели по запросу."
  },
  {
    triggers: ["питани", "диет", "рацион", "еда", "консультация по питанию", "питание цена"],
    a: "Консультация по питанию — 3000 ₽. Разбор рациона, рекомендации под цели (похудение, набор массы). Повторная консультация — 2000 ₽."
  },
  {
    triggers: ["групп", "групповое", "вместе с друг", "команд"],
    a: "Групповое занятие — 1000 ₽ с человека. Группы до 8 человек. Расписание уточняйте."
  },
  {
    triggers: ["онлайн", "zoom", "удалённ", "дистанцион", "онлайн консультация", "онлайн тренировка"],
    a: "Онлайн-консультация (Zoom/Telegram) — 2500 ₽. Онлайн-тренировки — по запросу."
  },
  {
    triggers: ["выступлен", "спикер", "мотивац", "мероприят", "корпоратив", "конференц", "пригласить"],
    a: "Выступление на мероприятии (мотивационный спикинг) — от 20000 ₽. Зависит от формата и длительности. Напишите на почту johnny.sins@email.com с описанием — подготовлю предложение."
  },
  {
    triggers: ["связаться", "контакт", "записаться", "запись", "телефон", "почта", "email", "телеграм", "telegram", "написать", "связь", "как связаться", "как записаться"],
    a: "Связаться со мной: почта johnny.sins@email.com, Telegram @johnny_sins. Отвечаю в течение дня. Напишите — подберём время."
  },
  {
    triggers: ["расписан", "когда мож", "когда приед", "выезд", "приехать", "тренер приед", "свободн", "время занятий", "when can you", "schedule", "available", "приехать на тренировку", "могу приехать", "когда занятие", "когда тренировка"],
    a: "Расписание подбираем индивидуально под вас. Могу приехать к вам — в зал, домой или в офис — или занимаемся у меня. Напишите в Telegram @johnny_sins или на johnny.sins@email.com, когда вам удобно: предложу свободные слоты и договоримся о первом занятии."
  },
  {
    triggers: ["какие цели", "каких целей", "чем помочь", "помочь достичь", "достичь цел", "цели тренировок", "что могу достичь", "what goals", "help achieve", "какие результаты", "результат тренировок"],
    a: "Помогаю с разными целями: похудение и снижение веса, набор мышечной массы, повышение выносливости, подготовка к соревнованиям, общее оздоровление и тонус, выработка привычки к тренировкам и мотивация. На первой встрече обсудим вашу цель и составлю план. Напишите в Telegram @johnny_sins или на johnny.sins@email.com — подберём формат."
  },
  {
    triggers: ["спасибо", "благодар", "thanks", "thank you", "благодарю"],
    a: "Пожалуйста! Если появятся ещё вопросы — пишите в Telegram @johnny_sins или на johnny.sins@email.com. Удачи с целями!"
  },
  {
    triggers: ["кто вы", "кто ты", "представься", "who are you", "расскажи о себе"],
    a: "Я Джонни Синс — фитнес-тренер и мотивационный спикер. Провожу персональные и групповые тренировки, консультации по питанию, выступления на мероприятиях. Могу рассказать об услугах и ценах или как со мной связаться — спросите."
  }
];

const SYSTEM_PROMPT = `Ты Джонни Синс — фитнес-тренер и мотивационный спикер. Отвечай кратко и по делу ТОЛЬКО на основе данных ниже. Не выдумывай цены. Если спрашивают то, чего нет в данных — предложи написать на почту johnny.sins@email.com или в Telegram @johnny_sins.

Данные об услугах и ценах:
${KNOWLEDGE.map(k => `- ${k.triggers.join(', ')}: ${k.a}`).join('\n')}`;

function loadExtraKnowledge() {
  try {
    const dirs = [process.cwd(), path.join(process.cwd(), '..')];
    for (const dir of dirs) {
      const filePath = path.join(dir, 'knowledge.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const list = Array.isArray(data) ? data : (data.entries || []);
        return list.map(item => {
          if (item.triggers && item.a) return item;
          if (item.q && item.a) {
            const words = item.q.toLowerCase().replace(/[^\wа-яё\s]/gi, ' ').split(/\s+/).filter(w => w.length > 1);
            return { triggers: [...new Set(words)], a: item.a };
          }
          return null;
        }).filter(Boolean);
      }
    }
  } catch (e) { /* ignore */ }
  return [];
}

function answerFromKnowledge(message) {
  const lower = message.toLowerCase().trim();
  if (lower.length < 2) return "Напишите, пожалуйста, вопрос — например: какие у вас цены? когда можете приехать? какие цели помогаете достичь?";

  const allEntries = [...KNOWLEDGE, ...loadExtraKnowledge()];
  let bestMatch = null;
  let bestScore = 0;

  for (const entry of allEntries) {
    const triggers = entry.triggers || [];
    let score = 0;
    for (const t of triggers) {
      if (lower.includes(t.toLowerCase())) score += t.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry.a;
    }
  }

  if (bestMatch) return bestMatch;

  return "Могу рассказать про расписание и выезд тренера, цены на тренировки и абонементы, цели (похудение, масса, выносливость), питание и как записаться. Напишите вопрос или уточните: johnny.sins@email.com, Telegram @johnny_sins.";
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
