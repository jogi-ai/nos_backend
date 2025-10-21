var express = require('express');
var router = express.Router();
const { google } = require("googleapis")
const { sendEmailSES } = require('../../lib/email');
const { validateEmail, validatePhone, validateFullName, validateEmailRequired, validSelectedSkills, validatePhoneNumber, validateOtherInfo } = require('../../lib/helpers');
const { body, validationResult, matchedData } = require('express-validator');


const MIN_MESSAGE_LENGTH = 20
const MAX_MESSAGE_LENGTH = 5000
const MAX_NAME_LENGTH = 100
const MAX_COMPANY_LENGTH = 100


const to = "jogi@aisthetic.co"
const toCareers = "careers@aisthetic.co"
const source = "Aisthetic <hello@aisthetic.co>"
const replyToEmail = "hello@aisthetic.co"


const spreadsheetId = "1_RGGTAuJ0Y0oEjZKKrMwxVdlCdxk2t5ofOnla-GmU-c"
const careersSpreadsheetId = "1h5DBDIXO5SLU-s873WaHUa8uaYnuuOpp5PVBTcD9zaE"


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
  const { name, email, company, phone, message, website } = data

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
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `
  await sendEmailSES([to], text, html, "Website Contact Form Enquiry", source, [email])
}

async function handleContactSubmission(request,response){
  try {
    // Check for validation errors
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
      return response.status(400).json({ errors: errors.array() });
    }
    const data = matchedData(request);
    console.log("data",data)
    response.status(200).json({status:"ok"})
    if(!data.website){
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
    }
  } catch (error) {
    console.error("Contact form error:", error)
    return response.json({ error: "Failed to process contact form" }, { status: 500 })
  }
}

// Validation middleware for contact form
const validateContactForm = [
  body('name')
    .trim()
    .notEmpty()
    .escape()
    .withMessage('Name is required')
    .isLength({ min: 1, max: MAX_NAME_LENGTH }).withMessage(`Name must be between 1 and ${MAX_NAME_LENGTH} characters`),
  
  body('email')
    .trim()
    .notEmpty()
    .escape()
    .withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[\d+\-() ]+$/)
    .escape()
    .withMessage('Phone can only contain numbers and characters: + - ( )')
    .isLength({ max: 20 }).withMessage('Phone number must not exceed 20 characters'),
  
  body('company')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: MAX_COMPANY_LENGTH }).withMessage(`Company name must not exceed ${MAX_COMPANY_LENGTH} characters`),
  
  body('message')
    .trim()
    .notEmpty()
    .escape()
    .withMessage('Message is required')
    .isLength({ min: MIN_MESSAGE_LENGTH, max: MAX_MESSAGE_LENGTH }).withMessage(`Message must be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters`)
];

router.post('/contact', validateContactForm, handleContactSubmission);


async function addToGoogleSheetCareers(data) {

  const { fullName, selectedSkills, email, phoneNumber, applyFor, otherInfo } = data  
  const mainSkills = selectedSkills.map(mainSkill=>mainSkill.label).join(", ")
  const design = selectedSkills.find(skill=>skill.label=="Design")
  const designSkills = design?design?.selectedSubSkills?.map(subSkill=>subSkill.label).join(", "):""
  const fe = selectedSkills.find(skill=>skill.label=="Frontend development")
  const feSkills = fe?fe?.selectedSubSkills?.map(subSkill=>subSkill.label).join(", "):""
  const be = selectedSkills.find(skill=>skill.label=="Backend development")
  const beSkills = be?be?.selectedSubSkills?.map(subSkill=>subSkill.label).join(", "):""
  const mobile = selectedSkills.find(skill=>skill.label=="Mobile development")
  const mobileSkills = mobile?mobile?.selectedSubSkills?.map(subSkill=>subSkill.label).join(", "):""
  const devops = selectedSkills.find(skill=>skill.label=="Dev Ops")
  const devopsSkills = devops?devops?.selectedSubSkills?.map(subSkill=>subSkill.label).join(", "):""
  const values = [
      [
          
          fullName,
          email,
          phoneNumber,
          mainSkills,
          designSkills,
          feSkills,
          beSkills,
          mobileSkills,
          devopsSkills,
          applyFor,
          otherInfo
      ]
  ]
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
    spreadsheetId:careersSpreadsheetId,
    range: "Talent!A:K", // Adjust based on your sheet
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  })
}

async function sendEmailCareers(data){
    const { fullName, email, phoneNumber, selectedSkills, applyFor, otherInfo } = data
    let text = `Full name: ${fullName}\nEmail: ${email}\nPhone: ${phoneNumber}\nRole: ${applyFor}\nOther info: ${otherInfo}`
    let skills = ""
    selectedSkills.forEach((selectedSkill,i)=>{
        if(i==0)
            skills = `${selectedSkill.label}`
        else
            skills = `${skills}\n\n${selectedSkill.label}`
        if(selectedSkill?.selectedSubSkills?.length>0){
            selectedSkill.selectedSubSkills.forEach((subSkill,j)=>{
                if(j==0)
                    skills = `${skills}\n${subSkill.label}`
                else
                    skills = `${skills}, ${subSkill.label}`
            })
        }
    })
    text = `${text}\n\nSkills:\n\n${skills}`
    await sendEmailSES([toCareers], text, null, "Application from Candidate", source, [email])

}

function validateFields(data){
    if(typeof data != "object")
        return [{code:"invalidReqBody"}]
    let keys = Object.keys(data)
    const allowedKeys = ["fullName","email","phoneNumber","selectedSkills","quizAnswer","applyFor","otherInfo","website"]
    let invalidKey = ""
    for(let i=0;i<keys.length;i++){
        if(!allowedKeys.includes(keys[i])){
            invalidKey = keys[i]
            break
        }
    }
    if(invalidKey)
        return [{code:"invalidKey",key:invalidKey}]
    let errors = []
    if((!data.fullName || validateFullName(data.fullName)))
        errors.push({field:"fullName"})
    if((!data.email || validateEmailRequired(data.email)))
        errors.push({field:"email"})
    if((!validSelectedSkills(data.selectedSkills)))
        errors.push({field:"selectedSkills"})
    if((!data.phoneNumber || validatePhoneNumber(data.phoneNumber)))
        errors.push({field:"phoneNumber"})
    if(!data.quizAnswer || (data.quizAnswer.toLowerCase() != "hyper" && data.quizAnswer.toLowerCase() != "hypertext"))
        errors.push({field:"quizAnswer"})
    if((!data.applyFor || (data.applyFor != "Full time role" && data.applyFor != "Contract work")))
        errors.push({field:"applyFor"})
    if(validateOtherInfo(data.otherInfo))
        errors.push({field:"otherInfo"})
    if(data.website)
        errors.push({field:"website"})
    return errors
}

async function handleApply(request,response){
  try {
    const data = await request.body
    let errors = validateFields(data)
    if(errors.length == 0){
        try {
            sendEmailCareers(data)
        } catch (error) {
            console.error("Email send error:", error)
        }

        // 2. Add to Google Sheet
        try {
            addToGoogleSheetCareers(data)
        } catch (error) {
            console.error("Google Sheet error:", error)
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

router.post('/careers', handleApply);



module.exports = router;
