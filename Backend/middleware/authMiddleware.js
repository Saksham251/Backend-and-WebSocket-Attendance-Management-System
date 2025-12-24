import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

function extractToken(req) {
  if (
    req.headers.authorization &&
    req.headers.authorization.split(" ")[0] === "Bearer"
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
}

export const authMiddleware = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: token missing"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId;
    req.role = decoded.role;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

export const authTeacherMiddleware = async(req,res,next)=>{
  const token = extractToken(req);

  if(!token){
    return res.status(401).json({
      success: false,
      message: "Unauthorized: token missing"
    });
  }
  try{
    const decoded = jwt.verify(token,process.env.JWT_SECRET);
    if(decoded.role==="teacher"){
      req.userId=decoded.userId;
      req.role=decoded.role;
      next();
    }else{
      return res.status(403).json({
        "success": false,
        "error": "Forbidden, teacher access required"
      });
    }
  }
  catch(error){
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }

};

export const authStudentMiddleware = async (req,res,next)=>{
    const token = extractToken(req);
    
    if(!token){
    return res.status(401).json({
      success: false,
      message: "Unauthorized: token missing"
    });
    }
    try{
      const decoded = jwt.verify(token,process.env.JWT_SECRET);
      if(decoded.role==="student"){
        req.userId=decoded.userId;
        req.role=decoded.role;
        next();
      }else{
        return res.status(403).json({
        "success": false,
        "error": "Forbidden"
        });
      }
    }
    catch(error){
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }
}
