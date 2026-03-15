import { MutableRefObject, useCallback, useEffect, useRef } from "react";

type UseDebouncedSaveTriggerOptions<TValueKey> = {
  saveOnChange: boolean;
  isDirtyRef: MutableRefObject<boolean>;
  inputKeyRef: MutableRefObject<TValueKey>;
  currentSavingValueRef: MutableRefObject<TValueKey | null>;
  awaitingExternalSyncRef: MutableRefObject<boolean>;
  pendingSavedValueRef: MutableRefObject<TValueKey | null>;
  queueSave: (valueToSave: TValueKey) => void;
  delayMs?: number;
  isEquivalent?: (left: TValueKey, right: TValueKey) => boolean;
  shouldSchedule?: (nextValue: TValueKey) => boolean;
};

const defaultIsEquivalent = <TValueKey,>(left: TValueKey, right: TValueKey) => left === right;

const useDebouncedSaveTrigger = <TValueKey,>({
  saveOnChange,
  isDirtyRef,
  inputKeyRef,
  currentSavingValueRef,
  awaitingExternalSyncRef,
  pendingSavedValueRef,
  queueSave,
  delayMs = 1000,
  isEquivalent = defaultIsEquivalent,
  shouldSchedule,
}: UseDebouncedSaveTriggerOptions<TValueKey>) => {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingSave = useCallback(() => {
    if (!saveOnChange || !isDirtyRef.current) {
      return;
    }

    const inputValue = inputKeyRef.current;

    if (currentSavingValueRef.current !== null && isEquivalent(currentSavingValueRef.current, inputValue)) {
      return;
    }

    if (
      awaitingExternalSyncRef.current &&
      pendingSavedValueRef.current !== null &&
      isEquivalent(pendingSavedValueRef.current, inputValue)
    ) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    queueSave(inputValue);
  }, [
    awaitingExternalSyncRef,
    currentSavingValueRef,
    inputKeyRef,
    isDirtyRef,
    isEquivalent,
    pendingSavedValueRef,
    queueSave,
    saveOnChange,
  ]);

  const scheduleSave = useCallback(
    (nextValue: TValueKey) => {
      if (!saveOnChange) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      if (shouldSchedule && !shouldSchedule(nextValue)) {
        return;
      }

      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        queueSave(nextValue);
      }, delayMs);
    },
    [delayMs, queueSave, saveOnChange, shouldSchedule]
  );

  useEffect(() => {
    if (!saveOnChange) {
      return;
    }

    const onPageHide = () => {
      flushPendingSave();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingSave();
      }
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [flushPendingSave, saveOnChange]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return { flushPendingSave, scheduleSave };
};

export default useDebouncedSaveTrigger;
