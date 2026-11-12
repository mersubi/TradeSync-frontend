# 📦 Архитектура и описание проекта TradeSync (Frontend)

Документ содержит полное описание архитектуры, дерева каталогов, дизайн-системы «Fresh Lime», назначения компонентов и структуры клиентской части системы **TradeSync** (автоматизация B2B-закупок шин с ML-сопоставлением прайс-листов и алгоритмом MILP-оптимизации сплита заказов).

---

## 🌲 Дерево проекта

```text
TradeSync_project/
├── .env                        # Переменные окружения (VITE_API_URL, VITE_WS_URL)
├── .github/                    # Настройки CI/CD и GitHub Actions
├── .vscode/                    # Настройки редактора локального окружения
├── public/                     # Статические ресурсы (favicon.svg)
├── src/
│   ├── api/                    # Слой сетевого взаимодействия с FastAPI
│   │   ├── auth.ts             # API-вызовы для авторизации и регистрации (/auth/*)
│   │   ├── client.ts           # Инстанс Axios с интерцепторами JWT-токена и 401
│   │   └── procurement.ts      # API закупочных сессий, ML-валидации, MILP и 1С (/api/v1/procurement/*)
│   ├── components/             # Бизнес-компоненты и базовый UI-кит
│   │   ├── ui/                 # Переиспользуемые базовые UI-компоненты
│   │   │   ├── BaseButton.vue      # Единая кнопка со спиннером загрузки и вариантами
│   │   │   ├── BaseCard.vue        # Универсальная карточка (rounded-2xl, мягкая тень)
│   │   │   ├── ConfidenceBadge.vue # Бейдж «Светофор» для отображения уверенности ML
│   │   │   ├── EmptyState.vue      # Пустое состояние с иконкой и подсказкой
│   │   │   └── ProcessStepper.vue  # Индикатор шагов бизнес-процесса (1–4)
│   │   ├── MainLayout.vue      # Каркас приложения (графитовый сайдбар + светлая шапка)
│   │   ├── MLProgressBar.vue   # Живой WebSocket-прогресс ML-обработки
│   │   ├── MatchingTable.vue   # Таблица сопоставления («Светофор» + Active Learning)
│   │   └── SplitOptimizer.vue  # Панель MILP-оптимизации сплита и выгрузки в 1С
│   ├── composables/            # Vue-композаблы (Composition API)
│   │   └── useWebSocket.ts     # Реактивное подключение к WebSocket прогресса
│   ├── router/                 # Настройки Vue Router и Guard-логика (доступы по ролям)
│   │   └── index.ts
│   ├── services/               # Бизнес-логика вне компонентов
│   │   └── ExportService.ts    # Сервис генерации Blob для JSON/CSV (Excel) выгрузки
│   ├── store/                  # Стейт-менеджмент (Pinia)
│   │   └── authStore.ts        # Хранилище сессии пользователя и декодирование JWT
│   ├── utils/                  # Чистые функции-утилиты
│   │   ├── confidence.ts       # Пороги и функции логики «Светофора» (Traffic Light)
│   │   └── sessionStatus.ts    # Русские подписи и стили статусов закупочных сессий
│   ├── views/                  # Страницы (экраны) приложения
│   │   ├── LoginView.vue       # Вход и регистрация (split-screen)
│   │   ├── DashboardView.vue   # Обзор закупок, метрики и быстрые шаги
│   │   ├── UploadView.vue      # Шаг 1: Загрузка прайс-листа (.xlsx/.csv)
│   │   ├── ValidationView.vue  # Шаг 2: ML-валидация и ручная корректировка
│   │   └── MatrixView.vue      # Шаг 3–4: Сводная матрица цен, сплит и экспорт в 1С
│   ├── App.vue                 # Корневой компонент Vue
│   ├── main.ts                 # Точка входа (инициализация Vue, Pinia, Router)
│   └── style.css               # Точка входа Tailwind CSS v4 и дизайн-токены (@theme)
├── index.html                  # Главный HTML-шаблон (шрифты Inter и JetBrains Mono)
├── package.json                # Манифест проекта и зависимости (npm)
├── postcss.config.js           # Настройка PostCSS (@tailwindcss/postcss)
├── tsconfig.json               # Основная конфигурация TypeScript
└── vite.config.ts              # Конфигурация сборщика Vite и прокси к FastAPI
```

---

## 🎨 Дизайн-система «Fresh Lime» (шпаргалка для защиты)

### 1. Цветовая палитра и дизайн-токены (`src/style.css`)
В Tailwind CSS v4 конфигурация задаётся прямо в CSS через директиву `@theme`. Все фирменные оттенки вынесены в переменные `--color-brand-*`:
- **Фон приложения:** `zinc-50` — чистый светлый фон, не утомляющий глаза при работе с таблицами.
- **Карточки:** `bg-white ring-1 ring-zinc-200/70 shadow-soft rounded-2xl`.
- **Контрастный сайдбар и акценты:** `zinc-950` в сочетании с лаймовым акцентом `brand-400` (`lime-400`) для главных кнопок и активного пункта меню.
- **Типографика:**
  - `Inter` (`--font-sans`) — для текста интерфейса.
  - `JetBrains Mono` (`--font-mono` + `tabular-nums`) — моноширинный шрифт для цен, артикулов (SKU), процентов и счётчиков, чтобы разряды чисел выравнивались строго друг под другом.

### 2. Логика «Светофора» (Traffic Light) — `src/utils/confidence.ts`
Вся логика расчёта уровня уверенности ML-модели вынесена в одну чистую функцию `getConfidenceLevel(score)`:
| Уровень | Диапазон `score` | Цвет бейджа | Смысл для закупщика |
| :--- | :--- | :--- | :--- |
| **`high`** | `> 0.85` (> 85%) | 🟢 Лаймовый (`bg-lime-100 text-lime-800`) | Высокая уверенность — сопоставлено автоматически |
| **`medium`** | `0.60 – 0.85` (60–85%) | 🟡 Янтарный (`bg-amber-100 text-amber-800`) | Средняя уверенность — рекомендуется проверить |
| **`low`** | `< 0.60` (< 60%) | 🔴 Коралловый (`bg-rose-100 text-rose-700`) | Низкая уверенность — требуется ручной выбор эталона |

### 3. Сквозной бизнес-процесс (4 шага)
Компонент `ProcessStepper.vue` отображает прогресс закупщика на всех рабочих экранах:
1. **Загрузка прайса (`/upload`)** → отправка файла `.xlsx/.csv` в `POST /api/v1/procurement/upload` и отслеживание прогресса через WebSocket `/api/v1/ws/procurement/{session_id}`.
2. **ML-валидация (`/validation`)** → фильтрация по цветам светофора, ручная перепривязка спорных позиций (`PATCH /api/v1/procurement/items/{item_id}`, Active Learning) и утверждение сессии (`POST /approve`).
3. **Матрица и сплит (`/matrix`)** → сравнение цен поставщиков с подсветкой лучшей цены в строке и запуск MILP-оптимизатора (`POST /optimize`).
4. **Экспорт в 1С (`/matrix`)** → скачивание готовой спецификации в стандарте **1С CommerceML 2.08 XML** (`GET /export/1c?format=xml`), Excel (CSV с UTF-8 BOM) или JSON.

---

## 📋 Навигация по ключевым техническим модулям

### 1. `src/api/client.ts`, `src/api/auth.ts` и `src/api/procurement.ts`
- **`client.ts`**: настроен экземпляр Axios. Request-интерцептор автоматически прикрепляет JWT-токен (`Authorization: Bearer <token>`), а Response-интерцептор при получении `401 Unauthorized` очищает `localStorage` и генерирует глобальное браузерное событие `tradesync:unauthorized`.
- **`procurement.ts`**: строго типизированные методы для всех эндпоинтов бэкенда (поставщики, сессии, загрузка файлов через `FormData`, ручной рематчинг, оптимизация и выгрузка `Blob`).

### 2. `src/store/authStore.ts`
Хранилище Pinia на Composition API (`defineStore('auth', () => { ... })`). Хранит `user` и `token`, декодирует payload JWT-токена (`sub`, `role`) и предоставляет метод `hasRole()` для проверки прав доступа в навигационном гарде роутера.

### 3. `src/composables/useWebSocket.ts`
Инкапсулирует работу с браузерным `WebSocket`. Возвращает реактивные ссылки (`progress`, `status`, `matchedItems`, `totalItems`), которые автоматически обновляют полосу прогресса `MLProgressBar.vue`, и гарантированно закрывает соединение в хуке `onUnmounted`.

---

## 🚀 Стек технологий
* **Ядро:** Vue 3 (`<script setup>`, Composition API), TypeScript, Vite
* **Стейт и маршрутизация:** Pinia, Vue Router
* **Стилизация и иконки:** Tailwind CSS v4 (`@theme`), `@lucide/vue`
* **Сетевой слой:** Axios, нативный WebSocket API

## 💻 Запуск проекта для разработки

1. **Установка зависимостей:**
   ```bash
   npm install
   ```
2. **Запуск dev-сервера (вместе с Vite Proxy на `http://localhost:8000`):**
   ```bash
   npm run dev
   ```
3. **Проверка типов и production-сборка:**
   ```bash
   npm run build
   ```
