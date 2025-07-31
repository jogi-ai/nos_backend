var express = require('express');
var router = express.Router();


const { google } = require("googleapis")
const sgMail = require("@sendgrid/mail");
const { sendEmailSES } = require('../lib/email');

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "")

// Course enquiries related functions
const source = "National Outdoor School <info@nationaloutdoorschool.com>"
const replyToEmail = "info@nationaloutdoorschool.com"
const courseDataNameWise = {
    "White Water Kayaking Foundation Course" : {
        listId:  "f999ef6e-6be4-4d13-b0d6-a0dc8b9dfab7",
        sheetId: "1Gs37hkZyCOQ9EOiXeZoI7h_CW3VeyMuwiAHxGbP38XI"  
    },
}

// Add contact to SendGrid list
async function addToSendGridListCourse(data) {
  const { fullName, email, phone, age, gender, courseName } = data
  const [firstName, ...lastNameParts] = fullName.split(" ")
  const lastName = lastNameParts.join(" ")
  const dataToSend = {
    email,
    first_name: firstName,
    custom_fields: {
      phone,
      age:`${age}`,
      gender
    },
  }
  if(lastName) {
    dataToSend.last_name = lastName
  }
  console.log("sending to sendgrid2")
  const reqBody = {
    list_ids: [courseDataNameWise[courseName].listId],
    contacts: [dataToSend],
  }
  console.log("SendGrid request body:", reqBody)
  const response = await fetch("https://api.sendgrid.com/v3/marketing/contacts", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqBody),
  })
  console.log("SendGrid response status:", response.status)
  if (response.status !=  202) {
    console.log("SendGrid response error:", response.statusText)
    const errorBody = await response.json();
    console.log(`SendGrid API error: ${response.statusText} (${response.status}) ${JSON.stringify(errorBody)}`)
  } else {
    console.log("Added to SendGrid list successfully")
  }
}

// Add to Google Sheet
async function addToGoogleSheetCourse(data) {
  const { fullName, email, phone, age, gender, preferredCourseDate, courseName, message } = data

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
    spreadsheetId: courseDataNameWise[courseName].sheetId,
    range: "Leads!A:H", // Adjust based on your sheet 
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          new Date().toISOString(), // Timestamp
          fullName, 
          email, 
          phone, 
          age, 
          gender, 
          preferredCourseDate,
          message
        ],
      ],
    },
  })
}

// Send email to school
async function sendEmailToSchoolCourse(data) {
  const { fullName, email, phone, age, gender, preferredCourseDate, courseName, message } = data

  // const msg = {
  //   to: "info@nationaloutdoorschool.com",
  //   from: {
  //     email: "noreply@nationaloutdoorschool.com",
  //     name: "Website Enquiry",
  //   },
  //   subject: `New Course Registration: ${courseName}`,
  //   text: `
  //     New registration for ${courseName}
      
  //     Name: ${fullName}
  //     Email: ${email}
  //     Phone: ${phone}
  //     Age: ${age}
  //     Gender: ${gender}
  //     Preferred Course Date: ${preferredCourseDate}
  //     Message: ${message || "No message provided"}
      
  //   `,
  //   html: `
  //     <h2>New registration for ${courseName}</h2>
  //     <p><strong>Name:</strong> ${fullName}</p>
  //     <p><strong>Email:</strong> ${email}</p>
  //     <p><strong>Phone:</strong> ${phone}</p>
  //     <p><strong>Age:</strong> ${age}</p>
  //     <p><strong>Gender:</strong> ${gender}</p>
  //     <p><strong>Preferred Course Date:</strong> ${preferredCourseDate}</p>
  //     <p><strong>Message:</strong> ${message || "No message provided"}</p>
  //   `,
  // }
  // await sgMail.send(msg)
  const text = `
      New registration for ${courseName}
      Name: ${fullName}
      Email: ${email}
      Phone: ${phone}
      Age: ${age}
      Gender: ${gender}
      Preferred Course Date: ${preferredCourseDate}
      Message: ${message || "No message provided"} 
    `
    const html = `
      <h2>New registration for ${courseName}</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Age:</strong> ${age}</p>
      <p><strong>Gender:</strong> ${gender}</p>
      <p><strong>Preferred Course Date:</strong> ${preferredCourseDate}</p>
      <p><strong>Message:</strong> ${message || "No message provided"}</p>
    `
  await sendEmailSES([source], text, html, "Website Enquiry", source, [email])
}

// Send thank you email to registrant
async function sendThankYouEmailCourse(data) {
  const { fullName, email, courseName } = data
  
  // const msg = {
  //   to: email,
  //   from: {
  //     name: "National Outdoor School",
  //     email: "noreply@nationaloutdoorschool.com"
  //   },
  //   subject: `Thank You for Registering for ${courseName}`,
  //   text: `
  //     Dear ${fullName},
      
  //     Thank you for enquiring about the ${courseName}. We're excited to have you join us!
      
  //     Here's what to expect next:
      
  //     1. You'll receive a call from one of our representatives to confirm your eligiblity for the course.
  //     2. You will be sent a registration form and payment link. Submitting the form and payment will confirm your spot on the course.
      
  //     If you have any questions before then, please don't hesitate to contact us at info@nationaloutdoorschool.com.
      
  //     We look forward to seeing you on the water!
      
  //     Best regards,
  //     The National Outdoor School Team
  //   `,
  //   html: `
  //     <p>Dear ${fullName},</p>
      
  //     <p>Thank you for registering for our <strong>${courseName}</strong>. We're excited to have you join us!</p>
      
  //     <p>Here's what to expect next:</p>
      
  //     <ol>
  //       <li>You'll receive a call from one of our representatives to confirm your eligiblity for the course.</li>
  //       <li>You will be sent a registration form and payment link. Submitting the form and payment will confirm your spot on the course.</li>
  //     </ol>
      
  //     <p>If you have any questions before then, please don't hesitate to contact us at info@nationaloutdoorschool.com.</p>

  //     <p>We look forward to seeing you on the water!</p>
      
  //     <p>Best regards,<br>
  //     The National Outdoor School Team</p>
  //   `
  // }

  // await sgMail.send(msg)
    const text = `
        Dear ${fullName},
        
        Thank you for enquiring about the ${courseName}. We're excited to have you join us!
        
        Here's what to expect next:
        
        1. You'll receive a call from one of our representatives to confirm your eligiblity for the course.
        2. You will be sent a registration form and payment link. Submitting the form and payment will confirm your spot on the course.
        
        If you have any questions before then, please don't hesitate to contact us at info@nationaloutdoorschool.com.
        
        We look forward to seeing you on the water!
        
        Best regards,
        The National Outdoor School Team
    `
    const html = `
      <p>Dear ${fullName},</p>
      
      <p>Thank you for registering for our <strong>${courseName}</strong>. We're excited to have you join us!</p>
      
      <p>Here's what to expect next:</p>
      
      <ol>
        <li>You'll receive a call from one of our representatives to confirm your eligiblity for the course.</li>
        <li>You will be sent a registration form and payment link. Submitting the form and payment will confirm your spot on the course.</li>
      </ol>
      
      <p>If you have any questions before then, please don't hesitate to contact us at info@nationaloutdoorschool.com.</p>

      <p>We look forward to seeing you on the water!</p>
      
      <p>Best regards,<br>
      The National Outdoor School Team</p>
    `
  await sendEmailSES([email], text, html, `Thank You for Registering for ${courseName}`, source, [replyToEmail])
}

async function handleCourseSubmission(request,response){
  try {
    const data = await request.body
    
    //trim all fields
    for (const key in data) {
      if (typeof data[key] === "string") {
        (data[key]) = data[key].trim();
      }
    }
    const errors = {}
    console.log("received data",data)
    // Validate fullName
    if (!data.fullName || data.fullName.length < 2 || data.fullName.length > 200) {
      errors.fullName = "Full name must be between 2 and 200 characters."
    }

    // Validate email
    const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!data.email || !emailPattern.test(data.email)) {
      errors.email = "Invalid email format."
    }

    // Validate phone
    const phonePattern = /^[0-9+\-\s()]{10,15}$/
    if (!data.phone || !phonePattern.test(data.phone)) {
      errors.phone = "Phone number must be between 10 and 15 characters and valid."
    }

    // Validate age
    if (!data.age || data.age < 15 || data.age > 100) {
      errors.age = "Age cannot be less than 15 or greater than 100."
    }

    // Validate preferredCourseDate
    const validCourseDates = ["jul-3-jul-6", "jul-10-jul-13", "jul-16-jul-19","jul-31-aug-3","aug-7-aug-10","aug-14-aug-17","aug-21-aug-24"]
    if (!data.preferredCourseDate || !validCourseDates.includes(data.preferredCourseDate)) {
      errors.preferredCourseDate = "Preferred course date is invalid."
    }

    const validGenders = ["male", "female", "other"]
    if (!data.gender || !validGenders.includes(data.gender)) {
      errors.gender = "Gender is invalid."
    }

    // Validate courseName
    if (!data.courseName || !(data.courseName in courseDataNameWise)) {
      errors.courseName = "Course name is invalid."
    }

    // Validate message
    if (data.message && data.message.length > 1000) {
      errors.message = "Message cannot exceed 1000 characters."
    }

    // If there are errors, return a 400 response
    if (Object.keys(errors).length > 0) {
      return response.status(400).json({ error: "Validation failed", details: errors })
    }

    // 1. Add to SendGrid list
    try {
      console.log("sending to sendgrid1")
      addToSendGridListCourse(data)
    } catch (error) {
      console.error("SendGrid list error:", error)
    }

    // 2. Send email to school
    try {
      sendEmailToSchoolCourse(data)
    } catch (error) {
      console.error("Email to school error:", error)
    }

    // 3. Add to Google Sheet
    try {
      addToGoogleSheetCourse(data)
    } catch (error) {
      console.error("Google Sheet error:", error)
    }

    // 4. Send thank you email to registrant
    try {
      sendThankYouEmailCourse(data)
    } catch (error) {
      console.error("Thank you email error:", error)
    }

    return response.json({ success: true })
  } catch (error) {
    console.error("Registration error:", error)
    return response.json({ error: "Failed to process registration" }, { status: 500 })
  }
}

// Course enquiries related functions end


router.post('/course', handleCourseSubmission);

// Contact related functions

const spreadsheetId = "1fNPU_clkIpoioeKgJs-rmp49OSlzFksJFLJROnP4OEg"
const listId = "3c4f0022-71dc-44c9-b18c-419ead68836a"

// Send email to school
async function sendEmailToSchool(data) {
  const { name, email, phone, message } = data

  // const msg = {
  //   to: "info@nationaloutdoorschool.com",
  //   from: {
  //     email: "noreply@nationaloutdoorschool.com",
  //     name: "Website Enquiry - Contact Form",
  //   },
  //   subject: `New Contact Form Submission from ${name}`,
  //   text: `
  //     New contact form submission
      
  //     Name: ${name}
  //     Email: ${email}
  //     Phone: ${phone || "Not provided"}
      
  //     Message:
  //     ${message}
  //   `,
  //   html: `
  //     <h2>New Contact Form Submission</h2>
  //     <p><strong>Name:</strong> ${name}</p>
  //     <p><strong>Email:</strong> ${email}</p>
  //     <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
  //     <h3>Message:</h3>
  //     <p>${message.replace(/\n/g, "<br>")}</p>
  //   `,
  // }

  // await sgMail.send(msg)
  const text = `
      New contact form submission
      
      Name: ${name}
      Email: ${email}
      Phone: ${phone || "Not provided"}
      
      Message:
      ${message}
    `
    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `
  await sendEmailSES([source], text, html, "Website Contact Form Enquiry", source, [email])
}

// Add to Google Sheet
async function addToGoogleSheet(data) {
  const { name, email, phone, message } = data

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
    range: "Leads!A:E", // Adjust based on your sheet
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          new Date().toISOString(), // Timestamp
          name,
          email,
          phone || "Not provided",
          message,
        ],
      ],
    },
  })
}

// Add contact to SendGrid list
async function addToSendGridList(data) {
  const { name, email, phone } = data

  const [firstName, ...lastNameParts] = name.split(" ")
  const lastName = lastNameParts.join(" ")
  const dataToSend = {
    email,
    first_name: firstName,
    custom_fields: {
      
    }
  }
  if (lastName) {
    dataToSend.last_name = lastName
  }
  if (phone) {
    dataToSend.custom_fields.phone = phone
  }
  const response = await fetch("https://api.sendgrid.com/v3/marketing/contacts", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      list_ids: [listId], // Using the newsletter list for contacts
      contacts: [
        dataToSend,
      ],
    }),
  })

  if (response.status !=  202) {
    console.log("SendGrid response error:", response.statusText)
    const errorBody = await response.json();
    console.log(`SendGrid API error: ${response.statusText} (${response.status}) ${JSON.stringify(errorBody)}`)
  } else {
    console.log("Added to SendGrid list successfully")
  }
}

// Send thank you email to registrant
async function sendThankYouEmail(data) {
  const { name, email, message } = data
  
  // const msg = {
  //   to: email,
  //   from: {
  //     name: "National Outdoor School",
  //     email: "noreply@nationaloutdoorschool.com"
  //   },
  //   subject: `Received your enquiry`,
  //   text: `
  //     Dear ${name},
      
  //     We have received your enquiry and will get back to you shortly.

  //     Your message:
  //     -----
  //     "${message}"
  //     -----
      
  //     Best regards,
  //     The National Outdoor School Team
  //   `,
  //   html: `
  //     <p>Dear ${name},</p>
      
  //     <p>We have received your enquiry and will get back to you shortly.</p>
      
  //     <p>Your message:</p>
  //     <p>-----</p>
  //     <p>${message}</p>
  //     <p>-----</p>
      
  //     <p>Best regards,<br>
  //     The National Outdoor School Team</p>
  //   `
  // }

  // await sgMail.send(msg)
  const text = `
      Dear ${name},
      
      We have received your enquiry and will get back to you shortly.

      Your message:
      -----
      "${message}"
      -----
      
      Best regards,
      The National Outdoor School Team
    `
    const html = `
      <p>Dear ${name},</p>
      
      <p>We have received your enquiry and will get back to you shortly.</p>
      
      <p>Your message:</p>
      <p>-----</p>
      <p>${message}</p>
      <p>-----</p>
      
      <p>Best regards,<br>
      The National Outdoor School Team</p>
    `
  await sendEmailSES([email], text, html, "Received your enquiry", source, [replyToEmail])
}

// Contact us related functions end
async function handleContactSubmission(request,response){
  try {
    const data = await request.body
    
    //trim all fields
    for (const key in data) {
      if (typeof data[key] === "string") {
        (data[key]) = data[key].trim();
      }
    }
    const { name, email, phone, message } = data
    //Name cannot be less than 2 characters and greater than 200 characters
    if (!name || name.length < 2 || name.length > 200) {
      return response.json({ error: "Name must be between 2 and 200 characters" }, { status: 400 })
    }
    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!emailRegex.test(email)) {
      return response.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate phone format if provided
    if (phone && !/^[0-9+\-\s()]{10,15}$/.test(phone)) {
      return response.json({ error: "Invalid phone number format" }, { status: 400 })
    }

    //Validate message - should be atleast 10 characters and not greater than 1000 characters
    if (!message || message.length < 10 || message.length > 1000) {
      return response.json({ error: "Message must be between 10 and 1000 characters" }, { status: 400 })
    }

    // 1. Send email to school
    try {
      sendEmailToSchool(data)
    } catch (error) {
      console.error("Email to school error:", error)
    }

    // 2. Add to Google Sheet
    try {
      addToGoogleSheet(data)
    } catch (error) {
      console.error("Google Sheet error:", error)
    }

    // 3. Add to SendGrid list
    try {
      addToSendGridList(data)
    } catch (error) {
      console.error("SendGrid list error:", error)
    }

    // 4. Send thank you email to registrant
    try {
      sendThankYouEmail(data)
    } catch (error) {
      console.error("Thank you email error:", error)
    }
    return response.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return response.json({ error: "Failed to process contact form" }, { status: 500 })
  }
}

router.post('/contact', handleContactSubmission);


const newsletterListId = "c0bd05be-40dd-48bf-ab70-2604f3305933"
async function addToSendGridListNewsletter(email) {
  const dataToSend = {
    email
  }
  const response = await fetch("https://api.sendgrid.com/v3/marketing/contacts", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      list_ids: [newsletterListId], // Using the newsletter list for contacts
      contacts: [
        dataToSend,
      ],
    }),
  })

  console.log("SendGrid response status:", response.status)
  if (response.status !=  202) {
    console.log("SendGrid response error:", response.statusText)
    console.log("SendGrid response body:", await response.json())
    throw new Error(`SendGrid API error: ${response.statusText} (${response.status}) ${JSON.stringify(await response.json())}`)
  }
  const responseData = await response.json()
  console.log("SendGrid response:", responseData)

  return responseData
}

async function handleNewsletterSubmission(request,response){
  try {
    const data = await request.body
    
    //trim all fields
    for (const key in data) {
      if (typeof data[key] === "string") {
        (data[key]) = data[key].trim();
      }
    }
    const { email } = data
    
    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!emailRegex.test(email)) {
      return response.json({ error: "Invalid email format" }, { status: 400 })
    }

    // 3. Add to SendGrid list
    try {
      await addToSendGridListNewsletter(email)
    } catch (error) {
      console.error("SendGrid list error:", error)
    }

    return response.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return response.json({ error: "Failed to process contact form" }, { status: 500 })
  }
}
router.post('/newsletter', handleNewsletterSubmission);



module.exports = router;
