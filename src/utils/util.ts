export function throttle(func: (...args: any[]) => void, limit: number) {
  let lastFunc: number
  let lastRan: number
  return function (...args: any[]) {
    if (!lastRan) {
      func(...args)
      lastRan = Date.now()
    }
    else {
      clearTimeout(lastFunc)
      lastFunc = window.setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func(...args)
          lastRan = Date.now()
        }
      }, limit - (Date.now() - lastRan))
    }
  }
}

export function isMobileDevice(userAgent: string | undefined): boolean {
  if (!userAgent) {
    return false
  }
  return /android|webos|iphone|ipad|ipod|blackberry|windows phone|opera mini|iemobile|mobile|silk|fennec|bada|tizen|symbian|nokia|palmsource|meego|sailfish|kindle|playbook|bb10|rim/i.test(userAgent)
}

// 深拷贝
export function copy<T>(input: T): T {
  return JSON.parse(JSON.stringify(input))
}
