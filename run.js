// Файл: run.js
// Назначение: точка входа с настройками парсера VK. Здесь задаются параметры запуска
// (группа, offset/count, лимиты по дате и флаги), после чего вызывается main.js с этими
// значениями как CLI-аргументами.
// Связан с: main.js (основная логика загрузки), .env (ACCESS_TOKEN читается уже в main.js).

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';


// ---------- Основные переменные для настройки ----------

// ID, короткое имя или ссылка на группу ВКонтакте
// Примеры: '224924750', 'creativityal', 'https://vk.com/creativityal', 'https://vk.ru/snowarts'
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
// const groupId = '213046214';
// const groupId = '236598787';
// let groupId = 'creativityal';
// let groupId = 'b1ackrockshooter';
// let groupId = 'iichan228';
// let groupId = 'snowarts';
// let groupId = 'https://vk.ru/snowarts';
// let groupId = 'https://vk.ru/club238701965';
// let groupId = 'https://vk.ru/club237133417';
let groupId = 'https://vk.ru/nekomi_waifu';



// https://vk.com/public + этот номер, без пробела



/*////////////////////////////////////
//          Count и Offset          //
////////////////////////////////////*/


let startOffset = 0     // = 0, если мы хотим начать с верха сообщества
let startCount = 20     // Лучшее значение - это 10 или 20. Макисмальное = 100
let allCount = -1      // Ограничитель, сколько мы обработаем постов // = -1, если без ограничения
// let allCount = 1      // Ограничитель, сколько мы обработаем постов // = -1, если без ограничения
// let allCount = 500      // Ограничитель, сколько мы обработаем постов // = -1, если без ограничения

// // Нижняя граница по дате/времени публикации: сохраняем посты от верха стены вниз до этой точки (включительно)
// // Время (необязательно): "02:43:50" | "02⁚43⁚50" | "02:43" | "2h 43m". // Если время не указано — считаем 00:00:00 указанной даты.
let collection_time_before_date = ""
let collection_time_before_time = ""
// let collection_time_before_date = "2026.07.25"   // например "2026.07.02" // Пустая дата = без ограничения по дате
// let collection_time_before_time = "02⁚43⁚50"   // например "02:43:50" или "2h 43m"

// // count - это количество постов, которые вернёт нам сервер max=100
// // offset - это сдвиг, относительно которого нам сервер отправит посты
// // offset сдвигается на count, после каждого автоматического запроса

let bool_isStopedBeforePool = false;     // Мы останавливаем программу, после того как нам встретился опрос?



// Пример значений:
//
// let startCount = 10
// let startOffset = 0
// let allCount = 20




// ---------- Дополнительные настройки ----------

// Путь по умолчанию, где создаются папки Session, в которые будет сохраняться весь контент
// (Относительно исполняемого файла main.js)

let mainPath = 'main/';

let bool_isinfoShow = false;            // Если = true, то в консоль будут выводится дополнительные информационные сообщения




// ---------- Запуск main.js с заданными параметрами ----------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mainJsPath = path.join(__dirname, 'main.js');

// Собирает CLI-аргументы из настроек выше и запускает main.js.
// Используется в конце этого файла как единственная точка запуска парсера через run.js.
function launchMain() {
    const args = [
        mainJsPath,
        `--groupId=${groupId}`,
        `--startOffset=${startOffset}`,
        `--startCount=${startCount}`,
        `--allCount=${allCount}`,
        `--collection_time_before_date=${collection_time_before_date}`,
        `--collection_time_before_time=${collection_time_before_time}`,
        `--bool_isStopedBeforePool=${bool_isStopedBeforePool}`,
        `--mainPath=${mainPath}`,
        `--bool_isinfoShow=${bool_isinfoShow}`,
    ];

    const child = spawn(process.execPath, args, { stdio: 'inherit' });

    child.on('error', (err) => {
        console.error('Не удалось запустить main.js:', err.message);
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

launchMain();
