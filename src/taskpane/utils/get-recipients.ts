type Recips = { to: string[]; cc: string[]; bcc: string[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const normOne = (r: any): string | null => {
  if (!r) return null;
  if (typeof r === "string") return r.trim() || null;

  const flat =
    r.emailAddress || r.address || r.smtpAddress || r.userId || r.displayName || r.name || r.text;

  const nested =
    r.EmailAddress?.Address ||
    r.EmailAddress?.EmailAddress ||
    r.emailAddress?.address ||
    r.emailAddress?.emailAddress;

  const anyAt = Object.values(r).find((v) => typeof v === "string" && v.includes("@")) as
    | string
    | undefined;

  const pick = (flat || nested || anyAt || "").toString().trim();
  return pick || null;
};

const extract = (arr: any[]): string[] =>
  (Array.isArray(arr) ? arr : []).map(normOne).filter(Boolean) as string[];

const readComposeField = (field: any): Promise<string[]> =>
  new Promise((resolve) => {
    if (!field?.getAsync) return resolve([]);
    field.getAsync((res: any) =>
      resolve(res.status === Office.AsyncResultStatus.Succeeded ? extract(res.value) : [])
    );
  });

let cache: Recips = { to: [], cc: [], bcc: [] };
let watcherOn = false;

export const startRecipientsWatcher = () => {
  if (watcherOn) return;
  watcherOn = true;
  try {
    Office.context.mailbox.item.addHandlerAsync(Office.EventType.RecipientsChanged, async () => {
      const it: any = Office.context.mailbox.item;
      const [to, cc, bcc] = await Promise.all([
        readComposeField(it.to),
        readComposeField(it.cc),
        readComposeField(it.bcc),
      ]);
      cache = { to, cc, bcc };
      console.log("[RecipientsChanged cache]", cache);
    });
  } catch {}
};

const getViaEws = (itemId: string): Promise<Recips> =>
  new Promise((resolve) => {
    const ewsXml = `
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <m:GetItem>
      <m:ItemShape>
        <t:BaseShape>IdOnly</t:BaseShape>
        <t:AdditionalProperties>
          <t:FieldURI FieldURI="message:ToRecipients"/>
          <t:FieldURI FieldURI="message:CcRecipients"/>
          <t:FieldURI FieldURI="message:BccRecipients"/>
        </t:AdditionalProperties>
      </m:ItemShape>
      <m:ItemIds><t:ItemId Id="${itemId}"/></m:ItemIds>
    </m:GetItem>
  </soap:Body>
</soap:Envelope>`;
    Office.context.mailbox.makeEwsRequestAsync(ewsXml, (res) => {
      try {
        if (res.status !== Office.AsyncResultStatus.Succeeded || !res.value) return resolve(cache);
        const xml = new DOMParser().parseFromString(res.value, "text/xml");
        const pick = (tag: string) =>
          Array.from(
            xml.getElementsByTagNameNS(
              "http://schemas.microsoft.com/exchange/services/2006/types",
              tag
            )
          )
            .map((n) =>
              n
                .getElementsByTagNameNS(
                  "http://schemas.microsoft.com/exchange/services/2006/types",
                  "EmailAddress"
                )[0]
                ?.textContent?.trim()
            )
            .filter(Boolean) as string[];
        resolve({ to: pick("ToRecipients"), cc: pick("CcRecipients"), bcc: pick("BccRecipients") });
      } catch {
        resolve(cache);
      }
    });
  });

async function getViaGraph(itemId: string): Promise<Recips> {
  const anyWin = window as any;
  const getGraphToken = anyWin.getGraphToken?.bind(anyWin) as
    | undefined
    | (() => Promise<string | null>);
  if (!getGraphToken) return cache;

  const token = await getGraphToken();
  if (!token) return cache;

  const url = `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(itemId)}?$select=toRecipients,ccRecipients,bccRecipients`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return cache;
  const j = await r.json();
  const normArr = (a?: any[]) =>
    (a ?? []).map((x) => x?.emailAddress?.address || "").filter(Boolean);
  return {
    to: normArr(j.toRecipients),
    cc: normArr(j.ccRecipients),
    bcc: normArr(j.bccRecipients),
  };
}

export const getRecipientsReliable = async (): Promise<Recips> => {
  const item: any = Office.context.mailbox.item;
  await new Promise<void>((resolve) => item.saveAsync(() => resolve()));
  const id: string | undefined = item.itemId;
  if (item?.to?.getAsync) {
    for (let i = 0; i < 8; i++) {
      const [to, cc, bcc] = await Promise.all([
        readComposeField(item.to),
        readComposeField(item.cc),
        readComposeField(item.bcc),
      ]);
      if (to.length || cc.length || bcc.length) {
        cache = { to, cc, bcc };
        return cache;
      }
      await sleep(140);
    }
  }
  if (id) {
    try {
      const e = await getViaEws(id);
      if (e.to.length || e.cc.length || e.bcc.length) return (cache = e);
    } catch {}
    try {
      const g = await getViaGraph(id);
      if (g.to.length || g.cc.length || g.bcc.length) return (cache = g);
    } catch {}
  }

  return cache;
};
