import jwt from "jsonwebtoken";

import User from "../config/models/userModel.js";
import bcrypt from "bcryptjs";
import SendOTPFunc from "../utils/phoneOpt.js";

let userOTP;

const authController = {
	// root
	get: (req, res) => {
		return res.redirect("/");
	},

	// Message based OTP verification
	SendOTP: async (req, res) => {
		const {phoneNumber} = req.body;
		try{
			const code = await SendOTPFunc(phoneNumber);
			console.log(code)
			userOTP = code;
			return res.status(200).json({message: "OTP send successfully"})
		}
		catch(err){
			return res.status(400).json({message: err.message})
		}
	},
	VerifyOTP: async (req, res) => {
		const {OTP} = req.body;
		if (OTP == userOTP){
			return res.status(200).json({message: "User authenticated successfully"});
		}
		return res.status(400).json({message: "User authentication failed"});
	},
	// END

	SignUp: async (req, res) => {
		const {username, email, password, phoneNumber} = req.body;
		console.log(req.body);
		const hashedPassword = bcrypt.hashSync(password, 10);

		const dbUser = await User.findOne({email});
		if (dbUser) {
			return res.status(403).json({
				message: `User with ${dbUser.email} was already present in our database`,
			});
		}

		try {
			const newUser = await User.create({
				username,
				email,
				password: hashedPassword,
				phoneNumber,
			});
			await newUser.save();

			return res.json({
				message: `successfully created a user named ${username}`,
				status: 200,
			});
		} catch (error) {
			console.log(error);
			return res.json({message: "couldn't SignUp!", status: 400});
		}
	},

	//   GET credentials and login
	Login: async (req, res) => {
		const {email, password} = req.body;

		// Token check if present or not
		if (!req.cookies.farmer_token) {
			res.clearCookie("farmer_token");
		}

		try {
			const dbUser = await User.findOne({email});
			if (!dbUser) {
				return res.status(403).json({message: "Invalid credentials provided"});
			}

			// Check password
			const isValidPassword = await bcrypt.compare(password, dbUser.password);
			if (!isValidPassword) {
				return res.status(403).json({message: "Invalid credentials provided"});
			}

			const data = {
				id: dbUser._id,
				username: dbUser.username,
				email: dbUser.email,
				phoneNumber: dbUser.phoneNumber,
			};

			const farmer_token = jwt.sign(data, process.env.JWT_SECRET, {
				expiresIn: "7d",
			});

			res.cookie("farmer_token", farmer_token, {
				path: "/",
				httpOnly: true,
				secure: true,
			});

			return res.status(200).json({message: "Successfully logged in"});
		} catch (err) {
			console.error("Error during login", err);
			return res.status(500).json({message: "Internal server error"});
		}
	},

	// logout user
	Logout: async (req, res) => {
		try {
			res.clearCookie("farmer_token");
			return res.status(200).json({message: "success"});
		} catch (error) {
			return res.status(400).json({message: "Error! Couldn't Logout"});
		}
	},
};

export default authController;
