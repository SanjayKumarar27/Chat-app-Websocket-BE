import {WebSocket, WebSocketServer} from "ws"

const wss=new WebSocketServer({port:8081})

let RoomArray=new Map<string,WebSocket[]>()

let user_count=0;
wss.on("connection",(socket)=>{
  
    user_count=user_count+1;
    console.log("user conneted "+user_count)

    socket.on("message",(message)=>{
        // console.log(message.toString());
        //@ts-ignore
       const parsedObject=JSON.parse(message.toString());
    //    console.log(parsedObject);
       if(parsedObject.type==='join'){
       
        if(!RoomArray.has(parsedObject.payload.roomId)){
            RoomArray.set(parsedObject.payload.roomId,[]);
        }
        RoomArray.get(parsedObject.payload.roomId)?.push(socket);
       }

       if(parsedObject.type==='chat'){
        const id=parsedObject.payload.roomId;
        const arr=RoomArray.get(id);
        if(!arr){
            return;
        }    
        
            for(let i=0;i<arr.length;i++){
                arr[i]?.send(parsedObject.payload.message)
            }
        
       }
     
    });
})
