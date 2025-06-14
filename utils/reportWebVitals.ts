export function reportWebVitals(onPerfEntry?: (entry: any) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    if (typeof window !== 'undefined') {
      import('web-vitals').then(
        ({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
          getCLS(onPerfEntry)
          getFID(onPerfEntry)
          getFCP(onPerfEntry)
          getLCP(onPerfEntry)
          getTTFB(onPerfEntry)
        }
      )
    }
  }
}
