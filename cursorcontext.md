# Контекст проекта: Parsing VK Posts + Analytics

## Назначение
Парсер постов ВКонтакте: скачивает фото, текст, GIF и собирает ссылки на видео из стены сообщества. Токен API — в `.env` (`ACCESS_TOKEN`).

## Точки входа
- **`run.js`** — настройки запуска (groupId, offset/count, лимиты по дате, флаги). В конце вызывает `main.js` через `spawn` с CLI-аргументами.
- **`main.js`** — основная логика парсинга. Параметры читает из CLI (`--key=value` или `--key value`); без аргументов — дефолты (кроме `groupId`, он обязателен).

## CLI-параметры `main.js`
| Аргумент | Тип | По умолчанию |
|---|---|---|
| `--groupId` | string | `''` (обязателен) |
| `--startOffset` | int | `0` |
| `--startCount` | int | `20` |
| `--allCount` | int | `-1` (без лимита) |
| `--collection_time_before_date` | string | `''` |
| `--collection_time_before_time` | string | `''` |
| `--bool_isStopedBeforePool` | bool | `false` |
| `--mainPath` | string | `main/` |
| `--bool_isinfoShow` | bool | `false` |

Пример прямого запуска:
```
node main.js --groupId=https://vk.ru/nekomi_waifu --startCount=20 --allCount=-1
```

Обычный запуск с настройками из файла:
```
node run.js
```

## Связанные файлы
- `main_parser_instruction.md` — инструкция по запуску и CLI-аргументам `main.js` / `run.js`
- `video_downloader 2.js` — отдельная загрузка видео по ссылкам
- `analityc.js` — аналитика
- `Задачи.md` — бэклог

## Стек
Node.js (ES modules), `node-fetch`, `moment`, `sharp`, `axios`, `dotenv`, Puppeteer (для видео-даунлоадера).
