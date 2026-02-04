
const SOUND_URLS = {
    roll: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    money: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3',
    explosion: 'https://assets.mixkit.co/active_storage/sfx/1494/1494-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    bankruptcy: 'https://assets.mixkit.co/active_storage/sfx/1125/1125-preview.mp3',
    success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
    jail: 'https://assets.mixkit.co/active_storage/sfx/2056/2056-preview.mp3',
    paper: 'https://assets.mixkit.co/active_storage/sfx/1103/1103-preview.mp3',
};

class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        Object.entries(SOUND_URLS).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            this.sounds[key] = audio;
        });
        this.initialized = true;
    }

    play(key, volume = 0.5) {
        if (this.muted) return;
        if (!this.sounds[key]) return;

        try {
            const sound = this.sounds[key].cloneNode();
            sound.volume = volume;
            sound.play().catch(e => console.warn("Sound play failed:", e));
        } catch (e) {
            console.warn("Sound error:", e);
        }
    }

    setMuted(muted) {
        this.muted = muted;
    }
}

export const soundManager = new SoundManager();
