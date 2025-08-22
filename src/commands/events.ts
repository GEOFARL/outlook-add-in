import {
  getCachedTokenAsync,
  seedTokenFromOfficeStorage,
  setCachedToken,
} from "../auth/dialogAuth";
import { tenantIdFromJwt } from "../auth/claims";
import { MLRedactApiClient } from "../taskpane/api/mlRedactApiClient";
import { normalizeAxiosError } from "../shared/errors";
import { getRecipients } from "../taskpane/utils/get-recipients";
import { msalInstance, API_SCOPE } from "../auth/msal";

const BYPASS_KEY = "mlr_bypass_once";
const FPR_KEY = "mlr_fpr_v1";

Office.onReady(async () => {
  await seedTokenFromOfficeStorage();
  Office.actions.associate("onMessageSend", onMessageSend);

  try {
    Office.context.mailbox.item.addHandlerAsync(Office.EventType.RecipientsChanged, clearBypass);
  } catch {}
  try {
    Office.context.mailbox.item.addHandlerAsync(
      (Office.EventType as any).SubjectChanged,
      clearBypass
    );
  } catch {}
});

function decodeJwt<T = any>(jwt: string): T | null {
  try {
    const [, payload] = jwt.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function isJwtExpired(jwt: string, skewSec = 90): boolean {
  const p: any = decodeJwt(jwt);
  if (!p?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return p.exp <= now + skewSec;
}

async function getValidAccessToken(): Promise<string | null> {
  let token = await getCachedTokenAsync();
  if (token && !isJwtExpired(token)) return token;

  try {
    const acct = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    if (!acct) return null;
    const res = await msalInstance.acquireTokenSilent({
      scopes: [API_SCOPE],
      account: acct,
      forceRefresh: true,
    });
    token = res.accessToken;
    await setCachedToken(token);
    return token;
  } catch {
    return null;
  }
}

async function tokenProviderStrict(): Promise<string> {
  const t = await getValidAccessToken();
  if (!t) throw new Error("auth:no-valid-token");
  return t;
}

async function onMessageSend(event: Office.AddinCommands.Event) {
  const alert = (msg: string) => smartAlert(event, msg);

  try {
    const cp = await loadCustomProps();
    const hasBypass = cp.get(BYPASS_KEY) === "1";
    const savedFpr = cp.get(FPR_KEY) as string | null;

    if (hasBypass && savedFpr) {
      const [subject, bodyText, recipients] = await Promise.all([
        getSubject(),
        getBodyText(),
        getRecipients(),
      ]);
      const currentFpr = fingerprint(subject, bodyText, recipients);
      if (currentFpr === savedFpr) {
        try {
          cp.set(BYPASS_KEY, "");
          cp.set(FPR_KEY, "");
          cp.saveAsync(() => {});
        } catch {}
        event.completed({ allowEvent: true });
        return;
      }
    }

    const [subject, recipients] = await Promise.all([getSubject(), getRecipients()]);
    const bodyHtml = await getBodyHtml();

    const token = await getValidAccessToken();
    if (!token) return alert("Please open ML-Redact and sign in before sending.");

    const api = new MLRedactApiClient("25f4389cf52441e0b16c6adc466c0c5b", tokenProviderStrict);

    const resp = await api.processMessage({
      messageId: crypto?.randomUUID?.() ?? `guid-${Date.now()}`,
      tenantId: tenantIdFromJwt(token) || "T3",
      utcTimestamp: new Date().toISOString(),
      triggerType: "onSend",
      subject,
      body: bodyHtml,
      actionsRequested: [],
      redactionMethod: "",
      userContext: "",
      messageRecipients: recipients,
      messageSender: Office.context.mailbox.userProfile.emailAddress ?? "",
    });

    const ops: Promise<any>[] = [];
    if (resp.UpdatedSubject && resp.UpdatedSubject !== subject)
      ops.push(setSubject(resp.UpdatedSubject));
    if (resp.UpdatedBody && resp.UpdatedBody !== bodyHtml) ops.push(setBodyHtml(resp.UpdatedBody));
    if (ops.length) await Promise.all(ops);

    const [finalSubject, finalBodyText] = await Promise.all([getSubject(), getBodyText()]);
    const finalFpr = fingerprint(finalSubject, finalBodyText, recipients);

    if (resp.ReqConfirm) {
      await saveBypassOnce(cp, finalFpr);
      return alert("Review is recommended by your organization. Click Send again to proceed.");
    }

    event.completed({ allowEvent: true });
  } catch (e) {
    const n = normalizeAxiosError(e);
    return alert(n.userMessage);
  }
}

const getSubject = () =>
  new Promise<string>((r) =>
    Office.context.mailbox.item.subject.getAsync((x) => r(x?.value ?? ""))
  );

const setSubject = (v: string) =>
  new Promise<void>((r) => Office.context.mailbox.item.subject.setAsync(v, () => r()));

const getBodyHtml = () =>
  new Promise<string>((r) =>
    Office.context.mailbox.item.body.getAsync("html", (x) => r(String(x?.value ?? "")))
  );

const getBodyText = () =>
  new Promise<string>((r) =>
    Office.context.mailbox.item.body.getAsync("text", (x) =>
      r(
        String(x?.value ?? "")
          .replace(/\s+/g, " ")
          .trim()
      )
    )
  );

const setBodyHtml = (html: string) =>
  new Promise<void>((r) =>
    Office.context.mailbox.item.body.setAsync(html, { coercionType: "html" }, () => r())
  );

function loadCustomProps(): Promise<Office.CustomProperties> {
  return new Promise((resolve, reject) => {
    Office.context.mailbox.item.loadCustomPropertiesAsync((res) => {
      if (res.status === Office.AsyncResultStatus.Succeeded && res.value) resolve(res.value);
      else reject(new Error("Failed to load custom properties"));
    });
  });
}

function saveBypassOnce(cp: Office.CustomProperties, fpr: string): Promise<void> {
  return new Promise((resolve) => {
    cp.set(BYPASS_KEY, "1");
    cp.set(FPR_KEY, fpr);
    cp.saveAsync(() => resolve());
  });
}

function clearBypass() {
  try {
    Office.context.mailbox.item.loadCustomPropertiesAsync((res) => {
      if (res.status !== Office.AsyncResultStatus.Succeeded || !res.value) return;
      const cp = res.value;
      cp.set(BYPASS_KEY, "");
      cp.set(FPR_KEY, "");
      cp.saveAsync(() => {});
    });
  } catch {}
}

function fingerprint(
  subject: string,
  bodyText: string,
  recipients: { to?: any[]; cc?: any[]; bcc?: any[] }
): string {
  const normAddrs = (arr?: any[]) =>
    (arr ?? [])
      .map((x) => {
        const email =
          (x &&
            typeof x === "object" &&
            ("emailAddress" in x ? x.emailAddress : (x as any).address)) ||
          (typeof x === "string" ? x : "");
        return String(email).trim().toLowerCase();
      })
      .filter(Boolean)
      .sort()
      .join(",");
  const subj = subject.replace(/\s+/g, " ").trim().toLowerCase();
  const textSig = hash(`${bodyText.length}:${bodyText.slice(0, 4096)}`);
  return `${subj}||${normAddrs(recipients.to)}|${normAddrs(recipients.cc)}|${normAddrs(
    recipients.bcc
  )}||${textSig}`;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return String(h >>> 0);
}

function smartAlert(event: Office.AddinCommands.Event, message: string) {
  try {
    Office.context.mailbox.item?.notificationMessages?.replaceAsync("mlr-alert", {
      type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
      message,
      icon: "icon16",
      persistent: false,
    });
  } catch {}
  event.completed({ allowEvent: false });
}
