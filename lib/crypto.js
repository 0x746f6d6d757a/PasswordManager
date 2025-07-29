const crypto = require('crypto')

const algorithm = 'aes-256-gcm'
const ivLength = 12
const saltLength = 16
const tagLength = 16

function generateSalt() { return crypto.randomBytes(saltLength) }
function deriveKey(password, salt) { return crypto.scryptSync(password, salt, 32) }

function encrypt(text, key) {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return { iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') }

}


function decrypt(encryptedBase64, key) {
    try {
        const data = Buffer.from(encryptedBase64, 'base64')
        const iv = data.slice(0, ivLength)
        const tag = data.slice(ivLength, ivLength + tagLength)
        const encryptedText = data.slice(ivLength + tagLength)

        const decipher = crypto.createDecipheriv(algorithm, key, iv)
        decipher.setAuthTag(tag)

        const decrypted = Buffer.concat([ decipher.update(encryptedText), decipher.final() ])
        return decrypted.toString('utf8')
        
    } catch (err) {
        // If it fails, return null (wrong password or corrupted data)
        return null
    }
}

module.exports = { generateSalt, deriveKey, encrypt, decrypt, crypto }
