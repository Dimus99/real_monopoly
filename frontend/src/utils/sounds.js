
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
    bgm: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-study-112191.mp3', // Relaxed Lofi
};

class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.musicMuted = true; // Music off by default? or on? Let's obey user. Default OFF to not annoy.
        this.initialized = false;
        this.currentMusic = null;
    }

    init() {
        if (this.initialized) return;
        Object.entries(SOUND_URLS).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            if (key === 'bgm') {
                audio.loop = true;
                audio.volume = 0.2;
            }
            this.sounds[key] = audio;
        });
        this.initialized = true;
    }

    play(key, volume = 0.5) {
        if (this.muted && key !== 'bgm') return;
        if (!this.sounds[key]) return;

        try {
            if (key === 'bgm') {
                if (this.musicMuted) return;
                // If already playing, don't restart
                if (this.sounds[key].paused) {
                    this.sounds[key].volume = volume;
                    this.sounds[key].play().catch(e => console.warn("Music play failed:", e));
                }
            } else {
                const sound = this.sounds[key].cloneNode();
                sound.volume = volume;
                sound.play().catch(e => console.warn("Sound play failed:", e));
            }
        } catch (e) {
            console.warn("Sound error:", e);
        }
    }

    stopMusic() {
        if (this.sounds['bgm']) {
            this.sounds['bgm'].pause();
            // Optional: reset time? No, pause is better.
        }
    }

    toggleMusic() {
        this.musicMuted = !this.musicMuted;
        if (this.musicMuted) {
            this.stopMusic();
        } else {
            this.play('bgm', 0.2);
        }
        return !this.musicMuted;
    }

    setMuted(muted) {
        this.muted = muted;
    }
}

export const soundManager = new SoundManager();
