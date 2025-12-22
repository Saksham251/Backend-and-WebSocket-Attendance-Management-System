import { Attendance, Class } from "../../config.js";
import {activeSession,clearSession} from "./sessions.js"

function sendError(ws,message){
    ws.send(JSON.stringify({
        "event": "ERROR",
        "data": {
            message
        }
    }));
}


function broadcast(wss,payload){
    wss.clients.forEach((client)=>{
        if(client.readyState===client.OPEN){
            client.send(JSON.stringify(payload));
        }
    });
}

export const handleMessage = async (ws,message,wss)=>{
    const {event,data} = message;

    switch (event){
        /* ========== EVENT 1: ATTENDANCE_MARKED ========== */
        case "ATTENDANCE_MARKED":{
            if(ws.user.role!=="teacher"){
                return sendError(ws, "Forbidden, teacher event only");
            }
            if(!activeSession){
                return sendError(ws, "No active attendance session");
            }
            const {studentId,status} = data;
            activeSession.attendance[studentId] = status;
            broadcast(wss,{
                "event": "ATTENDANCE_MARKED",
                "data": {
                    studentId,
                    status
                }
            })
            break;
        }
        /* ========== EVENT 2: TODAY_SUMMARY ========== */
        case "TODAY_SUMMARY":{
            if (ws.user.role !== "teacher") {
                return sendError(ws, "Forbidden, teacher event only");
            }
            if (!activeSession) {
                return sendError(ws, "No active attendance session");
            }
            const values = Object.values(activeSession.attendance);
            const total = values.length;
            const present = values.filter((v)=>v==="present").length;
            const absent = total-present;
            broadcast(wss,{
                "event": "TODAY_SUMMARY",
                "data": {
                    present,
                    absent,
                    total
                }   
            });
            break;
        }
        /* ========== EVENT 3: MY_ATTENDANCE ========== */
        case "MY_ATTENDANCE":{
            if (ws.user.role !== "student") {
                return sendError(ws, "Forbidden, student event only");
            }
            if (!activeSession) {
                return sendError(ws, "No active attendance session");
            }
            const status = activeSession.attendance[ws.user.userId] || "not yet updated";
            ws.send(JSON.stringify({
                "event": "MY_ATTENDANCE",
                "data": {
                    status
                }
            }))
            break;
        }
        /* ========== EVENT 4: DONE ========== */
        case "DONE":{
            if (ws.user.role !== "teacher") {
                return sendError(ws, "Forbidden, teacher event only");
            }
            if (!activeSession) {
                return sendError(ws, "No active attendance session");
            }

            // Get all students of class (single DB call)
            const cls = await Class.findById(activeSession.classId)
            .populate("studentIds","_id");

            const students = cls.studentIds;
            const attendanceMap = activeSession.attendance;

            // Mark absent students in memory
            for (const student of students) {
                const sid = student._id.toString();

                if (!attendanceMap[sid]) {
                attendanceMap[sid] = "absent";
                }
            }
            
            // attendance docs
            const attendanceDocs = students.map(student=>({
                classId: activeSession.classId,
                studentId: student._id,
                status:attendanceMap[student._id.toString()] 
            }));

            // Persist to MongoDB
            await Attendance.insertMany(attendanceDocs);

            const values = Object.values(attendanceMap);
            const present = values.filter(v => v === "present").length;
            const total = values.length;
            const absent = total - present;

            clearSession();
        
            broadcast(wss,{
                "event": "DONE",
                "data": {
                    "message": "Attendance persisted",
                    present,
                    absent,
                    total
                }
            })
            break;
        } 
        /* ========== UNKNOWN EVENT ========== */
        default :
            sendError(ws, "Unknown event");
    }
};