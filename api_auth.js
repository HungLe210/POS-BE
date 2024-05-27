const express = require("express");
const bcrypt = require("bcrypt");
const Users = require("./models/user_schema");
const jwt = require("./jwt");
const formidable = require("formidable");
const path = require("path");
const fs = require("fs-extra");
const nodeMailer = require("nodemailer");
const mailConfig = require('./config/mail.config');


//express support creating new website
const app = express();

require('dotenv').config({ path: __dirname + "/.env" });
require('dotenv').config({ path: __dirname + "./config/mail.config.js" });

//handle HTTP request
const bodyParser = require("body-parser");

//manage CORS -- Cross-Origin Resource Sharing -> Easier when building API
const cors = require("cors");


app.use(express.static(__dirname + "/uploaded"));



require("./db");

// const { error } = require("console");
// const { verify } = require("crypto");

// app.use(cors());
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

const convertFieldsToStrings = (fields) => {
    const convertedFields = {};
    for (const key in fields) {
        if (fields.hasOwnProperty(key)) {
            convertedFields[key] = Array.isArray(fields[key]) ? fields[key].join(', ') : String(fields[key]);
        }
    }
    return convertedFields;
};


const sendMail = (to, subject, token) => {
    const transport = nodeMailer.createTransport({
        host: mailConfig.HOST,
        port: mailConfig.PORT,
        secure: false,
        auth: {
            user: mailConfig.USERNAME,
            pass: mailConfig.PASSWORD
        }
    })

    if (subject === "Activate Account") {
        htmlContent = `
      <h1>Please use the following link to activate your account</h1>
      <a href="http://localhost:3000/activation/${token}">Activate Account</a>
      <hr />
      <p>This email may contain sensitive information</p>
      <p>and the link will expire in 60 minutes</p>
    `;
    } else if (subject === "Reset Password") {
        htmlContent = `
    <h1>Please use the following link to reset your password</h1>
    <a href="http://localhost:3000/password-reset?token=${token}">Reset password link</a>
    <hr />
    <p>This link will expired in 60 minutes</p>    
    `;
    } else {
        htmlContent = `
      <h1>Default Email Content</h1>
      <p>This is a default message.</p>
    `;
    }

    const options = {
        from: mailConfig.FROM_ADDRESS,
        to: to,
        subject: subject,
        html: htmlContent
    };


    return transport.sendMail(options);
}

uploadImage = async (files, doc) => {
    if (files.avatars != null) {
        console.log(files.avatars) //undefined
        console.log(doc) //user object
        var fileName = files.avatars[0].originalFilename;
        console.log(files.avatars[0].originalFilename);
        console.log("++")
        console.log(typeof (files.avatars[0].originalFilename));
        console.log("++")
        var fileExtention = fileName.split(".").pop();
        doc.avatars = `${Date.now()}+${doc.username}.${fileExtention}`;
        var newpath =
            path.resolve(__dirname + "/uploaded/images/") + "/" + doc.avatars;
        console.log(__dirname);

        if (fs.exists(newpath)) {
            await fs.remove(newpath);
        }
        await fs.move(files.avatars.path, newpath);

        await Users.findOneAndUpdate({ _id: doc.id }, doc);
    }
};





// app.get("/", function (req, res, next) {
//   return res.send("Hello Nodejs");
// });



app.post("/register", async (req, res) => {
    try {
        req.body.password = await bcrypt.hash(req.body.password, 8);  //hash password
        const { first_name, last_name, email } = req.body;
        const token = jwt.sign(
            { first_name, last_name, email },
            process.env.ACCOUNT_ACTIVATION,
            { expiresIn: "365d" }
        );
        req.body.activated_token = token;
        let user = await Users.create(req.body);
        // return res.json({
        //   result: "warning",
        //   message: `Email has been sent to ${email}. Follow the instruction to activate your account`
        // });

        sendMail(req.body.email, "Activate Account", token).then(sent => {
            return res.json({
                result: "success",
                message: `Email has been sent to ${email}. Follow the instruction to activate your account`
            });
        }).catch(err => {
            console.log("SIGN UP EMAIL SENT ERROR", err)
            return res.json({
                result: "error",
                message: err.message
            });
        });
    } catch (err) {
        res.json({ result: "error", message: err.errmsg });
        console.log(err);
    }
})


app.post("/login", async (req, res) => {
    let doc = await Users.findOne({ username: req.body.username }); //find user by user name to check duplicated
    if (doc) {
        if (bcrypt.compareSync(req.body.password, doc.password)) {
            if (doc.status != "not_activated") {
                const payload = {
                    id: doc._id,
                    level: doc.level,
                    username: doc.username
                };
                // create payload object contains three attributes, + _id attributed which is automatically created by mongoDB

                //console.log(doc._id);

                let token = jwt.sign(payload); // Create token based on sign function and payload serves as parameter
                //console.log(token);
                //console.log(payload.id);
                res.json({ result: "success", token, message: "Login successfully" });
            } else {
                return res.json({
                    result: "error",
                    message: "Your need to activate account first"
                });
            }
        } else {
            // Invalid password
            res.json({ result: "error", message: "Invalid password" });
        }
    } else {
        // Invalid username
        res.json({ result: "error", message: "Invalid username" });
    }
});


app.get("/activation/:token", async (req, res) => {
    let token = req.params.token;
    if (token) {
        //console.log(token);
        // jwt.verify(token, process.env.ACCOUNT_ACTIVATION, function (
        //   err,
        //   decoded
        // ) {
        //   if (err) {
        //     console.log("JWT VERIFY IN ACCOUNT ACTIVATION ERROR", err);
        //     return res.redirect("http://localhost:3000/login/error");
        //   }
        // });
        let updatedFields = {
            status: "active",
            activated_token: ""
        };
        let doc = await Users.findOneAndUpdate(
            { activated_token: token },
            updatedFields
        );
        res.json({ result: "success", message: "Activate account successfully!" })
    } else
        res.json({ result: "error", message: "Token not found!" })
});

app.post("/password/reset", async (req, res) => {
    let expired_time = "60m";
    const { email } = req.body;
    const check = await Users.findOne({ email })
    if (!check) {
        return res.json({
            result: "error",
            message: "User with that email does not exist"
        });
    }

    const token = jwt.sign(
        { _id: check._id, name: check.first_name },
        process.env.JWT_RESET_PASSWORD,
        {
            expiresIn: expired_time
        }
    );

    Users.updateOne({ resetPasswordToken: token }).then(result => {
        if (result.nModified === 0) {
            console.log("RESET PASSWORD LINK ERROR", err);
            return res.status(400).json({
                result: "error",
                message: "Database connection error on user password forgot request"
            });
        } return sendMail(email, "Reset Password", token)

    })
        .then(() => {
            return res.json({
                result: "success",
                message: `Email has been sent to ${email}. Follow the instruction to reset your password`
            });
        })
        .catch(err => {
            return res.json({ result: "error", message: err.message });
        });
});


app.put("/password-reset", async (req, res) => {
    const { password } = req.body;
    let resetPasswordToken = req.query.token;
    console.log(resetPasswordToken);
    console.log({ password });
    console.log(password);
    if (resetPasswordToken) {
        let encrypt_pass = await bcrypt.hash(password, 8);
        let updatedFields = {
            password: encrypt_pass,
            resetPasswordToken: ""
        }
        await Users.findOneAndUpdate(
            { resetPasswordToken: resetPasswordToken },
            updatedFields
        ).then(response => {
            return res.json({
                result: "success",
                message: "Password update succesfully your can try login again"
            });
        }).catch(err => {
            console.log(error);
            return;
        });
    } else {
        return res.json({
            result: "error",
            message: "No Found Token"
        });
    }
})




// app.post("/profile", async (req, res) => {
//     try {
//         await Users.create(req.body);
//         res.json({ result: "success", message: "Register successfully" });
//     } catch (err) {
//         res.json({ result: "error", message: err.errmsg });
//     }
// });



app.put("/profile", async (req, res) => {
    try {
        //console.log(__dirname); //Backend folder
        var form = new formidable.IncomingForm();
        form.parse(req, async (err, fields, files) => {
            console.log(typeof (fields.username))

            const convertedFields = convertFieldsToStrings(fields);

            let doc = await Users.findOneAndUpdate({ _id: convertedFields.id }, convertedFields);
            console.log(fields.id);
            console.log(files.avatars);
            console.log("testing 1s")
            await uploadImage(files, convertedFields);
            console.log("upload done");

            res.json({ result: "success", message: "Update Successfully" });
        });
    } catch (err) {
        res.json({ result: "error", message: err.message });
    }
});

app.get("/profile/id/:id", async (req, res) => {
    let doc = await Users.findOne({ _id: req.params.id });
    res.json(doc);
});


module.exports = router;