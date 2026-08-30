# Контекст проекта: Parsing VK Posts + Analytics

## Назначение
Парсер постов ВКонтакте: скачивает фото, текст, GIF и собирает ссылки на видео из стены сообщества. Токен API — в `.env` (`ACCESS_TOKEN`).

## Точки входа
- **`run_main.js`** — настройки запуска парсера (groupId, offset/count, лимиты по дате, флаги). В конце вызывает `main.js` через `spawn` с CLI-аргументами. (В старых заметках/инструкциях может фигурировать как `run.js`.)
- **`main.js`** — основная логика парсинга. Параметры читает из CLI (`--key=value` или `--key value`); без аргументов — дефолты (кроме `groupId`, он обязателен). Общее число постов берёт из `wall.get` → `response.count`.
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

## Важные особенности / баги
- В `main.js` общее число постов на стене берётся из `wall.get` → `response.count`. Раньше ошибочно писали `item.id` (ID первого поста) в лог и в `allCountPostOfThisGroup` — это не количество постов.
- Точка входа парсера в репозитории: `run_main.js` (в старых заметках может фигурировать как `run.js`).
- По завершении `main.js` открывает папку Session (`openSaveFolder`), пишет `PARSER_EXIT ok` и делает `process.exit()`. Открытие проводника — detached, на exit не влияет.

## Ожидание завершения парсера (для агента)
**Не ждать по русским фразам** в логе («до указанной даты», «успешно завершилась» и т.п.) — ложные срабатывания и срывы при сообщении пользователя в чат.

Надёжные способы (по приоритету):
1. **Foreground:** `Shell` → `node run_main.js` с `block_until_ms` ≥ ожидаемого времени (напр. `600000`). Инструмент сам ждёт **exit** процесса; после возврата — CursorNotify.
2. **Background + статус:** `block_until_ms: 0`, затем опрос `AwaitShell` с `block_until_ms: 0` (без pattern) и чтение шапки терминала (`status` / `exit_code`), либо конец хода и системный notification о завершении shell.
3. **Pattern только запасной:** единственный надёжный маркер в stdout — ASCII-строка `PARSER_EXIT` (не `exit_code` в footer — он pattern’ом не матчится).

После успеха слать CursorNotify.

## Стек
Node.js (ES modules), `node-fetch`, `moment`, `sharp`, `axios`, `dotenv`, Puppeteer (для видео-даунлоадера).
