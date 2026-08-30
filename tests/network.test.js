// Файл: tests/network.test.js
// Назначение: тесты сетевой устойчивости без реального интернета — retry временной ошибки VK,
// передача токена через POST, проверка изображения и изоляция невосстановимых ответов CDN.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Response } from 'node-fetch';
import { callVkApi, downloadImageBuffer } from '../network.js';

test('VK rate limit повторяется, а токен отсутствует в URL', async () => {
    let calls = 0;
    const seenUrls = [];
    const seenBodies = [];
    const fetchImpl = async (url, options) => {
        calls++;
        seenUrls.push(url);
        seenBodies.push(String(options.body));
        if (calls === 1) {
            return new Response(JSON.stringify({
                error: { error_code: 6, error_msg: 'Too many requests per second' },
            }), { status: 200, headers: { 'content-type': 'application/json' } });
        }
        return new Response(JSON.stringify({ response: { count: 0, items: [] } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    };

    const response = await callVkApi('wall.get', { owner_id: -1, count: 10 }, {
        accessToken: 'secret-token',
        fetchImpl,
        attempts: 2,
        sleep: async () => {},
        getDelayMs: () => 0,
    });
    assert.deepEqual(response, { count: 0, items: [] });
    assert.equal(calls, 2);
    assert.equal(seenUrls.every((url) => !url.includes('secret-token')), true);
    assert.equal(seenBodies.every((body) => body.includes('access_token=secret-token')), true);
});

test('валидное изображение загружается как Buffer', async () => {
    const fetchImpl = async () => new Response(Buffer.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/jpeg', 'content-length': '3' },
    });
    const result = await downloadImageBuffer('https://cdn.example/image.jpg', { fetchImpl, attempts: 1 });
    assert.deepEqual([...result.buffer], [1, 2, 3]);
    assert.equal(result.contentType, 'image/jpeg');
});

test('HTML вместо фото не повторяется и не сохраняется', async () => {
    let calls = 0;
    const fetchImpl = async () => {
        calls++;
        return new Response('<html>error</html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
        });
    };
    await assert.rejects(
        downloadImageBuffer('https://cdn.example/image.jpg', {
            fetchImpl,
            attempts: 3,
            sleep: async () => {},
            getDelayMs: () => 0,
        }),
        /не файл изображения/,
    );
    assert.equal(calls, 1);
});

test('фактический размер изображения ограничивается даже без content-length', async () => {
    const fetchImpl = async () => new Response(Buffer.alloc(6), {
        status: 200,
        headers: { 'content-type': 'image/png' },
    });
    await assert.rejects(
        downloadImageBuffer('https://cdn.example/image.png', { fetchImpl, attempts: 1, maxBytes: 5 }),
        /превысило лимит/,
    );
});
