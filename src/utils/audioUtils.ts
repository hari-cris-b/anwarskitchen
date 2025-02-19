// Create audio context and source only when needed
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let isPlaying = false;
let initializationPromise: Promise<boolean> | null = null;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Cleanup function to properly dispose of audio resources
export const cleanupAudio = () => {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
    audioBuffer = null;
    isPlaying = false;
  }
  initializationPromise = null;
};

// Helper function to create audio context with retries
const createAudioContext = async (retries = 3): Promise<AudioContext | null> => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log('Creating new audio context');
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!AudioContextClass) {
        console.error('Web Audio API is not supported in this browser');
        return null;
      }

      const context = new AudioContextClass();
      if (!context) {
        throw new Error('Failed to create AudioContext');
      }

      // Wait for context to initialize
      await sleep(100);

      if (context.state === 'suspended') {
        await context.resume();
        await sleep(100);
      }

      console.log('AudioContext created successfully:', {
        state: context.state,
        sampleRate: context.sampleRate
      });

      return context;
    } catch (error) {
      console.error(`Audio context creation attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        return null;
      }
      await sleep(500);
    }
  }
  return null;
};

// Initialize audio with user interaction and load sound
export const ensureAudioInitialized = async (): Promise<boolean> => {
  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // If already initialized and in good state, return true
  if (audioContext?.state === 'running' && audioBuffer) {
    return true;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Clean up any existing context
      cleanupAudio();

      // Create context with retries
      audioContext = await createAudioContext();
      if (!audioContext) {
        return false;
      }

      // Load audio buffer
      try {
        const response = await fetch('/notification.mp3');
        if (!response.ok) {
          throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error('Received empty array buffer');
        }

        // Decode with retries
        for (let i = 0; i < 3; i++) {
          try {
            if (!audioContext) break;
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            break;
          } catch (error) {
            if (i === 2) throw error;
            await sleep(500);
          }
        }

        if (!audioBuffer) {
          throw new Error('Failed to decode audio data');
        }

        console.log('Audio successfully decoded:', {
          duration: audioBuffer.duration,
          numberOfChannels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate
        });

        // Test the audio context with a silent sound
        if (audioContext && audioBuffer) {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0; // Silent test
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
          source.start(0);
          source.stop(audioContext.currentTime + 0.1);

          console.log('Audio initialized successfully', {
            contextState: audioContext.state,
            hasBuffer: true
          });
          
          return true;
        }

        return false;
      } catch (error) {
        console.error('Failed to load or decode audio:', error);
        cleanupAudio();
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      cleanupAudio();
      return false;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

// Initialize is now just an alias for ensure
export const initializeAudio = ensureAudioInitialized;

export const playNotificationSound = async () => {
  if (isPlaying) {
    console.log('Sound already playing, waiting...');
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }

  let retryCount = 0;
  const maxRetries = 3;
  
  const attemptPlay = async (): Promise<void> => {
    // Ensure audio is initialized
    const initialized = await ensureAudioInitialized();
    if (!initialized) {
      throw new Error('Failed to initialize audio');
    }

    if (!audioContext || !audioBuffer) {
      throw new Error('Audio system not properly initialized');
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      await sleep(100);
    }

    console.log('Audio context state:', audioContext.state);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.75, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, now + 1.0);
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    return new Promise<void>((resolve, reject) => {
      isPlaying = true;
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        isPlaying = false;
        clearTimeout(timeoutId);
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Sound playback timed out'));
      }, 5000);

      source.onended = () => {
        cleanup();
        console.log('Sound finished playing successfully');
        resolve();
      };

      try {
        source.start();
        console.log('Sound started playing');
      } catch (startError) {
        cleanup();
        reject(startError);
      }
    });
  };

  while (retryCount < maxRetries) {
    try {
      await attemptPlay();
      return;
    } catch (error) {
      retryCount++;
      console.error(`Attempt ${retryCount} failed:`, error);

      if (retryCount < maxRetries) {
        await sleep(1000);
        // Try to re-initialize on next attempt
        await ensureAudioInitialized();
      } else {
        throw new Error(`Failed to play sound after ${maxRetries} attempts`);
      }
    }
  }
};