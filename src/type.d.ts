import type { ElementData } from 'clarity-visualize/types/visualize'

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
