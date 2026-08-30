// Файл: main_utils.js
// Назначение: переиспользуемые функции парсера VK для разбора CLI, проверки настроек,
// нормализации постов, классификации вложений, определения конца стены и ограниченного
// параллелизма. Не выполняет сеть и запись файлов; используется main.js и тестируется отдельно.

import path from 'path';

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

// Применяет асинхронный обработчик к элементам с заданным числом работников и сохраняет порядок результатов.
// Используется main.js для параллельного сохранения постов одного батча без неограниченного числа операций.
export async function mapWithConcurrency(items, concurrency, mapper) {
    if (!Array.isArray(items)) throw new TypeError('items должен быть массивом');
    if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
        throw new RangeError('concurrency должен быть положительным целым числом');
    }
    if (typeof mapper !== 'function') throw new TypeError('mapper должен быть функцией');
    if (items.length === 0) return [];

    const results = new Array(items.length);
    let nextIndex = 0;

    // Забирает следующий свободный индекс и обрабатывает элементы до опустошения очереди.
    // Несколько экземпляров worker запускаются mapWithConcurrency как ограниченный пул.
    async function worker() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex++;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    }

    const workerCount = Math.min(concurrency, items.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    const settledWorkers = await Promise.allSettled(workers);
    const failedWorker = settledWorkers.find((result) => result.status === 'rejected');
    if (failedWorker) throw failedWorker.reason;
    return results;
}

// Разбирает process.argv в объект параметров; поддерживает --key=value и --key value.
// Используется main.js при формировании конфигурации запуска.
export function parseCliArgs(argv = process.argv) {
    const args = {};
    for (let index = 2; index < argv.length; index++) {
        const token = argv[index];
        if (!token.startsWith('--')) continue;

        const body = token.slice(2);
        const equalsAt = body.indexOf('=');
        if (equalsAt >= 0) {
            args[body.slice(0, equalsAt)] = body.slice(equalsAt + 1);
            continue;
        }

        const next = argv[index + 1];
        if (next !== undefined && !next.startsWith('--')) {
            args[body] = next;
            index++;
        } else {
            args[body] = 'true';
        }
    }
    return args;
}

// Преобразует CLI-значение в boolean и сообщает об ошибке для неизвестного значения.
// Используется main.js для bool_isStopedBeforePool и bool_isinfoShow.
export function parseCliBool(value, defaultValue, optionName) {
    if (value === undefined || value === null || value === '') return defaultValue;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
    throw new Error(`Параметр ${optionName} должен быть true или false`);
}

// Преобразует CLI-значение в строгое целое число без частичных значений вроде "20abc".
// Используется main.js для offset, размера батча и общего лимита.
export function parseCliInt(value, defaultValue, optionName) {
    if (value === undefined || value === null || value === '') return defaultValue;
    const normalized = String(value).trim();
    if (!/^-?\d+$/.test(normalized)) {
        throw new Error(`Параметр ${optionName} должен быть целым числом`);
    }
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed)) {
        throw new Error(`Параметр ${optionName} выходит за допустимый диапазон`);
    }
    return parsed;
}

// Проверяет взаимные ограничения параметров до первого обращения к VK и файловой системе.
// Используется main.js сразу после чтения CLI.
export function validateConfig(config) {
    if (!String(config.groupId ?? '').trim()) throw new Error('Не указан groupId');
    if (!String(config.mainPath ?? '').trim()) throw new Error('Не указан mainPath');
    if (config.startOffset < 0) throw new Error('startOffset не может быть отрицательным');
    if (config.startCount < 1 || config.startCount > 100) {
        throw new Error('startCount должен быть в диапазоне от 1 до 100');
    }
    if (config.allCount < -1) throw new Error('allCount должен быть -1 или неотрицательным числом');
    return config;
}

// Извлекает id или короткое имя сообщества из числа, псевдонима либо ссылки vk.com/vk.ru.
// Используется main.js перед groups.getById.
export function parseGroupIdInput(rawValue) {
    let value = String(rawValue).trim();
    const urlMatch = value.match(/^(?:https?:\/\/)?(?:m\.)?vk\.(?:com|ru)\/([^/?#]+)/i);
    if (urlMatch) value = urlMatch[1];
    const prefixedId = value.match(/^(?:public|club|event)(\d+)$/i);
    return prefixedId ? prefixedId[1] : value;
}

// Создаёт безопасный сегмент пути Windows/Linux, ограничивает длину и защищает от пустого имени.
// Используется main.js для группы, текста в имени файла и других частей путей.
export function sanitizePathSegment(value, maxLength = 80, fallback = 'Без названия') {
    let result = String(value ?? '')
        .replace(/[\u0000-\u001F<>:"/\\|?*]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[.\s]+$/g, '');

    if (!result || WINDOWS_RESERVED_NAMES.test(result)) result = fallback;
    result = Array.from(result).slice(0, maxLength).join('').replace(/[.\s]+$/g, '');
    return result || fallback;
}

// Формирует стабильный ключ поста из owner_id и id для уникальных имён файлов.
// Используется main.js, чтобы одинаковые дата и текст разных постов не конфликтовали.
export function buildStablePostKey(post) {
    return `post ${post.ownerId ?? 'owner'}_${post.id ?? 'post'}`;
}

// Разбирает время границы в форматах HH:mm[:ss], HH⁚mm[:ss] и Xh Ym Zs.
// Используется parseCollectionCutoffUnix при построении временной границы.
export function parseCollectionTime(timeValue) {
    if (timeValue == null || String(timeValue).trim() === '') return { h: 0, m: 0, s: 0 };
    const value = String(timeValue).trim().replace(/⁚/g, ':');
    const units = value.match(/^(\d+)\s*h(?:\s*(\d+)\s*m)?(?:\s*(\d+)\s*s)?$/i);
    const colon = value.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    const match = units ?? colon;
    if (!match) {
        throw new Error(`Не удалось разобрать время границы сбора: "${timeValue}"`);
    }
    const parsed = {
        h: Number(match[1]),
        m: Number(match[2] ?? 0),
        s: Number(match[3] ?? 0),
    };
    if (parsed.h > 23 || parsed.m > 59 || parsed.s > 59) {
        throw new Error(`Некорректное время границы сбора: "${timeValue}"`);
    }
    return parsed;
}

// Возвращает Unix timestamp локальной границы либо null при отключённом ограничении.
// Используется main.js для остановки перед первым постом старше заданной даты.
export function parseCollectionCutoffUnix(dateValue, timeValue) {
    if (dateValue == null || String(dateValue).trim() === '') return null;
    const match = String(dateValue).trim().match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    if (!match) throw new Error(`Не удалось разобрать дату границы сбора: "${dateValue}"`);

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const { h, m, s } = parseCollectionTime(timeValue);
    const date = new Date(year, month - 1, day, h, m, s, 0);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        month < 1 ||
        month > 12
    ) {
        throw new Error('Некорректная дата/время границы сбора');
    }
    return Math.floor(date.getTime() / 1000);
}

// Объединяет текст и вложения исходного поста со всей доступной цепочкой copy_history.
// Используется main.js до проверки даты, опроса и сохранения контента.
export function normalizePost(item) {
    const texts = [];
    const attachments = [];
    const stack = [item];
    const visited = new Set();

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || typeof current !== 'object' || visited.has(current)) continue;
        visited.add(current);
        if (typeof current.text === 'string' && current.text.trim()) texts.push(current.text);
        if (Array.isArray(current.attachments)) attachments.push(...current.attachments);
        if (Array.isArray(current.copy_history)) {
            for (let index = current.copy_history.length - 1; index >= 0; index--) {
                stack.push(current.copy_history[index]);
            }
        }
    }

    return {
        raw: item,
        id: item.id,
        ownerId: item.owner_id,
        date: item.date,
        text: texts.join('\n——————————————————————\n'),
        attachments,
    };
}

// Определяет, является ли документ GIF, не смешивая его с PDF и другими doc-вложениями.
// Используется main.js при формировании списка GIF-ссылок.
export function isGifDocument(attachment) {
    if (attachment?.type !== 'doc' || !attachment.doc) return false;
    const doc = attachment.doc;
    const extension = String(doc.ext ?? '').toLowerCase();
    const title = String(doc.title ?? '').toLowerCase();
    let pathname = '';
    try {
        pathname = new URL(doc.url ?? '').pathname.toLowerCase();
    } catch {
        pathname = '';
    }
    return extension === 'gif' || title.endsWith('.gif') || pathname.endsWith('.gif');
}

// Выбирает валидный вариант фото с наибольшей площадью и непустым URL.
// Используется main.js перед загрузкой каждого photo-вложения.
export function selectLargestPhoto(photo) {
    const sizes = Array.isArray(photo?.sizes) ? photo.sizes : [];
    return sizes
        .filter((size) => typeof size?.url === 'string' && size.url)
        .sort((left, right) => (right.width ?? 0) * (right.height ?? 0) - (left.width ?? 0) * (left.height ?? 0))[0] ?? null;
}

// Строит ссылку на страницу видео и добавляет access_key для ограниченных вложений.
// Используется main.js при записи списка video-ссылок.
export function buildVideoPageUrl(video) {
    if (!video || video.owner_id == null || video.id == null) return null;
    const base = `https://vk.com/video${video.owner_id}_${video.id}`;
    return video.access_key ? `${base}?access_key=${encodeURIComponent(video.access_key)}` : base;
}

// Формирует читаемый текст опроса с вариантами, голосами и доступными итогами.
// Используется main.js при сохранении poll-вложения в отдельный txt-файл.
export function formatPollText(poll) {
    const lines = [String(poll?.question ?? 'Опрос')];
    if (Array.isArray(poll?.answers)) {
        lines.push('');
        for (const answer of poll.answers) {
            const votes = Number.isFinite(answer?.votes) ? ` — голосов: ${answer.votes}` : '';
            const rate = Number.isFinite(answer?.rate) ? ` (${answer.rate}%)` : '';
            lines.push(`- ${answer?.text ?? 'Без названия'}${votes}${rate}`);
        }
    }
    if (Number.isFinite(poll?.votes)) lines.push('', `Всего голосов: ${poll.votes}`);
    return lines.join('\n');
}

// Возвращает true, когда стена закончена: пустой батч или nextOffset дошёл до response.count.
// Короткий батч (items < count) сам по себе не конец: VK иногда отдаёт меньше постов
// из‑за скрытых/удалённых, при этом response.count ещё далеко впереди.
// Используется основным циклом main.js вместо эвристики по скорости ответа.
export function isEndOfWall({ itemsLength, requestedCount, nextOffset, totalCount }) {
    if (itemsLength === 0) return true;
    if (Number.isFinite(totalCount) && nextOffset >= totalCount) return true;
    return false;
}

// Рассчитывает размер следующего wall.get с учётом общего лимита текущей сессии.
// Используется main.js перед каждым пакетным запросом.
export function getNextRequestCount(startCount, allCount, processedCount) {
    if (allCount === -1) return startCount;
    return Math.max(0, Math.min(startCount, allCount - processedCount));
}

// Проверяет, находится ли пост строго ниже включительной временной границы.
// Используется main.js до сохранения очередного поста.
export function isPostBelowCutoff(postDate, cutoffUnix) {
    return cutoffUnix != null && postDate < cutoffUnix;
}

// Возвращает причину остановки после сохранённого поста либо пустую строку.
// Используется main.js для allCount и режима остановки после первого опроса.
export function getStopReasonAfterPost({ processedCount, allCount, hasPoll, stopAfterPoll }) {
    if (stopAfterPoll && hasPoll) return 'обработан первый пост с опросом';
    if (allCount !== -1 && processedCount >= allCount) return 'достигнут лимит allCount';
    return '';
}

// Возвращает расширение файла по MIME-типу проверенного изображения.
// Используется main.js после HTTP-загрузки изображения.
export function extensionForImageContentType(contentType) {
    const normalized = String(contentType).split(';')[0].trim().toLowerCase();
    return new Map([
        ['image/jpeg', '.jpg'],
        ['image/jpg', '.jpg'],
        ['image/png', '.png'],
        ['image/webp', '.webp'],
        ['image/gif', '.gif'],
    ]).get(normalized) ?? path.extname('fallback.jpg');
}
