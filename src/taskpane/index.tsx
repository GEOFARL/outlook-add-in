import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { getApiAccessToken } from "../auth/getToken";

const rootElement = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

Office.onReady(async () => {
  try {
    await getApiAccessToken({ noUI: true }); // silent warm-up
  } catch {
    // ignore; user will see the dialog the first time they *manually* run the feature
  }
  root?.render(<App />);
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(<NextApp />);
  });
}
