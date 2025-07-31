
import { skills } from "../data.js"

export const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )
}
const PHONE_REGEX = /[0-9]/
export const validatePhone = (phone) => {
    return PHONE_REGEX.test(phone) && phone.length <= 20
}
export const FULL_NAME_REQUIRED = "Full name is required"
export const FULL_NAME_LARGE = "Please reduce to 100 or lesser characters"
export const EMAIL_REQUIRED = "Email is required"
export const EMAIL_INVALID = "Invalid email"
export const PHONE_NUMBER_REQUIRED = "Phone number is required"
export const PHONE_NUMBER_INVALID = "Phone number is invalid"
export const QUIZ_ANSWER_REQUIRED = "Answer is required"
export const OTHER_INFO_LARGE = "Please reduce to 1000 or lesser characters"
export const OTHER_INFO_INVALID = "Invalid data"

export const validateFullName = (fullName) => {
    console.log("validate full name",fullName)
    if(fullName.length == 0)
        return FULL_NAME_REQUIRED
    else if(fullName.length > 100)
        return FULL_NAME_LARGE
    else
        return ""
}
export const validateEmailRequired = (email) => {
    if(email.length == 0)
        return EMAIL_REQUIRED
    else {
        if(!validateEmail(email))
            return EMAIL_INVALID
        else
            return ""
    }
}
export const validatePhoneNumber = (phNo) => {
    if(phNo.length == 0)
        return PHONE_NUMBER_REQUIRED
    else if(!validatePhone(phNo))
        return PHONE_NUMBER_INVALID
    else
        return ""
}
export const validateQuizAnswer = (answer) => {
    if(answer.length == 0)
        return QUIZ_ANSWER_REQUIRED
    else
        return ""
}
export const validateOtherInfo = (otherInfo) => {
    if(!otherInfo)
        return ""
    if((typeof otherInfo) != 'string') 
        return OTHER_INFO_INVALID
    if(otherInfo.length > 1000)
        return OTHER_INFO_LARGE
    return ""
}

export const validSelectedSkills = (selectedSkills)=>{
    if(!Array.isArray(selectedSkills)){
        console.log("selected skills not array")
        return false
    }
    if(selectedSkills.length == 0){
        console.log("selected skills array length 0")
        return false
    }
    for(let i=0;i<selectedSkills.length;i++){
        let skillIndex = skills.findIndex(s=>s.label==selectedSkills[i].label)
        if(skillIndex == -1){
            console.log("skill index -1",selectedSkills[i])
            return false
        }
        if(Array.isArray(selectedSkills[i].selectedSubSkills)){
            let valid = true
            for(let j=0;j<selectedSkills[i].selectedSubSkills.length;j++){
                let selectedSubSkill = selectedSkills[i].selectedSubSkills[j]
                if(!skills[skillIndex]?.subSkills?.find(s=>s.label==selectedSubSkill.label)){
                    console.log("invalid subskill",skills[skillIndex],selectedSubSkill)
                    valid = false
                    break;
                }
            }
            return valid
        } else
            return false
    }
    return true     
}

export const isEmpty = (value) =>
typeof value === 'undefined' ||
value === null ||
Number.isNaN(value) ||
(typeof value === 'object' && Object.keys(value).length === 0) ||
(typeof value === 'string' && value.trim().length === 0)