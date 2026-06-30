import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'fs';
import https from 'https';
import moment from 'moment';
import crypto from 'crypto';
import sharp from 'sharp';
import axios from 'axios';


// ---------- Описание программы ----------
 
// Эта программа скачает и сохранит: Картинки, Подписи к посту и GIF
// Также, она получит ссылки на все видео из постов, и сохранит их в текстовый файл, с датами постов




// ---------- Основные переменные для настройки ----------

// Ключ доступа к API (задаётся в файле .env)
const accessToken = process.env.ACCESS_TOKEN ?? '';

// ID группы ВКонтакте
// + // const groupId = '224924750';        // Мемы для программистов
// + // const groupId = '185062110';        // Best Photo Live!
// + // const groupId = '169371425';        // Жизненные ценности
// + // const groupId = '168229061';        // Очень тупые картинки (старая группа)
// + // const groupId = '206265163';        // Творческое вдохновение
// + // const groupId = '169682998';        // Секрет
// + // const groupId = '212162826';        // Пошлые картиночки
// + // const groupId = '216386129';        // Милые картинки
// + // const groupId = '222482163';        // Смешные картинки из интернета
// + // const groupId = '184506157';        // Улётные картинки #2
// + // const groupId = '186150422';        // Love is beautiful


// const groupId = '234264825';
// const groupId = 'madein_abyss';
const groupId = '213046214';


// https://vk.com/public + этот номер, без пробела



    /*////////////////////////////////////
    //          Count и Offset          //
    ////////////////////////////////////*/
    

let startOffset = 0     // = 0, если мы хотим начать с верха сообщества    
let startCount = 20     // Лучшее значение - это 10 или 20. Макисмальное = 100
// let allCount = -1      // Ограничитель, сколько мы обработаем постов // = -1, если без ограничения
let allCount = 10      // Ограничитель, сколько мы обработаем постов // = -1, если без ограничения

// count - это количество постов, которые вернёт нам сервер max=100
// offset - это сдвиг, относительно которого нам сервер отправит посты
// offset сдвигается на count, после каждого автоматического запроса

let bool_isStopedBeforePool = false;     // Мы останавливаем программу, после того как нам встретился опрос?



// Пример значений:
//
// let startCount = 10
// let startOffset = 0
// let allCount = 20  




// ---------- Дополнительные настройки ----------

// Путь по умлочанию, где создаются папки Session, в которые будет сохраняться весь контент
// (Относительно этого исполняемого файла main.js)

let mainPath = 'main/';

let bool_isinfoShow = false;            // Если = true, то в консоль будут выводится дополнительные информационные сообщения






















// ------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------

//                       ---------- Ниже - сама программа ----------


console.log(" ")
console.log("———————————————————————————————————————————————————————————")
console.log("———————————————————————————————————————————————————————————")
console.log("v1.0")
console.log("")
console.log("Вас приветствует программа загрузки контента из ВК!")
console.log("")


if(accessToken == '') {
    console.log("В программе не указан Ключ доступа к API. Его нужно указать в файле .env (переменная ACCESS_TOKEN)")
    console.log("Как получить Ключ доступа к API ВКонтакте - вы можете легко узнать в интернете. Это не займёт больше 2х минут")
    console.log('');
    console.log('🔴 Error! Программа остановлена с ошибкой');
    process.exit();
}




let goodGroupName = ''; // Хорошее название группы, для создания папки с таим именем

// Получаю и вывожу название группы:
await fetch(`https://api.vk.com/method/groups.getById?group_id=${groupId}&access_token=${accessToken}&v=5.130`)
    .then(response => response.json())
    .then(data => {
        console.log("data = ", data);                   //// Потом убрать
        let groupName = data.response[0].name;
        goodGroupName = sanitizeFilename(groupName);
        console.log("Название группы: " + goodGroupName);
        console.log("");
    })




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

let counterWaitRequest = 0;             // Сколько запросов мы ждём в данный момент
let lastEventTime = 0;                  // Для отслеживания времени между запросами
let timeDifference = 0;                 // Разница между последним запросом
let int_lastNumberOfPost = -1;          // № последнего поста
let allCountPostOfThisGroup = 0;        // Общее количество постов в группе

const oldStartOffset = startOffset;     // Значение оффсета, которое не меняется







console.log(`Мы начинаем с ${startOffset} поста сверху страницы, и запрашиваем ${startCount} постов`)
if(allCount != -1) console.log(`Мы хотим загрузить всего ${allCount} постов`)
else {
    
    if(bool_isStopedBeforePool == true) {
        console.log("📊 Мы хотим загрузить все посты из сообщества, до первого опроса")
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






await fetch(`https://api.vk.com/method/wall.get?
owner_id=-${groupId}&
count=${count}&
offset=${offset}&
access_token=${accessToken}&
v=5.130`)
        .then(res => res.json())
        .then(json => {

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

            // Обрабатываем каждый пост
            json.response.items.forEach(async item => {
                // Обрабатываем каждый пост асинхронно (одновременно)
                console.log("")
                int_insCountOfThePost++;    // № обрабатываемого поста, начиная с 1
                int_lastNumberOfPost++;

                // Выводим всю информацию о посте
                //console.log("📚 Информация о посте: ", item);

                // Выводим общее количество постов в группе:
                if (bool_isShowCountOfPosts == false) {
                    if (offset == 0) {
                        // Ищем id поста:
                        let idPost = 'id' in item ? item.id : '';
                        console.log("Общее количество постов в группе: " + idPost)
                        allCountPostOfThisGroup = idPost;
                        console.log("")
                        bool_isShowCountOfPosts = true;
                    } else {
                        bool_isShowCountOfPosts = true;
                    }
                }

                // Получаем дату публикации поста

                const postDateTime = moment.unix(item.date).format('YYYY.MM.DD HH⁚mm');

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


                // Синхронная функция для загрузки изображения
                // Благодаря ей мы ждём, пока изображение не загрузится, и только потом переходим к его сохранению
                async function downloadImage(photoUrl) {
                    return new Promise((resolve, reject) => {
                        https.get(photoUrl, response => {
                            let data = [];

                            response.on('data', chunk => {
                                data.push(chunk);
                            }).on('end', () => {
                                let buffer = Buffer.concat(data); // Собираем кусочки изображения в одно
                                resolve(buffer);
                            }).on('error', err => {
                                reject(err);
                            });
                        });
                    });
                }

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

                    try {
                        // Запрашиваю картинки, по ссылкам, полученным из поста
                        // Эти запросы выполняются асинхронно
                        counterWaitRequest++;
                        let buffer = await downloadImage(photoUrl);

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
                        console.error(err);
                    }
                }



                /*///////////////////////////////////////////////////////
                //                   Сохранение GIF                    //
                ////////////////////////////////////////////////////// */

                let bool_isDataPrint = false;

                // Для всех gif, в полученном наборе:
                for (let attachment of attachments) {
                    if (attachment.doc) {
                        if(bool_isDataPrint == false) {
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

    if(bool_isFirstStart == true) {
        await new Promise(resolve => setTimeout(resolve, 4000)); // Ждем 1 секунду
        bool_isFirstStart = false;
        MainRequest(startCount, startOffset);
    } else {
        console.log("")
        console.log("Мы загрузили все посты с " + startOffset + " по " + (startOffset + startCount));

        // Мы дошли до опроса? или если мы не останавливаемся, когда дошли до опроса:
        if(bool_isWeGoingToPoll == false || bool_isStopedBeforePool == false) {
            
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
    
            startOffset += startCount; // Каждый раз делаем шаг на то количество постов, которое изначально запросили

            // Проверка на количество постов, которое мы изначально хотели загрузить
            if(allCount != -1) {
                // console.log("—————————————————————— startOffset - oldStartOffset = " + (startOffset - oldStartOffset))
                if((startOffset - oldStartOffset) >= allCount) {
                    console.log("Мы загрузили достаточно постов (" + (startOffset - oldStartOffset) + "), на этом программа завершается")
                    startOffset -= startCount;
                    await EndOfProgramm();
                    process.exit();
                } 
            }
    
            MainRequest(startCount, startOffset); // И запускаем запрос заново
        } else {
            EndOfProgramm();
        }
    }
}


    /*////////////////////////////////////
    //       Завершение программы       //
    ////////////////////////////////////*/


async function EndOfProgramm() {
    console.log(``)
    console.log(`🟢🟢🟢 Программа успешно завершилась`)

    let dOut2;

    if(bool_isFinalPublicWall == true && int_lastNumberOfPost != -1) {
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
}

























