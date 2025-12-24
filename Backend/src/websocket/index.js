import {WebSocketServer} from "ws";
import {authenticateWS} from "./auth.js";
import { handleMessage } from "./handlers.js";

let wss;

export function setupWebSocket(server){
    wss = new WebSocketServer({noServer:true});

    server.on("upgrade",(req,socket,head)=>{
        if(!req.url.startsWith("/ws")){
            socket.destroy();
            return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
        });
    });

    wss.on("connection",(ws,req)=>{
        try{
            authenticateWS(ws, req);
        }catch(error){
            ws.send(JSON.stringify({type:"ERROR",message:error.message}));
            ws.close();
            return;
        }

        ws.on("message",(data)=>{
            let message;
            try{
                message = JSON.parse(data.toString());
            }
            catch(error){
                ws.send(JSON.stringify({type:"ERROR",message:error.message}));
                return;
            }
            handleMessage(ws, message, wss);
        });
        ws.on("close",()=>{
            console.log("WS disconnected:", ws.user?.userId);
        });
    });
}