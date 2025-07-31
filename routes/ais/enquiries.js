var express = require('express');
var router = express.Router();
const { google } = require("googleapis")
const { sendEmailSES } = require('../../lib/email');
const { validateEmail, validatePhone } = require('../../lib/helpers');

// Course enquiries related functions
const to = "jogi@aisthetic.co"
const source = "Aisthetic <hello@aisthetic.co>"
const replyToEmail = "hello@aisthetic.co"
const MIN_MESSAGE_LENGTH = 20
const MAX_MESSAGE_LENGTH = 5000
const MAX_NAME_LENGTH = 100
const MAX_COMPANY_LENGTH = 100
// Contact related functions

const spreadsheetId = "1_RGGTAuJ0Y0oEjZKKrMwxVdlCdxk2t5ofOnla-GmU-c"


// Add to Google Sheet
async function addToGoogleSheet(data) {
  const { name, email, company, phone, message } = data

  // Authenticate with Google Sheets API
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  const sheets = google.sheets({ version: "v4", auth })

  // Append data to the sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Leads!A:F", // Adjust based on your sheet
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          new Date().toISOString(), // Timestamp
          name,
          email,
          company || "Not provided",
          phone || "Not provided",
          message,
        ],
      ],
    },
  })
}

// Send thank you email to registrant
async function sendThankYouEmail(data) {
  const { name, email, message } = data
  
  const text = `
      Dear ${name},
      
      We have received your enquiry and will get back to you shortly.

      Your message:
      -----
      "${message}"
      -----
      
      Best regards,
      Team Aisthetic
    `
    const html = `
      <p>Dear ${name},</p>
      
      <p>We have received your enquiry and will get back to you shortly.</p>
      
      <p>Your message:</p>
      <p>-----</p>
      <p>${message}</p>
      <p>-----</p>
      
      <p>Best regards,<br>
      Team Aisthetic</p>
    `
  await sendEmailSES([email], text, html, "Received your enquiry", source, [replyToEmail])
}
async function sendEmail(data) {
  const { name, email, company, phone, message } = data

  const text = `
      New contact form submission
      
      Name: ${name}
      Email: ${email}
      Company: ${company || "Not provided"}
      Phone: ${phone || "Not provided"}
      Message:
      ${message}
    `
    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Company:</strong> ${company || "Not provided"}</p>
      <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `
  await sendEmailSES([to], text, html, "Website Contact Form Enquiry", source, [email])
}
// Contact us related functions end
function validateFields(data){
    return  data?.name?.length == 0 ||
            data?.name?.length > MAX_NAME_LENGTH ||
            !validateEmail(data?.email) ||
            (data?.phone && !validatePhone(data?.phone)) ||
            data?.company?.length > MAX_COMPANY_LENGTH ||
            data?.message?.length == 0 ||
            data?.message?.length < MIN_MESSAGE_LENGTH ||
            data?.message?.length > MAX_MESSAGE_LENGTH ||
            data?.website?false:true 
}
async function handleContactSubmission(request,response){
  try {
    const data = await request.body
    let fieldsValidated = validateFields(data)
    if(fieldsValidated){
        try {
            sendEmail(data)
        } catch (error) {
            console.error("Email send error:", error)
        }

        // 2. Add to Google Sheet
        try {
            addToGoogleSheet(data)
        } catch (error) {
            console.error("Google Sheet error:", error)
        }

        // 4. Send thank you email to registrant
        try {
            sendThankYouEmail(data)
        } catch (error) {
            console.error("Thank you email error:", error)
        }
    } else {
      console.log("spam")
      response.status(200).json({status:"ok"})
    }
    return response.status(200).json({status:"ok"})
  } catch (error) {
    console.error("Contact form error:", error)
    return response.json({ error: "Failed to process contact form" }, { status: 500 })
  }
}

router.post('/contact', handleContactSubmission);



module.exports = router;
