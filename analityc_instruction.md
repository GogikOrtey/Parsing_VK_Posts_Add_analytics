# Инструкция: запуск и CLI-аргументы `analityc.js`

Скрипт оценивает объём контента сообщества ВКонтакте (по выборке постов) и/или скачивает случайную картинку из стены.  
Токен API задаётся в файле `.env` (`ACCESS_TOKEN`) — через CLI его передавать не нужно.

---

## Два способа запуска

### 1. Через `run_analityc.js` (удобно для ручных настроек)

В `run_analityc.js` правите переменные (`groupId`, `isAnalitycs` и т.д.), затем:

```bash
node run_analityc.js
```

`run_analityc.js` сам вызовет `analityc.js` и передаст все параметры аргументами.

### 2. Напрямую через CLI

```bash
node analityc.js --groupId=creativityal --isAnalitycs=true
```

`groupId` обязателен, если включён хотя бы один режим (`isAnalitycs` или `DOWNLOAD_RANDOM_IMAGE`).  
Если оба режима выключены — скрипт ничего не делает.

---

## Режимы работы

| Режим | Флаг | Что делает |
|---|---|---|
| Аналитика | `--isAnalitycs=true` | Берёт первые N постов, считает среднее число картинок и их вес, экстраполирует на всю стену |
| Случайная картинка | `--DOWNLOAD_RANDOM_IMAGE=true` | Скачивает случайную картинку из случайного поста в `temp/` и открывает её |

Оба режима можно включить одновременно — сначала аналитика, затем случайная картинка.

---

## Формат аргументов

Поддерживаются оба варианта:

```bash
--имя=значение
--имя значение
```

Примеры:

```bash
node analityc.js --groupId=snowarts
node analityc.js --groupId snowarts
node analityc.js --isAnalitycs=true --SAMPLE_POSTS_COUNT=30
```

### Булевы значения

Принимаются: `true` / `false`, `1` / `0`, `yes` / `no`, `y` / `n`, `on` / `off`  
(регистр не важен).

Флаг без значения тоже считается `true`:

```bash
node analityc.js --groupId=snowarts --DOWNLOAD_RANDOM_IMAGE
```

---

## Список параметров

| Аргумент | Тип | По умолчанию | Описание |
|---|---|---|---|
| `--groupId` | string | *(пусто, обязателен при запуске режимов)* | ID группы, короткое имя или ссылка |
| `--isAnalitycs` | bool | `true` | Запустить оценку объёма контента группы |
| `--DOWNLOAD_RANDOM_IMAGE` | bool | `false` | Скачать случайную картинку в `temp/` и открыть |
| `--SAMPLE_POSTS_COUNT` | int | `20` | Сколько первых постов брать для выборки (макс. 100 за запрос) |
| `--SERVICE_BYTES_PER_POST` | int | `50` | Оценка «служебного» веса на пост (байт) при экстраполяции |
| `--DOWNLOAD_BATCH_SIZE` | int | `5` | Сколько картинок качать параллельно в одном пакете |
| `--RANDOM_IMAGE_MAX_ATTEMPTS` | int | `15` | Попыток найти пост с картинкой в режиме случайной загрузки |
| `--tempDir` | string | `temp/` (рядом со скриптом) | Папка для сохранения случайной картинки |

---

## Примеры

Оценка объёма контента группы:

```bash
node analityc.js --groupId=https://vk.com/b1ackrockshooter --isAnalitycs=true
```

Аналитика по 50 постам:

```bash
node analityc.js --groupId=creativityal --isAnalitycs=true --SAMPLE_POSTS_COUNT=50
```

Только случайная картинка (без аналитики):

```bash
node analityc.js --groupId=snowarts --isAnalitycs=false --DOWNLOAD_RANDOM_IMAGE=true
```

Оба режима подряд:

```bash
node analityc.js --groupId=creativityal --isAnalitycs=true --DOWNLOAD_RANDOM_IMAGE=true
```

Случайная картинка в другую папку:

```bash
node analityc.js --groupId=creativityal --isAnalitycs=false --DOWNLOAD_RANDOM_IMAGE=true --tempDir=backup_temp/
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

## Что выводит аналитика

- общее число постов в группе;
- коэффициент среднего числа картинок в посте;
- средний вес одной картинки;
- примерную оценку веса всего контента группы.

Случайная картинка сохраняется в `temp/` (или в `--tempDir`) и открывается программой просмотра по умолчанию.

---

## Частые ошибки

| Сообщение / ситуация | Что сделать |
|---|---|
| Не указан ACCESS_TOKEN | Добавьте `ACCESS_TOKEN` в `.env` |
| Не указан groupId | Передайте `--groupId=...` или задайте группу в `run_analityc.js` |
| Ошибка VK API / группа не найдена | Проверьте `groupId` и токен |
| Не удалось найти пост с картинкой | Увеличьте `--RANDOM_IMAGE_MAX_ATTEMPTS` или проверьте, что в группе есть фото |
| Скрипт сразу завершился без вывода | Включены ли `--isAnalitycs` или `--DOWNLOAD_RANDOM_IMAGE`? |
