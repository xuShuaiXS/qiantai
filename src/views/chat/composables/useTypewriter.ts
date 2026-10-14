import { onMounted, onUnmounted, ref } from 'vue'
import { typeLines } from '../data'

export function useTypewriter() {
  const text = ref('')
  let typeIdx = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  function clear() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function run() {
    clear()
    const chars = Array.from(typeLines[typeIdx % typeLines.length]!)
    let i = 0
    let phase: 'type' | 'hold' | 'erase' = 'type'

    function paint() {
      text.value = chars.slice(0, i).join('')
    }

    function tick() {
      if (phase === 'type') {
        i++
        paint()
        if (i >= chars.length) {
          phase = 'hold'
          timer = setTimeout(tick, 1800)
          return
        }
        timer = setTimeout(tick, 68)
        return
      }
      if (phase === 'hold') {
        phase = 'erase'
        timer = setTimeout(tick, 40)
        return
      }
      i--
      paint()
      if (i <= 0) {
        typeIdx++
        timer = setTimeout(run, 320)
        return
      }
      timer = setTimeout(tick, 36)
    }

    text.value = ''
    timer = setTimeout(tick, 200)
  }

  onMounted(run)
  onUnmounted(clear)

  return { text }
}
