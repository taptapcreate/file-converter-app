import AsyncStorage from '@react-native-async-storage/async-storage';

// Set this to your remote log-collector endpoint (POST JSON). Leave empty to only store locally.
const LOG_COLLECTOR_URL = '';
const STORAGE_KEY = 'app:errorLogs';

async function _getStored() {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.warn('LogCollector: failed to read stored logs', e);
        return [];
    }
}

async function _setStored(list) {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('LogCollector: failed to write stored logs', e);
    }
}

export async function reportError(error, context = {}) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const payload = {
        id,
        timestamp: new Date().toISOString(),
        error: {
            message: (error && error.message) || String(error),
            name: error && error.name,
            stack: error && error.stack,
            raw: typeof error === 'object' ? error : undefined,
        },
        context,
    };

    // Try to upload immediately if an endpoint is configured
    if (LOG_COLLECTOR_URL) {
        try {
            const res = await fetch(LOG_COLLECTOR_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) return { id, uploaded: true };
            console.warn('LogCollector: server responded with error', res.status);
        } catch (e) {
            console.warn('LogCollector: upload failed', e);
        }
    }

    // Fallback: save locally to be flushed later
    try {
        const logs = await _getStored();
        logs.push(payload);
        await _setStored(logs);
    } catch (e) {
        console.warn('LogCollector: storing log failed', e);
    }

    return { id, uploaded: false };
}

export async function flushStored() {
    if (!LOG_COLLECTOR_URL) return { ok: false, message: 'No endpoint configured' };

    const logs = await _getStored();
    if (!logs.length) return { ok: true, uploaded: 0 };

    const remaining = [];
    let uploaded = 0;
    for (const log of logs) {
        try {
            const res = await fetch(LOG_COLLECTOR_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(log),
            });
            if (res.ok) uploaded++;
            else remaining.push(log);
        } catch (e) {
            remaining.push(log);
        }
    }

    await _setStored(remaining);
    return { ok: true, uploaded, remainingCount: remaining.length };
}

// Dev helpers
export async function getStoredLogs() {
    return await _getStored();
}

export async function clearStoredLogs() {
    await _setStored([]);
    return true;
}
