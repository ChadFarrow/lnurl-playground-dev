function skToHex(sk) {
  return Array.from(sk)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default skToHex;
