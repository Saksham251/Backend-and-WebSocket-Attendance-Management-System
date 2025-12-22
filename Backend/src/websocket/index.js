import {WebSockerServer} from "ws";
import {authenticateWS} from "./auth";
import { handleMessage } from "./handlers";

let wss;

export function setupWebSocket(server){
    wss = new WebSockerServer({noServer:true});

    server.on("upgrade",(req,socket,head)=>{
        if(!req.url.startsWith("/ws")){
            socket.destroy();
            return;
        }
    });

    wss.on("connection",(ws,req)=>{
        try{
            authenticateWS(ws, req);
        }catch(error){
            ws.send(JSON.stringify({type:"Error",message:error.message}));
            ws.close();
            return;
        }

        ws.on("message",(data)=>{
            let message;
            try{
                message = JSON.parse(data.toString());
            }
            catch(error){
                ws.send(JSON.stringify({type:"Error",message:error.message}));
                return;
            }
            handleMessage(ws, message, wss);
        });
        ws.on("close",()=>{
            console.log("WS disconnected:", ws.user?.userId);
        });
    });
}