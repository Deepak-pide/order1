let audioContext

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  audioContext ||= new AudioContextClass()
  return audioContext
}

export function playUiSound(type = 'tap') {
  const context = getAudioContext()
  if (!context) return false
  if (context.state === 'suspended') void context.resume()

  const notes = type === 'notification'
    ? [{ frequency: 660, start: 0 }, { frequency: 880, start: 0.13 }, { frequency: 1040, start: 0.26 }]
    : type === 'success'
      ? [{ frequency: 720, start: 0 }, { frequency: 960, start: 0.11 }]
      : [{ frequency: 680, start: 0 }]

  for (const note of notes) {
    const oscillator = context.createOscillator()
    const volume = context.createGain()
    const startAt = context.currentTime + note.start
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(note.frequency, startAt)
    volume.gain.setValueAtTime(0.0001, startAt)
    volume.gain.exponentialRampToValueAtTime(type === 'notification' ? 0.08 : type === 'success' ? 0.045 : 0.035, startAt + 0.015)
    volume.gain.exponentialRampToValueAtTime(0.0001, startAt + (type === 'notification' ? 0.11 : type === 'success' ? 0.09 : 0.055))
    oscillator.connect(volume)
    volume.connect(context.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + (type === 'notification' ? 0.12 : type === 'success' ? 0.1 : 0.065))
  }
  return true
}
