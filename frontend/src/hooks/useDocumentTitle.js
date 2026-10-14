import { useEffect } from "react";

/** Update the browser tab title and restore it when the component unmounts. */
export default function useDocumentTitle(title, { restoreOnUnmount = true } = {}) {
  useEffect(() => {
    if (typeof document === "undefined" || !title) return undefined;
    const previousTitle = document.title;
    document.title = String(title);
    return () => {
      if (restoreOnUnmount) document.title = previousTitle;
    };
  }, [title, restoreOnUnmount]);
}
