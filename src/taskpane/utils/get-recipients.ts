export const getRecipients = async (): Promise<{
  to: string[];
  cc: string[];
  bcc: string[];
}> => {
  const item = Office.context.mailbox.item as any;

  if (typeof item.getToRecipientsAsync === "function") {
    const to = await new Promise<string[]>((resolve) => {
      item.getToRecipientsAsync((result: any) => {
        resolve(
          result.status === Office.AsyncResultStatus.Succeeded
            ? result.value.map((r: any) => r.emailAddress)
            : []
        );
      });
    });

    const cc = await new Promise<string[]>((resolve) => {
      item.getCcRecipientsAsync((result: any) => {
        resolve(
          result.status === Office.AsyncResultStatus.Succeeded
            ? result.value.map((r: any) => r.emailAddress)
            : []
        );
      });
    });

    const bcc = await new Promise<string[]>((resolve) => {
      item.getBccRecipientsAsync((result: any) => {
        resolve(
          result.status === Office.AsyncResultStatus.Succeeded
            ? result.value.map((r: any) => r.emailAddress)
            : []
        );
      });
    });

    return { to, cc, bcc };
  }

  return { to: [], cc: [], bcc: [] };
};
