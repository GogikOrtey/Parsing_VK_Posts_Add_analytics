// const puppeteer = require('puppeteer');
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import fsp from 'fs/promises';
import readline from 'readline';
import moment from 'moment';



console.log(" ")
console.log("———————————————————————————————————————————————————————————")
console.log("———————————————————————————————————————————————————————————")
console.log("v1.0")
console.log("")
console.log("Вас приветствует программа загрузки видео по ссылкам!")
console.log("")


// Функция для ожидания
const delay = ms => new Promise(res => setTimeout(res, ms));
// Использование: 
// await delay(500);



// Путь к папке "Загрузки"
const downloadsFolder = 'D:\\Загрузки';

let page

let data = [];

data = await processFile(data);

await MainProcess();


// Функция, которая загружает в массив data все ссылки из входного текстового файла
async function processFile(data) {
  let fileStream = fs.createReadStream('video/input.txt');
  let rl = readline.createInterface({ input: fileStream });

  let temp = [];

  for await (let line of rl) {
    if (line.startsWith('[')) {
      if (temp.length > 0) {
        data.push(temp);
        temp = [];
      }
      temp.push(line);
    } else if (line.startsWith('https://')) {
      temp.push(line);
    } else if (line.trim() !== '') {
      temp.push(line);
    }
  }

  if (temp.length > 0) {
    data.push(temp);
  }

  if (data.length === 0) {
    console.log('🟠 Файлик пуст, и в нём нет ссылок');
  } else {
    console.log('🟢 Файлик успешно обработан и загружен');
    // console.log(data);
  }

  return data;
}


// Основная функция, которая загружает все видео по ссылкам, из массива data
async function MainProcess() {
  // Удаляем первый внутренний массив
  data.shift();

  // Цикл, который просто выводит информацию:
  for (let i = 0; i < data.length; i++) {
    let item = data[i];
    let description = item[0].substring(1, item[0].indexOf(']'));
    console.log(`Дата и время: ${description}`);

    let rest = item[0].substring(item[0].indexOf(']') + 1).trim();
    if (rest.length > 0) {
      console.log(`Описание: ${rest}`);
    }

    for (let j = 1; j < item.length; j++) {
      console.log(`Ссылка ${j}: ${item[j]}`);
    }

    console.log(`Обработка ${i + 1} элемента завершена`);
    console.log()
  }

  await StartBrowser();

  // Цикл, который обрабатывает все видео
  for (let i = 0; i < data.length; i++) {

    let item = data[i];

    let description = item[0].substring(1, item[0].indexOf(']'));
    console.log(`Дата и время: ${description}`);

    let rest = item[0].substring(item[0].indexOf(']') + 1).trim();
    if (rest.length > 0) {
      console.log(`Описание: ${rest}`);
    }

    let allDescr = item[0];

    for (let j = 1; j < item.length; j++) {
      // console.log(`Ссылка ${j}: ${item[j]}`);

      // Если видео с этой датой несколько, то добавляю номера к ним, что бы они все сохранились
      if(item.length > 2) await DownloadVideoFromURL(item[j], allDescr + " (" + (j-1) + ")", description)
      else await DownloadVideoFromURL(item[j], allDescr, description)

      console.log("Ждём...")
      await delay(14000); // Ждём 20 секунд, что бы нам не было штрафа за слишком частые запросы
    }

    console.log(`Обработка ${i + 1} элемента завершена`);
    console.log()
  }
}

// Функция, которая удаляет из полученной строки все недопустимые символы для именования файла
// И укорачивает до 120 символов
function sanitizeFilename2(filename) {
  // Быстрые замены неликвидных символов. Что бы сохранить контекст, и попасть в рамки
  filename = filename.replace(/:/g, "⁚");
  filename = filename.replace(/\?/g, "‽");
  filename = filename.replace(/\n/g, " ");

  // Список недопустимых символов
  const invalidChars = /[~!@#$%^&*()+={};':"\\|<>\/?]+/g;

  // Удаление всех недопустимых символов
  filename = filename.replace(invalidChars, '');

  if (filename.length > 120) {
    // Обрезаю строку до 120 символов, если она слишком длинная
    filename = filename.substring(0, 120);
    filename += "..."
  }

  return filename;
}



















// Функция, которая открывает браузер, и дальше передаёт управление в другие функции
async function StartBrowser() {
  let localMainCounter = 0; // Счётчик, который показывает, какое у нас сейчас состояние в коде

  try {
    // console.log("inputURLVideo = " + inputURLVideo);

    localMainCounter = 0; console.log(localMainCounter + ': Открываем браузер');

    // Запускаем браузер:
    const browser = await puppeteer.launch({
      // Путь к исполняемому файлу браузера Edge
      executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      headless: false // Открывает браузер в режиме с графическим интерфейсом
    });

    localMainCounter = 1; console.log(localMainCounter + ': Браузер успешно открыт');

    page = await browser.newPage();

    // Открываю нужную веб-страницу
    const pagePromise = page.goto('https://www.downloadvideosfrom.com/ru/VK.php#GoogleBetweenAd', { waitUntil: 'load' });
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000));

    await Promise.race([pagePromise, timeoutPromise]);

    localMainCounter = 2; console.log(localMainCounter + ': Ждём 7 секунд, пока страница загрузится');
    
    await delay(7000);

    localMainCounter = 3; 
    console.log(localMainCounter + ': Передаём управление в функцию загрузки видео на уже открытой странице');

    // localMainCounter = 10; console.log(localMainCounter + ': Закрываем браузер');

    // await browser.close();
  } catch (error) {
    console.error('Произошла Ошибка:', error);
  }
}


 




















// Функция, которая открывает браузер, и дальше передаёт управление в другие функции
async function DownloadVideoFromURL(inputURLVideo, allDescr, dataTimeFile) {
  let localMainCounter = 3; // Счётчик, который показывает, какое у нас сейчас состояние в коде

  try {
    // Передаём управление в функцию загрузки видео на уже открытой странице
    await downloadVideoFromOpenedWebSite(page, inputURLVideo);

    localMainCounter = 7; 
    console.log(localMainCounter + ': Ждём, пока файл загрузится');
    console.log()

    let filePatch = await waitForDownloadVideo();

    if(filePatch == "000") {
      return;
    }

    localMainCounter = 8; console.log(localMainCounter + ': Файл загружен');

    await MooveVideoFileWithoutFloberDownload(filePatch, sanitizeFilename2(allDescr), dataTimeFile)

    localMainCounter = 9; console.log(localMainCounter + ': Файл перемещён и переименован');

    console.log("——————————————————")
  } catch (error) {
    console.error('Произошла Ошибка:', error);
  }
}



// Скачивает видео, уже с открытой страницы
async function downloadVideoFromOpenedWebSite(page, inputURLVideo) {
  console.log('Скачиваем видео с адресом: ' + inputURLVideo);
  await delay(500);

  let localMainCounter = 4;
  console.log(localMainCounter + ': Вставляем текстовую строку в поле ввода с id="url"');

  page.evaluate((url) => {
    document.querySelector('#url').value = url;
  }, inputURLVideo);

  await delay(500);
  localMainCounter = 5;
  console.log(localMainCounter + ': Инициируем нажатие на кнопку с id="DownloadMP4HD"');
  // Инициируем нажатие на кнопку с id="DownloadMP4HD"
  page.click('#DownloadMP4HD');
 
  await delay(500);
  localMainCounter = 6; console.log(localMainCounter + ': Мы успешно начали загрузку видео');
}



// waitForDownloadVideo();

// Ждёт, пока в папке Загрузки не появится скачанный файл
async function waitForDownloadVideo() {
  let finalPatch = ""

  while (finalPatch == "") {
    await delay(3000); // Ждём 2 секунды

    const files = await fsp.readdir(downloadsFolder);

    const downlFiles = files.filter(file => path.extname(file) === '.crdownload');
    const mp4Files = files.filter(file => path.extname(file) === '.mp4');

    // Если в папке Загрузки не появилось ни загружаемых файлов, ни загруженных
    if (downlFiles.length === 0 && mp4Files === 0)  {
      console.log("🔥 Файл недоступен для скачивания, переходим к следующему")

      // Находим iframe на странице
      const frameHandle = await page.$('#IframeErrorMessage');
      const frame = await frameHandle.contentFrame();

      // Теперь можно использовать 'frame' как 'page'
      await frame.waitForSelector('#CloseButton', { timeout: 60000 });
      await frame.click('#CloseButton');

      return "000"
    }

    // console.log("files.length = " + files.length + ", files = " + files)

    if (mp4Files.length === 1) {
      let finalPath = path.join(downloadsFolder, mp4Files[0])

      console.log();      
      console.log('Файл загрузился:');      
      console.log(finalPath);

      return finalPath;

    } else if (mp4Files.length > 1) {
      console.log('Найдено несколько файлов .mp4, удалите все лишние файлы.');

    } else {
      console.log("Файл ещё не загрузился, ждём...");
    }
  }
}



// MooveVideoFileWithoutFloberDownload('D:\\Загрузки\\Реакция кошек__.mp4', 'newFile222222')

// Перемещает файл с именем patchVideoFile, в папку video/output, и переименовывает
async function MooveVideoFileWithoutFloberDownload(patchVideoFile, newFileName, dataTimeFile) {

  // Все \ заменяю на \\
  patchVideoFile = patchVideoFile.replace(/\\/g, '\\');
  // console.log("patchVideoFile = " + patchVideoFile)

  // Исходный и целевой пути
  let sourcePath = patchVideoFile;
  let targetPath = path.join('video/output', newFileName + ".mp4");

  // Перемещение файла
  fs.rename(sourcePath, targetPath, function (err) {
    if (err) {
      console.error('Ошибка:', err);
    } else {
      console.log('Файл успешно перемещен и переименован!');

      let formattedDateTime = dataTimeFile.replace(/\[|\]/g, '').replace('⁚', ':');
      
      // Получаем timestamp из formattedDateTime
      let timestamp = moment(formattedDateTime, 'YYYY.MM.DD HH:mm').valueOf();
      
      // Устанавливаем время создания файла
      fs.utimes(targetPath, timestamp / 1000, timestamp / 1000, (err) => {
        if (err) throw err;
      });
    }
  });
}































