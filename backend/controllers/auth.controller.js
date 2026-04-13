import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";
import User from "../models/user.model.js"
import bcrypt from "bcryptjs";

export const signup = async (req,res) => {
    try {
        // console.log("BODY:", req.body);
        const {fullname, username, email, password} = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)) {
            return res.status(400).json({error: "Invalid email format"});
        }

        const existingUser = await User.findOne({ username })
        if(existingUser) {
            return res.status(400).json({error : "Username already taken"});
        }

        const existingEmail = await User.findOne({ email })
        if(existingEmail) {
            return res.status(400).json({error : "Email already taken"});
        }

        if(password.length < 6) {
            return res.status(400).json({error: "Password must be 6 char long.."});
        }

        // hashing password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // creating new user
        const newUser = new User({
            fullname,
            username,
            email,
            password: hashedPassword
        });

        // token and cookie
        if(newUser) {
            generateTokenAndSetCookie(newUser._id, res);
            await newUser.save();

            res.status(200).json({
                _id : newUser._id,
                fullname : newUser.fullname,
                email : newUser.email,
                username : newUser.username,
                followers : newUser.followers,
                following : newUser.following,
                profileImg : newUser.profileImg,
                coverImg : newUser.coverImg,
            })
        } else {
            res.status(400).json({
                error: "Invalid User data"
            })
        }

    } catch (error) {
        // console.log("ERROR:", error);
        console.log( `Error in signup controller : ${error.message}`)
        res.status(500).json({error:"Internal Server Error"});
    }
};

export const login = async (req,res) => {
    try {
        const {username, password} = req.body;
        const user = await User.findOne({username});
        const isPasswordValid = await bcrypt.compare(password, user?.password||"");
        if(!user || !isPasswordValid) {
            return res.status(400).json({error: "Invalid username or password"})

        }
        generateTokenAndSetCookie(user._id, res);

        res.status(200).json({
            _id : user._id,
            fullname : user.fullname,
            email : user.email,
            username : user.username,
            followers : user.followers,
            following : user.following,
            profileImg : user.profileImg,
            coverImg : user.coverImg,
        })

    } catch (error) {
        // console.log("ERROR:", error);
        console.log( `Error in login controller : ${error.message}`)
        res.status(500).json({error:"Internal Server Error"});
    }
};
export const logout = async (req,res) => {
    try {
        res.cookie("jwt","",({maxAge:0}));
        res.status(200).json({message: "Logged out successfully"});
    } catch (error) {
        // console.log("ERROR:", error);
        console.log( `Error in login controller : ${error.message}`)
        res.status(500).json({error:"Internal Server Error"});
    }
};
