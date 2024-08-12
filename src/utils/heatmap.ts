import type { ClickData } from 'clarity-js/types/interaction'
import type { DomData, DomEvent } from 'clarity-decode/types/layout'
import type { ClickEvent } from 'clarity-decode/types/interaction'
import type { CustomActivity, CustomElementData, Rectangle, ScrollMapInfo } from '~/type'
import { copy } from '~/utils/util'

export async function renderScrollMap(visualize: any, scrollMapInfo: ScrollMapInfo[], scrollY: number) {
  await scrollToY(visualize, scrollY)
  visualize.scrollmap(scrollMapInfo)
}

function getSelector(clickData: ClickData, dom: DomEvent | null): string {
  if (!dom?.data)
    return ''
  const domData = dom.data as DomData[]
  const target = typeof clickData.target === 'number'
    ? domData.find((element: DomData) => element.id === clickData.target)
    : domData.find((element: DomData) => element.hashAlpha === clickData.hash)
  return target?.selectorAlpha ?? target?.selectorBeta ?? ''
}

async function scrollToY(visualize: any, y: number) {
  await visualize.render([{ event: 10, data: { target: 2, x: 0, y } }])
  const iframe = document.getElementById('clarity') as HTMLIFrameElement
  iframe.style.top = `${y}px`
}

function createRectangleElement(elementData: CustomElementData): HTMLDivElement {
  const rectangle = elementData.rectangle
  const rectDom = document.createElement('div')
  Object.assign(rectDom.style, {
    position: 'absolute',
    left: `${rectangle.x}px`,
    top: `${rectangle.y}px`,
    width: `${rectangle.width - rectangle.x}px`,
    height: `${rectangle.height - rectangle.y}px`,
    border: '1px solid #0078D4',
    zIndex: rectangle.zIndex ?? 0,
  })
  // rectDom.className = elementData.hash
  rectDom.classList.add(elementData.hash)
  // @unocss-include
  rectDom.classList.add('rectangle')
  // rectDom.textContent = `${elementData.content}(${elementData.totalclicks})`
  const numClicks = document.createElement('div')
  numClicks.textContent = (elementData.ranking).toString()
  Object.assign(numClicks.style, {
    'position': 'absolute',
    'width': '36px',
    'height': '36px',
    'background': '#0078D4',
    'color': 'white',
    'border': '1px solid #FFFFFF',
    'filter': 'drop-shadow(0px 1.2px 3.6px rgba(0, 0, 0, 0.1))',
    'cursor': 'default',
    'border-radius': '32px',
    'text-align': 'center',
    'line-height': '32px',
  })
  rectDom.appendChild(numClicks)
  return rectDom
}

function setRectangle(elementData: CustomElementData, element: HTMLElement) {
  const rectDom = createRectangleElement(elementData)
  element.appendChild(rectDom)
}

function isOverlapping(rect1: Rectangle, rect2: Rectangle): boolean {
  return !(
    rect1.x + rect1.width <= rect2.x
    || rect2.x + rect2.width <= rect1.x
    || rect1.y + rect1.height <= rect2.y
    || rect2.y + rect2.height <= rect1.y
  )
}

function sortRectangles(activity: CustomActivity): CustomActivity {
  const newActivity = copy(activity)
  newActivity.sort((a, b) => (a.rectangle.width * a.rectangle.height) - (b.rectangle.width * b.rectangle.height))

  // Assign zIndex to rectangles that overlap with larger rectangles
  for (let i = 0; i < newActivity.length; i++) {
    let zIndex = 1
    for (let j = 0; j < newActivity.length; j++) {
      if (i !== j && isOverlapping(newActivity[i].rectangle, newActivity[j].rectangle)) {
        if ((newActivity[i].rectangle.width * newActivity[i].rectangle.height) < (newActivity[j].rectangle.width * newActivity[j].rectangle.height)) {
          newActivity[i].rectangle.zIndex = zIndex++
        }
      }
    }
  }
  return newActivity
}
function renderClickRectangles(activity: CustomActivity) {
  const renderContainer = document.querySelector('.heatmap-elements') as HTMLDivElement
  if (renderContainer.querySelectorAll('div').length > 0)
    return
  const a = sortRectangles(activity)
  a.forEach((elementData: CustomElementData) => setRectangle(elementData, renderContainer),
  )
}

export async function renderClickMap(visualize: any, activity: CustomActivity, scrollY: number) {
  await scrollToY(visualize, scrollY)
  visualize.clickmap(activity)
  renderClickRectangles(activity)
}

export function getActivityData(clickEvents: ClickEvent[], dom: DomEvent | null): CustomActivity {
  const elementDataMap = new Map<string, CustomElementData>()
  const left = -10
  const right = 10

  clickEvents.forEach((event: ClickEvent) => {
    const clickData = event.data as ClickData
    // if (!clickData.hash)
    //   return
    const existingElement = elementDataMap.get(clickData.hash)

    if (existingElement) {
      const index = existingElement.x.findIndex((x, i) => x === clickData.x && existingElement.y[i] === clickData.y)
      if (index !== -1) {
        existingElement.clicks[index] += 1
        existingElement.totalclicks += 1
        existingElement.points += 1
      }
      else {
        existingElement.x.push(clickData.eX)
        existingElement.y.push(clickData.eY)
        existingElement.clicks.push(1)
        existingElement.totalclicks += 1
        existingElement.points += 2
        existingElement.rectangle = {
          x: Math.min(existingElement.rectangle.x, clickData.x + left),
          y: Math.min(existingElement.rectangle.y, clickData.y + left),
          width: Math.max(existingElement.rectangle.width, clickData.x + right),
          height: Math.max(existingElement.rectangle.height, clickData.y + right),
        }
      }
    }
    else {
      const selector = getSelector(clickData, dom)
      elementDataMap.set(clickData.hash, {
        ranking: 0,
        hash: clickData.hash,
        selector,
        totalclicks: 1,
        x: [clickData.eX],
        y: [clickData.eY],
        clicks: [1],
        points: 1,
        content: clickData.text || selector,
        rectangle: {
          x: clickData.x + left,
          y: clickData.y + left,
          width: clickData.x + right,
          height: clickData.y + right,
        },
      })
    }
  })

  return Array.from(elementDataMap.values())
    .sort((a, b) => b.totalclicks - a.totalclicks)
    .map((element, index) => {
      element.ranking = index + 1
      return element
    })
}

export function setupIframe(): HTMLIFrameElement {
  let iframe = document.getElementById('clarity') as HTMLIFrameElement
  if (iframe && iframe.parentElement) {
    iframe.parentElement.removeChild(iframe)
  }
  iframe = document.createElement('iframe')
  iframe.id = 'clarity'
  iframe.title = 'Microsoft Clarity'
  iframe.setAttribute('scrolling', 'no')
  iframe.style.display = 'block'
  return iframe
}
