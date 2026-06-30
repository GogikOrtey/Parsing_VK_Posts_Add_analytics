import fetch from 'node-fetch';
import fs from 'fs';
import https from 'https';
import moment from 'moment';
import crypto from 'crypto';
import sharp from 'sharp';


// Возвращает случайное имя для файла, состоящее из строчных и прописных символов английского алфавита
function generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// Ключ доступа к API
const accessToken = '37382a8c37382a8c37382a8ca9342001943373837382a8c5108cd6d715313038c2969d4';

console.log("———————————————————————————————————————————————————————————")
console.log("v0.1")

// ----------------------------------
// Проверка, работает ли мой API-ключ

// // ID пользователя ВКонтакте
// //const userId = '1';
// const userId = 'gog.ortey';

// fetch(`https://api.vk.com/method/users.get?user_ids=${userId}&access_token=${accessToken}&v=5.130`)
//     .then(res => res.json()) 
//     .then(json => console.log(json));


// ID группы ВКонтакте
const groupId = '224924750';

// Генерируем случайное имя файла
//const randomFileName = crypto.randomBytes(10).toString('hex') + '.jpg';
//const randomFileName = generateRandomString(10) + '.jpg';

// Функция для создания хеша изображения
function createHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Функция для создания имени файла из хеша
function createFileName(hash) {
    return hash.slice(0, 10);
}

// Сжимает входящее изображение так, что макисмальная стороа составляет не больше 128 пикселей
// async function resizeImage(data) {
//     const MAX_SIZE = 128;
//     const image = sharp(data);

//     // Получаем метаданные изображения
//     const metadata = await image.metadata();

//     // Вычисляем новые размеры, сохраняя пропорции
//     const width = metadata.width > metadata.height ? MAX_SIZE : Math.round(MAX_SIZE * metadata.width / metadata.height);
//     const height = metadata.height > metadata.width ? MAX_SIZE : Math.round(MAX_SIZE * metadata.height / metadata.width);

//     // Изменяем размер изображения
//     const output = await image.resize(width, height).toBuffer();

//     return output;
// }


async function resizeImage(data) {
    const MAX_SIZE = 128;

    // Изменяем размер изображения сразу при создании экземпляра Sharp
    const output = await sharp(data)
        .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside' })
        .toBuffer();

    return output;
}



// Выводит в консоль URL страницы ВКонтакте с этим видео
function fGetVideo(video, videoInfo) {
    fetch(`https://api.vk.com/method/video.get?
    owner_id=${video.owner_id}&
    videos=${video.owner_id}_${video.id}&
    access_token=${accessToken}&
    v=5.130`)

        .then(res => res.json())
        .then(json => {
            //const videoInfo = json.response.items[0];
            console.log(videoInfo.player); // URL страницы ВКонтакте с видео
        });
}

// Пытаестя скачать видео, по прямой сслыке
async function fGetVideo2(videoURL, nameFile) {
    // let url = 'https://vk.com/video-179997490_456242052'; // URL видео
    let response = await axios.get(videoURL, { responseType: 'stream' });
    let writer = fs.createWriteStream('video/video ' + nameFile + '.mp4');

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function getVideoLink(videoId) {
    //const videoId = '-179997490_456242052'; // ID видео
    console.log("Скачиваем видео: " + videoId)

    const response = await axios.get(
        `https://api.vk.com/method/video.get?
    videos=${videoId}&
    access_token=${accessToken}&
    v=5.130`);

    if (response.data.response && response.data.response.items && response.data.response.items.length > 0) {
        const video = response.data.response.items[0];
        return video.player; // Ссылка на видео
    } else {
        throw new Error('Видео не найдено');
    }
}





// Функция для создания хеша изображения
function createHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Функция для создания имени файла из хеша
function createFileName(hash) {
    return hash.slice(0, 10);
}









                // // Для всех изображений, в полученном наборе:
                // for (let attachment of attachments) {
                    
                //     // Ссылка на файл:
                //     const attachmentUrl = attachment.doc.url;
                //     console.log("🕹️ attachmentUrl = " + attachmentUrl)

                //     const photoUrl = attachmentUrl;

                //     try {
                //         // Запрашиваю картинки, по ссылкам, полученным из поста
                //         // Эти запросы выполняются асинхронно
                //         counterWaitRequest++;
                //         let buffer = await downloadImage(photoUrl);

                //         console.log(buffer)

                //         //let hash = createHash(buffer);                    // Вычисляем хеш изображения
                //         //console.log("hash = " + hash)

                //         let fileName = '[' + postDateTime + ']';            // Задаю имя для изображения

                //         // Если в посте было описание, то я добавляю его в название файла
                //         if (goodPostText != '') {
                //             fileName += ' ' + goodPostText;
                //         }

                //         if (bool_ismultiplyPhotosInThePost === true) {
                //             // Если изображений несколько, то для каждого задаю его номер в посте
                //             fileName += " - " + countImage;
                //             countImage++;
                //         }

                //         do {
                //             let tempFileName = fileName;
                //             if (addCount > 1) {
                //                 tempFileName += " (" + addCount + ")";
                //             }
                //             tempFileName += ".gif";

                //             let path = floberGroupName + `/${tempFileName}`; // Путь, куда картинка будет сохранена

                //             // Кидаю предупреждение, если такой файл уже есть в этой папке
                //             if (!fs.existsSync(path)) {
                //                 fileName = tempFileName;
                //                 break;
                //             }

                //             if (bool_isinfoShow) console.log("⚠️ Файл с именем " + tempFileName + " уже существует в папке " + floberGroupName);
                //             addCount++;
                //         } while (true);

                //         let path = floberGroupName + `/${fileName}`;

                //         // Сохраняю это изображение в папке 
                //         fs.writeFileSync(path, buffer);

                //         console.log("🕹️ Gif с именем " + fileName + " сохранён в папке " + floberGroupName);

                //         // Получаю timestamp из postDateTime
                //         let timestamp = moment(postDateTime, 'YYYY.MM.DD HH⁚mm').valueOf();

                //         // Устанавливаю время создания файла
                //         fs.utimes(path, timestamp / 1000, timestamp / 1000, (err) => {
                //             if (err) throw err;
                //             if (bool_isinfoShow) console.log("⏰ Время создания файла " + fileName +
                //                 " установлено на " + postDateTime);
                //         });

                //         counterWaitRequest--;
                //     } catch (err) {
                //         console.error(err);
                //     }
                // }




                // // Для всех вложений в полученном наборе:
                // attachments.forEach(attachment => {
                //     // Если вложение является gif или документом:
                //     if (attachment.type === 'doc' && attachment.doc.ext === 'gif') {
                //         // Выводим всю информацию о вложении
                //         //console.log("📚 Информация о вложении: ", attachment);

                        // // Ссылка на файл:
                        // const attachmentUrl = attachment.doc.url;
                        // console.log("attachmentUrl = " + attachmentUrl)

                //         counterWaitRequest++;

                //         // Запрашиваю вложения, по ссылкам, полученным из поста
                //         // Эти запросы выполняются асинхронно
                //         https.get(attachmentUrl, response => {

                //             let data = [];

                //             response.on('data', chunk => {
                //                 data.push(chunk);
                //             }).on('end', () => {
                //                 let buffer = Buffer.concat(data);                   // Собираем кусочки вложения в одно

                //                 let fileName = '[' + postDateTime + ']';            // Задаю имя для вложения

                //                 // Если в посте было описание, то я добавляю его в название файла
                //                 if (goodPostText != '') {
                //                     fileName += ' ' + goodPostText;
                //                 }

                //                 fileName += ".gif";

                //                 let path = floberGroupName + `/${fileName}`;        // Путь, куда вложение будет сохранено

                //                 // Сохраняю это вложение в папке 
                //                 fs.writeFile(path, buffer, err => {
                //                     if (err) throw err;
                //                     console.log("🕹️ Gif с именем " + fileName + " сохранён в папке " + floberGroupName);

                //                     // Получаю timestamp из postDateTime
                //                     let timestamp = moment(postDateTime, 'YYYY.MM.DD HH⁚mm').valueOf();

                //                     // Устанавливаю время создания файла
                //                     fs.utimes(path, timestamp / 1000, timestamp / 1000, (err) => {
                //                         if (err) throw err;
                //                         if (bool_isinfoShow) console.log("⏰ Время создания файла " + fileName +
                //                             " установлено на " + postDateTime);
                //                     });

                //                     counterWaitRequest--;
                //                 });
                //             });
                //         });
                //     }
                // });


// --------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------

// VIDEO DOWNLOADER_2


// (async () => {
//     try {
//         const browser = await puppeteer.launch({
//             executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 
//         });
//         const page = await browser.newPage();
//         await page.goto('https://www.downloadvideosfrom.com/ru/VK.php#GoogleBetweenAd'); 
//     } catch (error) {
//         console.error('Произошла ошибка:', error);
//     }
// })();








// (async () => {
//     const browser = await puppeteer.launch({
//         executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', // замените на путь к вашему Edge
//     });
//     const page = await browser.newPage();
//     await page.goto('https://www.downloadvideosfrom.com/ru/VK.php#GoogleBetweenAd'); 

// //   // ждем, пока страница полностью не загрузится
// //   await page.waitForNavigation({ waitUntil: 'networkidle0' });

// //   // вставляем текстовую строку в поле ввода с id="url"
// //   await page.evaluate(() => {
// //     document.querySelector('#url').value = 'https://vk.com/video-72495085_456242529';
// //   });

// //   // инициируем нажатие на кнопку с id="DownloadMP4HD"
// //   await page.click('#DownloadMP4HD');

// //   // ждем, пока файл полностью не загрузится
// //   // это может быть сложно, так как Puppeteer не предоставляет прямого способа отслеживания загрузки файлов
// //   // вместо этого, вы можете использовать некоторые обходные пути, например, проверять наличие файла в директории загрузки через некоторые интервалы времени

// //   // написать в консоли сообщение об успешной загрузке
// //   console.log('Файл успешно загружен');

// //   //await browser.close();
// })();







// const browser = await puppeteer.launch({
//     executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', // замените на путь к вашему Edge
//     headless: false // открывает браузер в режиме с графическим интерфейсом
// });
// console.log('Браузер успешно открыт');
// // Закрываем браузер после 5 секунд

// const page = browser.newPage();
// page.goto('https://www.downloadvideosfrom.com/ru/VK.php#GoogleBetweenAd');

// setTimeout(() => {
//     console.log('вставляем текстовую строку в поле ввода с id="url"');
//     // вставляем текстовую строку в поле ввода с id="url"
//     page.evaluate(() => {
//         document.querySelector('#url').value = 'https://vk.com/video-72495085_456242529';
//     });
// }, 5000);

// setTimeout(() => {
//     console.log('инициируем нажатие на кнопку с id="DownloadMP4HD"')
//     // инициируем нажатие на кнопку с id="DownloadMP4HD"
//     page.click('#DownloadMP4HD');
// }, 500);







// !!! В Gemini был код, как захватить скачанный файл. Посмотреть



// Загрузка работает даже в фоновом режиме, без открытия окна браузера
// Нужно продумать, как лучше организовать работу с вкладками
// Наверное, через 1 секунду после последней строчки закрыть вкладку, и затем открыть новую


// Возможно код, для переименования загруженного файла:

/*
    page.on('download', async (download) => {
  console.log('Загрузка началась:', download.url());

  // Дождитесь завершения загрузки
  await download.on('end', () => {
    const filename = download.filename(); // Получить имя файла
    const newFilename = 'name file 1.mp4'; // Задать новое имя

    // Переименовать файл
    await fs.rename(filename, newFilename);
    console.log('Файл переименован:', newFilename);
  });
});
*/





// // Ждёт, пока в папке Загрузки не появится скачанный файл
// async function waitForDownloadVideo() {
//   let finalPatch = ""
//   while (finalPatch == "") {
//     await delay(1000); // Ждём 1 секунду

//     fs.readdir(downloadsFolder, async (err, files) => {
//       if (err) {
//         console.error(`Ошибка при чтении директории: ${err}`);
//       } else {

//         const mp4Files = files.filter(file => path.extname(file) === '.mp4');

//         if (mp4Files.length === 1) {
//           console.log('Найден один файл .mp4:');
//           finalPatch = path.join(downloadsFolder, mp4Files[0])
//           console.log(finalPatch);

//           return (finalPatch);

//         } else if (mp4Files.length > 1) {
//           console.log('Найдено несколько файлов .mp4. Удалите все лишние файлы.');

//         } else {
//           //console.log('Файлы .mp4 не найдены');
//           console.log("Файл ещё не загрузился, ждём...")
//         }
//       }
//     });
//   }
// }







// fs.readdir(downloadsFolder, (err, files) => {
//   if (err) {
//     console.error(`Ошибка при чтении директории: ${err}`);
//   } else {
//     const mp4Files = files.filter(file => path.extname(file) === '.mp4');
//     if (mp4Files.length === 1) {
//       console.log('Найден один файл .mp4:');
//       console.log(path.join(downloadsFolder, mp4Files[0]));
//     } else if (mp4Files.length > 1) {
//       console.log('Найдено несколько файлов .mp4. Пожалуйста, уточните, какой файл вам нужен.');
//     } else {
//       console.log('Файлы .mp4 не найдены');
//     }
//   }
// });

