# My Life

Личное мобильное приложение для планирования жизни: задачи, календарь, расходы, привычки, цели и уведомления.

Стек: **Expo (React Native) + TypeScript**. Данные локально (AsyncStorage). OTA через **EAS Update**.

Проект Expo: https://expo.dev/accounts/mehebbet55/projects/my-life

## Запуск у себя

```bash
cd my-life
npm install
npx expo start
```

Отсканируй QR в **Expo Go** на iPhone (тот же аккаунт Expo).

## Вкладки

- Сегодня — обзор дня
- Задачи — todo с приоритетами и напоминаниями
- Календарь — события + дедлайны
- Расходы — категории и итоги месяца
- Ещё — цели, привычки, сферы, уведомления, OTA

## OTA-обновления (без новой сборки)

После первой сборки TestFlight / preview можно пушить JS-изменения:

```bash
# preview-канал
npx eas-cli update --channel preview --environment preview --message "описание"

# production (TestFlight / store)
npx eas-cli update --channel production --environment production --message "описание"
```

В приложении: **Ещё → Обновления (OTA)** — проверка вручную. При запуске баннер «Доступно обновление».

> В Expo Go OTA не применяется — только в standalone / TestFlight сборке.

`runtimeVersion` = `appVersion` (сейчас `1.0.0`). При смене native-зависимостей подними `version` в `app.json` и сделай новый build.

## TestFlight

1. Apple Developer Program
2. `npx eas-cli build --platform ios --profile production`
3. `npx eas-cli submit --platform ios --latest`

Bundle id: `com.mylife.planner`

## GitHub

```bash
gh repo create my-life --private --source=. --remote=origin --push
```
