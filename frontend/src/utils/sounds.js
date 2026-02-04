
const SOUND_URLS = {
    // Switching to MyInstants MP3s for better browser compatibility (Safari/Mac)
    roll: 'https://www.myinstants.com/media/sounds/dice-roll.mp3',
    roll_start: 'https://www.myinstants.com/media/sounds/rattle-dice.mp3',
    turn_switch: 'https://www.myinstants.com/media/sounds/notification.mp3',

    dice_shake: 'https://www.myinstants.com/media/sounds/rattle-dice.mp3',
    dice_land: 'https://www.myinstants.com/media/sounds/dice-hit-table.mp3', // Fallback

    buy: 'https://www.myinstants.com/media/sounds/ka-ching.mp3',
    yes: 'https://www.myinstants.com/media/sounds/ka-ching.mp3',

    money: 'https://www.myinstants.com/media/sounds/coins.mp3',

    explosion: 'https://www.myinstants.com/media/sounds/explosion.mp3',
    oreshnik: 'https://www.myinstants.com/media/sounds/nuclear-explosion.mp3',

    click: 'https://www.myinstants.com/media/sounds/click.mp3',

    bankruptcy: 'https://www.myinstants.com/media/sounds/spongebob-fail.mp3',
    success: 'https://www.myinstants.com/media/sounds/tada-fanfare-a.mp3',
    error: 'https://www.myinstants.com/media/sounds/error.mp3',
    jail: 'https://www.myinstants.com/media/sounds/jail-door-close.mp3',
    paper: 'https://www.myinstants.com/media/sounds/paper-crunch.mp3',

    bgm: 'https://cdn.pixabay.com/audio/2022/01/18/audio_dcdc1b9d42.mp3', // Classic upbeat BGM
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
