function throttle(func: (...args: any[]) => void, limit: number) {
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
