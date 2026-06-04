import { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { SEED } from './seed.js';
import { getToken, getConfig } from './gapi.js';
import { readFromSheets, writeAllToSheets } from './sync.js';
import { migrateStatus } from './logic.js';

const STORAGE_KEY = 'supplyhub_v1';
const StoreContext = createContext(null);

// Migrate old 7-step statuses to simplified 3-step system
function migrateState(state) {
  if (!state?.steps?.length) return state;
  return {
    ...state,
    steps: state.steps.map(s => ({ ...s, status: migrateStatus(s.status) })),
  };
}

function getInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateState(JSON.parse(raw));
  } catch { /* ignore */ }
  return SEED;
}

function reducer(state, action) {
  switch (action.type) {

    // ── Projects ──────────────────────────────────────────────────────────────
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };

    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p) };

    case 'DELETE_PROJECT': {
      const prodIds = state.products.filter(p => p.project_id === action.id).map(p => p.id);
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.id),
        products: state.products.filter(p => p.project_id !== action.id),
        steps:    state.steps.filter(s => !prodIds.includes(s.product_id)),
      };
    }

    // ── Products ──────────────────────────────────────────────────────────────
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };

    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) };

    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.id),
        steps:    state.steps.filter(s => s.product_id !== action.id),
      };

    // ── Steps ─────────────────────────────────────────────────────────────────
    case 'ADD_STEP':
      return { ...state, steps: [...state.steps, action.payload] };

    case 'UPDATE_STEP':
      return { ...state, steps: state.steps.map(s => s.id === action.payload.id ? action.payload : s) };

    case 'DELETE_STEP':
      return { ...state, steps: state.steps.filter(s => s.id !== action.id) };

    case 'UPDATE_STEP_STATUS':
      return {
        ...state,
        steps: state.steps.map(s =>
          s.id === action.id
            ? { ...s, status: action.status, started_at: new Date().toISOString(), note: action.note ?? s.note }
            : s
        ),
      };

    // ── Factories ─────────────────────────────────────────────────────────────
    case 'ADD_FACTORY':
      return { ...state, factories: [...state.factories, action.payload] };

    case 'UPDATE_FACTORY':
      return { ...state, factories: state.factories.map(f => f.id === action.payload.id ? action.payload : f) };

    case 'DELETE_FACTORY':
      return { ...state, factories: state.factories.filter(f => f.id !== action.id) };

    // ── Members ───────────────────────────────────────────────────────────────
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] };

    case 'UPDATE_MEMBER':
      return { ...state, members: state.members.map(m => m.id === action.payload.id ? action.payload : m) };

    case 'DELETE_MEMBER':
      return { ...state, members: state.members.filter(m => m.id !== action.id) };

    // ── Bulk save (create/edit project) ───────────────────────────────────────
    case 'SAVE_PROJECT_FULL': {
      const { project, products, steps } = action.payload;
      const existingProdIds = state.products
        .filter(p => p.project_id === project.id)
        .map(p => p.id);
      const newProdIds = products.map(p => p.id);
      return {
        ...state,
        projects: state.projects.find(p => p.id === project.id)
          ? state.projects.map(p => p.id === project.id ? project : p)
          : [...state.projects, project],
        products: [
          ...state.products.filter(p => p.project_id !== project.id),
          ...products,
        ],
        steps: [
          ...state.steps.filter(s =>
            !existingProdIds.includes(s.product_id) &&
            !newProdIds.includes(s.product_id)
          ),
          ...steps,
        ],
      };
    }

    // ── Load from Google Sheets (initial sync) ────────────────────────────────
    case 'LOAD_FROM_SHEETS': {
      const merged = { ...state };
      for (const [key, items] of Object.entries(action.payload)) {
        // null = read failed (keep existing data)
        // []   = Sheets is empty — valid, should clear local data
        // [...] = Sheets has data — replace local data
        if (Array.isArray(items)) merged[key] = items;
      }
      return merged;
    }

    case 'RESET':
      return { projects: [], products: [], steps: [], factories: [], members: [] };

    case 'CLEAR_ALL':
      return { projects: [], products: [], steps: [], factories: [], members: [] };

    default:
      return state;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, getInitialState);
  // idle | loading | syncing | synced | error
  const [syncStatus, setSyncStatus] = useState('idle');
  const syncTimer   = useRef(null);
  const skipSync    = useRef(false); // true while handling initial Sheets load

  // 1. Persist to localStorage on every state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Track syncStatus in a ref so polling interval can read it without re-registering
  const syncStatusRef = useRef('idle');
  useEffect(() => { syncStatusRef.current = syncStatus; }, [syncStatus]);

  // ── Manual reload from Sheets (exposed in context) ───────────────────────
  const reloadFromSheets = useCallback(async () => {
    const token = getToken();
    const { spreadsheetId } = getConfig();
    if (!token || !spreadsheetId) return;

    setSyncStatus('loading');
    skipSync.current = true;

    try {
      const sheetsData = await readFromSheets(spreadsheetId, token);
      dispatch({ type: 'LOAD_FROM_SHEETS', payload: sheetsData });
      setSyncStatus('synced');
    } catch (err) {
      console.error('[store] Sheets reload failed:', err);
      setSyncStatus('error');
    } finally {
      setTimeout(() => { skipSync.current = false; }, 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. On mount: if Google is configured & token is valid, load from Sheets
  useEffect(() => {
    const token = getToken();
    const { spreadsheetId } = getConfig();
    if (!token || !spreadsheetId) return;

    setSyncStatus('loading');
    skipSync.current = true;

    readFromSheets(spreadsheetId, token)
      .then(sheetsData => {
        dispatch({ type: 'LOAD_FROM_SHEETS', payload: sheetsData });
        setSyncStatus('synced');
      })
      .catch(err => {
        console.error('[store] Initial Sheets load failed:', err);
        setSyncStatus('error');
      })
      .finally(() => {
        // Allow normal sync writes after a short delay
        setTimeout(() => { skipSync.current = false; }, 500);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Auto-poll: re-read Sheets every 30 s to pick up other users' changes
  useEffect(() => {
    const poll = async () => {
      // Don't poll while a write is in-flight or a load is happening
      if (syncStatusRef.current !== 'synced') return;
      const token = getToken();
      const { spreadsheetId } = getConfig();
      if (!token || !spreadsheetId) return;

      skipSync.current = true;
      try {
        const sheetsData = await readFromSheets(spreadsheetId, token);
        dispatch({ type: 'LOAD_FROM_SHEETS', payload: sheetsData });
        setSyncStatus('synced');
      } catch (err) {
        console.warn('[store] Auto-poll failed:', err.message);
      } finally {
        setTimeout(() => { skipSync.current = false; }, 500);
      }
    };

    const interval = setInterval(poll, 30000); // every 30 seconds

    // Also poll immediately when the user switches back to this tab
    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 5. Debounced sync to Sheets on every state change
  useEffect(() => {
    if (skipSync.current) return;

    const token = getToken();
    const { spreadsheetId } = getConfig();
    if (!token || !spreadsheetId) return;

    setSyncStatus('pending');
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      setSyncStatus('syncing');
      writeAllToSheets(state, spreadsheetId, token)
        .then(() => setSyncStatus('synced'))
        .catch(err => {
          console.error('[store] Sheets sync failed:', err);
          setSyncStatus('error');
        });
    }, 2000); // 2-second debounce

    return () => clearTimeout(syncTimer.current);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StoreContext.Provider value={{ state, dispatch, syncStatus, reloadFromSheets }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
