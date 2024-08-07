import type { ClickData } from 'clarity-js/types/interaction'
import type { DomData, DomEvent } from 'clarity-decode/types/layout'
import type { ClickEvent } from 'clarity-decode/types/interaction'
import type { Activity, ElementData } from 'clarity-visualize/types/visualize'

function getSelector(clickData: ClickData, dom: DomEvent | null): string {
  if (!dom?.data)
    return ''

  const domData = dom.data as DomData[]

  if (typeof clickData.target === 'number') {
    const target = domData.find((element: DomData) => element.id === clickData.target)
    return target?.selectorAlpha ?? target?.selectorBeta ?? ''
  }

  const target = domData.find((element: DomData) => element.hashAlpha === clickData.hash)
  return target?.selectorAlpha ?? target?.selectorBeta ?? ''
}

export function getActivityData(clickEvents: ClickEvent[], dom: DomEvent | null): Activity {
  const elementDataMap = new Map<string, ElementData>()
  clickEvents.forEach((event: ClickEvent) => {
    const clickData = event.data as ClickData
    if (elementDataMap.has(clickData.hash)) {
      // 如果x,y坐标相同，则index对应clicks+1，否则新增一个点
      const elementData = elementDataMap.get(clickData.hash) as ElementData
      const index = elementData.x.findIndex((x, i) => x === clickData.x && elementData.y[i] === clickData.y)
      if (index !== -1) {
        elementData.clicks[index] += 1
        elementData.totalclicks += 1
        // elementData.points += 1
      }
      else {
        elementData.x.push(clickData.x)
        elementData.y.push(clickData.y)
        elementData.clicks.push(1)
        elementData.totalclicks += 1
        elementData.points += 1
      }
    }
    else {
      elementDataMap.set(clickData.hash, {
        hash: clickData.hash,
        selector: getSelector(clickData, dom),
        totalclicks: 1,
        x: [clickData.x],
        y: [clickData.y],
        clicks: [1],
        points: 1,
      })
    }
  })
  return Array.from(elementDataMap.values())
}
