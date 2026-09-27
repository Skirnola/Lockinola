let context: AudioContext | null = null;

export function armFocusAudio() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume().catch(() => undefined);
}

export function playBackupAlarm() {
  armFocusAudio();
  if (!context) return () => undefined;

  const audio = context;
  const output = audio.createGain();
  output.gain.value = 0.13;
  output.connect(audio.destination);

  const ring = () => {
    const start = audio.currentTime;
    [0, 0.22, 0.44].forEach((offset, index) => {
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(index === 2 ? 880 : 740, start + offset);
      envelope.gain.setValueAtTime(0, start + offset);
      envelope.gain.linearRampToValueAtTime(1, start + offset + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.01, start + offset + 0.17);
      oscillator.connect(envelope);
      envelope.connect(output);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.18);
    });
  };

  ring();
  const repeat = window.setInterval(ring, 1600);
  const timeout = window.setTimeout(stop, 30_000);
  let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    window.clearInterval(repeat);
    window.clearTimeout(timeout);
    output.disconnect();
  }
  return stop;
}
