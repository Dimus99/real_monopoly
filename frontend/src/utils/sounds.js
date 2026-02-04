
const SOUND_URLS = {
    roll: 'https://actions.google.com/sounds/v1/cartoon/swipe.ogg',
    roll_start: 'https://actions.google.com/sounds/v1/cartoon/swipe.ogg',
    turn_switch: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',

    dice_shake: 'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg',
    dice_land: 'https://actions.google.com/sounds/v1/foley/glasses_clinking.ogg',

    buy: 'https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg',
    yes: 'https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg',

    money: 'https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg',

    explosion: 'https://actions.google.com/sounds/v1/explosions/medium_explosion.ogg',

    click: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',

    bankruptcy: 'https://actions.google.com/sounds/v1/cartoon/cartoon_whistle.ogg',
    success: 'https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg',
    error: 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg',
    jail: 'https://actions.google.com/sounds/v1/cartoon/comedy_trumpet_fail.ogg',
    paper: 'https://actions.google.com/sounds/v1/office/paper_shuffle.ogg',

    bgm: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_dcdc1b9d42.mp3?filename=lofi-hip-hop-114896.mp3',
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
