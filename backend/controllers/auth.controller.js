import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";
import User from "../models/user.model.js"
import bcrypt from "bcryptjs";

export const signup = async (req,res) => {
    try {
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

        // hashing password
        const salt = await bcrypt.gensalt(10);
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
        console.log( `Error in signup controller : ${error.message}`)
        res.status(500).json({error:"Internal Server Error"});
    }
};

export const login = async (req,res) => {
    res.json({
        data: "You hit the login endpoint"
    })
};
export const logout = async (req,res) => {
    res.json({
        data: "You hit the logout endpoint"
    })
};

