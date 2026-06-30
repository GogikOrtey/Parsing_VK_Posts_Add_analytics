import 'dotenv/config';
import fetch from 'node-fetch';
import https from 'https';

// ---------- Режим аналитики ----------

export const isAnalitycs = true;

// ---------- Настройки (как в main.js) ----------

const accessToken = process.env.ACCESS_TOKEN ?? '';
const groupId = '213046214';

const SAMPLE_POSTS_COUNT = 20;
const SERVICE_BYTES_PER_POST = 50;
const DOWNLOAD_BATCH_SIZE = 5;
const API_VERSION = '5.130';

// ---------- Результаты аналитики ----------

let totalPostsInGroup = 0;
let imageCountCoefficient = 0;   // среднее кол-во картинок в посте
let averageImageWeight = 0;      // средний вес одной картинки (байт)
let totalContentWeight = 0;      // оценка веса всего контента группы (байт)

// ---------- VK API ----------

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

function extractPhotosFromPost(item) {
    let attachments = item.attachments ?? [];

    if (item.copy_history?.length > 0 && item.copy_history[0].attachments) {
        attachments = attachments.concat(item.copy_history[0].attachments);
    }

    return attachments.filter((attachment) => attachment.type === 'photo');
}

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

async function runInBatches(items, batchSize, fn) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(fn));
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} КБ`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

// ---------- Основная аналитика ----------

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

// ---------- Запуск при isAnalitycs = true ----------

if (isAnalitycs) {
    runGroupAnalytics().catch((err) => {
        console.log('');
        console.log('🔴 Error! Программа остановлена с ошибкой:');
        console.log(err.message);
        process.exit(1);
    });
}
