const IST_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kolkata',
  hour12: true,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit'
};

// Convert UTC to IST
const getISTTime = (date: Date): Date => {
  const istString = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
};

export const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    // Parse the ISO string and convert to IST
    const utcDate = new Date(dateString);
    if (isNaN(utcDate.getTime())) return '';

    // Format in IST timezone
    return utcDate.toLocaleString('en-IN', IST_OPTIONS);
  } catch (err) {
    console.error('Error formatting date:', err);
    return '';
  }
};

export const getTimeDifference = (dateString: string | null, previousDateString?: string | null): string => {
  if (!dateString) return '';
  
  try {
    const utcDate = new Date(dateString);
    if (isNaN(utcDate.getTime())) return '';

    // If comparing with a previous date
    if (previousDateString) {
      const previousUtcDate = new Date(previousDateString);
      if (isNaN(previousUtcDate.getTime())) return '';

      const diffMs = utcDate.getTime() - previousUtcDate.getTime();
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
    const diffMs = now.getTime() - utcDate.getTime();
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
