import { dev } from "$app/environment";

export const remoteServer = dev
  ? "http://localhost:3000"
  : "https://thesplitbox.com";
export const albyClientId = dev ? "TGu2U0ptCn" : "ll";
export const albyRedirectUrl =
  (dev ? "http://localhost:5173" : "https://thesplitbox.com") + "/settings";

export const userState = $state({
  name: "name",
  /* ... */
});
