// WS token validation
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET

// ws://localhost:3000/ws?token=<JWT_TOKEN>

export function authenticateWS(ws,req){
    const base = `http://${req.headers.host}`;
    const url = new URL(req.url,base);
    const token = url.searchParams.get("token");

    if(!token){
        throw new Error("Token missing");
    }

    let decoded;
    try{
        decoded = jwt.verify(token,JWT_SECRET);
    } catch {
        throw new Error("Unauthorized or invalid token");
    }
    // attach user to socket
    ws.user={
        userId:decoded.userId,
        role:decoded.role
    }
}