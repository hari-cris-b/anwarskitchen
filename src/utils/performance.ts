// Performance monitoring utilities

export const measurePerformance = (metricName: string) => {
  if (!window.performance || !window.performance.mark) return;

  const startMark = `${metricName}_start`;
  const endMark = `${metricName}_end`;

  window.performance.mark(startMark);

  return {
    end: () => {
      window.performance.mark(endMark);
      window.performance.measure(metricName, startMark, endMark);

      const measures = window.performance.getEntriesByName(metricName);
      const lastMeasure = measures[measures.length - 1];

      // Clear marks and measures
      window.performance.clearMarks(startMark);
      window.performance.clearMarks(endMark);
      window.performance.clearMeasures(metricName);

      return lastMeasure?.duration;
    }
  };
};

export const initializePerformanceMonitoring = () => {
  if (!window.performance || !window.PerformanceObserver) return;

  // Monitor Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
  });
  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

  // Monitor First Input Delay
  const fidObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('FID:', lastEntry.duration);
  });
  fidObserver.observe({ entryTypes: ['first-input'] });

  // Monitor Cumulative Layout Shift
  const clsObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    let clsScore = 0;
    type CLSEntry = PerformanceEntry & {
      hadRecentInput?: boolean;
      value?: number;
    };
    console.log('CLS:', clsScore);
  });
  clsObserver.observe({ entryTypes: ['layout-shift'] });

  // Monitor Long Tasks
  const longTaskObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      console.log('Long Task:', entry.duration);
    });
  });
  longTaskObserver.observe({ entryTypes: ['longtask'] });
};

// Debounce utility for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for performance optimization
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
