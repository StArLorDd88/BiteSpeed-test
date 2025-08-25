import { Router } from "express";
import { userIdentify } from "./user.js";


const router = Router();

router.post("/identify", async (req, res, next) => {
  try {
    const { email, phoneNumber } = req.body;

    const payload = {
      email: typeof email === "string" ? email.trim() : undefined,
      phoneNumber:
        typeof phoneNumber === "number" ? String(phoneNumber) :
        typeof phoneNumber === "string" ? phoneNumber.trim() : undefined
    };

    const result = await userIdentify(payload);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

export default router;