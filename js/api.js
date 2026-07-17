import { dom } from './dom.js';

// TODO: Замените этот URL на адрес вашего Cloudflare Worker
const CLOUDFLARE_WORKER_URL = "https://YOUR-WORKER-NAME.YOUR-USERNAME.workers.dev/";

export async function callGemini(contents, signal = null) {
    if (CLOUDFLARE_WORKER_URL.includes("YOUR-WORKER-NAME")) {
        throw new Error('Пожалуйста, укажите URL вашего Cloudflare Worker в файле js/api.js');
    }

    const fetchOptions = {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contents })
    };
    
    if (signal) fetchOptions.signal = signal;

    const response = await fetch(CLOUDFLARE_WORKER_URL, fetchOptions);

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'API Error');
    }
    
    return await response.json();
}
