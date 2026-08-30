// Файл: main.js
// Назначение: основная программа выгрузки постов ВКонтакте. Получает стену пакетами через
// wall.get, последовательно обрабатывает посты, полностью ожидает запись текста/фото/опросов
// и сохраняет упорядоченные ссылки на GIF/video. Настройки приходят из CLI (обычно от
// run_main.js), ACCESS_TOKEN — из .env; результаты складываются в Session-папку.

import 'dotenv/config';
import fs from 'fs/promises';
import moment from 'moment';
import { spawn } from 'child_process';
import path from 'path';
import {
    buildStablePostKey,
    buildVideoPageUrl,
    extensionForImageContentType,
    formatPollText,
    getNextRequestCount,
    getStopReasonAfterPost,
    isEndOfWall,
    isGifDocument,
    isPostBelowCutoff,
    normalizePost,
    parseCliArgs,
    parseCliBool,
    parseCliInt,
    parseCollectionCutoffUnix,
    parseGroupIdInput,
    sanitizePathSegment,
    selectLargestPhoto,
    validateConfig,
} from './main_utils.js';
import { callVkApi, downloadImageBuffer } from './network.js';

const API_VERSION = '5.130';
const FILE_TEXT_LIMIT = 80;

// Формирует и проверяет конфигурацию запуска из CLI.
// Используется main() до любых сетевых и файловых операций.
function readConfig(argv = process.argv) {
    const cli = parseCliArgs(argv);
    return validateConfig({
        groupId: cli.groupId ?? '',
        startOffset: parseCliInt(cli.startOffset, 0, 'startOffset'),
        startCount: parseCliInt(cli.startCount, 20, 'startCount'),
        allCount: parseCliInt(cli.allCount, -1, 'allCount'),
        collectionDate: cli.collection_time_before_date ?? '',
        collectionTime: cli.collection_time_before_time ?? '',
        stopAfterPoll: parseCliBool(cli.bool_isStopedBeforePool, false, 'bool_isStopedBeforePool'),
        mainPath: cli.mainPath ?? 'main/',
        verbose: parseCliBool(cli.bool_isinfoShow, false, 'bool_isinfoShow'),
    });
}

// Печатает повтор сетевой операции с причиной и рассчитанной задержкой.
// Передаётся сетевому модулю для единообразного журнала retry.
function logRetry(label) {
    return (error, attempt, attempts, delayMs) => {
        console.log(
            `Предупреждение: ${label}, попытка ${attempt}/${attempts}: ${error.message}. ` +
            `Повтор через ${(delayMs / 1000).toFixed(1)} с`,
        );
    };
}

// Записывает через временный файл и rename; на Windows заменяет существующий файл после EPERM.
// Используется для текста, ссылок, опросов, изображений и итогового checkpoint без прямой перезаписи.
async function writeFileAtomic(targetPath, content) {
    const temporaryPath = `${targetPath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    try {
        await fs.writeFile(temporaryPath, content);
        try {
            await fs.rename(temporaryPath, targetPath);
        } catch (error) {
            if (!['EEXIST', 'EPERM'].includes(error.code)) throw error;
            // Windows не поддерживает POSIX-замену существующего файла через rename.
            await fs.rm(targetPath, { force: true });
            await fs.rename(temporaryPath, targetPath);
        }
    } catch (error) {
        await fs.rm(temporaryPath, { force: true }).catch(() => {});
        throw error;
    }
}

// Ставит файлу дату публикации поста; сбой метаданных не удаляет успешно сохранённый файл.
// Используется после записи текста, фото и опроса.
async function setPostFileTime(filePath, unixTime, verbose) {
    try {
        await fs.utimes(filePath, unixTime, unixTime);
        if (verbose) console.log(`Время файла установлено: ${moment.unix(unixTime).format('YYYY.MM.DD HH⁚mm⁚ss')}`);
    } catch (error) {
        console.log(`Предупреждение: не удалось установить время файла ${path.basename(filePath)}: ${error.message}`);
    }
}

// Создаёт новую уникальную Session-папку и внутреннюю папку Контент.
// Используется main() после успешного получения информации о группе.
async function createSessionDirectories(rootPath, groupName) {
    await fs.mkdir(rootPath, { recursive: true });
    const stamp = moment().format('YYYY.MM.DD HH⁚mm⁚ss.SSS');
    const baseName = sanitizePathSegment(`Session [${stamp}] ${groupName}`, 110, `Session [${stamp}]`);
    let sessionPath = path.join(rootPath, baseName);
    let suffix = 1;

    while (true) {
        try {
            await fs.mkdir(sessionPath);
            break;
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
            suffix++;
            sessionPath = path.join(rootPath, `${baseName} (${suffix})`);
        }
    }

    const contentPath = path.join(sessionPath, 'Контент');
    await fs.mkdir(contentPath);
    return { sessionPath, contentPath };
}

// Возвращает краткую сводку типов вложений и главную иконку поста для журнала.
// Используется processPost перед сохранением контента.
function summarizeAttachments(attachments) {
    const counts = {};
    for (const attachment of attachments) {
        const type = attachment?.type ?? 'other';
        counts[type] = (counts[type] ?? 0) + 1;
    }
    let icon = 'Предупреждение';
    if (counts.video) icon = 'Видео';
    else if (counts.doc) icon = 'Документ';
    else if (counts.photo) icon = 'Фото';
    else if (counts.poll) icon = 'Опрос';
    const details = Object.entries(counts).map(([type, count]) => `${type}×${count}`).join(' ');
    return { icon, details: details || 'без вложений' };
}

// Формирует устойчивый префикс имени по дате и стабильному VK id поста.
// Используется всеми файлами одного поста для защиты от совпадений текста и времени.
function buildPostPrefix(post, dateLabel) {
    return `[${dateLabel}] [${buildStablePostKey(post)}]`;
}

// Сохраняет полный текст поста независимо от его длины и возвращает короткий фрагмент для фото.
// Используется processPost один раз для каждого непустого текста.
async function savePostText(post, context, prefix) {
    if (!post.text) return '';
    const shortText = sanitizePathSegment(post.text, FILE_TEXT_LIMIT, 'Текст поста');
    const filePath = path.join(context.contentPath, `${prefix} ${shortText}.txt`);
    await writeFileAtomic(filePath, post.text);
    await setPostFileTime(filePath, post.date, context.verbose);
    context.stats.texts++;
    context.batchStats.texts++;
    if (context.verbose) console.log(`Текст сохранён: ${path.basename(filePath)}`);
    return shortText;
}

// Загружает и атомарно сохраняет одну фотографию с проверкой URL, MIME и размера.
// Используется savePostPhotos для параллельной обработки фото одного поста.
async function saveOnePhoto(photoAttachment, index, total, post, context, prefix, shortText) {
    const selectedSize = selectLargestPhoto(photoAttachment?.photo);
    if (!selectedSize) throw new Error('у photo-вложения нет валидного sizes.url');
    const downloaded = await downloadImageBuffer(selectedSize.url, {
        onRetry: logRetry('повтор загрузки изображения'),
    });
    const extension = extensionForImageContentType(downloaded.contentType);
    const textPart = shortText ? ` ${shortText}` : '';
    const numberPart = total > 1 ? ` - ${index + 1}` : '';
    const filePath = path.join(context.contentPath, `${prefix}${textPart}${numberPart}${extension}`);
    await writeFileAtomic(filePath, downloaded.buffer);
    await setPostFileTime(filePath, post.date, context.verbose);
    context.stats.photos++;
    context.batchStats.photos++;
    if (context.verbose) console.log(`Фото сохранено: ${path.basename(filePath)}`);
}

// Параллельно сохраняет фото одного поста и изолирует ошибку каждого отдельного файла.
// Используется processPost; запросы wall.get при этом не параллелятся.
async function savePostPhotos(photos, post, context, prefix, shortText, globalNumber) {
    const tasks = photos.map((attachment, index) => (
        saveOnePhoto(attachment, index, photos.length, post, context, prefix, shortText)
    ));
    const results = await Promise.allSettled(tasks);
    for (let index = 0; index < results.length; index++) {
        const result = results[index];
        if (result.status === 'fulfilled') continue;
        context.stats.photoErrors++;
        context.batchStats.photoErrors++;
        console.log(
            `Предупреждение: фото ${index + 1}/${photos.length} поста №${globalNumber} не сохранено: ` +
            `${result.reason?.message ?? result.reason}`,
        );
    }
}

// Добавляет GIF и video текущего поста в упорядоченные буферы ссылок.
// Используется processPost после нормализации всей copy_history.
function collectMediaLinks(post, shortText, context, prefix) {
    const heading = shortText ? `${prefix} ${shortText}` : prefix;
    const gifUrls = post.attachments
        .filter(isGifDocument)
        .map((attachment) => attachment.doc?.url)
        .filter(Boolean);
    const videoUrls = post.attachments
        .filter((attachment) => attachment?.type === 'video')
        .map((attachment) => buildVideoPageUrl(attachment.video))
        .filter(Boolean);

    if (gifUrls.length > 0) {
        context.gifSections.push(`${heading}\n${gifUrls.join('\n')}`);
        context.stats.gifs += gifUrls.length;
        context.batchStats.gifs += gifUrls.length;
    }
    if (videoUrls.length > 0) {
        context.videoSections.push(`${heading}\n${videoUrls.join('\n')}`);
        context.stats.videos += videoUrls.length;
        context.batchStats.videos += videoUrls.length;
    }
}

// Сохраняет каждый найденный опрос вместе с вариантами и доступными итогами.
// Используется processPost; возвращает число опросов для логики остановки.
async function savePolls(polls, post, context, prefix) {
    for (let index = 0; index < polls.length; index++) {
        const poll = polls[index].poll;
        const question = sanitizePathSegment(poll?.question, 60, 'Опрос');
        const numberPart = polls.length > 1 ? ` ${index + 1}` : '';
        const filePath = path.join(context.contentPath, `${prefix} Опрос${numberPart} ${question}.txt`);
        await writeFileAtomic(filePath, formatPollText(poll));
        await setPostFileTime(filePath, post.date, context.verbose);
        context.stats.texts++;
        context.batchStats.texts++;
        if (context.verbose) console.log(`Опрос сохранён: ${path.basename(filePath)}`);
    }
    return polls.length;
}

// Полностью обрабатывает один нормализованный пост и возвращает факт наличия опроса.
// Основной цикл вызывает функцию последовательно, сохраняя порядок стены.
async function processPost(post, context, globalNumber) {
    const dateLabel = moment.unix(post.date).format('YYYY.MM.DD HH⁚mm⁚ss');
    const prefix = buildPostPrefix(post, dateLabel);
    const summary = summarizeAttachments(post.attachments);
    console.log(`${summary.icon}: пост №${globalNumber}, ${dateLabel}, ${summary.details}`);

    context.stats.posts++;
    context.batchStats.posts++;
    if (!context.batchStats.firstDate) context.batchStats.firstDate = dateLabel;
    context.batchStats.lastDate = dateLabel;

    const shortText = await savePostText(post, context, prefix);
    const photos = post.attachments.filter((attachment) => attachment?.type === 'photo');
    await savePostPhotos(photos, post, context, prefix, shortText, globalNumber);
    collectMediaLinks(post, shortText, context, prefix);
    const polls = post.attachments.filter((attachment) => attachment?.type === 'poll' && attachment.poll);
    await savePolls(polls, post, context, prefix);
    return { hasPoll: polls.length > 0 };
}

// Атомарно обновляет файлы ссылок из накопленных секций, сохраняя порядок постов.
// Вызывается после каждого батча и перед итоговой сводкой.
async function flushLinkFiles(context) {
    const videoText = `Все ссылки на видео из постов\n\nГруппа: ${context.groupName}\n\n${context.videoSections.join('\n\n')}`;
    const gifText = `Все ссылки на GIF из постов\n\nГруппа: ${context.groupName}\n\n${context.gifSections.join('\n\n')}`;
    await Promise.all([
        writeFileAtomic(context.videoLinksPath, videoText.trimEnd() + '\n'),
        writeFileAtomic(context.gifLinksPath, gifText.trimEnd() + '\n'),
    ]);
}

// Печатает статистику полностью завершённого батча.
// Используется основным циклом только после ожидания всех операций записи.
function logBatchSummary(batchStats, totalCount, processedTotal) {
    const parts = [
        `постов ${batchStats.posts}`,
        `фото ${batchStats.photos}`,
        `текст ${batchStats.texts}`,
        `video ${batchStats.videos}`,
        `gif ${batchStats.gifs}`,
    ];
    if (batchStats.photoErrors) parts.push(`ошибок фото ${batchStats.photoErrors}`);
    const dates = batchStats.firstDate ? `, даты ${batchStats.firstDate} → ${batchStats.lastDate}` : '';
    console.log(
        `Батч offset=${batchStats.offset}, получено ${batchStats.received}${dates}; ` +
        `${parts.join(', ')}; обработано за сессию ${processedTotal} из ${totalCount}`,
    );
}

// Открывает Session-папку системным файловым менеджером без блокировки Node-процесса.
// Используется finishSession после завершения всех записей.
async function openSaveFolder(folderPath) {
    const absolutePath = path.resolve(folderPath);
    let child;
    if (process.platform === 'win32') {
        child = spawn('explorer.exe', [absolutePath], { detached: true, stdio: 'ignore', windowsHide: true });
    } else if (process.platform === 'darwin') {
        child = spawn('open', [absolutePath], { detached: true, stdio: 'ignore' });
    } else {
        child = spawn('xdg-open', [absolutePath], { detached: true, stdio: 'ignore' });
    }
    child.on('error', (error) => console.log(`Предупреждение: папка не открыта: ${error.message}`));
    child.unref();
}

// Сохраняет точный checkpoint, печатает итог и открывает папку только после завершения I/O.
// Используется main() для всех штатных причин остановки.
async function finishSession(context, stopReason, resumeOffset, reachedEnd) {
    await flushLinkFiles(context);
    const summary = [
        `постов ${context.stats.posts}`,
        `фото ${context.stats.photos}`,
        `текст ${context.stats.texts}`,
        `video ${context.stats.videos}`,
        `gif ${context.stats.gifs}`,
        `ошибок фото ${context.stats.photoErrors}`,
    ].join(' | ');
    const checkpoint = reachedEnd
        ? `Стена сообщества полностью обработана. Следующий offset: ${resumeOffset}.`
        : `Следующий offset для продолжения: ${resumeOffset}. Причина остановки: ${stopReason}.`;
    const checkpointName = reachedEnd
        ? `Стена группы ${context.groupName} обработана полностью.txt`
        : `Точка продолжения группы ${context.groupName}.txt`;
    await writeFileAtomic(path.join(context.sessionPath, sanitizePathSegment(checkpointName, 120, 'Точка продолжения.txt')), checkpoint);

    console.log('');
    console.log('Программа успешно завершилась');
    console.log(`Сводка: ${summary}`);
    console.log(`Причина остановки: ${stopReason}`);
    console.log(`Папка сессии: ${context.sessionPath}`);
    console.log(checkpoint);
    console.log('PARSER_EXIT ok');
    await openSaveFolder(context.sessionPath);
}

// Создаёт пустую статистику очередного wall.get для точного итога батча.
// Используется main() перед обработкой полученных items.
function createBatchStats(offset, received) {
    return {
        offset,
        received,
        posts: 0,
        photos: 0,
        texts: 0,
        videos: 0,
        gifs: 0,
        photoErrors: 0,
        firstDate: null,
        lastDate: null,
    };
}

// Выполняет всю сессию: проверяет вход, получает группу, циклически читает стену и завершает I/O.
// Вызывается единожды внизу файла; ошибки передаются общему обработчику без process.exit().
async function main() {
    console.log('\nПарсер контента ВКонтакте v2.0\n');
    const config = readConfig();
    const accessToken = process.env.ACCESS_TOKEN ?? '';
    if (!accessToken) throw new Error('В .env не указан ACCESS_TOKEN');
    const collectionCutoffUnix = parseCollectionCutoffUnix(config.collectionDate, config.collectionTime);
    const normalizedGroupId = parseGroupIdInput(config.groupId);

    const groupResponse = await callVkApi('groups.getById', { group_id: normalizedGroupId }, {
        accessToken,
        apiVersion: API_VERSION,
        onRetry: logRetry('не удалось получить информацию о группе'),
    });
    const group = Array.isArray(groupResponse) ? groupResponse[0] : groupResponse?.groups?.[0];
    if (!group?.id) throw new Error('VK не вернул информацию о группе; проверьте groupId и права токена');

    const groupName = sanitizePathSegment(group.name, 48, `Группа ${group.id}`);
    const rootPath = path.resolve(config.mainPath);
    const { sessionPath, contentPath } = await createSessionDirectories(rootPath, groupName);
    const context = {
        groupName,
        sessionPath,
        contentPath,
        verbose: config.verbose,
        stats: { posts: 0, photos: 0, texts: 0, videos: 0, gifs: 0, photoErrors: 0 },
        batchStats: null,
        videoSections: [],
        gifSections: [],
        videoLinksPath: path.join(sessionPath, `Ссылки на видео из группы ${groupName}.txt`),
        gifLinksPath: path.join(sessionPath, `Ссылки на GIF из группы ${groupName}.txt`),
    };
    await flushLinkFiles(context);

    console.log(`Группа: ${groupName} (${group.id})`);
    console.log(`Начальный offset: ${config.startOffset}; размер батча: ${config.startCount}`);
    if (collectionCutoffUnix != null) {
        console.log(`Нижняя граница: ${moment.unix(collectionCutoffUnix).format('YYYY.MM.DD HH⁚mm⁚ss')} включительно`);
    }

    let offset = config.startOffset;
    let totalCount = 0;
    let stopReason = '';
    let reachedEnd = false;
    let shouldStop = false;

    while (!shouldStop) {
        const requestedCount = getNextRequestCount(config.startCount, config.allCount, context.stats.posts);
        if (requestedCount <= 0) {
            stopReason = 'достигнут лимит allCount';
            break;
        }
        console.log(`\nЗапрос wall.get: offset=${offset}, count=${requestedCount}`);
        const response = await callVkApi('wall.get', {
            owner_id: -Number(group.id),
            offset,
            count: requestedCount,
        }, {
            accessToken,
            apiVersion: API_VERSION,
            onRetry: logRetry('ошибка wall.get'),
        });
        if (!response || !Array.isArray(response.items) || !Number.isFinite(response.count)) {
            throw new Error('VK wall.get вернул ответ неожиданного формата');
        }

        totalCount = response.count;
        context.batchStats = createBatchStats(offset, response.items.length);
        const batchOffset = offset;
        let inspectedInBatch = 0;

        for (const rawItem of response.items) {
            const post = normalizePost(rawItem);
            const itemOffset = batchOffset + inspectedInBatch;
            inspectedInBatch++;

            if (!Number.isFinite(post.date)) {
                console.log(`Предупреждение: пост на offset=${itemOffset} пропущен — отсутствует дата`);
                continue;
            }
            if (isPostBelowCutoff(post.date, collectionCutoffUnix)) {
                stopReason = 'достигнута нижняя граница даты';
                offset = itemOffset;
                shouldStop = true;
                break;
            }

            const result = await processPost(post, context, itemOffset + 1);
            offset = itemOffset + 1;
            const postStopReason = getStopReasonAfterPost({
                processedCount: context.stats.posts,
                allCount: config.allCount,
                hasPoll: result.hasPoll,
                stopAfterPoll: config.stopAfterPoll,
            });
            if (postStopReason) {
                stopReason = postStopReason;
                shouldStop = true;
                break;
            }
        }

        await flushLinkFiles(context);
        logBatchSummary(context.batchStats, totalCount, context.stats.posts);
        if (shouldStop) break;

        // Сдвигаем на запрошенный count, а не на items.length: VK иногда отдаёт
        // меньше постов (дыры/скрытые), и сдвиг по длине батча приводит к дублям.
        offset = batchOffset + requestedCount;
        if (isEndOfWall({
            itemsLength: response.items.length,
            requestedCount,
            nextOffset: offset,
            totalCount,
        })) {
            reachedEnd = true;
            stopReason = 'достигнут конец стены сообщества';
            break;
        }
    }

    await finishSession(context, stopReason || 'завершено', offset, reachedEnd);
}

main().catch((error) => {
    console.error('');
    console.error(`Программа остановлена с ошибкой: ${error.message}`);
    if (error.cause && process.env.DEBUG) console.error(error.cause);
    console.error('PARSER_EXIT error');
    process.exitCode = 1;
});
