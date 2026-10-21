# My Life

Личное мобильное приложение для планирования жизни: задачи на сегодня, цели, привычки и сферы (здоровье, карьера, финансы…).

Стек: **Expo (React Native) + TypeScript**. Данные пока хранятся локально на устройстве.

## Запуск у себя

```bash
cd my-life
npm install
npx expo start
```

Отсканируй QR в приложении **Expo Go** на iPhone.

## Структура

- `src/screens` — Сегодня / Цели / Привычки / Сферы
- `src/context` — состояние и сохранение
- `src/lib/api.ts` — клиент будущего API на твоём сервере
- `server/` — заготовка бэкенда

## TestFlight (только для себя)

Нужны:

1. **Apple Developer Program** (~$99/год) — без него TestFlight недоступен.
2. Аккаунт [Expo](https://expo.dev) и CLI: `npm i -g eas-cli`
3. Mac **не обязателен** для сборки — EAS Build собирает в облаке.

Шаги:

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios --latest
```

В App Store Connect создай приложение с bundle id `com.personal.mylife`,
добавь себя как внутреннего тестера TestFlight.

Пока нет Apple Developer — можно пользоваться через **Expo Go**.

## GitHub

Репозиторий: создай на github.com репозиторий `my-life` (private) и:

```bash
git remote add origin https://github.com/<твой-логин>/my-life.git
git push -u origin main
```

(`gh` на этой машине пока не установлен — можно поставить: `winget install GitHub.cli`)
