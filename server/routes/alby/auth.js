import axios from "axios";
import jwt from "jsonwebtoken";
import FormData from "form-data";
import crypto from "crypto";
import dotenv from "dotenv";

if (!process.env.ALBY_ID) {
  dotenv.config();
}

const ALBY_ID =
  process.env.NODE_ENV === "development"
    ? process.env.ALBY_ID_5173
    : process.env.ALBY_ID;

const ALBY_SECRET =
  process.env.NODE_ENV === "development"
    ? process.env.ALBY_SECRET_5173
    : process.env.ALBY_SECRET;

const auth = async (req, res, next) => {
  res.cookie("awt", "", {
    maxAge: 0,
    httpOnly: process.env.NODE_ENV !== "development",
    path: "/",
    sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
    secure: process.env.NODE_ENV !== "development",
  });
  try {
    const code = req.query.code;
    const redirect_uri = req.query.redirect_uri;

    if (!code) {
      return res.json([]);
    }

    const formData = new FormData();
    formData.append("code", code);
    formData.append("redirect_uri", redirect_uri);
    formData.append("grant_type", "authorization_code");

    console.log(code);
    console.log(redirect_uri);
    console.log(ALBY_ID);
    console.log(ALBY_SECRET);

    const resolve = await axios({
      method: "POST",
      url: "https://api.getalby.com/oauth/token",
      auth: {
        username: ALBY_ID,
        password: ALBY_SECRET,
      },
      data: formData,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
      },
    }).catch((error) => {
      console.log("alby auth error: ", error.response?.data || error.message);
      throw error;
    });

    if (!resolve) {
      return res.status(401).json({ message: "Authorization failed" });
    }

    console.log(resolve.data);

    const newToken = jwt.sign(resolve.data, process.env.ALBY_JWT, {
      expiresIn: "10d",
    });

    const [account, balance] = await Promise.all([
      axios({
        url: "https://api.getalby.com/user/value4value",
        headers: { Authorization: `Bearer ${resolve.data.access_token}` },
      }),
      axios({
        url: "https://api.getalby.com/balance",
        headers: { Authorization: `Bearer ${resolve.data.access_token}` },
      }),
    ]).catch((error) => {
      console.log(
        "alby data fetch error: ",
        error.response?.data || error.message
      );
      throw error;
    });

    if (!account || !balance) {
      return res.status(400).json({ message: "Failed to fetch user data" });
    }

    const tempCode = crypto.randomBytes(16).toString("hex");
    const user = { ...account.data, ...balance.data, tempCode };

    req.tempTokens[tempCode] = newToken;
    setTimeout(() => {
      delete req.tempTokens[tempCode];
    }, 60000);

    res.cookie("awt", newToken, {
      maxAge: 10 * 24 * 60 * 60 * 1000,
      httpOnly: process.env.NODE_ENV !== "development",
      path: "/",
      sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
      secure: process.env.NODE_ENV !== "development",
    });

    res.status(200).json(user);
  } catch (err) {
    console.log("albyauth error: ", err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

export default auth;
