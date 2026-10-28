import { useCallback, useState } from 'react';

let nextId = 1;

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((type, text) => {
    const id = nextId++;
    setNotifications(prev => [...prev.slice(-3), { id, type, text }]);
  }, []);

  const dismiss = useCallback(id => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, notify, dismiss };
}
