import { useCallback, useEffect, useRef, useState } from "react";

interface UseAudioPlayerOptions {
  volume?: number;
}

interface AudioPlayerState {
  playing: boolean;
  volume: number;
}

export function useAudioPlayer({ volume: initialVolume = 0.85 }: UseAudioPlayerOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    playing: false,
    volume: initialVolume,
  });

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = state.volume;
  }, [state.volume]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  const play = useCallback(
    (src: string, onError?: () => void) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setState((s) => ({ ...s, playing: false }));
      const audio = new Audio();
      audio.volume = state.volume;
      audio.crossOrigin = "anonymous";
      audio.src = src;
      audio.addEventListener("playing", () => setState((s) => ({ ...s, playing: true })));
      audio.addEventListener("pause", () => setState((s) => ({ ...s, playing: false })));
      audio.addEventListener("error", () => {
        setState((s) => ({ ...s, playing: false }));
        onError?.();
      });
      audio.addEventListener("ended", () => setState((s) => ({ ...s, playing: false })));
      audioRef.current = audio;
      audio.play().catch(() => setState((s) => ({ ...s, playing: false })));
    },
    [state.volume],
  );

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, []);

  const setVolume = useCallback((v: number) => {
    setState((s) => ({ ...s, volume: v }));
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState((s) => ({ ...s, playing: false }));
  }, []);

  return {
    playing: state.playing,
    volume: state.volume,
    play,
    toggle,
    setVolume,
    stop,
    audioRef,
  };
}
