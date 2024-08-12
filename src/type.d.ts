import type { ElementData } from 'clarity-visualize/types/visualize'
import type { DomData } from 'clarity-decode/types/layout'

export interface ListItem {
  createTime: string
  updateTime: string
  sid: string
}
export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
  zIndex?: number
}

export interface CustomElementData extends ElementData {
  content: string
  rectangle: Rectangle
  ranking: number
}

export type CustomActivity = CustomElementData[]

export interface UserScroll {
  userId: string
  scrollReachY: number
  cumulativeSum: number
}

export interface ScrollMapInfo {
  scrollReachY: number
  cumulativeSum: number
  percUsers: number
}

export interface ClickInfo {
  [key: string]: {
    hash: string
    totalclicks: number
    x: number[]
    y: number[]
    clicks: number[]
    points: number
    selector: null
  }
}

export interface AreaMapItem {
  domData: DomData
  clicks: number
  ctr: number
  hash: string
  content: string
  parents: number[]
}
