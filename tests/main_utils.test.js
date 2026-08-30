// Файл: tests/main_utils.test.js
// Назначение: модульные тесты логики main.js — CLI, даты, имена, вложения, границы
// батчей, ограниченный параллелизм, allCount и остановка на опросе. Запуск: npm test.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildStablePostKey,
    buildVideoPageUrl,
    getNextRequestCount,
    getStopReasonAfterPost,
    isEndOfWall,
    isGifDocument,
    isPostBelowCutoff,
    mapWithConcurrency,
    normalizePost,
    parseCliArgs,
    parseCliBool,
    parseCliInt,
    parseCollectionCutoffUnix,
    sanitizePathSegment,
    selectLargestPhoto,
    validateConfig,
} from '../main_utils.js';

test('CLI разбирается строго и валидирует диапазоны', () => {
    const cli = parseCliArgs(['node', 'main.js', '--groupId=club1', '--startCount', '10', '--flag']);
    assert.deepEqual(cli, { groupId: 'club1', startCount: '10', flag: 'true' });
    assert.equal(parseCliInt(cli.startCount, 20, 'startCount'), 10);
    assert.equal(parseCliBool(cli.flag, false, 'flag'), true);
    assert.throws(() => parseCliInt('20abc', 20, 'count'), /целым числом/);
    assert.throws(() => parseCliBool('maybe', false, 'flag'), /true или false/);
    assert.throws(() => validateConfig({
        groupId: 'x',
        mainPath: 'main',
        startOffset: 0,
        startCount: 101,
        allCount: -1,
    }), /от 1 до 100/);
});

test('граница даты включительна и не пропускает равный timestamp', () => {
    const cutoff = parseCollectionCutoffUnix('2026.08.15', '02:43:50');
    assert.equal(isPostBelowCutoff(cutoff, cutoff), false);
    assert.equal(isPostBelowCutoff(cutoff - 1, cutoff), true);
    assert.throws(() => parseCollectionCutoffUnix('2026.02.30', ''), /Некорректная дата/);
    assert.throws(() => parseCollectionCutoffUnix('2026.02.20', '25:00'), /Некорректное время/);
});

test('вложенный repost нормализует весь текст и все attachments', () => {
    const item = {
        id: 10,
        owner_id: -1,
        date: 100,
        text: 'Основной',
        attachments: [{ type: 'photo' }],
        copy_history: [{
            text: 'Репост',
            attachments: [{ type: 'video' }],
            copy_history: [{ text: 'Глубокий', attachments: [{ type: 'poll' }] }],
        }],
    };
    const post = normalizePost(item);
    assert.match(post.text, /Основной[\s\S]*Репост[\s\S]*Глубокий/);
    assert.deepEqual(post.attachments.map((attachment) => attachment.type), ['photo', 'video', 'poll']);
});

test('GIF не смешивается с обычными документами, video сохраняет access_key', () => {
    assert.equal(isGifDocument({ type: 'doc', doc: { ext: 'gif', url: 'https://cdn/a' } }), true);
    assert.equal(isGifDocument({ type: 'doc', doc: { ext: 'pdf', url: 'https://cdn/a.pdf' } }), false);
    assert.equal(
        buildVideoPageUrl({ owner_id: -1, id: 2, access_key: 'a+b' }),
        'https://vk.com/video-1_2?access_key=a%2Bb',
    );
});

test('выбирается самое большое валидное фото', () => {
    const selected = selectLargestPhoto({
        sizes: [
            { width: 100, height: 100, url: 'small' },
            { width: 1000, height: 500, url: 'large' },
            { width: 2000, height: 2000 },
        ],
    });
    assert.equal(selected.url, 'large');
    assert.equal(selectLargestPhoto({ sizes: [] }), null);
});

test('конец стены определяется пустым батчем или nextOffset >= count', () => {
    assert.equal(isEndOfWall({ itemsLength: 0, requestedCount: 20, nextOffset: 20, totalCount: 100 }), true);
    assert.equal(isEndOfWall({ itemsLength: 10, requestedCount: 20, nextOffset: 90, totalCount: 100 }), false);
    assert.equal(isEndOfWall({ itemsLength: 10, requestedCount: 20, nextOffset: 100, totalCount: 100 }), true);
    assert.equal(isEndOfWall({ itemsLength: 19, requestedCount: 20, nextOffset: 39, totalCount: 1721 }), false);
    assert.equal(isEndOfWall({ itemsLength: 20, requestedCount: 20, nextOffset: 40, totalCount: 100 }), false);
    assert.equal(isEndOfWall({ itemsLength: 20, requestedCount: 20, nextOffset: 100, totalCount: 100 }), true);
});

test('allCount уменьшает последний батч и poll останавливает после сохранения', () => {
    assert.equal(getNextRequestCount(20, 25, 20), 5);
    assert.equal(getNextRequestCount(20, 25, 25), 0);
    assert.equal(getStopReasonAfterPost({
        processedCount: 3,
        allCount: -1,
        hasPoll: true,
        stopAfterPoll: true,
    }), 'обработан первый пост с опросом');
    assert.equal(getStopReasonAfterPost({
        processedCount: 3,
        allCount: 3,
        hasPoll: false,
        stopAfterPoll: false,
    }), 'достигнут лимит allCount');
});

test('пул ограничивает параллелизм и возвращает результаты в исходном порядке', async () => {
    let activeCount = 0;
    let maximumActiveCount = 0;
    const completionOrder = [];

    const results = await mapWithConcurrency([30, 5, 20, 5], 2, async (delayMs, index) => {
        activeCount++;
        maximumActiveCount = Math.max(maximumActiveCount, activeCount);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        completionOrder.push(index);
        activeCount--;
        return `result-${index}`;
    });

    assert.equal(maximumActiveCount, 2);
    assert.notDeepEqual(completionOrder, [0, 1, 2, 3]);
    assert.deepEqual(results, ['result-0', 'result-1', 'result-2', 'result-3']);
});

test('имена безопасны для Windows, а ключи одинаковых текстов различаются по post id', () => {
    assert.equal(sanitizePathSegment('CON', 20, 'fallback'), 'fallback');
    assert.equal(sanitizePathSegment('a<>:"/\\|?*b. ', 20), 'a b');
    assert.notEqual(
        buildStablePostKey({ ownerId: -1, id: 10 }),
        buildStablePostKey({ ownerId: -1, id: 11 }),
    );
});
