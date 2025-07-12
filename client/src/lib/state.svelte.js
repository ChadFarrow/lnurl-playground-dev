import { dev } from "$app/environment";

export const remoteServer = dev
  ? "http://Chads-Mac-mini.local:3000"
  : "https://thesplitbox.com";
export const albyClientId = "hzopQVxGtD";
export const albyRedirectUrl = dev
  ? "http://Chads-Mac-mini.local:4000"
  : "https://thesplitbox.com";

export const user = $state({
  address: "",
});
