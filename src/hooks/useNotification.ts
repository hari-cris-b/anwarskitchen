import { useState, useEffect, useCallback } from 'react';

interface UseNotificationOptions {
  title?: string;
  defaultIcon?: string;
  defaultTag?: string;
}

interface NotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  dir?: 'auto' | 'ltr' | 'rtl';
  lang?: string;
  badge?: string;
  timestamp?: number;
  vibrate?: number[];
  silent?: boolean;
  onClick?: () => void;
  onClose?: () => void;
  onError?: () => void;
  onShow?: () => void;
}

export const useNotification = (options: UseNotificationOptions = {}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const isSupported = 'Notification' in window;
    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
      return false;
    }
  }, [supported]);

  const sendNotification = useCallback(
    ({ 
      title, 
      onClick,
      onClose,
      onError,
      onShow,
      icon = options.defaultIcon,
      tag = options.defaultTag,
      ...rest 
    }: NotificationPayload) => {
      if (!supported || permission !== 'granted') {
        return false;
      }

      try {
        // Send browser notification only if the page is not visible
        if (document.hidden) {
          const notification = new Notification(title, {
            icon,
            tag,
            ...rest
          });

          // Add event listeners if provided
          if (onClick) notification.onclick = onClick;
          if (onClose) notification.onclose = onClose;
          if (onError) notification.onerror = onError;
          if (onShow) notification.onshow = onShow;

          // Default click handler if none provided
          if (!onClick) {
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }

          return notification;
        }
        return false;
      } catch (error) {
        console.warn('Failed to send notification:', error);
      }

      return false;
    },
    [supported, permission, options.defaultIcon, options.defaultTag]
  );

  return {
    supported,
    permission,
    isPermissionGranted: permission === 'granted',
    isPermissionDenied: permission === 'denied',
    requestPermission,
    sendNotification
  };
};

export default useNotification;