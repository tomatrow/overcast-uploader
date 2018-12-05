#!/usr/bin/env node

const program = require('commander')
const puppeteer = require('puppeteer');
const path = require('path')
const fs = require('fs');

// Overcast's allowed audio types
const allowedExtensions = ['mp3', 'm4a', 'm4b', 'aac']
// timeout for uploading a file
const timeoutMin = 30 // minutes

// login to Overcast
const login = async (browser, username, password) => {
    const page = await browser.newPage();

    await page.goto('https://overcast.fm/login');

    // type in email
    await page.type('#email', username)

    // type in password
    await page.type('#password', password)

    // click login
    await page.click('button.ocborderedbutton')

    // wait till loaded
    return page.waitForNavigation()
}

// get the files we need to upload
const readRelativeFilePaths = uploadDir => {

    // get the relative path for our upload directory
    const absolutePath = path.join(__dirname, uploadDir)
    const cwd = process.cwd()
    const relativeUploadPath = path.relative(cwd, absolutePath)

    // return the relative paths of the files we need to upload
    return fs.readdirSync(relativeUploadPath)
        .map(fileName => path.join(relativeUploadPath, fileName))
}

// uploads a single file
const uploadFile = async (filePath, page) => {
    // start uploading the file
    const inputSelector = 'input#upload_file'
    const input = await page.$(inputSelector)
    await input.uploadFile(filePath) //

    return page.waitForFunction(selector => {
            const input = document.querySelector(selector)
            return !!input && !input.disabled
        }, {
            // wait till the upload button is enabled
            timeout: timeoutMin * 60 * 1000 // in miliseconds
        }, inputSelector)
        .catch(() => {
            const msg = `Upload of ${filePath} exceeded ${timeoutMin}min`
            console.error(`Error: ${msg}`)
        })
}

// uploads all our files
const uploadFiles = async (browser, filePaths) => {
    const page = await browser.newPage()

    await page.goto('https://overcast.fm/uploads')

    // check we are passed audio files
    const isAudioFile = filePath => allowedExtensions
        .map(ext => filePath.endsWith(`.${ext}`))
        .reduce((last, next) => last || next)
    filePaths.forEach(filePath => {
        if (isAudioFile(filePath))
            return;
        console.error(`Unrecognized file type: ${filePath}`)
        process.exit(1)
    })

    // upload the files
    for (filePath of filePaths) {
        process.stdout.write(`uploading: '${filePath}'...`)
        await uploadFile(filePath, page)
        console.log(`done`)
    }
}

// parse commandline arguments
const getCommandLineInput = () => {
    let files;
    program
        .name('overcast-uploader')
        .usage('--email <email> --password <password> <file> [otherFiles...]')
        .arguments('<file> [otherFiles...]')
        .action((file, otherFiles) => {
            files = [file].concat(otherFiles)
        })
        .option('-e, --email <email>', 'Overcast account email')
        .option('-p, --password <password>', 'Overcast account password')
        .parse(process.argv)

    // construct input object
    const result = {
        username: program.email,
        password: program.password,
        files
    }

    // validate
    for (const key in result)
        if (typeof result[key] === 'undefined')
            program.help()


    return result
}

// the main logic
const main = async () => {

    const input = getCommandLineInput()

    const browser = await puppeteer.launch({
        headless: true
    });

    console.log('Logging in')
    await login(browser, input.username, input.password)
    console.log('Logged in')
    console.log('Starting uploads')
    await uploadFiles(browser, input.files)
    console.log('Finished uploads')
    await browser.close()
};

main()