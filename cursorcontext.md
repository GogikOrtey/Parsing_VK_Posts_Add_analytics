# Контекст проекта: Parsing VK Posts + Analytics

## Назначение
Парсер постов ВКонтакте: скачивает фото, текст, GIF и собирает ссылки на видео из стены сообщества. Токен API — в `.env` (`ACCESS_TOKEN`).

## Точки входа
- **`run.js`** — настройки запуска парсера (groupId, offset/count, лимиты по дате, флаги). В конце вызывает `main.js` через `spawn` с CLI-аргументами.
- **`main.js`** — основная логика парсинга. Параметры читает из CLI (`--key=value` или `--key value`); без аргументов — дефолты (кроме `groupId`, он обязателен).
- **`run_analityc.js`** — настройки аналитики (группа, режимы, размер выборки). В конце вызывает `analityc.js` с CLI-аргументами.
- **`analityc.js`** — оценка объёма контента группы и/или скачивание случайной картинки. Параметры из CLI.

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

## CLI-параметры `analityc.js`
| Аргумент | Тип | По умолчанию |
|---|---|---|
| `--groupId` | string | `''` (обязателен при запуске режимов) |
| `--isAnalitycs` | bool | `true` |
| `--DOWNLOAD_RANDOM_IMAGE` | bool | `false` |
| `--SAMPLE_POSTS_COUNT` | int | `20` |
| `--SERVICE_BYTES_PER_POST` | int | `50` |
| `--DOWNLOAD_BATCH_SIZE` | int | `5` |
| `--RANDOM_IMAGE_MAX_ATTEMPTS` | int | `15` |
| `--tempDir` | string | `temp/` |

Пример прямого запуска парсера:
```
node main.js --groupId=https://vk.ru/nekomi_waifu --startCount=20 --allCount=-1
```

Обычный запуск парсера с настройками из файла:
```
node run.js
```

Запуск аналитики:
```
node run_analityc.js
node analityc.js --groupId=creativityal --isAnalitycs=true
```

## Связанные файлы
- `main_parser_instruction.md` — инструкция по запуску и CLI-аргументам `main.js` / `run.js`
- `analityc_instruction.md` — инструкция по запуску и CLI-аргументам `analityc.js` / `run_analityc.js`
- `video_downloader 2.js` — отдельная загрузка видео по ссылкам
- `Задачи.md` — бэклог

## Стек
Node.js (ES modules), `node-fetch`, `moment`, `sharp`, `axios`, `dotenv`, Puppeteer (для видео-даунлоадера).
