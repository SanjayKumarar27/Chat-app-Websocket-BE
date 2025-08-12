import { Socket } from "dgram";
import http from "http";
import { servicesVersion } from "typescript";
import { WebSocket, WebSocketServer } from "ws"

const PORT = Number(process.env.PORT || 8081)

const server = http.createServer();
const wss = new WebSocketServer({ noServer: true })

let RoomArray = new Map<string, WebSocket[]>()

let user_count = 0;

wss.on("connection", (socket) => {

    user_count = user_count + 1;
    console.log("user conneted " + user_count)
    socket.on("message", (message) => {
        try {

            const parsedObject = JSON.parse(message.toString());

            if (parsedObject.type === 'join') {
                const roomId = parsedObject.payload.roomId;
                if (!RoomArray.has(roomId)) {
                    RoomArray.set(roomId, []);
                }
                RoomArray.get(roomId)?.push(socket);
                console.log(`joined room ${roomId}`)
            }

            else if (parsedObject.type === 'chat') {
                const id = parsedObject.payload.roomId;
                const arr = RoomArray.get(id);
                if (!arr) {
                    return;
                }

                for (let i = 0; i < arr.length; i++) {
                    arr[i]?.send(parsedObject.payload.message)
                }

            }
        }catch (e) {
            console.log("invalid message:",e)
        
     }
    });

    socket.on("close",()=>{
        for(const[room,arr] of RoomArray.entries()){
            const filtered=arr.filter((s)=>s!==socket);
            if(filtered.length===0) RoomArray.delete(room);
            else RoomArray.set(room,filtered);
        }
    });

});


server.on("upgrade",(req,socket,head)=>{
    wss.handleUpgrade(req,socket as any,head,(ws)=>{
        wss.emit("connection",ws,req);
    });
});

server.listen(PORT,()=>{
    console.log(`listening on ${PORT}`)
});

process.on("SIGINT",()=>{
    console.log("shutting down");
    wss.clients.forEach((c)=>c.close());
    server.close(()=>process.exit(0));
})