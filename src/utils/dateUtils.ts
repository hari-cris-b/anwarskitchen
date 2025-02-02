const IST_OPTIONS = {
  timeZone: 'Asia/Kolkata',
  hour12: true,
  hour: '2-digit',
  minute: '2-digit'
} as const;

export const formatDateTime = (dateString: string | null) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return new Intl.DateTimeFormat('en-IN', IST_OPTIONS).format(date);
  } catch (err) {
    console.error('Error formatting date:', err);
    return '';
  }
};

export const getTimeDifference = (dateString: string | null, previousDateString?: string | null) => {
  if (!dateString) return '';
  
  try {
    // Convert UTC date to IST
    const getISTTime = (date: Date) => {
      return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    };

    const date = getISTTime(new Date(dateString));
    if (isNaN(date.getTime())) return '';

    // If comparing with a previous date
    if (previousDateString) {
      const previousDate = getISTTime(new Date(previousDateString));
      if (isNaN(previousDate.getTime())) return '';

      const diffMs = date.getTime() - previousDate.getTime();
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
    
    // If comparing with current time, use IST current time
    const now = getISTTime(new Date());
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);

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
