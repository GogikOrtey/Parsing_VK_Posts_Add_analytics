# Инструкция: запуск и CLI-аргументы `main.js`

Парсер загружает контент из стены сообщества ВКонтакте (фото, текст, GIF, ссылки на видео).  
Токен API задаётся в файле `.env` (`ACCESS_TOKEN`) — через CLI его передавать не нужно.

---

## Два способа запуска

### 1. Через `run.js` (удобно для ручных настроек)

В `run.js` правите переменные (`groupId`, `startCount` и т.д.), затем:

```bash
node run.js
```

или:

```bash
npm start
```

`run.js` сам вызовет `main.js` и передаст все параметры аргументами.

### 2. Напрямую через CLI

```bash
node main.js --groupId=creativityal --startCount=20 --allCount=-1
```

`groupId` обязателен. Остальные аргументы можно не указывать — подставятся значения по умолчанию.

---

## Формат аргументов

Поддерживаются оба варианта:

```bash
--имя=значение
--имя значение
```

Примеры:

```bash
node main.js --groupId=snowarts
node main.js --groupId snowarts
node main.js --startCount=10 --bool_isinfoShow=true
```

### Булевы значения

Принимаются: `true` / `false`, `1` / `0`, `yes` / `no`, `y` / `n`, `on` / `off`  
(регистр не важен).

Флаг без значения тоже считается `true`:

```bash
node main.js --groupId=snowarts --bool_isinfoShow
```

---

## Список параметров

| Аргумент | Тип | По умолчанию | Описание |
|---|---|---|---|
| `--groupId` | string | *(пусто, обязателен)* | ID группы, короткое имя или ссылка (`224924750`, `creativityal`, `https://vk.ru/snowarts`) |
| `--startOffset` | int | `0` | С какого поста сверху начинать (`0` — с верха стены) |
| `--startCount` | int | `20` | Сколько постов запрашивать за один `wall.get` (лучше 10–20, максимум 100) |
| `--allCount` | int | `-1` | Сколько постов обработать всего (`-1` — без ограничения) |
| `--collection_time_before_date` | string | `''` | Нижняя граница по дате: `YYYY.MM.DD` (например `2026.07.25`). Пусто — без ограничения |
| `--collection_time_before_time` | string | `''` | Время к этой дате. Форматы: `02:43:50`, `02⁚43⁚50`, `02:43`, `2h 43m`. Пусто — `00:00:00` |
| `--bool_isStopedBeforePool` | bool | `false` | Останавливаться при первом опросе в стене |
| `--mainPath` | string | `main/` | Папка, куда создаются Session-директории с результатом |
| `--bool_isinfoShow` | bool | `false` | Дополнительные сообщения в консоль |

---

## Примеры

Загрузить всю стену сообщества:

```bash
node main.js --groupId=https://vk.ru/nekomi_waifu --allCount=-1
```

Только первые 50 постов:

```bash
node main.js --groupId=creativityal --allCount=50
```

Сдвинуться на 100 постов вниз и взять 20:

```bash
node main.js --groupId=snowarts --startOffset=100 --startCount=20 --allCount=20
```

До указанной даты (включительно), от верха стены вниз:

```bash
node main.js --groupId=creativityal --collection_time_before_date=2026.07.25 --collection_time_before_time=02:43:50
```

Остановиться на первом опросе:

```bash
node main.js --groupId=creativityal --bool_isStopedBeforePool=true
```

Сохранить сессию в другую папку и включить подробный лог:

```bash
node main.js --groupId=creativityal --mainPath=backup/ --bool_isinfoShow=true
```

---

## Перед запуском

1. В корне проекта должен быть `.env` с токеном:
   ```
   ACCESS_TOKEN=ваш_токен_vk_api
   ```
2. Зависимости установлены: `npm install`
3. Команды запускайте из корня проекта

---

## Куда сохраняется результат

Внутри `mainPath` (по умолчанию `main/`) создаётся папка вида:

```
Session [YYYY.MM.DD HH⁚mm⁚ss] Название группы/
```

Там же — фото, текстовые описания, списки ссылок на видео и GIF.

---

## Частые ошибки

| Сообщение / ситуация | Что сделать |
|---|---|
| Не указан Ключ доступа к API | Добавьте `ACCESS_TOKEN` в `.env` |
| Не указан groupId | Передайте `--groupId=...` или задайте группу в `run.js` |
| Не удалось получить информацию о группе | Проверьте правильность `groupId` / ссылки и токен |
| Папка с таким названием сессии уже существует | Подождите ~1 минуту и запустите снова |
