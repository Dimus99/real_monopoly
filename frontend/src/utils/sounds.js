
const SOUND_URLS = {
    // MP3s for better compatibility (Safari/Mac)
    roll: 'https://assets.mixkit.co/sfx/preview/mixkit-rpg-dice-throw-2652.mp3',
    roll_start: 'https://assets.mixkit.co/sfx/preview/mixkit-dice-shake-2651.mp3', // Realistic shake
    turn_switch: 'https://assets.mixkit.co/sfx/preview/mixkit-interface-click-1126.mp3',

    dice_shake: 'https://assets.mixkit.co/sfx/preview/mixkit-dice-shake-2651.mp3',
    dice_land: 'https://assets.mixkit.co/sfx/preview/mixkit-game-ball-tap-2073.mp3',

    buy: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
    yes: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',

    money: 'https://assets.mixkit.co/sfx/preview/mixkit-coins-handling-1939.mp3',

    explosion: 'https://assets.mixkit.co/sfx/preview/mixkit-short-explosion-1694.mp3',
    oreshnik: 'https://assets.mixkit.co/sfx/preview/mixkit-massive-explosion-1680.mp3', // BIG explosion

    click: 'https://assets.mixkit.co/sfx/preview/mixkit-ui-click-1135.mp3',

    bankruptcy: 'https://assets.mixkit.co/sfx/preview/mixkit-cartoon-failure-piano-573.mp3',
    success: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
    error: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
    jail: 'https://assets.mixkit.co/sfx/preview/mixkit-cartoon-toy-whistle-616.mp3',
    paper: 'https://assets.mixkit.co/sfx/preview/mixkit-paper-slide-1530.mp3',

    bgm: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
};

class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.musicMuted = true;
        this.initialized = false;
        this.currentMusic = null;
    }

    init() {
        if (this.initialized) return;
        Object.entries(SOUND_URLS).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto'; // Preload

            if (key === 'bgm') {
                audio.loop = true;
                audio.volume = 0.3;
            }

            this.sounds[key] = audio;

            // Debug load
            audio.oncanplaythrough = () => console.log(`Sound loaded: ${key}`);
            audio.onerror = (e) => console.warn(`Failed to load sound: ${key}`, e);
        });
        this.initialized = true;
    }

    play(key, volume = 0.5) {
        if (this.muted && key !== 'bgm') return;

        let finalKey = key;
        if (key === 'roll') finalKey = 'roll_start';

        const sound = this.sounds[finalKey] || this.sounds[key];

        if (!sound) {
            console.warn(`Sound not found: ${key}`);
            return;
        }

        try {
            if (finalKey === 'bgm') {
                if (this.musicMuted) return;
                if (sound.paused) {
                    sound.volume = 0.3;
                    const playPromise = sound.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.warn("Music auto-play prevented:", error);
                        });
                    }
                }
            } else {
                const clone = sound.cloneNode();
                clone.volume = volume;
                const playPromise = clone.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn(`SFX play failed (${key}):`, error);
                    });
                }
            }
        } catch (e) {
            console.warn("Sound manager error:", e);
        }
    }

    stopMusic() {
        if (this.sounds['bgm']) {
            this.sounds['bgm'].pause();
        }
    }

    toggleMusic() {
        this.musicMuted = !this.musicMuted;
        if (this.musicMuted) {
            this.stopMusic();
        } else {
            this.play('bgm');
        }
        return !this.musicMuted;
    }

    setMuted(muted) {
        this.muted = muted;
        if (muted) {
            this.stopMusic();
        } else if (!this.musicMuted) {
            this.play('bgm');
        }
    }
}

export const soundManager = new SoundManager();
