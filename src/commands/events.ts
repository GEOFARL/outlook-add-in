import { seedTokenFromOfficeStorage, getCachedToken } from "../auth/dialogAuth";
import { tenantIdFromJwt } from "../auth/claims";
import { MLRedactApiClient } from "../taskpane/api/mlRedactApiClient";
import { getRecipients } from "../taskpane/utils/get-recipients";

Office.onReady(async () => {
  await seedTokenFromOfficeStorage();
  Office.actions.associate("onMessageSend", onMessageSend);
});

async function onMessageSend(event: Office.AddinCommands.Event) {
  try {
    const token = getCachedToken();
    if (!token) {
      return smartAlert(event, "Please open ML-Redact and sign in before sending.");
    }

    const [subject, bodyHtml, recipients] = await Promise.all([
      getSubject(),
      getBodyHtml(),
      getRecipients(),
    ]);

    const api = new MLRedactApiClient("25f4389cf52441e0b16c6adc466c0c5b", async () => token);
    const resp = await api.processMessage({
      messageId: `guid-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
      tenantId: tenantIdFromJwt(token) || "T3",
      // tenantId: "T3",
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

    if (resp.ReqConfirm) {
      return smartAlert(event, "Review is recommended by your organization.");
    }

    event.completed({ allowEvent: true });
  } catch {
    smartAlert(event, "ML-Redact temporarily unavailable. Review before sending?");
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
const setBodyHtml = (html: string) =>
  new Promise<void>((r) =>
    Office.context.mailbox.item.body.setAsync(html, { coercionType: "html" }, () => r())
  );

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
