
const SOUND_URLS = {
    // SoundJay and SoundHelix (Reliable MP3s, no screams, safe for work)
    roll: 'https://www.soundjay.com/misc/sounds/dice-throw-1.mp3',
    roll_start: 'https://www.soundjay.com/misc/sounds/dice-rattle-1.mp3',
    turn_switch: 'https://www.soundjay.com/button/sounds/button-16.mp3', // Discrete click

    dice_shake: 'https://www.soundjay.com/misc/sounds/dice-rattle-1.mp3',
    dice_land: 'https://www.soundjay.com/misc/sounds/dice-throw-2.mp3',

    buy: 'https://www.soundjay.com/button/sounds/button-09.mp3', // Nice ding
    yes: 'https://www.soundjay.com/button/sounds/button-09.mp3',

    money: 'https://www.soundjay.com/misc/sounds/coins-in-hand-2.mp3',

    explosion: 'https://www.soundjay.com/mechanical/sounds/explosion-01.mp3',
    oreshnik: 'https://www.soundjay.com/mechanical/sounds/explosion-02.mp3', // Louder boom

    click: 'https://www.soundjay.com/button/sounds/button-30.mp3',

    bankruptcy: 'https://www.soundjay.com/misc/sounds/fail-buzzer-01.mp3',
    success: 'https://www.soundjay.com/human/sounds/applause-01.mp3',
    error: 'https://www.soundjay.com/button/sounds/button-10.mp3',
    jail: 'https://www.soundjay.com/misc/sounds/jail-door-close-1.mp3',
    paper: 'https://www.soundjay.com/nature/sounds/paper-hiss-1.mp3',

    bgm: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Stable MP3 stream
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
            audio.preload = 'auto';

            if (key === 'bgm') {
                audio.loop = true;
                audio.volume = 0.3;
            }

            this.sounds[key] = audio;

            audio.oncanplaythrough = () => console.log(`Sound loaded: ${key}`);
            audio.onerror = (e) => console.warn(`Failed to load sound: ${key}`, e);

            // Attempt to load to check for errors early
            audio.load();
        });
        this.initialized = true;
    }

    play(key, volume = 0.5) {
        if (this.muted && key !== 'bgm') return;

        // Map keys if needed
        let finalKey = key;
        if (key === 'roll') finalKey = 'roll_start';

        // If 'start' missing, fallback to 'roll'
        if (finalKey === 'roll_start' && !this.sounds['roll_start']) finalKey = 'roll';

        const sound = this.sounds[finalKey] || this.sounds[key];

        if (!sound) {
            // Silently fail if not found to avoid console spam
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
                            // Suppress auto-play errors
                        });
                    }
                }
            } else {
                const clone = sound.cloneNode();
                clone.volume = volume;
                const playPromise = clone.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        // Suppress SFX errors
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
