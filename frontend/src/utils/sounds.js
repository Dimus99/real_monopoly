
const SOUND_URLS = {
    roll: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
    dice_shake: 'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg', // Simulating shake
    money: 'https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg', // Coin sound placeholder
    explosion: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boom.ogg',
    click: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
    bankruptcy: 'https://actions.google.com/sounds/v1/cartoon/cartoon_whistle.ogg',
    success: 'https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg',
    error: 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg',
    jail: 'https://actions.google.com/sounds/v1/cartoon/comedy_trumpet_fail.ogg',
    paper: 'https://actions.google.com/sounds/v1/office/paper_shuffle.ogg',

    // Background Music (Using a reliable external source or placeholder)
    // Using a placeholder that is definitely accessible. 
    // If this fails, we might need a local file or a very stable CDN.
    // Let's try a proven CDN for a royalty free track.
    bgm: 'https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=lifelike-126735.mp3', // Chill Lofi
};

class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.musicMuted = true; // Default OFF
        this.initialized = false;
        this.currentMusic = null;
    }

    init() {
        if (this.initialized) return;
        Object.entries(SOUND_URLS).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto'; // Preload

            // Special handling for BGM
            if (key === 'bgm') {
                audio.loop = true;
                audio.volume = 0.2; // Low volume background
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

        const sound = this.sounds[key];
        if (!sound) {
            console.warn(`Sound not found: ${key}`);
            return;
        }

        try {
            if (key === 'bgm') {
                if (this.musicMuted) return;
                // If allowed to play music
                if (sound.paused) {
                    sound.volume = 0.2; // Fixed low volume for BGM
                    const playPromise = sound.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.warn("Music auto-play prevented:", error);
                        });
                    }
                }
            } else {
                // SFX - Clone to allow overlapping sounds
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
        return !this.musicMuted; // Return current muted state
    }

    setMuted(muted) {
        this.muted = muted;
        if (muted) {
            // Also stop music if global mute
            this.stopMusic();
        } else if (!this.musicMuted) {
            // Resume music if unmuted and music was on
            this.play('bgm');
        }
    }
}

export const soundManager = new SoundManager();
