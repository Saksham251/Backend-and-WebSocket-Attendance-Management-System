import mongoose, { Schema } from "mongoose";
import dotenv from "dotenv";
dotenv.config();
mongoose.connect(process.env.DATABASE_URL)
.then(()=>{console.log("Connected to the MongoDB")})
.catch(error=>{console.log(error)})

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        match:[/^[^\s@]+@+[^\s@]+\.[^\s@]+$/,"Invalid email format"]
    },
    password:{
        type:String,
        required:true,
        minLength:[6,"Password must be of the min length 6"]
    },
    role:{
        type: String,
        enum: ["teacher","student"],
        required:true
    }
});

const classSchema = new mongoose.Schema({
    className:{
        type:String,
        required:true
    },
    teacherId:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    studentIds:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }]
});

const attendanceSchema = new mongoose.Schema({
    classId: {
        type:Schema.Types.ObjectId,
        ref:"Class"
    },
    studentId: {
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    status: {
        type:String,
        enum:["present" | "absent"]
    }
});

export const User = mongoose.model("User",userSchema);
export const Class = mongoose.model("Class",classSchema);
export const Attendance = mongoose.model("Attendance",attendanceSchema);