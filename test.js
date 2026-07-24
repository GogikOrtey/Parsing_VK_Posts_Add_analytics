import 'dotenv/config';
import fetch from 'node-fetch';

// ---------- Настройки ----------

// Ключ доступа к API (задаётся в файле .env)
const accessToken = process.env.ACCESS_TOKEN ?? '';

// ID, короткое имя или ссылка на группу ВКонтакте
// Примеры: '224924750', 'creativityal', 'https://vk.com/creativityal', 'https://vk.ru/snowarts'
let groupId = 'https://vk.ru/snowarts';

const API_VERSION = '5.130';

// ---------- Программа ----------

console.log('');
console.log('—————————————————————————————————————————————');
console.log('test.js — данные второго сверху поста группы');
console.log('—————————————————————————————————————————————');
console.log('');

if (accessToken === '') {
    console.log('В программе не указан Ключ доступа к API. Его нужно указать в файле .env (переменная ACCESS_TOKEN)');
    console.log('🔴 Error! Программа остановлена с ошибкой');
    process.exit(1);
}

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

// Запрос к VK API: отправляет метод, возвращает response или завершает программу при ошибке.
// Используется для groups.getById и wall.get.
async function vkApi(method, params = {}) {
    const query = new URLSearchParams({
        ...params,
        access_token: accessToken,
        v: API_VERSION,
    });

    const response = await fetch(`https://api.vk.com/method/${method}?${query}`);
    const json = await response.json();

    if (json.error) {
        console.log('');
        console.log('🔴 Error! Программа остановлена с ошибкой');
        console.log(`Код ошибки VK API: ${json.error.error_code}, сообщение: ${json.error.error_msg}`);
        process.exit(1);
    }

    return json.response;
}

groupId = parseGroupIdInput(groupId);

const groupInfoList = await vkApi('groups.getById', { group_id: groupId });
const groupInfo = groupInfoList?.[0];

if (!groupInfo) {
    console.log('🔴 Error! Не удалось получить информацию о группе, проверьте groupId');
    process.exit(1);
}

groupId = String(groupInfo.id);

console.log('Название группы:', groupInfo.name);
console.log('ID группы:', groupId);
console.log('');

// Берём 2 поста с верха стены: items[0] — первый, items[1] — второй сверху
const wall = await vkApi('wall.get', {
    owner_id: `-${groupId}`,
    offset: '0',
    count: '2',
});

const posts = wall?.items ?? [];

console.log('Всего постов на стене (по данным VK):', wall?.count ?? '?');
console.log('Получено постов в ответе:', posts.length);
console.log('');

if (posts.length < 2) {
    console.log('🔴 Error! На стене меньше двух постов — второго сверху нет');
    console.log('Полный ответ wall.get:');
    console.log(JSON.stringify(wall, null, 2));
    process.exit(1);
}

const secondPost = posts[1];

console.log('========== Второй сверху пост (сырые данные) ==========');
console.log(JSON.stringify(secondPost, null, 2));
console.log('');
console.log('========== Полный ответ wall.get (для справки) ==========');
console.log(JSON.stringify(wall, null, 2));
console.log('');
console.log('🟢 Готово');
