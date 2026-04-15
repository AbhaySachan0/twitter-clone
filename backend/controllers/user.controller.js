import bcrypt from "bcryptjs";
import {v2 as cloudinary} from "cloudinary";


import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const getUserProfile = async (req,res) => {
    const {username} = req.params;

    try {
        const user = await User.findOne({username}).select("-password");
        if(!user) {
            return res.status(400).json({error: "Usre not found"});
        }
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getUserProfile", error.message);
        res.status(500).json({error:error.message});
    }
}

export const followUnfollowUser = async (req,res)=> {

    try {
        const { id } = req.params;
        const userToModify = await User.findById(id);
        const currUser = await User.findById(req.user._id);  // from protectRoute

        if(id===req.user._id.toString()) {
            return res.status(400).json({error: "You can not follow/unfollow yourself"});
        }
        if(!userToModify || !currUser) {
            return res.status(400).json({error: "User Not found"})
        }

        const isFollowing = currUser.following.includes(id);
        if(isFollowing) {
            // unfollow
            await User.findByIdAndUpdate(id, {$pull : {followers : req.user._id}});
            await User.findByIdAndUpdate(req.user._id, {$pull : {following : id}});
            res.status(200).json({message: "Unfollowed successfully"});
        } else {
            // follow
            await User.findByIdAndUpdate(id, {$push : {followers : req.user._id}});
            await User.findByIdAndUpdate(req.user._id, {$push : {following : id}});

            // send notification
            const newNotification = new Notification({
                type:"follow",
                from: req.user._id,
                to: userToModify._id,
            });
            await newNotification.save();

            res.status(200).json({message: "user followed successfully"});
        }

    } catch (error) {
        console.log("Error in followUnfollowUser", error.message);
        res.status(500).json({error:error.message});
    }
}

export const getSuggestedUsers = async (req,res) => {
    try {
        const userId = req.user._id;
        const usersFollowedByMe = await User.findById(userId).select("following");
        const users = await User.aggregate([
            {
                $match : {
                    _id: {$ne:userId}
                }
            },
            {
                $sample:{size:10}
            }
        ])
        
        const filterdUsers = users.filter(users=>!usersFollowedByMe.following.includes(users._id));
        const suggestedUsers = filterdUsers.slice(0,4);

        suggestedUsers.forEach(user=>user.password=null);
        res.status(200).json(suggestedUsers);

    } catch (error) {
        console.log("Error in getSuggestedUser", error.message);
        res.status(500).json({error:error.message});
    }
}

export const updateUserProfile = async (req,res) => {
    const {fullname, username, email, currentPassword, newPassword, bio, link} = req.body;
    let {profileImg, coverImg} = req.body;

    const userId = req.user._id; // from protectRoute

    try {
        let user = await User.findById(userId);
        if(!user) {
            return res.status(400).json({error:"User not found"});
        }

        if((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
            return res.status(400).json({error: "Please provide both current password and newPassword"});
        } 
        if(currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if(!isMatch) {
                return res.status(400).json({error: "Wrong Password"});
            }
            if(newPassword.length < 6) {
                return res.status(400).json({error: "Password must me 6 char long"});
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }
        if(profileImg) {
            // delete previous img if exist
            if(user.profileImg) {
                await cloudinary.uploader.destroy(user.profileImg.split('/').pop().split('.')[0]);
            }
            // upload image
            const uploadedResponse = await cloudinary.uploader.upload(profileImg);
            profileImg = uploadedResponse.secure_url;

        }

        if(coverImg) {
            // delete previous img if exist
            if(user.profileImg) {
                await cloudinary.uploader.destroy(user.profileImg.split('/').pop().split('.')[0]);
            }

            //upload img
            const uploadedResponse = await cloudinary.uploader.upload(coverImg);
            coverImg = uploadedResponse.secure_url;
            
        }

        user.fullname = fullname || user.fullname;
        user.email = email || user.email;
        user.username = username || user.username;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;
        user.bio = bio || user.bio;
        user.link = link || user.link;

        await user.save();

        user.password = null; // null password in response..not in database

        return res.status(200).json(user);

    } catch (error) {
        console.log("Error in updateUserProfile", error.message);
        res.status(500).json({error:error.message});
    }

}