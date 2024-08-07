import type { Ref } from 'vue'
import { computed } from 'vue'

export function useFormattedTime(timestamp: Ref<number>) {
  return computed(() => {
    const date = new Date(timestamp.value)
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    return hours === '00' ? `${minutes}:${seconds}` : `${hours}:${minutes}:${seconds}`
  })
}
