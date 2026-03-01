# Автодеплой визитки на Vercel при git push

## Что уже сделано

- Проект **test-project** создан на Vercel, визитка задеплоена.
- Продакшен-URL: **https://test-project-kappa-one.vercel.app**
- Ветка **master** запушена на GitHub (репозиторий: srgsprn/test-project или srgsprn/visitka).

## Включить автодеплой при каждом git push

1. Откройте: https://vercel.com/thirdaugust90-4031s-projects/test-project/settings/git  
2. В блоке **Git** нажмите **Connect Git Repository** (или **Edit**).
3. Выберите **GitHub** и разрешите Vercel доступ к аккаунту, если попросит.
4. Укажите репозиторий: **srgsprn/test-project** (или **srgsprn/visitka**, если репо переименован).
5. **Production Branch** задайте **master**, чтобы прод обновлялся при `git push origin master`.
6. Сохраните настройки.

После этого каждый **git push origin master** будет автоматически запускать новый деплой на Vercel.

## Чат-бот на сайте

На визитке встроен AI-чат (виджет в правом нижнем углу). Бэкенд — serverless-функция `/api/chat`.

- **Без API-ключа:** бот отвечает по базе знаний (услуги, цены, контакты).
- **С MiniMax:** в настройках проекта Vercel добавь переменную окружения `MINIMAX_API_KEY` (ключ с https://platform.minimax.io) — тогда ответы будет генерировать нейросеть.

База знаний: `knowledge.json`. Логика и виджет — по скиллу [cursor-ai-chatbot](https://github.com/evgyur/cursor-ai-chatbot).

## Деплой вручную через CLI

```bash
vercel --prod
```

(Из папки проекта, с настроенным `VERCEL_TOKEN` в окружении.)
