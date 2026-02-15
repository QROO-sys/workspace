import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Should match JWT secret from backend (safe for reading only; never sign on frontend)
const JWT_SECRET = process.env.JWT_SECRET!; // Store in .env

export async function GET(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  try {
    // decode and verify JWT (DO NOT sign JWTs in frontend)
    const payload = jwt.verify(token, JWT_SECRET);
    return NextResponse.json({ user: payload });
  } catch (e) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}