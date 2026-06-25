import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AsciiBox } from "@/components/ui/AsciiBox";
import { MatrixButton } from "@/components/ui/MatrixButton";

interface DialogOptions {
  title?: string;
  type: "alert" | "confirm" | "prompt";
  message: string;
  defaultValue?: string;
}

interface DialogState extends DialogOptions {
  id: string;
  resolve: (value: any) => void;
}

interface MatrixDialogContextType {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, title?: string, defaultValue?: string) => Promise<string | null>;
}

const MatrixDialogContext = createContext<MatrixDialogContextType | undefined>(undefined);

export function useMatrixDialog() {
  const context = useContext(MatrixDialogContext);
  if (!context) {
    throw new Error("useMatrixDialog must be used within a MatrixDialogProvider");
  }
  return context;
}

export function MatrixDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState("");

  const showAlert = useCallback((message: string, title?: string) => {
    return new Promise<void>((resolve) => {
      setDialog({
        id: Date.now().toString(),
        type: "alert",
        message,
        title: title || "SYSTEM ALERT",
        resolve,
      });
    });
  }, []);

  const showConfirm = useCallback((message: string, title?: string) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        id: Date.now().toString(),
        type: "confirm",
        message,
        title: title || "CONFIRMATION",
        resolve,
      });
    });
  }, []);

  const showPrompt = useCallback((message: string, title?: string, defaultValue?: string) => {
    return new Promise<string | null>((resolve) => {
      setInputValue(defaultValue || "");
      setDialog({
        id: Date.now().toString(),
        type: "prompt",
        message,
        title: title || "INPUT REQUIRED",
        defaultValue,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (!dialog) return;
    if (dialog.type === "alert") dialog.resolve(undefined);
    if (dialog.type === "confirm") dialog.resolve(false);
    if (dialog.type === "prompt") dialog.resolve(null);
    setDialog(null);
  }, [dialog]);

  const handleConfirm = useCallback(() => {
    if (!dialog) return;
    if (dialog.type === "alert") dialog.resolve(undefined);
    if (dialog.type === "confirm") dialog.resolve(true);
    if (dialog.type === "prompt") dialog.resolve(inputValue);
    setDialog(null);
  }, [dialog, inputValue]);

  return (
    <MatrixDialogContext.Provider value={{ alert: showAlert, confirm: showConfirm, prompt: showPrompt }}>
      {children}
      {dialog && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
            onClick={dialog.type !== "alert" ? handleClose : undefined}
          />
          <div className="fixed inset-x-4 top-[25%] z-[101] mx-auto max-w-md">
            <AsciiBox title={dialog.title?.toUpperCase()}>
              <div className="space-y-4">
                <p className="font-mono text-sm text-matrix-primary">{dialog.message}</p>
                
                {dialog.type === "prompt" && (
                  <div>
                    <input
                      type="text"
                      className="w-full bg-matrix-bg border border-matrix-primary/30 text-matrix-primary font-mono text-sm px-3 py-2 outline-none focus:border-matrix-primary"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirm();
                        if (e.key === "Escape") handleClose();
                      }}
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  {dialog.type !== "alert" && (
                    <MatrixButton onClick={handleClose}>
                      [CANCEL]
                    </MatrixButton>
                  )}
                  <MatrixButton onClick={handleConfirm} primary>
                    [OK]
                  </MatrixButton>
                </div>
              </div>
            </AsciiBox>
          </div>
        </>
      )}
    </MatrixDialogContext.Provider>
  );
}
