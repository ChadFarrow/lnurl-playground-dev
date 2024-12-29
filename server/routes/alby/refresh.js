import axios from "axios";
import jwt from "jsonwebtoken";
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

const refresh = async (req, res) => {
  res.cookie("awt", "", {
    maxAge: 0,
    httpOnly: process.env.NODE_ENV !== "development",
    path: "/",
    sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
    secure: process.env.NODE_ENV !== "development",
  });
  try {
    const cookies = req.cookies;
    let alby;

    try {
      alby = cookies.awt
        ? jwt.verify(cookies.awt, process.env.ALBY_JWT)
        : undefined;
    } catch (error) {
      console.error("JWT verify error: ", error.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    if (!alby || !alby.refresh_token) {
      return res.status(403).json({ message: "Refresh token missing" });
    }

    // Refresh token request
    const resolve = await axios.post(
      "https://api.getalby.com/oauth/token",
      {
        refresh_token: alby.refresh_token,
        grant_type: "refresh_token",
      },
      {
        auth: {
          username: ALBY_ID,
          password: ALBY_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const newToken = jwt.sign(resolve.data, process.env.ALBY_JWT, {
      expiresIn: "10d",
    });

    const accessToken = resolve.data.access_token;

    const [account, balance] = await Promise.all([
      axios.get("https://api.getalby.com/user/value4value", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios.get("https://api.getalby.com/balance", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    const user = { ...account.data, ...balance.data };

    res.cookie("awt", newToken, {
      maxAge: 10 * 24 * 60 * 60 * 1000,
      httpOnly: process.env.NODE_ENV !== "development",
      path: "/",
      sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
      secure: process.env.NODE_ENV !== "development",
    });

    res.status(200).json(user);
  } catch (err) {
    console.error("Alby refresh error: ", err.response?.data || err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

export default refresh;
