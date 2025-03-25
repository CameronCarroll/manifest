// src/core/AudioSystem.js
class AudioSystem {
  constructor() {
    this.sounds = new Map(); // Maps sound IDs to Audio objects
    this.music = new Map(); // Maps music track IDs to Audio objects
    this.currentMusic = null; // Currently playing music track
    this.enabled = true; // Global sound toggle
    this.soundVolume = 0.7; // Default sound volume (0-1)
    this.musicVolume = 0.4; // Default music volume (0-1)
      
    // Create audio context
    this.audioContext = null;
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      console.log('AudioSystem: Audio context created successfully');
    } catch (error) {
      console.error('AudioSystem: Web Audio API not supported.', error);
    }
      
    // Create master volume nodes
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
      
    this.soundGain = this.audioContext.createGain();
    this.soundGain.connect(this.masterGain);
    this.soundGain.gain.value = this.soundVolume;
      
    this.musicGain = this.audioContext.createGain();
    this.musicGain.connect(this.masterGain);
    this.musicGain.gain.value = this.musicVolume;
      
    // Sound categories with specific settings
    this.categories = {
      weapon: { volume: 0.8, maxInstances: 3 },
      ability: { volume: 0.7, maxInstances: 2 },
      ui: { volume: 0.5, maxInstances: 1 },
      ambient: { volume: 0.4, maxInstances: 3 },
      impact: { volume: 0.6, maxInstances: 4 }
    };
      
    // Keep track of actively playing instances per category
    this.activeInstances = {
      weapon: 0,
      ability: 0,
      ui: 0,
      ambient: 0,
      impact: 0
    };
      
    console.log('AudioSystem initialized');
  }
    
  // Load a sound effect
  async loadSound(id, url, options = {}) {
    if (!this.audioContext) {return null;}
      
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
      this.sounds.set(id, {
        buffer: audioBuffer,
        category: options.category || 'ui',
        loop: options.loop || false,
        volume: options.volume || 1.0,
        pitch: options.pitch || 1.0,
        spatial: options.spatial || false,
        sources: [] // Active sound sources
      });
        
      console.log(`AudioSystem: Sound "${id}" loaded successfully`);
      return true;
    } catch (error) {
      console.error(`AudioSystem: Failed to load sound "${id}" from "${url}"`, error);
      return false;
    }
  }
  
  // Preload common game sounds
  async preloadGameSounds() {
    try {
      // UI sounds
      await this.loadSound('ui-click', 'assets/audio/ui/ui-click.wav', { category: 'ui' });
      await this.loadSound('ui-hover', 'assets/audio/ui/ui-hover.wav', { category: 'ui' });
      
      // Weapon sounds
      await this.loadSound('laser-sword', 'assets/audio/weapons/laser-sword.wav', { 
        category: 'weapon',
        spatial: true,
        volume: 0.8
      });
      await this.loadSound('sniper-shot', 'assets/audio/weapons/sniper-shot.wav', { 
        category: 'weapon',
        spatial: true,
        volume: 0.9
      });
      
      // Ability sounds
      await this.loadSound('ability-activate', 'assets/audio/abilities/ability-activate.wav', {
        category: 'ability',
        spatial: true
      });
      
      // Ambient sounds
      await this.loadSound('wasteland-ambience', 'assets/audio/music/wasteland-ambience.wav', {
        category: 'ambient',
        loop: true,
        volume: 0.3
      });
      
      console.log('AudioSystem: Preloaded common game sounds');
      return true;
    } catch (error) {
      console.error('AudioSystem: Error preloading game sounds', error);
      return false;
    }
  }
    
  // Load a music track
  async loadMusic(id, url, options = {}) {
    if (!this.audioContext) {return null;}
      
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
      this.music.set(id, {
        buffer: audioBuffer,
        volume: options.volume || 1.0,
        loop: options.loop !== undefined ? options.loop : true,
        fadeIn: options.fadeIn || 1.0,
        fadeOut: options.fadeOut || 1.0,
        source: null // Active music source
      });
        
      console.log(`AudioSystem: Music "${id}" loaded successfully`);
      return true;
    } catch (error) {
      console.error(`AudioSystem: Failed to load music "${id}" from "${url}"`, error);
      return false;
    }
  }
    
  // Play a sound effect
  playSound(id, options = {}) {
    if (!this.audioContext || !this.enabled) {return null;}
      
    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`AudioSystem: Sound "${id}" not found`);
      return null;
    }
      
    // Check if we've reached max instances for this category
    const category = sound.category;
    if (this.categories[category] && 
          this.activeInstances[category] >= this.categories[category].maxInstances) {
      // Skip playing to avoid too many simultaneous sounds of same type
      return null;
    }
      
    // Create sound source
    const source = this.audioContext.createBufferSource();
    source.buffer = sound.buffer;
    source.loop = options.loop !== undefined ? options.loop : sound.loop;
      
    // Create gain node for this specific sound
    const gainNode = this.audioContext.createGain();
      
    // Apply volume: base sound volume * category volume * specific instance volume
    const volume = sound.volume * 
        (this.categories[category]?.volume || 1.0) * 
        (options.volume || 1.0);
    gainNode.gain.value = volume;
      
    // Connect source to gain, then to sound channel
    source.connect(gainNode);
    gainNode.connect(this.soundGain);
      
    // Pitch/playback rate adjustment
    const pitch = options.pitch || sound.pitch;
    source.playbackRate.value = pitch;
      
    // Position/spatial audio if enabled
    if (options.position && sound.spatial) {
      // Simple spatial audio implementation using StereoPannerNode
      const panner = this.audioContext.createStereoPanner();
        
      // Convert 3D position to stereo pan (-1 to 1)
      const panValue = this.calculateStereoPan(options.position, options.listenerPosition);
      panner.pan.value = panValue;
        
      // Insert panner in the chain
      source.disconnect();
      source.connect(panner);
      panner.connect(gainNode);
    }
      
    // Start playback, with optional delay
    const startTime = this.audioContext.currentTime + (options.delay || 0);
    source.start(startTime);
      
    // Increment active instances counter
    this.activeInstances[category]++;
      
    // Store sound source for tracking
    const sourceData = {
      source: source,
      gainNode: gainNode,
      startTime: startTime,
      category: category
    };
    sound.sources.push(sourceData);
      
    // Set up removal of the source once it's done playing
    source.onended = () => {
      const index = sound.sources.indexOf(sourceData);
      if (index !== -1) {
        sound.sources.splice(index, 1);
      }
        
      // Decrement active instances counter
      this.activeInstances[category]--;
    };
      
    return sourceData;
  }
    
  // Play a music track with crossfade
  async playMusic(id, options = {}) {
    if (!this.audioContext || !this.enabled) {return false;}
      
    const musicData = this.music.get(id);
    if (!musicData) {
      console.warn(`AudioSystem: Music "${id}" not found`);
      return false;
    }
      
    // If this track is already playing, don't restart it
    if (this.currentMusic === id && musicData.source) {
      return true;
    }
      
    // Fade out current music if any
    await this.stopMusic({ fadeOut: options.fadeOut || musicData.fadeOut });
      
    // Create source for new track
    const source = this.audioContext.createBufferSource();
    source.buffer = musicData.buffer;
    source.loop = options.loop !== undefined ? options.loop : musicData.loop;
      
    // Create gain node for this track
    const gainNode = this.audioContext.createGain();
      
    // Start with volume at 0 for fade-in
    gainNode.gain.value = 0;
      
    // Connect source to gain, then to music channel
    source.connect(gainNode);
    gainNode.connect(this.musicGain);
      
    // Start playback
    source.start();
      
    // Fade in the volume
    const fadeInTime = options.fadeIn || musicData.fadeIn;
    const volume = options.volume || musicData.volume;
      
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      volume, 
      this.audioContext.currentTime + fadeInTime
    );
      
    // Store music data
    musicData.source = source;
    musicData.gainNode = gainNode;
    this.currentMusic = id;
      
    // Set up cleanup when the track ends (if not looping)
    if (!source.loop) {
      source.onended = () => {
        musicData.source = null;
        musicData.gainNode = null;
        if (this.currentMusic === id) {
          this.currentMusic = null;
        }
      };
    }
      
    return true;
  }
    
  // Stop currently playing music with optional fade out
  async stopMusic(options = {}) {
    if (!this.audioContext || !this.currentMusic) {return;}
      
    const musicData = this.music.get(this.currentMusic);
    if (!musicData || !musicData.source || !musicData.gainNode) {return;}
      
    const fadeOutTime = options.fadeOut || musicData.fadeOut;
      
    if (fadeOutTime > 0) {
      // Fade out gradually
      const currentTime = this.audioContext.currentTime;
      musicData.gainNode.gain.setValueAtTime(
        musicData.gainNode.gain.value, 
        currentTime
      );
      musicData.gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutTime);
        
      // Wait for fade to complete
      await new Promise(resolve => setTimeout(resolve, fadeOutTime * 1000));
    }
      
    // Stop the source
    try {
      musicData.source.stop();
    } catch (e) {
      // Source might have ended already, ignore
    }
      
    musicData.source = null;
    musicData.gainNode = null;
    this.currentMusic = null;
  }
    
  // Stop a specific sound
  stopSound(id, options = {}) {
    if (!this.audioContext) {return;}
      
    const sound = this.sounds.get(id);
    if (!sound || !sound.sources.length) {return;}
      
    // Stop all sources for this sound
    sound.sources.forEach(sourceData => {
      try {
        sourceData.source.stop();
      } catch (e) {
        // Source might have ended already, ignore
      }
        
      // Decrement active instances counter
      this.activeInstances[sourceData.category]--;
    });
      
    sound.sources = [];
  }
    
  // Calculate stereo pan value based on position
  calculateStereoPan(position, listenerPosition = { x: 0, z: 0 }) {
    if (!position) {return 0;}
      
    // Calculate relative position
    const relX = position.x - (listenerPosition?.x || 0);
      
    // Convert to a pan value between -1 and 1
    // Simple linear mapping based on x coordinate
    const maxDistance = 20; // Max distance for full pan
    let pan = relX / maxDistance;
      
    // Clamp to range [-1, 1]
    pan = Math.max(-1, Math.min(1, pan));
      
    return pan;
  }
    
  // Set global sound volume
  setSoundVolume(volume) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    if (this.soundGain) {
      this.soundGain.gain.value = this.soundVolume;
    }
  }
    
  // Set global music volume
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
  }
    
  // Enable/disable all audio
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopMusic({ fadeOut: 0.5 });
        
      // Stop all sound effects
      this.sounds.forEach((sound, id) => {
        this.stopSound(id);
      });
    }
  }
    
  // Resume audio context (required due to autoplay policy in browsers)
  resumeAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
        .then(() => console.log('AudioSystem: Audio context resumed'))
        .catch(err => console.error('AudioSystem: Could not resume audio context', err));
    }
  }
    
  // Clean up resources
  dispose() {
    // Stop all sounds
    this.sounds.forEach((sound, id) => {
      this.stopSound(id);
    });
      
    // Stop music
    this.stopMusic({ fadeOut: 0 });
      
    // Clear collections
    this.sounds.clear();
    this.music.clear();
      
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
        .then(() => console.log('AudioSystem: Audio context closed'))
        .catch(err => console.error('AudioSystem: Error closing audio context', err));
    }
  }
}
  
export default AudioSystem;