import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { startRecipientsWatcher } from "./utils/get-recipients";
// import { getApiAccessToken } from "../auth/getToken";

const rootElement = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

Office.onReady(async () => {
  try {
    // await getApiAccessToken();
    try {
      startRecipientsWatcher();
    } catch {}
  } catch {}
  root?.render(<App />);
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(<NextApp />);
  });
}
