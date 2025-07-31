var express = require('express');
var router = express.Router();
const { sendEmailSES } = require("../lib/email");

const sendEmail = async (req, res) => {
    const result = await sendEmailSES(["jogi@aisthetic.co"], "Test email", "<p>Test email</p>", "Test email subject", "hello@aisthetic.co", ["hello@aisthetic.co"])
    // if(result['$metadata'].httpStatusCode !== 200)
    res.status(200).json({ message: "Email sent successfully"});
}
router.post('/', sendEmail);



module.exports = router;
