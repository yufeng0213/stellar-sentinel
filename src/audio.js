/**
 * 轻量 Web Audio 音效层：不加载外部音频，全部实时合成。
 * 浏览器要求先有用户手势，所以只有 pointerdown 之后才创建 AudioContext。
 */

let context = null
let master = null
let enabled = readEnabled()

function readEnabled() {
  try {
    return localStorage.getItem('ss.sound') !== 'off'
  } catch {
    return true
  }
}

function saveEnabled(value) {
  try {
    localStorage.setItem('ss.sound', value ? 'on' : 'off')
  } catch {
    // 忽略隐私模式下的存储失败
  }
}

export function isSoundOn() {
  return enabled
}

export function toggleSound() {
  enabled = !enabled
  saveEnabled(enabled)
  if (enabled) {
    initAudio()
    play('tap')
  }
  return enabled
}

export function initAudio() {
  if (typeof window === 'undefined') return null
  if (!context) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioCtor) return null
    try {
      context = new AudioCtor()
      master = context.createGain()
      master.gain.value = 0.8
      master.connect(context.destination)
    } catch {
      context = null
      return null
    }
  }
  if (context.state === 'suspended') context.resume().catch(() => {})
  return context
}

export function unlockAudio() {
  initAudio()
}

function tone({ from, to = from, duration = 0.08, type = 'sine', gain = 0.04, delay = 0 }) {
  const ctx = initAudio()
  if (!ctx || !master) return
  const start = ctx.currentTime + delay
  const oscillator = ctx.createOscillator()
  const amp = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(Math.max(1, from), start)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration)
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.008)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(amp)
  amp.connect(master)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

function noise({ duration = 0.12, gain = 0.035, frequency = 1200, delay = 0 }) {
  const ctx = initAudio()
  if (!ctx || !master) return
  const start = ctx.currentTime + delay
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / length)
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = 0.8
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter)
  filter.connect(amp)
  amp.connect(master)
  source.start(start)
  source.stop(start + duration + 0.02)
}

const PRESETS = {
  tap: () => tone({ from: 920, to: 720, duration: 0.035, type: 'triangle', gain: 0.028 }),
  open: () => tone({ from: 420, to: 620, duration: 0.1, type: 'sine', gain: 0.035 }),
  attack: () => {
    noise({ duration: 0.1, gain: 0.055, frequency: 1600 })
    tone({ from: 180, to: 70, duration: 0.14, type: 'sawtooth', gain: 0.05 })
  },
  heavy: () => {
    noise({ duration: 0.18, gain: 0.07, frequency: 900 })
    tone({ from: 120, to: 52, duration: 0.24, type: 'sine', gain: 0.08 })
  },
  quick: () => {
    noise({ duration: 0.06, gain: 0.04, frequency: 2200 })
    tone({ from: 520, to: 260, duration: 0.07, type: 'triangle', gain: 0.035 })
  },
  guard: () => {
    tone({ from: 260, to: 430, duration: 0.12, type: 'sine', gain: 0.045 })
    tone({ from: 520, to: 650, duration: 0.08, type: 'triangle', gain: 0.02, delay: 0.04 })
  },
  psychic: () => {
    tone({ from: 380, to: 920, duration: 0.2, type: 'sine', gain: 0.035 })
    tone({ from: 760, to: 420, duration: 0.22, type: 'triangle', gain: 0.022, delay: 0.04 })
  },
  heal: () => {
    tone({ from: 620, to: 880, duration: 0.14, type: 'sine', gain: 0.035 })
    tone({ from: 880, to: 1240, duration: 0.16, type: 'sine', gain: 0.025, delay: 0.08 })
  },
  social: () => tone({ from: 440, to: 540, duration: 0.12, type: 'triangle', gain: 0.03 }),
  utility: () => tone({ from: 300, to: 460, duration: 0.08, type: 'square', gain: 0.025 }),
  enemy: () => {
    tone({ from: 140, to: 86, duration: 0.16, type: 'sawtooth', gain: 0.035 })
    noise({ duration: 0.12, gain: 0.025, frequency: 500 })
  },
  hurt: () => {
    tone({ from: 220, to: 90, duration: 0.22, type: 'sawtooth', gain: 0.06 })
    noise({ duration: 0.16, gain: 0.04, frequency: 380 })
  },
  battle: () => {
    tone({ from: 92, to: 70, duration: 0.5, type: 'sine', gain: 0.045 })
    tone({ from: 220, to: 160, duration: 0.3, type: 'triangle', gain: 0.025, delay: 0.06 })
  },
  victory: () => {
    ;[523, 659, 784, 1046].forEach((freq, index) => {
      tone({ from: freq, to: freq, duration: 0.18, type: 'triangle', gain: 0.045, delay: index * 0.09 })
    })
  },
  defeat: () => {
    ;[392, 330, 262, 196].forEach((freq, index) => {
      tone({ from: freq, to: freq * 0.94, duration: 0.24, type: 'sine', gain: 0.04, delay: index * 0.12 })
    })
  },
  flee: () => {
    noise({ duration: 0.22, gain: 0.035, frequency: 1500 })
    tone({ from: 620, to: 180, duration: 0.24, type: 'sine', gain: 0.03 })
  },
}

export function play(name) {
  if (!enabled) return
  const preset = PRESETS[name] || PRESETS.tap
  try {
    preset()
  } catch {
    // 音频失败不应影响游戏
  }
}

export function cardSound(card) {
  if (!card) return 'utility'
  if (card.type === 'attack') {
    if (card.key === 'heavy' || card.key === 'execute') return 'heavy'
    if (card.key === 'quick') return 'quick'
    return 'attack'
  }
  if (card.type === 'guard') return 'guard'
  if (card.type === 'psychic') return 'psychic'
  if (card.type === 'heal') return 'heal'
  if (card.type === 'social') return 'social'
  return 'utility'
}
