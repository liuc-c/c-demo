<script setup lang="ts" generic="T extends any, O extends any">
import { onMounted, ref } from 'vue'
import TheInput from '~/components/TheInput.vue'

const name = ref('')

// const { post } = useBroadcastChannel({ name: 'test_clarity' })

onMounted(() => {
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) }
    // t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    t = l.createElement(r); t.async = 1; t.src = `http://192.168.1.20:3501/tag/${i}`
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y)
    console.log(y, 222)
  })(window, document, 'clarity', 'script', 'ngd900iyph')
  // clarity.start({
  //   delay: 500,
  //   lean: false,
  //   drop: [],
  //   mask: [],
  //   unmask: ['div'],
  //   content: true,
  //   fraud: true,
  //   track: true,
  //   throttleDom: true,
  //   checksum: [],
  //   upload: (data: string): void => {
  //     // post(data)
  //     const decoded = decode(data)
  //     console.log(decoded)
  //     // console.log(`projectId ： ${decoded.envelope.projectId}`)
  //     // console.log(`userId ： ${decoded.envelope.userId}`)
  //     // console.log(`sessionId ： ${decoded.envelope.sessionId}`)
  //     // if (status.value === 'OPEN') {
  //     //   send(JSON.stringify({ type: 'get', data }))
  //     // }
  //   },
  //   projectId: 'hhhhhhh',
  // })
})

function getColor(index: number): string {
  // 列出 20 种颜色
  const colorArr = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gray', 'black', 'white', 'brown', 'indigo', 'teal', 'lime', 'amber']
  return colorArr[index % colorArr.length]
}

// const formatted = useDateFormat(useNow(), 'YYYY-MM-DD HH:mm:ss')
</script>

<template>
  <div v-for="item in 20">
    <div text-20 :style="`color:${getColor(item)}`">
      title
    </div>
    <!--    <div>{{ formatted }}</div> -->
    <div py-4 />

    <TheInput
      v-model="name"
      placeholder="What's your name?"
      autocomplete="false"
    />
  </div>
</template>
