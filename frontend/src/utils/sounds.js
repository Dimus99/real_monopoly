
const SOUND_URLS = {
    // Google CodeSkulptor Assets (High Reliability, CORS-friendly, MP3/M4A/OGG)
    roll: 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-bounce.m4a',
    roll_start: 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-bounce.m4a',
    turn_switch: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Pang/pop.mp3',

    dice_shake: 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-bounce.m4a',
    dice_land: 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-bounce.m4a',

    buy: 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a',
    yes: 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a',

    money: 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a',

    explosion: 'https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/explosion.mp3',
    oreshnik: 'https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/missile.mp3',

    click: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Pang/pop.mp3',

    bankruptcy: 'https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/explosion.mp3',
    success: 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a',
    error: 'https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/explosion.mp3',
    jail: 'https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/thrust.mp3',
    paper: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Pang/pop.mp3',

    bgm: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race2.ogg',
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
