import 'dotenv/config';
import fetch from 'node-fetch';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// ---------- Режим аналитики ----------

// export const isAnalitycs = true;
export const isAnalitycs = false;

// ---------- Настройки (как в main.js) ----------

const accessToken = process.env.ACCESS_TOKEN ?? '';
const groupId = '213046214';

const SAMPLE_POSTS_COUNT = 20;
const SERVICE_BYTES_PER_POST = 50;
const DOWNLOAD_BATCH_SIZE = 5;
const API_VERSION = '5.130';

const DOWNLOAD_RANDOM_IMAGE = true;
const RANDOM_IMAGE_MAX_ATTEMPTS = 15;
const TEMP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'temp');

// ---------- Результаты аналитики ----------

let totalPostsInGroup = 0;
let imageCountCoefficient = 0;   // среднее кол-во картинок в посте
let averageImageWeight = 0;      // средний вес одной картинки (байт)
let totalContentWeight = 0;      // оценка веса всего контента группы (байт)

// ---------- VK API ----------

// Запрос к VK API: собирает URL, отправляет метод, возвращает response или бросает ошибку.
// Используется во всех функциях файла, где нужны данные группы и стены.
async function vkApi(method, params = {}) {
    const query = new URLSearchParams({
        ...params,
        access_token: accessToken,
        v: API_VERSION,
    });

    const response = await fetch(`https://api.vk.com/method/${method}?${query}`);
    const json = await response.json();

    if (json.error) {
        throw new Error(`VK API ${json.error.error_code}: ${json.error.error_msg}`);
    }

    return json.response;
}

// ---------- Работа с постами и картинками ----------

// Достаёт из поста вложения типа photo, включая репосты (copy_history).
// Используется в runGroupAnalytics и downloadRandomGroupImage (через collectPhotoUrlsFromPosts).
function extractPhotosFromPost(item) {
    let attachments = item.attachments ?? [];

    if (item.copy_history?.length > 0 && item.copy_history[0].attachments) {
        attachments = attachments.concat(item.copy_history[0].attachments);
    }

    return attachments.filter((attachment) => attachment.type === 'photo');
}

// Выбирает URL картинки с максимальным разрешением из массива sizes.
// Используется в runGroupAnalytics, collectPhotoUrlsFromPosts.
function getMaxResolutionUrl(photo) {
    let maxResolution = 0;
    let maxResolutionUrl = '';

    for (const size of photo.sizes) {
        const resolution = size.width * size.height;
        if (resolution > maxResolution) {
            maxResolution = resolution;
            maxResolutionUrl = size.url;
        }
    }

    return maxResolutionUrl;
}

// Скачивает картинку по HTTPS-ссылке и возвращает Buffer.
// Используется в runGroupAnalytics и downloadRandomGroupImage.
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

// Выполняет асинхронные задачи пакетами фиксированного размера (без перегрузки сети).
// Используется в runGroupAnalytics для параллельной загрузки картинок выборки.
async function runInBatches(items, batchSize, fn) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(fn));
    }
}

// Форматирует размер в байтах в читаемую строку (Б, КБ, МБ, ГБ).
// Используется в runGroupAnalytics и downloadRandomGroupImage для вывода в консоль.
function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} КБ`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

// Собирает URL картинок максимального качества из списка постов.
// Используется в downloadRandomGroupImage при разборе случайного поста.
function collectPhotoUrlsFromPosts(posts) {
    const urls = [];

    for (const post of posts) {
        const photos = extractPhotosFromPost(post);

        for (const photoAttachment of photos) {
            const photoUrl = getMaxResolutionUrl(photoAttachment.photo);
            if (photoUrl) {
                urls.push(photoUrl);
            }
        }
    }

    return urls;
}

// Создаёт папку, если её ещё нет (recursive).
// Используется в downloadRandomGroupImage перед сохранением файла в Temp.
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Открывает файл в программе по умолчанию (Windows / macOS / Linux).
// Используется в downloadRandomGroupImage после сохранения картинки.
function openFile(filePath) {
    const quotedPath = `"${filePath}"`;

    if (process.platform === 'win32') {
        exec(`start "" ${quotedPath}`);
        return;
    }

    if (process.platform === 'darwin') {
        exec(`open ${quotedPath}`);
        return;
    }

    exec(`xdg-open ${quotedPath}`);
}

// Скачивает случайную картинку из случайного поста всей группы, сохраняет в Temp и открывает.
// Экспортируется; вызывается при запуске файла (DOWNLOAD_RANDOM_IMAGE) или из других модулей.
export async function downloadRandomGroupImage(options = {}) {
    const {
        groupId: groupIdOverride = groupId,
        maxAttempts = RANDOM_IMAGE_MAX_ATTEMPTS,
        openAfterDownload = true,
        tempDir = TEMP_DIR,
    } = options;

    const wallMeta = await vkApi('wall.get', {
        owner_id: `-${groupIdOverride}`,
        count: '1',
        offset: '0',
    });

    const totalPostsInGroup = wallMeta.count ?? 0;

    if (totalPostsInGroup === 0) {
        console.log('В группе нет постов.');
        return null;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const randomOffset = Math.floor(Math.random() * totalPostsInGroup);

        const wallResponse = await vkApi('wall.get', {
            owner_id: `-${groupIdOverride}`,
            count: '1',
            offset: String(randomOffset),
        });

        const post = wallResponse.items?.[0];
        if (!post) {
            continue;
        }

        const photoUrls = collectPhotoUrlsFromPosts([post]);
        if (photoUrls.length === 0) {
            continue;
        }

        const randomPhotoIndex = Math.floor(Math.random() * photoUrls.length);
        const randomUrl = photoUrls[randomPhotoIndex];
        const postNumber = randomOffset + 1;
        const buffer = await downloadImage(randomUrl);

        ensureDir(tempDir);

        const fileName = photoUrls.length > 1
            ? `${postNumber}_${randomPhotoIndex + 1}.jpg`
            : `${postNumber}.jpg`;
        const filePath = path.join(tempDir, fileName);

        fs.writeFileSync(filePath, buffer);

        console.log('');
        console.log('————————————— Случайная картинка —————————————');
        console.log(`Пост: ${postNumber} из ${totalPostsInGroup}`);
        console.log(`Картинок в посте: ${photoUrls.length}`);
        console.log(`Сохранено: ${filePath}`);
        console.log(`Размер: ${formatBytes(buffer.length)}`);

        if (openAfterDownload) {
            openFile(filePath);
            console.log('Картинка открыта в программе просмотра по умолчанию.');
        }

        return {
            filePath,
            size: buffer.length,
            url: randomUrl,
            totalPostsInGroup,
            postOffset: randomOffset,
            postNumber,
            photosInPost: photoUrls.length,
        };
    }

    console.log(`Не удалось найти пост с картинкой за ${maxAttempts} попыток.`);
    return null;
}

// ---------- Основная аналитика ----------

// Оценивает объём контента группы: среднее число картинок в посте, их вес, итог по всей стене.
// Экспортируется; вызывается при запуске файла (isAnalitycs) или из других модулей.
export async function runGroupAnalytics(options = {}) {
    const {
        groupId: groupIdOverride = groupId,
        samplePostsCount = SAMPLE_POSTS_COUNT,
    } = options;

    const resolvedGroupId = groupIdOverride;

    console.log('');
    console.log('———————————————————————————————————————————————————————————');
    console.log('Режим аналитики группы ВКонтакте');
    console.log('');

    if (!accessToken) {
        console.log('🔴 Error! Не указан ACCESS_TOKEN в файле .env');
        process.exit(1);
    }

    const groupInfo = await vkApi('groups.getById', { group_id: resolvedGroupId });
    const groupName = groupInfo[0].name;

    console.log(`Группа: ${groupName} (id: ${resolvedGroupId})`);
    console.log('');

    const wallResponse = await vkApi('wall.get', {
        owner_id: `-${resolvedGroupId}`,
        count: String(Math.min(samplePostsCount, 100)),
        offset: '0',
    });

    totalPostsInGroup = wallResponse.count;

    const samplePosts = wallResponse.items ?? [];
    const sampleSize = samplePosts.length;

    console.log(`Общее число постов в группе: ${totalPostsInGroup}`);
    console.log(`Анализируем первые ${sampleSize} постов (запрошено: ${samplePostsCount})`);
    console.log('');

    if (sampleSize === 0) {
        console.log('В группе нет постов для анализа.');
        return {
            groupName,
            totalPostsInGroup,
            imageCountCoefficient: 0,
            averageImageWeight: 0,
            totalContentWeight: 0,
        };
    }

    let totalPhotosInSample = 0;
    let totalImageBytes = 0;
    let downloadedImages = 0;

    const downloadTasks = [];

    for (let i = 0; i < samplePosts.length; i++) {
        const post = samplePosts[i];
        const photos = extractPhotosFromPost(post);
        totalPhotosInSample += photos.length;

        console.log(`Пост ${i + 1}: картинок — ${photos.length}`);

        for (const photoAttachment of photos) {
            const photoUrl = getMaxResolutionUrl(photoAttachment.photo);
            if (photoUrl) {
                downloadTasks.push({ photoUrl, postIndex: i + 1 });
            }
        }
    }

    await runInBatches(downloadTasks, DOWNLOAD_BATCH_SIZE, async ({ photoUrl, postIndex }) => {
        try {
            const buffer = await downloadImage(photoUrl);
            totalImageBytes += buffer.length;
            downloadedImages++;
        } catch (err) {
            console.log(`  ⚠️ Пост ${postIndex}: не удалось загрузить картинку: ${err.message}`);
        }
    });

    imageCountCoefficient = totalPhotosInSample / sampleSize;
    averageImageWeight = downloadedImages > 0 ? totalImageBytes / downloadedImages : 0;

    const estimatedTotalImages = imageCountCoefficient * totalPostsInGroup;
    const estimatedImagesWeight = estimatedTotalImages * averageImageWeight;
    const serviceOverhead = totalPostsInGroup * SERVICE_BYTES_PER_POST;
    totalContentWeight = estimatedImagesWeight + serviceOverhead;

    console.log('');
    console.log('————————————— Результаты —————————————');
    console.log(`Коэффициент кол-ва картинок в посте: ${imageCountCoefficient.toFixed(3)}`);
    console.log(`Средний вес одной картинки: ${formatBytes(Math.round(averageImageWeight))}`);
    console.log(`Оценка числа картинок во всей группе: ${Math.round(estimatedTotalImages)}`);
    // console.log(`Вес картинок (оценка): ${formatBytes(Math.round(estimatedImagesWeight))}`);
    // console.log(`Вес всего контента в группе (оценка): ${formatBytes(Math.round(totalContentWeight))} (${Math.round(totalContentWeight)} байт)`);
    console.log(`🟢 Примерный вес всего контента в группе (оценка): ${formatBytes(Math.round(totalContentWeight))}`);
    console.log('');

    return {
        groupName,
        totalPostsInGroup,
        sampleSize,
        totalPhotosInSample,
        downloadedImages,
        imageCountCoefficient,
        averageImageWeight,
        estimatedTotalImages,
        estimatedImagesWeight,
        serviceOverhead,
        totalContentWeight,
    };
}

// ---------- Запуск ----------

if (isAnalitycs || DOWNLOAD_RANDOM_IMAGE) {
    (async () => {
        if (!accessToken) {
            console.log('🔴 Error! Не указан ACCESS_TOKEN в файле .env');
            process.exit(1);
        }

        if (isAnalitycs) {
            await runGroupAnalytics();
        }

        if (DOWNLOAD_RANDOM_IMAGE) {
            await downloadRandomGroupImage();
        }
    })().catch((err) => {
        console.log('');
        console.log('🔴 Error! Программа остановлена с ошибкой:');
        console.log(err.message);
        process.exit(1);
    });
}
