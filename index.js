// Modules Imports
const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs')

const { yellow, cyan, blue, red } = require('colors')

async function mainMenu() {

    console.clear()
    console.log(`Welcome in the ${blue('Password Manager')}`)

    // Check if there are any vaults
    const vaultsDirectory = './vaults'
    const vaultsArray = fs.readdirSync(vaultsDirectory)
    const windowsFolderNameRegex = /^(?!^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$)[^<>:"/\\|?*\x00-\x1F]+[^<>:"/\\|?*\x00-\x1F\. ]$/


    if(!vaultsArray.length || (vaultsArray.length == 1 && vaultsArray[0] == 'TestVault') || true) {
        // No vault detected, proceed to crete one

        const { vaultName, vaultPassword } = await inquirer.prompt([
            // Vault name
            {
                type: 'input',
                name: 'vaultName',
                message: 'Insert a vault name: ',
                validate: input => {
                    if(input.trim() === '') return 'The vault name cannot be empty.'
                    if(input.includes(' ')) return 'The vault name cannot contain spaces.'
                    if(!windowsFolderNameRegex.test(input)) return 'This name cannot be used as a vault name.'
                    return true
                }
            },
            // Vault password
            {
                type: 'password',
                name: 'vaultPassword',
                message: 'Insert a password for your vault: ',
                mask: '*',
                validate: vaultPassowrd => {
                    if(vaultPassowrd.length < 6) return 'The password should be at least 6 character long.'
                    return true
                }
            }
        ])
        /**
         * TODO: Crypt password, add menu, create password, create groups and other things
         */
        // Create a new folder inside ./valuts and put the settings over there (passwords, etc...)
        const newVaultPath = path.join(vaultsDirectory, vaultName)
        await fs.mkdir(newVaultPath, { recursive: true }, (error) => {
            if(error) console.log(error)
        })

        const jsonSettings = { password: vaultPassword }
        await fs.writeFile( path.join(newVaultPath, 'settings.json'), JSON.stringify(jsonSettings, null, 4), 'utf8', (error) => {
            if(error) console.log(error)
        })

        console.log(true)

    } else {
        console.log('not empty')
    }


}   

(async () => {
    await mainMenu()
})()



// const consoleTitle = `🔐 Password Manager | Developed by tommu`
// process.platform == 'win32' ? process.title = consoleTitle : process.stdout.write('\x1b]2;' + title + '\x1b\x5c')