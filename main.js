// Файл: main.js
// Назначение: основная программа загрузки контента из постов ВКонтакте (фото, текст, GIF,
// ссылки на видео). Параметры запуска принимает из CLI-аргументов (или значения по умолчанию);
// ACCESS_TOKEN берётся из .env. Обычно запускается через run.js, можно и напрямую:
//   node main.js --groupId=creativityal --startCount=20 --allCount=-1
// Связан с: run.js (настройки и запуск), .env (ACCESS_TOKEN), папка main/ (сессии выгрузки).

import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'fs';
import https from 'https';
import moment from 'moment';
import crypto from 'crypto';
import sharp from 'sharp';
import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';


// ---------- CLI: разбор аргументов запуска ----------

// Разбирает process.argv в объект ключ→значение.
// Поддерживает --key=value и --key value. Используется при старте main.js.
function parseCliArgs(argv = process.argv) {
    const args = {};

    for (let i = 2; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;

        const body = token.slice(2);
        const eq = body.indexOf('=');

        if (eq !== -1) {
            args[body.slice(0, eq)] = body.slice(eq + 1);
            continue;
        }

        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
            args[body] = next;
            i++;
        } else {
            args[body] = 'true';
        }
    }

    return args;
}

// Преобразует строковый CLI-флаг в boolean; при пустом/неизвестном — defaultValue.
// Используется при распаковке bool_* параметров из аргументов.
function parseCliBool(value, defaultValue) {
    if (value === undefined || value === null || value === '') return defaultValue;
    const s = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
    return defaultValue;
}

// Преобразует CLI-значение в целое число; при пустом/нечисле — defaultValue.
// Используется при распаковке startOffset / startCount / allCount.
function parseCliInt(value, defaultValue) {
    if (value === undefined || value === null || value === '') return defaultValue;
    const n = Number.parseInt(String(value), 10);
    return Number.isFinite(n) ? n : defaultValue;
}

const cli = parseCliArgs();

// Ключ доступа к API (задаётся в файле .env)
const accessToken = process.env.ACCESS_TOKEN ?? '';

// Параметры запуска: CLI перекрывает значения по умолчанию
let groupId = cli.groupId ?? '';
let startOffset = parseCliInt(cli.startOffset, 0);
let startCount = parseCliInt(cli.startCount, 20);
let allCount = parseCliInt(cli.allCount, -1);
let collection_time_before_date = cli.collection_time_before_date ?? '';
let collection_time_before_time = cli.collection_time_before_time ?? '';
let bool_isStopedBeforePool = parseCliBool(cli.bool_isStopedBeforePool, false);
let mainPath = cli.mainPath ?? 'main/';
let bool_isinfoShow = parseCliBool(cli.bool_isinfoShow, false);


// ------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------

//                       ---------- Ниже - сама программа ----------


console.log(" ")
console.log("—————————————————————————————————————————————")
console.log("—————————————————————————————————————————————")
console.log("v1.1")
console.log("")
console.log("🔵 Вас приветствует программа загрузки контента из ВК!")
console.log("")


if (accessToken == '') {
    console.log("В программе не указан Ключ доступа к API. Его нужно указать в файле .env (переменная ACCESS_TOKEN)")
    console.log("Как получить Ключ доступа к API ВКонтакте - вы можете легко узнать в интернете. Это не займёт больше 2х минут")
    console.log('');
    console.log('🔴 Error! Программа остановлена с ошибкой');
    process.exit();
}

if (groupId == '') {
    console.log("Не указан groupId. Задайте его в run.js или передайте аргументом:")
    console.log("  node main.js --groupId=creativityal")
    console.log("  node run.js")
    console.log('');
    console.log('🔴 Error! Программа остановлена с ошибкой');
    process.exit();
}




let goodGroupName = ''; // Хорошее название группы, для создания папки с таим именем

// Извлекает идентификатор группы из числового id, короткого имени или ссылки vk.com/vk.ru/...
// Используется перед groups.getById для нормализации значения groupId из настроек.
function parseGroupIdInput(raw) {
    let value = String(raw).trim();

    const urlMatch = value.match(/(?:https?:\/\/)?(?:m\.)?vk\.(?:com|ru)\/([^/?#]+)/i);
    if (urlMatch) {
        value = urlMatch[1];
    }

    const publicClubMatch = value.match(/^(?:public|club|event)(\d+)$/i);
    if (publicClubMatch) {
        value = publicClubMatch[1];
    }

    return value;
}

groupId = parseGroupIdInput(groupId);

// Получаю название группы и числовой id для последующих запросов (wall.get и др.)
const groupInfoResponse = await fetch(
    `https://api.vk.com/method/groups.getById?group_id=${groupId}&access_token=${accessToken}&v=5.130`
).then(response => response.json());

if (groupInfoResponse.error || !groupInfoResponse.response?.[0]) {
    console.log('');
    console.log('🔴 Error! Программа остановлена с ошибкой');
    console.log('Не удалось получить информацию о группе, проверьте groupId');
    if (groupInfoResponse.error) {
        console.log(`Код ошибки VK API: ${groupInfoResponse.error.error_code}, сообщение: ${groupInfoResponse.error.error_msg}`);
    }
    process.exit();
}

const groupInfo = groupInfoResponse.response[0];
groupId = String(groupInfo.id);
goodGroupName = sanitizeFilename(groupInfo.name);
console.log("Название группы: " + goodGroupName);
console.log("ID группы: " + groupId);
console.log("");



// Функция, которая удаляет из полученной строки все недопустимые символы для именования файла
function sanitizeFilename(filename) {
    // Список недопустимых символов
    const invalidChars = /[~!@#$%^&*()+=\[\]{};':"\\|<>\/?]+/g;
    filename = filename.replace(/\n/g, " ");

    // // Удаление всех пробелов
    // filename = filename.replace(/\s/g, '-');

    // Удаление всех недопустимых символов
    return filename.replace(invalidChars, '');
}

// Та-же функция, только для именования файлов
function sanitizeFilename2(filename) {
    // Быстрые замены неликвидных символов. Что бы сохранить контекст, и попасть в рамки
    filename = filename.replace(/:/g, "⁚");
    filename = filename.replace(/\?/g, "‽");
    filename = filename.replace(/\n/g, " ");

    // Список недопустимых символов
    const invalidChars = /[~!@#$%^&*()+=\[\]{};':"\\|<>\/?]+/g;

    // Удаление всех недопустимых символов
    return filename.replace(invalidChars, '');
}

// Синхронная функция для загрузки изображения
// Благодаря ей мы ждём, пока изображение не загрузится, и только потом переходим к его сохранению
// Скачивает изображение по HTTPS-ссылке и возвращает Buffer.
// Используется в downloadImageWithRetries при сохранении фото из постов.
function downloadImage(photoUrl) {
    return new Promise((resolve, reject) => {
        https.get(photoUrl, (response) => {
            const data = [];

            response.on('data', (chunk) => data.push(chunk));
            response.on('end', () => resolve(Buffer.concat(data)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

// Для обработки возможных ошибок при запросах загрузки, используется эта функция
// Скачивает изображение с повторами при сетевых ошибках (до maxAttempts попыток).
// Используется в MainRequest при сохранении фото из постов.
async function downloadImageWithRetries(photoUrl, maxAttempts = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await downloadImage(photoUrl);
        } catch (err) {
            lastError = err;
            if (attempt < maxAttempts) {
                console.log(`⚠️ Не удалось загрузить изображение (попытка ${attempt}/${maxAttempts}): ${err.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    throw lastError;
}

// Выполняет fetch к VK API с повторами при сетевых/TLS-сбоях (до maxAttempts попыток).
// Используется в MainRequest для wall.get — нестабильная сеть не должна ронять весь парсинг.
async function fetchVkApiWithRetries(url, maxAttempts = 5) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await fetch(url);
            return await res.json();
        } catch (err) {
            lastError = err;
            const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 16000); // 1с, 2с, 4с, 8с, 16с
            if (attempt < maxAttempts) {
                console.log(`⚠️ Сетевая ошибка VK API (попытка ${attempt}/${maxAttempts}): ${err.message}`);
                console.log(`   Повтор через ${(delayMs / 1000).toFixed(0)} с...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    throw lastError;
}

// Создаю папку Session [Дата и время] - для устранения любых конфликтов
// В ней создаю папку с названием группы

// Текущее время и дата
let currDateTime = moment().format('YYYY.MM.DD HH⁚mm⁚ss');

// Пути задаются один раз, и потом используюся дальше в программе
let nameFlMainSession = mainPath + 'Session [' + currDateTime + '] ' + goodGroupName;

// Проверяю, существуют ли такая папка
if (fs.existsSync(nameFlMainSession)) {
    // Если да - то останавливаю программу
    console.log('');
    console.log('🔴 Error! Программа остановлена с ошибкой:');
    console.log('Папка с таким названием сессии уже существует!');
    console.log('Подождите 1 минуту, и запустите программу снова');
    process.exit();
}

// Создаём папку новой сессии
await fs.mkdirSync(nameFlMainSession, { recursive: true });
console.log('Папка новой сессии была успешно создана');

let floberGroupName = nameFlMainSession + '/' + goodGroupName; // Папка с названием группы

// Создаём в ней папку с именем назавния группы, из которой сохраняем контент
await fs.mkdirSync(floberGroupName, { recursive: true });





// Создаю .txt файл, для сохранения ссылок на видео
// (для того, что бы загрузить их позже)

// Заголовок текстового файла:
let data = 'Все ссылки на видео из постов\n\nГруппа: ' + goodGroupName + '\n\n';
// Путь к этому текстовому файлу:
let txtFile_allVideoLinks = nameFlMainSession + '/Ссылки на видео из группы ' + goodGroupName + '.txt';

await fs.writeFileSync(txtFile_allVideoLinks, data);


// // Добавление строк в этот текстовый файл:
// let dataAdd = "123"

// await fs.appendFileSync(txtFile_allVideoLinks, dataAdd, (err) => {
//     if (err) throw err;
// });

// let countPostsInThisGroup = 0;




// Создаю .txt файл, для сохранения ссылок на видео
// (для того, что бы загрузить их позже)

// Заголовок текстового файла:
let data2 = 'Все ссылки на gif из постов\n\nГруппа: ' + goodGroupName + '\n\n';
// Путь к этому текстовому файлу:
let txtFile_allGifLinks = nameFlMainSession + '/Ссылки на gif из группы ' + goodGroupName + '.txt';

await fs.writeFileSync(txtFile_allGifLinks, data2);








// Значения этих переменных изменяются, во время работы программы

let bool_isShowCountOfPosts = false;    // Мы уже вывели общее количество постов?
let bool_isWeGoingToPoll = false;       // Мы дошли до опроса в обработке постов? Если да, то дальнейшие посты обрабатываться не будут
let bool_isReachedCollectionDateLimit = false; // Дошли до нижней границы даты сбора? Если да — дальше не сохраняем и не запрашиваем
let bool_isReachedAllCountLimit = false; // Достигли allCount обработанных постов?

let counterWaitRequest = 0;             // Сколько запросов мы ждём в данный момент
let lastEventTime = 0;                  // Для отслеживания времени между запросами
let timeDifference = 0;                 // Разница между последним запросом
let int_lastNumberOfPost = -1;          // № последнего поста
let allCountPostOfThisGroup = 0;        // Общее количество постов в группе
let lastRequestCount = startCount;      // Сколько постов запросили в последнем wall.get

const oldStartOffset = startOffset;     // Значение оффсета, которое не меняется

// Сколько постов запросить в следующем wall.get с учётом startCount и остатка allCount.
// Используется в waitForCondition перед вызовом MainRequest.
function getNextRequestCount() {
    if (allCount == -1) {
        return startCount;
    }

    const alreadyProcessed = int_lastNumberOfPost + 1;
    const remaining = allCount - alreadyProcessed;
    if (remaining <= 0) {
        return 0;
    }

    return Math.min(startCount, remaining);
}




// Парсит строку времени границы сбора в часы/минуты/секунды.
// Поддерживает "HH:mm[:ss]", "HH⁚mm[:ss]", "Xh Ym [Zs]"; пустая строка → 00:00:00.
// Используется в parseCollectionCutoffUnix при разборе настроек collection_time_before_*.
function parseCollectionTime(timeStr) {
    if (timeStr == null || String(timeStr).trim() === '') {
        return { h: 0, m: 0, s: 0 };
    }

    const s = String(timeStr).trim().replace(/⁚/g, ':');

    const hmMatch = s.match(/^(\d+)\s*h(?:\s*(\d+)\s*m)?(?:\s*(\d+)\s*s)?$/i);
    if (hmMatch) {
        return {
            h: parseInt(hmMatch[1], 10),
            m: parseInt(hmMatch[2] || '0', 10),
            s: parseInt(hmMatch[3] || '0', 10)
        };
    }

    const colonMatch = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (colonMatch) {
        return {
            h: parseInt(colonMatch[1], 10),
            m: parseInt(colonMatch[2], 10),
            s: parseInt(colonMatch[3] || '0', 10)
        };
    }

    console.log('');
    console.log('🔴 Error! Не удалось разобрать время границы сбора: "' + timeStr + '"');
    console.log('Ожидаемые форматы: "02:43:50", "02⁚43⁚50", "02:43", "2h 43m" или пустая строка');
    process.exit(1);
}

// Собирает unix-timestamp нижней границы сбора из строк даты и времени.
// Возвращает null, если дата не задана (ограничение по дате отключено).
// Используется при старте программы и при сравнении с item.date в MainRequest.
function parseCollectionCutoffUnix(dateStr, timeStr) {
    if (dateStr == null || String(dateStr).trim() === '') {
        return null;
    }

    const datePart = String(dateStr).trim();
    const dateMatch = datePart.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    if (!dateMatch) {
        console.log('');
        console.log('🔴 Error! Не удалось разобрать дату границы сбора: "' + dateStr + '"');
        console.log('Ожидаемый формат даты: "2026.07.02"');
        process.exit(1);
    }

    const { h, m, s } = parseCollectionTime(timeStr);
    const yyyy = dateMatch[1];
    const mm = String(dateMatch[2]).padStart(2, '0');
    const dd = String(dateMatch[3]).padStart(2, '0');
    const HH = String(h).padStart(2, '0');
    const MM = String(m).padStart(2, '0');
    const SS = String(s).padStart(2, '0');
    const cutoff = moment(
        `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`,
        'YYYY-MM-DD HH:mm:ss',
        true
    );

    if (!cutoff.isValid()) {
        console.log('');
        console.log('🔴 Error! Некорректная дата/время границы сбора');
        process.exit(1);
    }

    return cutoff.unix();
}

const collectionCutoffUnix = parseCollectionCutoffUnix(
    collection_time_before_date,
    collection_time_before_time
);





console.log(`Мы начинаем с ${startOffset}го поста сверху страницы, и запрашиваем по ${startCount} постов`)
if (collectionCutoffUnix != null) {
    console.log(
        `⏳ Сохраняем посты до ${moment.unix(collectionCutoffUnix).format('YYYY.MM.DD HH⁚mm⁚ss')} (включительно)`
    );
}
if (allCount != -1) console.log(`Мы хотим загрузить всего ${allCount} постов`)
else {

    if (bool_isStopedBeforePool == true) {
        console.log("📊 Мы хотим загрузить все посты из сообщества, до первого опроса")
    } else if (collectionCutoffUnix != null) {
        console.log("📅 Ограничение по дате включено — идём вниз по стене до указанной даты")
    } else {
        console.log("🎲 Мы хотим загрузить все посты из сообщества, до самого конца сообщества")
    }

}







/*/////////////////////////////////////////////////////////////////
//                                                               //
//                        Главный запрос                         //
//                                                               //
/////////////////////////////////////////////////////////////////*/

async function MainRequest(count, offset) {

    console.log("")
    console.log("————————————— Посылаем запрос ——————————————")
    console.log("offset = " + offset + ", count = " + count)
    console.log("")

    if (lastEventTime == 0) {
        lastEventTime = Date.now(); // Запоминаем время начала
    } else {
        let currentEventTime = Date.now(); // Запоминаем время окончания
        timeDifference = (currentEventTime - lastEventTime) / 1000; // Вычисляем разницу в секундах

        console.log(`С последнего запроса прошло ${timeDifference.toFixed(2)} секунд`);

        lastEventTime = currentEventTime; // Обновляем время последнего события
    }






    let json;
    try {
        json = await fetchVkApiWithRetries(`https://api.vk.com/method/wall.get?
owner_id=-${groupId}&
count=${count}&
offset=${offset}&
access_token=${accessToken}&
v=5.130`);
    } catch (err) {
        console.log('');
        console.log('🔴 Error! Программа остановлена с ошибкой');
        console.log(`Не удалось связаться с VK API после нескольких попыток: ${err.message}`);
        console.log(`Остановились на offset=${offset}, count=${count}`);
        process.exit(1);
    }

    // Информация о количестве запрашиваемых постов:
    let int_insCountOfThePost = 0;

    // Проверяем, что API вернул корректный ответ
    if (json.error || !json.response || !Array.isArray(json.response.items)) {
        console.log('');
        console.log('🔴 Error! Программа остановлена с ошибкой');
        console.log('API вернул неверный ответ, проверьте параметры запроса');
        if (json.error) {
            console.log(`Код ошибки VK API: ${json.error.error_code}, сообщение: ${json.error.error_msg}`);
        }
        process.exit();
    }

    // Общее число постов на стене — из response.count (не путать с item.id)
    if (bool_isShowCountOfPosts == false && offset == 0) {
        allCountPostOfThisGroup = json.response.count ?? 0;
        console.log("Общее количество постов в группе: " + allCountPostOfThisGroup);
        console.log("");
        bool_isShowCountOfPosts = true;
    } else if (bool_isShowCountOfPosts == false) {
        bool_isShowCountOfPosts = true;
    }

    // Обрабатываем каждый пост
    json.response.items.forEach(async item => {
                // Обрабатываем каждый пост асинхронно (одновременно)

                // Уже достигли нижней границы даты — остальные посты в пачке старше, пропускаем
                if (bool_isReachedCollectionDateLimit || bool_isReachedAllCountLimit) {
                    return;
                }

                // Лимит allCount: не обрабатываем посты сверх заданного количества
                if (allCount != -1 && (int_lastNumberOfPost + 1) >= allCount) {
                    bool_isReachedAllCountLimit = true;
                    return;
                }

                // Получаем дату публикации поста (unix timestamp → строка для имён файлов)
                const postDateTime = moment.unix(item.date).format('YYYY.MM.DD HH⁚mm');

                // Посты старше границы сбора не сохраняем и останавливаем дальнейшие запросы
                if (collectionCutoffUnix != null && item.date < collectionCutoffUnix) {
                    bool_isReachedCollectionDateLimit = true;
                    console.log("");
                    console.log(
                        `⏳ Пост от ${postDateTime} старше границы ` +
                        `${moment.unix(collectionCutoffUnix).format('YYYY.MM.DD HH⁚mm⁚ss')} — сохранение остановлено`
                    );
                    return;
                }

                console.log("")
                int_insCountOfThePost++;    // № обрабатываемого поста, начиная с 1
                int_lastNumberOfPost++;

                // После этого поста лимит allCount исчерпан — следующие в пачке не трогаем
                if (allCount != -1 && (int_lastNumberOfPost + 1) >= allCount) {
                    bool_isReachedAllCountLimit = true;
                }

                // Выводим всю информацию о посте
                //console.log("📚 Информация о посте: ", item);

                /*////////////////////////////////////
                //      Обработка фото в посте      //
                ////////////////////////////////////*/


                // Проверяем, есть ли в посте фотографии или пересланные посты
                let attachments = 'attachments' in item ? item.attachments : [];


                if ('copy_history' in item && item.copy_history.length > 0) {
                    if ('attachments' in item.copy_history[0]) {
                        // Если пересланные посты есть, то мы совмещаем их историю, позволяя нашей программе 
                        // обработать фотографии и из этих вложенных постов
                        attachments = attachments.concat(item.copy_history[0].attachments);
                    }
                }

                const photos = attachments.filter(attachment => attachment.type === 'photo');

                let bool_ismultiplyPhotosInThePost = false; // = true, если в посте > 1 фотографии
                let countImage = 1;

                if (photos.length > 1) {
                    console.log("📚 В посте несколько фотографий");
                    bool_ismultiplyPhotosInThePost = true;
                }




                /*////////////////////////////////////
                //     Обработка текста в посте     //
                ////////////////////////////////////*/

                // !!! Сделать добавление 120 символов текста поста к картинке
                // Если не помещается - текст образается, вставляется троеточие, и полный текст сохраняется в .txt файл

                // Проверяем, есть ли в посте текст
                let postText = 'text' in item ? item.text : '';

                if ('copy_history' in item && item.copy_history.length > 0) {
                    if ('text' in item.copy_history[0]) {

                        // Совмещаем текстовые описания поста и вложенного поста
                        if (postText != '' && (item.copy_history[0].text != '')) {
                            postText += '\n——————————————————————\n' + item.copy_history[0].text;
                        } else if (postText == '' && (item.copy_history[0].text != '')) {
                            postText += item.copy_history[0].text;
                        }
                    }
                }

                let goodPostText = sanitizeFilename2(postText)

                if (goodPostText.length > 120) {
                    // Обрезаю строку до 120 символов, если она слишком длинная
                    goodPostText = goodPostText.substring(0, 120);
                    goodPostText += "..."

                    CreateTextFileForDescrPost();
                } else {
                    // Проверяю, не удалились ли случайно лишние символы из описани
                    // Если удалились - всё равно создаю текстовый документ с описанием поста. На всякий случай

                    if (goodPostText != postText) {
                        if (bool_isinfoShow) console.log("! Отфильтрованный текст неверный, сохраняю копию в текстовом документе")
                        if (bool_isinfoShow) console.log("")
                        if (bool_isinfoShow) console.log("goodPostText = " + goodPostText)
                        if (bool_isinfoShow) console.log("postText = " + postText)
                        if (bool_isinfoShow) console.log("")
                        CreateTextFileForDescrPost();
                    }
                }

                // Cоздаю текстовый документ с описанием поста
                function CreateTextFileForDescrPost() {
                    if (postText != '') {

                        let fileName = '[' + postDateTime + '] ' + goodPostText;
                        let path = floberGroupName + `/${fileName}.txt`;

                        // Сохраняю этот текст в папке
                        fs.writeFile(path, postText, err => {
                            if (err) throw err;
                            console.log("📄 Текстовый файл с именем " + fileName + " сохранён в папке " + floberGroupName);

                            // Получаю timestamp из postDateTime
                            let timestamp = moment(postDateTime, 'YYYY.MM.DD HH⁚mm').valueOf();

                            // Устанавливаю время создания файла
                            fs.utimes(path, timestamp / 1000, timestamp / 1000, (err) => {
                                if (err) throw err;
                                if (bool_isinfoShow) console.log("⏰ Время создания файла " + fileName +
                                    " установлено на " + postDateTime);
                            });
                        });
                    }
                }



                /*////////////////////////////////////
                //              Другое              //
                ////////////////////////////////////*/


                // Обрабатываем каждое вложение, и выводим его тип контента                                   
                attachments.forEach(attachment => {
                    // Выводим тип контента
                    let occ = '⚠️🟪'
                    if (attachment.type == "photo") occ = '📸';
                    if (attachment.type == "video") occ = '📽️';
                    if (attachment.type == "gif") occ = '🕹️';            // ? Проверить, работает ли это
                    let globalCountPost = offset + int_insCountOfThePost;
                    // console.log(`${occ} Пост №${int_insCountOfThePost} Тип контента:`, attachment.type); 
                    console.log(`${occ} Пост №${globalCountPost} Тип контента:`, attachment.type);
                });



                /*////////////////////////////////////////////////////////
                //                   Сохранение фото                    //
                /////////////////////////////////////////////////////// */


                let addCount = 1;

                // Для всех изображений, в полученном наборе:
                for (let photoAttachment of photos) {
                    // Получаем URL фотографии с максимальным разрешением
                    const photo = photoAttachment.photo;
                    //const photoUrl = photo.sizes[photo.sizes.length - 1].url;

                    let maxResolution = 0;
                    let maxResolutionUrl = '';

                    // Проходим по всем разрешениям картинки, и выбираем то, которое больше всего
                    for (let size of photo.sizes) {
                        let resolution = size.width * size.height;
                        if (resolution > maxResolution) {
                            maxResolution = resolution;
                            maxResolutionUrl = size.url;
                        }
                    }

                    const photoUrl = maxResolutionUrl;

                    const globalCountPost = offset + int_insCountOfThePost;

                    try {
                        // Запрашиваю картинки, по ссылкам, полученным из поста
                        // Эти запросы выполняются асинхронно
                        counterWaitRequest++;
                        let buffer = await downloadImageWithRetries(photoUrl);

                        //let hash = createHash(buffer);                    // Вычисляем хеш изображения
                        //console.log("hash = " + hash)

                        let fileName = '[' + postDateTime + ']';            // Задаю имя для изображения

                        // Если в посте было описание, то я добавляю его в название файла
                        if (goodPostText != '') {
                            fileName += ' ' + goodPostText;
                        }

                        if (bool_ismultiplyPhotosInThePost === true) {
                            // Если изображений несколько, то для каждого задаю его номер в посте
                            fileName += " - " + countImage;
                            countImage++;
                        }

                        do {
                            let tempFileName = fileName;
                            if (addCount > 1) {
                                tempFileName += " (" + addCount + ")";
                            }
                            tempFileName += ".jpg";

                            let path = floberGroupName + `/${tempFileName}`; // Путь, куда картинка будет сохранена

                            // Кидаю предупреждение, если такой файл уже есть в этой папке
                            if (!fs.existsSync(path)) {
                                fileName = tempFileName;
                                break;
                            }

                            if (bool_isinfoShow) console.log("⚠️ Файл с именем " + tempFileName + " уже существует в папке " + floberGroupName);
                            addCount++;
                        } while (true);

                        let path = floberGroupName + `/${fileName}`;

                        // Сохраняю это изображение в папке 
                        fs.writeFileSync(path, buffer);

                        console.log("✅ Файл с именем " + fileName + " сохранён в папке " + floberGroupName);

                        // Получаю timestamp из postDateTime
                        let timestamp = moment(postDateTime, 'YYYY.MM.DD HH⁚mm').valueOf();

                        // Устанавливаю время создания файла
                        fs.utimes(path, timestamp / 1000, timestamp / 1000, (err) => {
                            if (err) throw err;
                            if (bool_isinfoShow) console.log("⏰ Время создания файла " + fileName +
                                " установлено на " + postDateTime);
                        });

                        counterWaitRequest--;
                    } catch (err) {
                        console.log(`⚠️ Не удалось загрузить изображение после 3 попыток: ${err.message}`);
                        console.log(`   Пост №${globalCountPost}, дата: ${postDateTime}`);
                        console.log(`   URL: ${photoUrl}`);
                        counterWaitRequest--;
                    }
                }



                /*///////////////////////////////////////////////////////
                //                   Сохранение GIF                    //
                ////////////////////////////////////////////////////// */

                let bool_isDataPrint = false;

                // Для всех gif, в полученном наборе:
                for (let attachment of attachments) {
                    if (attachment.doc) {
                        if (bool_isDataPrint == false) {
                            bool_isDataPrint = true;
                            if (goodPostText != '') {
                                // Если в посте есть текст, добавляем его в название к видео, после даты:
                                fs.appendFileSync(txtFile_allGifLinks, '\n[' + postDateTime + '] ' + goodPostText + '\n\n');
                            } else {
                                fs.appendFileSync(txtFile_allGifLinks, '\n[' + postDateTime + ']\n\n');
                            }
                        }

                        // Ссылка на файл:
                        const attachmentUrl = attachment.doc.url;
                        console.log("🕹️ attachmentUrl = " + attachmentUrl)

                        // Тут нужно также сохранять все ссылки в текстовый документ, и скачать их позже

                        // Добавляем строку с этим URL в .txt файл
                        // А также дату и время поста

                        let nameStr = attachmentUrl + '\n'

                        fs.appendFileSync(txtFile_allGifLinks, nameStr);
                    }
                }





                /*/////////////////////////////////////////////////////////
                //                   Сохранение видео                    //
                //////////////////////////////////////////////////////// */

                // Получаем все видео вложения
                const videos = attachments.filter(attachment => attachment.type === 'video');

                if (videos != '') {
                    if (goodPostText != '') {
                        // Если в посте есть текст, добавляем его в название к видео, после даты:
                        fs.appendFileSync(txtFile_allVideoLinks, '\n[' + postDateTime + '] ' + goodPostText + '\n');
                    } else {
                        fs.appendFileSync(txtFile_allVideoLinks, '\n[' + postDateTime + ']\n');
                    }
                }

                // Для всех видео вложений, в полученном наборе:
                videos.forEach(videoAttachment => {
                    // Получаем URL видео
                    const video = videoAttachment.video;

                    // Собираем URL страницы ВКонтакте с видео
                    const videoPageUrl = `https://vk.com/video${video.owner_id}_${video.id}`;

                    console.log(videoPageUrl); // URL страницы ВКонтакте с видео

                    // Добавляем строку с этим URL в .txt файл
                    // А также дату и время поста

                    let nameStr = videoPageUrl + '\n'

                    fs.appendFileSync(txtFile_allVideoLinks, nameStr);
                });



                /*//////////////////////////////////////////////////////////
                //                   Обработка опросов                    //
                ///////////////////////////////////////////////////////// */

                // Проверяем, есть ли в посте опрос
                const polls = 'attachments' in item ? item.attachments.filter(attachment => attachment.type === 'poll') : [];

                if (polls.length > 0) {
                    bool_isWeGoingToPoll = true;
                    counterWaitRequest++;

                    console.log("")
                    // Если опрос есть, выводим его заголовок 
                    console.log("📊 Опрос: ", polls[0].poll.question);
                    console.log("")
                    let dOut3 = "🟣🟣🟣 Программа сохранения дошла до " + (offset + count) + " поста, в котором есть опрос"
                    console.log(dOut3);
                    // let txtFile_stopThisProgramm = nameFlMainSession + '/На каком посте остановились из группы ' + goodGroupName + '.txt';
                    // fs.writeFileSync(txtFile_stopThisProgramm, dOut3);
                    //process.exit();

                    // Также сохраняю текстовый документ, с опросом

                    let poolfileName = '[' + postDateTime + ']' + " Опрос⁚ " + sanitizeFilename2(polls[0].poll.question);
                    let poolPath = floberGroupName + `/${poolfileName}.txt`;

                    console.log("poolfileName = " + poolfileName + ", floberGroupName = " + floberGroupName)

                    // Сохраняю этот текст в папке
                    fs.writeFileSync(poolPath, polls[0].poll.question);
                    console.log("📄 Текстовый файл с именем " + poolfileName + " сохранён в папке " + floberGroupName);

                    // Получаю timestamp из postDateTime
                    let timestamp = moment(postDateTime, 'YYYY.MM.DD HH⁚mm').valueOf();

                    // Устанавливаю время создания файла
                    fs.utimes(poolPath, timestamp / 1000, timestamp / 1000, (err) => {
                        if (err) throw err;
                        if (bool_isinfoShow) console.log("⏰ Время создания файла " + poolfileName +
                            " установлено на " + postDateTime);
                        counterWaitRequest--;
                    });
                }
            });

    console.log("")
    console.log("🕑")
    waitForCondition();
}






let bool_isFirstStart = true;       // Это первый запуск запроса?
let bool_isFinalPublicWall = false; // Все посты сообщества закончились?

waitForCondition();




// Ждёт, пока не завершатся все https запросы
// Либо, этой-же процедурой посылаем первый запрос
async function waitForCondition() {
    while (counterWaitRequest > 0) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Ждем 0.5 секунды

        if (counterWaitRequest > 0) {
            // console.log("counterWaitRequest > 0, ждем еще...");
            // console.log("counterWaitRequest = " + counterWaitRequest);
            console.log("Ещё не все файлы из набора загружены, ждём...")
            //console.log("")
        }
    }

    if (bool_isFirstStart == true) {
        await new Promise(resolve => setTimeout(resolve, 4000)); // Ждем 1 секунду
        bool_isFirstStart = false;
        lastRequestCount = getNextRequestCount();
        MainRequest(lastRequestCount, startOffset);
    } else {
        console.log("")
        console.log("Мы загрузили все посты с " + startOffset + " по " + (startOffset + lastRequestCount));

        // Дошли до нижней границы даты/времени сбора — завершаем программу
        if (bool_isReachedCollectionDateLimit) {
            console.log("⏳ Достигнута указанная дата сбора, на этом программа завершается");
            await EndOfProgramm();
            process.exit();
        }

        // Достигли лимита allCount по числу обработанных постов
        if (bool_isReachedAllCountLimit || (allCount != -1 && (int_lastNumberOfPost + 1) >= allCount)) {
            console.log("Мы загрузили достаточно постов (" + (int_lastNumberOfPost + 1) + "), на этом программа завершается");
            await EndOfProgramm();
            process.exit();
        }

        // Мы дошли до опроса? или если мы не останавливаемся, когда дошли до опроса:
        if (bool_isWeGoingToPoll == false || bool_isStopedBeforePool == false) {

            // Обработка случая, когда посты в сообществе закончились
            if ((timeDifference < 0.5) && (timeDifference > 0)) {
                console.log("")
                console.log("С последнего запроса прошло " + timeDifference.toFixed(2) + " секунд")
                console.log("🎈 Слишком частые ответы, скорее всего посты в сообществе закончились")
                bool_isFinalPublicWall = true;
                await EndOfProgramm();
                process.exit();
            }

            console.log("Продолжаем загружать посты")

            startOffset += lastRequestCount; // Сдвигаем на реально запрошенное в прошлом запросе число постов

            lastRequestCount = getNextRequestCount();
            if (lastRequestCount <= 0) {
                console.log("Мы загрузили достаточно постов (" + (int_lastNumberOfPost + 1) + "), на этом программа завершается");
                await EndOfProgramm();
                process.exit();
            }

            MainRequest(lastRequestCount, startOffset); // И запускаем запрос заново
        } else {
            await EndOfProgramm();
        }
    }
}


/*////////////////////////////////////
//       Завершение программы       //
////////////////////////////////////*/

// Открывает папку сессии в проводнике ОС; вызывается в EndOfProgramm при успешном завершении
async function openSaveFolder(folderPath) {
    const absolutePath = path.resolve(folderPath);

    return new Promise((resolve) => {
        let child;

        if (process.platform === 'win32') {
            child = spawn('cmd.exe', ['/c', 'start', '', absolutePath], {
                detached: true,
                stdio: 'ignore',
                windowsHide: true
            });
        } else if (process.platform === 'darwin') {
            child = spawn('open', [absolutePath], {
                detached: true,
                stdio: 'ignore'
            });
        } else {
            child = spawn('xdg-open', [absolutePath], {
                detached: true,
                stdio: 'ignore'
            });
        }

        child.on('error', (err) => {
            console.log('⚠️ Не удалось открыть папку сохранения:', err.message);
        });

        child.unref();
        resolve();
    });
}

async function EndOfProgramm() {
    console.log(``)
    console.log(`🟢🟢🟢 Программа успешно завершилась`)

    let dOut2;

    if (bool_isFinalPublicWall == true && int_lastNumberOfPost != -1) {
        // № последнего поста считается немного некорректно, если мы дошли до конца постов в сообществе
        dOut2 = `Мы остановились на ` + (int_lastNumberOfPost + oldStartOffset + 1) + " посте. Это последний пост в сообществе 🔥🔥🔥";
    } else {
        dOut2 = `Мы остановились на ` + (startOffset + startCount) + " посте";
    }

    console.log(dOut2)
    console.log(``)

    if (!((bool_isFinalPublicWall == true && int_lastNumberOfPost != -1))) {
        // Сохраняю в текстовом файле сессии, на каком посте мы остановились:

        // Путь к этому текстовому файлу:
        let txtFile_stopThisProgramm = nameFlMainSession + '/На каком посте остановились из группы ' + goodGroupName + '.txt';

        await fs.writeFileSync(txtFile_stopThisProgramm, dOut2);
    } else {
        // Сохраняю файл, что мы дошли до конца сообщества:

        // Путь к этому текстовому файлу:
        let txtFile_stopThisProgramm_2 = nameFlMainSession + '/🔥 Мы дошли до конца группы ' + goodGroupName + '.txt';

        console.log("Общее количество постов, изначально было: " + allCountPostOfThisGroup);

        await fs.writeFileSync(txtFile_stopThisProgramm_2, dOut2);
    }

    await openSaveFolder(nameFlMainSession);
}

























