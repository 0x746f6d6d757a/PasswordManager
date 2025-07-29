// Modules Imports
const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs')
const { generateSalt, deriveKey, encrypt } = require('./lib/crypto')
const { yellow, cyan, blue, red } = require('colors')
const crypto = require('crypto')

const windowsFolderNameRegex = /^(?!^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$)[^<>:"/\\|?*\x00-\x1F]+[^<>:"/\\|?*\x00-\x1F\. ]$/
const vaultsDirectory = './vaults'


async function mainMenu() {
    console.clear()

    const cmdTitle = "🔐 Password Manager | By tommu"
    process.platform == 'win32' ? process.title = cmdTitle : process.stdout.write('\x1b]2;' + cmdTitle + '\x1b\x5c');

    console.log(`Welcome in the ${blue('Password Manager')}`)

    if (!fs.existsSync(vaultsDirectory)) fs.mkdirSync(vaultsDirectory)

    let vaultsArray
    vaultsArray = updateVaults(vaultsArray)

    let flag = true
    while(flag) {

        vaultsArray = updateVaults()

        if (!vaultsArray.length || (vaultsArray.length == 1 && vaultsArray[0] == 'TestVault')) {
            // No vault detected, proceed to create one
            await createVault()

        } else {

            let choice = await selectOption()

            switch(choice) {
                case 'vault_create':
                    await createVault()
                    break
                
                case 'vault_open':

                    let canAccessVault = await openVault(vaultsArray)
                    if(!canAccessVault) continue

                    console.log(true)

                    break
                
                case 'exit':
                    flag = false
                    break

            }
        }
    }
}

;(async () => {
    await mainMenu()
})()


async function createVault() {
    const { vaultName, vaultPassword } = await inquirer.prompt([
        {
            type: 'input',
            name: 'vaultName',
            message: 'Insert a vault name: ',
            validate: input => {
                if (input.trim() === '') return 'The vault name cannot be empty.'
                if (input.includes(' ')) return 'The vault name cannot contain spaces.'
                if (!windowsFolderNameRegex.test(input)) return 'This name cannot be used as a vault name.'
                return true
            }
        },
        {
            type: 'password',
            name: 'vaultPassword',
            message: 'Insert a password for your vault: ',
            mask: '*',
            validate: input => {
                if (input.length < 6) return 'The password should be at least 6 characters long.'
                return true
            }
        }
    ])

    const newVaultPath = path.join(vaultsDirectory, vaultName)
    fs.mkdirSync(newVaultPath, { recursive: true })

    // 🔐 Create salt, derive key, and encrypt login verifier
    const vaultSalt = generateSalt();
    const key = deriveKey(vaultPassword, vaultSalt);
    const loginVerifier = encrypt("vault-unlock", key);

    const jsonSettings = {
        vaultSalt: vaultSalt.toString('base64'),
        loginVerifier
    };

    fs.writeFileSync( path.join(newVaultPath, 'settings.json'), JSON.stringify(jsonSettings, null, 4), 'utf8' )
    console.log(yellow('\n✅ Vault created successfully!'))
}

function updateVaults() {
    return fs.readdirSync(vaultsDirectory)
}

async function selectOption() {
    const answersArray = [
        { name: '➕ Create a new vault.', value: 'vault_create' },
        { name: '🔓 Open a vault.', value: 'vault_open' },
        { name: '🔸 Exit.', value: 'exit' }
    ]

    let { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: 'What you would like to do:',
            choices: answersArray
        }
    ])

    return choice

}

async function openVault(vaultsArray) {

    const { selectedVault } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedVault',
            message: 'Choose a vault to open:',
            choices: vaultsArray
        }
    ])

    const { vaultPassword } = await inquirer.prompt([
        {
            type: 'password',
            name: 'vaultPassword',
            message: `Enter the password for "${selectedVault}":`,
            mask: '*',
            validate: input => {
                if (input.length < 6) return 'The password should be at least 6 characters long.'
                return true
            }
        }
    ])

    const settingsPath = path.join(vaultsDirectory, selectedVault, 'settings.json')
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))

    const salt = Buffer.from(settings.vaultSalt, 'base64')
    const key = deriveKey(vaultPassword, salt)

    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(settings.loginVerifier.iv, 'base64'))
        decipher.setAuthTag(Buffer.from(settings.loginVerifier.tag, 'base64'))

        const decrypted = Buffer.concat([ decipher.update(Buffer.from(settings.loginVerifier.data, 'base64')), decipher.final() ]).toString('utf8')

        if (decrypted === 'vault-unlock') {
            console.log(blue('\n🔓 Vault unlocked successfully!'))
            return { selectedVault }
            // TODO: Add password management options
        } else {
            console.log(red('\n❌ Invalid password.'))
            return false
        }
    } catch (err) {
        console.log(red('\n❌ Failed to decrypt. Invalid password or corrupted vault.'))
        return false
    }
}
