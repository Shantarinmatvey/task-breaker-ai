import { state } from './state.js';
import { dom } from './dom.js';

export function getApiKey() {
    return state.geminiApiKey || '';
}

export async function callGemini(contents, signal = null) {
    const apiKey = getApiKey();
    if (!apiKey) {
        if (dom.apiModal) dom.apiModal.classList.remove('hidden');
        throw new Error('Укажите API ключ Google Gemini в настройках (кнопка слева внизу).');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
    
    const fetchOptions = {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
        },
        body: JSON.stringify({ contents })
    };
    
    if (signal) fetchOptions.signal = signal;

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'API Error');
    }
    
    return await response.json();
}
