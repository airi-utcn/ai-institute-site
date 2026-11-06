"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Keeps UI state alive when the user navigates away and comes back with the
 * browser Back/Forward buttons.
 *
 * The App Router unmounts the page segment on client-side navigation, so plain
 * useState values are recreated on the way back. We store the values in a
 * module-level map scoped to the current history entry:
 *
 *   pathname + Next's bfcacheId + state name
 *
 * Next keeps `bfcacheId` stable for back/forward navigations and generates a
 * new one for fresh push/replace navigations. That gives us the behaviour we
 * want for free: Back restores the previous view, opening the page from the
 * navbar starts fresh.
 *
 * Values are written when the component mounts, immediately when a setter is
 * called, and again when it unmounts, so there is no flash of default state on
 * back navigation and updates survive an unmount that happens in the same tick.
 */

const MAX_ENTRIES = 50;
const store = new Map(); // history entry key -> Map(state name -> value)

function readValue(entryKey, name) {
  return store.get(entryKey)?.get(name);
}

function writeValue(entryKey, name, value) {
  let entry = store.get(entryKey);

  if (!entry) {
    entry = new Map();
  } else {
    // Refresh insertion order so the least recently used entry is evicted.
    store.delete(entryKey);
  }

  entry.set(name, value);
  store.set(entryKey, entry);

  while (store.size > MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    store.delete(oldestKey);
  }
}

function resolveInitialValue(initialValue) {
  return typeof initialValue === "function" ? initialValue() : initialValue;
}

export function usePageState(name, initialValue) {
  const pathname = usePathname();
  const { bfcacheId } = useRouter();
  const entryKey = `${pathname || ""}::${bfcacheId}`;

  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") {
      return resolveInitialValue(initialValue);
    }

    const stored = readValue(entryKey, name);
    return stored === undefined ? resolveInitialValue(initialValue) : stored;
  });

  // Keep the latest values in refs so the unmount cleanup can save them even
  // when the component never re-rendered after its last state change.
  const entryKeyRef = useRef(entryKey);
  const nameRef = useRef(name);
  const valueRef = useRef(value);
  entryKeyRef.current = entryKey;
  nameRef.current = name;
  valueRef.current = value;

  useEffect(() => {
    writeValue(entryKey, name, valueRef.current);

    return () => {
      writeValue(entryKeyRef.current, nameRef.current, valueRef.current);
    };
  }, [entryKey, name]);

  // Write immediately as well as through React state. This matters when a
  // click both updates state and starts a navigation: the page can unmount
  // before React has rendered the new value, and the unmount cleanup would
  // otherwise save the old one.
  const writePageState = useCallback((nextValue) => {
    const resolved =
      typeof nextValue === "function" ? nextValue(valueRef.current) : nextValue;

    valueRef.current = resolved;
    writeValue(entryKeyRef.current, nameRef.current, resolved);

    return resolved;
  }, []);

  const setPageState = useCallback(
    (nextValue) => {
      setValue(writePageState(nextValue));
    },
    [writePageState]
  );

  return [value, setPageState, writePageState];
}
