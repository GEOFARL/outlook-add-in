import { useEffect, useState } from "react";

export function useEmailBody(pollIntervalMs = 2000) {
  const [body, setBody] = useState("");

  useEffect(() => {
    const item = Office.context.mailbox.item;

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
  }, [pollIntervalMs]);

  return body;
}
