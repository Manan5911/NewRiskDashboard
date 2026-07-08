import { useState, useEffect, useCallback, useRef } from 'react';
import { useDataStore } from '../store/dataStore';

export function useColumnPrefs(columnIds, userKey) {
  const [order, setOrder] = useState(columnIds);
  const [hidden, setHidden] = useState(new Set());
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  const customColumns = useDataStore(state => state.customColumns);
  const saveCustomColumns = useDataStore(state => state.saveCustomColumns);
  const port = window.location.port || '80';

  // ── Load from store when customColumns arrives ─────────────────────────────
  useEffect(() => {
    if (customColumns === null) return; // not fetched yet
    if (loadedRef.current) return;     // already loaded once

    if (customColumns.order && customColumns.order.length > 0) {
      const knownSet = new Set(columnIds);
      const reconciledOrder = customColumns.order.filter(id => knownSet.has(id));
      const savedSet = new Set(reconciledOrder);
      columnIds.forEach(id => { if (!savedSet.has(id)) reconciledOrder.push(id); });

      setOrder(reconciledOrder);
      setHidden(new Set((customColumns.hidden || []).filter(id => knownSet.has(id))));
    } else {
      setOrder(columnIds);
      setHidden(new Set());
    }

    loadedRef.current = true;
    setLoaded(true);
  }, [customColumns]);

  // ── Persist to DB on every change ─────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    saveCustomColumns(order, hidden, port);
  }, [order, hidden, loaded]);

  const toggleVisibility = useCallback((id) => {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const reorder = useCallback((draggedId, targetId) => {
    setOrder(prev => {
      if (draggedId === targetId) return prev;
      const next = [...prev];
      const fromIdx = next.indexOf(draggedId);
      const toIdx = next.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, draggedId);
      return next;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setOrder(columnIds);
    setHidden(new Set());
  }, []);

  return { order, hidden, toggleVisibility, reorder, resetToDefault, loaded };
}