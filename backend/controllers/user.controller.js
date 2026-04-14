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