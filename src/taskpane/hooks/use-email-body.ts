import { useEffect, useState } from "react";

export function useEmailBody(pollIntervalMs = 2000): string {
  const [body, setBody] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Office.onReady().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return undefined;

    const item = Office.context?.mailbox?.item;
    if (!item) {
      console.warn("Office.context.mailbox.item is not available.");
      return undefined;
    }

    const fetchContent = () => {
      item.body.getAsync("text", (res) => {
        if (res.status === Office.AsyncResultStatus.Succeeded) {
          setBody((prev) => (prev !== res.value ? res.value : prev));
        }
      });
    };

    fetchContent();
    const intervalId = setInterval(fetchContent, pollIntervalMs);

    return () => clearInterval(intervalId);
  }, [ready, pollIntervalMs]);

  return body;
}
