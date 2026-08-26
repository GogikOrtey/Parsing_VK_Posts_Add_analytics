// Файл: run_analityc.js
// Назначение: точка входа с настройками аналитики VK. Здесь задаются параметры запуска
// (группа, режим аналитики / случайная картинка, размер выборки и т.д.), после чего
// вызывается analityc.js с этими значениями как CLI-аргументами.
// Связан с: analityc.js (логика аналитики), .env (ACCESS_TOKEN читается в analityc.js).

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';


// ---------- Режим аналитики ----------

let isAnalitycs = true;
// let isAnalitycs = false;

// Скачивание случайного поста
// let DOWNLOAD_RANDOM_IMAGE = true;
let DOWNLOAD_RANDOM_IMAGE = false;


// ---------- Основные переменные для настройки ----------

// ID, короткое имя или ссылка на группу ВКонтакте
// Примеры: '236598787', 'creativityal', 'https://vk.com/creativityal'
// const groupId = '213046214';
// let groupId = 'creativityal';
let groupId = 'https://vk.com/b1ackrockshooter';


// ---------- Параметры выборки и загрузки ----------

let SAMPLE_POSTS_COUNT = 20;           // Сколько первых постов анализировать (макс. 100 за один wall.get)
let SERVICE_BYTES_PER_POST = 50;       // Оценка служебного веса на пост (байт) при экстраполяции
let DOWNLOAD_BATCH_SIZE = 5;           // Параллельных загрузок картинок в одном пакете
let RANDOM_IMAGE_MAX_ATTEMPTS = 15;    // Попыток найти пост с картинкой в режиме случайной загрузки


// ---------- Запуск analityc.js с заданными параметрами ----------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const analitycJsPath = path.join(__dirname, 'analityc.js');

// Собирает CLI-аргументы из настроек выше и запускает analityc.js.
// Используется в конце этого файла как точка запуска аналитики через run_analityc.js.
function launchAnalityc() {
    const args = [
        analitycJsPath,
        `--groupId=${groupId}`,
        `--isAnalitycs=${isAnalitycs}`,
        `--DOWNLOAD_RANDOM_IMAGE=${DOWNLOAD_RANDOM_IMAGE}`,
        `--SAMPLE_POSTS_COUNT=${SAMPLE_POSTS_COUNT}`,
        `--SERVICE_BYTES_PER_POST=${SERVICE_BYTES_PER_POST}`,
        `--DOWNLOAD_BATCH_SIZE=${DOWNLOAD_BATCH_SIZE}`,
        `--RANDOM_IMAGE_MAX_ATTEMPTS=${RANDOM_IMAGE_MAX_ATTEMPTS}`,
    ];

    const child = spawn(process.execPath, args, { stdio: 'inherit' });

    child.on('error', (err) => {
        console.error('Не удалось запустить analityc.js:', err.message);
        process.exit(1);
    });

    child.on('exit', (code, signal) => {
        if (signal) {
            process.kill(process.pid, signal);
            return;
        }
        process.exit(code ?? 0);
    });
}

launchAnalityc();
