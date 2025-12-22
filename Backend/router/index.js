import { Router } from "express";
import {z} from "zod";
import bcrypt from "bcrypt";
export const router =Router();
import {Class, User} from "../config.js";
import jwt from "jsonwebtoken";
import { authMiddleware, authStudentMiddleware, authTeacherMiddleware } from "../middleware/authMiddleware.js";
import { startSession, activeSession } from "../src/websocket/sessions.js"

router.post("/auth/signup",async (req,res)=>{
    const userSchema = z.object({
        name:z.string(),
        email:z.string().email(),
        password:z.string().min(6),
        role:z.string()
    });
    const parsedData = userSchema.safeParse(req.body);
    if(!parsedData.success){
        return res.status(400).json({
            "success": false,
            "error": "Invalid request schema"
        });
    }
    
    const name = parsedData.data.name;
    const password = parsedData.data.password;
    const hashedPassword = await bcrypt.hash(password,10);
    const role = parsedData.data.role;
    const email = parsedData.data.email;
    const userExists = await User.findOne({
        email:email
    });
    if(userExists){
        res.status(400).json({
            "success": false,
            "error": "Email already exists"
        });
        return;
    }
    const user = await User.create({
        name,
        email,
        password:hashedPassword,
        role
    });
    console.log("Signup Successfull");
    res.status(201).json({
        "success": true,
        data:{
            _id:user._id,
            name:user.name,
            email:user.email,
            role:user.role
        }
    });
});

router.post("/auth/login",async (req,res)=>{
    const userSchema = z.object({
        email:z.string().email(),
        password:z.string().min(6),
    });
    const parsedData = userSchema.safeParse(req.body);
    if(!parsedData.success){
        return res.status(400).json({
            "success": false,
            "error": "Invalid email or password"
        });
    }
    const {email,password} = parsedData.data;
    const user = await User.findOne({
        email:email
    });
    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const matchPassword = await bcrypt.compare(password,user.password);
    if (!matchPassword) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const token = jwt.sign({userId:user._id,role:user.role},process.env.JWT_SECRET,{
        expiresIn:"5d"
    });
    console.log("Signin Successfull");
    res.status(200).json({
        "success": true,
        "data": {
            "token": token
        }
    });
});

router.get("/auth/me",authMiddleware,async (req,res)=>{
    const user = await User.findById(req.userId).select("-password");

    console.log("/me endpoint working as expected");
    res.status(200).json({
        "success": true,
        "data": {
            "_id": user._id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    });
});

router.post("/class",authTeacherMiddleware,async(req,res)=>{
    try{
        const teacherSchema= z.object({
            className:z.string()
        });
        const parsedData = teacherSchema.safeParse(req.body);
        if(!parsedData.success){
            return res.status(400).json({
                "success": false,
                "error": "Invalid className"
            });
        }
        const classDetails = await Class.create({
            className:parsedData.data.className,
            teacherId:req.userId,
            studentIds:[]
        });
        return res.status(201).json({
            "success": true,
            "data": {
                "_id": classDetails._id,
                "className": classDetails.className,
                "teacherId": classDetails.teacherId,
                "studentIds":classDetails.studentIds 
            }
        });
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
})

router.post("/class/:id/add-student",authTeacherMiddleware,async(req,res)=>{
    try{
        const studentSchema = z.object({
            studentId:z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid studentId")
        })
        const parsedData = studentSchema.safeParse(req.body);
        if(!parsedData.success){
            return res.status(400).json({
                "success": false,
                "error": "Invalid studentId"
            });
        }
        const classId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(classId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid classId"
            });
        }

        const cls = await Class.findById(classId);
        if(!cls){
            return res.status(404).json({
                "success": false,
                "error": "Class not found"
            });
        }
        if (cls.teacherId.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                error: "You are not allowed to modify this class"
        });
}

        const stu = await User.findById(parsedData.data.studentId);
        if (stu.role !== "student") {
            return res.status(400).json({
                success: false,
                error: "User is not a student"
            });
        }

        if(!stu){
            return res.status(404).json({
                "success": false,
                "error": "Student not found"
            });
        }
        const studentId = parsedData.data.studentId;
        const updatedClass = await Class.findByIdAndUpdate(
            classId,
            {$addToSet:{studentIds:studentId}},
            { new: true }
        );
    
        return res.status(200).json({
            "success": true,
            "data": {
                "_id": updatedClass._id,
                "className":updatedClass.className,
                "teacherId": updatedClass.teacherId,
                "studentIds": updatedClass.studentIds
            }
        });
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }

})

router.get("/class/:id",authMiddleware,async (req,res)=>{
    try{
        const classId = req.params.id;

        const classDetails = await Class.findById(classId)
        .populate("studentIds","_id name email");

        if (!classDetails) {
            return res.status(404).json({
                success: false,
                message: "Class not found"
            });
        }

        const isTeacher = classDetails.teacherId.toString()===req.userId;
        const isStudent = classDetails.studentIds.some((studentId)=>studentId._id.toString()===req.userId);
        if(!isTeacher && !isStudent){
            return res.status(404).json({
                success: false,
                message: "Class not found"
            });
        }

        return res.status(200).json({
            "success": true,
            "data": {
                "_id": classDetails._id,
                "className": classDetails.className,
                "teacherId": classDetails.teacherId,
                "students": classDetails.studentIds 
            }
        });
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/students",authTeacherMiddleware,async (req,res)=>{
    try{
        const allStudents = await User.find({
            role:"student"
        }) .select("_id name email");
        return res.status(200).json({
            "success": true,
            "data": allStudents
        });
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/class/:id/my-attendance",authStudentMiddleware,async (req,res)=>{
    try{
        const classId = req.params.id;
        const classDetails = await Class.findById(classId)
        .populate("studentIds","_id name email");

        if (!classDetails) {
            return res.status(404).json({
                success: false,
                message: "Class not found"
            });
        }
        const isStudent = classDetails.studentIds.some((studentId)=>studentId._id.toString()===req.userId);
        if(!isStudent){
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const attendanceDetails = await Attendance.find({
            classId:classId,
            studentId:req.userId
        });
        if(attendanceDetails.status=="present"){
            return res.status(200).json({
                "success": true,
                "data": {
                    "classId": attendanceDetails.classId,
                    "status": "present"
                }
            });
        }
        else{
            return res.status(200).json({
                "success": true,
                "data": {
                    "classId": attendanceDetails.classId,
                    "status": null
                }
            });
        }
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
router.post("/attendance/start", authTeacherMiddleware, async (req, res) => {
  try {
    const attendanceSchema = z.object({
      classId: z.string().regex(/^[0-9a-fA-F]{24}$/)
    });

    const parsedData = attendanceSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request schema"
      });
    }

    // single active session rule (global)
    if (activeSession) {
      return res.status(409).json({
        success: false,
        error: "Attendance session already active"
      });
    }

    const classDetails = await Class.findById(parsedData.data.classId);
    if (!classDetails) {
      return res.status(404).json({
        success: false,
        error: "Class not found"
      });
    }

    // teacher owns class
    if (classDetails.teacherId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        error: "Teacher does not own the class"
      });
    }

    // START SESSION (single source of truth)
    startSession(classDetails._id.toString());

    return res.status(200).json({
      success: true,
      data: {
        classId: classDetails._id,
        startedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});
