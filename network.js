// Файл: network.js
// Назначение: устойчивые HTTP-запросы парсера — вызовы VK API и загрузка изображений
// с timeout, проверкой ответов, ограничением размера и retry/backoff. Используется main.js;
// функции принимают fetchImpl, чтобы сетевые сценарии тестировались без настоящего VK-токена.

import fetch from 'node-fetch';

const RETRYABLE_VK_CODES = new Set([1, 6, 9, 10, 29]);
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_ATTEMPTS = 5;
const DEFAULT_MAX_IMAGE_BYTES = 40 * 1024 * 1024;

// Создаёт ошибку с признаком возможности безопасного повтора запроса.
// Используется внутренними проверками HTTP и VK API.
function requestError(message, retryable, cause) {
    const error = new Error(message, cause ? { cause } : undefined);
    error.retryable = retryable;
    return error;
}

// Возвращает задержку exponential backoff с небольшим jitter для разведения повторов.
// Используется requestWithRetries между неудачными попытками.
function retryDelayMs(attempt) {
    const base = Math.min(750 * (2 ** (attempt - 1)), 12_000);
    return base + Math.floor(Math.random() * 250);
}

// Выполняет HTTP-операцию с timeout и ограниченными повторами retryable-ошибок.
// Используется callVkApi и downloadImageBuffer.
export async function requestWithRetries(operation, options = {}) {
    const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
    const onRetry = options.onRetry ?? (() => {});
    const sleep = options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
    const getDelayMs = options.getDelayMs ?? retryDelayMs;
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await operation(attempt);
        } catch (error) {
            lastError = error;
            if (!error.retryable || attempt >= attempts) break;
            const delayMs = getDelayMs(attempt);
            onRetry(error, attempt, attempts, delayMs);
            await sleep(delayMs);
        }
    }
    throw lastError;
}

// Вызывает метод VK через POST, не помещая access token в URL, и проверяет HTTP/JSON/API ошибки.
// Используется main.js для groups.getById и каждого wall.get.
export async function callVkApi(method, params, options = {}) {
    const fetchImpl = options.fetchImpl ?? fetch;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
    const onRetry = options.onRetry;
    const body = new URLSearchParams({
        ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
        access_token: options.accessToken ?? '',
        v: options.apiVersion ?? '5.130',
    });

    return requestWithRetries(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetchImpl(`https://api.vk.com/method/${method}`, {
                method: 'POST',
                body,
                signal: controller.signal,
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
            });
            if (!response.ok) {
                throw requestError(
                    `VK HTTP ${response.status} ${response.statusText}`.trim(),
                    response.status === 429 || response.status >= 500,
                );
            }

            let json;
            try {
                json = await response.json();
            } catch (error) {
                throw requestError('VK вернул некорректный JSON', true, error);
            }
            if (json?.error) {
                const code = Number(json.error.error_code);
                throw requestError(
                    `VK API ${code}: ${json.error.error_msg ?? 'неизвестная ошибка'}`,
                    RETRYABLE_VK_CODES.has(code),
                );
            }
            if (!Object.hasOwn(json ?? {}, 'response')) {
                throw requestError('VK API вернул ответ без поля response', true);
            }
            return json.response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw requestError(`VK API не ответил за ${timeoutMs} мс`, true, error);
            }
            if (typeof error.retryable === 'boolean') throw error;
            throw requestError(`Сетевая ошибка VK API: ${error.message}`, true, error);
        } finally {
            clearTimeout(timer);
        }
    }, {
        attempts,
        onRetry,
        sleep: options.sleep,
        getDelayMs: options.getDelayMs,
    });
}

// Загружает изображение, следуя redirect, проверяет MIME и ограничивает фактический объём данных.
// Используется main.js для каждого выбранного photo-вложения.
export async function downloadImageBuffer(url, options = {}) {
    const fetchImpl = options.fetchImpl ?? fetch;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES;
    const attempts = options.attempts ?? 3;
    const onRetry = options.onRetry;

    if (!/^https?:\/\//i.test(String(url ?? ''))) {
        throw requestError('У изображения отсутствует корректный URL', false);
    }

    return requestWithRetries(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetchImpl(url, {
                signal: controller.signal,
                redirect: 'follow',
            });
            if (!response.ok) {
                throw requestError(
                    `Изображение вернуло HTTP ${response.status}`,
                    response.status === 408 || response.status === 429 || response.status >= 500,
                );
            }

            const contentType = String(response.headers.get('content-type') ?? '').toLowerCase();
            if (!contentType.startsWith('image/')) {
                throw requestError(`Получен не файл изображения: ${contentType || 'MIME не указан'}`, false);
            }
            const declaredSize = Number(response.headers.get('content-length') ?? 0);
            if (declaredSize > maxBytes) {
                throw requestError(`Изображение больше лимита ${maxBytes} байт`, false);
            }

            const chunks = [];
            let totalBytes = 0;
            for await (const chunk of response.body) {
                totalBytes += chunk.length;
                if (totalBytes > maxBytes) {
                    controller.abort();
                    throw requestError(`Изображение превысило лимит ${maxBytes} байт`, false);
                }
                chunks.push(chunk);
            }
            if (totalBytes === 0) throw requestError('Получено пустое изображение', true);
            return { buffer: Buffer.concat(chunks), contentType };
        } catch (error) {
            if (error.name === 'AbortError') {
                throw requestError(`Изображение не загрузилось за ${timeoutMs} мс`, true, error);
            }
            if (typeof error.retryable === 'boolean') throw error;
            throw requestError(`Ошибка загрузки изображения: ${error.message}`, true, error);
        } finally {
            clearTimeout(timer);
        }
    }, {
        attempts,
        onRetry,
        sleep: options.sleep,
        getDelayMs: options.getDelayMs,
    });
}
