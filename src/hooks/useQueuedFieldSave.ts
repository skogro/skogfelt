import { useCallback, useEffect, useRef, useState } from "react";

type BeforeSaveResult = {
  skip?: boolean;
  errorMessage?: string;
  keepDirty?: boolean;
};

type EnqueueSaveArgs<TCompareValue> = {
  valueKey: TCompareValue;
  runSave: () => Promise<void>;
  showSavingStatus?: boolean;
  beforeSave?: () => BeforeSaveResult;
};

type UseQueuedFieldSaveOptions<TCompareValue> = {
  initialInputKey: TCompareValue;
  initialExternalKey: TCompareValue;
  isEqual?: (left: TCompareValue, right: TCompareValue) => boolean;
};

const defaultIsEqual = <TCompareValue,>(left: TCompareValue, right: TCompareValue): boolean => left === right;

const useQueuedFieldSave = <TCompareValue,>({
  initialInputKey,
  initialExternalKey,
  isEqual = defaultIsEqual,
}: UseQueuedFieldSaveOptions<TCompareValue>) => {
  const [changeExecuting, setChangeExecuting] = useState<boolean | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const inputKeyRef = useRef<TCompareValue>(initialInputKey);
  const externalKeyRef = useRef<TCompareValue>(initialExternalKey);
  const isDirtyRef = useRef<boolean>(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const queuedSaveSeqRef = useRef<number>(0);
  const currentSavingValueRef = useRef<TCompareValue | null>(null);
  const mountedRef = useRef<boolean>(true);
  const awaitingExternalSyncRef = useRef<boolean>(false);
  const pendingSavedValueRef = useRef<TCompareValue | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const updateInputKey = useCallback((nextInputKey: TCompareValue) => {
    inputKeyRef.current = nextInputKey;
  }, []);

  const resetSyncExpectation = useCallback(() => {
    awaitingExternalSyncRef.current = false;
    pendingSavedValueRef.current = null;
  }, []);

  const markUserInput = useCallback(
    (nextInputKey: TCompareValue) => {
      resetSyncExpectation();
      inputKeyRef.current = nextInputKey;
      setIsDirty(true);
      setChangeError(null);
      setChangeExecuting(null);
    },
    [resetSyncExpectation]
  );

  const syncExternalKey = useCallback(
    (externalKey: TCompareValue, syncInputWhenClean: () => void) => {
      externalKeyRef.current = externalKey;

      if (awaitingExternalSyncRef.current) {
        const pendingValue = pendingSavedValueRef.current;
        if (pendingValue !== null && isEqual(externalKey, pendingValue)) {
          awaitingExternalSyncRef.current = false;
          pendingSavedValueRef.current = null;
          setIsDirty(false);
        }
        return;
      }

      if (!isDirtyRef.current) {
        syncInputWhenClean();
      }
    },
    [isEqual]
  );

  const enqueueSave = useCallback(
    ({ valueKey, runSave, showSavingStatus = true, beforeSave }: EnqueueSaveArgs<TCompareValue>) => {
      const saveSeq = ++queuedSaveSeqRef.current;

      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (saveSeq < queuedSaveSeqRef.current || !mountedRef.current) {
          return;
        }

        const preCheck = beforeSave?.();
        if (preCheck?.skip) {
          if (preCheck.errorMessage) {
            setChangeExecuting(false);
            setChangeError(preCheck.errorMessage);
            setIsDirty(preCheck.keepDirty ?? true);
          }
          return;
        }

        currentSavingValueRef.current = valueKey;
        setChangeExecuting(showSavingStatus ? true : null);
        setChangeError(null);

        try {
          await runSave();

          if (!mountedRef.current) {
            return;
          }

          setChangeExecuting(showSavingStatus ? false : null);
          setChangeError(null);
          if (isEqual(inputKeyRef.current, valueKey) && saveSeq === queuedSaveSeqRef.current) {
            if (isEqual(externalKeyRef.current, valueKey)) {
              awaitingExternalSyncRef.current = false;
              pendingSavedValueRef.current = null;
              setIsDirty(false);
            } else {
              awaitingExternalSyncRef.current = true;
              pendingSavedValueRef.current = valueKey;
            }
          }
        } catch (error) {
          if (!mountedRef.current) {
            return;
          }

          const message = error instanceof Error ? error.message : "Failed to save";
          setChangeExecuting(false);
          setChangeError(message);
          awaitingExternalSyncRef.current = false;
          pendingSavedValueRef.current = null;
          setIsDirty(true);
        } finally {
          if (currentSavingValueRef.current !== null && isEqual(currentSavingValueRef.current, valueKey)) {
            currentSavingValueRef.current = null;
          }
        }
      });
    },
    [isEqual]
  );

  return {
    changeExecuting,
    changeError,
    isDirty,
    isDirtyRef,
    inputKeyRef,
    currentSavingValueRef,
    awaitingExternalSyncRef,
    pendingSavedValueRef,
    updateInputKey,
    markUserInput,
    syncExternalKey,
    enqueueSave,
  };
};

export default useQueuedFieldSave;
