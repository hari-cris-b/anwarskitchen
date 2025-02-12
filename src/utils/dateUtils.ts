const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kolkata',
  hour12: true,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit'
};

export const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    // Create IST formatter with all required options
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
    
    return formatter.format(date);
  } catch (err) {
    console.error('Error formatting date:', err);
    return '';
  }
};

export const getTimeDifference = (dateString: string | null, previousDateString?: string | null): string => {
  if (!dateString) return '';
  
  try {
    const getISTTime = (date: Date) => {
      return new Date(date.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata'
      }));
    };

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    // If comparing with a previous date
    if (previousDateString) {
      const previousDate = new Date(previousDateString);
      if (isNaN(previousDate.getTime())) return '';

      // Convert both dates to IST for comparison
      const istDate = getISTTime(date);
      const istPreviousDate = getISTTime(previousDate);

      // Calculate difference in milliseconds
      const diffMs = Math.abs(istDate.getTime() - istPreviousDate.getTime());
      const diffMins = Math.round(diffMs / 60000);

      if (diffMins < 1) return 'less than a minute';
      if (diffMins === 1) return '1 minute';
      if (diffMins < 60) return `${diffMins} minutes`;
      
      const hours = Math.floor(diffMins / 60);
      if (hours === 1) return '1 hour';
      if (hours < 24) return `${hours} hours`;
      
      const days = Math.floor(hours / 24);
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    }
    
    // If comparing with current time
    const now = new Date();
    const istNow = getISTTime(now);
    const istDate = getISTTime(date);
    
    const diffMs = istNow.getTime() - istDate.getTime();
    const diffMins = Math.round(Math.abs(diffMs) / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const hours = Math.floor(diffMins / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } catch (err) {
    console.error('Error calculating time difference:', err);
    return '';
  }
};
