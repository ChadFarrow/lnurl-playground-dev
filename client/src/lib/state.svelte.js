import { dev } from "$app/environment";

export const remoteServer = dev
  ? "http://localhost:3000"
  : "https://thesplitbox.com";
export const albyClientId = dev ? "hzopQVxGtD" : "3IsGwlTSvi";
export const albyRedirectUrl = dev
  ? "http://localhost:5173"
  : "https://thesplitbox.com";

export const user = $state({
  address: "",
});
