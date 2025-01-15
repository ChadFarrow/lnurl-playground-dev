function encodePlainSecret(sk) {
  return Array.from(sk)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default encodePlainSecret;
