"use client";

/**
 * Browser audio engine (Tone.js, Karplus–Strong plucked strings).
 * One playback at a time: starting a new one stops the previous.
 */
import type { NoteEvent } from "./notation";

export type VoiceName = "guitar" | "drive" | "voice" | "bass" | "click" | "kit" | "pad" | "bell";

export type Layer = {
  events: NoteEvent[];
  voice: VoiceName;
  /** dB offset */
  gain?: number;
  muted?: boolean;
  /** stereo position, -1 (left) to 1 (right) */
  pan?: number;
  /** reverb send 0–1: more = further back in the mix */
  space?: number;
};

export type PlayOptions = {
  bpm: number;
  loops?: number;
  /** play a 1-bar click (beatsPerBar beats) before starting */
  countIn?: number;
  /** when looping, the loop length in beats (defaults to longest layer) */
  loopBeats?: number;
  onEvent?: (layer: number, eventIndex: number, loop: number) => void;
  onEnd?: () => void;
};

type ToneNS = typeof import("tone");

let currentStop: (() => void) | null = null;
let tonePromise: Promise<ToneNS> | null = null;

function loadTone() {
  if (!tonePromise) tonePromise = import("tone");
  return tonePromise;
}

export function stopAll() {
  currentStop?.();
  currentStop = null;
}

type Instrument = {
  play: (midi: number[], durSec: number, time: number, velocity: number) => void;
  dispose: () => void;
};

function makeInstrument(Tone: ToneNS, voice: VoiceName, out: import("tone").ToneAudioNode): Instrument {
  const disposables: { dispose: () => unknown }[] = [];
  const keep = <T extends { dispose: () => unknown }>(n: T) => {
    disposables.push(n);
    return n;
  };
  const dispose = () => disposables.forEach((d) => d.dispose());
  const freq = (m: number) => Tone.Frequency(m, "midi").toFrequency();

  // Percussive "muted chug" for unpitched hits (x)
  const chugFilter = keep(new Tone.Filter(900, "bandpass")).connect(out);
  const chug = keep(
    new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.001, decay: 0.06, sustain: 0 } })
  ).connect(chugFilter);
  const hit = (time: number, velocity: number) => chug.triggerAttackRelease(0.05, time, velocity);

  if (voice === "guitar" || voice === "drive") {
    let chain: import("tone").ToneAudioNode = out;
    if (voice === "drive") {
      const lp = keep(new Tone.Filter(2600, "lowpass")).connect(out);
      const dist = keep(new Tone.Distortion({ distortion: 0.55, oversample: "2x" })).connect(lp);
      chain = dist;
    }
    const pool = Array.from({ length: 8 }, () =>
      keep(
        new Tone.PluckSynth({
          attackNoise: voice === "drive" ? 1.4 : 1,
          dampening: voice === "drive" ? 3200 : 4200,
          resonance: voice === "drive" ? 0.97 : 0.985,
          release: 0.6,
        })
      ).connect(chain)
    );
    let rr = 0;
    return {
      play(midi, durSec, time, velocity) {
        if (midi[0] === -1) return hit(time, velocity);
        midi.forEach((m, i) => {
          const s = pool[rr++ % pool.length];
          // tiny strum for chords
          s.triggerAttackRelease(freq(m), durSec, time + i * 0.012, velocity);
        });
      },
      dispose,
    };
  }

  if (voice === "voice") {
    const lp = keep(new Tone.Filter(2200, "lowpass")).connect(out);
    const vib = keep(new Tone.Vibrato(5.2, 0.12)).connect(lp);
    const synth = keep(
      new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 1.6,
        oscillator: { type: "sine" },
        modulation: { type: "triangle" },
        envelope: { attack: 0.06, decay: 0.2, sustain: 0.8, release: 0.25 },
        modulationEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.6, release: 0.3 },
      })
    ).connect(vib);
    return {
      play(midi, durSec, time, velocity) {
        if (midi[0] === -1) return hit(time, velocity);
        synth.triggerAttackRelease(midi.map(freq), Math.max(0.08, durSec * 0.95), time, velocity);
      },
      dispose,
    };
  }

  if (voice === "bass") {
    const synth = keep(
      new Tone.MonoSynth({
        oscillator: { type: "square" },
        filter: { Q: 1, type: "lowpass" },
        filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.3, baseFrequency: 120, octaves: 2.6 },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.15 },
      })
    ).connect(out);
    return {
      play(midi, durSec, time, velocity) {
        if (midi[0] === -1) return hit(time, velocity);
        synth.triggerAttackRelease(freq(midi[0]), durSec * 0.9, time, velocity);
      },
      dispose,
    };
  }

  if (voice === "pad") {
    // blended filler: full, harmonic, soft attack
    const lp = keep(new Tone.Filter(1800, "lowpass")).connect(out);
    const synth = keep(
      new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", count: 3, spread: 18 },
        envelope: { attack: 0.25, decay: 0.3, sustain: 0.8, release: 0.6 },
      })
    ).connect(lp);
    return {
      play(midi, durSec, time, velocity) {
        if (midi[0] === -1) return hit(time, velocity);
        synth.triggerAttackRelease(midi.map(freq), durSec, time, velocity);
      },
      dispose,
    };
  }

  if (voice === "bell") {
    // novelty: inharmonic, sparse, percussive attack (non-integer FM ratio)
    const synth = keep(
      new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.47,
        modulationIndex: 9,
        oscillator: { type: "sine" },
        modulation: { type: "sine" },
        envelope: { attack: 0.002, decay: 1.2, sustain: 0, release: 0.8 },
        modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0.1, release: 0.5 },
      })
    ).connect(out);
    return {
      play(midi, durSec, time, velocity) {
        if (midi[0] === -1) return hit(time, velocity);
        synth.triggerAttackRelease(midi.map(freq), Math.max(0.3, durSec), time, velocity);
      },
      dispose,
    };
  }

  if (voice === "kit") {
    // pitch decides the drum: <= 40 kick, 41–55 snare, 56–60 crash, otherwise hat
    const kick = keep(new Tone.MembraneSynth({ octaves: 6, pitchDecay: 0.04 })).connect(out);
    const snFilter = keep(new Tone.Filter(1800, "bandpass")).connect(out);
    const snare = keep(
      new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.14, sustain: 0 } })
    ).connect(snFilter);
    const hatFilter = keep(new Tone.Filter(7000, "highpass")).connect(out);
    const crashFilter = keep(new Tone.Filter(4500, "highpass")).connect(out);
    const crash = keep(
      new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.002, decay: 0.9, sustain: 0 } })
    ).connect(crashFilter);
    const hat = keep(
      new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.035, sustain: 0 } })
    ).connect(hatFilter);
    return {
      play(midi, _durSec, time, velocity) {
        for (const m of midi) {
          if (m !== -1 && m <= 40) kick.triggerAttackRelease("C1", 0.2, time, velocity);
          else if (m !== -1 && m <= 55) snare.triggerAttackRelease(0.12, time, velocity);
          else if (m >= 56 && m <= 60) crash.triggerAttackRelease(0.9, time, velocity * 0.8);
          else hat.triggerAttackRelease(0.03, time, velocity * 0.7);
        }
      },
      dispose,
    };
  }

  // click
  const click = keep(
    new Tone.MembraneSynth({ octaves: 2, pitchDecay: 0.01, envelope: { attack: 0.001, decay: 0.08, sustain: 0 } })
  ).connect(out);
  return {
    play(midi, _durSec, time, velocity) {
      const accent = velocity > 0.8;
      click.triggerAttackRelease(accent ? "G5" : midi[0] > 0 ? freq(midi[0]) : "C5", 0.03, time, velocity);
    },
    dispose,
  };
}

const VOICE_GAIN: Record<VoiceName, number> = {
  guitar: 0,
  drive: -8,
  voice: -10,
  bass: -6,
  click: -12,
  kit: -6,
  pad: -16,
  bell: -12,
};

export async function play(layers: Layer[], opts: PlayOptions): Promise<() => void> {
  stopAll();
  const Tone = await loadTone();
  await Tone.start();

  let cancelled = false;
  const master = new Tone.Volume(-6);
  const limiter = new Tone.Limiter(-1).toDestination();
  master.connect(limiter);

  const needsVerb = layers.some((l) => (l.space ?? 0) > 0);
  const verb = needsVerb ? new Tone.Freeverb({ roomSize: 0.82, dampening: 2600, wet: 1 }).connect(master) : null;
  const extras: { dispose: () => unknown }[] = verb ? [verb] : [];

  const instruments = layers.map((layer) => {
    const vol = new Tone.Volume((layer.gain ?? 0) + VOICE_GAIN[layer.voice]);
    if (layer.pan !== undefined || verb) {
      const panner = new Tone.Panner(layer.pan ?? 0).connect(master);
      vol.connect(panner);
      extras.push(panner);
      if (verb && (layer.space ?? 0) > 0) {
        const send = new Tone.Gain(layer.space).connect(verb);
        panner.connect(send);
        extras.push(send);
      }
    } else {
      vol.connect(master);
    }
    const inst = makeInstrument(Tone, layer.voice, vol);
    return { inst, vol };
  });
  const clickVol = new Tone.Volume(VOICE_GAIN.click).connect(master);
  const clickInst = makeInstrument(Tone, "click", clickVol);

  const spb = 60 / opts.bpm;
  const loops = opts.loops ?? 1;
  const longest = Math.max(
    0,
    ...layers.map((l) => {
      const last = l.events[l.events.length - 1];
      return last ? last.start + last.dur : 0;
    })
  );
  const loopBeats = opts.loopBeats ?? longest;
  const t0 = Tone.now() + 0.1;
  const countIn = opts.countIn ?? 0;
  const startAt = t0 + countIn * spb;

  for (let b = 0; b < countIn; b++) {
    clickInst.play([0], 0.05, t0 + b * spb, b === 0 ? 1 : 0.6);
  }

  const draw = Tone.getDraw();
  for (let loop = 0; loop < loops; loop++) {
    const loopOffset = startAt + loop * loopBeats * spb;
    layers.forEach((layer, li) => {
      if (layer.muted) return;
      layer.events.forEach((e, ei) => {
        const time = loopOffset + e.start * spb;
        if (e.midi.length > 0) {
          instruments[li].inst.play(e.midi, e.dur * spb, time, e.velocity ?? (e.accent ? 1 : 0.62));
        }
        if (opts.onEvent) {
          draw.schedule(() => {
            if (!cancelled) opts.onEvent!(li, ei, loop);
          }, time);
        }
      });
    });
  }

  const totalSec = countIn * spb + loops * loopBeats * spb;
  const cleanup = () => {
    instruments.forEach(({ inst, vol }) => {
      inst.dispose();
      vol.dispose();
    });
    clickInst.dispose();
    clickVol.dispose();
    extras.forEach((n) => n.dispose());
    master.dispose();
    limiter.dispose();
  };

  const endTimer = window.setTimeout(() => {
    if (cancelled) return;
    cancelled = true;
    // let the last notes ring a little
    window.setTimeout(cleanup, 1500);
    if (currentStop === stop) currentStop = null;
    opts.onEnd?.();
  }, (totalSec + 0.15) * 1000);

  function stop() {
    if (cancelled) return;
    cancelled = true;
    window.clearTimeout(endTimer);
    draw.cancel(0);
    master.volume.rampTo(-60, 0.05);
    window.setTimeout(cleanup, 120);
    opts.onEnd?.();
  }

  currentStop = stop;
  return stop;
}
