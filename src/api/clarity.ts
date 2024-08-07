import { useFetch } from '@vueuse/core'

export function getListApi() {
  return useFetch('/api/list').get().json()
}

export function getDetailsBySidApi(sid: string, i: number) {
  return useFetch(`/api/details?sid=${sid}&i=${i}`).get().json()
}
